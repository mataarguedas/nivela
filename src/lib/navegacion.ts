// Full-page navigation after signing in. A hard load drops the client router
// cache, so session-dependent UI (the nav's right slot, role-gated pages)
// renders fresh. `replace` keeps /acceso out of the back stack. Its own
// module so component tests can mock it (jsdom's location isn't writable).

export function irA(url: string): void {
  window.location.replace(url);
}
