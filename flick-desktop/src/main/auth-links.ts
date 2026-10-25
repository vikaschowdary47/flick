export function isAuthCallbackUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (url.protocol === 'eqlshare:' || url.protocol === 'flick:') && url.hostname === 'auth-callback'
      && (url.pathname === '' || url.pathname === '/') && !url.username && !url.password && !url.port;
  } catch { return false; }
}
export function findAuthCallback(args: string[]): string | undefined {
  return args.find(isAuthCallbackUrl);
}
