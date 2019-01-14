const htmlMinifier = require('html-minifier');
const isBuiltinModule = require('is-builtin-module');

const moduleMains = {};

function ownerName(importSource) {
	const parts = importSource.split('/', importSource[0] === '@' ? 2 : 1);

	return parts.join('/');
}

function getPkgMain(importOwner) {
	if (moduleMains[importOwner]) {
		return moduleMains[importOwner];
	}

	const pkgInfo = require(importOwner + '/package.json');
	/* istanbul ignore next */
	moduleMains[importOwner] = pkgInfo.module || pkgInfo['jsnext:main'] || pkgInfo.main;

	return moduleMains[importOwner];
}

function bareName(importSource) {
	if (isBuiltinModule(importSource)) {
		/* Don't rule out possibility that a built-in module could provide an html tag
		 * but also avoid any additional processing of the module name. */
		return importSource;
	}

	const importOwner = ownerName(importSource);
	const pkgMain = getPkgMain(importOwner);

	if (pkgMain && importSource === [importOwner, pkgMain].join('/')) {
		return importOwner;
	}

	return importSource;
}

function normalizeExportConfig(settings) {
	if (settings === null || typeof settings === 'string') {
		return {type: 'basic', name: settings};
	}

	const ret = Object.assign({}, settings);

	if (!('type' in ret)) {
		if ('member' in ret) {
			ret.type = 'member';
		} else {
			ret.type = 'basic';
		}
	}

	return ret;
}

function normalizeModuleConfig(name, items) {
	const defaultExport = items.filter(item => item.name === null);
	const namedExports = items.filter(item => item.name !== null);
	const moduleConfig = {namedExports};

	const dupCheck = new Set();
	namedExports.forEach(item => {
		if (dupCheck.has(item.name)) {
			throw new Error(`Module ${name} lists export ${item.name} multiple times.`);
		}

		dupCheck.add(item.name);
	});

	moduleConfig.count = items.length;

	if (defaultExport.length > 1) {
		throw new TypeError(`Module ${name} has ${defaultExport.length} default exports`);
	}

	if (defaultExport.length === 1) {
		moduleConfig.defaultExport = defaultExport[0];
	}

	return moduleConfig;
}

function findModuleConfig(options, importSource) {
	if (!options.modules || importSource[0] === '.' || importSource[0] === '/') {
		return [];
	}

	if (options.modules[importSource]) {
		return options.modules[importSource];
	}

	try {
		return options.modules[bareName(importSource)] || [];
	} catch (error) {
		return [];
	}
}

function getModuleConfig(options, importSource) {
	const items = findModuleConfig(options, importSource).map(normalizeExportConfig);

	return normalizeModuleConfig(importSource, items);
}

function cookRawQuasi({transform}, raw) {
	// This nasty hack is needed until https://github.com/babel/babel/issues/9242 is resolved.
	const args = {raw};

	transform('cooked`' + args.raw + '`', {
		babelrc: false,
		configFile: false,
		plugins: [
			{
				visitor: {
					TaggedTemplateExpression(path) {
						args.cooked = path.get('quasi').node.quasis[0].value.cooked;
					}
				}
			}
		]
	});

	return args;
}

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
					if (this.opts.modules) {
						Object.keys(this.opts.modules).forEach(name => {
							const items = this.opts.modules[name];
							/* We're just checking for errors here. */
							normalizeModuleConfig(name, items.map(normalizeExportConfig));
						});
					}

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

					const moduleConfig = getModuleConfig(this.opts, moduleName.node.value);
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
				const moduleConfig = getModuleConfig(this.opts, path.node.source.value);
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
				} else if (tag.isIdentifier()) {
					const binding = path.scope.getBinding(tag.node.name);
					const bindings = this.bindings.filter(item => item.binding === binding && item.star === false && item.options.type === 'basic');
					if (bindings.length === 1) {
						minify(path.get('quasi'), this.opts.htmlMinifier, bindings[0].options);
					}
				}
			}
		}
	};
};

module.exports.majorDeleteError = majorDeleteError;
