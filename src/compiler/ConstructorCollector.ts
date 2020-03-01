import { AllClassCollector } from './AllClassCollector';
import { ClassDeclaration } from 'typescript';
import { FullyQualifiedSymbol } from './SourceFileHelper';
import { createWrappedNode } from 'ts-morph';
import { ImportsCollector } from './ImportsCollector';
import { IncrementallyLoggable } from '../incremental/IncrementalLog';
import crypto from 'crypto';

export class ClassWithConstructor implements IncrementallyLoggable<ClassWithConstructor> {
  constructor(public fullyQualifiedName: FullyQualifiedSymbol, public constructorParams: FullyQualifiedSymbol[]) {}

  static deserialize(input: string) {
    const parsed = JSON.parse(input);
    return new ClassWithConstructor(parsed.fullyQualifiedName, parsed.constructorParams);
  }

  compareTo(other: ClassWithConstructor): number {
    return other.hash().localeCompare(this.hash());
  }

  hash() {
    const hash = crypto.createHash('sha1');
    hash.update(this.serialize());
    return hash.digest('hex');
  }

  serialize() {
    return JSON.stringify({
      fullyQualifiedName: this.fullyQualifiedName,
      constructorParams: this.constructorParams,
    });
  }
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

      this._collectedConstructors[fqn.encodedName] = new ClassWithConstructor(fqn, constructorParams ?? []);
    });

    return node;
  }
}
