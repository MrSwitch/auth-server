'use strict';
const debug = require('debug')('redirect');

// login
// Expose the login page for session management

const promisify = require('promisify-node');
const db = require('../api/db');
const oauthshim = require('oauth-shim');

// Export this module as middleware
const app = module.exports = require('express')();

// Jade
app.set('view engine', 'pug');
app.set('views', `${__dirname }/views`);

// Get the Services which we're going to identify with
const AuthServices = {
	facebook: [2, require('passport-facebook').Strategy, {profileFields: 'id,displayName,email'.split(',')}, data => {
		if (data.id) {
			data.picture = `https://graph.facebook.com/${ data.id }/picture`;
		}
	}],
	github: [2, require('passport-github').Strategy, {}, data => {
		data.picture = data._json.avatar_url;
	}],
	google: [2, require('passport-google-oauth').OAuth2Strategy],
	// linkedin: [1, require('passport-linkedin').Strategy, {}],
	twitter: [1, require('passport-twitter').Strategy],
	windows: [2, require('passport-windowslive').Strategy],
	yahoo: [1, require('passport-yahoo-oauth').Strategy]
};

// INSTALL
// Create a new file called 'credentials.json', with a key value object literal {client_id => client_secret, ...}

// OAuth-Shim
// Configure OAuth-Shim with the credentials to use.
const creds = require('./credentials.js').credentials;
const REDIRECT_URI = require('./credentials.js').redirect_uri;

// Passport Profile
// Configure PassportJS's Google service
const strategies = {};
creds.forEach(cred => {

	const network = cred.name;
	strategies[network] = cred;

	const service = AuthServices[network];

	if (!service) {
		throw `Could not find Auth Service for ${ network}`;
	}

	const service_oauth_version = service[0];
	const constructor = service[1];
	const opts = service[2] || {};

	if (service_oauth_version === 2) {
		cred.passport = new constructor(merge({
			clientID: cred.client_id,
			clientSecret: cred.client_secret,
			callbackURL: 'https://blank'
		}, opts), (...args) => {
			debug(args);
		});

		// Add OAuth to strategy
		if (!cred.oauth) {
			cred.oauth = {
				grant: strategies[network].passport._oauth2._accessTokenUrl
			};
		}
	}
	else if (service_oauth_version === 1) {
		cred.passport = new constructor(merge({
			consumerKey: cred.client_id,
			consumerSecret: cred.client_secret,
			callbackURL: 'https://blank'
		}, opts), (...args) => {
			debug(args);
		});
	}

});

// '/redirect' is the path of the OAuth Shim
app.all('*',

	// Get some initial information about the incoming request
	(req, res, next) => {

		// Add additional information to the state parameter
		if (req.query.state) {
			const network = req.query.state;
			if (network in strategies) {
				// Define current strategy
				const strategy = strategies[network];

				// Update the query with the oauth parameters for OAuthShim
				req.query.oauth = strategy.oauth;

				// Attach network
				req.query.network = network;
				req.query.client_id = strategy.client_id;
				req.query.redirect_uri = REDIRECT_URI;
			}
			debug(req.query);
		}

		next();
	},

	// An incoming request will have an OAuth response like ?code=123
	// oauthshim.interpret will make the exchange for a token using this request
	oauthshim.interpret,

	// Capture the response AccessToken
	// Request got User Profile Data
	handleGrantedAuthorization,

	// Intercept OAuth2
	(req, res, next) => {
		if (req.oauthshim && req.oauthshim.redirect && req.oauthshim.data.access_token) {
			// Put the original request back together...
			// This is a relative path since this feature is relative.
			res.redirect(`.${ req.session.authRequest}`);
		}
		else {
			next();
		}
	},

	// oauthshim.redirect used by OAuth1 to redirect signed login requests
	oauthshim.redirect,

	// Contengency
	// If user cancels federated authentication
	// Either the redirect page has redirected the agent too a thirdparty login
	// Or the user has been identified and is prompted to login.
	(req, res) => {

		// Redirect to a page which contains HelloJS clientside script
		// To Store the credentials in the client
		// To Trigger any callbacks attached to the login
		res.redirect('./login?error=undefined');
		//		res.end();
	}
);


// Was the login for this server
// auth-server maintains its own list of users
async function handleGrantedAuthorization(req, res, next) {

	// Next: if this does not have oauthshim data...
	if (!(req.oauthshim && req.oauthshim.data && req.oauthshim.redirect)) {
		next();
		return;
	}

	// Reference
	const data = req.oauthshim.data;
	const opts = req.oauthshim.options;

	// Next: if this is not an OAuth Login response...
	if (!('access_token' in data && !('path' in opts))) {
		next();
		return;
	}

	// What is the network name
	const network = data.state;

	// Debug session created!
	debug('Session created', network, `${data.access_token.substr(0, 8) }...`);

	// Promisify the passport strategies
	const strategy = promisify(strategies[network].passport.userProfile).bind(strategies[network].passport);

	// Is this an OAuth1 requesst
	const a = data.access_token.split(/[:@]/);

	let profileData;

	try {
		// Make request for a User Profile
		if (a.length > 1) {

			data.oauth_token = a[0];
			data.oauth_token_secret = a[1];

			debug('OAuth1', data);
			profileData = await strategy(data.oauth_token, data.oauth_token_secret, data);
		}
		else {
			profileData = await strategy(data.access_token);
		}

		// Format profile response
		debug(profileData);
		// format the response
		if (profileData) {
			// custom formatter
			if (AuthServices[network][3]) {
				AuthServices[network][3](profileData);
			}
			// Generic formatter
			formatPassportResponse(profileData);
		}

		// Match the user with the profile data
		const user_id = await setProfileToSession(network, req.session.user_id, profileData);

		debug('Session set user_id', user_id);
		// Save this users data to the session
		req.session.connections[network] = profileData;
		req.session.user_id = user_id;

		// Continue back to the authorization page
		next();
	}
	catch (err) {

		// Log error
		debug(err);

		// Initiate the properties which are passed to the rendered document
		const options = {
			session: req.session
		};

		// Duplicate?
		if (err.message && err.message.match('duplicate')) {
		// Error: the connection being linked is assigned to another account
			options.message = 'Snap, this connection is linked to another account. It will have to be unlinked from the other account before it can be associated with this account';
		}

		// Display error page
		res.render('error', options);
	}
}

async function setProfileToSession(network, userId, profileData) {

	// Recieved profile Data
	debug(profileData);

	// If the current user is signed in...
	if (userId) {
		// Update the current users connection
		const userData = await getUserById(userId);
		return updateUserConnection(network, userData, profileData);
	}

	// The user has not be defined.
	// Retrieve the the user whom has this connection
	const userData = getUserByConnectionId(network, profileData.id);

	// Get userID
	userId = userData ? userData.id : undefined;

	// If the user was not found...
	if (!userId) {
		// Create a new user from session data
		userId = await createUserFromConnection(network, profileData);
	}
	else {
		updateUserConnection(network, userData, profileData);
	}

	debug('Acquired User', userId);
	return userId;
}


function getUserById(userId) {

	return db('users').get(['*'], {id: userId});
}

async function getUserByConnectionId(network, conn_id) {

	const data = await db.query(`SELECT * FROM users WHERE ${ network }_id LIKE '%${ conn_id }%' LIMIT 1`);
	return (data.rows.length ? data.rows[0] : undefined);
}

async function createUserFromConnection(network, profileData) {

	debug('Create user');

	const post = {
		name: profileData.displayName,
		picture: profileData.picture
	};
	post[`${network }_id`] = profileData.id;
	post[`${network }_profile`] = JSON.stringify(profileData);

	const data = await db('users').insert(post);

	// Found the user, associate this session with them
	return data.id;
}

async function updateUserConnection(network, userData, profileData) {

	const cond = {id: userData.id};

	const post = {};

	post[`${network }_id`] = profileData.id;
	post[`${network }_profile`] = JSON.stringify(profileData);

	if (!userData.name && profileData.displayName) {
		post.name = profileData.displayName;
	}

	if (!userData.picture && profileData.picture) {
		post.picture = profileData.picture;
	}

	if (!userData.email && profileData.email) {
		post.email = profileData.email;
	}
	debug(profileData.email);

	debug('Updating user connection');

	await db('users').update(post, cond);

	// Found the user, associate this session with them
	return userData.id;
}


function merge(a, b) {
	for (const x in b) {
		a[x] = b[x];
	}
	return a;
}

function formatPassportResponse(data) {
	if (data.photos && data.photos.length) {
		data.picture = data.photos[0].value;
	}
	if (data.emails && data.emails.length) {
		data.email = data.emails[0].value;
	}
}
