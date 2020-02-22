import { Project, Scope, VariableDeclarationKind } from 'ts-morph';
import { ConstructorVerifier } from './ConstructorVerifier';
import { ObjectLiteralDeclaration } from '../SourceWriter/ObjectLiteralDeclaration';
import { TypescriptFile } from '../SourceWriter/TypescriptFile';
import { ClassProperty } from '../SourceWriter/classes/ClassProperty';
import { ClassMethod } from '../SourceWriter/classes/ClassMethod';
import { Clazz } from '../SourceWriter/classes/Clazz';
import { AssignmentExpression } from '../SourceWriter/AssignmentExpression';
import { TypeAlias } from '../SourceWriter/types/TypeAlias';
import { NamedImportStatement } from "../SourceWriter/imports/NamedImportStatement";
import { NamedImport } from "../SourceWriter/imports/NamedImport";
import { TypeParameter } from "../SourceWriter/types/TypeParameter";
import { TypedVariable } from "../SourceWriter/types/TypedVariable";
import { SwitchCase } from "../SourceWriter/control/SwitchCase";
import { ReturnStatement } from "../SourceWriter/control/ReturnStatement";
import { NullishCoalescingOperator } from "../SourceWriter/control/NullishCoalescingOperator";
import { InstantiationStatement } from "../SourceWriter/classes/InstantiationStatement";

export interface Resolution {
  name: string;
  importPath: string;
  isSingleton?: boolean;
}

export class ContainerDescriptor {
  public resolutions: { [key: string]: Resolution } = {};

  get uniqueImports() {
    return Object.values(this.resolutions).reduce((acc, curr) => {
      const set = new Set<string>(acc[curr.importPath]);
      set.add(curr.name);
      acc[curr.importPath] = Array.from(set);
      return acc;
    }, {} as { [key: string]: string[] });
  }

  get lookupTable() {
    return Object.keys(this.resolutions).reduce((acc, resolution) => {
      acc[resolution] = this.importNameMap[this.resolutions[resolution].importPath][this.resolutions[resolution].name];
      return acc;
    }, {} as { [key: string]: string });
  }

  get importNameMap() {
    const seen: { [key: string]: number } = {};

    return Object.entries(this.uniqueImports).reduce((acc, [fileName, unsafeImports]) => {
      unsafeImports.forEach(importName => {
        if (!seen[importName]) {
          seen[importName] = 0;
        }

        if (!acc[fileName]) {
          acc[fileName] = {};
        }

        acc[fileName][importName] = `${importName}_${++seen[importName]}`;
      });

      return acc;
    }, {} as { [key: string]: { [key: string]: string } });
  }

  addResolution(query: string, resolution: Resolution): this {
    this.resolutions[query] = resolution;
    return this;
  }
}

export class ContainerWriter {
  constructor(
    public descriptor: ContainerDescriptor,
    public project: Project,
    public constructorVerifier: ConstructorVerifier
  ) {}

  write() {
    const singletonOrFactoryMap = Object.keys(this.descriptor.resolutions)
      .map(resolution => {
        return {
          resolution,
          isSingleton: this.descriptor.resolutions[resolution].isSingleton,
        };
      })
      .reduce(
        (all, next) => {
          const {factories, singletons} = all;

          if (next.isSingleton) {
            singletons.push(next.resolution);
          }
          return {
            factories,
            singletons,
          };
        },
        {
          singletons: [],
          factories: [],
        } as { singletons: string[]; factories: string[] }
      );

    const singletonsWithCtor = singletonOrFactoryMap.singletons
      .map(singleton => {
        return {
          singleton,
          ctor: this.constructorVerifier.getCallableConstructorParams(singleton),
        };
      })
      .reduce(
        (acc, curr) => {
          if (curr.ctor.length < 1) {
            return {
              ...acc,
              noArgs: acc.noArgs.concat(curr.singleton),
            };
          }

          return {
            ...acc,
            args: {
              ...acc.args,
              [curr.singleton]: curr.ctor,
            },
          };
        },
        {
          noArgs: [],
          args: {},
        } as { noArgs: string[]; args: { [encodedName: string]: string[] } }
      );

    const file = new TypescriptFile();
    Object.entries(this.descriptor.importNameMap).forEach(([moduleName, symbolMap]) => {
      Object.entries(symbolMap).forEach(([name, alias]) => {
        file.add(new NamedImportStatement(
          `./${moduleName}`,
          new NamedImport(name).setAlias(alias)
        ))
      })
    });

    // prettier-ignore
    return file
      .add(
        new ObjectLiteralDeclaration('lookupTable')
          .addMembers(Object.entries(this.descriptor.lookupTable))
      )
      .add(
        new TypeAlias('L')
          .setInitializer(
            new AssignmentExpression().setRightHandSide('typeof lookupTable')
          )
      )
      .add(
        new Clazz('Container')
          .setExported()
          .addProperty(
            new ClassProperty('singletons')
              .setInitializer(new AssignmentExpression().setRightHandSide('{}'))
              .setType('{ [encodedName in keyof L]?: InstanceType<L[encodedName]> }')
          )
          .addMethod(
            new ClassMethod('resolve')
              .addTypeParameter(new TypeParameter('K').setConstraint('keyof L'))
              .addParameter(new TypedVariable('encodedName').setType('K'))
              .setReturnType('InstanceType<L[K]>')
              .addStatements(() => {
                  // `return (this.singletons[encodedName] = this.singletons[encodedName] ?? new lookupTable[encodedName]()) as InstanceType<L[K]>;`
                  return new SwitchCase('encodedName')
                    .addCase(
                      singletonsWithCtor.noArgs.map(e => `"${e}"`),
                      new ReturnStatement(
                        new AssignmentExpression()
                          .setLeftHandSide('this.singletons[encodedName]')
                          .setRightHandSide(
                            new NullishCoalescingOperator()
                              .setLeftHandSide('this.singletons[encodedName]')
                              .setRightHandSide(
                                new InstantiationStatement('lookupTable[encodedName]')
                                  .castAs('InstanceType<L[K]>')
                                  .getAsString()
                              )
                              .getAsString()
                          )
                      )
                    )
              })
          )
      )
      .getAsString();
  }

  writeToString() {
    const errors = this.constructorVerifier.getHumanReadableVerificationErrors();

    if (errors.length > 0) {
      throw new Error(`Dependency errors:\n${errors.join('\n')}`);
    }

    const file = this.project.createSourceFile('deleteme', undefined, { overwrite: true });

    const singletonOrFactoryMap = Object.keys(this.descriptor.resolutions)
      .map(resolution => {
        return {
          resolution,
          isSingleton: this.descriptor.resolutions[resolution].isSingleton,
        };
      })
      .reduce(
        (all, next) => {
          const { factories, singletons } = all;

          if (next.isSingleton) {
            singletons.push(next.resolution);
          }
          return {
            factories,
            singletons,
          };
        },
        {
          singletons: [],
          factories: [],
        } as { singletons: string[]; factories: string[] }
      );

    Object.entries(this.descriptor.importNameMap).forEach(([name, symbolMap]) => {
      file.addImportDeclaration({
        moduleSpecifier: `./${name}`,
        namedImports: Object.entries(symbolMap).map(([name, alias]) => ({ name, alias })),
      });
    });

    file.addVariableStatement({
      isExported: false,
      isDefaultExport: false,
      declarationKind: VariableDeclarationKind.Const,
      declarations: [
        {
          name: 'lookupTable',
          initializer: writer => {
            writer.writeLine('{');
            Object.entries(this.descriptor.lookupTable).forEach(([name, clazz]) => {
              writer.writeLine(`${name}: ${clazz},`);
            });
            writer.write('} as const');
          },
        },
      ],
    });

    file.addTypeAlias({
      name: 'L',
      type: 'typeof lookupTable',
    });

    file.addClass({
      name: 'Container',
      isExported: true,
      isDefaultExport: false,
      properties: [
        {
          initializer: '{}',
          name: 'singletons',
          scope: Scope.Private,
          type: '{ [encodedName in keyof L]?: InstanceType<L[encodedName]> }',
        },
      ],
      methods: [
        {
          name: 'resolve',
          returnType: 'InstanceType<L[K]>',
          typeParameters: [
            {
              name: 'K',
              constraint: 'keyof L',
            },
          ],
          parameters: [
            {
              name: 'encodedName',
              type: 'K',
            },
          ],
          statements: writer => {
            writer.write('switch(encodedName)');
            writer.block(() => {
              const singletonsWithCtor = singletonOrFactoryMap.singletons
                .map(singleton => {
                  return {
                    singleton,
                    ctor: this.constructorVerifier.getCallableConstructorParams(singleton),
                  };
                })
                .reduce(
                  (acc, curr) => {
                    if (curr.ctor.length < 1) {
                      return {
                        ...acc,
                        noArgs: acc.noArgs.concat(curr.singleton),
                      };
                    }

                    return {
                      ...acc,
                      args: {
                        ...acc.args,
                        [curr.singleton]: curr.ctor,
                      },
                    };
                  },
                  {
                    noArgs: [],
                    args: {},
                  } as { noArgs: string[]; args: { [encodedName: string]: string[] } }
                );

              singletonsWithCtor.noArgs.forEach(singleton => {
                writer.writeLine(`case '${singleton}':`);
              });

              writer.withIndentationLevel(writer.getIndentationLevel() + 1, () => {
                writer.writeLine(
                  `return (this.singletons[encodedName] = this.singletons[encodedName] ?? new lookupTable[encodedName]()) as InstanceType<L[K]>;`
                );
              });

              Object.entries(singletonsWithCtor.args).forEach(([singleton, args]) => {
                writer.writeLine(`case '${singleton}':`);
                writer.withIndentationLevel(writer.getIndentationLevel() + 1, () => {
                  writer.write(
                    `return (this.singletons[encodedName] = this.singletons[encodedName] ?? new lookupTable[encodedName](this.resolve("`
                  );

                  writer.write(args.join('"), this.resolve("'));

                  writer.write(`"))) as InstanceType<L[K]>;`);
                });
              });

              writer.writeLine(`default: return new lookupTable[encodedName]() as InstanceType<L[K]>;`);
            });
          },
        },
      ],
    });

    file.addVariableStatement({
      isExported: true,
      isDefaultExport: false,
      declarationKind: VariableDeclarationKind.Const,
      declarations: [
        {
          name: 'container',
          type: 'Container',
          initializer: 'new Container()',
        },
      ],
    });

    return file.getFullText();
  }
}
