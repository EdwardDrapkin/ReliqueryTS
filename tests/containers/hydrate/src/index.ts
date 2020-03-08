/// <reference path="../../../../index.d.ts" />
import { hydrate } from 'reliquery';
import { A, B } from "./classes";

export const a = hydrate<A>();
export const b: B = hydrate();
