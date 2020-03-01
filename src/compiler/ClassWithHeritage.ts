import { FullyQualifiedSymbol } from "./SourceFileHelper";
import crypto from "crypto";
import { IncrementallyLoggable } from "../incremental/IncrementalLog";

export class ClassWithHeritage implements IncrementallyLoggable<ClassWithHeritage> {
  constructor(
    public fullyQualifiedName: FullyQualifiedSymbol,
    public implementedInterfaces: FullyQualifiedSymbol[] = [],
    public parentClass?: FullyQualifiedSymbol
  ) {
  }

  static deserialize(input: string) {
    const obj = JSON.parse(input) as ClassWithHeritage;
    return new ClassWithHeritage(
      obj.fullyQualifiedName,
      obj.implementedInterfaces,
      obj.parentClass
    )
  }

  toString() {
    return this.serialize();
  }

  serialize() {
    return JSON.stringify({
      fullyQualifiedName: this.fullyQualifiedName,
      implementedInterfaces: this.implementedInterfaces,
      parentClass: this.parentClass
    });
  }

  compareTo(other: ClassWithHeritage): number {
    return other.hash().localeCompare(this.hash());
  }

  hash() {
    const hash = crypto.createHash('sha1');
    hash.update(this.serialize());
    return hash.digest('hex');
  }
}
