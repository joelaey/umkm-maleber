import crypto from 'crypto';

const SALT_SECRET = 'maleber_village_security_salt_key_2026';

/**
 * Hashes a plain-text password securely using SHA-256 with a secret salt.
 * Returns a string formatted as `$sha256$<hex_digest>`.
 */
export function hashPassword(plainPassword: string): string {
  if (!plainPassword) return '';
  if (plainPassword.startsWith('$sha256$')) return plainPassword; // Already hashed
  const hmac = crypto.createHmac('sha256', SALT_SECRET);
  hmac.update(plainPassword);
  return `$sha256$${hmac.digest('hex')}`;
}

/**
 * Verifies a plain-text password against a stored hash or legacy plain-text password.
 */
export function verifyPassword(plainPassword: string, storedHash?: string | null): boolean {
  if (!plainPassword || !storedHash) return false;
  // Backward compatibility with legacy plain text passwords in DB
  if (!storedHash.startsWith('$sha256$')) {
    return plainPassword === storedHash;
  }
  const computedHash = hashPassword(plainPassword);
  return computedHash === storedHash;
}
