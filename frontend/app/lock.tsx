import { useEffect, useState, useCallback } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as LocalAuthentication from "expo-local-authentication";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors, typography } from "@/src/lib/theme";
import { PinPad } from "@/src/components/PinPad";
import { useLock } from "@/src/contexts/LockContext";
import {
  getBiometricPassphrase,
  getSettings,
  isBiometricEnabled,
} from "@/src/lib/vault";
import { useToast } from "@/src/components/Toast";

export default function Lock() {
  const [pin, setPin] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [bioEnabled, setBioEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const { unlock, unlockWithPassphrase } = useLock();
  const toast = useToast();

  const tryBiometric = useCallback(async () => {
    setBusy(true);
    try {
      const hasHw = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!hasHw || !enrolled) {
        toast.show("Biometrics not available on this device", "info");
        return;
      }
      const res = await LocalAuthentication.authenticateAsync({
        promptMessage: "Unlock Lumina Auth",
        cancelLabel: "Use PIN",
        disableDeviceFallback: false,
      });
      if (!res.success) return;
      const pp = await getBiometricPassphrase();
      if (!pp) {
        toast.show("Biometric key missing — enter PIN", "error");
        return;
      }
      const ok = await unlockWithPassphrase(pp);
      if (!ok) toast.show("Vault could not be decrypted", "error");
    } finally {
      setBusy(false);
    }
  }, [toast, unlockWithPassphrase]);

  useEffect(() => {
    (async () => {
      const enabled = await isBiometricEnabled();
      setBioEnabled(enabled);
      const settings = await getSettings();
      if (enabled && settings.requireBiometricOnOpen) {
        // Auto-prompt on mount
        tryBiometric();
      }
    })();
  }, [tryBiometric]);

  const onComplete = async (v: string) => {
    setBusy(true);
    const ok = await unlock(v);
    setBusy(false);
    if (!ok) {
      setAttempts((a) => a + 1);
      setPin("");
      toast.show("Incorrect PIN", "error");
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]} testID="lock-screen">
      <LinearGradient
        colors={["rgba(0, 240, 255, 0.10)", "rgba(123, 97, 255, 0.08)", "rgba(0,0,0,0)"]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.header}>
        <View style={styles.badge}>
          <Ionicons name="shield-checkmark" size={32} color={colors.primary} />
        </View>
        <Text style={styles.brand}>LUMINA</Text>
        <Text style={styles.subtitle}>Enter PIN to unlock</Text>
      </View>
      <View style={styles.padWrap}>
        <PinPad
          value={pin}
          onChange={setPin}
          onComplete={onComplete}
          showBiometric={bioEnabled}
          onBiometric={tryBiometric}
          disabled={busy}
        />
        {attempts > 0 && (
          <Text style={styles.attempts} testID="lock-attempts">
            {attempts} failed attempt{attempts === 1 ? "" : "s"}
          </Text>
        )}
      </View>
      <Pressable
        testID="lock-biometric-btn"
        onPress={tryBiometric}
        style={styles.bioFallback}
        hitSlop={12}
      >
        <Ionicons name="finger-print" size={16} color={colors.primary} />
        <Text style={styles.bioFallbackText}>Use biometrics</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.base, alignItems: "center", justifyContent: "space-around", paddingVertical: 32 },
  header: { alignItems: "center", gap: 8 },
  badge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 240, 255, 0.10)",
    borderColor: colors.neonBorder,
    borderWidth: 1,
    marginBottom: 12,
  },
  brand: { ...typography.h1, color: colors.textPrimary, letterSpacing: 6 },
  subtitle: { color: colors.textSecondary, fontSize: 14, letterSpacing: 0.3 },
  padWrap: { alignItems: "center", gap: 16 },
  attempts: { color: colors.danger, fontSize: 13 },
  bioFallback: { flexDirection: "row", gap: 8, alignItems: "center" },
  bioFallbackText: { color: colors.primary, fontSize: 14, fontWeight: "600" },
});
