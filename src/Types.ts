export interface NamedFileItem {
    name: string;
    filePath: string;
}

export interface InterfaceDescriptor extends NamedFileItem {
}

interface InterfaceHierarchy {
    implemented: InterfaceDescriptor;
    parents: InterfaceDescriptor[];
}

export interface InjectableClassification extends NamedFileItem {
    interfaces: InterfaceHierarchy[];
}

export interface ClassInjectableClassification extends InjectableClassification {
    parameters: {
        type: NamedFileItem,
        name: string
    }[],
}

export interface FunctionInjectableClassification extends InjectableClassification {
    returnType: NamedFileItem,
    parameters: {
        type: NamedFileItem,
        name: string
    }[],
}

export function isFunctionInjectable(injectable: InjectableClassification): injectable is FunctionInjectableClassification {
    return Object.prototype.hasOwnProperty.call(injectable, 'returnType');
}
