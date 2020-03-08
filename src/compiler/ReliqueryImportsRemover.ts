import { SourceFileHelperInst } from "./SourceFileHelper";
import { isImportDeclaration, isStringLiteral, SourceFile, updateSourceFileNode } from "typescript";

export class ReliqueryImportsRemover extends SourceFileHelperInst {
  public visit(sourceFile: SourceFile = this.sourceFile): SourceFile {
    return updateSourceFileNode(
      sourceFile,
      sourceFile.statements.filter(statement => {
        if (isImportDeclaration(statement)) {
          const moduleSpecifier = statement.moduleSpecifier;
          if (isStringLiteral(moduleSpecifier) && moduleSpecifier.text === 'reliquery') {
            return false;
          }
        }

        return true;
      }),
      sourceFile.isDeclarationFile,
      sourceFile.referencedFiles,
      sourceFile.typeReferenceDirectives,
      sourceFile.hasNoDefaultLib,
      sourceFile.libReferenceDirectives
    );
  }
}
