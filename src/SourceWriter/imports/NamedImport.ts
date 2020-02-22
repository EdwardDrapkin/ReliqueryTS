import { NamedBaseWriter } from "../NamedBaseWriter";

export class NamedImport extends NamedBaseWriter {
  private alias: string = '';

  setAlias(alias: string) {
    this.alias = alias;
    return this;
  }

  out() {
    this.write(`{ ${this.name}`)
    if(this.alias) {
      this.write(` as ${this.alias}`)
    }
    this.write(' }')
  }
}
