(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (factory((global.Optimizer = {})));
}(this, (function (exports) { 'use strict';

    class Optimization {

        optimize(delta, optimizer) {

            return true;

        }

    }

    class SimpleOptimization extends Optimization {

        canIncreaseWork() { return true; }
        increaseWork(delta) { }

        canDecreaseWork() { return true; }
        decreaseWork(delta) { }

        optimize(delta) {

            if (delta < 0) {

                if (this.canDecreaseWork()) {

                    this.decreaseWork(delta);
                    return true;

                }

            } else {

                if (this.canIncreaseWork()) {

                    this.increaseWork(delta);
                    return true;

                }

            }

            return false;

        }

    }

    class Optimizer {

        get enabled() {

            return this._enabled;

        }

        set enabled(val) {

            if (this._enabled !== val) {

                this.resetCheck();

            }

            this._enabled = val;

        }

        constructor(options) {

            options = Object.assign({

                // target milliseconds to hit in the code enclosed by
                // the optimizer
                targetMillis: 1000 / 60,
                targetFramerate: null,

                // how often to check performance
                interval: 500,
                maxFrameSamples: Infinity,

                // how long to wait between capturing frames
                waitMillis: 0,
                waitFrames: Infinity,

                // how far outside the current framerate must be outside
                // the target to optimize
                margin: 0.05,

                // continue to improve quality and then performance over time
                // instead of just stopping after a single failed improvement.
                continuallyRefine: false,

                // whether not we're currently increasing the amount of work
                // done per frame (and thereby decreasing framerate)
                increaseWork: false,

            }, options);

            // convert the specified framerate option to millis
            if (options.targetFramerate > 0) {

                options.targetMillis = 1000 / options.targetFramerate;
                delete options.targetFramerate;

            }

            this.options = options;

            // TODO: Remove these and reference the options object
            this.targetMillis = options.targetMillis;
            this.interval = options.interval;
            this.maxFrameSamples = options.maxFrameSamples;
            this.waitMillis = options.waitMillis;
            this.waitFrames = options.waitFrames;
            this.margin = options.margin;
            this.continuallyRefine = options.continuallyRefine;
            this.increaseWork = options.increaseWork;

            this._enabled = true;
            this.completed = false;
            this._increasingWork = this.increaseWork;

            // the prioritized optimizations -- int : array
            // It would be best if this were sorted linked list so
            // large gaps don't cause unnecessary iteration
            this.optimizations = {};
            this.minPriority = Infinity;
            this.maxPriority = -Infinity;

            // Tracking the time between optimizations
            this.waitedFrames = this.waitFrames;
            this.waitedMillis = this.waitMillis;
            this.elapsedFrames = 0;
            this.elapsedTime = 0;
            this.beginTime = -1;
            this.lastCheck = -1;

            // The next optimization to try
            this.currPriority = null;
            this.currOptimization = 0;

            this._windowFocused = true;
            this._windowBlurFunc = () => this._windowFocused = false;
            this._windowFocusFunc = () => {

                this._windowFocused = true;
                this.resetCheck();

            };
            window.addEventListener('blur', this._windowBlurFunc);
            window.addEventListener('focus', this._windowFocusFunc);

        }

        dispose() {

            window.removeEventListener('blur', this._windowBlurFunc);
            window.removeEventListener('focus', this._windowFocusFunc);

        }

        /* Public API */
        // restarts the optimization process by first improving quality then
        // performance
        restart() {

            this.resetCheck();

            this._increasingWork = this.increaseWork;
            this.currPriority = null;
            this.currOptimization = 0;
            this.completed = false;

        }

        // begin the code block to optimize
        begin() {

            this.beginTime = window.performance.now();

        }

        // end the code block to optimize
        end() {

            // if we're not active for any reason, continue
            if (!this._enabled || !this._windowFocused || this.completed) return;

            // If we don't have a last check time, initialize it
            if (this.lastCheck === -1) this.lastCheck = window.performance.now();

            // If end is called before begin then skip this iteration
            if (this.beginTime === -1) return;

            // wait the required number of frames between calls
            const timeFromBegin = window.performance.now() - this.beginTime;
            if (this.waitedFrames !== 0 && this.waitedMillis !== 0) {
                this.waitedMillis -= timeFromBegin;
                this.waitedFrames--;

                this.waitedFrames = Math.max(this.waitedFrames, 0);
                this.waitedMillis = Math.max(this.waitedMillis, 0);
                return;
            }

            // increment the time and frames run
            this.elapsedTime += timeFromBegin;
            this.elapsedFrames++;

            // if we've waited for an appropriate amount of time
            const sinceLastCheck = window.performance.now() - this.lastCheck;
            if (sinceLastCheck >= this.interval || this.elapsedFrames >= this.maxFrameSamples) {

                // average time per frame and the differences
                const frameTime = this.elapsedTime / this.elapsedFrames;
                const delta = this.targetMillis - frameTime;
                const ratio = delta / this.targetMillis;
                const isOutsideMargin = Math.abs(ratio) > this.margin;
                const needsImproving = delta < 0 && isOutsideMargin;

                if (this._increasingWork) {

                    if (this.currPriority === null) {

                        this.currPriority = this.minPriority;

                    }

                    // If our frame time is higher than we want, then
                    // start trying to improve it.
                    if (needsImproving) {

                        this._increasingWork = false;
                        this.currPriority = this.maxPriority;
                        this.currOptimization = 0;

                    } else {

                        // delta will always be ~0 when targeting 60 fps because the
                        // browser runs at a fixed framerate
                        this.iterate(Math.max(delta, 1));

                    }

                }

                // Try to improve the frame time
                if (!this._increasingWork) {

                    if (this.currPriority === null) {

                        this.currPriority = this.maxPriority;

                    }

                    let didOptimize = false;

                    if (needsImproving) {

                        didOptimize = this.iterate(delta);

                    }

                    if (!didOptimize) {

                        if (this.continuallyRefine) {

                            this._increasingWork = true;

                        } else {

                            this.completed = true;

                        }

                    }

                }

                this.lastCheck = window.performance.now();
                this.elapsedFrames = 0;
                this.elapsedTime = 0;
                this.waitedFrames = this.waitFrames;
                this.waitedMillis = this.waitedMillis;

            }

        }

        // A single function to use _instead_ of "begin" and "end". The function
        // should be called once per frame to optimize on the full frame time
        update() {

            this.end();
            this.begin();

        }

        // add a optimization function at the given priority
        addOptimization(optimization, priority = 0) {

            if (typeof optimization === 'function') {

                const optimizationFunc = optimization;
                optimization = new Optimization();
                optimization.optimize = optimizationFunc;

            }

            priority = parseInt(priority) || 0;
            this.optimizations[priority] = this.optimizations[priority] || [];
            this.optimizations[priority].push(optimization);

            this.minPriority = Math.min(this.minPriority, priority);
            this.maxPriority = Math.max(this.maxPriority, priority);

        }

        /* Private Functions */
        // Iterates over the optimizations based on the delta. Improving quality if delta > 0
        // and performance if delta < 0
        iterate(delta) {

            let done = false;
            while (this.currPriority <= this.maxPriority && this.currPriority >= this.minPriority) {

                // search for a optimization we can perform to improve performance
                // if we get through all optimizations without an improvement then
                // move on to the next priority level.
                const optimizations = this.optimizations[this.currPriority];
                if (optimizations) {

                    for (let i = 0; !done && i < optimizations.length; i++) {

                        done = optimizations[this.currOptimization].optimize(delta, this);

                        if (typeof done !== 'boolean') {

                            done = !!done;
                            console.warn('Optimizer: Optimization function not returning a boolean value.');

                        }

                        this.currOptimization = (this.currOptimization + 1) % optimizations.length;

                    }

                }

                if (done) {

                    break;

                } else {

                    // Lower priority numbers are more important
                    this.currPriority += delta > 0 ? 1 : -1;
                    this.currOptimization = 0;

                }

            }

            return done;

        }

        // resets the current frame check
        resetCheck() {

            this.elapsedFrames = 0;
            this.elapsedTime = 0;
            this.waitedFrames = this.waitFrames;
            this.waitedMillis = this.waitedMillis;
            this.beginTime = -1;
            this.lastCheck = -1;

        }

    }

    exports.Optimization = Optimization;
    exports.SimpleOptimization = SimpleOptimization;
    exports.Optimizer = Optimizer;

    Object.defineProperty(exports, '__esModule', { value: true });

})));
