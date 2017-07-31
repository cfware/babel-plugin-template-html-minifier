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
    "template-html-minifier"
  ]
}
```

With options:

```json
{
  "plugins": [
    ["template-html-minifier", {
      "tags": ["bel"]
    }]
  ]
}
```

## Options

All options are passed through to html-minifier. See the [html-minifier docs](https://github.com/kangax/html-minifier#options-quick-reference).

Additional options for the Babel plugin are:

### `tags`

An array of template tag identifier names.

```js
yo`
  <div class="hello">
    Hello World
  </div>
`
multiline`
  This
  is
  not
  html
`
```

With `"tags": ["yo"]` becomes:

```js
yo`<div class="hello"> Hello World </div>`
multiline`
  This
  is
  not
  html
`
```

### `modules`

An array of modules that export a template tag.

```js
import bel from 'bel'
var yo = require('yo-yo')
bel`<div class="hello"> Hello World </div>`
yo`
  <div>
    <p>a</p>
    <p>b</p>
  </div>
`
```

With `"modules": ["bel", "yo-yo"]` becomes:

```js
import bel from 'bel';
var yo = require('yo-yo');
bel`<div class=hello>Hello World</div>`;
yo`<div><p>a<p>b</div>`;
```

## License

[MIT](./LICENSE)
