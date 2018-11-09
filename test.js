import test from 'ava';
import {transform} from '@babel/core';
import {module as litHtmlMain} from 'lit-html/package';
import {module as litElementMain} from '@polymer/lit-element/package';
import plugin from '.';

function babelTest(t, options) {
	const {exception, source, result, pluginOptions} = options;

	if (exception) {
		t.throws(() => transform(source, {plugins: [[plugin, pluginOptions]]}), exception);
	} else {
		const {code} = transform(source, {plugins: [[plugin, pluginOptions]]});

		t.is(code, result);
	}
}

const defaultHtmlMin = {
	collapseWhitespace: true
};

/* eslint-disable no-template-curly-in-string */
const tickSpan = '`<span class="${myclass}" disabled="disabled" >test</span>`';
const tickSpanTrimmed = '`<span class="${myclass}" disabled="disabled">test</span>`';
const tickSpanTrimmedBoolean = '`<span class="${myclass}" disabled>test</span>`';
const tickSpan2 = '`<span class="${classes}" readonly="readonly" disabled="${disabled}" >test</span>`';
const tickSpan2Trimmed = '`<span class="${classes}" readonly="readonly" disabled="${disabled}">test</span>`';
const tickComment = '`<!-- Comment with variable ${myclass} -->`';
/* eslint-enable no-template-curly-in-string */

test('do nothing', t => babelTest(t, {
	source: `import {html} from 'lit-html';
html${tickSpan};`,
	result: `import { html } from 'lit-html';
html${tickSpan};`
}));

test('default import', t => babelTest(t, {
	source: `import html from 'choo/html';
html${tickSpan};`,
	result: `import html from 'choo/html';
html${tickSpanTrimmed};`,
	pluginOptions: {
		modules: {
			'choo/html': [null]
		},
		htmlMinifier: defaultHtmlMin
	}
}));

test('named import', t => babelTest(t, {
	source: `import {html, render} from 'lit-html';
html${tickSpan};`,
	result: `import { html, render } from 'lit-html';
html${tickSpanTrimmed};`,
	pluginOptions: {
		modules: {
			'lit-html': ['html']
		},
		htmlMinifier: defaultHtmlMin
	}
}));

test('import *', t => babelTest(t, {
	source: `import * as lit from 'lit-html';
lit.html${tickSpan};
lit.nothtml${tickSpan};
lit.sub.html${tickSpan};
html${tickSpan};`,
	result: `import * as lit from 'lit-html';
lit.html${tickSpanTrimmed};
lit.nothtml${tickSpan};
lit.sub.html${tickSpan};
html${tickSpan};`,
	pluginOptions: {
		modules: {
			'lit-html': ['html']
		},
		htmlMinifier: defaultHtmlMin
	}
}));

test('templated boolean attribute', t => babelTest(t, {
	source: `import {html} from 'lit-html';
html${tickSpan2};`,
	result: `import { html } from 'lit-html';
html${tickSpan2Trimmed};`,
	pluginOptions: {
		modules: {
			'lit-html': ['html']
		},
		htmlMinifier: defaultHtmlMin
	}
}));

test('import of main module file by path specified in package.json', t => babelTest(t, {
	source: `import {html, render} from 'lit-html/${litHtmlMain}';
html${tickSpan};`,
	result: `import { html, render } from 'lit-html/${litHtmlMain}';
html${tickSpanTrimmed};`,
	pluginOptions: {
		modules: {
			'lit-html': ['html']
		},
		htmlMinifier: defaultHtmlMin
	}
}));

test('import of main scoped module file by path specified in package.json', t => babelTest(t, {
	source: `import {html, render} from '@polymer/lit-element/${litElementMain}';
html${tickSpan};`,
	result: `import { html, render } from '@polymer/lit-element/${litElementMain}';
html${tickSpanTrimmed};`,
	pluginOptions: {
		modules: {
			'@polymer/lit-element': ['html']
		},
		htmlMinifier: defaultHtmlMin
	}
}));

test('non-main module file is ignored', t => babelTest(t, {
	source: `import {html, render} from 'lit-html/lib/lit-extended.js';
html${tickSpan};`,
	result: `import { html, render } from 'lit-html/lib/lit-extended.js';
html${tickSpan};`,
	pluginOptions: {
		modules: {
			'lit-html': ['html']
		},
		htmlMinifier: defaultHtmlMin
	}
}));

test('requested non-main module file is processed', t => babelTest(t, {
	source: `import {html, render} from 'lit-html/lib/lit-extended.js';
html${tickSpan};`,
	result: `import { html, render } from 'lit-html/lib/lit-extended.js';
html${tickSpanTrimmed};`,
	pluginOptions: {
		modules: {
			'lit-html/lib/lit-extended.js': ['html']
		},
		htmlMinifier: defaultHtmlMin
	}
}));

test('renamed import', t => babelTest(t, {
	source: `import {html as litHtml, render as html} from 'lit-html';
litHtml${tickSpan};
html${tickSpan};`,
	result: `import { html as litHtml, render as html } from 'lit-html';
litHtml${tickSpanTrimmed};
html${tickSpan};`,
	pluginOptions: {
		modules: {
			'lit-html': ['html']
		},
		htmlMinifier: defaultHtmlMin
	}
}));

test('collapseBooleanAttributes with no dynamic boolean attributes', t => babelTest(t, {
	source: `import {html} from 'lit-html';
html${tickSpan};`,
	result: `import { html } from 'lit-html';
html${tickSpanTrimmedBoolean};`,
	pluginOptions: {
		modules: {
			'lit-html': ['html']
		},
		htmlMinifier: {
			...defaultHtmlMin,
			collapseBooleanAttributes: true
		}
	}
}));

test('collapseBooleanAttributes with a dynamic boolean attributes', t => babelTest(t, {
	source: `import {html} from 'lit-html';
html${tickSpan2};`,
	exception: plugin.majorDeleteError,
	pluginOptions: {
		modules: {
			'lit-html': ['html']
		},
		htmlMinifier: {
			...defaultHtmlMin,
			collapseBooleanAttributes: true
		}
	}
}));

test('removeComments with javascript in a comment', t => babelTest(t, {
	source: `import {html} from 'lit-html';
html${tickComment};`,
	exception: plugin.majorDeleteError,
	pluginOptions: {
		modules: {
			'lit-html': ['html']
		},
		htmlMinifier: {
			...defaultHtmlMin,
			removeComments: true
		}
	}
}));

test('ignore basic calls', t => babelTest(t, {
	source: 'console.log(\'hello\');',
	result: 'console.log(\'hello\');'
}));

test('default require', t => babelTest(t, {
	source: `const html = require('choo/html');
html${tickSpan};`,
	result: `const html = require('choo/html');

html${tickSpanTrimmed};`,
	pluginOptions: {
		modules: {
			'choo/html': [null]
		},
		htmlMinifier: defaultHtmlMin
	}
}));

test('require all from module with properties', t => babelTest(t, {
	source: `const lit = require('lit-html');
lit.html${tickSpan};
lit.render${tickSpan};`,
	result: `const lit = require('lit-html');

lit.html${tickSpanTrimmed};
lit.render${tickSpan};`,
	pluginOptions: {
		modules: {
			'lit-html': ['html']
		},
		htmlMinifier: defaultHtmlMin
	}
}));

test('named require', t => babelTest(t, {
	source: `const {html, render} = require('lit-html');
html${tickSpan};`,
	result: `const {
  html,
  render
} = require('lit-html');

html${tickSpanTrimmed};`,
	pluginOptions: {
		modules: {
			'lit-html': ['html']
		},
		htmlMinifier: defaultHtmlMin
	}
}));

test('renamed requires', t => babelTest(t, {
	source: `const {html: litHtml, render: html} = require('lit-html');
litHtml${tickSpan};
html${tickSpan};`,
	result: `const {
  html: litHtml,
  render: html
} = require('lit-html');

litHtml${tickSpanTrimmed};
html${tickSpan};`,
	pluginOptions: {
		modules: {
			'lit-html': ['html']
		},
		htmlMinifier: defaultHtmlMin
	}
}));

test('ignore array destructure require', t => babelTest(t, {
	source: `const [html] = require('lit-html');
html${tickSpan};`,
	result: `const [html] = require('lit-html');

html${tickSpan};`,
	pluginOptions: {
		modules: {
			'lit-html': ['html']
		},
		htmlMinifier: defaultHtmlMin
	}
}));

test('ignore invalid require', t => babelTest(t, {
	source: `const html = require(true);
html${tickSpan};`,
	result: `const html = require(true);

html${tickSpan};`
}));

test('ignore require of unwanted module', t => babelTest(t, {
	source: `const html = require('lit-html');
html${tickSpan};`,
	result: `const html = require('lit-html');

html${tickSpan};`
}));

test('ignore calls that are not require', t => babelTest(t, {
	source: `const html = notrequire('choo/html');
html${tickSpan};`,
	result: `const html = notrequire('choo/html');
html${tickSpan};`,
	pluginOptions: {
		modules: {
			'choo/html': [null]
		},
		htmlMinifier: defaultHtmlMin
	}
}));

test('ignore calls that are obj.require', t => babelTest(t, {
	source: `const html = obj.require('choo/html');
html${tickSpan};`,
	result: `const html = obj.require('choo/html');

html${tickSpan};`,
	pluginOptions: {
		modules: {
			'choo/html': [null]
		},
		htmlMinifier: defaultHtmlMin
	}
}));

test('tolerate built-in modules', t => babelTest(t, {
	source: 'const fs = require(\'fs\');',
	result: 'const fs = require(\'fs\');',
	pluginOptions: {
		modules: {
			'choo/html': [null]
		}
	}
}));

test('ignore unknown modules', t => babelTest(t, {
	source: 'const unknown = require(\'unknown-module\');',
	result: 'const unknown = require(\'unknown-module\');',
	pluginOptions: {
		modules: {
			'choo/html': [null]
		}
	}
}));
