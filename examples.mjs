import { async } from "./async-runtime.mjs";

// function that returns a promise
function fakeFetch(val) {
  return new Promise((resolve) => setTimeout(() => resolve(val), 100));
}
// function that throws asynchronously
function asyncThrow() {
  return new Promise((_, reject) =>
    setTimeout(() => reject(new Error("Async error")), 1000)
  );
}

// async function with multiple awaits
const asyncConcat = async (a, b) => {
  console.log("start");
  a = await fakeFetch(a);
  console.log("middle");
  b = await fakeFetch(b);
  console.log("end");
  return `${a} ${b}`;
};
// Equivalent code using the async runtime
const asyncConcat2 = async(function* (a, b) {
  console.log("start");
  a = yield fakeFetch(a);
  console.log("middle");
  b = yield fakeFetch(b);
  console.log("end");
  return `${a} ${b}`;
});

const regularAsync = async () => {
  const a = await "Hello";
  try {
    const b = await asyncThrow();
    console.log(b); // unreachable
  } catch (e) {
    console.log("Caught", e);
  }
  const c = await asyncConcat("World", "!");
  const d = await asyncConcat(a, c);
  console.log("async/await", d);
};

const interruptibleAsync = async(function* () {
  const a = yield "Hello";
  try {
    const b = yield asyncThrow();
    console.log(b); // unreachable
  } catch (e) {
    console.log("Caught", e);
  }
  const c = yield asyncConcat2("World", "!");
  const d = yield asyncConcat2(a, c);
  console.log("runAsync", d);
});

// Calling the functions:

console.log("Regular async:\n");
const asyncProm = regularAsync();
// asyncProm can't be interrupted
await asyncProm;
/**
 * LOGS:
 *
 * Caught Error: Async error
 *     at Timeout._onTimeout (file:async-runtime/examples.mjs:32:22)
 *     at listOnTimeout (node:internal/timers:559:17)
 *     at processTimers (node:internal/timers:502:7)
 * start
 * middle
 * end
 * start
 * middle
 * end
 * async/await Hello World !
 */
console.log("\nInterruptible async:");
const interruptibleAsyncProm = interruptibleAsync();
setTimeout(() => {
  interruptibleAsyncProm.cancel();
}, 1100);
/**
 * LOGS:
 *
 * Caught Error: Async error
 *     at Timeout._onTimeout (file:async-runtime/examples.mjs:50:22)
 *     at listOnTimeout (node:internal/timers:559:17)
 *     at processTimers (node:internal/timers:502:7)
 * start
 */
// Notice how the function was interrupted between start and middle even though asyncConcat2 is a
// nested call: the cancel can propagate to the deepest level of promise.
