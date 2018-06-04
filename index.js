const htmlMinifier = require('html-minifier');

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

	return options.modules[bareName(importSource)];
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
			return '${' + id + ' }';
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
					this.starImports = {};
					this.bindings = new Set();
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
					if (idPath.isIdentifier()) {
						if (moduleConfig.includes(null)) {
							this.bindings.add(path.parentPath.scope.getBinding(idPath.node.name));
						} else {
							this.starImports[idPath.node.name] = {
								binding: path.parentPath.scope.getBinding(idPath.node.name),
								properties: moduleConfig.filter(name => typeof name === 'string')
							};
						}
					} else if (idPath.isObjectPattern()) {
						idPath.node.properties.forEach(prop => {
							if (moduleConfig.includes(prop.key.name)) {
								this.bindings.add(path.scope.getBinding(prop.value.name));
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

				path.get('specifiers').forEach(spec => {
					if (spec.isImportNamespaceSpecifier()) {
						this.starImports[spec.node.local.name] = {
							binding: path.scope.getBinding(spec.node.local.name),
							properties: moduleConfig.filter(name => typeof name === 'string')
						};
						return;
					}

					const importedName = spec.isImportDefaultSpecifier() ? null : spec.node.imported.name;

					if (moduleConfig.includes(importedName)) {
						this.bindings.add(path.scope.getBinding(spec.node.local.name));
					}
				});
			},
			TaggedTemplateExpression(path) {
				const tag = path.get('tag');

				if (tag.isMemberExpression()) {
					const objName = tag.node.object.name;
					const propName = tag.node.property.name;
					const starImport = this.starImports[objName];
					if (starImport && starImport.binding === path.scope.getBinding(objName) && starImport.properties.includes(propName)) {
						minify(path.get('quasi'), this.opts.htmlMinifier);
					}
				}
				if (tag.isIdentifier() && this.bindings.has(path.scope.getBinding(tag.node.name))) {
					minify(path.get('quasi'), this.opts.htmlMinifier);
				}
			}
		}
	};
};
module.exports.majorDeleteError = majorDeleteError;
