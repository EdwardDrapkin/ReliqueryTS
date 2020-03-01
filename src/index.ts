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
import { writeFileSync } from 'fs';
import path from 'path';
import { IncrementalLog } from './incremental/IncrementalLog';

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

export default function transform(program: Program) {

  const project = new Project({
    compilerOptions: program.getCompilerOptions(),
    useInMemoryFileSystem: true,
  });
  const cachePath = path.resolve(
    path.dirname(project.getCompilerOptions().tsBuildInfoFile || project.getCompilerOptions().baseUrl || '.'),
    '.reliqueryinfo'
  );
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

        return chainHelpers(
          sourceFile,
          {
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
            helper: [singletonClassCollector, injectedClassCollector, factoryClassCollector],
            after: () => {
              singletonClassCollector.collectedClasses.forEach(exportedClass =>
                incrementalLog.register({...exportedClass.fullyQualifiedName, isSingleton: true})
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
            after: () => {
              constructorVerifier.graph = graph = incrementalLog.generateGraph();

              const writer = new ContainerWriter(
                graph.toContainerDescriptor().descriptor,
                project,
                constructorVerifier
              );

              project
                .createSourceFile('container.ts', writer.write(), { overwrite: true })
                .organizeImports()
                .getEmitOutput()
                .getOutputFiles()
                .forEach(outputFile => {
                  writeFileSync(outputFile.getFilePath(), outputFile.getText());
                });
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
