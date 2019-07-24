'use strict';

const CleanCSS = require('clean-css');
const {wrapCSS, unwrapCSS} = require('./wrap-css');

function createMinifyCSS(config) {
	const cleanCSS = new CleanCSS(config);

	return function (css, type) {
		const wrappedCSS = wrapCSS(css, type);
		const result = cleanCSS.minify(wrappedCSS);

		if (result.warnings.length > 0 || result.errors.length > 0) {
			return css;
		}

		return unwrapCSS(result.styles, type);
	};
}

module.exports = createMinifyCSS;
