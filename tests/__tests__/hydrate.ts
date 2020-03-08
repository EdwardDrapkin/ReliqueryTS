import { containers, exported as _exported } from '../bootstrap';
import { encodeName } from "../../src/compiler/SourceFileHelper";

describe('Hydrations', () => {
  const container = containers['hydrate'];
  const exported = _exported['hydrate'];

  const a = encodeName('classes.ts', 'A');
  const b = encodeName('classes.ts', 'B');

  it('Correctly registers classes to be hydrated', () => {
    expect(container.resolve(a)).toBe((container.resolve(b) as any).a)
    expect(container.resolve(a)).toBe((exported as any).a)
    expect((container.resolve(b) as any).prototype).toBe((exported as any).b.prototype)
    expect((container.resolve(b) as any)).not.toBe((exported as any).b)
  })
});
