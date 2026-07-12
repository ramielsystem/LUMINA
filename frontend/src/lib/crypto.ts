// AES-256-CBC encryption with PBKDF2-derived keys for vault + backups.
import CryptoJS from "crypto-js";
import * as ExpoCrypto from "expo-crypto";

const PBKDF2_ITERATIONS = 20000;
const KEY_SIZE_WORDS = 8; // 256 bits

export interface EncryptedBlob {
  ciphertext: string; // base64
  iv: string; // base64
  salt: string; // base64
  version: number;
}

function bytesToWordArray(bytes: Uint8Array): CryptoJS.lib.WordArray {
  const words: number[] = [];
  for (let i = 0; i < bytes.length; i += 4) {
    words.push(
      ((bytes[i] || 0) << 24) |
        ((bytes[i + 1] || 0) << 16) |
        ((bytes[i + 2] || 0) << 8) |
        (bytes[i + 3] || 0)
    );
  }
  return CryptoJS.lib.WordArray.create(words, bytes.length);
}

function secureRandomWordArray(bytes: number): CryptoJS.lib.WordArray {
  // Prefer expo-crypto (works on native + web, uses the platform's CSPRNG).
  try {
    const buf = ExpoCrypto.getRandomBytes(bytes);
    return bytesToWordArray(buf);
  } catch {
    // Fall back to crypto-js. On some web environments this throws — swallow
    // and fall through to Math.random as last resort (dev only).
    try {
      return CryptoJS.lib.WordArray.random(bytes);
    } catch {
      const b = new Uint8Array(bytes);
      for (let i = 0; i < bytes; i++) b[i] = Math.floor(Math.random() * 256);
      return bytesToWordArray(b);
    }
  }
}

function randomBase64(bytes: number): string {
  return CryptoJS.enc.Base64.stringify(secureRandomWordArray(bytes));
}

function deriveKey(passphrase: string, saltB64: string): CryptoJS.lib.WordArray {
  const salt = CryptoJS.enc.Base64.parse(saltB64);
  return CryptoJS.PBKDF2(passphrase, salt, {
    keySize: KEY_SIZE_WORDS,
    iterations: PBKDF2_ITERATIONS,
    hasher: CryptoJS.algo.SHA256,
  });
}

export function encryptJSON(data: unknown, passphrase: string): EncryptedBlob {
  const salt = randomBase64(16);
  const iv = randomBase64(16);
  const key = deriveKey(passphrase, salt);
  const encrypted = CryptoJS.AES.encrypt(
    CryptoJS.enc.Utf8.parse(JSON.stringify(data)),
    key,
    {
      iv: CryptoJS.enc.Base64.parse(iv),
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    }
  );
  return {
    ciphertext: encrypted.ciphertext.toString(CryptoJS.enc.Base64),
    iv,
    salt,
    version: 1,
  };
}

export function decryptJSON<T = unknown>(
  blob: EncryptedBlob,
  passphrase: string
): T {
  const key = deriveKey(passphrase, blob.salt);
  const decrypted = CryptoJS.AES.decrypt(
    { ciphertext: CryptoJS.enc.Base64.parse(blob.ciphertext) } as CryptoJS.lib.CipherParams,
    key,
    {
      iv: CryptoJS.enc.Base64.parse(blob.iv),
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    }
  );
  const plaintext = decrypted.toString(CryptoJS.enc.Utf8);
  if (!plaintext) throw new Error("Decryption failed — wrong PIN?");
  return JSON.parse(plaintext) as T;
}

export function hashPin(pin: string, saltB64: string): string {
  const key = deriveKey(pin, saltB64);
  return CryptoJS.enc.Base64.stringify(key);
}

export function newSalt(): string {
  return randomBase64(16);
}
