Package.describe({
	name: "velocity:test-proxy",
	summary: "Dynamically created package to expose test files to mirrors",
	version: "0.0.4",
	debugOnly: true
});

Package.on_use(function (api) {
	api.add_files("tests/jasmine/client/integration/projectService.js",["client"]);
	api.add_files("tests/jasmine/client/integration/activeDbService.js",["client"]);
});