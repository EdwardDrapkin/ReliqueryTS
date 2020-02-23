import { BaseWriter } from "./BaseWriter";
import { Statement } from "./Statement";

export class ParentheticalStatement extends BaseWriter implements Statement {
  needsSemicolon = false;

  private statement: string | null = null;


  setStatement(stmt: string) {
    this.statement = stmt;
    return this;
  }

  out() {
    this.write(`(${this.statement ?? ''})`);
    if (this.typeCast) {
      this.write(` as ${this.typeCast}`);
    }
  }
}
