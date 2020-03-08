/// <reference path="../../../../index.d.ts" />
import { Factory, Singleton } from 'reliquery';

@Singleton
export class A {
  type = 'a';
}

@Factory
export class B {
  type = 'b';
  constructor(public a: A) {

  }
}
