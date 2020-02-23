import { BaseWriter } from "./BaseWriter";
import { TypedVariable } from "./types/TypedVariable";
import { Statement } from "./Statement";
import { AssignmentExpression } from "./AssignmentExpression";

export class VariableAssignmentStatement extends BaseWriter implements Statement {
  needsSemicolon = true;

  exported: boolean = false;
  mutable: boolean = false;
  initializer: Statement | null = null;

  constructor(private name: TypedVariable) {
    super();
  }

  setExported() {
    this.exported = true;
    return this;
  }

  setMutable() {
    this.mutable = true;
    return this;
  }

  setInitializer(statement: Statement) {
    this.initializer = statement;
    return this;
  }

  out() {
    this.writeIndented('');

    if(this.exported) {
      this.write('export ');
    }

    if(this.mutable) {
      this.write('let ');
    } else {
      this.write('const ');
    }

    this.write(this.name.getAsString());

    if(this.initializer) {
      this.write(new AssignmentExpression().setRightHandSide(this.initializer.getAsString()).getAsString());
    }
  }
}
