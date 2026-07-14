import { useMemo, useState, useEffect } from "react";
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
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { colors, radii, spacing, typography } from "@/src/lib/theme";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { GlassCard } from "@/src/components/GlassCard";
import { useLock } from "@/src/contexts/LockContext";
import { useToast } from "@/src/components/Toast";
import { VaultAccount } from "@/src/lib/vault";
import { AnimeSearchModal } from "@/src/components/AnimeSearchModal";
import { Anime } from "@/src/services/animeApi";

export default function EditAccount() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { vault, updateVault } = useLock();
  const toast = useToast();
  const acc = useMemo(() => vault?.accounts.find((a) => a.id === id), [vault, id]);

  const [issuer, setIssuer] = useState("");
  const [account, setAccount] = useState("");
  const [category, setCategory] = useState("Personal");
  const [favorite, setFavorite] = useState(false);
  const [animeSearchVisible, setAnimeSearchVisible] = useState(false);
  const [linkedAnime, setLinkedAnime] = useState<{ id: number; title: string; image: string; color?: string } | null>(null);

  useEffect(() => {
    if (acc) {
      setIssuer(acc.issuer);
      setAccount(acc.account);
      setCategory(acc.category);
      setFavorite(acc.favorite);
      if (acc.animeId) {
        setLinkedAnime({
          id: acc.animeId,
          title: acc.issuer, // We don't store the title separately, but we could
          image: acc.animeTheme?.bannerImage || "",
          color: acc.animeTheme?.primaryColor || undefined,
        });
      }
    }
  }, [acc]);

  if (!acc) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <ScreenHeader title="Account not found" />
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>This account no longer exists.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const categories = vault?.categories ?? ["Personal", "Work"];

  const save = async () => {
    await updateVault((draft) => {
      draft.accounts = draft.accounts.map((a) =>
        a.id === acc.id
          ? {
              ...a,
              issuer: issuer.trim() || a.issuer,
              account: account.trim(),
              category,
              favorite,
              animeId: linkedAnime?.id ?? null,
              animeTheme: linkedAnime ? {
                primaryColor: linkedAnime.color,
                bannerImage: linkedAnime.image,
              } : null,
              updatedAt: Date.now()
            }
          : a
      );
      return draft;
    });
    toast.show("Saved");
    router.back();
  };

  const handleSelectAnime = (anime: Anime) => {
    setLinkedAnime({
      id: anime.id,
      title: anime.title?.english || anime.title?.romaji || "Anime",
      image: anime.bannerImage || anime.coverImage?.extraLarge || anime.coverImage?.large || "",
      color: anime.coverImage?.color,
    });
    setAnimeSearchVisible(false);
  };

  const remove = async () => {
    await updateVault((draft) => {
      draft.accounts = draft.accounts.filter((a) => a.id !== acc.id);
      return draft;
    });
    toast.show("Deleted", "info");
    router.replace("/(tabs)/vault");
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]} testID="edit-screen">
      <ScreenHeader title="Edit account" subtitle={acc.issuer} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <GlassCard style={styles.card}>
            <Field label="Service name">
              <TextInput
                testID="edit-issuer"
                value={issuer}
                onChangeText={setIssuer}
                style={styles.input}
                autoCapitalize="words"
              />
            </Field>
            <Field label="Account">
              <TextInput
                testID="edit-account"
                value={account}
                onChangeText={setAccount}
                style={styles.input}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </Field>
            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowLabel}>Favorite</Text>
                <Text style={styles.rowSub}>Pin to the top of your vault</Text>
              </View>
              <Switch
                testID="edit-favorite"
                value={favorite}
                onValueChange={setFavorite}
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
                    testID={`edit-cat-${c}`}
                    onPress={() => setCategory(c)}
                    style={[styles.catChip, active && styles.catChipActive]}
                  >
                    <Text style={[styles.catChipText, active && styles.catChipTextActive]}>{c}</Text>
                  </Pressable>
                );
              })}
            </View>
          </GlassCard>

          <GlassCard style={styles.card}>
            <View style={styles.animeHeader}>
              <Text style={styles.groupLabel}>Estética Anime</Text>
              {linkedAnime && (
                <Pressable onPress={() => setLinkedAnime(null)}>
                  <Text style={[styles.deleteText, { fontSize: 12 }]}>Remover</Text>
                </Pressable>
              )}
            </View>
            
            {linkedAnime ? (
              <View style={styles.linkedAnimeInfo}>
                <Image source={{ uri: linkedAnime.image }} style={styles.animeBannerPreview} />
                <View style={styles.animeOverlay}>
                  <Text style={styles.animeLinkedTitle} numberOfLines={1}>{linkedAnime.title}</Text>
                  {linkedAnime.color && (
                    <View style={styles.colorIndicator}>
                      <View style={[styles.colorDot, { backgroundColor: linkedAnime.color }]} />
                      <Text style={styles.colorText}>Cor temática ativa</Text>
                    </View>
                  )}
                </View>
              </View>
            ) : (
              <Pressable style={styles.linkAnimeBtn} onPress={() => setAnimeSearchVisible(true)}>
                <Ionicons name="link" size={20} color={colors.primary} />
                <Text style={styles.linkAnimeText}>Vincular a um Anime</Text>
              </Pressable>
            )}
          </GlassCard>

          <GlassCard style={styles.card}>
            <Text style={styles.groupLabel}>TOTP parameters</Text>

            <ReadRow label="Digits" value={String(acc.digits)} />
            <ReadRow label="Period" value={`${acc.period}s`} />
            <ReadRow label="Algorithm" value={acc.algorithm} />
            <ReadRow label="Type" value={acc.steam ? "Steam Guard" : "Standard TOTP"} />
          </GlassCard>

          <Pressable testID="edit-save-btn" onPress={save} style={styles.cta}>
            <LinearGradient colors={[colors.primary, colors.secondary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
            <Ionicons name="save" size={20} color={colors.base} />
            <Text style={styles.ctaText}>Save changes</Text>
          </Pressable>
          <Pressable testID="edit-delete-btn" onPress={remove} style={styles.deleteBtn}>
            <Ionicons name="trash" size={18} color={colors.danger} />
            <Text style={styles.deleteText}>Delete account</Text>
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

function ReadRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.readRow}>
      <Text style={styles.readLabel}>{label}</Text>
      <Text style={styles.readValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.base },
  scroll: { padding: 20, gap: 16, paddingBottom: 40 },
  card: { gap: 16 },
  groupLabel: { color: colors.textMuted, fontSize: 12, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase" },
  rowLabel: { color: colors.textPrimary, fontSize: 14, fontWeight: "600" },
  rowSub: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
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
  switchRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  categoryRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  catChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.glassBorder, backgroundColor: "rgba(255,255,255,0.04)" },
  catChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  catChipText: { color: colors.textSecondary, fontSize: 13, fontWeight: "600" },
  catChipTextActive: { color: colors.base },
  readRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  readLabel: { color: colors.textSecondary, fontSize: 14 },
  readValue: { color: colors.textPrimary, fontSize: 14, fontWeight: "600" },
  cta: { height: 56, borderRadius: radii.pill, overflow: "hidden", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, marginTop: spacing.sm },
  ctaText: { color: colors.base, fontWeight: "700", fontSize: 16 },
  deleteBtn: { height: 52, borderRadius: radii.pill, borderWidth: 1, borderColor: "rgba(255,59,48,0.4)", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
  deleteText: { color: colors.danger, fontWeight: "600" },
  notFound: { flex: 1, alignItems: "center", justifyContent: "center" },
  notFoundText: { color: colors.textSecondary },
});
