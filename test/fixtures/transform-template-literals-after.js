function _templateObject2() {
	const data = _taggedTemplateLiteral(["<span class=\"", "\" disabled=\"", "\" >test</span>"]);
	_templateObject2 = function() {
		return data;
	};
	return data;
}

function _templateObject(){
	const data = _taggedTemplateLiteral(["<span class=", " disabled=", ">test</span>"]);
	_templateObject = function(){
		return data;
	};
	return data;
}

function _taggedTemplateLiteral(strings, raw) {
	if (!raw) {
		raw = strings.slice(0);
	}
	return Object.freeze(Object.defineProperties(strings, {raw: {value: Object.freeze(raw)}}));
}

import {html, render} from 'lit-html';

const myclass = 'test';
const disabled = false;
html(_templateObject(),myclass,disabled);render(_templateObject2(),myclass,disabled);
