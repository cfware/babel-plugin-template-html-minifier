import {css} from 'lit-element';
const xl = css` 16 `;
const pxXl = css`   ${xl}px   `;
const sizeXl = css`
  font-size: ${pxXl};
`;
const mediaXL = css`@media(max-width: 800px)`;

css`.foo{${sizeXl}}.bar{font-size:${pxXl};color:blue}.no-semi{font-size:${pxXl}}`;
css`@media(max-width: ${pxXl}){.bar{font-size:${pxXl}}}`;
css`
  ${mediaXL} {
    .bar {
      font-size: ${pxXl};
    }
  }
`;
css`
  font-size: ${pxXl}
`;
