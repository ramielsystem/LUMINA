import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

import { colors, radii, spacing, typography } from "@/src/lib/theme";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { GlassCard } from "@/src/components/GlassCard";
import { isValidBase32, sanitizeSecret, TOTPAlgorithm } from "@/src/lib/totp";
import { newAccountId, VaultAccount } from "@/src/lib/vault";
import { useLock } from "@/src/contexts/LockContext";
import { useToast } from "@/src/components/Toast";

const ALGORITHMS: TOTPAlgorithm[] = ["SHA1", "SHA256", "SHA512"];

export default function ManualScreen() {
  const router = useRouter();
  const { vault, updateVault } = useLock();
  const toast = useToast();

  const [issuer, setIssuer] = useState("");
  const [account, setAccount] = useState("");
  const [secret, setSecret] = useState("");
  const [digits, setDigits] = useState<6 | 8>(6);
  const [period, setPeriod] = useState<number>(30);
  const [algorithm, setAlgorithm] = useState<TOTPAlgorithm>("SHA1");
  const [steam, setSteam] = useState(false);
  const [category, setCategory] = useState<string>("Personal");
  const [error, setError] = useState<string | null>(null);

  const categories = vault?.categories ?? ["Personal", "Work"];

  const save = async () => {
    setError(null);
    const cleanSecret = sanitizeSecret(secret);
    if (!issuer.trim()) return setError("Service name required");
    if (!isValidBase32(cleanSecret)) return setError("Secret must be valid Base32 (A-Z, 2-7)");
    const now = Date.now();
    const acc: VaultAccount = {
      id: newAccountId(),
      issuer: issuer.trim(),
      account: account.trim(),
      secret: cleanSecret,
      digits,
      period,
      algorithm,
      steam,
      favorite: false,
      category,
      iconUrl: null,
      createdAt: now,
      updatedAt: now,
    };
    await updateVault((draft) => {
      draft.accounts = [acc, ...draft.accounts];
      return draft;
    });
    toast.show(`Added ${acc.issuer}`);
    router.replace("/(tabs)/vault");
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]} testID="manual-screen">
      <ScreenHeader title="Manual entry" />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <GlassCard style={styles.card}>
            <Field label="Service name">
              <TextInput
                testID="manual-issuer"
                value={issuer}
                onChangeText={setIssuer}
                placeholder="e.g. GitHub"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
                autoCapitalize="words"
              />
            </Field>
            <Field label="Account (email/username)">
              <TextInput
                testID="manual-account"
                value={account}
                onChangeText={setAccount}
                placeholder="you@example.com"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </Field>
            <Field label="Secret key">
              <TextInput
                testID="manual-secret"
                value={secret}
                onChangeText={setSecret}
                placeholder="JBSWY3DPEHPK3PXP"
                placeholderTextColor={colors.textMuted}
                style={[styles.input, styles.mono]}
                autoCapitalize="characters"
                autoCorrect={false}
              />
            </Field>
          </GlassCard>

          <GlassCard style={styles.card}>
            <RowGroup label="Digits">
              <Segmented
                testID="manual-digits"
                options={["6", "8"]}
                value={String(digits)}
                onChange={(v) => setDigits(v === "8" ? 8 : 6)}
              />
            </RowGroup>
            <RowGroup label="Period (seconds)">
              <Segmented
                testID="manual-period"
                options={["30", "60"]}
                value={String(period)}
                onChange={(v) => setPeriod(parseInt(v, 10))}
              />
            </RowGroup>
            <RowGroup label="Algorithm">
              <Segmented
                testID="manual-algo"
                options={ALGORITHMS}
                value={algorithm}
                onChange={(v) => setAlgorithm(v as TOTPAlgorithm)}
              />
            </RowGroup>
            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowLabel}>Steam Guard</Text>
                <Text style={styles.rowSub}>Use Steam's custom 5-character code</Text>
              </View>
              <Switch
                testID="manual-steam"
                value={steam}
                onValueChange={setSteam}
                trackColor={{ true: colors.primary, false: colors.surfaceHighlight }}
              />
            </View>
          </GlassCard>

          <GlassCard style={styles.card}>
            <Text style={styles.groupLabel}>Folder</Text>
            <View style={styles.categoryRow}>
              {categories.map((c) => {
                const active = c === category;
                return (
                  <Pressable
                    key={c}
                    testID={`manual-cat-${c}`}
                    onPress={() => setCategory(c)}
                    style={[styles.catChip, active && styles.catChipActive]}
                  >
                    <Text style={[styles.catChipText, active && styles.catChipTextActive]}>{c}</Text>
                  </Pressable>
                );
              })}
            </View>
          </GlassCard>

          {error && (
            <Text style={styles.error} testID="manual-error">
              {error}
            </Text>
          )}

          <Pressable testID="manual-save-btn" onPress={save} style={styles.cta}>
            <LinearGradient colors={[colors.primary, colors.secondary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
            <Ionicons name="checkmark" size={20} color={colors.base} />
            <Text style={styles.ctaText}>Save account</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.groupLabel}>{label}</Text>
      {children}
    </View>
  );
}

function RowGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={styles.rowLabel}>{label}</Text>
      {children}
    </View>
  );
}

function Segmented({
  options,
  value,
  onChange,
  testID,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
  testID?: string;
}) {
  return (
    <View style={styles.segmented} testID={testID}>
      {options.map((o) => {
        const active = o === value;
        return (
          <Pressable
            key={o}
            onPress={() => onChange(o)}
            testID={`${testID}-${o}`}
            style={[styles.segmentedItem, active && styles.segmentedItemActive]}
          >
            <Text style={[styles.segmentedText, active && styles.segmentedTextActive]}>{o}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "transparent" },
  scroll: { padding: 20, gap: 16, paddingBottom: 40 },
  card: { gap: 16 },
  groupLabel: { color: colors.textMuted, fontSize: 12, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase" },
  input: {
    borderColor: colors.glassBorder,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: colors.textPrimary,
    fontSize: 16,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  mono: { letterSpacing: 2, fontFamily: Platform.select({ ios: "Menlo", android: "monospace" }) },
  segmented: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: radii.pill,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    gap: 4,
  },
  segmentedItem: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 10, borderRadius: radii.pill },
  segmentedItemActive: { backgroundColor: colors.primary },
  segmentedText: { color: colors.textSecondary, fontWeight: "600", fontSize: 13 },
  segmentedTextActive: { color: colors.base },
  rowLabel: { color: colors.textPrimary, fontSize: 14, fontWeight: "600" },
  rowSub: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  switchRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  categoryRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  catChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  catChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  catChipText: { color: colors.textSecondary, fontSize: 13, fontWeight: "600" },
  catChipTextActive: { color: colors.base },
  error: { color: colors.danger, marginLeft: 4 },
  cta: {
    height: 56,
    borderRadius: radii.pill,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: spacing.sm,
  },
  ctaText: { color: colors.base, fontWeight: "700", fontSize: 16 },
});
