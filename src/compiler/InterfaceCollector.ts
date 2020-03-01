import { FullyQualifiedSymbol, InterfaceDeclarationHelper } from './SourceFileHelper';
import { InterfaceDeclaration, SyntaxKind } from 'typescript';
import { ImportsCollector } from './ImportsCollector';
import { InterfaceWithHeritage } from "./InterfaceWithHeritage";

export class InterfaceCollector extends InterfaceDeclarationHelper {
  private readonly _exportedInterfaces: InterfaceWithHeritage[] = [];

  get exportedInterfaces(): InterfaceWithHeritage[] {
    if (!this.hasProcessed) {
      throw new Error('Can not retrieve interfaces; has not run yet.');
    }

    return this._exportedInterfaces;
  }

  process(node: InterfaceDeclaration) {
    if (node.modifiers && node.modifiers.filter(e => e.kind === SyntaxKind.ExportKeyword).length > 0) {
      const { clauses } = this.extractHeritage(node);
      const parents: FullyQualifiedSymbol[] = [];
      const fullyQualifiedName: FullyQualifiedSymbol = this.qualifySymbol(node.name.getText(node.getSourceFile()));

      clauses.forEach(clause => {
        clause.forEach(fullyQualifiedSymbol => {
          parents.push(fullyQualifiedSymbol);
        });
      });

      this._exportedInterfaces.push(new InterfaceWithHeritage(fullyQualifiedName, parents));
    }

    return node;
  }

  protected extractHeritage(node: InterfaceDeclaration) {
    const importsCollector = this.to(ImportsCollector);
    importsCollector.visit();

    const clauses =
      node.heritageClauses?.map(clause => {
        return clause.types.map(type => {
          const name = type.getText(this.sourceFile);
          return importsCollector.importedIdentifiers[name] ?? this.qualifySymbol(name);
        });
      }) ?? [];

    return {
      node,
      clauses,
    };
  }
}
