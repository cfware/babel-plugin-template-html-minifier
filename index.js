const htmlMinifier = require('html-minifier')

// This placeholder has a space so that, if an expression is used
// in an attribute like `class="ab${something}cd"`, html-minifier
// doesn't remove the attribute quotes.
const placeholder = '__BABEL HTML MINIFIER PLACEHOLDER$$__'
const placeholderRx = /__BABEL HTML MINIFIER PLACEHOLDER\$\$__/g

const defaultOptions = {
  collapseWhitespace: true,
  conservativeCollapse: true,
  decodeEntities: true
}

const unsafeOptions = {
  conservativeCollapse: false,
  removeAttributeQuotes: true,
  removeOptionalTags: true,
  removeScriptTypeAttributes: true,
  removeStyleLinkTypeAttributes: true,
  removeTagWhitespace: true,
  sortAttributes: true,
  sortClassName: true,
  useShortDoctype: true
}

function getOptions (input) {
  const options = {}
  Object.assign(options, defaultOptions)
  if (input.unsafe) {
    Object.assign(options, unsafeOptions)
  }
  Object.assign(options, input)
  return options
}

module.exports = (babel) => {
  const t = babel.types

  function minify (template, options) {
    const node = template.node
    const quasis = node.quasis.map((quasi) => quasi.value.cooked)

    const html = quasis.join(placeholder)
    const minified = htmlMinifier.minify(html, getOptions(options))

    const parts = minified.split(placeholderRx)
    parts.forEach((value, i) => {
      template.get('quasis')[i].replaceWith(
        t.templateElement({ cooked: value, raw: value }, i === parts.length - 1)
      )
    })
  }

  return {
    visitor: {
      TaggedTemplateExpression (path) {
        if (path.get('tag').isIdentifier({ name: 'html' })) {
          minify(path.get('quasi'), this.opts)
        }
      }
    }
  }
}
