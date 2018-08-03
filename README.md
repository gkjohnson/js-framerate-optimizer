**Work in Progress**

# js-framerate-optimizer
Library for tracking and iteratively improving framerate over time

### Use

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
