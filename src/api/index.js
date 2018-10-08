'use strict';
const debug = require('debug')('api');

// REST
// Defines the Web API for managing the site

const db = require('./db');
const bodyParser = require('body-parser');

/*
CREATE TABLE apps (
	reference VARCHAR(40),
	domain VARCHAR,
	client_id VARCHAR(2000) NOT NULL,
	client_secret VARCHAR(2000) NOT NULL,
	admin_id VARCHAR(2000) NOT NULL,
	guid VARCHAR UNIQUE DEFAULT MD5(CAST(RANDOM() AS VARCHAR)),
	PRIMARY KEY(service, client_id)
);
heroku
 pg:psql HEROKU_POSTGRESQL_BLUE_URL
*/

// Export this module as middleware
const app = module.exports = require('express')();

// Read the body tag as JSON
app.use(bodyParser.json());

// Determine whether the user has the right access to this endpoint
app.use('/:key', (req, res, next) => {
	// Interpret the key
	const key = req.params.key === 'me' ? req.auth.user_id : req.params.key;

	// Simple check that this key is the value of the current user
	// Todo: in future permit the key to give access to: public data, a group (where the user is a member), etc...
	if (key === req.auth.user_id) {
		next();
	}
	else {
		res.json({
			error: {
				code: 'unauthorized',
				message: 'You do not have permission to access this'
			}
		});
	}
});

// Make a request for the database
app.use('/:key/:table?', async (req, res) => {

	// const
	const method = req.method.toLowerCase();
	const body = req.body;
	const table = req.params.table || 'users';
	const query = req.query;

	// Assign the key based upon the table...
	const key = req.params.key === 'me' ? req.auth.user_id : req.params.key;
	if (table === 'users') {
		// Anchor by the user_id
		// Setting `id` triggers return of just one result...
		query.id = key;
	}
	else {
		// Anchor by the user_id
		// Get many results
		query.user_id = key;
	}


	// Do not permit anything other than 'get' on the user table
	if (table === 'users' && method !== 'get') {
		res.json({
			error: {
				code: 'unsupported_method',
				message: `${method.toUpperCase()} is an unauthorized method on users`
			}
		});
		return;
	}

	// Make DB call
	try {
		const data = await rest(table, method, query, body);

		debug('got data');

		// CORS
		// Handle each API response with some cross domain headers
		// res.writeHead(200, {
		// 	'Content-Type': 'application/json',
		// 	'Access-Control-Allow-Origin': '*',
		// 	'Access-Control-Allow-Methods': 'OPTIONS,GET,POST,PUT,DELETE',
		// 	'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept'
		// });

		// Push body of response
		res.json(data);
	}
	catch (err) {
		// Request error
		err.code = 'data_integrity';

		// Push error response
		res.json({error: err});
	}
});

async function rest(table, method, query, body) {

	// GET
	if (method === 'get') {
		const parts = query_parts(query);
		let fields = parts[0];
		fields = fields.length ? fields : ['*'];
		const cond = parts[1];
		const opts = parts[2];

		// This is only one item
		if (query.id) {
			opts.limit = 1;
		}

		const data = await db(table).getAll(fields, cond, opts);

		// Is this a request for a single item
		return query.id && data.rows ? data.rows[0] : {data: data.rows};
	}

	else if (method === 'post') {
		// Merge the body and the query
		extend(body, query);

		// ID included in query?
		if (body.id) {

			const cond = {
				id: body.id
			};
			delete body.id;

			// Prevent one user from writing over another, make the user a condition on the field
			if (body.user_id) {
				cond.user_id = body.user_id;
				delete body.user_id;
			}

			return db(table).update(body, cond);
		}
		else {
			return db(table).insert(body);
		}
	}

	else if (method === 'delete') {

		// Delete
		return db(table).delete(query);
	}

	throw {
		error: {
			code: 'unsupported_method',
			message: `${method.toUpperCase() }is an unsupported method`
		}
	};
}

function query_parts(query) {
	let fields = [];
	const cond = {};
	const opts = {};

	for (const x in query) {
		const value = query[x];

		if (x === 'fields') {
			fields = fields.concat(value.split(','));
		}
		else if (x === 'limit') {
			opts[x] = value;
		}
		else {
			cond[x] = value;
		}
	}

	return [fields, cond, opts];
}

function extend(a, b) {
	for (const x in b) {
		a[x] = b[x];
	}
}
