import assert from 'node:assert/strict';
import { puzzleRequest } from '../src/lib/puzzle-request.mjs';
const controllers = new Set();
let signal;
await assert.rejects(
  puzzleRequest(
    (_, options) => {
      signal = options.signal;
      return new Promise(() => {});
    },
    'move',
    {},
    controllers,
    5,
  ),
  /서버 응답이 지연/,
);
assert.equal(signal.aborted, true);
assert.equal(
  controllers.size,
  0,
  'Timeout releases request bookkeeping even if transport never settles',
);
let lateResolve;
const pending = puzzleRequest(
  () =>
    new Promise((resolve) => {
      lateResolve = resolve;
    }),
  'move',
  {},
  controllers,
);
const rejected = assert.rejects(pending, /stopped/);
for (const controller of controllers) controller.abort(new Error('stopped'));
await rejected;
lateResolve({ run: { completedAt: 'late' } });
assert.equal(controllers.size, 0);
assert.deepEqual(await puzzleRequest(async () => ({ ok: true }), 'state', {}, controllers), {
  ok: true,
});
assert.equal(controllers.size, 0);
console.log(
  'PASS: bounded puzzle requests, cancellation despite unresponsive transports, late response rejection and cleanup',
);
