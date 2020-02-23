import { NamedBaseWriter } from '../NamedBaseWriter';
import { Statement } from "../Statement";

export class SwitchCase extends NamedBaseWriter {
  private cases: { [check: string]: Statement[] } = {};
  private defaultCase: Statement[] = [];

  setDefault(statements: Statement[]) {
    this.defaultCase = statements;
    return this;
  }

  addCase(check: string|string[], statements: (Statement[] | Statement | (() => (Statement|Statement[])))) {
    const key = JSON.stringify(([] as string[]).concat(check));
    if(typeof statements === 'function') {
      statements = statements();
    }
    this.cases[key] = (this.cases[key] || []).concat(statements);
    return this;
  }

  out() {
    this.writeIndented(`switch(${this.name})`);
    this.block(() => {
      Object.entries(this.cases).forEach(([checks, statements]) => {
        const cases: string[] = JSON.parse(checks);

        cases.forEach(check => {
          this.writeLine(`case ${check}: `);
        });

        if(statements.length > 1) {
          this.block(() => this.writeStatements(statements))
        } else {
          this.increaseIndent();
          this.writeStatements(statements);
          this.decreaseIndent()
        }
      });


      if(this.defaultCase.length > 0) {
        this.writeIndented('default: ');
        if (this.defaultCase.length > 1) {
          this.block(() => this.writeStatements(this.defaultCase))
        } else {
          this.writeStatements(this.defaultCase)
        }
      }
    });
  }
}
