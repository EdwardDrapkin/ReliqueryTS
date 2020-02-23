import { NamedBaseWriter } from '../NamedBaseWriter';
import { AssignmentExpression } from "../AssignmentExpression";
import { Statement } from "../Statement";

export class TypeAlias extends NamedBaseWriter implements Statement {
  needsSemicolon = true;

  private initializer: AssignmentExpression | undefined = undefined;

  setInitializer(initializer: AssignmentExpression) {
    this.initializer = initializer;
    return this;
  }

  out() {
    this.writeIndented(`type ${this.name}`);
    if (this.initializer) {
      this.write(this.initializer.getAsString());
    }
  }
}
