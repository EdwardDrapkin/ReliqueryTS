# 👑🔮 Reliquery 🔮👑

**Note: this is HIGHLY experimental software.  Basically nothing can be considered stable.**

Reliquery is a configuration free, nominally typed, code generating DI container implemented as a Typescript transformer.  The container should work predictably, incur no run-time overhead, and generally never need to be interacted with.

Reliquery works by parsing your source files, collecting entities that are tagged as injectable, traversing their type hierarchies, and registering those entities as resolutions for their entire type hierarchy.  This means, unlike most TS DI solutions, if you have an interface hierarchy such as `A > B > C > D > E > F` and a class `MyClass` that implements `F`, you can ask for any of those interfaces (or parent classes, or interfaces parent classes implement, and so on).

Once the injectable entities have been collected, a static singleton is generated that simply maps fully qualified names (a safe representation of original source path and exported symbol name, due to JS/TS having frequent name collisions) to either singletons or factory methods.

Finally, Reliquery rewrites the emitted JS at injection sites.  A class constructor such as `constructor(foo: MyFoo) {}` will get invoked in the container as `new FooUser(container.get('unique_string_of_MyFoo'))`.  When you retrieve things from the container (via `const myFoo = hydrate<MyFoo>()`), that code is simply rewritten to the correct `container.get()` call.  Modern JS runtimes should inline everything the container does, so the runtime overhead of Reliquery should be immeasurably small.  
