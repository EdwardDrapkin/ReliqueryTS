import { A, Basic, C, D, F, InjectedExample, noArgs, withArgs } from 'fixtures/Basic';
import { B } from 'fixtures/B';

export class Container {
    static readonly factories = {
        "noArgs": (): typeof noArgs => noArgs,
        "withArgs": (): typeof withArgs => withArgs,
        "Basic": (): Basic => new Basic(),
        "InjectedExample": (): InjectedExample => new InjectedExample(Container.resolutions["Basic"](), Container.resolutions["B"]()),
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
        "InjectedExample": (): InjectedExample => Container.factories["InjectedExample"](),
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

    static getInjectedExample(): InjectedExample {
        return Container.resolutions["InjectedExample"]();
    }
}
