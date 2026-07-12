// Vault: encrypted persistence + in-memory operations.
import { storage } from "@/src/utils/storage";
import { decryptJSON, encryptJSON, EncryptedBlob, hashPin, newSalt } from "./crypto";
import type { TOTPAlgorithm } from "./totp";

export interface VaultAccount {
  id: string;
  issuer: string;
  account: string;
  secret: string;
  digits: number;
  period: number;
  algorithm: TOTPAlgorithm;
  steam: boolean;
  favorite: boolean;
  category: string; // "Personal" | "Work" | "Crypto" | "Gaming" | custom
  iconUrl?: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface VaultData {
  version: number;
  accounts: VaultAccount[];
  categories: string[];
  history: HistoryEntry[];
}

export interface HistoryEntry {
  id: string;
  accountId: string;
  issuer: string;
  account: string;
  code: string;
  at: number; // epoch ms
}

const K_VAULT_BLOB = "luminaVaultBlob"; // secure — encrypted JSON
const K_PIN_HASH = "luminaPinHash"; // secure
const K_PIN_SALT = "luminaPinSalt"; // secure
const K_BIOMETRIC_ENABLED = "luminaBiometricEnabled"; // secure — stores the passphrase when biometric is enabled
const K_SETTINGS = "luminaSettings"; // plain KV
const K_ONBOARDED = "luminaOnboarded";

const DEFAULT_CATEGORIES = ["Personal", "Work", "Crypto", "Gaming"];

export const DEFAULT_SETTINGS = {
  requireBiometricOnOpen: true,
  requireBiometricForCodes: false,
  autoLockSeconds: 60,
  keepHistory: true,
  historyLimit: 200,
  theme: "dark" as "dark" | "light",
  accent: "#00F0FF",
};

export type Settings = typeof DEFAULT_SETTINGS;

// ---------- Settings ----------
export async function getSettings(): Promise<Settings> {
  const raw = await storage.getItem<string>(K_SETTINGS, "");
  if (!raw) return { ...DEFAULT_SETTINGS };
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveSettings(s: Partial<Settings>): Promise<Settings> {
  const current = await getSettings();
  const merged = { ...current, ...s };
  await storage.setItem(K_SETTINGS, JSON.stringify(merged));
  return merged;
}

// ---------- Onboarding + PIN ----------
export async function isOnboarded(): Promise<boolean> {
  const v = await storage.secureGet<string>(K_PIN_HASH, "");
  return !!v;
}

export async function setupPin(pin: string): Promise<void> {
  const salt = newSalt();
  const hash = hashPin(pin, salt);
  await storage.secureSet(K_PIN_SALT, salt);
  await storage.secureSet(K_PIN_HASH, hash);
  await storage.setItem(K_ONBOARDED, "1");
  // Initialise an empty encrypted vault
  const empty: VaultData = { version: 1, accounts: [], categories: DEFAULT_CATEGORIES, history: [] };
  const blob = encryptJSON(empty, pin);
  await storage.secureSet(K_VAULT_BLOB, JSON.stringify(blob));
}

export async function verifyPin(pin: string): Promise<boolean> {
  const salt = await storage.secureGet<string>(K_PIN_SALT, "");
  const stored = await storage.secureGet<string>(K_PIN_HASH, "");
  if (!salt || !stored) return false;
  return hashPin(pin, salt) === stored;
}

export async function changePin(oldPin: string, newPin: string): Promise<boolean> {
  const ok = await verifyPin(oldPin);
  if (!ok) return false;
  const data = await loadVault(oldPin);
  const salt = newSalt();
  const hash = hashPin(newPin, salt);
  await storage.secureSet(K_PIN_SALT, salt);
  await storage.secureSet(K_PIN_HASH, hash);
  await saveVault(data, newPin);
  // Update stored biometric passphrase if enabled
  const bio = await storage.secureGet<string>(K_BIOMETRIC_ENABLED, "");
  if (bio) await storage.secureSet(K_BIOMETRIC_ENABLED, newPin);
  return true;
}

// ---------- Biometric passphrase storage ----------
export async function enableBiometric(pin: string): Promise<void> {
  await storage.secureSet(K_BIOMETRIC_ENABLED, pin);
}

export async function disableBiometric(): Promise<void> {
  await storage.secureRemove(K_BIOMETRIC_ENABLED);
}

export async function isBiometricEnabled(): Promise<boolean> {
  const v = await storage.secureGet<string>(K_BIOMETRIC_ENABLED, "");
  return !!v;
}

export async function getBiometricPassphrase(): Promise<string | null> {
  const v = await storage.secureGet<string>(K_BIOMETRIC_ENABLED, "");
  return v || null;
}

// ---------- Vault CRUD ----------
export async function loadVault(passphrase: string): Promise<VaultData> {
  const raw = await storage.secureGet<string>(K_VAULT_BLOB, "");
  if (!raw) {
    return { version: 1, accounts: [], categories: [...DEFAULT_CATEGORIES], history: [] };
  }
  const blob = JSON.parse(raw) as EncryptedBlob;
  const data = decryptJSON<VaultData>(blob, passphrase);
  if (!data.categories) data.categories = [...DEFAULT_CATEGORIES];
  if (!data.history) data.history = [];
  return data;
}

export async function saveVault(data: VaultData, passphrase: string): Promise<void> {
  const blob = encryptJSON(data, passphrase);
  await storage.secureSet(K_VAULT_BLOB, JSON.stringify(blob));
}

export function newAccountId(): string {
  return "acc_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// ---------- Backup blob (encrypted) ----------
export async function exportEncrypted(data: VaultData, passphrase: string): Promise<EncryptedBlob> {
  return encryptJSON(data, passphrase);
}

export async function importEncrypted(
  blob: EncryptedBlob,
  passphrase: string
): Promise<VaultData> {
  return decryptJSON<VaultData>(blob, passphrase);
}

// ---------- Full wipe ----------
export async function wipeAll(): Promise<void> {
  await storage.secureRemove(K_VAULT_BLOB);
  await storage.secureRemove(K_PIN_HASH);
  await storage.secureRemove(K_PIN_SALT);
  await storage.secureRemove(K_BIOMETRIC_ENABLED);
  await storage.removeItem(K_SETTINGS);
  await storage.removeItem(K_ONBOARDED);
}
