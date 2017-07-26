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

function getOptions (input) {
  return Object.assign({}, defaultOptions, input)
}

function getTagNames (option) {
  if (Array.isArray(option)) return option
  if (typeof option === 'string') return [option]
  if (option == null) return ['html']
  throw new TypeError(`Expected an array of strings in the "tags" option, got ${typeof option}`)
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
        const tag = path.get('tag')
        const isHtmlTag = getTagNames(this.opts.tags)
          .some((name) => tag.isIdentifier({ name: name }))
        if (isHtmlTag) {
          minify(path.get('quasi'), this.opts)
        }
      }
    }
  }
}
