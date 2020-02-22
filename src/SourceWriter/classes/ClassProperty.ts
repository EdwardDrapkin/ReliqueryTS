import { NamedBaseWriter } from '../NamedBaseWriter';
import { AssignmentExpression } from "../AssignmentExpression";

export class ClassProperty extends NamedBaseWriter {
  private type: string = 'never';
  private initializer: AssignmentExpression | undefined = undefined;

  setInitializer(initializer: AssignmentExpression) {
    this.initializer = initializer;
    return this;
  }

  setType(type: string) {
    this.type = type;
    return this;
  }

  out() {
    this.write(`${this.name}: ${this.type}`);
    if (this.initializer) {
      this.write(this.initializer.getAsString());
    }
    this.writeLine(';');
  }
}
