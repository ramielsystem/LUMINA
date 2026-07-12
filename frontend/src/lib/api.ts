// Backend API client for Emergent Auth + encrypted cloud backup.
import { storage } from "@/src/utils/storage";
import type { EncryptedBlob } from "./crypto";

const BASE = process.env.EXPO_PUBLIC_BACKEND_URL || "";
const K_SESSION = "luminaSessionToken";

export interface AuthUser {
  user_id: string;
  email: string;
  name: string;
  picture?: string | null;
}

export async function saveSessionToken(token: string): Promise<void> {
  await storage.secureSet(K_SESSION, token);
}

export async function getSessionToken(): Promise<string | null> {
  const v = await storage.secureGet<string>(K_SESSION, "");
  return v || null;
}

export async function clearSessionToken(): Promise<void> {
  await storage.secureRemove(K_SESSION);
}

async function req<T>(path: string, opts: RequestInit = {}, auth = true): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(opts.headers as Record<string, string> | undefined),
  };
  if (auth) {
    const token = await getSessionToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const resp = await fetch(`${BASE}/api${path}`, { ...opts, headers });
  if (!resp.ok) {
    const body = await resp.text().catch(() => "");
    throw new Error(`API ${resp.status}: ${body || resp.statusText}`);
  }
  const text = await resp.text();
  return text ? (JSON.parse(text) as T) : (null as T);
}

export async function exchangeSession(sessionToken: string): Promise<AuthUser> {
  const user = await req<AuthUser>(
    "/auth/session",
    { method: "POST", body: JSON.stringify({ session_token: sessionToken }) },
    false
  );
  await saveSessionToken(sessionToken);
  return user;
}

export async function fetchMe(): Promise<AuthUser | null> {
  try {
    return await req<AuthUser>("/auth/me", { method: "GET" });
  } catch {
    return null;
  }
}

export async function logout(): Promise<void> {
  try {
    await req("/auth/logout", { method: "POST" });
  } catch {
    // ignore
  }
  await clearSessionToken();
}

export async function uploadBackup(blob: EncryptedBlob, deviceName: string): Promise<void> {
  await req("/backup", {
    method: "POST",
    body: JSON.stringify({ ...blob, device_name: deviceName }),
  });
}

export interface RemoteBackup extends EncryptedBlob {
  updated_at: string;
  device_name?: string | null;
}

export async function downloadBackup(): Promise<RemoteBackup | null> {
  return await req<RemoteBackup | null>("/backup", { method: "GET" });
}

export async function deleteBackup(): Promise<void> {
  await req("/backup", { method: "DELETE" });
}
