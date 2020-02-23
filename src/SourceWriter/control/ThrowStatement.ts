import { BaseWriter } from "../BaseWriter";
import { Statement } from "../Statement";

export class ThrowStatement extends BaseWriter implements Statement {
  needsSemicolon = true;
  constructor(private statement: Statement) {
    super();
  }

  out() {
    this.write(`throw ${this.statement.getAsString()}`);
  }
}
