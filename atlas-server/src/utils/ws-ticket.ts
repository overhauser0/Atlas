import crypto from 'crypto';

export const WS_TICKET_TTL_MS = 30_000;
export const WS_TICKET_TTL_SEC = Math.floor(WS_TICKET_TTL_MS / 1000);
const MAX_ACTIVE_TICKETS = 1000;

const activeTickets = new Map<string, number>();

const pruneExpiredTickets = (now: number) => {
  for (const [ticket, expiresAt] of activeTickets.entries()) {
    if (now >= expiresAt) {
      activeTickets.delete(ticket);
    }
  }
};

/** 30秒間有効・1回限りの WebSocket 認証チケットを発行する。 */
export const issueWsTicket = (now: number = Date.now()): string => {
  pruneExpiredTickets(now);

  if (activeTickets.size >= MAX_ACTIVE_TICKETS) {
    const oldestKey = activeTickets.keys().next().value;
    if (oldestKey) activeTickets.delete(oldestKey);
  }

  const ticket = crypto.randomBytes(32).toString('hex');
  activeTickets.set(ticket, now + WS_TICKET_TTL_MS);
  return ticket;
};

/** チケットを検証し、有効なら即座に消費（失効）して true を返す。 */
export const consumeWsTicket = (
  ticket: string | null | undefined,
  now: number = Date.now(),
): boolean => {
  pruneExpiredTickets(now);
  if (!ticket || typeof ticket !== 'string') return false;

  const expiresAt = activeTickets.get(ticket);
  if (expiresAt === undefined) return false;

  activeTickets.delete(ticket);
  return now < expiresAt;
};

/** テスト用: 保持中のチケットを全消去する。 */
export const clearWsTickets = () => {
  activeTickets.clear();
};
