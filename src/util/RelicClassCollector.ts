import { SourceFile, TransformationContext } from 'typescript';
import { DecoratedClassCollector } from './DecoratedClassCollector';

export class RelicClassCollector extends DecoratedClassCollector {
  public constructor(sourceFile: SourceFile, context: TransformationContext) {
    super(sourceFile, context);
    this.collectSymbols = ['Relic', 'Singleton'];
  }
}
