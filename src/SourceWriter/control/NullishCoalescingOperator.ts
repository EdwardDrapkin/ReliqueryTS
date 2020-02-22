import { AssignmentExpression } from "../AssignmentExpression";

export class NullishCoalescingOperator extends AssignmentExpression {
  needsSemicolon = false;

  out() {
    return this.write(`${this.lhs} ?? ${this.rhs}`)
  }
}
