/// <reference path="../../../../index.d.ts" />

import { Singleton } from "reliquery";

@Singleton
export class CircleA {
  constructor(b: CircleB) {

  }
}

@Singleton
export class CircleB {
  constructor(b: CircleA) {

  }
}
