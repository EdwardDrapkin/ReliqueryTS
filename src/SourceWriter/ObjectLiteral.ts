import { BaseWriter } from './BaseWriter';

export class ObjectLiteral extends BaseWriter {
  private members: [string, string][] = [];

  constructor() {
    super();
  }

  addMember(name: string, value: string) {
    this.members.push([name, value]);
    return this;
  }

  addMembers(values: [string, string][]) {
    values.forEach(([name, value]) => this.addMember(name, value));
    return this;
  }

  out() {
    this.terminatedBlock(() => {
      this.members.forEach(([name, value]) => {
        this.writeLine(`${name}: ${value},`);
      });
    });
  }
}
