import { fail } from './auth';

export async function readJsonRequest(request, maxBytes) {
  const declared = request.headers.get('content-length');
  if (declared && Number(declared) > maxBytes) fail(413, '요청 크기가 너무 큽니다.');
  if (!request.body) return {};
  const reader = request.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        fail(413, '요청 크기가 너무 큽니다.');
      }
      chunks.push(Buffer.from(value));
    }
  } finally {
    reader.releaseLock();
  }
  try {
    const raw = Buffer.concat(chunks).toString('utf8');
    const input = raw ? JSON.parse(raw) : {};
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw Error();
    return input;
  } catch {
    fail(400, '올바른 JSON 요청이 필요합니다.');
  }
}
