import { Statement } from "./Statement";

export const BASE_INDENT = 2;

export abstract class BaseWriter {
  public indentationLevel: number = 0;
  protected typeCast: string = '';
  private content: string = '';

  abstract out(): void;

  castAs(type: string) {
    this.typeCast = type;
    return this
  }

  increaseIndent(by = BASE_INDENT) {
    this.indentationLevel += by;
  }

  decreaseIndent(by = BASE_INDENT) {
    this.indentationLevel = this.indentationLevel - by || 0;
  }

  block(callback: () => void, skipNewline: boolean = false) {
    this.write('{\n');
    this.increaseIndent();
    callback();
    this.decreaseIndent();
    if(skipNewline) {
      this.writeIndented('}');
    } else {
      this.writeLine('}');
    }
    return this;
  }


  writeLine(content: string = '') {
    this.writeIndented(content + '\n');
    return this;
  }

  write(content: string) {
    this.content += content;
    return this;
  }

  writeIndented(content: string) {
    this.printIndent();
    return this.write(content);
  }

  printIndent() {
    for (let i = 0; i < this.indentationLevel; i++) {
      this.content += ' ';
    }
    return this;
  }

  getAsString() {
    this.content = '';
    this.out();
    return this.content;
  }

  writeStatements(statements: Statement[]) {
    statements.forEach(statement => {
      statement.indentationLevel = this.indentationLevel;
      this.write(statement.getAsString());
      if (statement.needsSemicolon) {
        this.write(';');
        this.writeLine();
      }
    })
  }
}
