var html = require('choo/html')
var css = require('sheetify')

var prefix = css`
  :host {
    border: 1px solid pink;
    background: orange;
    font: 16pt 'comic sans';
  }
`

module.exports = function (props) {
  return html`
    <div class="${prefix} ${props.class}">
      <input
        value="${props.value}"
        type="text"
        oninput="${onchange}" />
    </div>
  `
  function onchange (e) {
    console.log(e.target.value)
  }
}
