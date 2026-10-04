/** Order IDs: "PRT-" + 5 characters with no look-alikes (no 0/O, 1/I/L). 31^5 ≈ 28.6M codes. */
export const ORDER_CODE_PREFIX = 'PRT-';
export const ORDER_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const ORDER_CODE_LENGTH = 5;

const CODE_RE = new RegExp(`^${ORDER_CODE_PREFIX}[${ORDER_CODE_ALPHABET}]{${ORDER_CODE_LENGTH}}$`);

function cryptoRandomInt(max: number): number {
  // Rejection sampling keeps every character equally likely.
  const limit = Math.floor(256 / max) * max;
  const buf = new Uint8Array(1);
  for (;;) {
    crypto.getRandomValues(buf);
    if (buf[0] < limit) return buf[0] % max;
  }
}

export function generateOrderCode(randomInt: (max: number) => number = cryptoRandomInt): string {
  let body = '';
  for (let i = 0; i < ORDER_CODE_LENGTH; i++) {
    body += ORDER_CODE_ALPHABET[randomInt(ORDER_CODE_ALPHABET.length)];
  }
  return ORDER_CODE_PREFIX + body;
}

/** Tidies what a customer typed: spaces, lower case, a missing "PRT-" or a missing dash. */
export function normalizeOrderCode(input: string): string {
  const compact = input.trim().toUpperCase().replace(/\s+/g, '');
  if (compact.startsWith(ORDER_CODE_PREFIX)) return compact;
  if (compact.startsWith('PRT') && compact.length === 3 + ORDER_CODE_LENGTH) {
    return ORDER_CODE_PREFIX + compact.slice(3);
  }
  if (compact.length === ORDER_CODE_LENGTH) return ORDER_CODE_PREFIX + compact;
  return compact;
}

export function isValidOrderCode(code: string): boolean {
  return CODE_RE.test(code);
}

/** Generates a code that `isTaken` rejects as rarely as possible; gives up after `attempts`. */
export function uniqueOrderCode(isTaken: (code: string) => boolean, attempts = 8): string {
  for (let i = 0; i < attempts; i++) {
    const code = generateOrderCode();
    if (!isTaken(code)) return code;
  }
  throw new Error('Could not generate a unique order ID');
}
