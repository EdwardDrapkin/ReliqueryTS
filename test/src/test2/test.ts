import { Keep } from "../decorators2";
import { Factory, Provided, Relic } from "../decorators";
import { Foo as Foo2 } from "../test";
import { Circle2 } from "./circle";
import { Incest, Parent } from "../interfaces";

@Keep
@Factory
export class Foo {

}

export class FooUser {
  private readonly foo: Foo;

  constructor(@Provided foo: Foo, @Provided foo2: Foo2) {
    this.foo = foo;
    console.log(this.foo);
  }
}

@Relic
export class Circle1 {
  public constructor(circle: Circle2) {}
}

@Relic
export class UsesALot {
  public constructor(
    a: Incest,
    b: Parent,
    c: Circle1,
    d: Circle2
  ) {

  }
}
