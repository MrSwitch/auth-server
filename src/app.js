'use strict';
const debug = require('debug')('app');

const PORT = process.env.PORT || 5500;

const app = require('express')();

// Connect to the https server
app.listen(PORT);

// ENFORCE SSL
app.use(require('./utils/http_enforce_ssl'));

// FAVICON
app.use((req, res, next) => {
	if (req.url === '/favicon.ico') {
		res.redirect('https://adodson.com/favicon.ico');
		return;
	}
	next();
});

// Static files
app.use(require('serve-static')(`${__dirname }/../static`));

// Status
// Print out a status message
app.use('/status', require('./status'));

// Listen out for REST API access
// Serve the database
app.use('/api', require('./auth/access'), require('./api'));

// Bind handlers for the proxy service
app.use('/proxy', require('./proxy'));

// Bind handlers for the proxy service
app.use('/auth', require('./auth/index'));

// If its setup correctly...
debug('HTTP server listening on port %s', PORT);
