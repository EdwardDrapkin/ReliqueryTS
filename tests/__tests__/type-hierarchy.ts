import { containers } from "../bootstrap";
import { encodeName } from "../../src/compiler/SourceFileHelper";

describe('Constructor parameters are automatically provided', () => {
  const ctorInjection = containers['type-hierarchy'];
  const parent = encodeName('parent.ts', 'Parent');
  const child = encodeName('nested/child.ts', 'Child');
  const grandchild = encodeName('grandchild.ts', 'GrandChild');
  const brother = encodeName('nested/brother.ts', 'Brother');
  const nephew = encodeName('nephew.ts', 'Nephew');
  const grandnephew = encodeName('grandnephew.ts', 'GrandNephew');
  const base = encodeName('index.ts', 'Base');
  const test = encodeName('index.ts', 'Test');

  it('Resolves the same class according to its type hierarchy', () => {
    const compare = (a: string, b: string) => {
      expect(ctorInjection.resolve(a)).toBe(ctorInjection.resolve(b));
    }

    const keys = [parent, child, grandchild, brother, nephew, grandnephew, base, test];

    for(let i = 0; i < keys.length; i++) {
      for(let n = 0; n < keys.length; n++) {
        compare(keys[i], keys[n]);
      }
    }
  })
});
