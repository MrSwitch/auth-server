'use strict';
const debug = require('debug')('login');

// login
// Expose the login page for session management

const db = require('../api/db');
const qs = require('querystring');
const crypt = require('./lib/crypt');

// Export this module as middleware
const app = module.exports = require('express')();

// Jade
app.set('view engine', 'pug');
app.set('views', `${__dirname }/views`);

// OAuth-Shim
// Configure OAuth-Shim with the credentials to use.
const creds = require('./credentials.js').credentials;
const REDIRECT_URI = require('./credentials.js').redirect_uri;

// Build URL's for the credentials
creds.forEach(cred => {

	// Pass some basic information back to the OAuthShim
	cred.state = cred.name;

	// Create url...
	cred.url = `${cred.auth }&${ qs.stringify({
		client_id: cred.client_id,
		redirect_uri: REDIRECT_URI,
		response_type: 'code',
		state: cred.state
	})}`;
});


// Continue...
// White list an outbound access_token...
app.use((req, res, next) => {

	// Whitelist a granted application?
	// Read the access_token to add the application to the list of approved_apps.
	// This is used internally to handle a successful login.
	if (req.query.access_token && req.query.redirect_uri) {
		// Decode the access_token
		const json = crypt.decrypt(req.query.access_token);

		if (json.user_id && json.client_id) {

			// forward the user on to their redirect_uri
			const redirect_uri = req.query.redirect_uri;
			delete req.query.redirect_uri;
			res.redirect(`${redirect_uri }?${ qs.stringify(req.query)}`);

			// Update the approved apps
			updateApprovedApps(json);
		}
		else {
			res.render('error', {
				message: 'The access_token is not valid'
			});
		}

		// Do not continue
		return;
	}
	next();
});


// Check the redirect_uri matches client_id
app.use(async (req, res, next) => {

	// Check that all the information is given, redirect_uri, redirect_uri, etc...
	if (!req.query.client_id || !req.query.redirect_uri) {
		res.render('error', {
			message: 'client_id and or redirect_uri need to be provided'
		});
		return;
	}

	// Query the database for the redirect_uri which matches this database.
	try {
		const data = await db('client_apps').get(['client_id, redirect_uri'], {client_id: req.query.client_id});

		// Test that the redirect_uri exists within the response
		if (match_redirect(data.redirect_uri, req.query.redirect_uri)) {
		// All good...
			next();
		}
		else {
			res.render('error', {
				message: 'The redirect_uri does not match that on record.'
			});
		}
	}
	catch (err) {
		res.render('error', err);
	}

});


// Bind handler to this
app.use(async (req, res, next) => {
	// Store the Request in the session for redirecting too this page after affiliate login.
	req.session.authRequest = req.url;

	// Default chain
	let user;
	const userId = req.session ? req.session.user_id : undefined;
	const clientId = req.query.client_id;

	// Debug
	debug('Building login page');

	try {
		// Get the current connections for this user allocated
		if (userId) {
			user = await getUser(userId);
		}

		// Send back to the system
		debug('Render login page for', userId);

		let authResponse;

		// AuthResponse
		if (user && clientId) {
			authResponse = getAuthResponse(userId, clientId);
			authResponse.state = req.query.state;
			authResponse = qs.stringify(authResponse);
		}

		// Redirect back to the redirect_uri with auth response
		// Unless the force=true in the query
		if (authResponse && user && user.approved_apps.indexOf(clientId) >= 0 && req.query.force !== 'true') {
			// Authenticated
			debug('redirect re-authenticated', req.query.redirect_uri);
			res.redirect(`${req.query.redirect_uri }?${ authResponse}`);
			return;
		}
		// Refreshing the page with silent Authentication
		else if (req.query.display === 'none') {
			// Unauthenticated
			debug('redirect un-authenticated', req.query.redirect_uri);
			res.redirect(`${req.query.redirect_uri }?${ qs.stringify({error: 'unauthenticated', error_message: 'Unable to refresh the users session'})}`);
			return;
		}

		// Render the login page
		res.render('login', {
			credentials: creds,
			user,
			query: req.query,
			auth_response: authResponse
		});
	}

	catch (err) {

		debug(err);
		next();

		res.end();
	}
});

// Debug
debug('auth/login ready');

// Get User Connections
async function getUser(userId) {

	debug('Read user profile', userId);

	const user = await db('users').get(['*'], {id: userId});

	debug('Acquired user data');

	// Ensure we got a response
	if (user) {

		// Format the list of user approved apps from a string to an array
		user.approved_apps = (user.approved_apps || '').split(',');

		// Transpile user data
		user.connections = {};

		for (const x in user) {

			// Is this a connection entry?
			// There will be two properties, network'_id' and network'_profile'
			if (x.match(/_profile$/)) {
				const network = x.match(/^[^_]+/)[0];
				user.connections[network] = JSON.parse(user[x]);
			}
		}
	}

	return user;
}

function getAuthResponse(user_id, client_id) {
	// authResponse
	const authResponse = {
		expires_in: 3600
	};

	// Generate an AuthResponse for this user...
	authResponse.access_token = crypt.encrypt({
		expires: Date.now() + (authResponse.expires_in * 1000),
		user_id,
		client_id
	});

	return authResponse;
}

function match_redirect(match, path) {
	const a = match.split(/[,\s]+/);
	for (let i = 0; i < a.length; i++) {
		const cond = a[i];
		if (path.indexOf(cond) > -1) {
			return true;
		}
	}
	return false;
}

async function updateApprovedApps(json) {
	// Get the users approved app list to add to it...
	const data = await db('users').get(['approved_apps'], {id: json.user_id});
	if (data.approved_apps.split(',').indexOf(json.client_id) === -1) {
		data.approved_apps += `,${ json.client_id}`;
		// Append the client_id to the user
		return db('users').update(data, {id: json.user_id});
	}
}
