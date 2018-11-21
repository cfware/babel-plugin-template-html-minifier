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

function getModuleConfig(options, importSource) {
	if (!options.modules || importSource[0] === '.' || importSource[0] === '/') {
		return null;
	}

	if (options.modules[importSource]) {
		return options.modules[importSource];
	}

	try {
		return options.modules[bareName(importSource)];
	} catch (error) {
		return null;
	}
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
		const quasis = node.quasis.map(quasi => quasi.value.cooked);

		const placeholder = uniqueId(quasis.join(''));
		const parts = htmlMinifier
			.minify(quasis.join(placeholder), options)
			.split(placeholder);
		if (parts.length !== quasis.length) {
			throw new Error(majorDeleteError);
		}
		parts.forEach((value, i) => {
			const args = {cooked: value, raw: value};
			template.get('quasis')[i].replaceWith(t.templateElement(args, i === parts.length - 1));
		});
	}

	return {
		visitor: {
			Program: {
				enter() {
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

					const importSource = moduleName.node.value;
					const moduleConfig = getModuleConfig(this.opts, importSource);
					if (!moduleConfig) {
						return;
					}

					const idPath = path.parentPath.get('id');
					const namedClasses = moduleConfig.filter(item => item !== null && typeof item === 'object' && typeof item.name === 'string');
					if (idPath.isIdentifier()) {
						const defaultClasses = moduleConfig.filter(item => item !== null && typeof item === 'object' && item.name === null);
						const binding = path.parentPath.scope.getBinding(idPath.node.name);
						if (moduleConfig.includes(null)) {
							this.bindings.add(binding);
						} else if (defaultClasses.length > 0) {
							this.classes.push({
								member: defaultClasses[0].member,
								binding
							});
						} else {
							this.starImports[idPath.node.name] = {
								binding,
								properties: moduleConfig.filter(item => typeof item === 'string'),
								namedClasses
							};
						}
					} else if (idPath.isObjectPattern()) {
						idPath.node.properties.forEach(prop => {
							const binding = path.scope.getBinding(prop.value.name);
							if (moduleConfig.includes(prop.key.name)) {
								this.bindings.add(binding);
							} else if (namedClasses.some(item => item.name === prop.key.name)) {
								this.classes.push({
									member: namedClasses[0].member,
									binding
								});
							}
						});
					}
				}
			},
			ImportDeclaration(path) {
				const importSource = path.node.source.value;
				const moduleConfig = getModuleConfig(this.opts, importSource);

				if (!moduleConfig) {
					return;
				}

				const namedClasses = moduleConfig.filter(item => item !== null && typeof item === 'object' && typeof item.name === 'string');
				path.get('specifiers').forEach(spec => {
					const binding = path.scope.getBinding(spec.node.local.name);
					if (spec.isImportNamespaceSpecifier()) {
						this.starImports[spec.node.local.name] = {
							binding,
							properties: moduleConfig.filter(item => typeof item === 'string'),
							namedClasses
						};
						return;
					}

					if (spec.isImportDefaultSpecifier()) {
						const defaultClasses = moduleConfig.filter(item => item !== null && typeof item === 'object' && item.name === null);
						if (moduleConfig.includes(null)) {
							this.bindings.add(binding);
						} else if (defaultClasses.length > 0) {
							this.classes.push({
								member: defaultClasses[0].member,
								binding
							});
						}
					} else if (moduleConfig.includes(spec.node.imported.name)) {
						this.bindings.add(binding);
					} else {
						const matchingNames = namedClasses.filter(item => item.name === spec.node.imported.name);
						if (matchingNames.length > 0) {
							this.classes.push({
								member: matchingNames[0].member,
								binding
							});
						}
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
