import { IncrementallyLoggable } from "../incremental/IncrementalLog";
import { FullyQualifiedSymbol } from "./SourceFileHelper";
import crypto from "crypto";

export class InterfaceWithHeritage implements IncrementallyLoggable<InterfaceWithHeritage> {
  constructor(public fullyQualifiedName: FullyQualifiedSymbol, public parents: FullyQualifiedSymbol[]) {
  }

  static deserialize(input: string) {
    const parsed = JSON.parse(input);
    return new InterfaceWithHeritage(parsed.fullyQualifiedName, parsed.parents);
  }

  compareTo(other: InterfaceWithHeritage): number {
    return other.hash().localeCompare(this.hash());
  }

  hash() {
    const hash = crypto.createHash('sha1');
    hash.update(this.serialize());
    return hash.digest('hex');
  }

  serialize() {
    return JSON.stringify({
      fullyQualifiedName: this.fullyQualifiedName,
      parents: this.parents,
    });
  }
}
