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
