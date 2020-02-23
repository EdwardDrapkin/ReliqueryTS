import {
  isClassDeclaration,
  isConstructorDeclaration,
  isDecorator,
  isImportDeclaration,
  isImportSpecifier,
  isInterfaceDeclaration,
  isSourceFile,
  Node,
  NodeArray,
  SourceFile,
  TransformationContext,
  visitEachChild,
  VisitResult,
} from 'typescript';
import path from 'path';
import { ImportPathsResolver } from '@zerollup/ts-helpers';
import { Signale } from 'signale';
import { subLogger } from '../logger';

export interface FullyQualifiedSymbol {
  relativeFilePath: string;
  name: string;
  encodedName: string;
}

export function encodeName(path: string, name: string) {
  // we need to specially encode dir separators otherwise this happens:
  // test/foo.ts::Foo => test_foo_ts_Foo
  // test-foo.ts::Foo => test_foo_ts_Foo
  return `${path}_${name}`
    .replace(/\//g, '_dd_')
    .replace(/\W/g, '_');
}
export class SourceFileHelper<T extends Node> {
  public hasProcessed: boolean = false;
  protected readonly logger: Signale = subLogger(this.constructor.name);

  public constructor(public sourceFile: SourceFile, public context: TransformationContext) {}

  public static cloneNodeArray<N extends Node>(old: NodeArray<N>, newNodes: N[]): NodeArray<N> {
    Object.keys(old)
      .filter(key => isNaN(parseInt(key)) && !(parseInt(key) > -1 && `${parseInt(key)}` == key))
      .forEach(key => {
        // @ts-ignore
        newNodes[key] = old[key];
      });

    return (newNodes as unknown) as NodeArray<N>;
  }

  public static from(other: SourceFileHelper<any>) {
    return new this(other.sourceFile, other.context);
  }

  public to<U>(Other: { new (sourceFile: SourceFile, context: TransformationContext): U }): U {
    return new Other(this.sourceFile, this.context);
  }

  public qualifySymbol(
    nameStringRepresentation: string,
    file: SourceFile | string = this.sourceFile
  ): FullyQualifiedSymbol {
    let fileName = typeof file === 'string' ? file : file.fileName;

    const suggestions = new ImportPathsResolver(this.context.getCompilerOptions()).getImportSuggestions(
      nameStringRepresentation,
      path.dirname(fileName)
    );

    if (suggestions === undefined) {
      throw new Error(`Could not resolve (and qualify): ${nameStringRepresentation} from ${fileName}`);
    }

    const relativeFilePath = path.relative(this.context.getCompilerOptions().baseUrl || process.cwd(), fileName);

    return {
      relativeFilePath,
      name: nameStringRepresentation,
      encodedName: encodeName(relativeFilePath, nameStringRepresentation)
    };
  }

  public filterNode(node: Node): node is T {
    return false;
  }

  public process(node: T): T {
    return node;
  }

  public visit(node: SourceFile = this.sourceFile) {
    // this.logger.time('Processing source');
    this.hasProcessed = true;

    const visitor = (node: Node): VisitResult<Node> => {
      if (this.filterNode(node)) {
        return this.process(node);
      }
      return visitEachChild(node, visitor, this.context);
    };

    const result = visitEachChild(node, visitor, this.context);
    // this.logger.timeEnd();
    return result;
  }
}

export function helperClassFactory<T extends Node>(
  filter: (node: Node) => node is T
): { new (sourceFile: SourceFile, context: TransformationContext): SourceFileHelper<T> } {
  return class extends SourceFileHelper<T> {
    public static from(other: SourceFileHelper<any>) {
      return new this(other.sourceFile, other.context);
    }

    public filterNode(node: Node): node is T {
      return filter(node);
    }
  };
}

export const SourceFileNodeHelper = helperClassFactory(isSourceFile);
export const ImportDeclarationHelper = helperClassFactory(isImportDeclaration);
export const ImportSpecifierHelper = helperClassFactory(isImportSpecifier);
export const ConstructorDeclarationHelper = helperClassFactory(isConstructorDeclaration);
export const ClassDeclarationHelper = helperClassFactory(isClassDeclaration);
export const DecoratorHelper = helperClassFactory(isDecorator);
export const InterfaceDeclarationHelper = helperClassFactory(isInterfaceDeclaration);
