import Project, { ExpressionWithTypeArguments, InterfaceDeclaration, Node, SourceFile, ts } from "ts-morph";
import { isInterfaceDeclaration } from "tsutils";
import { InjectableClassification, InterfaceDescriptor } from "Types";

const project = new Project();

project.addExistingSourceFile("test/fixtures/Basic.ts");

const file: SourceFile = project.getSourceFileOrThrow("Basic.ts")

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

function isMorphInterface(node: Node<ts.Node>): node is InterfaceDeclaration {
    return isInterfaceDeclaration(node.compilerNode);
}

function flattenInterfaceHierarchy(node: ExpressionWithTypeArguments, nodes: InterfaceDescriptor[] = []) {
    // there should always be one child with one declaration because this only handles "implements" members
    const interf = node.getFirstChild()!.getSymbol()!.getDeclarations()[0];
    if (!isMorphInterface(interf)) {
        throw new Error('Somehow a non-interface object is being flattened as part of interface hierarchy scanning.')
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

