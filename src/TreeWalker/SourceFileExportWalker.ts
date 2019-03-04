import {
    CallExpression,
    ClassDeclaration,
    Identifier,
    InterfaceDeclaration,
    SourceFile,
    ts,
    VariableDeclaration
} from "ts-morph";
import { baseLogger } from "utils/Log";
import { MalformedCodeError } from "Errors/MalformedCodeError";

const log = baseLogger.extend('sourcefile-export-walker');

export interface ExportWalkResults {
    interfaceDeclarations: {
        [interfaceName: string]: InterfaceDeclaration
    };
    classRelicDeclarations: {
        [relicName: string]: ClassDeclaration
    };
    functionRelicDeclarations: {
        [relicName: string]: VariableDeclaration
    };
    autocurriedDeclarations: {
        [relicName: string]: VariableDeclaration
    };
    automaticConstructions: {
        [relicName: string]: ClassDeclaration
    };
}

export class SourceFileExportWalker {
    private skipRegex: RegExp;
    private extensionRegex: RegExp;
    private path: string;

    private interfaceDeclarations: {
        [interfaceName: string]: InterfaceDeclaration
    } = {};

    private classRelicDeclarations: {
        [relicName: string]: ClassDeclaration
    } = {};

    private functionRelicDeclarations: {
        [relicName: string]: VariableDeclaration
    } = {};

    private autocurriedDeclarations: {
        [relicName: string]: VariableDeclaration
    } = {};

    private automaticConstructions: {
        [relicName: string]: ClassDeclaration
    } = {};


    constructor(private file: SourceFile, skip: string, matchExtensions: string[]) {
        this.skipRegex = new RegExp(skip);
        this.extensionRegex = new RegExp("((" + matchExtensions.join(")|(") + "))$");
        this.path = file.getFilePath();
    }

    emptyResults(): ExportWalkResults {
        return {
            interfaceDeclarations: {},
            classRelicDeclarations: {},
            autocurriedDeclarations: {},
            functionRelicDeclarations: {},
            automaticConstructions: {}
        }
    }

    shouldSkip(filePath: string) {
        const should = !!filePath.match(this.skipRegex) || !filePath.match(this.extensionRegex);
        if (should) {
            log('Skipping %s', filePath);
        }
        return should;
    }

    handleInterface(declaration: InterfaceDeclaration) {
        const name = (declaration.compilerNode as ts.InterfaceDeclaration).name.text;
        log('Detected interface declaration %s in file %s', name, this.path);
        this.interfaceDeclarations[name] = declaration;
    }

    handleClassDeclaration(declaration: ClassDeclaration) {
        const name = (declaration.compilerNode as ts.ClassDeclaration).name;
        if (!name) {
            throw new MalformedCodeError(`Unnamed exported class in file ${this.path}`);
        }

        if (declaration.getDecorator("Relic")) {
            log('Detected @Relic class %s in file %s', name.text, this.path);
            this.classRelicDeclarations[name.text] = declaration;
            this.automaticConstructions[name.text] = declaration;
        }

        if (declaration.getDecorator("AutoConstructed")) {
            log('Detected @AutoConstructed class %s in file %s', name.text, this.path);
            this.automaticConstructions[name.text] = declaration;
        }
    }

    handleVariableDeclaration(declaration: VariableDeclaration) {
        const initializer = declaration.getInitializer();
        if (initializer instanceof CallExpression) {
            const first = initializer.getFirstChild();
            if (first && first instanceof Identifier) {
                const id = first.getText();

                if (id !== "Relic" && id !== "AutoCurried") {
                    return;
                }

                if (id === "Relic") {
                    this.functionRelicDeclarations[declaration.getName()] = declaration;
                } else {
                    this.autocurriedDeclarations[declaration.getName()] = declaration;
                }
            }
        }
    }

    walk(): ExportWalkResults {
        const path = this.file.getFilePath();
        if (this.shouldSkip(path)) {
            return this.emptyResults();
        }

        log('Parsing file %s', this.path);

        const symbol = this.file.getSymbol();
        if (!symbol) {
            log('No symbol found for file %s, likely empty file', this.path);
            return this.emptyResults();
        }

        const fileExports = symbol.getExports();
        if (!fileExports) {
            log('Skipping file %s as it has no exports', this.path);
            return this.emptyResults();
        }

        fileExports.forEach(fileExport => {
            fileExport.getDeclarations().forEach(declaration => {
                if (declaration instanceof InterfaceDeclaration) {
                    this.handleInterface(declaration);
                }

                if (declaration instanceof ClassDeclaration) {
                    this.handleClassDeclaration(declaration);
                }

                if (declaration instanceof VariableDeclaration) {
                    this.handleVariableDeclaration(declaration);
                }
            })
        });

        return {
            interfaceDeclarations: this.interfaceDeclarations,
            classRelicDeclarations: this.classRelicDeclarations,
            autocurriedDeclarations: this.autocurriedDeclarations,
            functionRelicDeclarations: this.functionRelicDeclarations,
            automaticConstructions: this.automaticConstructions,
        }
    }
}
