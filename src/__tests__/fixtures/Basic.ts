import { NotRelic, Relic } from 'Annotations';


interface A {

}

interface B {

}

interface C extends B {

}

interface D extends C {

}

@Relic
export class Basic implements A, D {
    @NotRelic
    foo() {

    }
}

export class NotTaggedBasic {

}
