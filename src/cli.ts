import Project, { ts } from "ts-morph";
import commander from 'commander';
import * as npmPackage from '../package.json';
import path from 'path';
import { baseLogger } from "utils/Log";
import Table from 'cli-table';
import { CodeWriter } from "CodeWriter/CodeWriter";
import { ExportWalkResults, SourceFileExportWalker } from "TreeWalker/SourceFileExportWalker";
import { InjectableClassificationExtractor } from "TreeWalker/InjectableClassificationExtractor";

const log = baseLogger.extend('cli')

log('Starting reliquery CLI, parsing options');

commander
    .version(npmPackage.version)
    .option('-t, --tsconfig [tsconfig path]', 'path to tsconfig.json', './tsconfig.json')
    .option('-s, --skip [skip regex]', 'Regex for skipping files from inspection', '__tests__')
    .option('-x, --ext [extensions]', 'File extensions to parse', val => val.split(','), ['ts', 'tsx'])
    .parse(process.argv);

const tsConfigFilePath = path.resolve(process.cwd(), commander.tsconfig);

const project = new Project({
    tsConfigFilePath,
    addFilesFromTsConfig: true,
});

log(`Starting Reliquery source file parse step for project at ${tsConfigFilePath}`);
const results: ExportWalkResults[] = project
    .getSourceFiles()
    .map(file => new SourceFileExportWalker(file, commander.skip, commander.ext).walk());
log(`Finished Reliquery source file parse step for project at ${tsConfigFilePath}`);

log(`Starting Reliquery lexical analysis step for project at ${tsConfigFilePath}`);
const extractor = new InjectableClassificationExtractor(...results);
const extraction = extractor.extract();

log(`Finished Reliquery lexical analysis step for project at ${tsConfigFilePath}`);
log(`Starting reporting step for project at ${tsConfigFilePath}`);


const classTable = new Table({
    head: ['Class', 'Injectable', 'Constructor Signature', 'File location']
});

const functionTable = new Table({
    head: ['Function', 'Curried', 'Call Signature', 'Return Type', 'File Location']
});

const resolutionTable = new Table({
    head: ['Abstract Type', 'Injected Concrete Type']
})

const newCodeWriter = new CodeWriter();
const injectableCache: { [key: string]: string[] } = {};
const ensureCache = (key: string) => {
    if (!injectableCache[key]) injectableCache[key] = []
};

Object.keys(extraction.classDeclarations).forEach(name => {
    const declaration = extraction.classDeclarations[name];
    newCodeWriter.registerClassInjectableClassification(declaration.decl, declaration.injectable);
    classTable.push([
        name,
        declaration.injectable,
        declaration.decl.parameters.map(param => `${param.name}:${param.type.name}`).join(', '),
        declaration.decl.filePath
    ])
});

Object.keys(extraction.functionDeclarations).forEach(name => {
    const declaration = extraction.functionDeclarations[name];
    newCodeWriter.registerFunctionInjectableClassification(declaration.decl, declaration.curried);
    functionTable.push([
        name,
        declaration.curried,
        declaration.decl.parameters.map(param => `${param.name}:${param.type.name}`).join(', '),
        declaration.decl.returnType.name,
        declaration.decl.filePath
    ])
});

Object.keys(newCodeWriter.resolutions).forEach(name => {
    ensureCache(name);
    resolutionTable.push([name, newCodeWriter.resolutions[name].factory])
});

console.log('===== Reliquery Injectable Relic Summary =====');
console.log(classTable.toString());
console.log(functionTable.toString());
console.log(resolutionTable.toString());
console.log(newCodeWriter.write(project, tsConfigFilePath));
