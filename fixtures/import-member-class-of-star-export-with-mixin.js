import * as elements from 'hyperhtml-element';

const myMixin = baseClass => class extends baseClass {

};

export class ele extends myMixin(elements.base) {
	render() {
		this.html`<div >test</div>`;
		this.nothtml`<div >test</div>`;
	}
}
