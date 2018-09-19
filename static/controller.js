/* global hello, angular */
const app = angular.module('app', ['ngNotify']);

app.controller('controller', ['$scope', '$filter', '$http', 'ngNotify', function($scope, $filter, $http, ngNotify) {

	const authServer = hello('authserver');

	// Fields
	$scope.fields = [
		{name: 'reference', required: true},
		{name: 'domain', required: true},
		{name: 'client_id', required: true},
		{name: 'client_secret', required: true},
		{name: 'grant_url', required: false}
	];

	// Apps
	// A list of the users currently registered apps
	$scope.apps = [];

	// Add
	$scope.addApp = function() {
		$scope.apps.push({
			client_id: '',
			client_secret: ''
		});
	};

	// Save All
	$scope.saveApps = function() {

		// Loop through all the apps
		$scope.apps.forEach(app => {
			$scope.postApp(app);
		});

	};

	// Post One
	$scope.postApp = function(app) {

		// Post JSON formatted content
		authServer.api('me/apps', 'post', JSON.parse(angular.toJson(app)))
			.then(resp => {

				ngNotify.set('Successfully updated records', 'success');

				// INSERT returns a GUID
				if (resp.id) {
					app.id = resp.id;
				}

				// Apply
				$scope.$apply();

			}, err => {

				if (err.error && err.error.message && err.error.message.indexOf('unique constraint "app_pkey"') > -1) {
					err.error.message = 'The client_id has already been set';
				}

				ngNotify.set(err.error.message, 'error');

				// Apply
				$scope.$apply();
			});
	};

	//
	// Delete
	$scope.deleteApp = function(app) {

		// Remove from the $scope
		const index = $scope.apps.indexOf(app);
		$scope.apps.splice(index, 1);

		// Post this request off to the server
		authServer.api('me/apps', 'delete', {id: app.id})
			.then(() => {
				ngNotify.set('Successfully deleted record', 'success');
			}, err => {
				ngNotify.set(err.error.message, 'error');
			});
	};

	// Profiles
	$scope.profile = null;

	// Login
	// Trigger authentication
	$scope.login = function() {
		authServer.login({force: true});
	};
	$scope.logout = function() {
		authServer
			.logout({force: true})
			.then(() => {
				$scope.profile = null;
				$scope.apps = [];
				$scope.$apply();
			});
	};

	// Get the user credentials
	hello.on('auth.login', () => {

		// Get the user profile
		authServer.api('me', {fields: 'id,name,picture'})
			.then(o => {

			// Update the Profile
				$scope.profile = o;
				$scope.$apply();
			});

		// Get the users Apps
		authServer.api('me/apps')
			.then(resp => {

			// Loop through the rows and add to the list of the users apps.
				resp.data.forEach(app => {

				// Does it exist
					const b = $scope.apps.filter(_app => {
						return _app.id === app.id;
					}).length;

					// Do we need to insert it?
					if (!b) {
						$scope.apps.push(app);
					}
				});

				$scope.$apply();

			});
	});

	hello.init({
		authserver: '9fa6205934cd495b4a3a50795cf77990'
	}, {
		redirect_uri: '/redirect.html',
		oauth_proxy: '/proxy'
	});

}]);
