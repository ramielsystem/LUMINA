import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as DocumentPicker from "expo-document-picker";

import { colors, radii, typography } from "@/src/lib/theme";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { GlassCard } from "@/src/components/GlassCard";
import { useLock } from "@/src/contexts/LockContext";
import { useAuth } from "@/src/contexts/AuthContext";
import { useToast } from "@/src/components/Toast";
import { encryptJSON, decryptJSON, EncryptedBlob } from "@/src/lib/crypto";
import { downloadBackup, uploadBackup, deleteBackup } from "@/src/lib/api";
import { VaultData } from "@/src/lib/vault";

type ModalMode = null | "export" | "import" | "cloud-upload" | "cloud-restore";

export default function BackupScreen() {
  const { vault, updateVault } = useLock();
  const { user, signIn, signOut } = useAuth();
  const toast = useToast();
  const [mode, setMode] = useState<ModalMode>(null);
  const [pw, setPw] = useState("");
  const [pendingBlob, setPendingBlob] = useState<EncryptedBlob | null>(null);
  const [lastCloud, setLastCloud] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      if (!user) {
        setLastCloud(null);
        return;
      }
      try {
        const rb = await downloadBackup();
        setLastCloud(rb ? new Date(rb.updated_at).toLocaleString() : null);
      } catch {
        setLastCloud(null);
      }
    })();
  }, [user]);

  const startExport = () => {
    setPw("");
    setMode("export");
  };

  const doExport = async () => {
    if (!vault) return;
    if (pw.length < 6) return toast.show("Passphrase must be at least 6 chars", "error");
    try {
      setBusy(true);
      const blob = encryptJSON(vault, pw);
      const filename = `lumina-backup-${new Date().toISOString().slice(0, 10)}.json`;
      const uri = `${FileSystem.cacheDirectory}${filename}`;
      const payload = JSON.stringify({ app: "lumina-auth", ...blob }, null, 2);
      await FileSystem.writeAsStringAsync(uri, payload);
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, { mimeType: "application/json", dialogTitle: "Lumina Auth backup" });
      } else {
        toast.show(`Saved to ${uri}`);
      }
      setMode(null);
    } catch (e) {
      toast.show("Export failed", "error");
    } finally {
      setBusy(false);
    }
  };

  const pickImport = async () => {
    const res = await DocumentPicker.getDocumentAsync({ type: ["application/json"], copyToCacheDirectory: true });
    if (res.canceled || !res.assets?.length) return;
    try {
      const content = await FileSystem.readAsStringAsync(res.assets[0].uri);
      const parsed = JSON.parse(content);
      if (!parsed.ciphertext || !parsed.iv || !parsed.salt) throw new Error();
      setPendingBlob({ ciphertext: parsed.ciphertext, iv: parsed.iv, salt: parsed.salt, version: parsed.version ?? 1 });
      setPw("");
      setMode("import");
    } catch {
      toast.show("Not a valid Lumina backup file", "error");
    }
  };

  const doImport = async () => {
    if (!pendingBlob) return;
    try {
      setBusy(true);
      const data = decryptJSON<VaultData>(pendingBlob, pw);
      await updateVault(() => data);
      toast.show(`Imported ${data.accounts?.length ?? 0} accounts`);
      setMode(null);
      setPendingBlob(null);
    } catch {
      toast.show("Wrong passphrase or corrupted file", "error");
    } finally {
      setBusy(false);
    }
  };

  const startCloudUpload = () => {
    setPw("");
    setMode("cloud-upload");
  };

  const doCloudUpload = async () => {
    if (!vault) return;
    if (pw.length < 6) return toast.show("Passphrase must be at least 6 chars", "error");
    try {
      setBusy(true);
      const blob = encryptJSON(vault, pw);
      await uploadBackup(blob, Platform.OS + " device");
      const rb = await downloadBackup();
      setLastCloud(rb ? new Date(rb.updated_at).toLocaleString() : null);
      toast.show("Backup uploaded");
      setMode(null);
    } catch {
      toast.show("Upload failed", "error");
    } finally {
      setBusy(false);
    }
  };

  const startCloudRestore = () => {
    setPw("");
    setMode("cloud-restore");
  };

  const doCloudRestore = async () => {
    try {
      setBusy(true);
      const rb = await downloadBackup();
      if (!rb) return toast.show("No cloud backup found", "info");
      const data = decryptJSON<VaultData>(rb, pw);
      await updateVault(() => data);
      toast.show(`Restored ${data.accounts?.length ?? 0} accounts`);
      setMode(null);
    } catch {
      toast.show("Wrong passphrase or corrupted backup", "error");
    } finally {
      setBusy(false);
    }
  };

  const doDeleteCloud = async () => {
    try {
      await deleteBackup();
      setLastCloud(null);
      toast.show("Cloud backup deleted");
    } catch {
      toast.show("Delete failed", "error");
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]} testID="backup-screen">
      <ScreenHeader title="Backup & Restore" subtitle="Your data stays encrypted end-to-end" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <GlassCard style={styles.card}>
          <Text style={styles.groupLabel}>Local backup</Text>
          <Text style={styles.body}>
            Export your vault as an encrypted JSON file. Choose a strong
            passphrase — it's the only way to decrypt the backup later.
          </Text>
          <ActionRow icon="download-outline" title="Export encrypted file" onPress={startExport} testID="backup-export-btn" />
          <ActionRow icon="cloud-upload-outline" title="Import from file" onPress={pickImport} testID="backup-import-btn" />
        </GlassCard>

        <GlassCard style={styles.card}>
          <Text style={styles.groupLabel}>Cloud backup</Text>
          {!user ? (
            <>
              <Text style={styles.body}>
                Sign in with Google to sync an encrypted copy of your vault
                across devices. We only ever see ciphertext.
              </Text>
              <Pressable testID="cloud-signin-btn" onPress={signIn} style={styles.cta}>
                <LinearGradient colors={[colors.primary, colors.secondary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
                <Ionicons name="logo-google" size={18} color={colors.base} />
                <Text style={styles.ctaText}>Sign in with Google</Text>
              </Pressable>
            </>
          ) : (
            <>
              <View style={styles.userRow}>
                <View style={styles.userAvatar}>
                  <Text style={styles.userAvatarText}>
                    {(user.name?.[0] || user.email?.[0] || "?").toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.userName}>{user.name || "Signed in"}</Text>
                  <Text style={styles.userEmail}>{user.email}</Text>
                  {lastCloud && <Text style={styles.userSub}>Backup: {lastCloud}</Text>}
                </View>
                <Pressable testID="cloud-signout-btn" onPress={signOut} hitSlop={12}>
                  <Ionicons name="log-out-outline" size={22} color={colors.textSecondary} />
                </Pressable>
              </View>
              <ActionRow icon="cloud-upload" title="Upload encrypted backup" onPress={startCloudUpload} testID="cloud-upload-btn" />
              <ActionRow icon="cloud-download" title="Restore from cloud" onPress={startCloudRestore} testID="cloud-restore-btn" disabled={!lastCloud} />
              {lastCloud && (
                <ActionRow icon="trash" title="Delete cloud backup" onPress={doDeleteCloud} testID="cloud-delete-btn" danger />
              )}
            </>
          )}
        </GlassCard>
      </ScrollView>

      <Modal visible={!!mode} transparent animationType="fade" onRequestClose={() => setMode(null)}>
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.modalCard} testID="backup-modal">
            <Text style={styles.modalTitle}>
              {mode === "export" && "Set export passphrase"}
              {mode === "import" && "Enter passphrase"}
              {mode === "cloud-upload" && "Set backup passphrase"}
              {mode === "cloud-restore" && "Enter backup passphrase"}
            </Text>
            <Text style={styles.modalBody}>
              {mode === "export" || mode === "cloud-upload"
                ? "This passphrase encrypts your backup. If lost, the backup is unrecoverable."
                : "The passphrase used when creating this backup."}
            </Text>
            <TextInput
              testID="backup-modal-pw"
              value={pw}
              onChangeText={setPw}
              placeholder="Passphrase (min 6 chars)"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              autoFocus
              style={styles.input}
            />
            <View style={styles.modalActions}>
              <Pressable testID="backup-modal-cancel" onPress={() => setMode(null)} style={styles.btnGhost}>
                <Text style={styles.btnGhostText}>Cancel</Text>
              </Pressable>
              <Pressable
                testID="backup-modal-confirm"
                onPress={
                  mode === "export"
                    ? doExport
                    : mode === "import"
                      ? doImport
                      : mode === "cloud-upload"
                        ? doCloudUpload
                        : doCloudRestore
                }
                disabled={busy}
                style={[styles.btnPrimary, busy && { opacity: 0.6 }]}
              >
                <Text style={styles.btnPrimaryText}>{busy ? "..." : "Continue"}</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

function ActionRow({
  icon,
  title,
  onPress,
  testID,
  disabled,
  danger,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  onPress: () => void;
  testID: string;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.actionRow,
        pressed && { opacity: 0.7 },
        disabled && { opacity: 0.4 },
      ]}
    >
      <View style={[styles.actionIcon, danger && { backgroundColor: "rgba(255,59,48,0.10)", borderColor: "rgba(255,59,48,0.4)" }]}>
        <Ionicons name={icon} size={20} color={danger ? colors.danger : colors.primary} />
      </View>
      <Text style={[styles.actionTitle, danger && { color: colors.danger }]}>{title}</Text>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "transparent" },
  scroll: { padding: 20, gap: 16, paddingBottom: 40 },
  card: { gap: 12 },
  groupLabel: { color: colors.textMuted, fontSize: 12, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase" },
  body: { color: colors.textSecondary, fontSize: 13, lineHeight: 18 },
  actionRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
  actionIcon: { width: 40, height: 40, borderRadius: radii.md, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0, 240, 255, 0.10)", borderColor: colors.neonBorder, borderWidth: 1 },
  actionTitle: { flex: 1, color: colors.textPrimary, fontSize: 15, fontWeight: "600" },
  cta: { marginTop: 8, height: 52, borderRadius: radii.pill, overflow: "hidden", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
  ctaText: { color: colors.base, fontWeight: "700", fontSize: 15 },
  userRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 4 },
  userAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: colors.primary },
  userAvatarText: { color: colors.base, fontWeight: "700", fontSize: 18 },
  userName: { color: colors.textPrimary, fontSize: 15, fontWeight: "600" },
  userEmail: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  userSub: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.75)", alignItems: "center", justifyContent: "center", padding: 24 },
  modalCard: { width: "100%", borderRadius: radii.xl, backgroundColor: colors.surface, padding: 24, borderColor: colors.glassBorder, borderWidth: 1, gap: 12 },
  modalTitle: { ...typography.h2, color: colors.textPrimary },
  modalBody: { color: colors.textSecondary, fontSize: 13, lineHeight: 18 },
  input: { borderColor: colors.glassBorder, borderWidth: 1, borderRadius: radii.md, paddingHorizontal: 14, paddingVertical: 14, color: colors.textPrimary, fontSize: 16, marginTop: 4 },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 10 },
  btnGhost: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.glassBorder },
  btnGhostText: { color: colors.textSecondary, fontWeight: "600" },
  btnPrimary: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: radii.pill, backgroundColor: colors.primary },
  btnPrimaryText: { color: colors.base, fontWeight: "700" },
});
