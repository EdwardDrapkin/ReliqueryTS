import Project, {
    ExpressionWithTypeArguments,
    ImportSpecifier,
    InterfaceDeclaration,
    Node,
    SourceFile,
    ts
} from "ts-morph";
import { isImportDeclaration, isInterfaceDeclaration, isNamedImports } from "tsutils";
import { InjectableClassification, InterfaceDescriptor } from "Types";
import { AutoConstructed } from "Annotations";
import { RelicResolver } from "RelicResolver/RelicResolver";

const project = new Project({ tsConfigFilePath: 'tsconfig.json' });

const file: SourceFile = project.getSourceFileOrThrow("Basic.ts")

const locations: { [k: string]: any } = {};

file.compilerNode.statements.forEach(statement => {
    if (isImportDeclaration(statement)) {
        const location = statement.moduleSpecifier.getText();
        const clause = statement.importClause;
        if (!clause) {
            throw new Error('Import clauses are required in import declarations.')
        }

        const bindings = clause.namedBindings;

        if (!bindings || !isNamedImports(bindings)) {
            throw new Error("Only named imports are supported");
        }

        locations[location.substr(1, location.length - 2)] = bindings.elements.map(binding => binding.name.text);
    }
})


Object.keys(locations).forEach(key => {
    console.log(key);
    console.log(project.getSourceFile(key + ".ts"));
});

const relics: InjectableClassification[] = [];

file.getClasses().forEach(clazz => {
    const decorator = clazz.getDecorator("Relic");
    if (!decorator) return;

    relics.push({
        name: clazz.getNameOrThrow(),
        filePath: file.getFilePath(),
        interfaces: clazz.getImplements().map(e => {
            const [implemented, ...parents] = flattenInterfaceHierarchy(e);
            return { implemented, parents };
        })
    });

});

const ctorDescriptors: { [clazz: string]: { name: string, paramList: string[] } } = {};

file.getClasses().forEach(clazz => {
    const decorator = clazz.getDecorator("AutoConstructed");
    if (!decorator) return;

    const ctors = clazz.getConstructors();
    if (ctors.length !== 1) {
        throw new Error("AutoConstructed classes must have exactly 1 constructor");
    }

    const paramList: string[] = [];

    ctors.forEach(ctor => {
        const { parameters } = ctor.getStructure();

        if (parameters) {
            parameters.forEach(param => {
                if (typeof param.type === "string") {
                    paramList.push(param.type);

                }
            })
        }
    })

    ctorDescriptors[clazz.getNameOrThrow()] = {
        name: clazz.getNameOrThrow(),
        paramList
    }
});

const resolver = new RelicResolver();

relics.forEach(relic => resolver.register(relic));

console.log(JSON.stringify(ctorDescriptors));

//console.log(resolver.serialize());

function isMorphInterface(node: Node<ts.Node>): node is InterfaceDeclaration {
    return isInterfaceDeclaration(node.compilerNode);
}

function isImportSpec(node: Node<ts.Node>): node is ImportSpecifier {
    return node instanceof ImportSpecifier;
}

function flattenInterfaceHierarchy(node: ExpressionWithTypeArguments, nodes: InterfaceDescriptor[] = []) {
    // there should always be one child with one declaration because this only handles "implements" members
    const interf = node.getFirstChild()!.getSymbol()!.getDeclarations()[0];
    if (!isMorphInterface(interf)) {
        if (isImportSpec(interf)) {
            throw new Error('pfft')
        } else {
            throw new Error('Somehow a non-interface object is being flattened as part of interface hierarchy scanning.')
        }
    }

    interf.getHeritageClauses().forEach((clause) => {
        clause.getTypeNodes().forEach(n => {
            nodes = flattenInterfaceHierarchy(n, nodes);
        })
    });

    nodes.push({
        name: interf.getName(),
        filePath: interf.getSourceFile().compilerNode.fileName,
    });

    return nodes;
}

