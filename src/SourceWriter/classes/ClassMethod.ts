import { NamedBaseWriter } from '../NamedBaseWriter';
import { TypeParameter } from '../types/TypeParameter';
import { TypedVariable } from '../types/TypedVariable';
import { Statement } from "../Statement";

export class ClassMethod extends NamedBaseWriter {
  private typeParameters: TypeParameter[] = [];
  private parameters: TypedVariable[] = [];
  private returnType: string = '';
  private statements: Statement[] = [];

  addStatement(statement: Statement) {
    this.statements.push(statement);
    return this;
  }

  addStatements(factory: () => (Statement[]|Statement)) {
    this.statements.push(...(([] as Statement[]).concat(factory())))
    return this;
  }

  setReturnType(type: string) {
    this.returnType = type;
    return this;
  }

  addParameter(parameter: TypedVariable) {
    this.parameters.push(parameter);
    return this;
  }

  addTypeParameter(typeParameter: TypeParameter) {
    this.typeParameters.push(typeParameter);
    return this;
  }

  out() {
    this.writeIndented(`${this.name}`);
    if (this.typeParameters.length > 0) {
      this.write(`<${this.typeParameters.map(e => e.getAsString()).join(', ')}>`);
    }
    this.write('(');
    if (this.parameters.length > 0) {
      this.write(this.parameters.map(e => e.getAsString()).join(', '));
    }
    this.write(')');
    if(this.returnType) {
      this.write(`: ${this.returnType}`)
    }
    this.block(() => this.writeStatements(this.statements));
  }
}
