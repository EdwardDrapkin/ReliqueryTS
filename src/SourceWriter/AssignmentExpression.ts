import { BaseWriter } from "./BaseWriter";
import { Statement } from "./Statement";

export class AssignmentExpression extends BaseWriter implements Statement {
  needsSemicolon = false;

  protected lhs: string = '';
  protected rhs: string = '';

  setLeftHandSide(expression: string) {
    this.lhs = expression;
    return this;
  }

  setRightHandSide(expression: string) {
    this.rhs = expression;
    return this;
  }

  out() {
    this.write(`${this.lhs} = ${this.rhs}`);
  }
}
