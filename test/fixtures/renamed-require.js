const {html: litHtml, render: html} = require('lit-html');

litHtml`<span class=test>test</span>`;
html`<span class="test" >test</span>`;
