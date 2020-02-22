import { NamedBaseWriter } from "../NamedBaseWriter";

export class TypedVariable extends NamedBaseWriter {
  private type: string = 'never';

  setType(type: string) {
    this.type = type;
    return this;
  }

  out() {
    this.write(`${this.name}: ${this.type}`)
  }
}
