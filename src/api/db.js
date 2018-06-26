'use strict';

var debug = require('debug')('db');
var pg = require('pg');
var conn = process.env.HEROKU_POSTGRESQL_BLUE_URL || process.env.DATABASE_URL;

// Export the function DB
module.exports = DB;

pg.on('error', err => {
	console.log('pg Connection errored');
	console.log(err);
});

// Client
let client = connect();

// Start a new connection to the database
function connect() {
	return new Promise((resolve, reject) => {

		// Set the client
		let agent = new pg.Client(conn);
		agent.connect(err => {

			// Connected to DB?
			if (err) {
				debug('Failed to connected to POSTGRESQL ' + conn, err);
				reject({message: 'Failed to connect to DB'});
				return;
			}

			// Connected
			debug('Connected to POSTGRESQL ' + conn);

			// Resolve connection
			resolve(agent);
		});

		agent.on('error', err => {
			console.log('Connection errored');
			console.log(err);
			client = connect();
		});
	});
}

function DB(table) {
	return DB.use(table);
}

// Set the table
DB.use = function(table) {
	this.table = table;
	return this;
};

// Run the query
DB.query = function(sql, values) {

	return client.then(agent => {
		// Run the query
		return new Promise((resolve, reject) => {
			agent.query(sql, values, (err, resp) => {

				if (err) {
					debug(err.message);
					reject({
						message: err.message
					});
				}
				else {
					debug(resp);
					resolve(resp);
				}
			});
		});
	});

}

// Get
DB.get = function(fields, cond) {
	return this.getAll(fields, cond, {limit: 1})
	.then(data => {
		if (data && data.rows && data.rows.length) {
			return data.rows[0];
		}
		return null;
	});
};

DB.getAll = function(fields, cond, options) {

	let i = 1;
	let where = [];
	let values = [];
	let opts = [];

	for (let x in cond) {
		where.push(x + ' = $' + i++);
		values.push(cond[x]);
	}

	for (let x in options) {
		opts.push(x + ' ' + options[x]);
	}

	return this.query('SELECT ' + fields.join(',') + ' FROM ' + this.table + (where.length ? ' WHERE ' + where.join(' AND ') : '') + ' ' + opts.join(' '), values);
};

// Insert
DB.insert = function(data) {

	var keys = [],
		values = [],
		temp = [],
		i = 1;

	for (let x in data) {
		keys.push(x);
		temp.push('$' + i++);
		values.push(data[x]);
	}
	return this.query('INSERT INTO ' + this.table + '(' + keys.join(',') + ') VALUES( ' + temp.join(',') + ' ) RETURNING *', values)
	.then(formatResponse);
};

DB.update = function(data, cond) {

	var set = [],
		values = [],
		where = [],
		i = 1;

	for (let x in data) {
		var val = data[x];
		if (val !== 'CURRENT_TIMESTAMP') {
			values.push(val);
			val = '$' + i++;
		}
		set.push(x + ' = ' + val);
	}
	for (let x in cond) {
		where.push(x + ' = $' + i++);
		values.push(cond[x]);
	}
	return this.query('UPDATE ' + this.table + ' SET ' + set.join(',') + ' WHERE ' + where.join(' AND '), values)
	.then(resp => {
		if (resp.rowCount) {
			resp.success = true;
		}
		else {
			resp.error = true;
			resp.details = 'Did not update any results';
		}
		return resp;
	});
};


DB.delete = function(cond) {

	var values = [],
		where = [],
		i = 1;

	for (let x in cond) {
		where.push(x + ' = $' + i++);
		values.push(cond[x]);
	}

	return this.query('DELETE FROM ' + this.table + ' WHERE ' + where.join(' AND '), values)
	.then(formatResponse);
};

function formatResponse(res) {
	// If the response contains a single row, return that row
	return res.rows && res.rows.length ? res.rows[0] : res;
}
