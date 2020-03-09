# 👑🔮 Reliquery 🔮👑

**Note: this is HIGHLY experimental software.  Basically nothing can be considered stable.**

Reliquery is a configuration free, nominally typed, code generating DI container implemented as a Typescript transformer.  The container should work predictably, incur no run-time overhead, and generally never need to be interacted with.  Astute readers will note that this violates many of the fundamental design principles of TS in that it couples your code to its types, generated code changes based on type information, and code using Reliquery can not be considered as existing in a superset of JS.  Proceed at your own risk.

Reliquery works by parsing your source files, collecting entities that are tagged as injectable, traversing their type hierarchies, and registering those entities as resolutions for their entire type hierarchy.  This means, unlike most TS DI solutions, if you have an interface hierarchy such as `A > B > C > D > E > F` and a class `MyClass` that implements `F`, you can ask for any of those interfaces (or parent classes, or interfaces parent classes implement, and so on).

Once the injectable entities have been collected, a static singleton is generated that simply maps fully qualified names (a safe representation of original source path and exported symbol name, due to JS/TS having frequent name collisions) to either singletons or factory methods.

Finally, Reliquery rewrites the emitted JS at injection sites.  A class constructor such as `constructor(foo: MyFoo) {}` will get invoked in the container as `new FooUser(container.get('unique_string_of_MyFoo'))`.  When you retrieve things from the container (via `const myFoo = hydrate<MyFoo>()`), that code is simply rewritten to the correct `container.get()` call.  Modern JS runtimes should inline everything the container does, so the runtime overhead of Reliquery should be immeasurably small.  

### Installation

First, install reliquery, typescript, and ttypescript:

```shell script
yarn add --dev reliquery typescript ttypescript
```

Next, add the relevant section to your `tsconfig.json`:
```json
{
  "compilerOptions": {
    "plugins": [
      {
        "transform": "reliquery"
      }
    ]
  }
}
```

That's it! You're ready to use reliquery!

*NOTE*: Reliquery requires TS 3.8+.

### Usage

##### 1. Annotate your classes
For factory classes:
```typescript
import { Factory } from 'reliquery';

@Factory
export class CreatedMultipleTimes { /* ... */ }
```

For singleton classes:
```typescript
import { Singleton } from 'reliquery';

@Singleton
export class CreatedOnce { /* ... */ }
```

Constructor parameters are automatically provided:
```typescript
import { Singleton } from 'reliquery';

@Singleton
export class WithParameters { 
  constructor(first: CreatedMultipleTimes, second: CreatedOnce) { /* ... */ }
}
```

##### 2. Access your hydrated instances

```typescript
const myInstance: WithParameters = hydrate();
```

**or**


```typescript
const myInstance = hydrate<WithParameters>();
```

##### 3. That's it! Just compile using ttsc instead of tsc and enjoy the magic!

### Advanced 

#### Advanced types
##### Union types

Union types are supported.  Given the case of `A | B | C | D`, reliquery will try to resolve A, then B, and so on, until it either finds a resolution or falls all the way through to null.

#### What code gets generated

Let's say you have the following file structure (from the `hydrate` test suite):

**classes.ts**
```typescript
import { Factory, Singleton } from 'reliquery';

@Singleton
export class A {
  type = 'a';
}

@Factory
export class B {
  type = 'b';
  constructor(public a: A) {

  }
}
```

**index.ts**
```typescript
import { hydrate } from 'reliquery';
import { A, B } from "./classes";

export const a = hydrate<A>();
export const b: B = hydrate();

```


After you compile your code through the Reliquery transformer:

1. Reliquery annotations and imports are removed 
2. A container is generated
3. Calls to `hydrate()` are replaced by calls to `container.resolve()`.

So, the `classes.js` file that gets generated looks like:
```javascript
Object.defineProperty(exports, "__esModule", { value: true });
class A {
    constructor() {
        this.type = 'a';
    }
}
exports.A = A;
class B {
    constructor(a) {
        this.a = a;
        this.type = 'b';
    }
}
exports.B = B;
```

As you can see, any trace of Reliquery is gone.

The container that gets generated is fairly straightforward, even by generated JS standards:

```javascript
'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
// import statements
const classes_1 = require('./classes');
// generated container
const lookupTable = {
  classes_ts_A: classes_1.A,
  classes_ts_B: classes_1.B,
};
class Container {
  constructor() {
    this.singletons = {};
  }
  resolve(encodedName) {
    var _a;
    switch (encodedName) {
      case 'classes_ts_A':
        return (this.singletons['classes_ts_A'] =
          (_a = this.singletons['classes_ts_A']) !== null && _a !== void 0 ? _a : new lookupTable['classes_ts_A']());
      case 'classes_ts_B':
        return new lookupTable['classes_ts_B'](this.resolve('classes_ts_A'));
      default:
        return null;
    }
  }
}
exports.Container = Container;
exports.container = new Container();
//# sourceMappingURL=container.js.map
```

Pretty simple, there's a map of safe strings to classes themselves, then a singleton cache that's not always used, and nested resolve calls. These `resolve` calls are the entirety of the runtime overhead of Reliquery and will likely get eliminated by the JIT.

And, finally, index.js shows the hydrate rewriting:
```javascript
"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const reliquery_container = __importStar(require("./container.js"));
exports.a = reliquery_container.container.resolve("classes_ts_A");
exports.b = reliquery_container.container.resolve("classes_ts_B");
//# sourceMappingURL=index.js.map
```
