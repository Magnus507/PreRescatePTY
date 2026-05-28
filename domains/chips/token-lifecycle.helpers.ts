type TokenLike = {
  orderId?: string | null;
  usedAt?: Date | string | null;
  expiresAt?: Date | string | null;
};

function toDate(value?: Date | string | null): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function isTokenAvailableNow(token: TokenLike, now: Date = new Date()): boolean {
  const expiresAt = toDate(token.expiresAt);
  return token.orderId == null && token.usedAt == null && !!expiresAt && expiresAt > now;
}

export function isTokenReservedNow(token: TokenLike, now: Date = new Date()): boolean {
  const expiresAt = toDate(token.expiresAt);
  return token.orderId != null && token.usedAt == null && !!expiresAt && expiresAt > now;
}

export function isTokenUsed(token: TokenLike): boolean {
  return token.usedAt != null;
}

export function isTokenExpired(token: TokenLike, now: Date = new Date()): boolean {
  const expiresAt = toDate(token.expiresAt);
  return !!expiresAt && expiresAt <= now;
}

export function isTokenHistorical(token: TokenLike, now: Date = new Date()): boolean {
  return isTokenUsed(token) || isTokenExpired(token, now) || token.orderId != null;
}
