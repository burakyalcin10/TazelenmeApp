import crypto from 'crypto';

/**
 * Encryption Utility — AES-256-GCM ile alan şifreleme
 * KVKK uyumu için hassas verilerin şifrelenmesinde kullanılır
 *
 * Kullanım:
 *   encryptField('12345678901') → 'iv:authTag:ciphertext' (base64)
 *   decryptField(encrypted)     → '12345678901'
 *   hashForLookup('12345678901') → SHA-256 hash (veritabanında arama için)
 *
 * NOT: ENCRYPTION_KEY .env dosyasında 32-byte (64 hex karakter) olmalıdır.
 *      Örn: openssl rand -hex 32
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 bit
const AUTH_TAG_LENGTH = 16; // 128 bit

function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error('ENCRYPTION_KEY ortam değişkeni tanımlı değil. .env dosyasına ekleyin.');
  }
  if (key.length !== 64) {
    throw new Error('ENCRYPTION_KEY 64 hex karakter (32 byte) olmalıdır.');
  }
  return Buffer.from(key, 'hex');
}

/**
 * Düz metni AES-256-GCM ile şifrele
 * @returns 'iv:authTag:ciphertext' formatında base64 string
 */
export function encryptField(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  const authTag = cipher.getAuthTag();

  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
}

/**
 * Şifrelenmiş metni çöz
 * @param encrypted 'iv:authTag:ciphertext' formatında string
 * @returns Düz metin
 */
export function decryptField(encrypted: string): string {
  const key = getEncryptionKey();
  const parts = encrypted.split(':');

  if (parts.length !== 3) {
    throw new Error('Geçersiz şifreli veri formatı.');
  }

  const [ivB64, authTagB64, ciphertext] = parts;
  const iv = Buffer.from(ivB64, 'base64');
  const authTag = Buffer.from(authTagB64, 'base64');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext, 'base64', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Arama için SHA-256 hash üret
 * Veritabanında şifreli alanın aranabilmesi için deterministic hash
 */
export function hashForLookup(plaintext: string): string {
  return crypto.createHash('sha256').update(plaintext).digest('hex');
}
