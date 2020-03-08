/// <reference path="../../../../index.d.ts" />
import { Factory, Singleton } from 'reliquery';

@Singleton
export class A {
  a = 'a';
}

@Factory
export class B {
  b = 'b';
  constructor(public a: A) {

  }
}

@Factory
export class C {
  c = 'c';
  constructor(public a: A, public b: B) {

  }
}
