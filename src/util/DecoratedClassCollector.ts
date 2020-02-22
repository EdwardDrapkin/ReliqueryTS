import { AllClassCollector } from './AllClassCollector';
import { ClassDeclaration, Decorator, isIdentifier, SyntaxKind, updateClassDeclaration } from 'typescript';

export class DecoratedClassCollector extends AllClassCollector {
  protected _collectSymbols: string[] = [];

  get collectSymbols() {
    return this._collectSymbols;
  }

  set collectSymbols(newSymbols) {
    if (this.hasProcessed) {
      throw new Error('Cannot add export symbol after processing has already run.');
    }

    this._collectSymbols = newSymbols;
  }

  process(clazz: ClassDeclaration) {
    const { node, modified } = this.stripDecorators(clazz);

    if (modified) {
      return super.process(node);
    }

    return node;
  }

  private stripDecorators(node: ClassDeclaration): { modified: boolean; node: ClassDeclaration } {
    const { modifiers, decorators } = node;

    if (!decorators) {
      return { modified: false, node };
    }

    const newDecorators: Decorator[] = decorators.filter(decorator => {
      if (decorator.expression) {
        if (
          isIdentifier(decorator.expression) &&
          this._collectSymbols.indexOf(decorator.expression.getText(this.sourceFile)) > -1
        ) {
          return false;
        }
      } else if (this._collectSymbols.indexOf(decorator.getText(this.sourceFile).replace(/^@/, '')) > -1) {
        return false;
      }

      return true;
    });

    if (newDecorators.length !== decorators.length) {
      if (!modifiers || modifiers.filter(e => e.kind === SyntaxKind.ExportKeyword).length < 1) {
        throw new Error(
          'Provided classes must be exported so the container can consume them.  Did you think this was magic?'
        );
      }

      if (!node.name) {
        throw new Error('Container can only consume named classes.');
      }

      return {
        modified: true,
        node: updateClassDeclaration(
          node,
          newDecorators,
          node.modifiers,
          node.name,
          node.typeParameters,
          node.heritageClauses,
          node.members
        ),
      };
    }
    return { modified: false, node };
  }
}
