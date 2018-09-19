'use strict';
// Access
// Given a request, determine the users credentials.
const crypt = require('./lib/crypt');

module.exports = (req, res, next) => {

	let message;

	// Does the request query contain a valid access token?
	if ('access_token' in req.query) {

		const json = crypt.decrypt(req.query.access_token);

		delete req.query.access_token;

		if (json && json.expires >= Date.now()) {
			// Attach the auth credentials too the request
			req.auth = json;

			// Continue
			next();
			return;
		}
		else {
			message = 'Access token has expired';
		}
	}
	else {
		message = 'Access token is required';
	}

	// Render a json error message
	res.json({
		error: {
			code: 'unauthorized',
			message
		}
	});

};
