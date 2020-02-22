import { BaseWriter } from "../BaseWriter";
import { Statement } from "../Statement";

export class ReturnStatement extends BaseWriter implements Statement {
  needsSemicolon = true;

  constructor(private statement: Statement) {
    super();
  }

  out() {
    this.writeIndented(`return ${this.statement.getAsString()}`)
  }
}
