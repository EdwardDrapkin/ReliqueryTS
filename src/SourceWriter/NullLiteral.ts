import { BaseWriter } from './BaseWriter';
import { Statement } from "./Statement";

export class NullLiteral extends BaseWriter implements Statement {
  needsSemicolon = false;

  out() {
    this.write('null')
  }
}
