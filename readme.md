# babel-plugin-template-html-minifier

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
        "@polymer/lit-element": ["html"],
        "choo/html": [null]
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
import {html as litHtml} from '@polymer/lit-element';
import html from 'some-module';

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
import {html as litHtml} from '@polymer/lit-element';
import html from 'some-module';

choo`<div class="hello"> Hello World </div>`;

lit.html`<div class="hello"> Hello World </div>`;

litHtml`<div class="hello"> Hello World </div>`;

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
* litHtml is processed because `"@polymer/lit-element": ["html"]`.
* html is not processed because it was exported from an unlisted module.

All matching is done based on the exported name, not the local/imported name.

## License

[MIT](./LICENSE)
