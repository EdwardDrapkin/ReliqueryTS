import { Node, Program, SourceFile, TransformationContext } from 'typescript';
import { SourceFileHelper } from './compiler/SourceFileHelper';
import { InterfaceCollector } from './compiler/InterfaceCollector';
import { AllClassCollector } from './compiler/AllClassCollector';
import { RelicClassCollector } from './compiler/RelicClassCollector';
import { Logger } from './logger';
import { InjectedClassCollector } from './compiler/InjectedClassCollector';
import { FactoryClassCollector } from './compiler/FactoryClassCollector';
import { ConstructorCollector } from './compiler/ConstructorCollector';
import { ConstructorVerifier } from './container/ConstructorVerifier';
import { Project } from 'ts-morph';
import { ContainerWriter } from './container/ContainerDescriptor';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import path from 'path';
import { IncrementalLog } from './incremental/IncrementalLog';
import { HydrateCallRewriter } from './compiler/HydrateCallRewriter';
import { ReliqueryImportsRemover } from "./compiler/ReliqueryImportsRemover";

interface HelperListItem {
  helper?: SourceFileHelper<Node>[] | SourceFileHelper<Node>;
  before?: () => void;
  after?: () => void;
}

export function chainHelpers(node: SourceFile, ...helpers: HelperListItem[]) {
  for (const item of helpers) {
    item.before?.();

    if (Array.isArray(item.helper)) {
      item.helper?.forEach(helper => {
        Logger.info('Parsing file %s with %s', node.fileName, helper.constructor.name);
        node = helper.visit(node) ?? node;
      });
    } else if (item.helper) {
      Logger.info('Parsing file %s with %s', node.fileName, item.helper.constructor.name);
      node = item.helper?.visit(node) ?? node;
    }

    item.after?.();
  }

  return node;
}

export function transformWithOptions(
  program: Program,
  project: Project,
  writeFiles: boolean = true,
  cachePath: string = path.resolve(
    path.dirname(project.getCompilerOptions().tsBuildInfoFile || project.getCompilerOptions().baseUrl || '.'),
    '.reliqueryinfo'
  ),
) {
  const incrementalLog = IncrementalLog.readFromFile(cachePath);
  let graph = incrementalLog.generateGraph();
  const constructorVerifier = new ConstructorVerifier({}, graph);

  return {
    before(context: TransformationContext) {
      return (sourceFile: SourceFile) => {
        if (sourceFile.fileName.endsWith('container.ts')) {
          return sourceFile;
        }

        const allClassCollector = new AllClassCollector(sourceFile, context);
        const interfaceCollector = new InterfaceCollector(sourceFile, context);

        const singletonClassCollector = new RelicClassCollector(sourceFile, context);
        const injectedClassCollector = new InjectedClassCollector(sourceFile, context);
        const factoryClassCollector = new FactoryClassCollector(sourceFile, context);
        const constructorCollector = new ConstructorCollector(sourceFile, context);

        const hydrateCallRewriter = new HydrateCallRewriter(sourceFile, context);
        const reliqueryImportsRemover = new ReliqueryImportsRemover(sourceFile, context);

        return chainHelpers(
          sourceFile,
          {
            // collect everything we *might* care about
            helper: [interfaceCollector, allClassCollector, constructorCollector],
            after: () => {
              incrementalLog.collectClasses(sourceFile.fileName, allClassCollector.collectedClasses);
              incrementalLog.collectInterfaces(sourceFile.fileName, interfaceCollector.exportedInterfaces);
              incrementalLog.collectCtors(sourceFile.fileName, constructorCollector.collectedConstructors);

              constructorVerifier.addConstructors(constructorCollector.collectedConstructors);
            },
          },
          {
            after: () => {},
          },
          {
            // collect everything registered with the container
            helper: [singletonClassCollector, injectedClassCollector, factoryClassCollector],
            after: () => {
              singletonClassCollector.collectedClasses.forEach(exportedClass =>
                incrementalLog.register({ ...exportedClass.fullyQualifiedName, isSingleton: true })
              );

              injectedClassCollector.collectedClasses.forEach(injectedClass =>
                incrementalLog.register({ ...injectedClass.fullyQualifiedName, isSingleton: true })
              );

              factoryClassCollector.collectedClasses.forEach(classForFactory =>
                incrementalLog.register(classForFactory.fullyQualifiedName)
              );
            },
          },
          {
            // rewrite any injection sites (veins?)
            helper: [hydrateCallRewriter, reliqueryImportsRemover],
            after: () => {},
          },
          {
            // finally construct the graph
            after: () => {
              const maybeErrors = constructorVerifier.getHumanReadableVerificationErrors();

              if(maybeErrors.length > 0) {
                throw new Error(maybeErrors.join('\n'))
              }
              constructorVerifier.graph = graph = incrementalLog.generateGraph();

              const writer = new ContainerWriter(
                graph.toContainerDescriptor().descriptor,
                project,
                constructorVerifier
              );

              const createdFile = project
                .createSourceFile('container.ts', writer.write(), { overwrite: true })
                .organizeImports();

              if (writeFiles) {
                createdFile
                  .getEmitOutput()
                  .getOutputFiles()
                  .forEach(outputFile => {
                    if (!existsSync(path.dirname(outputFile.getFilePath()))) {
                      mkdirSync(path.dirname(outputFile.getFilePath()));
                    }
                    writeFileSync(outputFile.getFilePath(), outputFile.getText());
                  });
              }
            },
          },
          {
            after() {
              incrementalLog.writeToFile(cachePath);
            },
          }
        );
      };
    },

    afterDeclarations(context: TransformationContext) {
      return (sourceFile: SourceFile) => {
        return sourceFile;
      };
    },
  };
}

export default function transform(program: Program) {
  const project = new Project({
    compilerOptions: program.getCompilerOptions(),
    useInMemoryFileSystem: true,
  });

  return transformWithOptions(program, project);
}
