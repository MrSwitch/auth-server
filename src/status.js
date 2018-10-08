'use strict';
const debug = require('debug')('status');

const db = require('./api/db');

// Export this module as middleware
module.exports = async (req, res) => {

	try {
		// Database connection still ticking?
		// Make an arbitary call...
		const row = await db('apps').get(['COUNT(*) AS count']);

		res.end('Status: ok', 'utf-8');

		debug('rows', row.count);
	}
	catch (err) {

		res.writeHead(503);

		res.end('Status: failing', 'utf-8');

		debug(err);
	}
};
