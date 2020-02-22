import { NamedBaseWriter } from '../NamedBaseWriter';
import { AssignmentExpression } from "../AssignmentExpression";

export class TypeAlias extends NamedBaseWriter {
  private initializer: AssignmentExpression | undefined = undefined;

  setInitializer(initializer: AssignmentExpression) {
    this.initializer = initializer;
    return this;
  }

  out() {
    this.write(`type ${this.name}`);
    if (this.initializer) {
      this.writeIndented(this.initializer.getAsString());
    }
    this.writeLine(';');
  }
}
