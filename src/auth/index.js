'use strict';
const debug = require('debug')('auth');

// Export this module as middleware
const app = module.exports = require('express')();

// Jade
app.set('view engine', 'jade');
app.set('views', `${__dirname }/views`);

// Static files
app.use(require('serve-static')(`${__dirname }/public`));

// Session data
app.use(require('express-session')({
	cookie: {
		path: '/auth/'
	},
	secret: 'auth-server-123',
	resave: false,
	saveUninitialized: true
}));

app.use((req, res, next) => {
	if (!req.session) {
		req.session = {};
	}
	if (!req.session.connections) {
		req.session.connections = {};
	}
	next();
});

// Bind handlers for login page
app.all('/login', require('./login'));

// Bind handlers for the thirdparty Oauth handler
app.all('/redirect', require('./redirect'));

// Bind handlers for the thirdparty Oauth handler
app.all('/logout', require('./logout'));

// Notice
debug('auth ready');
