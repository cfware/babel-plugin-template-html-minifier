import {html, css} from 'lit-element';

html`
  <div>${'a'}</div>
  <!-- <div>${'b'}</div> -->
  <div>${'c'}</div>
`;

css`
  .a {
    font-size: 10px;
    color: ${'blue'};
  }

  .b {
    font-size: 10px;
    /* color: ${'green'}; */
  }

  .c {
    font-size: 10px;
    color: ${'red'};
  }
`;
