import { expect, test } from '@playwright/test';
import { buildInviteLink, parseInviteLink } from '../../src/services/inviteLink';

test.describe('invite link hygiene', () => {
  test('puts new room codes in the URL fragment', () => {
    const link = buildInviteLink('secret-room-code', {
      origin: 'https://vtt.example',
      pathname: '/play',
      search: '?theme=dark&room=old-code',
      hash: '',
    });

    expect(link).toBe('https://vtt.example/play?theme=dark#room=secret-room-code');
    expect(new URL(link).searchParams.has('room')).toBe(false);
  });

  test('parses and removes fragment room codes while preserving other state', () => {
    const parsed = parseInviteLink('https://vtt.example/play?theme=dark#room=secret&panel=join');

    expect(parsed.roomId).toBe('secret');
    expect(parsed.sanitizedPath).toBe('/play?theme=dark#panel=join');
  });

  test('keeps legacy query invitations compatible and sanitizes them', () => {
    const parsed = parseInviteLink('https://vtt.example/play?room=legacy-code&theme=dark');

    expect(parsed.roomId).toBe('legacy-code');
    expect(parsed.sanitizedPath).toBe('/play?theme=dark');
  });
});
