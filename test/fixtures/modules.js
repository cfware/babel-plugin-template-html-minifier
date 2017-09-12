var view = require('choo/html')
var css = require('sheetify')

css`
  body {
    background: red
  }
`

module.exports = function () {
  return view`
    <div id="hello">world</div>
  `
}
