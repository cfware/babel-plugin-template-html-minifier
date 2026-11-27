var _templateObject, _templateObject2;

function _taggedTemplateLiteral(e, t) {
	return t || (t = e.slice(0)), Object.freeze(Object.defineProperties(e, {
		raw: {
			value: Object.freeze(t)
		}
	}));
}

import {html, render} from 'lit-html';

const myclass = 'test';
const disabled = false;
html(_templateObject || (_templateObject = _taggedTemplateLiteral(["<span class=", " disabled=", ">test</span>"])), myclass, disabled);
render(_templateObject2 || (_templateObject2 = _taggedTemplateLiteral(["<span class=\"", "\" disabled=\"", "\" >test</span>"])), myclass, disabled);
