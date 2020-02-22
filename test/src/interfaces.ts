export interface IA {

}
export interface IB extends IA {

}

export interface Parent {

}

export interface Child extends Parent, IB {

}

export interface Incest extends Parent, Child {

}
