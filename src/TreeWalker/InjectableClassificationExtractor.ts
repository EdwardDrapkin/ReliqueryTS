import { ClassDeclaration, ExpressionWithTypeArguments, ts, VariableDeclaration } from "ts-morph";
import {
    ClassInjectableClassification,
    FunctionInjectableClassification,
    InterfaceDescriptor,
    NamedFileItem
} from "Types";
import { MalformedCodeError } from "Errors/MalformedCodeError";
import { baseLogger } from "utils/Log";
import { isTypeReferenceNode } from "tsutils";
import { ExportWalkResults } from "TreeWalker/SourceFileExportWalker";

const log = baseLogger.extend('injectable-classification-extractor');

export class InjectableClassificationExtractor {
    walkResults: ExportWalkResults;

    constructor(...walkResults: ExportWalkResults[]) {
        let prev = walkResults[0];
        let next = null;

        for (let i = 1; i < walkResults.length; i++) {
            next = walkResults[i];
            prev = InjectableClassificationExtractor.mergeResults(prev, next);
        }

        this.walkResults = prev;
    }

    private static mergeResults(a: ExportWalkResults, b: ExportWalkResults): ExportWalkResults {
        return {
            interfaceDeclarations: {
                ...a.interfaceDeclarations,
                ...b.interfaceDeclarations,
            },
            classRelicDeclarations: {
                ...a.classRelicDeclarations,
                ...b.classRelicDeclarations,
            },
            functionRelicDeclarations: {
                ...a.functionRelicDeclarations,
                ...b.functionRelicDeclarations,
            },
            autocurriedDeclarations: {
                ...a.autocurriedDeclarations,
                ...b.autocurriedDeclarations,
            },
            automaticConstructions: {
                ...a.automaticConstructions,
                ...b.automaticConstructions,
            },
        }
    }

    static splitComplexImport(complex: string) {
        const regex = "^import\\((?:\"|')(.+)(?:\"|')\\)\\.(.+)$";
        const match = complex.match(regex);

        return {
            name: match ? match[2] : complex,
            filePath: match ? match[1] : ''
        };
    }

    private flattenInterfaceHierarchy(implementedInterfaceName: string, nodes: InterfaceDescriptor[] = []) {
        const implementedInterfaceDeclaration = this.walkResults.interfaceDeclarations[implementedInterfaceName];

        nodes.push({
            name: implementedInterfaceName,
            filePath: implementedInterfaceDeclaration.getSourceFile().getFilePath()
        });

        implementedInterfaceDeclaration.getHeritageClauses().forEach(clause => {
            clause.getTypeNodes().forEach(n => {
                nodes = nodes.concat(this.flattenInterfaceHierarchyFromImplements(n));
            });
        });

        return nodes;
    };

    private flattenInterfaceHierarchyFromImplements(node: ExpressionWithTypeArguments) {
        const child = node.getFirstChild();
        if (!child) {
            throw new MalformedCodeError(`Malformed implements clause in ${node.getSourceFile().getFilePath()}`);
        }

        const symbol = child.getSymbol();
        if (!symbol) {
            throw new MalformedCodeError(`Malformed implements clause in ${node.getSourceFile().getFilePath()}`);
        }

        const implementedInterfaceName = symbol.getName();
        return this.flattenInterfaceHierarchy(implementedInterfaceName);
    }

    extract() {
        return {
            classDeclarations: Object
                .keys(this.walkResults.automaticConstructions)
                .map(key => ({
                    key,
                    decl: this.extractFromClassDeclaration(this.walkResults.automaticConstructions[key]),
                    injectable: false,
                }))
                .concat(Object
                    .keys(this.walkResults.classRelicDeclarations)
                    .map(key => ({
                        key,
                        decl: this.extractFromClassDeclaration(this.walkResults.classRelicDeclarations[key]),
                        injectable: true,
                    }))
                )
                .reduce((acc, curr) => {
                    acc[curr.key] = { decl: curr.decl, injectable: curr.injectable };
                    return acc;
                }, ({} as { [key: string]: { decl: ClassInjectableClassification, injectable: boolean } })),
            functionDeclarations: Object
                .keys(this.walkResults.functionRelicDeclarations)
                .map(key => ({
                    key,
                    decl: this.extractFromArrowFunctionDeclaration(this.walkResults.functionRelicDeclarations[key]),
                    curried: false,
                }))
                .concat(Object
                    .keys(this.walkResults.autocurriedDeclarations)
                    .map(key => ({
                        key,
                        decl: this.extractFromArrowFunctionDeclaration(this.walkResults.autocurriedDeclarations[key]),
                        curried: true,
                    }))
                )
                .reduce((acc, curr) => {
                    acc[curr.key] = { decl: curr.decl, curried: curr.curried };
                    return acc;
                }, ({} as { [key: string]: { decl: FunctionInjectableClassification, curried: boolean } })),
        };
    }

    extractFromClassDeclaration(declaration: ClassDeclaration): ClassInjectableClassification {
        const name = (declaration.compilerNode as ts.ClassDeclaration).name!.text;
        const constructors = declaration.getConstructors();
        let parameters: {
            type: NamedFileItem,
            name: string
        }[] = [];

        if (constructors.length > 1) {
            throw new MalformedCodeError(`Relic classes only support one constructor in class ${name}`);
        }

        if (constructors.length === 1) {
            const ctor = constructors[0];
            const { parameters: input } = ctor.getStructure();

            const getParamPath = (name: string) => {
                const interfaceMaybe = this.walkResults.interfaceDeclarations[name];
                if (interfaceMaybe) {
                    return interfaceMaybe.getSourceFile().getFilePath();
                }

                const relicMaybe = this.walkResults.classRelicDeclarations[name];
                if (relicMaybe) {
                    return this.walkResults.classRelicDeclarations[name].getSourceFile().getFilePath();
                }

                const fnMaybe = this.walkResults.functionRelicDeclarations[name];
                if (fnMaybe) {
                    return fnMaybe.getSourceFile().getFilePath();
                }

                throw new MalformedCodeError(`Could not find type for ${name}`);
            };

            parameters = !input ?
                [] :
                (input
                    .filter(e => typeof e.type === "string") as { type: string, name: string }[])
                    .map(param => ({
                        name: param.type,
                        type: {
                            name: param.type,
                            filePath: getParamPath(param.type)
                        }
                    }));
        }

        return {
            name,
            parameters,
            filePath: declaration.getSourceFile().getFilePath(),
            interfaces: declaration.getImplements().map(node => {
                const [implemented, ...parents] = this.flattenInterfaceHierarchyFromImplements(node);
                log("Implemented `%s`", implemented.name);
                if (parents.length > 1) {
                    log("\tinterface `%s` has parents [`%s`], registering for parents as well.",
                        implemented.name, parents.map(e => e.name).join('`, `'));
                }
                return { implemented, parents };
            })
        }
    }

    extractFromArrowFunctionDeclaration(declaration: VariableDeclaration): FunctionInjectableClassification {
        const name = declaration.getName();

        if (declaration.getType().getCallSignatures().length !== 1) {
            throw new MalformedCodeError(`Only functions with one call signature ` +
                `are supported, offending function: ${name}`)
        }

        const returnType = InjectableClassificationExtractor.splitComplexImport(
            declaration.getType().getCallSignatures()[0].getReturnType().getText()
        );

        const parameters = declaration.getType().getCallSignatures()[0].getParameters().map(param => {
            const info = {
                type: InjectableClassificationExtractor.splitComplexImport(param.getDeclarations()[0].getType().getText()),
                name: param.getName()
            };

            log("\tFound parameter: %o", info);

            return info;
        });

        let interfaces: { implemented: InterfaceDescriptor, parents: InterfaceDescriptor[] }[] = [];
        const type = declaration.getTypeNode();

        if (type) {
            const typeNode = type.compilerNode;
            if (isTypeReferenceNode(typeNode)) {
                const [implemented, ...parents] = this.flattenInterfaceHierarchy(typeNode.typeName.getText());
                log("Implemented `%s`", implemented.name);
                if (parents.length > 0) {
                    log("\tinterface `%s` has parents [`%s`], registering for parents as well.",
                        implemented.name, parents.map(e => e.name).join('`, `'));
                }

                interfaces = [{ implemented, parents }];
            }
        }

        return {
            name,
            interfaces,
            parameters,
            returnType,
            filePath: declaration.getSourceFile().getFilePath()
        }
    }
}
