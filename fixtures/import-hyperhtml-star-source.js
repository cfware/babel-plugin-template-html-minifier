import * as elements from 'hyperhtml-element';

export class ele extends elements.base {
	render() {
		this.html`<div >test</div>`;
		this.nothtml`<div >test</div>`;
	}
}
