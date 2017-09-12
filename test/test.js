const test = require('tape')
const path = require('path')
const readFile = require('fs').readFileSync
const babel = require('babel-core')
const minifier = require('../')

function read (name) {
  return readFile(path.join(__dirname, name), 'utf8')
}

function transform (code, opts) {
  return babel.transform(code, {
    plugins: [
      [minifier, opts]
    ]
  }).code + '\n'
}

test('minifies html', (t) => {
  const result = transform(read('fixtures/munar-emotes.js'), {
    modules: ['bel', 'yo-yo'],
    collapseBooleanAttributes: true,
    collapseWhitespace: true,
    conservativeCollapse: false,
    decodeEntities: true,
    removeAttributeQuotes: true,
    removeComments: true,
    removeEmptyAttributes: true,
    removeOptionalTags: true,
    removeRedundantAttributes: true,
    removeScriptTypeAttributes: true,
    removeStyleLinkTypeAttributes: true,
    removeTagWhitespace: true,
    sortAttributes: true,
    sortClassName: true,
    useShortDoctype: true
  })

  t.equal(result, read('fixtures/munar-emotes.expected.js'))
  t.end()
})

test('minifies listed template tags only', (t) => {
  const result = transform(read('fixtures/tags.js'), {
    tags: ['html'],
    collapseWhitespace: true,
    conservativeCollapse: false,
    removeAttributeQuotes: true
  })

  t.equal(result, read('fixtures/tags.expected.js'))
  t.end()
})

test('minifies tags from listed modules only', (t) => {
  const result = transform(read('fixtures/modules.js'), {
    modules: ['choo/html'],
    collapseWhitespace: true,
    conservativeCollapse: false,
    removeAttributeQuotes: true
  })

  t.equal(result, read('fixtures/modules.expected.js'))
  t.end()
})

test('works with template values', (t) => {
  const result = transform(read('fixtures/values.js'), {
    modules: ['choo/html'],
    collapseWhitespace: true,
    conservativeCollapse: false,
    removeAttributeQuotes: true
  })

  t.equal(result, read('fixtures/values.expected.js'))
  t.end()
})
