import { Factory } from "../decorators";

@Factory
export class Circle2 {
  public constructor() {
  }
}

export interface ICircle {

}


@Factory
export class Circle3 implements ICircle {
  constructor(circle: Circle2) {}
}
