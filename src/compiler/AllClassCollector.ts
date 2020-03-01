import { ClassDeclarationHelper } from './SourceFileHelper';
import { ClassDeclaration, SourceFile, SyntaxKind, TransformationContext } from 'typescript';
import { ImportsCollector } from './ImportsCollector';
import { ClassWithHeritage } from "./ClassWithHeritage";


export class AllClassCollector extends ClassDeclarationHelper {
  protected readonly _collectedClasses: ClassWithHeritage[] = [];
  protected readonly importsCollector: ImportsCollector;

  public constructor(sourceFile: SourceFile, context: TransformationContext) {
    super(sourceFile, context);
    this.importsCollector = new ImportsCollector(sourceFile, context);
  }

  get collectedClasses(): ClassWithHeritage[] {
    if (!this.hasProcessed) {
      const err = new Error('Can not retrieve interfaces; has not run yet.');
      this.logger.fatal(err);
      throw err;
    }

    return this._collectedClasses;
  }

  process(node: ClassDeclaration) {
    if (node.modifiers && node.modifiers.filter(e => e.kind === SyntaxKind.ExportKeyword).length > 0) {
      const { node: next, clauses } = this.extractHeritage(node);
      node = next;

      const classDeclaration: ClassWithHeritage = new ClassWithHeritage(this.qualifySymbol(node.name?.getText(node.getSourceFile()) ?? 'default'))

      if (clauses) {
        clauses.forEach(clause => {
          if (clause.isInterface) {
            classDeclaration.implementedInterfaces.push(clause.fullyQualifiedName);
          } else {
            classDeclaration.parentClass = clause.fullyQualifiedName;
          }
        });
      }

      this._collectedClasses.push(classDeclaration);
    }

    return node;
  }

  protected extractHeritage(node: ClassDeclaration) {
    const importsCollector = this.to(ImportsCollector);
    importsCollector.visit();

    const clauses =
      node.heritageClauses?.map(clause => {
        const name = clause.types[0].getText(this.sourceFile);
        const fullyQualifiedName = importsCollector.importedIdentifiers[name] ?? this.qualifySymbol(name);
        return {
          fullyQualifiedName,
          isInterface: clause.token === SyntaxKind.ImplementsKeyword,
        };
      }) ?? [];

    return {
      node,
      clauses,
    };
  }
}
