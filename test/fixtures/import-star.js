import * as lit from 'lit-html';

const html = () => {};
const myclass = 'test';
lit.html`<span class=${myclass} disabled=disabled>test</span>`;
lit.render`<span class="${myclass}" disabled="disabled" >test</span>`;
lit.html.sub`<span class="${myclass}" disabled="disabled" >test</span>`;
html`<span class="${myclass}" disabled="disabled" >test</span>`;
