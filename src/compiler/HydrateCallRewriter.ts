import { VariableDeclarationHelper } from './SourceFileHelper';
import {
  CallExpression,
  createCall,
  createIdentifier,
  createImportClause,
  createImportDeclaration,
  createNamespaceImport,
  createPropertyAccess,
  createStringLiteral,
  isCallExpression,
  isImportDeclaration,
  isStringLiteral,
  SourceFile,
  Statement,
  updateSourceFileNode,
  updateVariableDeclaration,
  VariableDeclaration,
} from 'typescript';
import { ImportsCollector } from './ImportsCollector';

export class HydrateCallRewriter extends VariableDeclarationHelper {
  identifier = createIdentifier('reliquery_container');
  public visit(node: SourceFile = this.sourceFile) {
    const result = super.visit(node);

    if (result !== node) {
      return this.alterImports(result);
    }

    return result;
  }

  alterImports(file: SourceFile) {
    const containerPath = this.resolveAbsoluteImport('container.js');
    const importStatement = createImportDeclaration(
      undefined,
      undefined,
      createImportClause(undefined, createNamespaceImport(this.identifier)),
      createStringLiteral(containerPath)
    );

    return updateSourceFileNode(
      file,
      ([] as Statement[])
        .concat(importStatement)
        .concat(file.statements.filter(statement => {
          return !(isImportDeclaration(statement) && isStringLiteral(statement.moduleSpecifier) && statement.moduleSpecifier.text === 'reliquery');
        }))
    );
  }

  process(node: VariableDeclaration) {
    if (!node.initializer) {
      return node;
    }

    const importsCollector = this.to(ImportsCollector);

    importsCollector.visit();

    if (!importsCollector.hasHydrateAs) {
      return node;
    }

    if (!node.initializer.getFullText(this.sourceFile).match(new RegExp(importsCollector.hasHydrateAs))) {
      return node;
    }

    if (node.type) {
      const requestedType = node.type.getText(this.sourceFile);
      return this.updateDeclaration(node, requestedType, importsCollector);
    }

    if(node.initializer && isCallExpression(node.initializer)) {
      const call: CallExpression = node.initializer;
      if(call.typeArguments !== undefined) {
        if(call.typeArguments.length !== 1) {
          throw new Error('Calls to hydrate can only have one type argument')
        }

        const requestedType = call.typeArguments[0].getText(this.sourceFile);
        return this.updateDeclaration(node, requestedType, importsCollector);
      }
    }

    return node;
  }

  private updateDeclaration(node: VariableDeclaration, requestedType: string, importsCollector: ImportsCollector) {
    const fullyQualifiedType = importsCollector.importedIdentifiers[requestedType];

    if (fullyQualifiedType === undefined) {
      throw new Error(`Could not find symbol: ${requestedType}`);
    }

    return updateVariableDeclaration(
      node,
      node.name,
      node.type,
      createCall(
        createPropertyAccess(
          createPropertyAccess(this.identifier, createIdentifier('container')),
          createIdentifier('resolve')
        ),
        undefined,
        [createStringLiteral(fullyQualifiedType.encodedName)]
      )
    );
  }
}

