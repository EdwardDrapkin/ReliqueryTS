import { BaseWriter } from './BaseWriter';
import { Statement } from "./Statement";

export abstract class NamedBaseWriter extends BaseWriter implements Statement {
  needsSemicolon = false;

  constructor(protected name: string) {
    super();
  }
}
