import { AllClassCollector } from './AllClassCollector';
import { ClassDeclaration, isIntersectionTypeNode, isUnionTypeNode } from 'typescript';
import { FullyQualifiedSymbol } from './SourceFileHelper';
import { createWrappedNode } from 'ts-morph';
import { ImportsCollector } from './ImportsCollector';
import { IncrementallyLoggable } from '../incremental/IncrementalLog';
import crypto from 'crypto';

export interface UnionOf {
  type: 'union';
  symbols: FullyQualifiedSymbol[];
}

export interface IntersectionOf {
  type: 'intersection';
  symbols: FullyQualifiedSymbol[];
}

export interface SingleType {
  type: 'single';
  symbol: FullyQualifiedSymbol;
}

export type PotentialType = SingleType | UnionOf | IntersectionOf;

export class ClassWithConstructor implements IncrementallyLoggable<ClassWithConstructor> {
  constructor(
    public fullyQualifiedName: FullyQualifiedSymbol,
    public constructorParams: PotentialType[]
  ) {}

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
      const constructorParams: PotentialType[] = params.map(param => {
        const { type } = param.compilerNode;

        if (!type) {
          throw new Error(`Untyped ctor param: ${param.getName()}`);
        }

        if (isUnionTypeNode(type) || isIntersectionTypeNode(type)) {
          return {
            type: isUnionTypeNode(type) ? 'union' : 'intersection',
            symbols: type.types.map(subType => {
              const typeName = subType.getText(this.sourceFile);
              return importsCollector.importedIdentifiers[typeName] ?? this.qualifySymbol(typeName);
            }),
          };
        }

        const typeName = type.getText(this.sourceFile);
        return {
          symbol: importsCollector.importedIdentifiers[typeName] ?? this.qualifySymbol(typeName),
          type: 'single',
        };
      });

      const fqn = this.qualifySymbol(node.name?.getText(node.getSourceFile()) ?? 'default');

      this._collectedConstructors[fqn.encodedName] = new ClassWithConstructor(fqn, constructorParams ?? []);
    });

    return node;
  }
}
