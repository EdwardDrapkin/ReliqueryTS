interface AnyClass {
    new(...args: any[]): {};
}

interface AnyFunction {
    (...args: any[]): any
}

export function Relic<C extends AnyClass | AnyFunction>(node: C): C {
    return node;
}

export function AutoCurried<F extends AnyFunction>(f: F) {
    return f;
}

export function AutoConstructed(target: AnyClass) {
    return target;
}

