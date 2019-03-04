import Project, {
    CallExpression,
    ClassDeclaration,
    ExpressionWithTypeArguments,
    Identifier,
    InterfaceDeclaration,
    ts,
    TypeNode,
    VariableDeclaration
} from "ts-morph";
import commander from 'commander';
import * as npmPackage from '../package.json';
import path from 'path';
import { MalformedCodeError } from "Errors/MalformedCodeError";
import { baseLogger } from "utils/Log";
import { InjectableClassification, InterfaceDescriptor, NamedFileItem } from "Types";
import Table from 'cli-table';
import { isTypeReferenceNode } from "tsutils";
import { CodeWriter } from "CodeWriter/CodeWriter";

const log = {
    cli: baseLogger.extend('cli'),
    sfp: baseLogger.extend('cli').extend('source-file-parser'),
    relics: baseLogger.extend('cli').extend('lexical-analysis').extend('relic-walker'),
    auto: baseLogger.extend('cli').extend('lexical-analysis').extend('auto-constructor'),
};

log.cli('Starting reliquery CLI, parsing options');

commander
    .version(npmPackage.version)
    .option('-t, --tsconfig [tsconfig path]', 'path to tsconfig.json', './tsconfig.json')
    .option('-s, --skip [skip regex]', 'Regex for skipping files from inspection', '__tests__')
    .option('-x, --ext [extensions]', 'File extensions to parse', val => val.split(','), ['ts', 'tsx'])
    .parse(process.argv);

const tsConfigFilePath = path.resolve(process.cwd(), commander.tsconfig);
log.cli(`Starting Reliquery source file parse step for project at ${tsConfigFilePath}`);

const project = new Project({
    tsConfigFilePath,
    addFilesFromTsConfig: true,
});

const userRegex = new RegExp(commander.skip || '.');
const extensionRegex = new RegExp("((" + commander.ext.join(")|(") + "))$");
const shouldSkip = (filePath: string) => !!filePath.match(userRegex) || !filePath.match(extensionRegex);

const interfaces: { [name: string]: InterfaceDeclaration } = {};
const relics: { [name: string]: ClassDeclaration } = {};
const functionalRelics: { [name: string]: FunctionalRelic } = {};
const autoConstructions: { [name: string]: ClassDeclaration } = {};
const autoCurried: { [name: string]: FunctionalRelic } = {};

interface FunctionalRelic {
    name: string;
    filePath: string;
    returnType: NamedFileItem,
    parameters: {
        type: NamedFileItem,
        name: string
    }[],
    type?: TypeNode
}

// gather all the declarations we might care about
project.getSourceFiles().map(sourceFile => {
    if (shouldSkip && shouldSkip(sourceFile.getFilePath())) {
        log.sfp('Skipping source file', sourceFile.getFilePath());
        return;
    }

    log.sfp('Parsing source file %s', sourceFile.getFilePath());

    const symbol = sourceFile.getSymbol();

    if (!symbol) {
        log.sfp('No symbol (empty file?): %s', sourceFile.getFilePath());
        return;
    }

    const fileExports = symbol.getExports();

    if (!fileExports) {
        log.sfp('No exports: %s', sourceFile.getFilePath());
        return;
    }

    fileExports.forEach(exported => {
        const declaration = exported.getDeclarations()[0];

        if (declaration instanceof InterfaceDeclaration) {
            const name = (declaration.compilerNode as ts.InterfaceDeclaration).name.text;
            log.sfp('Detected interface declaration %s in file %s', name, sourceFile.getFilePath());
            interfaces[name] = declaration;
        }

        if (declaration instanceof ClassDeclaration) {
            const name = (declaration.compilerNode as ts.ClassDeclaration).name;

            if (!name) {
                throw new MalformedCodeError(`Unnamed exported class in file ${sourceFile.getFilePath()}`);
            }

            if (declaration.getDecorator("Relic")) {
                log.sfp('Detected Relic class %s in file %s', name.text, sourceFile.getFilePath());
                relics[name.text] = declaration;
                autoConstructions[name.text] = declaration;
            }

            if (declaration.getDecorator("AutoConstructed")) {
                log.sfp('Detected AutoConstruction %s in file %s', name.text, sourceFile.getFilePath());
                autoConstructions[name.text] = declaration;
            }
        }

        if (declaration instanceof VariableDeclaration) {
            const initializer = declaration.getInitializer();

            if (initializer instanceof CallExpression) {
                const first = initializer.getFirstChild();
                if (first && first instanceof Identifier) {
                    const id = first.getText();

                    if (id !== "Relic" && id !== "AutoCurried") {
                        return;
                    }

                    const name = declaration.getName();
                    const cache = id === "Relic" ? functionalRelics : autoCurried;

                    log.sfp("Found new %s function %s in file %s", id, name, sourceFile.getFilePath());

                    if (declaration.getType().getCallSignatures().length !== 1) {
                        throw new MalformedCodeError(`Only functions with one call signature ` +
                            `are supported, offending function: ${name}`)
                    }

                    const parameters = declaration.getType().getCallSignatures()[0].getParameters().map(param => {
                        const info = {
                            type: splitComplexImport(param.getDeclarations()[0].getType().getText()),
                            name: param.getName()
                        };

                        log.sfp("\tFound parameter: %o", info);

                        return info;
                    });

                    const returnType = splitComplexImport(declaration.getType().getCallSignatures()[0].getReturnType().getText());
                    log.sfp("\tFound return type: %o", returnType);

                    cache[name] = {
                        filePath: sourceFile.getFilePath(),
                        name,
                        returnType,
                        parameters,
                        type: declaration.getTypeNode()
                    };
                }

            }
        }
    })
});
log.cli(`Finished Reliquery source file parse step for project at ${tsConfigFilePath}`);
log.cli(`Starting Reliquery lexical analysis step for project at ${tsConfigFilePath}`);

function splitComplexImport(complex: string) {
    const regex = "^import\\((?:\"|')(.+)(?:\"|')\\)\\.(.+)$";
    const match = complex.match(regex);

    return {
        name: match ? match[2] : complex,
        filePath: match ? match[1] : ''
    };
}

function flattenInterfaceHierarchy(implementedInterfaceName: string, nodes: InterfaceDescriptor[] = []) {
    const implementedInterfaceDeclaration = interfaces[implementedInterfaceName];

    nodes.push({
        name: implementedInterfaceName,
        filePath: implementedInterfaceDeclaration.getSourceFile().getFilePath()
    });

    implementedInterfaceDeclaration.getHeritageClauses().forEach(clause => {
        clause.getTypeNodes().forEach(n => {
            nodes = nodes.concat(flattenInterfaceHierarchyFromImplements(n, nodes));
        });
    });

    return nodes;
}

function flattenInterfaceHierarchyFromImplements(node: ExpressionWithTypeArguments, nodes: InterfaceDescriptor[] = []) {
    const child = node.getFirstChild();
    if (!child) {
        throw new MalformedCodeError(`Malformed implements clause in ${node.getSourceFile().getFilePath()}`);
    }

    const symbol = child.getSymbol();
    if (!symbol) {
        throw new MalformedCodeError(`Malformed implements clause in ${node.getSourceFile().getFilePath()}`);
    }

    const implementedInterfaceName = symbol.getName();
    return nodes.concat(flattenInterfaceHierarchy(implementedInterfaceName));
}


// walk through the relics and make sure everything is injectable
const injectables: InjectableClassification[] = Object.keys(relics).map(name => {
    log.relics("Parsing relic %s", name);
    const _log = log.relics.extend(name);

    return {
        name,
        filePath: relics[name].getSourceFile().getFilePath(),
        interfaces: relics[name].getImplements().map(node => {
            const [implemented, ...parents] = flattenInterfaceHierarchyFromImplements(node);
            _log("Implemented `%s`", implemented.name);
            if (parents.length > 1) {
                _log("\tinterface `%s` has parents [`%s`], registering for parents as well.",
                    implemented.name, parents.map(e => e.name).join('`, `'));
            }
            return { implemented, parents };
        })
    };
});

const injectableFunctions = Object.keys(functionalRelics).map(name => {
    log.relics("Parsing relic %s", name);
    const _log = log.relics.extend(name);

    let interfaces: { implemented: InterfaceDescriptor, parents: InterfaceDescriptor[] }[] = [];

    const type = functionalRelics[name].type && functionalRelics[name].type!.compilerNode;
    if (type && isTypeReferenceNode(type)) {
        const [implemented, ...parents] = flattenInterfaceHierarchy(type.typeName.getText());

        _log("Implemented `%s`", implemented.name);
        if (parents.length > 1) {
            _log("\tinterface `%s` has parents [`%s`], registering for parents as well.",
                implemented.name, parents.map(e => e.name).join('`, `'));
        }
        interfaces = [{ implemented, parents }];
    }

    return {
        interfaces,
        name,
        filePath: functionalRelics[name].filePath,
        returnType: functionalRelics[name].returnType,
        parameters: functionalRelics[name].parameters,
    }
});


const factories: Factory[] = Object.keys(autoConstructions).map(auto => {
    log.auto("Parsing AutoConstruction `%s`", auto);
    const _log = log.auto.extend(auto);

    const classDeclaration = autoConstructions[auto];

    const constructors = classDeclaration.getConstructors();

    if (constructors.length > 1) {
        throw new MalformedCodeError(`AutoConstruction classes only support one constructor in class ${auto}`);
    }

    if (constructors.length === 0) {
        return {
            name: auto,
            filePath: classDeclaration.getSourceFile().getFilePath(),
            paramList: []
        }
    }

    _log("Found one constructor");

    const ctor = constructors[0];

    const { parameters } = ctor.getStructure();

    const getParamPath = (name: string) => {
        const interfaceMaybe = interfaces[name];
        if (interfaceMaybe) {
            return interfaceMaybe.getSourceFile().getFilePath();
        }

        const relicMaybe = relics[name];
        if (relicMaybe) {
            return relics[name].getSourceFile().getFilePath();
        }

        const fnMaybe = functionalRelics[name];
        if (fnMaybe) {
            return fnMaybe.filePath;
        }

        throw new MalformedCodeError(`Could not find type for ${name}`);
    };

    const paramList = !parameters ?
        [] :
        (parameters
            .filter(e => typeof e.type === "string") as { type: string, name: string }[])
            .map(param => ({
                name: param.type,
                varName: param.name,
                filePath: getParamPath(param.type)
            }));

    _log("Identified argument type list: %o", paramList);

    return {
        name: auto,
        filePath: classDeclaration.getSourceFile().getFilePath(),
        paramList
    }
});

log.cli(`Finished Reliquery lexical analysis step for project at ${tsConfigFilePath}`);
log.cli(`Starting reporting step for project at ${tsConfigFilePath}`);

const classTable = new Table({
    head: ['Injectable Class', 'Injectable Signatures', 'File location']
});

const functionTable = new Table({
    head: ['Injectable Function', 'Injectable Signatures', 'Argument List', 'Return type', 'File location']
});

const autoConstructionTable = new Table({
    head: ['AutoConstructed Class', 'Constructor Parameter List', 'File Location']
});

const autoCurriedTable = new Table({
    head: ['AutoCurried Function', 'Argument List', 'Return type', 'File location']
});

injectables.forEach(injectable => {
    const signatures: string[] = [];
    injectable.interfaces.forEach(injectable => {
        signatures.push(injectable.implemented.name);
        injectable.parents.forEach(parent => signatures.push(parent.name));
    });

    classTable.push([
        injectable.name,
        signatures.concat(injectable.name).join(", "),
        injectable.filePath
    ])
});

export interface InjectableFunction {
    interfaces: { implemented: InterfaceDescriptor, parents: InterfaceDescriptor[] }[],
    filePath: string,
    name: string,
    parameters: { type: NamedFileItem, name: string }[],
    returnType: NamedFileItem
}

injectableFunctions.forEach(injectable => {
    const signatures: string[] = [];
    injectable.interfaces.forEach(injectable => {
        signatures.push(injectable.implemented.name);
        injectable.parents.forEach(parent => signatures.push(parent.name));
    });

    functionTable.push([
        injectable.name,
        signatures.concat(`typeof ${injectable.name}`).join(", "),
        injectable.parameters.map(param => {
            return `${param.name}:${param.type.name}`
        }).join(", "),
        injectable.returnType.name,
        injectable.filePath
    ])
});

interface Factory {
    filePath: string,
    name: string,
    paramList?: (NamedFileItem & { varName: string })[]
}

factories.forEach(factory => {
    autoConstructionTable.push([
        factory.name,
        factory.paramList ? factory.paramList.map(l => `${l.varName}: ${l.name}`).join(", ") : '',
        factory.filePath
    ])
});

Object.keys(autoCurried).forEach(curried => {
    autoCurriedTable.push([
        curried,
        autoCurried[curried].parameters.map(param => {
            return `${param.name}:${param.type.name}`
        }).join(", "),
        autoCurried[curried].returnType.name,
        autoCurried[curried].filePath
    ])
});


console.log('===== Reliquery Injectable Relic Summary =====');
console.log(classTable.toString());
console.log(functionTable.toString());
console.log("\n");

console.log('===== Reliquery AutoConstructions Summary =====');
console.log(autoConstructionTable.toString());
console.log(autoCurriedTable.toString());
console.log("\n");

const codeWriter = new CodeWriter();

injectables.forEach(injectable => codeWriter.registerInjectableClassification(injectable));
injectableFunctions.forEach(fn => codeWriter.registerInjectableFunction(fn));
factories.forEach(factory => codeWriter.registerConcreteFactory(factory.name, factory,
    factory.paramList || []));
console.log(codeWriter.write(project, tsConfigFilePath));

