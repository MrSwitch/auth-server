/*global hello*/
(function(hello) {

	// Setup a link with the current
	const base = `//${ window.location.host }/`;

	hello.init({
		authserver: {
			name: 'Auth Server',
			oauth: {
				version: 2,
				auth: `${base }auth/login`,
				grant: `${base }auth/token`
			},
			login(p) {
				// Reauthenticate
				if (p.options.force) {
					p.qs.force = 'true';
				}
			},
			logout() {
				// return a path to follow
				return `${base }auth/logout`;
			},
			refresh: true,
			base: `${base }api/`,
			get: {
				me: 'me'
			},
			xhr(p) {
				if (p.method !== 'get' && p.data) {
					// Serialize payload as JSON
					p.headers = p.headers || {};
					p.headers['Content-Type'] = 'application/json';
					if (typeof (p.data) === 'object') {
						p.data = JSON.stringify(p.data);
					}
				}
				return true;
			}
		}
	});

})(hello);
