import { containers } from '../bootstrap';
import { encodeName } from '../../src/compiler/SourceFileHelper';

describe('Resolvable complex types are supported', () => {
  const complex = containers['complex-types'];
  const a = encodeName('index.ts', 'A');
  const b = encodeName('index.ts', 'B');
  const c = encodeName('index.ts', 'C');

  it('Union types are supported with basic logic (A|B tries to resolve A, falling back to B))', () => {
    expect(complex.resolve(a)).toBeNull();
    expect(complex.resolve(b)).toBeDefined();
    expect(complex.resolve(c)).toBeDefined();
    expect((complex.resolve(c) as any).a).toBeDefined();
    expect((complex.resolve(c) as any).a).toEqual(complex.resolve(b));
  });
});
