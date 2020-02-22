import { BaseWriter } from "./BaseWriter";

export interface Statement extends BaseWriter {
  needsSemicolon: boolean;
}
