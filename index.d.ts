declare module "reliquery" {
  export function Factory<T extends { new(...args: any[]): any }>(t: T): T;
  export function Singleton<T extends { new(...args: any[]): any }>(t: T): T;
  export function hydrate<T>(): T;
}
