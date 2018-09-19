'use strict';
const debug = require('debug')('proxy');

const oauthshim = require('oauth-shim');
const db = require('./api/db');

// Export this module as middleware
const app = module.exports = require('express')();

// Apply the node-oauth-shim
// app.use('/proxy', oauthshim);

// Listen for auth calls
// Listen to incoming responses to the path proxy
app.use(oauthshim.interpret);
app.use(oauthshim.proxy);

// Change the error handler messages coming from this
app.use((req, res, next) => {

	if (req.oauthshim && req.oauthshim.data && req.oauthshim.redirect) {

		const data = req.oauthshim.data;

		if ('error' in data) {

			// Debug
			debug(data.error);

			// Change the default messages in the response
			switch (data.error) {
				case 'consumer_key_unknown':
					data.error_message = 'Please check your application id and settings locally and at https//auth-server.herokuapp.com';
					break;
				case 'signature_invalid':
					data.error_message = 'Your application needs to be registered at https//auth-server.herokuapp.com';
					break;
				case 'invalid_credentials':
				case 'required_credentials':
					data.error_message += '. Register your app credentials by visiting https//auth-server.herokuapp.com';
					break;
			}
		}
	}
	next();
});


// Was the login for this server
// auth-server maintains its own list of users
app.use((req, res, next) => {

	if (req.oauthshim && req.oauthshim.data && req.oauthshim.redirect) {

		const data = req.oauthshim.data;
		const opts = req.oauthshim.options;

		// Was this an OAuth Login response and does it contain a new access_token?
		if ('access_token' in data && !('path' in opts)) {

			// Store this access_token
			debug('Session created', `${data.access_token.substr(0, 8) }...`);

			// Save the grant URL
			if (opts && opts.oauth) {

				// Modify the record in the database.
				const id = opts.client_id;

				db('apps')
					.get(['grant_url'], {client_id: id})
					.then(row => {
						if (!row.grant_url) {
						// Update DB
							db('apps')
								.update({grant_url: (opts.oauth.grant || opts.oauth.token)}, {client_id: id})
								.then(res => {
									debug(res);
								}, err => {
									debug(err);
								});
						}
					})
					.then(null, err => {
						debug(err);
					});
			}
		}
	}
	next();
});


app.use(oauthshim.redirect);
app.use(oauthshim.unhandled);


// If use native clientServer use listen
// e.g. oauthshim.listen(app,'/proxy');


//
// Override the credentials access
// Return the secret from a database
oauthshim.credentials.get = (query, callback) => {

	// Get credentials
	debug(query);

	// No Credentials?
	// Retrun NULL, and accept default handling
	if (!query) {
		callback(null);
		return;
	}

	//
	// Search the database
	// Get all the current stored credentials
	//
	const cond = {client_id: query.client_id};

	db('apps')
		.get(['domain', 'client_id', 'client_secret', 'grant_url', 'count_accessed'], cond)
		.then(row => {
		// Callback
		// "/#network="+encodeURIComponent(network)+"&client_id="+encodeURIComponent(id)
			callback(row || null);

			// Update the db last accessed
			db('apps').update({
				last_accessed: 'CURRENT_TIMESTAMP',
				count_accessed: (row.count_accessed + 1)
			}, cond);
		}, () => {
			callback(null);
		});
};
