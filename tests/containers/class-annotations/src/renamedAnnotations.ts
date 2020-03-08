/// <reference path="../../../../index.d.ts" />
import { Factory as Singleton, Singleton as Factory } from 'reliquery';

@Singleton
export class NotASingleton {}

@Factory
export class ASingleton {}
