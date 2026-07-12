import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import * as LocalAuthentication from "expo-local-authentication";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors, radii, spacing, typography } from "@/src/lib/theme";
import { PinPad } from "@/src/components/PinPad";
import {
  enableBiometric,
  loadVault,
  setupPin,
} from "@/src/lib/vault";
import { useLock } from "@/src/contexts/LockContext";
import { useToast } from "@/src/components/Toast";

type Step = "intro" | "pin" | "confirm" | "biometric";

export default function Onboarding() {
  const [step, setStep] = useState<Step>("intro");
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { markOnboardedUnlock } = useLock();
  const toast = useToast();

  const finalize = async (enableBio: boolean) => {
    await setupPin(pin);
    if (enableBio) await enableBiometric(pin);
    const data = await loadVault(pin);
    markOnboardedUnlock(pin, data);
    toast.show("Vault created — welcome to Lumina!", "success");
    router.replace("/(tabs)/vault");
  };

  const onPinComplete = (v: string) => {
    setPin(v);
    setStep("confirm");
  };

  const onConfirmComplete = async (v: string) => {
    setConfirm(v);
    if (v !== pin) {
      setError("PINs don't match. Try again.");
      setPin("");
      setConfirm("");
      setStep("pin");
      return;
    }
    // Ask about biometrics
    const supported = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    if (supported && enrolled) {
      setStep("biometric");
    } else {
      await finalize(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <LinearGradient
        colors={["rgba(0, 240, 255, 0.12)", "rgba(123, 97, 255, 0.10)", "rgba(0, 0, 0, 0)"]}
        style={StyleSheet.absoluteFill}
      />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {step === "intro" && (
            <View style={styles.center} testID="onboarding-intro">
              <View style={styles.badge}>
                <Ionicons name="shield-checkmark" size={40} color={colors.primary} />
              </View>
              <Text style={styles.title}>Welcome to Lumina Auth</Text>
              <Text style={styles.body}>
                A premium, encrypted 2FA vault. Your secrets never leave this
                device unencrypted — not even to us.
              </Text>
              <View style={styles.features}>
                <Feature icon="lock-closed" text="AES-256 encrypted, PIN-protected vault" />
                <Feature icon="finger-print" text="Unlock with Face ID or Fingerprint" />
                <Feature icon="cloud-upload-outline" text="Optional encrypted cloud backup" />
              </View>
              <Pressable
                testID="onboarding-start-btn"
                onPress={() => setStep("pin")}
                style={styles.cta}
              >
                <LinearGradient
                  colors={[colors.primary, colors.secondary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <Text style={styles.ctaText}>Create your vault</Text>
                <Ionicons name="arrow-forward" size={20} color={colors.base} />
              </Pressable>
            </View>
          )}

          {(step === "pin" || step === "confirm") && (
            <View style={styles.pinWrap} testID={`onboarding-${step}`}>
              <Text style={styles.title}>
                {step === "pin" ? "Set a 6-digit PIN" : "Confirm your PIN"}
              </Text>
              <Text style={styles.body}>
                {step === "pin"
                  ? "You'll use this to unlock your vault."
                  : "Enter your PIN once more."}
              </Text>
              {error && (
                <Text style={styles.errorText} testID="onboarding-error">{error}</Text>
              )}
              <View style={styles.pinPadWrap}>
                <PinPad
                  value={step === "pin" ? pin : confirm}
                  onChange={step === "pin" ? setPin : setConfirm}
                  onComplete={step === "pin" ? onPinComplete : onConfirmComplete}
                />
              </View>
            </View>
          )}

          {step === "biometric" && (
            <View style={styles.center} testID="onboarding-biometric">
              <View style={styles.badge}>
                <Ionicons name="finger-print" size={44} color={colors.primary} />
              </View>
              <Text style={styles.title}>Unlock faster</Text>
              <Text style={styles.body}>
                Use Face ID / Touch ID / Fingerprint to unlock Lumina without
                typing your PIN. You can always fall back to the PIN.
              </Text>
              <View style={{ height: 24 }} />
              <Pressable
                testID="onboarding-enable-bio"
                onPress={() => finalize(true)}
                style={styles.cta}
              >
                <LinearGradient
                  colors={[colors.primary, colors.secondary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <Text style={styles.ctaText}>Enable biometrics</Text>
              </Pressable>
              <Pressable
                testID="onboarding-skip-bio"
                onPress={() => finalize(false)}
                style={styles.ctaGhost}
              >
                <Text style={styles.ctaGhostText}>Not now</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Feature({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.featureRow}>
      <Ionicons name={icon} size={18} color={colors.primary} />
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.base },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingVertical: 32 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 16 },
  badge: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 240, 255, 0.10)",
    borderColor: colors.neonBorder,
    borderWidth: 1,
    marginBottom: 12,
  },
  title: { ...typography.h1, color: colors.textPrimary, textAlign: "center" },
  body: { ...typography.body, color: colors.textSecondary, textAlign: "center", paddingHorizontal: 12 },
  features: { gap: 12, marginTop: 24, alignSelf: "stretch" },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  featureText: { color: colors.textPrimary, fontSize: 15 },
  cta: {
    marginTop: 24,
    height: 56,
    borderRadius: radii.pill,
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 32,
    alignSelf: "stretch",
  },
  ctaText: { color: colors.base, fontWeight: "700", fontSize: 16, letterSpacing: 0.3 },
  ctaGhost: {
    marginTop: 12,
    height: 48,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "stretch",
  },
  ctaGhostText: { color: colors.textSecondary, fontSize: 15, fontWeight: "600" },
  pinWrap: { flex: 1, alignItems: "center", gap: 12, paddingTop: 32 },
  pinPadWrap: { marginTop: spacing.xl },
  errorText: { color: colors.danger, marginTop: 4 },
});
