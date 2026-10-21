import 'server-only';
import { readStore } from './store';

export async function startProbationWorker() {
  if (globalThis.__hdProbationTimer) return;
  const sweep = () =>
    readStore(() => null).catch((error) => console.error('Probation expiry check failed:', error));
  await sweep();
  globalThis.__hdProbationTimer = setInterval(sweep, 60000);
  globalThis.__hdProbationTimer.unref?.();
}
