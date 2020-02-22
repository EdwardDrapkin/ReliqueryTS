import { BaseWriter } from './BaseWriter';
import { NamedImportStatement } from "./imports/NamedImportStatement";

export class TypescriptFile extends BaseWriter {
  private imports: NamedImportStatement[] = [];
  private statements: BaseWriter[] = [];

  add(writer: BaseWriter) {
    if(writer instanceof NamedImportStatement) {
      this.imports.push(writer);
    } else {
      this.statements.push(writer);
    }
    return this;
  }

  out() {
    const sections = {
      "import statements": () => {
        this.write(this.imports.map(statement => statement.getAsString()).join(''));
      },
      "generated container": () => {
        this.write(this.statements.map(statement => statement.getAsString()).join('\n'));
      }
    }

    Object.entries(sections).forEach(([section, cb]) => {
      this.writeLine(`// ${section}`);
      cb();
      this.writeLine();
    })

    return this;
  }
}
