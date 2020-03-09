/// <reference path="../../../../index.d.ts" />
import { Singleton } from "reliquery";

export class A {

}

@Singleton
export class B {

}

@Singleton
export class C {
  constructor(public a: A | B) {

  }
}
