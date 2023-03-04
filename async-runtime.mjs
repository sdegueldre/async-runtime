const Pending = new Promise(() => {});
function CancellablePromise(value) {
  if (value instanceof Promise) {
    if ("cancel" in value) {
      return value;
    }
    let cancelled = false;
    return Object.assign(
      value.then(
        (val) => (cancelled ? Pending : val),
        (err) => (cancelled ? Pending : Promise.reject(err))
      ),
      {
        cancel: () => (cancelled = true),
      }
    );
  }
  return Object.assign(Promise.resolve(value), { cancel: () => {} });
}

const runAsync = (proms, method, nextVal) => {
  let value, done;
  try {
    ({ value, done } = proms[method](nextVal));
  } catch (e) {
    return Promise.reject(e);
  }
  if (done) {
    return Promise.resolve(value);
  }
  const prom = CancellablePromise(value);
  const ret = Object.assign(
    prom.then(
      (val) => {
        const p = runAsync(proms, "next", val);
        Object.defineProperty(ret, "cancel", {
          get() {
            return p.cancel;
          },
        });
        return p;
      },
      (err) => {
        const p = runAsync(proms, "throw", err);
        Object.defineProperty(ret, "cancel", {
          get() {
            return p.cancel;
          },
        });
        return p;
      }
    ),
    {
      cancel: () => prom.cancel(),
    }
  );
  return ret;
};
// decorator that turns a Promise generator function into something that behaves like an async function
export const async = (fn) => {
  return function (...args) {
    return runAsync(fn.call(this, ...args), "next");
  };
};
