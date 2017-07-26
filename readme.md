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
Note that, unlike html-minifier, this plugin enables whitespace collapsing by default.

Additional options for the Babel plugin are:

### `tags`

An array of template tag identifier names. Defaults to just `html`.

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

## License

[MIT](./LICENSE)
