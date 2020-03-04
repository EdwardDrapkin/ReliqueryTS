/// <reference path="../declarations.d.ts"/>
import { hydrate } from 'reliquery';
import { Foo } from "./test";
import { Incest } from "../interfaces";


const f: Incest = hydrate();
const ff = hydrate<Foo>();
console.log(f, ff);
