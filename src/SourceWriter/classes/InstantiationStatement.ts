import { Statement } from '../Statement';
import { NamedBaseWriter } from '../NamedBaseWriter';
import { TypedVariable } from '../types/TypedVariable';

export class InstantiationStatement extends NamedBaseWriter implements Statement {
  needsSemicolon = true;

  private parameters: TypedVariable[] = [];

  addParameter(parameter: TypedVariable) {
    this.parameters.push(parameter);
    return this;
  }

  addParameters(parameters: TypedVariable[]) {
    this.parameters.push(...parameters);
    return this;
  }

  out() {
    this.write(`new ${this.name}(`);
    if (this.parameters.length > 0) {
      this.write(this.parameters.map(parameter => parameter.getAsString()).join(', '));
    }
    this.write(`)`);
    if (this.typeCast) {
      this.write(` as ${this.typeCast}`);
    }
  }
}
