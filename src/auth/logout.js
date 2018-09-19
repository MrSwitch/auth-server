// logout

'use strict';
const debug = require('debug')('auth/logout');

// Export this module as middleware
module.exports = (req, res) => {

	// Removing session
	req.session.destroy(() => {
		debug('session destroyed');
	});

	// Display the page
	res.render('logout');
};

// Notice
debug('auth/logout ready');
