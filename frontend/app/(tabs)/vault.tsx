import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { colors, radii, spacing, typography } from "@/src/lib/theme";
import { VaultCard } from "@/src/components/VaultCard";
import { BOTTOM_NAV_HEIGHT, BottomNav } from "@/src/components/BottomNav";
import { useLock } from "@/src/contexts/LockContext";
import { HistoryEntry, VaultAccount, getSettings } from "@/src/lib/vault";
import { useI18n } from "@/src/i18n";

const TICK_MS = 1000;

export default function VaultScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { vault, updateVault } = useLock();
  const { t } = useI18n();

  const [now, setNow] = useState(Date.now());
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>(t("categoryAll"));
  const [hideCodes, setHideCodes] = useState(false);
  const historyBuffer = useRef<HistoryEntry[]>([]);

  useEffect(() => {
    (async () => {
      const s = await getSettings();
      setHideCodes(!!s.requireBiometricForCodes);
    })();
  }, []);

  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(iv);
  }, []);

  const accounts = vault?.accounts ?? [];
  const categories = useMemo(() => {
    const cats = new Set<string>();
    (vault?.categories ?? []).forEach((c) => cats.add(c));
    accounts.forEach((a) => a.category && cats.add(a.category));
    return [t("categoryAll"), t("categoryFavorites"), ...Array.from(cats)];
  }, [vault?.categories, accounts, t]);

  const allLabel = t("categoryAll");
  const favLabel = t("categoryFavorites");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = accounts.filter((a) => {
      if (category === favLabel) return a.favorite;
      if (category !== allLabel && a.category !== category) return false;
      return true;
    });
    if (q) {
      list = list.filter((a) =>
        `${a.issuer} ${a.account}`.toLowerCase().includes(q)
      );
    }
    // Favorites first, then alphabetical
    list.sort((a, b) => {
      if (a.favorite !== b.favorite) return a.favorite ? -1 : 1;
      return a.issuer.localeCompare(b.issuer);
    });
    return list;
  }, [accounts, query, category, allLabel, favLabel]);

  useEffect(() => {
    // Keep the selected chip in sync when the language changes: if we were
    // on "All"/"Favorites" and their labels moved, snap back to All.
    if (category !== allLabel && category !== favLabel && !categories.includes(category)) {
      setCategory(allLabel);
    }
  }, [categories, category, allLabel, favLabel]);

  const toggleFavorite = async (id: string) => {
    await Haptics.selectionAsync();
    await updateVault((draft) => {
      draft.accounts = draft.accounts.map((a) =>
        a.id === id ? { ...a, favorite: !a.favorite, updatedAt: Date.now() } : a
      );
      return draft;
    });
  };

  const onCopy = (acc: VaultAccount, code: string) => {
    historyBuffer.current.push({
      id: `h_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      accountId: acc.id,
      issuer: acc.issuer,
      account: acc.account,
      code,
      at: Date.now(),
    });
    // Flush every few copies to reduce writes
    if (historyBuffer.current.length >= 1) {
      const toFlush = [...historyBuffer.current];
      historyBuffer.current = [];
      (async () => {
        const s = await getSettings();
        if (!s.keepHistory) return;
        await updateVault((draft) => {
          draft.history = [...toFlush, ...draft.history].slice(0, s.historyLimit);
          return draft;
        });
      })();
    }
  };

  const renderItem = React.useCallback(
    ({ item }: { item: VaultAccount }) => (
      <VaultCard
        account={item}
        now={now}
        hidden={hideCodes}
        onToggleFavorite={toggleFavorite}
        onPress={(id) => router.push({ pathname: "/edit/[id]", params: { id } })}
        onCopy={onCopy}
      />
    ),
    [now, hideCodes, toggleFavorite, onCopy]
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]} testID="vault-screen">
      <View style={styles.header}>
        <View>
          <Text style={styles.brand}>{t("vaultTitle")}</Text>
          <Text style={styles.count} testID="vault-count">
            {accounts.length === 1
              ? t("accountsOne", { count: accounts.length })
              : t("accountsOther", { count: accounts.length })}
          </Text>
        </View>
        <Pressable
          testID="add-account-btn"
          onPress={() => router.push("/add")}
          style={styles.addBtn}
        >
          <LinearGradient
            colors={[colors.primary, colors.secondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <Ionicons name="add" size={26} color={colors.base} />
        </Pressable>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput
          testID="vault-search-input"
          value={query}
          onChangeText={setQuery}
          placeholder={t("searchAccounts")}
          placeholderTextColor={colors.textMuted}
          style={styles.searchInput}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
        />
        {query.length > 0 && (
          <Pressable
            testID="vault-search-clear"
            onPress={() => setQuery("")}
            hitSlop={12}
          >
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </Pressable>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}
        style={styles.chipsScroll}
      >
        {categories.map((c) => {
          const active = c === category;
          return (
            <Pressable
              key={c}
              testID={`category-chip-${c}`}
              onPress={() => setCategory(c)}
              style={[styles.chip, active && styles.chipActive]}
            >
              {c === favLabel && <Ionicons name="star" size={12} color={active ? colors.base : colors.warning} />}
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{c}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {filtered.length === 0 ? (
        <View style={styles.empty} testID="vault-empty">
          <View style={styles.emptyBadge}>
            <Ionicons name="shield-outline" size={40} color={colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>
            {accounts.length === 0 ? t("emptyVaultTitle") : t("noMatches")}
          </Text>
          <Text style={styles.emptyBody}>
            {accounts.length === 0 ? t("emptyVaultBody") : t("noMatchesBody")}
          </Text>
          {accounts.length === 0 && (
            <Pressable
              testID="vault-empty-add"
              onPress={() => router.push("/add")}
              style={styles.emptyCta}
            >
              <LinearGradient
                colors={[colors.primary, colors.secondary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <Ionicons name="add" size={20} color={colors.base} />
              <Text style={styles.emptyCtaText}>{t("addAccount")}</Text>
            </Pressable>
          )}
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(a) => a.id}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 12,
            paddingBottom: BOTTOM_NAV_HEIGHT + insets.bottom + 24,
            gap: 14,
          }}
          renderItem={renderItem}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={5}
          initialNumToRender={8}
        />
      )}

      <BottomNav />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "transparent" },
  header: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 8,
    flexDirection: "row",

    alignItems: "center",
    justifyContent: "space-between",
  },
  brand: { ...typography.h1, color: colors.textPrimary, letterSpacing: 0.3 },
  count: { color: colors.textSecondary, fontSize: 13, marginTop: 4 },
  addBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  searchWrap: {
    marginHorizontal: 20,
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: radii.pill,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: colors.glassBorder,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 48,
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 15,
    paddingVertical: 0,
  },
  chipsScroll: { flexGrow: 0, marginTop: spacing.md },
  chipsRow: { gap: 8, paddingHorizontal: 20 },
  chip: {
    flexShrink: 0,
    height: 36,
    paddingHorizontal: 14,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: { color: colors.textSecondary, fontWeight: "600", fontSize: 13 },
  chipTextActive: { color: colors.base },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 12 },
  emptyBadge: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 240, 255, 0.10)",
    borderColor: colors.neonBorder,
    borderWidth: 1,
    marginBottom: 8,
  },
  emptyTitle: { ...typography.h2, color: colors.textPrimary },
  emptyBody: { color: colors.textSecondary, textAlign: "center", paddingHorizontal: 20 },
  emptyCta: {
    marginTop: 16,
    height: 52,
    borderRadius: radii.pill,
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 24,
  },
  emptyCtaText: { color: colors.base, fontWeight: "700", fontSize: 15 },
});
