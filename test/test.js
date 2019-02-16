import test from 'ava';
import path from 'path';

import {transform, transformFileAsync} from '@babel/core';

import plugin from '..';

const htmlMinifier = {
	collapseWhitespace: true,
	removeComments: true,
	removeAttributeQuotes: true,
	minifyCSS: {level: 2},
	minifyJS: true
};

const defaultLitConfig = {
	modules: {
		'lit-html': ['html']
	},
	htmlMinifier
};
const complexLitConfig = {
	modules: {
		'lit-html': [{name: 'html'}]
	},
	htmlMinifier
};

const defaultChooConfig = {
	modules: {
		'choo/html': [null]
	},
	htmlMinifier
};
const defaultHyperConfig = {
	modules: {
		'hyperhtml-element': [
			{
				name: null,
				member: 'html'
			}
		]
	},
	htmlMinifier
};
const namedHyperConfig = {
	modules: {
		'hyperhtml-element': [
			{
				name: 'base',
				member: 'html'
			}
		]
	},
	htmlMinifier
};
const factoryHyperConfig = {
	modules: {
		'hyperhtml-element': [
			{
				name: 'bind',
				type: 'factory'
			}
		]
	},
	htmlMinifier
};
const wrongHyperConfig = {
	modules: {
		'hyperhtml-element': [
			{
				name: 'wrong',
				member: 'html'
			}
		]
	},
	htmlMinifier
};
const defaultWrongMemberConfig = {
	modules: {
		'wrong-element': [
			{
				name: null,
				member: 'html'
			}
		]
	},
	htmlMinifier
};
const namedWrongMemberConfig = {
	modules: {
		'wrong-element': [
			{
				name: 'base',
				member: 'html'
			}
		]
	},
	htmlMinifier
};

const fixturePath = path.resolve(__dirname, 'fixtures');

async function fileTest(t, sourceID, resultID, pluginOptions, ...plugins) { // eslint-disable-line max-params
	const titleID = t.title.replace(/ /g, '-');
	if (resultID === true) {
		resultID = (sourceID || titleID) + '-source';
	}

	const sourceFile = path.join(fixturePath, (sourceID || titleID) + '-source.js');
	const resultFile = path.join(fixturePath, [resultID ? resultID : titleID, '.js'].join(''));

	plugins.unshift([plugin, pluginOptions || defaultLitConfig]);
	const babelrc = {
		babelrc: false,
		configFile: false,
		compact: true
	};
	const {code} = await transformFileAsync(sourceFile, {...babelrc, plugins});
	const {code: result} = await transformFileAsync(resultFile, babelrc);

	t.is(code, result);
}

test('errors', t => {
	const testOptions = (source, options) => transform(source, {
		babelrc: false,
		configFile: false,
		compact: true,
		plugins: [
			[plugin, options]
		]
	});

	t.throws(() => testOptions('', {
		modules: {
			'choo/html': [null, null]
		}
	}));

	t.throws(() => testOptions('', {
		modules: {
			'lit-html': ['html', 'html']
		}
	}));

	const brokenBoolSource = `
		import {html} from 'lit-html';
		html\`<div disabled="\${disabled}"></div>\`;
	`;
	t.throws(() => testOptions(brokenBoolSource, {
		modules: {
			'lit-html': [{name: 'html', type: 'basic'}]
		},
		htmlMinifier: {
			collapseBooleanAttributes: true
		}
	}), plugin.majorDeleteError);

	const brokenCommentSource = `
		import {html} from 'lit-html';
		html\`<div><!-- \${silly} --></div>\`;
	`;
	t.throws(() => testOptions(brokenCommentSource, {
		modules: {
			'lit-html': ['html']
		},
		htmlMinifier: {
			removeComments: true
		}
	}), plugin.majorDeleteError);

	const cssSource = `
		import {css} from 'lit-element';
		css\`.sel{background:red;}\`;
	`;
	t.throws(() => testOptions(cssSource, {
		modules: {
			'lit-element': [{
				name: 'css',
				encapsulation: 'style '
			}]
		},
		htmlMinifier
	}), plugin.majorDeleteError);
});

test('do nothing', fileTest, 'lit-html', true, {});
test('default import', fileTest, 'choo', null, defaultChooConfig);
test('named import', fileTest, 'lit-html', null, complexLitConfig);
test('ignore copy', fileTest, null, true);
test('import star', fileTest);
test('templated special attributes', fileTest);
test('import of main module file', fileTest);
test('non-main module file is ignored', fileTest, null, true);
test('requested non-main module file is processed', fileTest, 'non-main-module-file-is-ignored', null, {
	modules: {
		'lit-element/lib/css-tag': [{
			name: 'css',
			encapsulation: 'style'
		}]
	},
	htmlMinifier
});
test('renamed import', fileTest);
test('ignore basic calls', fileTest, null, true);
test('default require', fileTest, null, null, defaultChooConfig);
test('require all from module with properties', fileTest);
test('named require', fileTest);
test('renamed require', fileTest);
test('ignore array destructure require', fileTest, null, true);
test('ignore invalid require', fileTest, null, true);
test('ignore require of unwanted module', fileTest, null, true);
test('ignore calls that are not require', fileTest, null, true);
test('ignore calls that are obj.require', fileTest, null, true);
test('tolerate built-in modules', fileTest, null, true);
test('ignore unknown modules', fileTest, null, true);
test('ignore relative import', fileTest, null, true);

test('require member class of default export', fileTest, 'require-hyperhtml-default', null, defaultHyperConfig);
test('require member class of default export from non-matching module', fileTest, 'require-hyperhtml-default', true, defaultWrongMemberConfig);
test('require member class of unwanted default export', fileTest, 'require-hyperhtml-default', true, namedHyperConfig);

test('require member class of named export', fileTest, 'require-hyperhtml-named', null, namedHyperConfig);
test('require member class of named export from non-matching module', fileTest, 'require-hyperhtml-named', true, namedWrongMemberConfig);
test('require member class of unwanted named export', fileTest, 'require-hyperhtml-named', true, wrongHyperConfig);

test('require member class of star export', fileTest, 'require-hyperhtml-star', null, namedHyperConfig);
test('require member class of star export from non-matching module', fileTest, 'require-hyperhtml-star', true, namedWrongMemberConfig);

test('import member class of default export', fileTest, 'import-hyperhtml-default', null, defaultHyperConfig);
test('import member class of default export from non-matching module', fileTest, 'import-hyperhtml-default', true, defaultWrongMemberConfig);
test('import member class of unwanted default export', fileTest, 'import-hyperhtml-default', true, namedHyperConfig);

test('import member class of named export', fileTest, 'import-hyperhtml-named', null, namedHyperConfig);
test('import member class of named export from non-matching module', fileTest, 'import-hyperhtml-named', true, namedWrongMemberConfig);
test('import member class of unwanted named export', fileTest, 'import-hyperhtml-named', true, wrongHyperConfig);

test('import member class of star export', fileTest, 'import-hyperhtml-star', null, namedHyperConfig);
test('import member class of star export from non-matching module', fileTest, 'import-hyperhtml-star', true, namedWrongMemberConfig);

test('ignore this outside class', fileTest, null, true);
test('css unicode with double-backslash', fileTest);
test('transform-template-literals after', fileTest, 'lit-html', null, null, '@babel/plugin-transform-template-literals');
test('tagged template non-factory', fileTest);
test('tagged template factory', fileTest, null, null, factoryHyperConfig);

test('ignore tagged non-function', fileTest, null, true);
