import { Foo as Foo_1 } from './test';
import { Circle2 as Circle2_1 } from './test2/circle';
import { Circle3 as Circle3_1 } from './test2/circle';
import { InfiniteStart as InfiniteStart_1 } from './test2/infinite';
import { InfiniteMid as InfiniteMid_1 } from './test2/infinite';
import { Circle1 as Circle1_1 } from './test2/test';
import { UsesALot as UsesALot_1 } from './test2/test';
import { Foo as Foo_2 } from './test2/test';
// generated container
const lookupTable = {
  test_ts_Foo: Foo_1,
  test2_dd_othertest_ts_FooBase: Foo_1,
  interfaces_ts_Incest: Foo_1,
  interfaces_ts_Parent: Foo_1,
  interfaces_ts_Child: Foo_1,
  interfaces_ts_IB: Foo_1,
  interfaces_ts_IA: Foo_1,
  test2_dd_circle_ts_Circle2: Circle2_1,
  test2_dd_circle_ts_Circle3: Circle3_1,
  test2_dd_circle_ts_ICircle: Circle3_1,
  test2_dd_infinite_ts_InfiniteStart: InfiniteStart_1,
  test2_dd_infinite_ts_B: InfiniteStart_1,
  test2_dd_infinite_ts_InfiniteMid: InfiniteMid_1,
  test2_dd_infinite_ts_C: InfiniteMid_1,
  test2_dd_test_ts_Circle1: Circle1_1,
  test2_dd_test_ts_UsesALot: UsesALot_1,
  test2_dd_test_ts_Foo: Foo_2,
};
type L = typeof lookupTable;

export class Container {
  singletons: { [encodedName in keyof L]?: InstanceType<L[encodedName]> } = {};

  resolve<K extends keyof L>(encodedName: K): InstanceType<L[K]> {
    switch (encodedName) {
      case 'test_ts_Foo':
      case 'test2_dd_othertest_ts_FooBase':
      case 'interfaces_ts_Incest':
      case 'interfaces_ts_Parent':
      case 'interfaces_ts_Child':
      case 'interfaces_ts_IB':
      case 'interfaces_ts_IA':
        return (this.singletons['test_ts_Foo'] =
          this.singletons['test_ts_Foo'] ?? (new lookupTable['test_ts_Foo']() as InstanceType<L[K]>)) as InstanceType<
          L[K]
        >;
      case 'test2_dd_circle_ts_Circle2':
        return new lookupTable['test2_dd_circle_ts_Circle2']() as InstanceType<L[K]>;
      case 'test2_dd_circle_ts_Circle3':
      case 'test2_dd_circle_ts_ICircle':
        return new lookupTable['test2_dd_circle_ts_Circle3'](
          this.resolve('test2_dd_circle_ts_Circle2')
        ) as InstanceType<L[K]>;
      case 'test2_dd_infinite_ts_InfiniteStart':
      case 'test2_dd_infinite_ts_B':
        return (this.singletons['test2_dd_infinite_ts_InfiniteStart'] =
          this.singletons['test2_dd_infinite_ts_InfiniteStart'] ??
          (new lookupTable['test2_dd_infinite_ts_InfiniteStart']() as InstanceType<L[K]>)) as InstanceType<L[K]>;
      case 'test2_dd_infinite_ts_InfiniteMid':
      case 'test2_dd_infinite_ts_C':
        return (this.singletons['test2_dd_infinite_ts_InfiniteMid'] =
          this.singletons['test2_dd_infinite_ts_InfiniteMid'] ??
          (new lookupTable['test2_dd_infinite_ts_InfiniteMid'](this.resolve('test2_dd_infinite_ts_B')) as InstanceType<
            L[K]
          >)) as InstanceType<L[K]>;
      case 'test2_dd_test_ts_Circle1':
        return (this.singletons['test2_dd_test_ts_Circle1'] =
          this.singletons['test2_dd_test_ts_Circle1'] ??
          (new lookupTable['test2_dd_test_ts_Circle1'](this.resolve('test2_dd_circle_ts_Circle2')) as InstanceType<
            L[K]
          >)) as InstanceType<L[K]>;
      case 'test2_dd_test_ts_UsesALot':
        return (this.singletons['test2_dd_test_ts_UsesALot'] =
          this.singletons['test2_dd_test_ts_UsesALot'] ??
          (new lookupTable['test2_dd_test_ts_UsesALot'](
            this.resolve('interfaces_ts_Incest'),
            this.resolve('interfaces_ts_Parent'),
            this.resolve('test2_dd_test_ts_Circle1'),
            this.resolve('test2_dd_circle_ts_Circle2')
          ) as InstanceType<L[K]>)) as InstanceType<L[K]>;
      case 'test2_dd_test_ts_Foo':
        return new lookupTable['test2_dd_test_ts_Foo']() as InstanceType<L[K]>;
      default:
        throw new Error(`Could not resolve ${encodedName}!`);
    }
  }
}

export const container: Container = new Container();
