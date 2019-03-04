import { ClassInjectableClassification, FunctionInjectableClassification, NamedFileItem } from "Types";
import Project from "ts-morph";
import path from "path";

export class CodeWriter {
    concreteFactories: {
        [name: string]: {
            item: NamedFileItem,
            paramList: NamedFileItem[]
        }
    } = {};

    functionFactories: {
        [name: string]: {
            item: NamedFileItem
        }
    } = {};

    curriedFunctions: {
        [name: string]: {
            item: NamedFileItem,
            paramList: NamedFileItem[]
        }
    } = {};

    resolutions: {
        [name: string]: {
            item: NamedFileItem,
            factory: string,
        }
    } = {};


    registerFunctionFactory(name: string, item: NamedFileItem) {
        this.functionFactories[name] = { item };
    }

    registerConcreteFactory(name: string, item: NamedFileItem, paramList: NamedFileItem[] = []) {
        this.concreteFactories[name] = { item, paramList }
    }

    registerResolution(name: string, item: NamedFileItem, factory: string = item.name) {
        this.resolutions[name] = { item, factory };
    }

    registerCurriedFunction(name: string, item: NamedFileItem, paramList: NamedFileItem[]) {
        this.curriedFunctions[name] = { item, paramList }
    }

    registerFunctionInjectableClassification(fn: FunctionInjectableClassification, curried: boolean) {
        this.registerFunctionFactory(fn.name, fn);
        this.registerResolution(`typeof ${fn.name}`, fn, fn.name);
        if (fn.interfaces) {
            fn.interfaces.forEach(iface => {
                this.registerResolution(iface.implemented.name, iface.implemented, fn.name);
                iface.parents.forEach(parent => {
                    this.registerResolution(parent.name, parent, fn.name);
                })
            })
        }

        if (curried) {
            this.registerCurriedFunction(fn.name, fn, fn.parameters.map(p => p.type))
        }
    }

    registerClassInjectableClassification(fn: ClassInjectableClassification, injectable: boolean) {
        this.registerConcreteFactory(fn.name, fn, fn.parameters.map(p => p.type))

        if (injectable) {
            if (fn.interfaces) {
                fn.interfaces.forEach(iface => {
                    this.registerResolution(iface.implemented.name, iface.implemented, fn.name);
                    iface.parents.forEach(parent => {
                        this.registerResolution(parent.name, parent, fn.name);
                    })
                })
            }

            this.registerResolution(fn.name, fn, fn.name);
        }
    }

    reapCurries() {
        const curries: { [fn: string]: string } = {};
        Object.keys(this.curriedFunctions).forEach(key => {
            const fn = this.curriedFunctions[key];
            curries[key] = `() => ${key}(` +
                fn.paramList.map(param => {
                    return `Container.resolutions["${param.name}"]()`
                }).join(', ') +
                ')'
        })

        return curries;
    }

    reapImports() {
        const imports: { [file: string]: { [imported: string]: true } } = {};

        const reap = (item: NamedFileItem) => {
            if (!imports[item.filePath]) {
                imports[item.filePath] = {}
            }

            imports[item.filePath][item.name] = true;
        };

        Object.keys(this.curriedFunctions).forEach(key => reap(this.curriedFunctions[key].item));
        Object.keys(this.concreteFactories).forEach(key => reap(this.concreteFactories[key].item));
        Object.keys(this.functionFactories).forEach(key => reap(this.functionFactories[key].item));
        Object.keys(this.resolutions).forEach(key => reap(this.resolutions[key].item));

        return imports;
    }

    reapFactories() {
        const factories: { [name: string]: string } = {};

        Object.keys(this.functionFactories).forEach(factory => {
            factories[factory] = `(): typeof ${factory} => ${factory}`;
        });

        Object.keys(this.concreteFactories).forEach(name => {
            const factory = this.concreteFactories[name];
            factories[name] = `(): ${name} => new ${name}(` +
                factory.paramList.map(param => {
                    return `Container.resolutions["${param.name}"]()`
                }).join(', ') +
                ')'
        });

        return factories;
    }

    reapResolutions() {
        const resolutions: { [name: string]: string } = {};
        Object.keys(this.resolutions).forEach(name => {
            const resolution = this.resolutions[name];
            resolutions[name] = resolution.factory;
        });

        return resolutions;
    }

    static makeGetterReady(str: string) {
        return str.replace('typeof ', '').replace(/\s*./, e => e.toUpperCase());
    }

    static normalizeFilePath(filePath: string, baseUrl: string) {
        return filePath.replace(`${baseUrl}/`, '').replace(/\.tsx?$/, '');
    }

    write(project: Project, tsConfigFilePath: string) {
        const writer = project.createWriter();
        const imports = this.reapImports();
        const factories = this.reapFactories();
        const curries = this.reapCurries();
        const resolutions = this.reapResolutions();

        const baseUrl = path.resolve(JSON.parse(project.getFileSystem().readFileSync(tsConfigFilePath)).compilerOptions.baseUrl)
            || path.resolve(tsConfigFilePath, "..");

        Object.keys(imports).forEach(fileName => {
            writer.write("import { ");
            writer.write(Object.keys(imports[fileName]).join(", "));
            writer.write(` } from '${CodeWriter.normalizeFilePath(fileName, baseUrl)}';`);
            writer.newLine();
        });

        writer.newLine();

        writer.write('export class Container').block(() => {
            writer.write('static readonly factories = {').indentBlock(() => {
                Object.keys(factories).map(name => {
                    writer.write(`"${name}": ${factories[name]},`)
                    writer.newLine();
                });
            });
            writer.write('};');
            writer.newLine();

            writer.write('static readonly curried = {').indentBlock(() => {
                Object.keys(curries).map(name => {
                    writer.write(`"${name}": ${curries[name]},`)
                    writer.newLine();
                });
            });
            writer.write('};');
            writer.newLine();

            writer.write('static readonly resolutions = {').indentBlock(() => {
                Object.keys(resolutions).map(name => {
                    const resolution = resolutions[name];
                    writer.write(`"${name}": (): ${name} => Container.factories["${resolution}"](),`);
                    writer.newLine();
                });
            });
            writer.write('};');
            writer.newLine();

            Object.keys(resolutions).map(name => {
                writer.write(`static get${CodeWriter.makeGetterReady(name)}(): ${name}`).block(() => {
                    writer.write(`return Container.resolutions["${name}"]();`);
                });
                writer.newLine();
            });

            Object.keys(curries).map(name => {
                writer.write(`static getCurried${CodeWriter.makeGetterReady(name)}(): ReturnType<typeof ${name}>`).block(() => {
                    writer.write(`return Container.curried["${name}"]();`);
                });
                writer.newLine();
            });
        });

        writer.newLine();

        return writer.toString();
    }
}
