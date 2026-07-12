// TOTP generation with support for standard TOTP (SHA1/256/512, digits, period)
// and Steam Guard. Built on top of `otpauth`.
import * as OTPAuth from "otpauth";

export type TOTPAlgorithm = "SHA1" | "SHA256" | "SHA512";

export interface TOTPParams {
  secret: string; // base32
  digits?: number; // 6 | 7 | 8
  period?: number; // seconds
  algorithm?: TOTPAlgorithm;
  steam?: boolean;
}

const STEAM_ALPHABET = "23456789BCDFGHJKMNPQRTVWXY";

// Steam Guard: TOTP-like but the truncated integer is converted into 5
// characters from a custom alphabet (base26). SHA1, 30s, secret is base32.
function generateSteamCode(secret: string, at: number = Date.now()): string {
  const counter = Math.floor(at / 1000 / 30);
  const hotp = new OTPAuth.HOTP({
    issuer: "Steam",
    algorithm: "SHA1",
    digits: 10,
    secret: OTPAuth.Secret.fromBase32(sanitizeSecret(secret)),
  });
  // Generate raw HMAC via internal counter. otpauth exposes .generate({ counter })
  // but returns a digits-length decimal string. We recompute using the underlying
  // dynamic truncation trick: request 10 digits, parse as int, then base26 encode.
  const decimal = hotp.generate({ counter });
  let value = parseInt(decimal, 10);
  let code = "";
  for (let i = 0; i < 5; i++) {
    code += STEAM_ALPHABET[value % STEAM_ALPHABET.length];
    value = Math.floor(value / STEAM_ALPHABET.length);
  }
  return code;
}

export function sanitizeSecret(secret: string): string {
  return secret.replace(/\s+/g, "").replace(/=+$/g, "").toUpperCase();
}

export function isValidBase32(secret: string): boolean {
  const cleaned = sanitizeSecret(secret);
  if (cleaned.length < 8) return false;
  return /^[A-Z2-7]+$/.test(cleaned);
}

export function generateCode(params: TOTPParams, at: number = Date.now()): string {
  const {
    secret,
    digits = 6,
    period = 30,
    algorithm = "SHA1",
    steam = false,
  } = params;
  if (steam) return generateSteamCode(secret, at);

  const totp = new OTPAuth.TOTP({
    algorithm,
    digits,
    period,
    secret: OTPAuth.Secret.fromBase32(sanitizeSecret(secret)),
  });
  return totp.generate({ timestamp: at });
}

export function secondsRemaining(period: number = 30, at: number = Date.now()): number {
  return period - (Math.floor(at / 1000) % period);
}

export function progressRatio(period: number = 30, at: number = Date.now()): number {
  const secs = period - (Math.floor(at / 1000) % period);
  return secs / period;
}
