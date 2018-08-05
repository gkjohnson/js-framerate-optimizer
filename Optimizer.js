export
class Tweak {

    constructor(func) {

        if (func) this.optimize = func;

    }

    optimize() {

        return true;

    }

}

export
class Optimizer {

    get enabled() {
        return this._enabled;
    }

    set enabled(val) {
        this._enabled = val;
        this.resetCheck();
    }

    constructor(options) {

        this.options = Object.assign({

            // target milliseconds to hit in the code enclosed by
            // the optimizer
            targetMillis: 1000 / 60,
            targetFramerate: null,

            // how often to check performance
            interval: 1000,
            maxFrameSamples: Infinity,

            // how far outside the current framerate must be outside
            // the target to tweak
            margin: 0.05,

            // continue to improve quality and then performance over time
            // instead of just stopping after a single failed improvement.
            continuallyRefine: false,

        }, options);

        // convert the specified framerate option to millis
        if (this.options.targetFramerate > 0) {

            this.options.targetMillis = 1000 / this.options.targetFramerate;
            delete this.options.targetFramerate;

        }

        this._enabled = true;
        this.completed = false;

        // the prioritized tweaks -- int -> array
        // It would be best if this were sorted linked list so
        // large gaps don't cause unnecessary iteration
        this.tweaks = {};
        this.minPriority = Infinity;
        this.maxPriority = -Infinity;

        // Tracking the time between optimizations
        this.elapsedFrames = 0;
        this.elapsedTime = 0;
        this.beginTime = -1;
        this.lastCheck = -1;

        // The next tweak to try and whether not we're currently
        // increasing the amount of work done per frame (and thereby
        // decreasing framerate)
        this.increaseWork = true;
        this.currPriority = 0;
        this.currTweak = 0;

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

        this.removeEventListener('blur', this._windowBlurFunc);
        this.removeEventListener('focus', this._windowFocusFunc);

    }

    /* Public API */
    // restarts the optimization process by first improving quality then
    // performance
    restart(increaseWork = true) {

        this.resetCheck();
        this.increaseWork = increaseWork;
        this.currPriority = 0;
        this.currTweak = 0;

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

        // pull out the options we need
        const {
            targetMillis,
            margin,
            interval,
            maxFrameSamples,
            continuallyRefine,
        } = this.options;

        // increment the time and frames run
        this.elapsedTime += window.performance.now() - this.beginTime;
        this.elapsedFrames++;

        // if we've waited for an appropriate amount of time
        const sinceLastCheck = window.performance.now() - this.lastCheck;
        if (sinceLastCheck >= interval || this.elapsedFrames >= maxFrameSamples) {

            // average time per frame and the differences
            const frameTime = this.elapsedTime / this.elapsedFrames;
            const delta = targetMillis - frameTime;
            const ratio = delta / targetMillis;
            const isOutsideMargin = Math.abs(ratio) > margin;
            const needsImproving = delta < 0 && isOutsideMargin;

            if (this.increaseWork) {

                // If our frame time is higher than we want, then
                // start trying to improve it.
                if (needsImproving) {

                    this.increaseWork = false;
                    this.currPriority = this.maxPriority;
                    this.currTweak = 0;

                } else {

                    // delta will always be ~0 when targeting 60 fps because the
                    // browser runs at a fixed framerate
                    this.iterate(Math.max(delta, 1));

                }

            }

            // Try to improve the frame time
            if (!this.increaseWork) {

                let didOptimize = false;

                if (needsImproving) {

                    didOptimize = this.iterate(delta);

                }

                if (!didOptimize) {

                    if (continuallyRefine) {

                        this.increaseWork = true;

                    } else {

                        this.completed = true;

                    }

                }

            }

            this.lastCheck = window.performance.now();
            this.elapsedFrames = 0;
            this.elapsedTime = 0;

        }

    }

    // A single function to use _instead_ of "begin" and "end". The function
    // should be called once per frame to optimize on the full frame time
    update() {

        this.end();
        this.begin();

    }

    // add a tweak function at the given priority
    addTweak(tweak, priority = 0) {

        if (typeof tweak === 'function') {

            tweak = new Tweak(tweak);

        }

        priority = parseInt(priority) || 0;
        this.tweaks[priority] = this.tweaks[priority] || [];
        this.tweaks[priority].push(tweak);

        this.minPriority = Math.min(this.minPriority, priority);
        this.maxPriority = Math.max(this.maxPriority, priority);

    }

    /* Private Functions */
    // Iterates over the tweaks based on the delta. Improving quality if delta > 0
    // and performance if delta < 0
    iterate(delta) {

        let done = false;
        while (this.currPriority <= this.maxPriority && this.currPriority >= this.minPriority) {

            // search for a tweak we can perform to improve performance
            // if we get through all tweaks without an improvement then
            // move on to the next priority level.
            const tweaks = this.tweaks[this.currPriority];
            if (tweaks) {

                for (let i = 0; !done && i < tweaks.length; i++) {

                    done = !!tweaks[this.currTweak].optimize(delta);

                    this.currTweak = (this.currTweak + 1) % tweaks.length;

                }

            }

            if (done) {

                break;

            } else {

                // Lower priority numbers are more important
                this.currPriority += delta > 0 ? 1 : -1;

            }

        }

        return done;

    }

    // resets the current frame check
    resetCheck() {

        this.elapsedFrames = 0;
        this.elapsedTime = 0;
        this.beginTime = -1;
        this.lastCheck = -1;

    }

}
