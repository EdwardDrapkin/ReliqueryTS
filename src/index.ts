import { Node, Program, SourceFile, TransformationContext } from 'typescript';
import { SourceFileHelper } from './util/SourceFileHelper';
import { InterfaceCollector } from './util/InterfaceCollector';
import { AllClassCollector } from './util/AllClassCollector';
import { RelicClassCollector } from './util/RelicClassCollector';
import { ResolutionGraph } from './container/ResolutionGraph';
import { Logger } from './logger';
import { InjectedClassCollector } from './util/InjectedClassCollector';
import { FactoryClassCollector } from './util/FactoryClassCollector';
import { ConstructorCollector } from './util/ConstructorCollector';
import { ConstructorVerifier } from './container/ConstructorVerifier';
import { Project } from 'ts-morph';
import { ContainerWriter } from './container/ContainerDescriptor';

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
  const graph: ResolutionGraph = new ResolutionGraph();
  const constructorVerifier = new ConstructorVerifier({}, graph);
  const project = new Project({
    compilerOptions: program.getCompilerOptions(),
  });

  return {
    before(context: TransformationContext) {
      return (sourceFile: SourceFile) => {
        const allClassCollector = new AllClassCollector(sourceFile, context);
        const singletonClassCollector = new RelicClassCollector(sourceFile, context);
        const interfaceCollector = new InterfaceCollector(sourceFile, context);
        const injectedClassCollector = new InjectedClassCollector(sourceFile, context);
        const factoryClassCollector = new FactoryClassCollector(sourceFile, context);
        const constructorCollector = new ConstructorCollector(sourceFile, context);

        return chainHelpers(
          sourceFile,
          {
            helper: [interfaceCollector, allClassCollector, constructorCollector],
            after: () => {
              graph.addClasses(allClassCollector.collectedClasses);
              graph.addInterfaces(interfaceCollector.exportedInterfaces);
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
                graph.registerClass({ ...exportedClass.fullyQualifiedName, isSingleton: true })
              );

              injectedClassCollector.collectedClasses.forEach(injectedClass =>
                graph.registerClass({ ...injectedClass.fullyQualifiedName, isSingleton: true })
              );

              factoryClassCollector.collectedClasses.forEach(classForFactory =>
                graph.registerClass(classForFactory.fullyQualifiedName)
              );
            },
          },
          {
            after: () => {
              const writer = new ContainerWriter(
                graph.toContainerDescriptor().descriptor,
                project,
                constructorVerifier
              );
              console.log(writer.write());
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
