const rewireStyl = require("react-app-rewire-stylus-modules");

module.exports = function override(config, env) {
	config = rewireStyl(config, env);
	return config;
};
