import { ClassMethod } from './ClassMethod';
import { ClassProperty } from './ClassProperty';
import { NamedBaseWriter } from '../NamedBaseWriter';

export class Clazz extends NamedBaseWriter {
  private exported: boolean = false;
  private methods: ClassMethod[] = [];
  private properties: ClassProperty[] = [];

  setExported(exported: boolean = true) {
    this.exported = exported;
    return this;
  }

  addProperty(property: ClassProperty) {
    this.properties.push(property);
    return this;
  }

  addMethod(method: ClassMethod) {
    this.methods.push(method);
    return this;
  }

  out() {
    if (this.exported) {
      this.writeIndented(`export class ${this.name} `);
    } else {
      this.writeIndented(`class ${this.name} `);
    }

    this.block(() => {
      this.properties.forEach(property => {
        this.writeLine(property.getAsString());
      });

      this.methods.forEach(method => {
        method.indentationLevel = this.indentationLevel;
        this.write(method.getAsString());
      });
    });
  }
}
