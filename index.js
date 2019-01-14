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
	const nonDefaults = items.filter(item => item.name !== null);
	const moduleConfig = {
		basics: nonDefaults.filter(item => item.type === 'basic'),
		members: nonDefaults.filter(item => item.type === 'member')
	};

	const dupCheck = new Set();
	nonDefaults.forEach(item => {
		if (dupCheck.has(item.name)) {
			throw new Error(`Module ${name} lists export ${item.name} multiple times.`);
		}

		dupCheck.add(item.name);
	});

	moduleConfig.count = moduleConfig.basics.length + moduleConfig.members.length;

	if (defaultExport.length > 1) {
		throw new TypeError(`Module ${name} has ${defaultExport.length} default exports`);
	}

	if (defaultExport.length === 1) {
		moduleConfig.defaultExport = defaultExport[0];
		moduleConfig.count++;
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

function setupStarImport(binding, moduleConfig) {
	return {
		binding,
		properties: moduleConfig.basics.map(item => item.name),
		namedClasses: moduleConfig.members
	};
}

function setupDefaultExport(state, binding, moduleConfig) {
	if (!moduleConfig.defaultExport) {
		return false;
	}

	if (moduleConfig.defaultExport.type === 'basic') {
		state.bindings.add(binding);
	} else {
		state.classes.push({
			member: moduleConfig.defaultExport.member,
			binding
		});
	}

	return true;
}

function setupNamedExport(state, binding, moduleConfig, name) {
	if (moduleConfig.basics.some(item => item.name === name)) {
		state.bindings.add(binding);
		return;
	}

	const members = moduleConfig.members.filter(item => item.name === name);
	if (members.length === 1) {
		state.classes.push({
			member: members[0].member,
			binding
		});
	}
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

const majorDeleteError = 'html-minifier deleted something major, cannot proceed.';
module.exports = babel => {
	const t = babel.types;

	function minify(template, options) {
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
		const parts = htmlMinifier
			.minify(quasis.join(placeholder), options)
			.split(placeholder);
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

					this.bindings = new Set();
					this.classBindings = new Set();
					this.starImports = {};
					this.classes = [];
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

						if (!setupDefaultExport(this, binding, moduleConfig)) {
							this.starImports[idPath.node.name] = setupStarImport(binding, moduleConfig);
						}
					} else if (idPath.isObjectPattern()) {
						idPath.node.properties.forEach(prop => {
							setupNamedExport(this, path.scope.getBinding(prop.value.name), moduleConfig, prop.key.name);
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
						this.starImports[spec.node.local.name] = setupStarImport(binding, moduleConfig);
						return;
					}

					if (spec.isImportDefaultSpecifier()) {
						setupDefaultExport(this, binding, moduleConfig);
					} else {
						setupNamedExport(this, binding, moduleConfig, spec.node.imported.name);
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
							if (this.classes.some(item => item.binding === cls.scope.getBinding(superClass.name) && item.member === propName)) {
								minify(path.get('quasi'), this.opts.htmlMinifier);
							}
						} else {
							const objName = superClass.object.name;
							const starImport = this.starImports[objName];
							if (starImport && starImport.binding === path.scope.getBinding(objName) && starImport.namedClasses.some(item => item.member === propName && superClass.property.name === item.name)) {
								minify(path.get('quasi'), this.opts.htmlMinifier);
							}
						}

						return;
					}

					const objName = tag.node.object.name;
					const starImport = this.starImports[objName];
					if (starImport && starImport.binding === path.scope.getBinding(objName) && starImport.properties.includes(propName)) {
						minify(path.get('quasi'), this.opts.htmlMinifier);
					}

					return;
				}

				if (tag.isIdentifier() && this.bindings.has(path.scope.getBinding(tag.node.name))) {
					minify(path.get('quasi'), this.opts.htmlMinifier);
				}
			}
		}
	};
};

module.exports.majorDeleteError = majorDeleteError;
