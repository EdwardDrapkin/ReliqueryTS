import { transformWithOptions } from '../src/index';
import * as ts from 'typescript';
import { getPreEmitDiagnostics, ModuleKind, ScriptTarget } from 'typescript';
import { existsSync, readdirSync } from 'fs';
import * as path from 'path';
import { Project } from 'ts-morph';

const containers: {
  [testSuite: string]: {
    resolve(name: string): unknown;
  }
} = {};

const errors: {
  [testSuite: string]: unknown[];
} = {};

const exported: {
  [testSuite: string]: unknown
} = {};

readdirSync(path.resolve(__dirname, 'containers'), { withFileTypes: true })
  .filter(dirent => dirent.isDirectory())
  .map(dirent => dirent.name)
  .forEach(testSuiteName => {
    const testSuite = path.resolve(__dirname, 'containers', testSuiteName)
    const program = ts.createProgram({
      rootNames: readdirSync(path.resolve(testSuite, 'src'), { withFileTypes: true })
        .filter(entry => entry.isFile() && entry.name && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')))
        .map(entry => path.resolve(testSuite, 'src', entry.name)),
      options: {
        experimentalDecorators: true,
        outDir: path.resolve(testSuite, './dist/'),
        baseUrl: path.resolve(testSuite, './src/'),
        target: ScriptTarget.ES2015,
        resolveJsonModule: true,
        module: ModuleKind.CommonJS,
        sourceMap: true,
        noUnusedLocals: true,
        forceConsistentCasingInFileNames: true,
        noImplicitThis: true,
        noImplicitAny: true,
        strictNullChecks: true,
        declaration: true,
        declarationMap: true,
        allowSyntheticDefaultImports: true,
        strict: true,
        esModuleInterop: true,
        paths: {
          '*': ['./*'],
        },
      },
    });

    const project = new Project({
      compilerOptions: program.getCompilerOptions(),
      useInMemoryFileSystem: true,
    });

    const transformer = transformWithOptions(program, project, true);
    errors[testSuiteName] = ([] as any[]).concat(getPreEmitDiagnostics(program));

    try {
      program.emit(
        undefined,
        undefined,
        undefined,
        undefined,
        {
          before: [transformer.before],
        }
      );
    } catch(e) {
      errors[testSuiteName].push(e);
    }

    errors[testSuiteName].push(...program.getDeclarationDiagnostics());
    errors[testSuiteName].push(...program.getGlobalDiagnostics())
    errors[testSuiteName].push(...program.getOptionsDiagnostics())
    errors[testSuiteName].push(...program.getSemanticDiagnostics())
    errors[testSuiteName].push(...program.getSemanticDiagnostics())
    errors[testSuiteName].push(...program.getConfigFileParsingDiagnostics())

    if (existsSync(path.resolve(testSuite, 'dist', 'container.js'))) {
      containers[testSuiteName] = require(path.resolve(testSuite, 'dist', 'container.js')).container as {
        resolve(name: string): unknown;
      };
    }

    if(existsSync(path.resolve(testSuite, 'dist', 'index.js'))) {
      exported[testSuiteName] = require(path.resolve(testSuite, 'dist', 'index.js'));
    }

  });

export { containers, errors, exported };
