import { errors } from "../bootstrap";

describe('Constructor injection', () => {
  it('Circular dependencies are rejected', () => {
    expect(errors['circular-dep'].length).toBeGreaterThan(0);
    expect(errors['circular-dep'][0]).toBeInstanceOf(Error);
    expect(errors['circular-dep'][0]).toMatchObject({
      message: expect.stringMatching(/circular.ts::CircleA -> circular.ts::CircleB -> circular.ts::CircleA/)
    })
  })
})
