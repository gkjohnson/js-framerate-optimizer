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

    constructor(options) {

        this.options = Object.assign({

            // target milliseconds to hit in the code enclosed by
            // the optimizer
            targetMillis: 1000 / 60,
            targetFramerate: null,

            // how often to check performance
            interval: 250,

            // how far outside the current framerate must be outside
            // the target to tweak
            margin: 0.025,

        }, options);

        // convert the specified framerate option to millis
        if (this.options.targetFramerate > 0) {

            this.options.targetMillis = 1000 / this.options.targetFramerate;
            delete this.options.targetFramerate;

        }

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

    }

    restart() {

        this.increaseWork = true;
        this.currPriority = 0;
        this.currTweak = 0;

    }

    // begin the code block to optimize
    begin() {

        this.beginTime = window.performance.now();

    }

    // end the code block to optimize
    end() {

        // If we don't have a last check time, initialize it
        if (this.lastCheck === -1) this.lastCheck = window.performance.now();

        // If end is called before begin then skip this iteration
        if (this.beginTime === -1) return;

        // pull out the options we need
        const {
            targetMillis,
            margin,
            interval,
        } = this.options;

        // increment the time and frames run
        this.elapsedTime += window.performance.now() - this.beginTime;
        this.elapsedFrames++;

        // if we've waited for an appropriate amount of time
        const sinceLastCheck = window.performance.now() - this.lastCheck;
        if (sinceLastCheck >= interval) {

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

                    this.iterate(1);

                }

            }

            // Try to improve the frame time
            if (!this.increaseWork && needsImproving) {

                this.iterate(delta);

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

}
