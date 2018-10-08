'use strict';

module.exports = (req, res, next) => {
	const heroku_scheme = req.headers['x-forwarded-proto'];

	if (heroku_scheme && heroku_scheme !== 'https') {
		res.redirect(`https://${ req.headers.host }${req.url}`);
	}
	else {
		next(); /* Continue to other routes if we're not redirecting */
	}
};
