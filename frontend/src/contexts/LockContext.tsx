// LockContext manages the vault lock state, the in-memory passphrase, and the
// decrypted vault data. All child screens read from here.
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AppState, AppStateStatus } from "react-native";
import {
  getSettings,
  isOnboarded,
  loadVault,
  markFirstPinUnlockDone,
  saveVault,
  verifyPin,
  VaultData,
} from "@/src/lib/vault";

type LockState = "loading" | "onboarding" | "locked" | "unlocked";

interface Ctx {
  state: LockState;
  vault: VaultData | null;
  passphrase: string | null;
  refresh: () => Promise<void>;
  unlock: (pin: string) => Promise<boolean>;
  unlockWithPassphrase: (passphrase: string) => Promise<boolean>;
  lock: () => void;
  markOnboardedUnlock: (pin: string, data: VaultData) => void;
  saveVaultData: (data: VaultData) => Promise<void>;
  updateVault: (mut: (draft: VaultData) => VaultData) => Promise<void>;
}

const LockContext = createContext<Ctx | null>(null);

export function LockProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<LockState>("loading");
  const [vault, setVault] = useState<VaultData | null>(null);
  const [passphrase, setPassphrase] = useState<string | null>(null);
  const bgTimestamp = useRef<number | null>(null);

  const refresh = useCallback(async () => {
    const onboarded = await isOnboarded();
    if (!onboarded) {
      setState("onboarding");
      setVault(null);
      setPassphrase(null);
      return;
    }
    setState((cur) => (cur === "unlocked" ? "unlocked" : "locked"));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", async (next: AppStateStatus) => {
      const settings = await getSettings();
      if (next === "background" || next === "inactive") {
        bgTimestamp.current = Date.now();
      } else if (next === "active" && bgTimestamp.current) {
        const elapsed = (Date.now() - bgTimestamp.current) / 1000;
        bgTimestamp.current = null;
        if (elapsed >= (settings.autoLockSeconds ?? 60)) {
          setState((cur) => (cur === "unlocked" ? "locked" : cur));
          setVault(null);
          setPassphrase(null);
        }
      }
    });
    return () => sub.remove();
  }, []);

  const unlockWithPassphrase = useCallback(async (pp: string) => {
    try {
      const data = await loadVault(pp);
      setVault(data);
      setPassphrase(pp);
      setState("unlocked");
      return true;
    } catch {
      return false;
    }
  }, []);

  const unlock = useCallback(
    async (pin: string) => {
      const ok = await verifyPin(pin);
      if (!ok) return false;
      const success = await unlockWithPassphrase(pin);
      if (success) {
        // Mark that at least one successful PIN unlock has happened, so
        // subsequent app-opens may auto-prompt biometrics.
        await markFirstPinUnlockDone();
      }
      return success;
    },
    [unlockWithPassphrase]
  );

  const lock = useCallback(() => {
    setState("locked");
    setVault(null);
    setPassphrase(null);
  }, []);

  const markOnboardedUnlock = useCallback((pin: string, data: VaultData) => {
    setPassphrase(pin);
    setVault(data);
    setState("unlocked");
  }, []);

  const saveVaultData = useCallback(
    async (data: VaultData) => {
      if (!passphrase) throw new Error("Vault not unlocked");
      await saveVault(data, passphrase);
      setVault({ ...data });
    },
    [passphrase]
  );

  const updateVault = useCallback(
    async (mut: (draft: VaultData) => VaultData) => {
      if (!vault || !passphrase) throw new Error("Vault not unlocked");
      const next = mut({ ...vault, accounts: [...vault.accounts], categories: [...vault.categories], history: [...vault.history] });
      await saveVault(next, passphrase);
      setVault(next);
    },
    [vault, passphrase]
  );

  const value = useMemo<Ctx>(
    () => ({ state, vault, passphrase, refresh, unlock, unlockWithPassphrase, lock, markOnboardedUnlock, saveVaultData, updateVault }),
    [state, vault, passphrase, refresh, unlock, unlockWithPassphrase, lock, markOnboardedUnlock, saveVaultData, updateVault]
  );

  return <LockContext.Provider value={value}>{children}</LockContext.Provider>;
}

export function useLock() {
  const c = useContext(LockContext);
  if (!c) throw new Error("useLock must be used inside <LockProvider>");
  return c;
}
