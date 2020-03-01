import { Serializable } from '../util/Serializable';
import { Comparable } from '../util/Comparable';
import { Hashable } from '../util/Hashable';
import { ClassWithHeritage } from '../compiler/ClassWithHeritage';
import { ResolutionGraph, ResolutionGraphNode } from '../container/ResolutionGraph';
import { readFileSync, writeFileSync } from 'fs';
import { ClassWithConstructor } from '../compiler/ConstructorCollector';
import { InterfaceWithHeritage } from "../compiler/InterfaceWithHeritage";

export interface IncrementallyLoggable<T> extends Serializable, Hashable, Comparable<T> {}

interface SerializedCache {
  steps: {
    collectClasses: Array<{
      fileName: string;
      classes: string[];
    }>;
    collectInterfaces: Array<{
      fileName: string;
      interfaces: string[];
    }>;
    collectConstructors: Array<{
      fileName: string;
      ctors: {
        [name: string]: string;
      };
    }>;
  };

  registrations: ResolutionGraphNode[];
}

interface StepCache {
  steps: {
    collectClasses: Array<{
      fileName: string;
      classes: ClassWithHeritage[];
    }>;

    collectInterfaces: Array<{
      fileName: string;
      interfaces: InterfaceWithHeritage[];
    }>;

    collectConstructors: Array<{
      fileName: string;
      ctors: {
        [name: string]: ClassWithConstructor;
      };
    }>;
  };

  registrations: ResolutionGraphNode[]

  dirty: boolean;
}

interface HasFileName {
  fileName: string;
}

export class IncrementalLog {
  private static EMPTY_CACHE: StepCache = {
    steps: {
      collectClasses: [],
      collectInterfaces: [],
      collectConstructors: [],
    },
    registrations: [],
    dirty: false,
  };

  constructor(private stepCache: StepCache = IncrementalLog.EMPTY_CACHE) {}

  static compareArrays<T extends Comparable<unknown>>(a: T[], b: T[]) {
    if (a === undefined) {
      return b === undefined;
    }

    if (a === null) {
      return b === null;
    }

    if (a.length !== b.length) {
      return false;
    }

    if (a.length === 0 || a === b) {
      return true;
    }

    for (let i = 0; i < a.length; i++) {
      if (a[i].compareTo(b[i]) !== 0) {
        return false;
      }
    }

    return true;
  }

  static findByFileName<T extends HasFileName>(search: T[], fileName: string): number {
    for (let i = 0; i < search.length; i++) {
      if (search[i].fileName === fileName) {
        return i;
      }
    }

    return -1;
  }

  static readFromFile(fileName: string) {
    try {
      const data = readFileSync(fileName);
      if (!data) {
        return new IncrementalLog();
      }
      const parsed = JSON.parse(data.toString()) as SerializedCache;

      return new IncrementalLog({
        registrations: parsed.registrations,
        steps: {
          collectClasses: parsed.steps.collectClasses.map(n => {
            return {
              ...n,
              classes: n.classes.map(ClassWithHeritage.deserialize),
            };
          }),
          collectInterfaces: parsed.steps.collectInterfaces.map(n => {
            return {
              ...n,
              interfaces: n.interfaces.map(InterfaceWithHeritage.deserialize),
            };
          }),
          collectConstructors: parsed.steps.collectConstructors.map(n => {
            return {
              ...n,
              ctors: Object.entries(n.ctors)
                .map(([name, collected]) => {
                  return {
                    [name]: ClassWithConstructor.deserialize(collected),
                  };
                })
                .reduce((acc, curr) => ({ ...acc, ...curr }), {}),
            };
          }),
        },
        dirty: false,
      });
    } catch (e) {
      if (e.message && e.message.match(/ENOENT/)) {
        return new IncrementalLog();
      }

      throw e;
    }
  }

  writeToFile(fileName: string) {
    const serializable: SerializedCache = {
      registrations: this.stepCache.registrations,
      steps: {
        collectClasses: this.stepCache.steps.collectClasses.map(e => ({
          ...e,
          classes: e.classes.map(x => x.serialize()),
        })),
        collectInterfaces: this.stepCache.steps.collectInterfaces.map(e => ({
          ...e,
          interfaces: e.interfaces.map(x => x.serialize()),
        })),
        collectConstructors: this.stepCache.steps.collectConstructors.map(e => ({
          ...e,
          ctors: Object.entries(e.ctors)
            .map(([key, ctors]) => {
              return {
                [key]: ctors.serialize(),
              };
            })
            .reduce((acc, curr) => ({...acc, ...curr}), {})
        })),
      },
    };

    writeFileSync(fileName, JSON.stringify(serializable));
  }

  generateGraph(graph: ResolutionGraph = new ResolutionGraph()) {
    this.stepCache.steps.collectClasses.forEach(({ classes }) => {
      graph.addClasses(classes);
    });

    this.stepCache.steps.collectInterfaces.forEach(({ interfaces }) => {
      graph.addInterfaces(interfaces);
    });

    this.stepCache.registrations.forEach(registration => graph.registerClass(registration));

    return graph;
  }

  register(node: ResolutionGraphNode) {
    this.stepCache.registrations.push(node);
  }

  collectCtors(fileName: string, ctors: { [encodedName: string]: ClassWithConstructor }): boolean {
    return this.collect(fileName, this.stepCache.steps.collectConstructors, { fileName, ctors });
  }

  collectClasses(fileName: string, classes: ClassWithHeritage[]): boolean {
    return this.collect(fileName, this.stepCache.steps.collectClasses, { fileName, classes });
  }

  collectInterfaces(fileName: string, interfaces: InterfaceWithHeritage[]): boolean {
    return this.collect(fileName, this.stepCache.steps.collectInterfaces, { fileName, interfaces });
  }

  private collect<T extends HasFileName & {}>(fileName: string, source: T[], newData: T) {
    const oldLocation = IncrementalLog.findByFileName(source, fileName);
    if (oldLocation === -1) {
      source.push(newData);
      return (this.stepCache.dirty = true);
    }

    let dirty = false;

    Object.keys(source[oldLocation]).forEach(key => {
      if (dirty) {
        return;
      }

      const old = source[oldLocation];

      const item = old[key as keyof typeof old];
      const newItem = newData[key as keyof typeof newData];

      if (Array.isArray(item)) {
        dirty = !IncrementalLog.compareArrays(item, newItem as typeof item);
      } else {
        dirty = item === newItem;
      }
    });

    if (dirty) {
      this.stepCache.dirty = true;
      source[oldLocation] = {
        fileName,
        ...newData,
      };
    }

    return this.stepCache.dirty;
  }
}
