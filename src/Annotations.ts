interface AnyClass {
    new(): any;
}

export function Relic<C extends AnyClass>(node: C): any {
    return undefined;
}

export function NotRelic(arget: Object,
                         propertyKey: string,
                         descriptor: TypedPropertyDescriptor<any>): any {

}
