import { describe, it, expect, beforeEach } from 'vitest';
import {
  clearWsTickets,
  consumeWsTicket,
  issueWsTicket,
  WS_TICKET_TTL_MS,
} from '../utils/ws-ticket';

describe('ws-ticket store', () => {
  beforeEach(() => {
    clearWsTickets();
  });

  it('issues a single-use ticket that succeeds once and rejects replay', () => {
    const now = 1_700_000_000_000;
    const ticket = issueWsTicket(now);

    expect(ticket).toMatch(/^[0-9a-f]{64}$/);
    expect(consumeWsTicket(ticket, now + 1000)).toBe(true);
    expect(consumeWsTicket(ticket, now + 1001)).toBe(false);
  });

  it('rejects expired tickets after TTL', () => {
    const now = 1_700_000_000_000;
    const ticket = issueWsTicket(now);

    expect(consumeWsTicket(ticket, now + WS_TICKET_TTL_MS)).toBe(false);
  });

  it('rejects unknown or empty tickets', () => {
    expect(consumeWsTicket('')).toBe(false);
    expect(consumeWsTicket(null)).toBe(false);
    expect(consumeWsTicket('non-existent-ticket')).toBe(false);
  });
});
