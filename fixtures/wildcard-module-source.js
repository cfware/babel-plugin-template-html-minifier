import {html, css} from 'my-component-library';
import {css as localCss} from './local-css';

html`<span class="hello" >Hello</span>`;
css`
  .hello {
    color: blue;
  }
`;
localCss`
  .local {
    color: red;
  }
`;
