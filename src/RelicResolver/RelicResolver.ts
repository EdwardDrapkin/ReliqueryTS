import { InjectableClassification, InterfaceDescriptor, NamedFileItem } from "Types";
import { ResolutionError } from "ResolutionError";


interface LookupTableItem {
    registrations: NamedFileItem[]
}


export class RelicResolver {
    private lookupTable = new Map<string, LookupTableItem>();

    private static toIdentifierString(item: NamedFileItem) {
        return `${item.name}`;
    }

    private static getEmptyTableItem() {
        return {
            registrations: []
        }
    }

    private ensureTableItem(id: string) {
        if (!this.lookupTable.has(id)) {
            this.lookupTable.set(id, RelicResolver.getEmptyTableItem());
        }
    }

    private attachClassification(attach: InjectableClassification, to: NamedFileItem) {
        const interfaceId = RelicResolver.toIdentifierString(to);
        this.ensureTableItem(interfaceId);
        const { registrations } = this.lookupTable.get(interfaceId)!;
        const registered = registrations.find((item) => item.name === attach.name && item.filePath === attach.filePath);

        if (!registered) {
            const { name, filePath } = attach;

            registrations.push({ name, filePath });
        }
    }

    register(classification: InjectableClassification) {
        const classId = RelicResolver.toIdentifierString(classification);

        this.ensureTableItem(classId);

        this.attachClassification(classification, classification);

        classification.interfaces.forEach(interfaceHierarchy => {
            const attach = (item: InterfaceDescriptor) => this.attachClassification(classification, item);
            attach(interfaceHierarchy.implemented);
            interfaceHierarchy.parents.forEach(attach);
        });
    }

    lookup(id: string) {
        const entry = this.lookupTable.get(id);

        if (!entry) {
            throw new ResolutionError(`Could not resolve ${id}.`);
        }

        const { registrations } = entry;

        if (registrations.length < 0) {
            throw new ResolutionError(`Could not resolve ${id}.`);
        } else if (registrations.length > 1) {
            throw new ResolutionError(`Multiple resolutions for ${id}.`);
        }

        const { filePath, name } = registrations[0];
        return { filePath, name };
    }

    serialize() {
        return JSON.stringify([...this.lookupTable], null, 2);
    }

    deserialize(input: string) {
        this.lookupTable = new Map(JSON.parse(input));
    }
}
