import { RelicResolver } from "RelicResolver/RelicResolver";

describe("RelicResolver", () => {
    const resolver = new RelicResolver();

    test("A concrete class with no interfaces can be resolved", () => {
        resolver.register({
            filePath: "/fake/Fake.ts",
            name: "Fake",
            interfaces: []
        });

        const lookupClass = { filePath: "/fake/Fake.ts", name: "Fake" };
        expect(resolver.lookup(lookupClass)).toEqual(lookupClass);
        expect(resolver.serialize()).toMatchSnapshot();
    });

    test("A concrete class with one flat interface can be resolved", () => {
        resolver.register({
            filePath: "/fake/Fake2.ts",
            name: "Fake2",
            interfaces: [{
                implemented: {
                    name: "FakeInterface",
                    filePath: "/fake/FakeInterface.ts"
                },
                parents: []
            }]
        });

        const lookupClass = { filePath: "/fake/Fake2.ts", name: "Fake2" };
        expect(resolver.lookup(lookupClass)).toEqual(lookupClass);
        expect(resolver.serialize()).toMatchSnapshot();
    });

    test("A concrete class with multiple hierarchical interfaces can be resolved", () => {
        const classification = {
            filePath: "/fake/Fake3.ts",
            name: "Fake3",
            interfaces: [
                {
                    implemented: {
                        name: "FakeInterface2",
                        filePath: "/fake/FakeInterface2.ts"
                    },
                    parents: [{
                        name: "FakeInterface2Parent",
                        filePath: "/fake/FakeInterface2Parent.ts"
                    }, {
                        name: "FakeInterface2GrandParent",
                        filePath: "/fake/FakeInterface2GrandParent.ts"
                    }, {
                        name: "FakeInterface2GreatGrandParent",
                        filePath: "/fake/FakeInterface2GreatGrandParent.ts"
                    }]
                },
                {
                    implemented: {
                        name: "FakeInterface2a",
                        filePath: "/fake/FakeInterface2a.ts"
                    },
                    parents: [{
                        name: "FakeInterface2aParent",
                        filePath: "/fake/FakeInterface2aParent.ts"
                    }, {
                        name: "FakeInterface2aGrandParent",
                        filePath: "/fake/FakeInterface2aGrandParent.ts"
                    }, {
                        name: "FakeInterface2aGreatGrandParent",
                        filePath: "/fake/FakeInterface2aGreatGrandParent.ts"
                    }]
                },
                {
                    implemented: {
                        name: "FakeInterface2b",
                        filePath: "/fake/FakeInterface2b.ts"
                    },
                    parents: [{
                        name: "FakeInterface2bParent",
                        filePath: "/fake/FakeInterface2bParent.ts"
                    }, {
                        name: "FakeInterface2bGrandParent",
                        filePath: "/fake/FakeInterface2bGrandParent.ts"
                    }, {
                        name: "FakeInterface2bGreatGrandParent",
                        filePath: "/fake/FakeInterface2bGreatGrandParent.ts"
                    }]
                }]
        };

        resolver.register(classification);

        const lookupClass = { filePath: "/fake/Fake3.ts", name: "Fake3" };
        expect(resolver.lookup(lookupClass)).toEqual(lookupClass);

        classification.interfaces.forEach(item => {
            expect(resolver.lookup(item.implemented)).toEqual(lookupClass);
            item.parents.forEach(parent => {
                expect(resolver.lookup(parent)).toEqual(lookupClass)
            });
        });
        console.log(resolver.serialize());
        expect(resolver.serialize()).toMatchSnapshot();
    });
});
