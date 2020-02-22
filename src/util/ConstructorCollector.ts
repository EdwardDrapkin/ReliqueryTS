import { AllClassCollector } from './AllClassCollector';
import { ClassDeclaration } from 'typescript';
import { FullyQualifiedSymbol } from './SourceFileHelper';
import { createWrappedNode } from 'ts-morph';
import { ImportsCollector } from './ImportsCollector';

export interface ClassWithConstructor {
  fullyQualifiedName: FullyQualifiedSymbol;
  constructorParams: FullyQualifiedSymbol[];
}

export class ConstructorCollector extends AllClassCollector {
  private readonly _collectedConstructors: { [encodedName: string]: ClassWithConstructor } = {};

  get collectedConstructors() {
    return this._collectedConstructors;
  }

  process(node: ClassDeclaration) {
    node = super.process(node);

    const importsCollector = this.to(ImportsCollector);
    importsCollector.visit(this.sourceFile);

    const ctors = createWrappedNode(node).getConstructors();

    if (ctors.length > 1) {
      throw new Error('Injected classes cannot have multiple constructors');
    }

    ctors.forEach(ctor => {
      const params = ctor.getParameters();
      const constructorParams = params.map(param => {
        const typeName = param.compilerNode.type?.getText(this.sourceFile) ?? null;

        if (typeName === null) {
          throw new Error(`Untyped ctor param: ${param.getName()}`);
        }

        let importedFrom = importsCollector.importedIdentifiers[typeName];

        if (!importedFrom) {
          importedFrom = this.qualifySymbol(typeName);
        }

        return importedFrom;
      });

      const fqn = this.qualifySymbol(node.name?.getText(node.getSourceFile()) ?? 'default');

      this._collectedConstructors[fqn.encodedName] = {
        fullyQualifiedName: fqn,
        constructorParams: constructorParams ?? [],
      };
    });

    return node;
  }
}
