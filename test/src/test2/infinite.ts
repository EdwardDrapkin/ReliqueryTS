import { Relic } from "../decorators";

export interface A {

}

export interface B extends A {

}

export interface C extends A {

}
@Relic
export class InfiniteStart implements B {

}

@Relic
export class InfiniteMid implements C {
  constructor(start: B) {}
}

