import { NamedBaseWriter } from "../NamedBaseWriter";

export class TypeParameter extends NamedBaseWriter {
  initializer: string = '';
  constraint: string = '';

  setConstraint(constraint: string) {
    this.constraint = constraint;
    return this;
  }

  setInitializer(initializer: string) {
    this.initializer = initializer;
    return this;
  }

  out() {
    this.write(`${this.name}`)
    if(this.constraint) {
      this.write(` extends ${this.constraint}`)
    }
    if(this.initializer) {
      this.write(` = ${this.initializer}`)
    }
  }
}
