export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startProbationWorker } = await import('./lib/server/probation-worker');
    await startProbationWorker();
  }
}
