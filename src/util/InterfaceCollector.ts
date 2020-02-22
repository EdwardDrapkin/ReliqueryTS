import { FullyQualifiedSymbol, InterfaceDeclarationHelper } from './SourceFileHelper';
import { InterfaceDeclaration, SyntaxKind } from 'typescript';
import { ImportsCollector } from './ImportsCollector';

export interface InterfaceWithHeritage {
  fullyQualifiedName: FullyQualifiedSymbol;
  parents: FullyQualifiedSymbol[];
}

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
      const interfaceWithHeritage: InterfaceWithHeritage = {
        fullyQualifiedName: this.qualifySymbol(node.name.getText(node.getSourceFile())),
        parents: [],
      };

      const { clauses } = this.extractHeritage(node);

      clauses.forEach(clause => {
        clause.forEach(fullyQualifiedSymbol => {
          interfaceWithHeritage.parents.push(fullyQualifiedSymbol);
        });
      });

      this._exportedInterfaces.push(interfaceWithHeritage);
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
