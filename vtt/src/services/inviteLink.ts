interface BrowserLocation {
  origin: string;
  pathname: string;
  search: string;
  hash: string;
}

export interface ParsedInviteLink {
  roomId: string | null;
  sanitizedPath: string;
}

/** Build an invite without putting the bearer room code in the HTTP request. */
export function buildInviteLink(roomId: string, location: BrowserLocation = window.location): string {
  const url = new URL(`${location.origin}${location.pathname}${location.search}`);
  url.searchParams.delete('room');
  url.hash = new URLSearchParams({ room: roomId }).toString();
  return url.toString();
}

/** Parse current fragment invites and legacy query-string invites. */
export function parseInviteLink(urlValue: string): ParsedInviteLink {
  const url = new URL(urlValue);
  const fragment = new URLSearchParams(url.hash.replace(/^#/, ''));
  const roomId = fragment.get('room') ?? url.searchParams.get('room');

  fragment.delete('room');
  url.searchParams.delete('room');
  url.hash = fragment.toString();

  return {
    roomId,
    sanitizedPath: `${url.pathname}${url.search}${url.hash}`,
  };
}

/** Prefill an invite once, then remove the room secret from browser history. */
export function consumeInviteFromLocation(): string | null {
  const parsed = parseInviteLink(window.location.href);
  if (parsed.roomId) {
    window.history.replaceState(window.history.state, '', parsed.sanitizedPath);
  }
  return parsed.roomId;
}
