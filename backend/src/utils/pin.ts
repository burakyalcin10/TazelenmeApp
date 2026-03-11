import argon2 from 'argon2';

/**
 * PIN Hash Utility — Argon2id ile 4 haneli PIN hash'leme
 * Tazelenme Üniversitesi öğrencilerine sistem tarafından atanan PIN
 */

/** PIN'i argon2id ile hash'le */
export async function hashPin(pin: string): Promise<string> {
  return argon2.hash(pin, {
    type: argon2.argon2id,
    memoryCost: 65536, // 64 MB
    timeCost: 3,
    parallelism: 4,
  });
}

/** PIN doğrulama — hash ile karşılaştır */
export async function verifyPin(hash: string, pin: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, pin);
  } catch {
    return false;
  }
}

/** 4 haneli rastgele PIN üret */
export function generatePin(): string {
  const pin = Math.floor(1000 + Math.random() * 9000);
  return pin.toString();
}
