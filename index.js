'use strict';
const htmlMinifier = require('html-minifier');

const cookRawQuasi = require('./cook-raw-quasi');
const {normalizeModulesConfig, getModuleConfig} = require('./config.js');

function setupDefaultBindingOption(bindings, binding, moduleConfig) {
	if (!moduleConfig.defaultExport) {
		return false;
	}

	bindings.push({
		binding,
		options: moduleConfig.defaultExport,
		star: false
	});

	return true;
}

function setupNamedBindingOption(bindings, binding, moduleConfig, name) {
	const namedExports = moduleConfig.namedExports.filter(item => item.name === name);
	if (namedExports.length === 1) {
		bindings.push({
			binding,
			options: namedExports[0],
			star: false
		});
	}
}

function setupStarBindingOption(bindings, binding, moduleConfig) {
	bindings.push({
		binding,
		options: moduleConfig.namedExports,
		star: true
	});
}

const majorDeleteError = 'html-minifier deleted something major, cannot proceed.';
module.exports = babel => {
	const t = babel.types;

	function minify(template, options, bindingOptions) {
		function uniqueId(value) {
			let id;
			do {
				id = Math.random().toString(36).replace(/^0\.\d*/, '');
			} while (value.indexOf(id) !== -1);

			return 'babel-plugin-template-html-minifier:' + id;
		}

		const {node} = template;
		const quasis = node.quasis.map(quasi => quasi.value.raw);

		const placeholder = uniqueId(quasis.join(''));
		let openingTag = '';
		let closingTag = '';
		if (bindingOptions.encapsulation) {
			openingTag = `<${bindingOptions.encapsulation}>`;
			closingTag = `</${bindingOptions.encapsulation}>`;
		}

		const minified = htmlMinifier.minify(openingTag + quasis.join(placeholder) + closingTag, options);
		if (!minified.startsWith(openingTag) || !minified.endsWith(closingTag)) {
			throw new Error(majorDeleteError);
		}

		const parts = minified.slice(openingTag.length, -closingTag.length || undefined).split(placeholder);
		if (parts.length !== quasis.length) {
			throw new Error(majorDeleteError);
		}

		parts.forEach((raw, i) => {
			const args = cookRawQuasi(babel, raw);
			template.get('quasis')[i].replaceWith(t.templateElement(args, i === parts.length - 1));
		});
	}

	return {
		visitor: {
			Program: {
				enter() {
					this.moduleConfigs = normalizeModulesConfig(this.opts.modules);
					this.bindings = [];
				}
			},
			CallExpression(path) {
				if (!path.parentPath.isVariableDeclarator()) {
					return;
				}

				if (path.get('callee').isIdentifier({name: 'require'})) {
					const moduleName = path.get('arguments.0');

					if (!moduleName.isStringLiteral()) {
						return;
					}

					const moduleConfig = getModuleConfig(this.moduleConfigs, moduleName.node.value);
					if (moduleConfig.count === 0) {
						return;
					}

					const idPath = path.parentPath.get('id');

					if (idPath.isIdentifier()) {
						const binding = path.parentPath.scope.getBinding(idPath.node.name);

						if (!setupDefaultBindingOption(this.bindings, binding, moduleConfig)) {
							setupStarBindingOption(this.bindings, binding, moduleConfig, idPath.node.name);
						}
					} else if (idPath.isObjectPattern()) {
						idPath.node.properties.forEach(prop => {
							const binding = path.scope.getBinding(prop.value.name);
							setupNamedBindingOption(this.bindings, binding, moduleConfig, prop.key.name);
						});
					}
				}
			},
			ImportDeclaration(path) {
				const moduleConfig = getModuleConfig(this.moduleConfigs, path.node.source.value);
				if (moduleConfig.count === 0) {
					return;
				}

				path.get('specifiers').forEach(spec => {
					const binding = path.scope.getBinding(spec.node.local.name);
					if (spec.isImportNamespaceSpecifier()) {
						setupStarBindingOption(this.bindings, binding, moduleConfig, spec.node.local.name);
					} else if (spec.isImportDefaultSpecifier()) {
						setupDefaultBindingOption(this.bindings, binding, moduleConfig);
					} else {
						setupNamedBindingOption(this.bindings, binding, moduleConfig, spec.node.imported.name);
					}
				});
			},
			TaggedTemplateExpression(path) {
				const tag = path.get('tag');

				if (tag.isMemberExpression()) {
					const propName = tag.node.property.name;

					if (tag.get('object').isThisExpression()) {
						const cls = path.findParent(path => path.isClassDeclaration());
						if (!cls || !cls.node.superClass) {
							return;
						}

						const {superClass} = cls.node;
						if (cls.get('superClass').isIdentifier()) {
							const binding = cls.scope.getBinding(superClass.name);
							const bindings = this.bindings.filter(item => item.binding === binding && item.star === false && item.options.member === propName);
							if (bindings.length === 1) {
								minify(path.get('quasi'), this.opts.htmlMinifier, bindings[0].options);
							}
						} else {
							const objName = superClass.object.name;
							const binding = path.scope.getBinding(objName);
							const optionsFilter = opt => opt.member === propName && superClass.property.name === opt.name && opt.type === 'member';
							const bindings = this.bindings.filter(item => item.binding === binding && item.star === true && item.options.some(optionsFilter));
							if (bindings.length === 1) {
								minify(path.get('quasi'), this.opts.htmlMinifier, bindings[0].options.filter(optionsFilter));
							}
						}

						return;
					}

					const objName = tag.node.object.name;
					const binding = path.scope.getBinding(objName);
					const optionsFilter = opt => opt.name === propName && opt.type === 'basic';
					const bindings = this.bindings.filter(item => item.binding === binding && item.star === true && item.options.some(optionsFilter));
					if (bindings.length === 1) {
						minify(path.get('quasi'), this.opts.htmlMinifier, bindings[0].options.filter(optionsFilter));
					}

					return;
				}

				if (tag.isIdentifier()) {
					const binding = path.scope.getBinding(tag.node.name);
					const bindings = this.bindings.filter(item => item.binding === binding && item.star === false && item.options.type === 'basic');
					if (bindings.length === 1) {
						minify(path.get('quasi'), this.opts.htmlMinifier, bindings[0].options);
					}

					return;
				}

				/* istanbul ignore else */
				if (tag.isCallExpression()) {
					const binding = path.scope.getBinding(tag.node.callee.name);
					const bindings = this.bindings.filter(item => item.binding === binding && item.star === false && item.options.type === 'factory');
					if (bindings.length === 1) {
						minify(path.get('quasi'), this.opts.htmlMinifier, bindings[0].options);
					}
				}
			}
		}
	};
};

module.exports.majorDeleteError = majorDeleteError;
