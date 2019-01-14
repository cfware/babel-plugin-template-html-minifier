const elements = require('hyperhtml-element');

class ele extends elements.base {
	render() {
		this.html`<div>test</div>`;
		this.nothtml`<div >test</div>`;
	}
}

module.export = ele;
