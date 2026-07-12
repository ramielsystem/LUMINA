import { useEffect, useState, useCallback } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as LocalAuthentication from "expo-local-authentication";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors, typography } from "@/src/lib/theme";
import { PinPad } from "@/src/components/PinPad";
import { LuminaLogo } from "@/src/components/LuminaLogo";
import { useLock } from "@/src/contexts/LockContext";
import {
  getBiometricPassphrase,
  getSettings,
  hasCompletedFirstPinUnlock,
  isBiometricEnabled,
} from "@/src/lib/vault";
import { useToast } from "@/src/components/Toast";
import { useI18n } from "@/src/i18n";

export default function Lock() {
  const [pin, setPin] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [bioEnabled, setBioEnabled] = useState(false);
  const [firstPinDone, setFirstPinDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const { unlock, unlockWithPassphrase } = useLock();
  const toast = useToast();
  const { t } = useI18n();

  const tryBiometric = useCallback(async () => {
    setBusy(true);
    try {
      const hasHw = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!hasHw || !enrolled) {
        toast.show(t("biometricNotAvailable"), "info");
        return;
      }
      const res = await LocalAuthentication.authenticateAsync({
        promptMessage: t("enterPin"),
        cancelLabel: t("useBiometrics"),
        disableDeviceFallback: false,
      });
      if (!res.success) return;
      const pp = await getBiometricPassphrase();
      if (!pp) {
        toast.show(t("biometricKeyMissing"), "error");
        return;
      }
      const ok = await unlockWithPassphrase(pp);
      if (!ok) toast.show(t("vaultDecryptFailed"), "error");
    } finally {
      setBusy(false);
    }
  }, [toast, unlockWithPassphrase, t]);

  useEffect(() => {
    (async () => {
      const [enabled, done, settings] = await Promise.all([
        isBiometricEnabled(),
        hasCompletedFirstPinUnlock(),
        getSettings(),
      ]);
      setBioEnabled(enabled);
      setFirstPinDone(done);
      // Only auto-prompt biometric AFTER the user has successfully entered
      // their PIN at least once. This is the flow requested: first unlock
      // requires PIN; subsequent unlocks may use biometrics.
      if (enabled && done && settings.requireBiometricOnOpen) {
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
      toast.show(t("wrongPin"), "error");
    }
  };

  const showBiometricButton = bioEnabled && firstPinDone;

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]} testID="lock-screen">
      <LinearGradient
        colors={["rgba(0, 240, 255, 0.10)", "rgba(123, 97, 255, 0.08)", "rgba(0,0,0,0)"]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.header}>
        <LuminaLogo size={96} />
        <Text style={styles.brand}>LUMINA</Text>
        <Text style={styles.subtitle}>{t("enterPin")}</Text>
        {!firstPinDone && bioEnabled && (
          <Text style={styles.hint} testID="lock-first-pin-hint">
            Biometrics available after first PIN unlock
          </Text>
        )}
      </View>
      <View style={styles.padWrap}>
        <PinPad
          value={pin}
          onChange={setPin}
          onComplete={onComplete}
          showBiometric={showBiometricButton}
          onBiometric={tryBiometric}
          disabled={busy}
        />
        {attempts > 0 && (
          <Text style={styles.attempts} testID="lock-attempts">
            {attempts === 1 ? t("attemptFailed") : t("attemptsFailed", { count: attempts })}
          </Text>
        )}
      </View>
      {showBiometricButton ? (
        <Pressable
          testID="lock-biometric-btn"
          onPress={tryBiometric}
          style={styles.bioFallback}
          hitSlop={12}
        >
          <Ionicons name="finger-print" size={16} color={colors.primary} />
          <Text style={styles.bioFallbackText}>{t("useBiometrics")}</Text>
        </Pressable>
      ) : (
        <View style={{ height: 24 }} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.base, alignItems: "center", justifyContent: "space-around", paddingVertical: 32 },
  header: { alignItems: "center", gap: 6 },
  brand: { ...typography.h1, color: colors.textPrimary, letterSpacing: 6, marginTop: 8 },
  subtitle: { color: colors.textSecondary, fontSize: 14, letterSpacing: 0.3 },
  hint: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
  padWrap: { alignItems: "center", gap: 16 },
  attempts: { color: colors.danger, fontSize: 13 },
  bioFallback: { flexDirection: "row", gap: 8, alignItems: "center" },
  bioFallbackText: { color: colors.primary, fontSize: 14, fontWeight: "600" },
});
