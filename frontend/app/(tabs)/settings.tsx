import { useEffect, useState, useCallback } from "react";
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as LocalAuthentication from "expo-local-authentication";

import { colors, radii, typography } from "@/src/lib/theme";
import { BOTTOM_NAV_HEIGHT, BottomNav } from "@/src/components/BottomNav";
import { GlassCard } from "@/src/components/GlassCard";
import { useToast } from "@/src/components/Toast";
import { useLock } from "@/src/contexts/LockContext";
import {
  disableBiometric,
  enableBiometric,
  getSettings,
  isBiometricEnabled,
  saveSettings,
  Settings as VaultSettings,
} from "@/src/lib/vault";

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { passphrase, lock } = useLock();
  const toast = useToast();
  const [settings, setSettings] = useState<VaultSettings | null>(null);
  const [bio, setBio] = useState(false);
  const [bioAvailable, setBioAvailable] = useState(false);

  const reload = useCallback(async () => {
    const s = await getSettings();
    setSettings(s);
    setBio(await isBiometricEnabled());
    const hw = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    setBioAvailable(hw && enrolled);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const patch = async (p: Partial<VaultSettings>) => {
    const next = await saveSettings(p);
    setSettings(next);
  };

  const toggleBio = async (v: boolean) => {
    if (v) {
      if (!bioAvailable) {
        toast.show("Biometrics not available", "error");
        return;
      }
      if (!passphrase) return;
      const res = await LocalAuthentication.authenticateAsync({
        promptMessage: "Confirm to enable biometrics",
      });
      if (!res.success) return;
      await enableBiometric(passphrase);
      setBio(true);
      toast.show("Biometrics enabled");
    } else {
      await disableBiometric();
      setBio(false);
      toast.show("Biometrics disabled");
    }
  };

  if (!settings) return null;

  return (
    <SafeAreaView style={styles.container} edges={["top"]} testID="settings-screen">
      <ScrollView
        contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: BOTTOM_NAV_HEIGHT + insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Settings</Text>

        <SectionLabel>Security</SectionLabel>
        <GlassCard style={styles.card}>
          <SettingRow
            icon="finger-print"
            title="Biometric unlock"
            subtitle={bioAvailable ? "Face ID / Fingerprint" : "Not available on this device"}
            right={
              <Switch
                testID="setting-biometric"
                value={bio}
                onValueChange={toggleBio}
                disabled={!bioAvailable}
                trackColor={{ true: colors.primary, false: colors.surfaceHighlight }}
              />
            }
          />
          <Divider />
          <SettingRow
            icon="shield-checkmark"
            title="Require biometrics on open"
            subtitle="Auto-prompt when Lumina launches"
            right={
              <Switch
                testID="setting-bio-on-open"
                value={settings.requireBiometricOnOpen}
                onValueChange={(v) => patch({ requireBiometricOnOpen: v })}
                trackColor={{ true: colors.primary, false: colors.surfaceHighlight }}
              />
            }
          />
          <Divider />
          <SettingRow
            icon="eye-off"
            title="Hide codes by default"
            subtitle="Tap to reveal each code"
            right={
              <Switch
                testID="setting-hide-codes"
                value={settings.requireBiometricForCodes}
                onValueChange={(v) => patch({ requireBiometricForCodes: v })}
                trackColor={{ true: colors.primary, false: colors.surfaceHighlight }}
              />
            }
          />
          <Divider />
          <PressRow
            testID="setting-autolock"
            icon="timer-outline"
            title="Auto-lock"
            subtitle={settings.autoLockSeconds === 0 ? "Never" : `${settings.autoLockSeconds}s inactivity`}
            onPress={() => {
              const options = [15, 30, 60, 120, 300, 0];
              const cur = options.indexOf(settings.autoLockSeconds);
              const next = options[(cur + 1) % options.length];
              patch({ autoLockSeconds: next });
            }}
          />
        </GlassCard>

        <SectionLabel>Backup</SectionLabel>
        <GlassCard style={styles.card}>
          <PressRow
            testID="setting-backup"
            icon="cloud-upload-outline"
            title="Backup & Restore"
            subtitle="Encrypted export, cloud sync"
            onPress={() => router.push("/backup")}
          />
          <Divider />
          <PressRow
            testID="setting-history"
            icon="time-outline"
            title="History"
            subtitle={`${settings.keepHistory ? "On" : "Off"} · last copied codes`}
            onPress={() => router.push("/history")}
          />
          <Divider />
          <SettingRow
            icon="save-outline"
            title="Keep history"
            subtitle="Audit copied codes locally"
            right={
              <Switch
                testID="setting-keep-history"
                value={settings.keepHistory}
                onValueChange={(v) => patch({ keepHistory: v })}
                trackColor={{ true: colors.primary, false: colors.surfaceHighlight }}
              />
            }
          />
        </GlassCard>

        <SectionLabel>Session</SectionLabel>
        <GlassCard style={styles.card}>
          <PressRow
            testID="setting-lock-now"
            icon="lock-closed"
            title="Lock now"
            subtitle="Requires PIN to re-open"
            onPress={() => {
              lock();
              router.replace("/lock");
            }}
          />
        </GlassCard>

        <SectionLabel>About</SectionLabel>
        <GlassCard style={styles.card}>
          <View style={styles.aboutRow}>
            <Ionicons name="shield-checkmark" size={22} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.aboutTitle}>Lumina Auth</Text>
              <Text style={styles.aboutSubtitle}>Premium encrypted 2FA · v1.0.0</Text>
            </View>
          </View>
        </GlassCard>
      </ScrollView>
      <BottomNav />
    </SafeAreaView>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <Text style={styles.section}>{children}</Text>;
}

function SettingRow({
  icon,
  title,
  subtitle,
  right,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={20} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        {subtitle && <Text style={styles.rowSubtitle}>{subtitle}</Text>}
      </View>
      {right}
    </View>
  );
}

function PressRow({
  icon,
  title,
  subtitle,
  onPress,
  testID,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  onPress: () => void;
  testID: string;
}) {
  return (
    <Pressable testID={testID} onPress={onPress} style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={20} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        {subtitle && <Text style={styles.rowSubtitle}>{subtitle}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.base },
  title: { ...typography.h1, color: colors.textPrimary },
  section: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginTop: 8,
    marginLeft: 6,
  },
  card: { padding: 0 },
  row: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16 },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 240, 255, 0.10)",
    borderColor: colors.neonBorder,
    borderWidth: 1,
  },
  rowTitle: { color: colors.textPrimary, fontSize: 15, fontWeight: "600" },
  rowSubtitle: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.glassBorder, marginLeft: 70 },
  aboutRow: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16 },
  aboutTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: "700" },
  aboutSubtitle: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
});
