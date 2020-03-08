/// <reference path="../../../../index.d.ts" />
import { Singleton } from 'reliquery';
import { GrandChild } from "./grandchild";
import { GrandNephew } from "./grandnephew";
import { Child } from "./nested/child";
import { Parent } from "./parent";

export interface Everything extends Child, Parent, GrandChild {

}

export class Base implements GrandNephew {

}

@Singleton
export class Test extends Base implements GrandChild {

}
