const htmlMinifier = require('html-minifier')

// This placeholder has a space so that, if an expression is used
// in an attribute like `class="ab${something}cd"`, html-minifier
// doesn't remove the attribute quotes.
const placeholder = '__BABEL HTML MINIFIER PLACEHOLDER$$__'
const placeholderRx = /__BABEL HTML MINIFIER PLACEHOLDER\$\$__/g

function getNames (name, option) {
  if (Array.isArray(option)) return option
  if (typeof option === 'string') return [option]
  if (option == null) return []
  throw new TypeError(`Expected an array of strings in the "${name}" option, got ${typeof option}`)
}

module.exports = (babel) => {
  const t = babel.types

  function minify (template, options) {
    const node = template.node
    const quasis = node.quasis.map((quasi) => quasi.value.cooked)

    const html = quasis.join(placeholder)
    const minified = htmlMinifier.minify(html, options)

    const parts = minified.split(placeholderRx)
    parts.forEach((value, i) => {
      template.get('quasis')[i].replaceWith(
        t.templateElement({ cooked: value, raw: value }, i === parts.length - 1)
      )
    })
  }

  return {
    visitor: {
      Program: {
        enter () {
          this.bindings = new Set()
        }
      },
      CallExpression (path) {
        if (!path.parentPath.isVariableDeclarator()) {
          return
        }
        if (path.get('callee').isIdentifier({ name: 'require' })) {
          const moduleName = path.get('arguments.0')
          const isHtmlRequire = getNames('modules', this.opts.modules)
            .some((name) => moduleName.isStringLiteral({ value: name }))

          if (isHtmlRequire) {
            this.bindings.add(path.parentPath.scope.getBinding(path.parentPath.node.id.name))
          }
        }
      },
      ImportDeclaration (path) {
        const moduleName = path.get('source').node.value
        const isHtmlRequire = getNames('modules', this.opts.modules)
          .some((name) => moduleName === name)
        const specifier = path.get('specifiers')[0]
        if (specifier.isImportDefaultSpecifier()) {
          this.bindings.add(path.scope.getBinding(specifier.node.local.name))
        }
      },
      TaggedTemplateExpression (path) {
        const tag = path.get('tag')
        const isHtmlTag = getNames('tags', this.opts.tags).some((name) => tag.isIdentifier({ name: name }))
          || (tag.isIdentifier() && this.bindings.has(path.scope.getBinding(tag.node.name)))
        if (isHtmlTag) {
          minify(path.get('quasi'), this.opts)
        }
      }
    }
  }
}
