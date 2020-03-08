import { FullyQualifiedSymbol } from '../compiler/SourceFileHelper';
import { subLogger } from '../logger';
import { ContainerDescriptor } from './ContainerDescriptor';
import crypto from 'crypto';
import { ClassWithHeritage } from "../compiler/ClassWithHeritage";
import { InterfaceWithHeritage } from "../compiler/InterfaceWithHeritage";

class ClassAndInterfaceLookupTable {
  public classes: {
    [name: string]: ClassWithHeritage[];
  } = {};

  public interfaces: {
    [name: string]: InterfaceWithHeritage[];
  } = {};

  constructor(classes: ClassWithHeritage[], interfaces: InterfaceWithHeritage[]) {
    this.addInterfaces(interfaces);
    this.addClasses(classes);
  }

  addInterfaces(interfaces: InterfaceWithHeritage[]) {
    interfaces.forEach(iface => {
      this.interfaces[iface.fullyQualifiedName.encodedName] = (
        this.interfaces[iface.fullyQualifiedName.encodedName] || []
      ).concat(iface);
    });
  }

  addClasses(classes: ClassWithHeritage[]) {
    classes.forEach(clazz => {
      this.classes[clazz.fullyQualifiedName.encodedName] = (
        this.classes[clazz.fullyQualifiedName.encodedName] || []
      ).concat(clazz);
    });
  }
}

export interface ResolutionGraphNode extends FullyQualifiedSymbol {
  isSingleton?: boolean;
}

export class ResolutionGraph {
  // a map of encoded name -> encoded name
  public resolvesFor: {
    [key: string]: ResolutionGraphNode[];
  } = {};
  public readonly lookupTable: ClassAndInterfaceLookupTable;
  private readonly logger = subLogger('ResolutionGraph');
  // quick lookup table to make sure something that resolves for something else is directly registered
  private directRegistrations: {
    [key: string]: ResolutionGraphNode;
  } = {};
  /*
    something is "dangling" if there's a class registered for, but we can't lookup its hierarchy yet
   */
  private danglingClasses: {
    [key: string]: ResolutionGraphNode;
  } = {};
  private danglingInterfaces: {
    [key: string]: ResolutionGraphNode;
  } = {};

  constructor(classes: ClassWithHeritage[] = [], interfaces: InterfaceWithHeritage[] = []) {
    this.lookupTable = new ClassAndInterfaceLookupTable(classes, interfaces);
  }

  addInterfaces(interfaces: InterfaceWithHeritage[]) {
    this.lookupTable.addInterfaces(interfaces);
    interfaces.forEach(iface => {
      if (this.danglingInterfaces[iface.fullyQualifiedName.encodedName]) {
        this.registerInterface(iface.fullyQualifiedName, this.danglingInterfaces[iface.fullyQualifiedName.encodedName]);
      }
    });
  }

  addClasses(classes: ClassWithHeritage[]) {
    this.lookupTable.addClasses(classes);
    classes.forEach(clazz => {
      if (this.danglingClasses[clazz.fullyQualifiedName.encodedName]) {
        this.registerClass(clazz.fullyQualifiedName, this.danglingClasses[clazz.fullyQualifiedName.encodedName]);
      }
    });
  }

  registerInterface(iface: ResolutionGraphNode, toResolveFor: ResolutionGraphNode) {
    this.logger.trace(
      'Registering %s (%s) as a resolution for %s (%s)',
      toResolveFor.name,
      toResolveFor.relativeFilePath,
      iface.name,
      iface.relativeFilePath
    );

    this.resolveFor(toResolveFor, iface.encodedName);

    if (this.danglingInterfaces[iface.encodedName]) {
      delete this.danglingInterfaces[iface.encodedName];
    }

    const withHeritage = this.lookupTable.interfaces[iface.encodedName];

    if (!withHeritage) {
      this.danglingInterfaces[iface.encodedName] = toResolveFor;
      return;
    }

    withHeritage.forEach(ifaceDecl => {
      ifaceDecl.parents.forEach(parent => {
        this.registerInterface(parent, toResolveFor);
      });
    });
  }

  registerClass(clazz: ResolutionGraphNode, toResolveFor: ResolutionGraphNode = clazz) {
    this.logger.trace(
      'Registering %s (%s) as a resolution for %s (%s)',
      toResolveFor.name,
      toResolveFor.relativeFilePath,
      clazz.name,
      clazz.relativeFilePath
    );

    if (toResolveFor === clazz) {
      this.directRegistrations[clazz.encodedName] = clazz;
    }

    const clazzWithHierarchy = this.lookupTable.classes[clazz.encodedName];

    if (!clazzWithHierarchy) {
      this.danglingClasses[clazz.encodedName] = toResolveFor;
      return;
    }

    if (this.danglingClasses[clazz.encodedName]) {
      delete this.danglingClasses[clazz.encodedName];
    }

    clazzWithHierarchy.forEach(clazzEntry => {
      this.resolveFor(toResolveFor, clazzEntry.fullyQualifiedName.encodedName);

      if (clazzEntry.parentClass) {
        const parentWithHierarchy = this.lookupTable.classes[clazzEntry.parentClass.encodedName];
        if (!parentWithHierarchy) {
          this.danglingClasses[clazzEntry.parentClass.encodedName] = toResolveFor;
        } else {
          parentWithHierarchy.forEach(parent => {
            this.registerClass(parent.fullyQualifiedName, toResolveFor);
          });
        }
      }

      if (clazzEntry.implementedInterfaces) {
        clazzEntry.implementedInterfaces.forEach(implemented => {
          this.registerInterface(implemented, toResolveFor);
        });
      }
    });
  }

  public toContainerDescriptor(): { descriptor: ContainerDescriptor; hash: string } {
    const descriptor = new ContainerDescriptor();
    const hash = crypto.createHash('sha1');

    // require('crypto').createHash('sha1').update(data).digest('base64');
    Object.keys(this.resolvesFor).forEach(resolvesForKey => {
      const fqn: ResolutionGraphNode =
        this.lookupTable.interfaces[resolvesForKey]?.[0]?.fullyQualifiedName ||
        this.lookupTable.classes[resolvesForKey]?.[0]?.fullyQualifiedName;

      if (!fqn) {
        throw new Error(`Could not re-resolve ${resolvesForKey}.  Are you sure the symbol is exported?`);
      }

      let potentialResolutions = this.resolvesFor[resolvesForKey].reduce((acc, curr) => {
        let index = -1;
        acc.forEach((item, idx) => {
          if (item.encodedName === curr.encodedName) {
            index = idx;
          }
        });

        if (index === -1) {
          acc.push(curr);
        }

        return acc;
      }, [] as ResolutionGraphNode[]);

      if (potentialResolutions.length > 1) {
        if (this.lookupTable.interfaces[resolvesForKey]) {
          console.warn(`Multiple resolutions for interface ${resolvesForKey} found, it will not be resolveable.`);
          return;
        }
        throw new Error(`Multiple resolutions for ${resolvesForKey} found`);
      }

      const resolution = {
        name: potentialResolutions[0].name,
        importPath: potentialResolutions[0].relativeFilePath,
        isSingleton: potentialResolutions[0].isSingleton,
      };

      hash.update(`${resolvesForKey}=${resolution.name}-${resolution.importPath}\n`);
      descriptor.addResolution(resolvesForKey, resolution);
    });

    return { descriptor, hash: hash.digest('hex') };
  }

  private resolveFor(fqn: FullyQualifiedSymbol, resolvesFor: string) {
    this.resolvesFor[resolvesFor] = this.resolvesFor[resolvesFor] || [];
    this.resolvesFor[resolvesFor].push(fqn);
  }
}
