# js-framerate-optimizer

[![npm version](https://img.shields.io/npm/v/framerate-optimizer.svg?style=flat-square)](https://www.npmjs.com/package/framerate-optimizer)
[![build](https://img.shields.io/github/actions/workflow/status/gkjohnson/js-framerate-optimizer/node.js.yml?branch=master&style=flat-square&label=build)](https://github.com/gkjohnson/js-framerate-optimizer/actions)

Library for tracking and iteratively improving framerate over time inspired by the [Babylon.SceneOptimizer](https://doc.babylonjs.com/how_to/how_to_use_sceneoptimizer).

The terms "increase work" and "decrease work" are synonymous with "improve quality" and "improve performance" respectively.

# Use

```js
import { Optimizer } from '.../Optimizer.js';

// wait for x milliseconds
function wait(ms) {

    const start = window.performance.now();
    while (window.performance.now < start + ms) {}

}

// optimize the work time until we reach the target framerate
const optimizer = new Optimizer();
optimizer.addOptimization(delta => {

    workTime += delta < 0 ? -1 : 1;
    return true;

});

// work loop
let workTime = 500;
(function loop(){

    optimizer.update();
    wait(workTime);
    requestAnimationFrame(loop);

})();

```

# How it Works

The optimizer tracks the amount of time spent between frames or between calls to `begin` and `end` and calculates the difference between the target amount of time to spend and the actual time spent on the last frame. After the specified amount of time has passed the average time spent is calculated and the framerate the amount of work is either increased or decreased depending on whether or not the time spent was above or below the target. The amount of work is adjusted by iteratively calling prioritized optimizations and sampling framerate until the target work time is met.

# API
## Optimizer

### .enabled

```js
enabled = true : Boolean
```

Getter and setter for enabling or disabling the optimizer. Elapsed time is reset on reenable.

### .completed

```js
completed : Boolean
```

Whether or not the optimizer has stopped iterating and sampling the framerate.


### .constructor

```js
constructor( options : Object )
```

All options can be accessed and modified on `Optimizer.options`.

#### options.targetMillis

The target milliseconds to hit in the enclosed code block. This cannot be _less_ than `16.66...` because browser caps the framerate to 60 frames per second. If this is less than that the optimizer will continually decrease quality to try to get performance up.

Defaults to `16.66...`.

#### options.targetFramerate

The target framerate to hit. This overrides `targetMillis` if it is set.

Defaults to `null`.

#### options.interval

How often to perform a check sample the average framerate to try to optimize in milliseconds.

Defaults to `500` or half a second.

#### options.maxFrameSamples

At most how many frames can run before an optimization should occur. This is useful when code may not run consistently but runs as needed, meaning that checking after a fixed amount of time might mean that an inconsistent or no actual iterations has occurred. `Interval` should probably be set to `Infinity` in this case.

Defaults to `Infinity`.

#### options.waitMillis

The amount of time to wait between sampling frames for a new optimization. This is useful when an optimization may cause the framerate to drop for a frame or two -- such as with allocating a lot of new memory or new webgl render targets.

Defaults to `0`;

#### options.maxWaitFrames

At most how many frames to wait for.

Defaults to `Infinity`;

#### options.margin

How far outside of the target framerate must be in order for an optimization to occurs.

Defaults to `0.05` or 5%.

#### options.continuallyRefine

By default the optimizer will stop trying to optimize and optimization the page once the target framerate is hit or no more optimizations can run and will never try to improve quality of the page again after the first iteration.

This option allows the optimizer to ping pong between improving performance and quality continually to keep a steady framerate. Note that this may not be a good option when using "expensive" optimizations that may stall the frame for a moment, like compiling shaders.

Defaults to `false`.

#### options.increaseWork

Whether the optimizer should ever try to increase the amount of work done at the cost of framerate. After the quality improvements are made the optimizer tries to improve the framerate until the target framerate is met.

Defaults to `false`.

### .dispose

```js
dispose() : void
```

Removes window events that the optimizer listens for, including window `"blur"` and `"focus"`. It is expected that the optimizer is no longer used after this.

### .addOptimization

```js
addOptimization( optimization : Optimization, priority = 0 : Number ) : void
```

Takes an instance of a `Optimization` (described below) and a priority by which to call the optimization. Optimizations are optimized iteratively until each priority level has been completely optimized then it will move to the next one. When improving quality the lowest priority level is started with to improve quality. The highest is started with when improving performance.

Expensive but unnecessary work should be optimized at a high priority level. Critical functionality should be optimized at a low priority level.

### .begin
### .end

```js
begin() : void
end() : void
```

`begin` an `end` are used to encapsulate the code block to be optimized. Any optimizations being used should affect the performance of the code within that code block.

```js
optimizer.begin();

// ... code to optimize ...

optimizer.end();
```

### .update

```js
update() : void
```

`update` takes the place of both `begin()` and `end()` and should be called once per frame to optimize the full frame time.

```js

function loop() {

    optimizer.update();

    // ... code to optimize

    requesAnimationFrame(loop);

}
```

### .addSample

```js
addSample( time : Number ) : void
```

Call instead of `begin`, `end`, or `update` if you'd like to use a separate time-measuring mechanism that cannot be achieved with the aforementioned function, such as when measuring GPU work time with the [WebGL disjoint_timer_query](https://www.khronos.org/registry/webgl/extensions/EXT_disjoint_timer_query_webgl2/).

### .restart

```js
restart() : void
```

Restarts optimization from the beginning.

This should be called if something on the page changed
icantly which might give more room for improvement, such as significantly resizing the browser window with a WebGL app.

## Optimization

An optimization base class for creating a reusable optimization to add to the `Optimizer`.

### .optimize

```js
optimize( delta : Number, optimizer : Optimizer )
```

The optimize function is called whenever an optimization should take place, either to improve performance or quality. The `delta` argument is the amount of milliseconds difference between the target framerate and the current framerate. A negative value means that less work should be done to hit the target.

The optimize function _must_ return `true` if the setting was optimized and 'false' if no optimization could occur, ie the setting being optimized could not be turned down any further or is at the lowest acceptable setting.

The second argument `optimizer` is the optimizer that is running the optimization.

## SimpleOptimization

A extension of `Optimization` that abstracts some of the basic functionality needed to implement it.

### .canIncreaseWork / .canDecreaseWork

```js
canIncreaseWork() : Boolean
canDecreaseWork() : Boolean
```

Functions that should return true if the optimizer _can_ increase or decrease work. If they return true the associated optimization function will be called.

### .increaseWork / .decreaseWork

```js
increaesWork( delta : Number ) : void
decreaseWork( delta : Number ) : void
```

Functions to increase or decrease work and optimize the frame if needed. These are called if the associated `canIncreaseWork` or `canDecreaseWork` return true.

