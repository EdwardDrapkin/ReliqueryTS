import { Project } from 'ts-morph';
import { ConstructorVerifier } from './ConstructorVerifier';
import { ObjectLiteralDeclaration } from '../SourceWriter/ObjectLiteralDeclaration';
import { TypescriptFile } from '../SourceWriter/TypescriptFile';
import { ClassProperty } from '../SourceWriter/classes/ClassProperty';
import { ClassMethod } from '../SourceWriter/classes/ClassMethod';
import { Clazz } from '../SourceWriter/classes/Clazz';
import { AssignmentExpression } from '../SourceWriter/AssignmentExpression';
import { TypeAlias } from '../SourceWriter/types/TypeAlias';
import { NamedImportStatement } from '../SourceWriter/imports/NamedImportStatement';
import { NamedImport } from '../SourceWriter/imports/NamedImport';
import { TypeParameter } from '../SourceWriter/types/TypeParameter';
import { TypedVariable } from '../SourceWriter/types/TypedVariable';
import { encodeName } from '../compiler/SourceFileHelper';
import { InstantiationStatement } from '../SourceWriter/classes/InstantiationStatement';
import { NullishCoalescingOperator } from '../SourceWriter/control/NullishCoalescingOperator';
import { Statement } from '../SourceWriter/Statement';
import { SwitchCase } from "../SourceWriter/control/SwitchCase";
import { ReturnStatement } from "../SourceWriter/control/ReturnStatement";
import { VariableAssignmentStatement } from "../SourceWriter/VariableAssignmentStatement";
import { ThrowStatement } from "../SourceWriter/control/ThrowStatement";
import { ParentheticalStatement } from "../SourceWriter/ParentheticalStatement";
import { ObjectLiteral } from "../SourceWriter/ObjectLiteral";

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
    const file = new TypescriptFile();
    Object.entries(this.descriptor.importNameMap).forEach(([moduleName, symbolMap]) => {
      Object.entries(symbolMap).forEach(([name, alias]) => {
        file.add(new NamedImportStatement(`./${moduleName}`, new NamedImport(name).setAlias(alias)));
      });
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
            new AssignmentExpression().setRightHandSide(
              new ObjectLiteral()
                .addMembers(
                  Object.entries(this.descriptor.lookupTable)
                    .map(([key, value]) => [key, `typeof ${value}`])
                ).getAsString()
            )
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
                const switchStatement = new SwitchCase('encodedName')
                  .setDefault([
                    new ThrowStatement(
                      new InstantiationStatement('Error')
                        .addParameter('`Could not resolve ${encodedName}!`')
                      )
                  ])
                Object.entries(this.descriptor.resolutions)
                  .reduce((acc, curr) => {
                    let found: number|false = false;
                    acc.forEach(([, resolution], idx) => {
                      if(
                        resolution.name === curr[1].name &&
                        resolution.isSingleton === curr[1].isSingleton &&
                        resolution.importPath === curr[1].importPath
                      ) {
                        found = idx;
                      }
                    })

                    // noinspection PointlessBooleanExpressionJS
                    if(found === false) {
                      acc.push([[curr[0]], curr[1]]);
                    } else {
                      acc[found][0].push(curr[0]);
                    }

                    return acc;
                  }, ([] as [string[], Resolution][]))
                  .forEach(([name, resolution]) => {
                    const ctor = this.constructorVerifier.getCallableConstructorParams(encodeName(resolution.importPath, resolution.name));
                    let statement: Statement =
                      new InstantiationStatement(`lookupTable["${encodeName(resolution.importPath, resolution.name)}"]`)
                        .castAs('InstanceType<L[K]>')
                        .addParameters(ctor.map(a => `this.resolve("${a}")`))

                    if(resolution.isSingleton) {
                      statement = new ParentheticalStatement()
                        .setStatement(
                          new AssignmentExpression()
                            .setLeftHandSide(`this.singletons["${encodeName(resolution.importPath, resolution.name)}"]`)
                            .setRightHandSide(
                              new NullishCoalescingOperator()
                                .setLeftHandSide(`this.singletons["${encodeName(resolution.importPath, resolution.name)}"]`)
                                .setRightHandSide(statement.getAsString())
                                .getAsString()
                            )
                            .getAsString()
                        ).castAs('InstanceType<L[K]>')
                    }

                    switchStatement.addCase(
                      name.map(n => `"${n}"`),
                      new ReturnStatement(statement)
                    );
                  });

                return switchStatement;
              })
          )
      )
      .add(
        new VariableAssignmentStatement(
          new TypedVariable('container').setType('Container')
        )
          .setExported()
          .setInitializer(new InstantiationStatement('Container'))

      )
      .getAsString();
  }
}
