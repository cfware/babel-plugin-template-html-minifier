import base from 'hyperhtml-element';

export class ele extends base {
	render() {
		this.html`<div>test</div>`;
		this.nothtml`<div >test</div>`;
	}
}
