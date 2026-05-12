import {html, css as style} from './template-tags';
import {html as page} from 'custom-html';
import untouchedHtml from 'custom-html';

html`<div class=example>Hello</div>`;

style`.example{color:red}`;

page`<span data-id=test>World</span>`;

untouchedHtml`
	<div class="example" >
		Hello
	</div>
`;
