// Bounded requests also settle when a transport ignores AbortSignal.
export async function puzzleRequest(api, path, options, controllers, timeoutMs = 10000) {
  const controller = new AbortController();
  controllers.add(controller);
  let timer, onAbort;
  const cancelled = new Promise((_, reject) => {
    onAbort = () => reject(controller.signal.reason || new Error('요청이 취소되었습니다.'));
    controller.signal.addEventListener('abort', onAbort, { once: true });
    timer = setTimeout(
      () => controller.abort(new Error('서버 응답이 지연되고 있습니다. 다시 확인해주세요.')),
      timeoutMs,
    );
  });
  try {
    return await Promise.race([api(path, { ...options, signal: controller.signal }), cancelled]);
  } finally {
    clearTimeout(timer);
    controller.signal.removeEventListener('abort', onAbort);
    controllers.delete(controller);
  }
}
