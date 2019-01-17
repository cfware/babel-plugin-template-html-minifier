const {base} = require('hyperhtml-element');

class ele extends base {
	render() {
		this.html`<div>test</div>`;
		this.nothtml`<div >test</div>`;
	}
}

module.export = ele;
