import { NamedBaseWriter } from "../NamedBaseWriter";

export class ModuleSpecifier extends NamedBaseWriter {
  out() {
    this.write(`"${this.name.replace(/\.tsx?$/, '')}"`)
  }
}
