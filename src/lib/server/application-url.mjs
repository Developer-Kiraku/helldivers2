// Render binds Next.js to 0.0.0.0 internally. Redirects must use the configured public origin.
export function applicationUrl(path, requestUrl, publicOrigin) {
  if (typeof path !== 'string' || !path.startsWith('/') || path.startsWith('//') || path.includes('\\')) throw Error('An internal application path is required');
  const base = new URL(publicOrigin || requestUrl);
  if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password) throw Error('Invalid application origin');
  return new URL(path, base.origin);
}
