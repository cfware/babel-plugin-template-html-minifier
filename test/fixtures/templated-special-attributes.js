import {html} from 'lit-html';

const style = 'background: red';
html`<span style=${style} onclick=${() => console.log('click')}>test</span>`;
