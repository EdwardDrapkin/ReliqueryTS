import { ObjectLiteral } from './ObjectLiteral';
import { Statement } from "./Statement";

export class ObjectLiteralDeclaration extends ObjectLiteral implements Statement {
  needsSemicolon = true;

  constructor(private name: string) {
    super();
  }

  out() {
    this.writeIndented(`const ${this.name} = `);
    super.out();
    return this;
  }
}
