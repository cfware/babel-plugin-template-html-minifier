import {html} from 'lit-html';

const myclass = 'test';
const noMin = html;
noMin`<span class="${myclass}" disabled="disabled" >test</span>`;
