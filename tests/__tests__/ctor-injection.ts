import { containers } from "../bootstrap";
import { encodeName } from "../../src/compiler/SourceFileHelper";

describe('Constructor parameters are automatically provided', () => {
  const ctorInjection = containers['constructor-injection'];
  const a = encodeName('index.ts', 'A');
  const b = encodeName('index.ts', 'B');
  const c = encodeName('index.ts', 'C');

  it('Parameters are provided and resolved according to the correct strategy', () => {
    expect(ctorInjection.resolve(a)).toBeDefined();
    expect(ctorInjection.resolve(b)).toBeDefined();
    expect(ctorInjection.resolve(c)).toBeDefined();

    const aInst1: any = ctorInjection.resolve(a);
    const aInst2: any = ctorInjection.resolve(a);
    const bInst1: any = ctorInjection.resolve(b);
    const bInst2: any = ctorInjection.resolve(b);
    const cInst1: any = ctorInjection.resolve(c);
    const cInst2: any = ctorInjection.resolve(c);

    expect(aInst1).toBe(aInst2);
    expect(bInst1).not.toBe(bInst2);
    expect(cInst1).not.toBe(cInst2);

    expect(bInst1.a).toBe(bInst2.a);
    expect(cInst1.a).toBe(bInst2.a);
    expect(cInst2.a).toBe(bInst2.a);
    expect(cInst2.b.a).toBe(cInst1.b.a);
    expect(cInst2.a).toBe(cInst1.a);
    expect(cInst2.a).toBe(bInst1.a);
    expect(cInst2.a).toBe(aInst1);
    expect(cInst2.a).toBe(aInst2);
    expect(cInst2.b.a.a).toBe('a');
  })
});
