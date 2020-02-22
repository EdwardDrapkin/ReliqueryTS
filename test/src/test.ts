import { Relic } from './decorators';
import { Keep } from './decorators2';
import { IA as IA2, IB, Incest } from "./interfaces";
import { FooBase } from "./test2/othertest";


export class FooParent  extends FooBase implements IB, IA2 {}

@Keep
@Relic
export class Foo extends FooBase implements Incest {

}

export class FooUser {
  private readonly foo: Foo;

  constructor(foo: Foo) {
    this.foo = foo;
    console.log(this.foo);
  }
}

