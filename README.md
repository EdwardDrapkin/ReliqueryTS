# 👑🔮 Reliquery 🔮👑

**Note: this is HIGHLY experimental software.  Basically nothing can be considered stable.**

Reliquery is a configuration-free code-generating IoC compiler.  It uses decorators to tag entities, then generates a static container based on those decorators.  This approach means you don't have to write configuration files or mapping files, don't lose any type safety, and incur almost no runtime overhead.  It does require a separate code generation step, however, because nothing is perfect.

## Usage


### Annotations

There are two annotations that are currently supported: `@Relic` and `@AutoConstructed`.  

`@Relic` tags a class or function as injectable and makes it available on its own name and interfaces it implements (and that interface's hierarchy).  Because TS does not support function decorators, you have to declare a function like so to add it to the container (looking for suggestions on ways to improve this):

```ts
const Foo = Relic(function Foo() { });
```

`@AutoConstructed` registers a class to be automatically constructed by the container.  It will get added to the container resolutions (e.g. `@AutoConstructed class Foo {}` will be available as `getFoo()`) as a no-arg factory function.  Constructor arguments are automatically resolved (*without decorators*) and filled in by the container.

### CLI 

Usage right now is fairly limited.

Recommended usage (for now) is with babel-node.

```bash
git checkout <this repo>
yarn babel-node src/cli.ts -t /path/to/tsconfig.json
```

Once you've annotated some code, you can run the script against your code and expect output that looks like this (example is generated from `src/fixtures`):

```ts
import { curriedWithArgs, Basic, InjectedExample, noArgs, withArgs, A, D, C, F } from 'fixtures/Basic';
import { B } from 'fixtures/B';

export class Container {
    static readonly factories = {
        "noArgs": (): typeof noArgs => noArgs,
        "withArgs": (): typeof withArgs => withArgs,
        "curriedWithArgs": (): typeof curriedWithArgs => curriedWithArgs,
        "Basic": (): Basic => new Basic(),
        "InjectedExample": (): InjectedExample => new InjectedExample(Container.resolutions["Basic"](), Container.resolutions["B"]()),
    };
    static readonly curried = {
        "curriedWithArgs": () => curriedWithArgs(Container.resolutions["A"](), Container.resolutions["B"]()),
    };
    static readonly resolutions = {
        "A": (): A => Container.factories["Basic"](),
        "D": (): D => Container.factories["Basic"](),
        "C": (): C => Container.factories["Basic"](),
        "B": (): B => Container.factories["Basic"](),
        "Basic": (): Basic => Container.factories["Basic"](),
        "typeof noArgs": (): typeof noArgs => Container.factories["noArgs"](),
        "F": (): F => Container.factories["noArgs"](),
        "typeof withArgs": (): typeof withArgs => Container.factories["withArgs"](),
        "typeof curriedWithArgs": (): typeof curriedWithArgs => Container.factories["curriedWithArgs"](),
    };
    static getA(): A {
        return Container.resolutions["A"]();
    }
    static getD(): D {
        return Container.resolutions["D"]();
    }
    static getC(): C {
        return Container.resolutions["C"]();
    }
    static getB(): B {
        return Container.resolutions["B"]();
    }
    static getBasic(): Basic {
        return Container.resolutions["Basic"]();
    }
    static getNoArgs(): typeof noArgs {
        return Container.resolutions["typeof noArgs"]();
    }
    static getF(): F {
        return Container.resolutions["F"]();
    }
    static getWithArgs(): typeof withArgs {
        return Container.resolutions["typeof withArgs"]();
    }
    static getCurriedWithArgs(): typeof curriedWithArgs {
        return Container.resolutions["typeof curriedWithArgs"]();
    }
    static getCurriedCurriedWithArgs(): ReturnType<typeof curriedWithArgs> {
        return Container.curried["curriedWithArgs"]();
    }
}

```

## Limitations

Far too many to list right now.

Don't use this.  Seriously, don't.

## Roadmap

- [X] `@Relic` for classes
- [X] `@Relic` for functions
- [X] `@AutoConstructed` for automatic zero-arg factory generation
- [X] `Container` class generation
- [ ] `@Provided` for class property injection
- [X] `@AutoCurried` for auto-currying functions similar to constructor arguments
- [ ] Add `InstantiationType` to `@Relic` for singletons, etc.
- [ ] Support for generating async import statements
- [ ] Babel plugin? 
- [ ] TS compiler plugin?
- [ ] Mocking system (open for suggestions here) 
- [ ] Better dependency resolution
    - [ ] Qualifications - runtime? compile time?
    - [ ] Discover and handle circular dependencies
    - [ ] **Allow multiple registrations of the same interface (must be requested as an array)**
- [ ] Customizable code generation
    - [ ] Custom annotations that allow semantic registration (e.g. `@Service` as an alias for `@Relic`)
    - [ ] Custom annotations that allow custom code generation (e.g. `@Service` can have custom initializers)
    - [ ] Allow type factories
- [ ] Plugin system
    - [ ] Make calls to 3rd party plugins during code generation lifecycle
    - [ ] Automatically register plugins (maintain zero configuration!)
