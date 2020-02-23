import { BaseWriter } from './BaseWriter';
import { NamedImportStatement } from "./imports/NamedImportStatement";
import { Statement } from "./Statement";

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
        this.write(this.imports.map(statement => {
          return `${statement.getAsString()}${statement.needsSemicolon ? ';' : ''}`;
        }).join('\n'));
      },

      "generated container": () => {
        this.write(this.statements.map(statement => {
          return `${statement.getAsString()}${(statement as Statement).needsSemicolon ? ';' : ''}`;
        }).join('\n'));
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
