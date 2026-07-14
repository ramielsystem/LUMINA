import React, { useState } from "react";
import {
  Modal,
  StyleSheet,
  Text,
  View,
  TextInput,
  FlatList,
  Pressable,
  Image,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radii, spacing, typography } from "@/src/lib/theme";
import { animeService, Anime } from "@/src/services/animeApi";
import { GlassCard } from "./GlassCard";

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelect: (anime: Anime) => void;
}

export function AnimeSearchModal({ visible, onClose, onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(false);

  const search = async (text: string) => {
    setQuery(text);
    if (text.length < 3) {
      setResults([]);
      return;
    }
    setLoading(true);
    const data = await animeService.searchAnime(text);
    setResults(data);
    setLoading(false);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <GlassCard style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Vincular Anime</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </Pressable>
          </View>

          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color={colors.textMuted} />
            <TextInput
              value={query}
              onChangeText={search}
              placeholder="Buscar anime..."
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              autoFocus
            />
          </View>

          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : (
            <FlatList
              data={results}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={styles.list}
              renderItem={({ item }) => {
                const title = item.title?.english || item.title?.romaji || "Anime";
                const cover = item.coverImage?.large || item.coverImage?.extraLarge;
                const genres = item.genres?.slice(0, 2).join(", ") || "Anime";

                return (
                  <Pressable style={styles.item} onPress={() => onSelect(item)}>
                    {cover ? (
                      <Image source={{ uri: cover }} style={styles.cover} resizeMethod="resize" fadeDuration={0} />
                    ) : (
                      <View style={styles.cover} />
                    )}
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemTitle} numberOfLines={1}>{title}</Text>
                      <Text style={styles.itemSub}>{genres}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                  </Pressable>
                );
              }}

              ListEmptyComponent={
                query.length >= 3 ? (
                  <Text style={styles.empty}>Nenhum resultado encontrado</Text>
                ) : null
              }
            />
          )}
        </GlassCard>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "flex-end",
  },
  container: {
    height: "80%",
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    paddingTop: spacing.md,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
  },
  title: { ...typography.h2, color: colors.textPrimary },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: radii.md,
    paddingHorizontal: 12,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
  },

  input: {
    flex: 1,
    color: colors.textPrimary,
    paddingVertical: 12,
    marginLeft: 8,
  },
  list: { paddingBottom: 40 },
  item: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },

  cover: {
    width: 40,
    height: 56,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  itemInfo: {
    flex: 1,
    marginLeft: 12,
  },
  itemTitle: { ...typography.body, fontWeight: "600", color: colors.textPrimary },
  itemSub: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  empty: { textAlign: "center", color: colors.textMuted, marginTop: 40 },
});
