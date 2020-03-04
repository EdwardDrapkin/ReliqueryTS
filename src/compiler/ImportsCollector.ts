import { FullyQualifiedSymbol, ImportDeclarationHelper } from './SourceFileHelper';
import { ImportClause, ImportDeclaration, isNamedImports, isNamespaceImport, isStringLiteral } from 'typescript';
import path from 'path';

export class ImportsCollector extends ImportDeclarationHelper {
  public hasHydrateAs: false | string = false;
  private readonly _importedIdentifiers: Record<string, FullyQualifiedSymbol> = {};

  get importedIdentifiers(): Record<string, FullyQualifiedSymbol> {
    if (!this.hasProcessed) {
      throw new Error('Can not retrieve identifiers; has not run yet.');
    }

    return this._importedIdentifiers;
  }

  extractIdentifiersFromImportClause(clause: ImportClause): (string[] | string)[] {
    const bindings = clause.namedBindings;

    if (!bindings) {
      return [];
    }

    if (isNamespaceImport(bindings)) {
      return [bindings.name.getText(this.sourceFile)];
    } else if (isNamedImports(bindings)) {
      return bindings.elements.map(element =>
        element.propertyName
          ? [element.propertyName.getText(this.sourceFile), element.name.getText(this.sourceFile)]
          : element.name.getText(this.sourceFile)
      );
    }

    return [];
  }

  process(node: ImportDeclaration) {
    const { moduleSpecifier, importClause } = node;

    if (!importClause || !moduleSpecifier) {
      return node;
    }

    if (!isStringLiteral(moduleSpecifier)) {
      throw new Error('Can only handle literal imports right now');
    }

    const importedFrom = moduleSpecifier.text;

    if (!importedFrom.trim()) {
      return node;
    }

    const relativeFilePath =
      importedFrom.charAt(0) === '.'
        ? this.resolveRelativeImport(importedFrom)
        : this.resolveAbsoluteImport(importedFrom);

    if (!relativeFilePath.endsWith('.ts') && !relativeFilePath.endsWith('.tsx') && importedFrom !== 'reliquery') {
      return node;
    }

    const identifiers = this.extractIdentifiersFromImportClause(importClause);

    identifiers.forEach(identifier => {
      if(importedFrom === 'reliquery') {
        if (Array.isArray(identifier)) {
          this.hasHydrateAs = identifier[1];
        } else {
          this.hasHydrateAs = identifier;
        }
      } else if (Array.isArray(identifier)) {
        this._importedIdentifiers[identifier[1]] = this.qualifySymbol(
          identifier[0],
          path.resolve(this.context.getCompilerOptions().baseUrl || process.cwd(), relativeFilePath)
        );
      } else {
        this._importedIdentifiers[identifier] = this.qualifySymbol(
          identifier,
          path.resolve(this.context.getCompilerOptions().baseUrl || process.cwd(), relativeFilePath)
        );
      }
    });

    return super.process(node);
  }
}
