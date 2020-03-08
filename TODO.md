## Released

Nothing yet :'(

## Planned

#### 0.1.0 - bare minimum for viability
* [X] ts transformer implementation
* [X] `@Singleton` and `@Factory` class resolutions
* [X] interface hierarchy resolutions
* [X] constructor injection
* [X] circular dependency checking
* [X] hydrate<T>() entry point
* [X] tests
* [ ] `@Qualify<Interface>` to resolve multiple dependencies with an interface 
* [ ] `@Qualify(...types: QualificationType[ ])` where QualificationType is an enum of `Singleton`, `Factory`, `Function`, `Class`, etc.
* [ ] automatic typeof registration injection `hydrate<typeof Foo>()` automatically fully qualifies Foo, registers it, and then replaces the callsite with a resolution

#### 0.2.0 - nice to have features required to be competitive (features that don't need further design, just implementation)
* [ ] `curry<T extends fn, ...args>()` function to curry injected funcs (e.g. `curry<(f: Foo, c: Cat, b: Bar) => void, Foo, Bar>()` creates a `(c: Cat) => void`)
* [ ] `@Configuration(name)` for configuration injection (e.g. `@Configuration("google.analytics.enabled")` will search for process.env.GOOGLE_ANALYTICS_ENABLED, .env file, config files, etc.
* [ ] Inspect requested type and automatically construct arrays when requested *must not require a special annotation*
* [ ] class property injection
* [ ] Stack trace rewriting to hide generated code

#### 0.3.0 - feature completion (potential features that require debate, further planning and design discussion)
* [ ] injection tagging system (what problems does this solve that empty, tagged interfaces don't?)
* [ ] `@Provides` for factory functions (does this require explicitly defined return types?)
* [ ] events (e.g. `on('resolve', (key: string, type: unknown) => { ... })`)
* [ ] `@TestFactory` and `@TestSingleton` (or container polymorphism)
* [ ] `@Primary` (specifies a default for multiple resolutions, lower priority than @Qualify)
* [ ] Intersection/union type handling (SO MANY QUESTIONS)
* [ ] Code injection before/after resolution sites (Is this even possible without making the container an entire AOP extension to the language? Is this even a good idea?)
* [ ] Can Proxy classes be used to implement lazy resolution?  Can this properly solve circular dependency problems?  Does it require a separate annotation or can it be globally opted into?
* [ ] Async import support (as promises, as top level await)

#### 0.4.0 - technical debt / bugfix / perfomance / stability release (aka it's Done)
* [ ] Just works for normal cases with no configuration 
* [ ] Any configuration exists entirely in package.json (or json in reliquery.json)
* [ ] Logging is of good quality and debugging information can be generated
* [ ] Test cases exist and pass for all supported features 
* [ ] Check (TC39 Proposal)[https://github.com/tc39/proposal-decorators] for naming collisions

#### 0.5.0 - integrations release, final release before stable
These are potential integrations, will need to re-evaluate when this point is reached.
* [ ] express: automatically register compatible container items as middleware and etc.
* [ ] react/vue: taking suggestions for features

#### 1.0 - stable
* [ ] website
