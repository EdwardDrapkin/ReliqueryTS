import { FullyQualifiedSymbol, ImportDeclarationHelper } from './SourceFileHelper';
import { ImportClause, ImportDeclaration, isNamedImports, isNamespaceImport, isStringLiteral } from 'typescript';
import { ImportPathsResolver } from '@zerollup/ts-helpers';
import path from 'path';
import fs from 'fs';

export class ImportsCollector extends ImportDeclarationHelper {
  private readonly _importedIdentifiers: Record<string, FullyQualifiedSymbol> = {};

  get importedIdentifiers(): Record<string, FullyQualifiedSymbol> {
    if (!this.hasProcessed) {
      throw new Error('Can not retrieve identifiers; has not run yet.');
    }

    return this._importedIdentifiers;
  }

  resolveAbsoluteImport(importedFrom: string) {
    const fileWithoutExt = path.resolve(path.dirname(this.sourceFile.fileName), importedFrom);

    if (fs.existsSync(`${fileWithoutExt}.ts`)) {
      return path.relative(this.context.getCompilerOptions().baseUrl || process.cwd(), `${fileWithoutExt}.ts`);
    } else if (fs.existsSync(`${fileWithoutExt}.tsx`)) {
      return path.relative(this.context.getCompilerOptions().baseUrl || process.cwd(), `${fileWithoutExt}.tsx`);
    }

    throw new Error(`Could not resolve ${importedFrom} in ${this.sourceFile.fileName}`);
  }

  resolveRelativeImport(importedFrom: string) {
    const suggestions = new ImportPathsResolver(this.context.getCompilerOptions()).getImportSuggestions(
      importedFrom,
      path.dirname(this.sourceFile.fileName)
    );

    if (suggestions === undefined) {
      throw new Error(`Could not resolve (and qualify): ${importedFrom} from ${this.sourceFile.fileName}`);
    }

    return path.relative(this.context.getCompilerOptions().baseUrl || process.cwd(), suggestions[0]);
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
        ? this.resolveAbsoluteImport(importedFrom)
        : this.resolveRelativeImport(importedFrom);

    if (!relativeFilePath.endsWith('.ts') && !relativeFilePath.endsWith('.tsx')) {
      return node;
    }

    const identifiers = this.extractIdentifiersFromImportClause(importClause);

    identifiers.forEach(identifier => {
      if (Array.isArray(identifier)) {
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
