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
import { LANGUAGES, useI18n } from "@/src/i18n";

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { passphrase, lock } = useLock();
  const toast = useToast();
  const { t, language, resolved } = useI18n();
  const [settings, setSettings] = useState<VaultSettings | null>(null);
  const [bio, setBio] = useState(false);
  const [bioAvailable, setBioAvailable] = useState(false);
  const [bioTypes, setBioTypes] = useState<string[]>([]);

  const reload = useCallback(async () => {
    const s = await getSettings();
    setSettings(s);
    setBio(await isBiometricEnabled());
    const hw = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    setBioAvailable(hw && enrolled);
    if (hw) {
      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
      const names = types.map((tp) => {
        switch (tp) {
          case LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION:
            return "Face ID";
          case LocalAuthentication.AuthenticationType.FINGERPRINT:
            return "Fingerprint";
          case LocalAuthentication.AuthenticationType.IRIS:
            return "Iris";
          default:
            return "Biometric";
        }
      });
      setBioTypes(names);
    }
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
        toast.show(t("biometricNotAvailable"), "error");
        return;
      }
      if (!passphrase) return;
      const res = await LocalAuthentication.authenticateAsync({
        promptMessage: t("biometricPromptTitle"),
      });
      if (!res.success) return;
      await enableBiometric(passphrase);
      setBio(true);
      toast.show(t("biometricWorking"));
    } else {
      await disableBiometric();
      setBio(false);
    }
  };

  const testBiometric = async () => {
    if (!bioAvailable) {
      toast.show(t("biometricNotAvailable"), "error");
      return;
    }
    const res = await LocalAuthentication.authenticateAsync({
      promptMessage: t("testBiometric"),
      disableDeviceFallback: true,
    });
    if (res.success) {
      toast.show(t("biometricWorking"), "success");
    } else {
      toast.show(t("biometricFailed"), "error");
    }
  };

  if (!settings) return null;

  const bioSubtitle = bioAvailable
    ? bioTypes.join(" / ") || "Face ID / Fingerprint"
    : t("biometricUnavailable");
  const languageLabel =
    language === "system"
      ? `System · ${LANGUAGES.find((l) => l.code === resolved)?.native ?? resolved}`
      : LANGUAGES.find((l) => l.code === language)?.native ?? language;

  return (
    <SafeAreaView style={styles.container} edges={["top"]} testID="settings-screen">
      <ScrollView
        contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: BOTTOM_NAV_HEIGHT + insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>{t("settingsTitle")}</Text>

        <SectionLabel>{t("sectionSecurity")}</SectionLabel>
        <GlassCard style={styles.card}>
          <SettingRow
            icon="finger-print"
            title={t("biometricUnlock")}
            subtitle={bioSubtitle}
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
          <PressRow
            testID="setting-test-biometric"
            icon="checkmark-done"
            title={t("testBiometric")}
            subtitle={t("testBiometricSub")}
            onPress={testBiometric}
            disabled={!bioAvailable}
          />
          <Divider />
          <SettingRow
            icon="shield-checkmark"
            title={t("requireBioOnOpen")}
            subtitle={t("requireBioOnOpenSub")}
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
            title={t("hideCodes")}
            subtitle={t("hideCodesSub")}
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
            title={t("autoLock")}
            subtitle={
              settings.autoLockSeconds === 0
                ? t("autoLockNever")
                : t("autoLockSecs", { secs: settings.autoLockSeconds })
            }
            onPress={() => {
              const options = [15, 30, 60, 120, 300, 0];
              const cur = options.indexOf(settings.autoLockSeconds);
              const next = options[(cur + 1) % options.length];
              patch({ autoLockSeconds: next });
            }}
          />
        </GlassCard>

        <SectionLabel>{t("sectionAppearance")}</SectionLabel>
        <GlassCard style={styles.card}>
          <PressRow
            testID="setting-language"
            icon="language"
            title={t("language")}
            subtitle={languageLabel}
            onPress={() => router.push("/language")}
          />
        </GlassCard>

        <SectionLabel>{t("sectionBackup")}</SectionLabel>
        <GlassCard style={styles.card}>
          <PressRow
            testID="setting-backup"
            icon="cloud-upload-outline"
            title={t("backupAndRestore")}
            subtitle={t("backupAndRestoreSub")}
            onPress={() => router.push("/backup")}
          />
          <Divider />
          <PressRow
            testID="setting-history"
            icon="time-outline"
            title={t("history")}
            subtitle={t("historySub", { state: settings.keepHistory ? t("historyOn") : t("historyOff") })}
            onPress={() => router.push("/history")}
          />
          <Divider />
          <SettingRow
            icon="save-outline"
            title={t("keepHistory")}
            subtitle={t("keepHistorySub")}
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

        <SectionLabel>{t("sectionSession")}</SectionLabel>
        <GlassCard style={styles.card}>
          <PressRow
            testID="setting-lock-now"
            icon="lock-closed"
            title={t("lockNow")}
            subtitle={t("lockNowSub")}
            onPress={() => {
              lock();
              router.replace("/lock");
            }}
          />
        </GlassCard>

        <SectionLabel>{t("sectionAbout")}</SectionLabel>
        <GlassCard style={styles.card}>
          <View style={styles.aboutRow}>
            <Ionicons name="shield-checkmark" size={22} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.aboutTitle}>{t("appName")}</Text>
              <Text style={styles.aboutSubtitle}>{t("appTagline")} · v1.0.0</Text>
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
  disabled,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  onPress: () => void;
  testID: string;
  disabled?: boolean;
}) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.row,
        pressed && { opacity: 0.7 },
        disabled && { opacity: 0.5 },
      ]}
    >
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
