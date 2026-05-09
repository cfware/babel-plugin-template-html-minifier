import {html as pageHtml, render} from './template-tags';
import {css} from './theme';

const color = 'red';

pageHtml`<div class=card disabled=disabled>${color}</div>`;
css`.card{color:${color}}`;
render`<div class="card" disabled="disabled" ></div>`;
