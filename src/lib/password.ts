import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

// Compact scrypt hash format: `<saltHex>:<hashHex>`. Two hex strings
// joined with a colon. Picks scrypt over bcrypt to avoid adding a
// dependency — Node ships scrypt in `crypto` which is fine for the
// per-report password volumes we expect (one set + occasional verify).

const SALT_LEN = 16;
const KEY_LEN = 64;
const SCRYPT_OPTS = { N: 16384, r: 8, p: 1 };

export function hashPassword(plain: string): string {
  const salt = randomBytes(SALT_LEN);
  const derived = scryptSync(plain.normalize("NFKC"), salt, KEY_LEN, SCRYPT_OPTS);
  return `${salt.toString("hex")}:${derived.toString("hex")}`;
}

export function verifyPassword(plain: string, stored: string): boolean {
  if (!stored || !stored.includes(":")) return false;
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  try {
    const salt = Buffer.from(saltHex, "hex");
    const stored = Buffer.from(hashHex, "hex");
    const derived = scryptSync(
      plain.normalize("NFKC"),
      salt,
      stored.length,
      SCRYPT_OPTS,
    );
    if (derived.length !== stored.length) return false;
    return timingSafeEqual(derived, stored);
  } catch {
    return false;
  }
}
