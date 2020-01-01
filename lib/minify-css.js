'use strict';

const CleanCSS = require('clean-css');
const {wrapCSS, unwrapCSS} = require('./wrap-css');

function createMinifyCSS(config, failOnError, logOnError) {
	const cleanCSS = new CleanCSS(config);

	return function (css, type) {
		const wrappedCSS = wrapCSS(css, type);
		const result = cleanCSS.minify(wrappedCSS);

		if (result.warnings.length > 0 || result.errors.length > 0) {
			if (failOnError) {
				throw new Error(`Error while minifying CSS: ${result.errors.join(', ')} ${result.warnings.join(', ')}`);
			}

			if (logOnError) {
				result.warnings.forEach(console.error);
				result.errors.forEach(console.error);
			}
			return css;
		}

		return unwrapCSS(result.styles, type);
	};
}

module.exports = createMinifyCSS;
