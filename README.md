**Work in Progress**

# js-framerate-optimizer
Library for tracking and iteratively improving framerate over time inspired by the [Babylon.SceneOptimizer](https://doc.babylonjs.com/how_to/how_to_use_sceneoptimizer).

## Use

```js
import { Optimizer } from '.../Optimizer.js';

// wait for x milliseconds
function wait(ms) {

    const start = window.performance.now();
    while (window.performance.now < start + ms) {}

}

// optimize the work time until we reach the target framerate
const optimizer = new Optimizer();
optimizer.addTweak(delta => {

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

## API
### Optimizer

#### constructor(options)

##### options.targetMillis

The target milliseconds to hit in the enclosed code block. This cannot be _less_ than `16.66...` because browser caps the framerate to 60 frames per second. If this is less than that the optimizer will continually decrease quality to try to get performance up.

Defaults to `16.66...`.

##### options.targetFramerate

The target framerate to hit. This overrides `targetMillis` if it is set.

Defaults to `null`.

##### options.interval

How often to perform a check sample the average framerate to try to optimize in milliseconds.

Defaults to `500` or half a second.

##### options.maxFrameSamples

At most how many frames can run before an optimization should occur. This is useful when code may not run consistently but runs as needed, meaning that checking after a fixed amount of time might mean that an inconsistent or no actual iterations has occurred. `Interval` should probably be set to `Infinity` in this case.

Defaults to `Infinity`.

##### options.margin

How far outside of the target framerate must be in order for an optimization to occurs.

Defaults to `0.05` or 5%.

##### options.continuallyRefine

By default the optimizer will stop trying to optimize and tweak the page once the target framerate is hit or no more tweaks can run and will never try to improve quality of the page again after the first iteration.

This option allows the optimizer to ping pong between improving performance and quality continually to keep a steady framerate. Note that this may not be a good option when using "expensive" tweaks that may stall the frame for a moment, like compiling shaders.

Defaults to `false`.

#### dispose()

Removes window events that the optimizer listens for, including window `"blur"` and `"focus"`. It is expected that the optimizer is no longer used after this.

#### addTweak(tweak, priority = 0)

Takes an instance of a `Tweak` (described below) and a priority by which to call the tweak. Tweaks are optimized iteratively until each priority level has been completely optimized then it will move to the next one. When improving quality the lowest priority level is started with to improve quality. The highest is started with when improving performance.

Expensive but unnecessary work should be tweaked at a high priority level. Critical functionality should be tweaked at a low priority level.

#### begin() & end()

`begin` an `end` are used to encapsulate the code block to be optimized. Any tweaks being used should affect the performance of the code within that code block.

```js
optimizer.begin();

// ... code to optimize ...

optimizer.end();
```

#### update()

`update` takes the place of both `begin()` and `end()` and should be called once per frame to optimize the full frame time.

```js

function loop() {

    optimizer.update();
  
    // ... code to optimize

    requesAnimationFrame(loop);
  
}
```

#### restart(inscreaseWork = true)

Restarts optimization from the beginning. If `increaseWork === true` then it will start by trying to improve the quality of the page again.

This should be called if something on the page changed significantly which might give more room for improvement, such as significanyl resizing the browser window with a WebGL app.

### Tweak

#### constructor(optimizeFunction)

Takes a function to call in `optimize` below. This function must match the behavior of the `optimize` function.

#### optimize(delta)

The optimize function is called whenever an optimization should take place, either to improve performance or quality. The `delta` argument is the amount of milliseconds difference between the target framerate and the current framerate. A negative value means that less work should be done to hit the target.

The optimize function _must_ return `true` if the setting was optimized and 'false' if no optimization could occur, ie the setting being tweaked could not be turned down any further or is at the lowest acceptable setting.

## TODO
- Add delayed / async tweaks so the optimizer can only continue after the tweak says to.
- Add "stable" option for expensive tweaks so they will only be run on the first pass. 
- Allow for setting options directly on the optimizer object
- Examples / tests
- Normalize vocabulary (tweak, optimize, work, quality, performance)
