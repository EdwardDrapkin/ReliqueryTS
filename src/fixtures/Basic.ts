import { AutoConstructed, AutoCurried, create, Relic } from 'Annotations';
import { B } from "fixtures/B";

export interface A {
    a: string;
}

export interface C extends B {

}

export interface D extends C {

}

@Relic
export class Basic implements A, D {
    a = "string"
}

export class NotTaggedBasic {

}

export interface F {
    (): void,
}

export const noArgs: F = Relic(function noArgs() {

});

export const withArgs = Relic(function withAraaags(a: A, b: B) {
    return new Basic()
});

export const curriedWithArgs = AutoCurried(function withAraaags(a: A, b: B) {
    return new Basic()
});

@AutoConstructed
export class InjectedExample {
    constructor(a: Basic, b: B) {
        console.log({ a, b });
    }
}

console.log(create(InjectedExample.name));
