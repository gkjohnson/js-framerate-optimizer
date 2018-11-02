/* global
    describe it beforeEach afterEach expect
*/
import { Optimizer, SimpleOptimization } from '../src/Optimizer.js';

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
                return true;

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

    describe('restart', () => {

        it('should restart the optimization', () => {

            let called = 0;
            optimizer.addOptimization(() => {

                called++;
                return false;

            });

            expect(optimizer.completed).toEqual(false);
            while (true) {

                if (optimizer.completed) break;

                optimizer.begin();
                wait(100);
                optimizer.end();

            }

            expect(optimizer.completed).toEqual(true);
            optimizer.restart();
            expect(optimizer.completed).toEqual(false);

            while (true) {

                if (optimizer.completed) break;

                optimizer.begin();
                wait(100);
                optimizer.end();

            }

            expect(optimizer.completed).toEqual(true);
            expect(called).toEqual(2);

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

        describe('targetMillis', () => {

            it('should optimize to the target framerate', () => {

                const optimizer = new Optimizer({ targetMillis: 1 });
                let currWait = 16;

                optimizer.addOptimization(delta => {
                    currWait += Math.sign(delta);
                    return true;
                });

                while (true) {

                    if (optimizer.completed) break;

                    optimizer.begin();
                    wait(currWait);
                    optimizer.end();

                }

                expect(currWait).toEqual(1);
                optimizer.dispose();

            });

            it('should be derived from `targetFramerate` if provided', () => {

                const optimizer = new Optimizer({ targetFramerate: 10 });
                expect(optimizer.options.targetMillis).toEqual(100);
                expect(optimizer.options.targetFramerate).toEqual(10);
                optimizer.dispose();

            });

            it('should prefer `targetFramerate`', () => {

                const optimizer = new Optimizer({ targetFramerate: 10, targetMillis: 1 });
                expect(optimizer.options.targetMillis).toEqual(100);
                expect(optimizer.options.targetFramerate).toEqual(10);
                optimizer.dispose();

            });

            it('should define `targetFramerate`', () => {

                const optimizer = new Optimizer({ targetMillis: 20 });
                expect(optimizer.options.targetMillis).toEqual(20);
                expect(optimizer.options.targetFramerate).toEqual(50);
                optimizer.dispose();

            });

        });

        describe('maxFrameSamples', () => {

            it('should cap the amount of frames before optimizing', () => {

                const optimizer = new Optimizer({ maxFrameSamples: 1 });
                let called = 0;
                optimizer.addOptimization(() => {
                    called++;
                    return true;
                });

                for (let i = 0; i < 10; i++) {
                    optimizer.begin();
                    wait(50);
                    optimizer.end();
                }

                expect(called).toEqual(10);

            });

        });

        describe('interval', () => {

            it('should cap the amount of frames before optimizing', () => {

                const optimizer = new Optimizer({ interval: 100 });
                let lastTime;
                optimizer.addOptimization(() => {
                    const delta = (getTime() - lastTime);
                    expect(delta).toBeGreaterThan(100);
                    expect(delta).toBeLessThan(121);

                    lastTime = getTime();

                    return true;
                });

                lastTime = getTime();
                for (let i = 0; i < 10; i++) {
                    optimizer.begin();
                    wait(20);
                    optimizer.end();
                }

            });

        });

        describe('waitMillis', () => {

            it('should not wait to optimize if 0', () => {

                let calls = 0;
                const optimizer = new Optimizer({ waitMillis: 0, interval: 10, targetFramerate: 100000 });
                optimizer.addOptimization(() => {
                    calls++;
                    return true;
                });

                const start = new Date();
                while (new Date() - start < 115) {
                    optimizer.begin();
                    wait(1);
                    optimizer.end();
                }

                expect(calls).toBeGreaterThan(5);

            });

            it('should wait before trying to optimize', () => {

                let calls = 0;
                const optimizer = new Optimizer({ waitMillis: 100, interval: 10, targetFramerate: 100000 });
                optimizer.addOptimization(() => {
                    calls++;
                    return true;
                });

                const start = new Date();
                while (new Date() - start < 150) {
                    optimizer.begin();
                    wait(1);
                    optimizer.end();
                }

                expect(calls).toEqual(1);

            });

            it('should wait between optimizations', () => {

                let calls = 0;
                const optimizer = new Optimizer({ waitMillis: 100, interval: 10, targetFramerate: 100000 });
                optimizer.addOptimization(() => {
                    calls++;
                    return true;
                });

                const start = new Date();
                while (new Date() - start < 250) {
                    optimizer.begin();
                    wait(1);
                    optimizer.end();
                }

                expect(calls).toEqual(2);

            });

        });

        describe('maxWaitFrames', () => {

            it('should wait between optimizations', () => {

                let calls = 0;
                const optimizer = new Optimizer({ maxWaitFrames: 100, maxFrameSamples: 10, targetFramerate: 100000, waitMillis: Infinity, interval: Infinity });
                optimizer.addOptimization(() => {
                    calls++;
                    return true;
                });

                for (let i = 0; i < 150; i++) {
                    optimizer.begin();
                    wait(1);
                    optimizer.end();
                }

                expect(calls).toEqual(1);

            });

            it('should wait between optimizations', () => {

                let calls = 0;
                const optimizer = new Optimizer({ maxWaitFrames: 100, maxFrameSamples: 10, targetFramerate: 100000, waitMillis: Infinity, interval: Infinity });
                optimizer.addOptimization(() => {
                    calls++;
                    return true;
                });

                for (let i = 0; i < 250; i++) {
                    optimizer.begin();
                    wait(1);
                    optimizer.end();
                }

                expect(calls).toEqual(2);

            });

        });

        describe('margin', () => {

            it.skip('should set how strict the timing must be to optimize', () => {});

        });

        describe('continuallyRefine', () => {

            it.skip('should allow for continuous refining of framerate when `true`', () => {});

        });

        describe('increaseWork', () => {

            it('should allow for increasing work to the framerate cap before lowering when `true`', () => {

                const optimizer = new Optimizer({ increaseWork: true });
                let time = 1;
                let incCalled = 0;
                let decCalled = 0;

                optimizer.addOptimization(delta => {

                    if (delta > 0) time += 20;
                    else time -= 1;

                    if (delta > 0) incCalled++;
                    else decCalled++;

                    return true;

                });

                while (true) {

                    if (optimizer.completed) break;

                    optimizer.begin();
                    wait(time);
                    optimizer.end();

                }

                expect(incCalled).toEqual(1);

                // 4 or 5 are okay
                expect(decCalled / 5).toBeGreaterThanOrEqual(0.8);
                expect(decCalled / 5).toBeLessThanOrEqual(1);

            });

            it('should never increase when `false`', () => {

                const optimizer = new Optimizer({ });
                let time = 1;
                let incCalled = 0;
                let decCalled = 0;

                optimizer.addOptimization(delta => {

                    if (delta > 0) time += 20;
                    else time -= 1;

                    if (delta > 0) incCalled++;
                    else decCalled++;

                    return true;

                });

                while (true) {

                    if (optimizer.completed) break;

                    optimizer.begin();
                    wait(time);
                    optimizer.end();

                }

                expect(incCalled).toEqual(0);
                expect(decCalled).toEqual(0);

            });

        });

    });

    afterEach(() => {

        optimizer.dispose();
        optimizer = null;

    });

});
