import { containers } from '../bootstrap';
import { encodeName } from "../../src/compiler/SourceFileHelper";



describe('Class Annotations', () => {
  const classAnnotations = containers['class-annotations'];
  const factoryUser = encodeName('index.ts', 'FactoryUser');
  const singletonUser = encodeName('index.ts', 'SingletonUser');
  const notASingleton = encodeName('renamedAnnotations.ts', 'NotASingleton');
  const aSingleton = encodeName('renamedAnnotations.ts', 'ASingleton');

  it('@Factory annotations get registered', () => {
    expect(classAnnotations.resolve(factoryUser)).toBeDefined();
  });

  it('Factory annotations do not use cached instances', () => {
    expect(classAnnotations.resolve(factoryUser)).not.toBe(
      classAnnotations.resolve(factoryUser)
    );
  });

  it('Singleton annotations get registered', () => {
    expect(classAnnotations.resolve(singletonUser)).toBeDefined();
  });

  it('Singleton annotations DO use cached instances', () => {
    expect(classAnnotations.resolve(singletonUser)).toBe(
      classAnnotations.resolve(singletonUser)
    );
  });

  it('Renamed annotations can be used as their aliases', () => {
    expect(classAnnotations.resolve(aSingleton)).toBeDefined();
    expect(classAnnotations.resolve(notASingleton)).toBeDefined();

    expect(classAnnotations.resolve(aSingleton)).toBe(
      classAnnotations.resolve(aSingleton)
    );
    expect(classAnnotations.resolve(notASingleton)).not.toBe(
      classAnnotations.resolve(notASingleton)
    );
  })
});
