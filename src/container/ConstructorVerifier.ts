import { ClassWithHeritage } from '../util/AllClassCollector';
import { ClassWithConstructor } from '../util/ConstructorCollector';
import { ResolutionGraph } from './ResolutionGraph';

export const PRIMITIVES: { [key: string]: true } = {
  string: true,
  number: true,
  boolean: true,
  null: true,
  undefined: true,
};
export class ConstructorVerifier {
  constructor(public ctors: { [encodedName: string]: ClassWithConstructor }, public graph: ResolutionGraph) {}

  addConstructors(ctors: { [encodedName: string]: ClassWithConstructor }) {
    this.ctors = {
      ...this.ctors,
      ...ctors,
    };
  }

  getClass(name: string) {
    const classes = this.graph.lookupTable.classes[name];
    if (!classes) {
      // haven't parsed the class yet
      return undefined;
    }

    if (classes.length > 1) {
      throw new Error(`Multiple resolutions for ${name}`);
    } else if (classes.length < 1) {
      throw new Error(`No resolutions for ${name}`);
    }
    return classes[0];
  }

  getHumanReadableVerificationErrors() {
    return Object.values(this.verifyAll())
      .map(result => {
        if (Array.isArray(result)) {
          return `Cyclical dependency error detected! Cycle is: ${result
            .map(name => `${this.getHumanReadableClassName(name)}`)
            .join(' -> ')}`;
        }
      })
      .filter(e => e);
  }

  verifyAll(classNames = Object.keys(this.ctors)) {
    return classNames
      .map(encodedName => ({
        [encodedName]: this.getClass(encodedName)
          ? this.isValid(this.getClass(encodedName)!, this.ctors[encodedName])
          : true,
      }))
      .reduce((acc, curr) => ({ ...acc, ...curr }), {});
  }

  getCallableConstructorParams(encodedName: string): string[] {
    const clazz = this.getClass(encodedName);
    if (!clazz && !this.graph.lookupTable.interfaces[encodedName]) {
      throw new Error(`Could not resolve ${encodedName}`);
    }

    if (this.ctors[encodedName]) {
      return this.ctors[encodedName].constructorParams.map(e => e.encodedName ?? 'ERROR');
    }

    if (!clazz || !clazz.parentClass) {
      return [];
    }

    return this.getCallableConstructorParams(clazz.parentClass.encodedName);
  }

  isValid(clazz: ClassWithHeritage, ctor: ClassWithConstructor | undefined, cycle: string[] = []): true | string[] {
    // no parent and no ctor = implicit empty ctor = valid
    if (clazz.parentClass === undefined && ctor === undefined) {
      return true;
    }

    // no ctor and a parent, so traverse upwards to find it
    if (ctor === undefined && clazz.parentClass !== undefined) {
      if (!this.getClass(clazz.parentClass.encodedName)) {
        return true; // haven't parsed parent class yet
      }
      return this.isValid(this.getClass(clazz.parentClass.encodedName)!, this.ctors[clazz.parentClass.encodedName]);
    }

    // we found a constructor! yay!
    if (ctor) {
      let valid: string[] | true = true;
      ctor.constructorParams.forEach(param => {
        if (!PRIMITIVES[param.encodedName]) {
          if (cycle.indexOf(clazz.fullyQualifiedName.encodedName) > -1) {
            valid = cycle.concat(clazz.fullyQualifiedName.encodedName);
          } else {
            valid = this.getClass(param.encodedName)
              ? this.isValid(
                  this.getClass(param.encodedName)!,
                  this.ctors[param.encodedName],
                  cycle.concat(clazz.fullyQualifiedName.encodedName)
                )
              : true;
          }
        }
      });

      return valid;
    }

    return true;
  }

  private getHumanReadableClassName(name: string) {
    const clazz = this.getClass(name)!;
    return `${clazz.fullyQualifiedName.relativeFilePath}::${clazz.fullyQualifiedName.name}`;
  }
}
