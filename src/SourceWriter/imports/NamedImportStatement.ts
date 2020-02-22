import { NamedImport } from "./NamedImport";
import { NamedBaseWriter } from "../NamedBaseWriter";
import { ModuleSpecifier } from "./ModuleSpecifier";

export class NamedImportStatement extends NamedBaseWriter {
  private namedImport: NamedImport;

  constructor(name: string, namedImport: NamedImport) {
    super(name);
    this.namedImport = namedImport;
  }


  out() {
    this.write('import ');
    this.write(this.namedImport.getAsString());
    this.write(' from ');
    this.write(new ModuleSpecifier(this.name).getAsString());
    this.writeLine(';');
  }
}
