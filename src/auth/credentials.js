
module.exports = {
	redirect_uri: process.env.REDIRECT_URI,
	credentials: [
		{
			name: 'facebook',
			auth: 'https://www.facebook.com/dialog/oauth/?scope=email',
			domain: process.env.DOMAIN,
			client_id: process.env.FACEBOOK_ID,
			client_secret: process.env.FACEBOOK_SECRET,
			grant_url: 'https://graph.facebook.com/oauth/access_token'
		},
		{
			name: 'github',
			auth: 'https://github.com/login/oauth/authorize?scope=user:email',
			domain: process.env.DOMAIN,
			client_id: process.env.GITHUB_ID,
			client_secret: process.env.GITHUB_SECRET,
			grant_url: 'https://github.com/login/oauth/access_token'
		},
		{
			name: 'google',
			auth: 'https://accounts.google.com/o/oauth2/auth?scope=https://www.googleapis.com/auth/plus.me profile email',
			domain: process.env.DOMAIN,
			client_id: process.env.GOOGLE_ID,
			client_secret: process.env.GOOGLE_SECRET,
			grant_url: 'https://accounts.google.com/o/oauth2/token'
		},
		{
			name: 'twitter',
			auth: 'redirect?',
			oauth: {
				version: '1.0a',
				auth: 'https://api.twitter.com/oauth/authenticate',
				request: 'https://api.twitter.com/oauth/request_token',
				token: 'https://api.twitter.com/oauth/access_token'
			},
			domain: process.env.DOMAIN,
			client_id: process.env.TWITTER_ID,
			client_secret: process.env.TWITTER_SECRET,
			grant_url: 'https://api.twitter.com/oauth/access_token'
		},
		{
			name: 'windows',
			auth: 'https://login.live.com/oauth20_authorize.srf?scope=wl.signin,wl.basic,wl.emails',
			domain: process.env.DOMAIN,
			client_id: process.env.WINDOWS_ID,
			client_secret: process.env.WINDOWS_SECRET,
			grant_url: 'https://login.live.com/oauth20_token.srf'
		},
		{
			name: 'yahoo',
			auth: 'redirect?',
			oauth: {
				version: '1.0a',
				auth: 'https://api.login.yahoo.com/oauth/v2/request_auth',
				request: 'https://api.login.yahoo.com/oauth/v2/get_request_token',
				token: 'https://api.login.yahoo.com/oauth/v2/get_token'
			},
			domain: process.env.DOMAIN,
			client_id: process.env.YAHOO_ID,
			client_secret: process.env.YAHOO_SECRET,
			grant_url: ''
		}
	]
};
