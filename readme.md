# babel-plugin-template-html-minifier

[![Travis CI][travis-image]][travis-url]
[![NPM Version][npm-image]][npm-url]
[![NPM Downloads][downloads-image]][downloads-url]
[![MIT][license-image]](LICENSE)

Minify HTML in tagged template strings using [html-minifier](https://github.com/kangax/html-minifier).

## Install

```bash
npm install --save-dev babel-plugin-template-html-minifier
```

## Usage

In `.babelrc`:

```json
{
  "plugins": [
    ["template-html-minifier", {
      "modules": {
        "lit-html": ["html"],
        "lit-element": [
          "html",
          {"name": "css", "encapsulation": "style"}
        ],
        "choo/html": [null],
        "hyperhtml": [{"name": "bind", "type": "factory"}],
        "hyperhtml-element": [{"name": null, "member": "html"}]
      },
      "htmlMinifier": {
        "collapseWhitespace": true
      }
    }]
  ]
}
```

## Options

### `htmlMinifier`

The value of this property is passed unmodified to html-minifier. See the
[html-minifier docs](https://github.com/kangax/html-minifier#options-quick-reference).

Note `collapseBooleanAttributes` should not be used when working with `lit-html`
or other templating systems which give special meaning to non-static boolean
attributes.  Enabling `collapseBooleanAttributes` will cause this plugin to
throw an exception:

```js
html`<input readonly="${readonly}">`;
```

This exception is for two reasons.  First because it means the chosen options have
caused `html-minifier` to change the meaning of the HTML template.  Second because
it deletes the point where `${readonly}` goes into the final output.

### `modules`

A list of module names or import paths where tags are imported from.  The values in
the arrays refers to the export names, not the import names.  `null` refers to the
default export.

```js
import choo from 'choo/html';
import * as lit from 'lit-html';
import {html as litHtml, css} from 'lit-element';
import HyperHTMLElement from 'hyperhtml-element';
import html from 'some-module';
import {bind} from 'hyperhtml';

choo`
  <div class="hello">
    Hello World
  </div>
`;

lit.html`
  <div class="hello">
    Hello World
  </div>
`;

litHtml`
  <div class="hello">
    Hello World
  </div>
`;

css`
  .sel {
    background: red;
  }
`;

class MyHyperHTMLElement extends HyperHTMLElement {
  created() {
    this.render();
  }

  render() {
    this.html`
      <div>
        Hello World
      </div>
    `;
  }
}

bind(document.body)`
  <div>
    Hello World
  </div>
`;

html`
  This
  is
  not
  processed
`;
```

Using the .babelrc shown in [usage](#Usage) produces the following output:

```js
import choo from 'choo/html';
import * as lit from 'lit-html';
import {html as litHtml, css} from 'lit-element';
import HyperHTMLElement from 'hyperhtml-element';
import html from 'some-module';
import {bind} from 'hyperhtml';

choo`<div class="hello"> Hello World </div>`;

lit.html`<div class="hello"> Hello World </div>`;

litHtml`<div class="hello"> Hello World </div>`;

css`.sel{background:red}`;

class MyHyperHTMLElement extends HyperHTMLElement {
  created() {
    this.render();
  }

  render() {
    this.html`<div> Hello World </div>`;
  }
}

bind(document.body)`<div> Hello World </div>`;

html`
  This
  is
  not
  processed
`;
```

* choo is processed because of `"choo/html": [null]` specifies that the default
export should be processed.
* lit.html is processed because `"lit-html": ["html"]`.
* litHtml is processed because `"lit-element": ["html"]`.
* css is processed because `"lit-element": [{"name": "css", "encapsulation": "style"}]`.
  The `encapsulation` argument ensures that `html-minifier` understands that the template
  contains CSS, without it the template would be processed as HTML.
* `this.html` in MyHyperHTMLElement is processed because
`"hyperhtml-element": [{"name": null, "member": "html"}]` specifies that the `html` member
of classes which extend the default export should be processed.
* bind is processed because of `"hyperhtml": [{"name": "bind", "type": "factory"}]`, the
  type `factory` specifies the bind returns a function which processes the tagged templates.
* html is not processed because it was exported from an unlisted module.

All matching is done based on the exported name, not the local/imported name.

## Running tests

Tests are provided by xo and ava.

```sh
npm install
npm test
```

## Attribution

This module was originally created by [goto-bus-stop](https://github.com/goto-bus-stop).


[npm-image]: https://img.shields.io/npm/v/babel-plugin-template-html-minifier.svg
[npm-url]: https://npmjs.org/package/babel-plugin-template-html-minifier
[travis-image]: https://travis-ci.org/cfware/babel-plugin-template-html-minifier.svg?branch=master
[travis-url]: https://travis-ci.org/cfware/babel-plugin-template-html-minifier
[downloads-image]: https://img.shields.io/npm/dm/babel-plugin-template-html-minifier.svg
[downloads-url]: https://npmjs.org/package/babel-plugin-template-html-minifier
[license-image]: https://img.shields.io/npm/l/babel-plugin-template-html-minifier.svg

