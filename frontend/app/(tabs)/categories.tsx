import { useMemo, useState } from "react";
import { FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";

import { colors, radii, spacing, typography } from "@/src/lib/theme";
import { BOTTOM_NAV_HEIGHT, BottomNav } from "@/src/components/BottomNav";
import { GlassCard } from "@/src/components/GlassCard";
import { useLock } from "@/src/contexts/LockContext";
import { useToast } from "@/src/components/Toast";

export default function CategoriesScreen() {
  const insets = useSafeAreaInsets();
  const { vault, updateVault } = useLock();
  const toast = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);

  const rows = useMemo(() => {

    const cats = vault?.categories ?? [];
    return cats.map((name) => {
      const count = (vault?.accounts ?? []).filter((a) => a.category === name).length;
      return { name, count };
    });
  }, [vault?.categories, vault?.accounts]);

  const addCategory = async () => {
    const name = newName.trim();
    if (!name || saving) return;
    if ((vault?.categories ?? []).some((c) => c.toLowerCase() === name.toLowerCase())) {
      toast.show("Essa pasta já existe", "error");
      return;
    }

    setSaving(true);
    setNewName("");
    setModalOpen(false);
    toast.show(`Criando pasta "${name}"...`, "info");

    try {
      await updateVault((draft) => {
        draft.categories = [...draft.categories, name];
        return draft;
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.show(`Pasta "${name}" criada`);
    } catch {
      toast.show("Não consegui criar a pasta agora", "error");
    } finally {
      setSaving(false);
    }
  };

  const removeCategory = async (name: string) => {
    await updateVault((draft) => {
      draft.categories = draft.categories.filter((c) => c !== name);
      draft.accounts = draft.accounts.map((a) => (a.category === name ? { ...a, category: "Personal" } : a));
      return draft;
    });
    toast.show(`Removed "${name}"`);
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]} testID="categories-screen">
      <View style={styles.header}>
        <Text style={styles.title}>Folders</Text>
        <Pressable testID="add-category-btn" onPress={() => setModalOpen(true)} style={styles.addBtn}>
          <LinearGradient colors={[colors.primary, colors.secondary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          <Ionicons name="add" size={24} color={colors.base} />
        </Pressable>
      </View>

      <FlatList
        data={rows}
        keyExtractor={(r) => r.name}
        contentContainerStyle={{ padding: 20, gap: 12, paddingBottom: BOTTOM_NAV_HEIGHT + insets.bottom + 24 }}
        renderItem={({ item }) => (
          <GlassCard style={styles.card}>
            <View style={styles.rowLeft}>
              <View style={styles.folderIcon}>
                <Ionicons name="folder" size={22} color={colors.primary} />
              </View>
              <View>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.subtext}>{item.count} {item.count === 1 ? "account" : "accounts"}</Text>
              </View>
            </View>
            <Pressable
              testID={`delete-category-${item.name}`}
              onPress={() => removeCategory(item.name)}
              hitSlop={12}
              style={styles.trash}
            >
              <Ionicons name="trash-outline" size={20} color={colors.danger} />
            </Pressable>
          </GlassCard>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No folders yet. Create one to organise your vault.</Text>
          </View>
        }
      />

      <Modal
        visible={modalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setModalOpen(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.modalCard} testID="category-modal">
            <Text style={styles.modalTitle}>New folder</Text>
            <TextInput
              testID="category-name-input"
              value={newName}
              onChangeText={setNewName}
              placeholder="Name (e.g. Crypto)"
              placeholderTextColor={colors.textMuted}
              autoFocus
              style={styles.input}
            />
            <View style={styles.modalActions}>
              <Pressable testID="category-cancel" onPress={() => setModalOpen(false)} style={styles.btnGhost}>
                <Text style={styles.btnGhostText}>Cancel</Text>
              </Pressable>
              <Pressable testID="category-save" onPress={addCategory} style={[styles.btnPrimary, saving && styles.btnDisabled]} disabled={saving}>
                <Text style={styles.btnPrimaryText}>{saving ? "Criando..." : "Add"}</Text>
              </Pressable>
            </View>
          </View>

        </KeyboardAvoidingView>
      </Modal>

      <BottomNav />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "transparent" },
  header: {
    paddingHorizontal: 24,
    paddingTop: 8,

    paddingBottom: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: { ...typography.h1, color: colors.textPrimary },
  addBtn: { width: 44, height: 44, borderRadius: 22, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  card: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 18 },
  rowLeft: { flexDirection: "row", alignItems: "center", gap: 14 },
  folderIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 240, 255, 0.10)",
    borderColor: colors.neonBorder,
    borderWidth: 1,
  },
  name: { ...typography.h3, color: colors.textPrimary },
  subtext: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  trash: { padding: 6 },
  empty: { padding: 40, alignItems: "center" },
  emptyText: { color: colors.textSecondary, textAlign: "center" },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    padding: 24,
    borderColor: colors.glassBorder,
    borderWidth: 1,
    gap: 16,
  },
  modalTitle: { ...typography.h2, color: colors.textPrimary },
  input: {
    borderColor: colors.glassBorder,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: colors.textPrimary,
    fontSize: 16,
  },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 10 },
  btnGhost: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  btnGhostText: { color: colors.textSecondary, fontWeight: "600" },
  btnPrimary: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
  },
  btnDisabled: {
    opacity: 0.55,
  },
  btnPrimaryText: { color: colors.base, fontWeight: "700" },
});
