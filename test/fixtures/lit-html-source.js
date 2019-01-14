import {html, render} from 'lit-html';

const myclass = 'test';
const disabled = false;
html`<span class="${myclass}" disabled="${disabled}" >test</span>`;
render`<span class="${myclass}" disabled="${disabled}" >test</span>`;
