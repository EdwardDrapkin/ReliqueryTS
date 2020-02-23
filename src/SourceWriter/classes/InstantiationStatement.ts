import { Statement } from '../Statement';
import { NamedBaseWriter } from '../NamedBaseWriter';

export class InstantiationStatement extends NamedBaseWriter implements Statement {
  needsSemicolon = true;

  private parameters: string[] = [];

  addParameter(parameter: string) {
    this.parameters.push(parameter);
    return this;
  }

  addParameters(parameters: string[]) {
    this.parameters.push(...parameters);
    return this;
  }

  out() {
    this.write(`new ${this.name}(`);
    if (this.parameters.length > 0) {
      this.write(this.parameters.join(', '));
    }
    this.write(`)`);
    if (this.typeCast) {
      this.write(` as ${this.typeCast}`);
    }
  }
}
