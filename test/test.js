/* global
    describe it beforeEach afterEach expect
*/
import { Optimizer, Optimization, SimpleOptimization } from '../Optimizer.js';

class DummyOptimization extends SimpleOptimization {

    constructor(calls) {

        super();
        this._maxCount = calls;
        this._count = calls;

    }

    canDecreaseWork() { return this._count > 0; }
    canIncreaseWork() { return this._count < this._maxCount; }

    decreaseWork() { this._count--; }
    increaseWork() { this._count++; }

}

const getTime = () => {

    const [sec, ns] = global.process.hrtime();
    return sec * 1e3 + ns * 1e-6;

};

const wait = ms => {

    const start = getTime();
    while (getTime() - start < ms) {}

};

describe('Optimizer', () => {

    let optimizer;
    beforeEach(() => {

        optimizer = new Optimizer();

    });

    describe('begin / end', () => {

        it('should call the optimization function if needed', () => {

            let called = false;
            optimizer.addOptimization(delta => {

                const expected = 16 - 100;
                const ratio = 1 - delta / expected;
                expect(Math.abs(ratio)).toBeLessThan(0.025);
                called = true;

            });

            while (true) {

                if (called) break;

                optimizer.begin();
                wait(100);
                optimizer.end();

            }

        });

        it('should call the optimizations in order', () => {

            const called = [];

            optimizer.addOptimization(() => { called.push(0); return false; }, 0);
            optimizer.addOptimization(() => { called.push(1); return false; }, 0);
            optimizer.addOptimization(() => { called.push(2); return false; }, 0);
            optimizer.addOptimization(() => { called.push(3); return false; }, 0);
            optimizer.addOptimization(() => { called.push(4); return false; }, 0);

            while (true) {

                if (called.length) break;

                optimizer.begin();
                wait(100);
                optimizer.end();

            }

            expect(called).toEqual([0, 1, 2, 3, 4]);

        });

        it('should call the optimizations in priority order', () => {

            const priorities = new Array(100).fill().map((d, i) => i);
            const prioritiesCopy = [...priorities].reverse();
            const called = [];
            while (priorities.length) {

                const index = Math.floor(priorities.length * Math.random());
                const pri = priorities.splice(index, 1)[0];

                optimizer.addOptimization(() => { called.push(pri); return false; }, pri);

            }

            while (true) {

                if (called.length) break;

                optimizer.begin();
                wait(100);
                optimizer.end();

            }

            expect(called).toEqual(prioritiesCopy);

        });

        it('should not change priorities if optimization continues to happen', () => {

            let called1 = 0;
            let called0 = 0;

            optimizer.addOptimization(() => { called1++; return true; }, 1);
            optimizer.addOptimization(() => { called0++; return true; }, 0);

            while (true) {

                if (called1 >= 10) break;

                optimizer.begin();
                wait(100);
                optimizer.end();

            }

            expect(called1).toEqual(10);
            expect(called0).toEqual(0);

        });

    });

    describe('addOptimizer', () => {

        it('should add optimizations with a default priority of 0', () => {

            optimizer.addOptimization(() => false);
            expect(optimizer.optimizations[0].length).toEqual(1);

        });

        it('should be able to add multiple optimizations at a single priority', () => {

            optimizer.addOptimization(() => false, 1);
            optimizer.addOptimization(() => false, 1);
            optimizer.addOptimization(() => false, 1);
            optimizer.addOptimization(() => false, 1);
            expect(optimizer.optimizations[1].length).toEqual(4);

        });

        it('should be able to add multiple optimizations to multiple priorities', () => {

            optimizer.addOptimization(() => false, 1);
            optimizer.addOptimization(() => false, 2);
            optimizer.addOptimization(() => false, 3);
            optimizer.addOptimization(() => false, 4);
            expect(optimizer.optimizations[1].length).toEqual(1);
            expect(optimizer.optimizations[2].length).toEqual(1);
            expect(optimizer.optimizations[3].length).toEqual(1);
            expect(optimizer.optimizations[4].length).toEqual(1);

        });

        it('should be able to add functions as an optimization', () => {

            optimizer.addOptimization(() => false, 1);
            expect(optimizer.optimizations[1].length).toEqual(1);

        });

        it('should be able to add Optimization instances', () => {

            optimizer.addOptimization(new DummyOptimization(10), 1);
            expect(optimizer.optimizations[1].length).toEqual(1);

        });

        it('should track the minimum and maximum priority levels', () => {

            optimizer.addOptimization(() => false, -100);
            optimizer.addOptimization(() => false, 2);
            optimizer.addOptimization(() => false, -200);
            optimizer.addOptimization(() => false, 100);

            expect(optimizer.minPriority).toEqual(-200);
            expect(optimizer.maxPriority).toEqual(100);

        });

    });

    describe('options', () => {

        // TODO

    });

    afterEach(() => {

        optimizer.dispose();
        optimizer = null;

    });

});
