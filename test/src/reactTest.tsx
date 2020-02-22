import * as React from 'react';
import { Foo } from './test'

export function Fo2o(props: { }, something: Foo) {
    return <div>{props}</div>;
}

declare function test<T>(): T;

export const foo: string = test();
