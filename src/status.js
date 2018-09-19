'use strict';
const debug = require('debug')('status');

const db = require('./api/db');

// Export this module as middleware
module.exports = (req, res) => {

	// Database connection still ticking?
	// Make an arbitary call...
	db('apps')
		.get(['COUNT(*) AS count'])
		.then(row => {
			res.end('Status: ok', 'utf-8');
			debug('rows', row.count);
		}, err => {
			res.writeHead(503);
			res.end('Status: failing', 'utf-8');
			debug(err);
		});
};
