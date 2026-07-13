import React, { useEffect, useState } from "react";
import { FlatList, Image, Pressable, StyleSheet, Text, View, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { BottomNav } from "@/src/components/BottomNav";
import { GlassCard } from "@/src/components/GlassCard";
import { colors, radii, typography } from "@/src/lib/theme";

const ANILIST_API = "https://graphql.anilist.co";

const TRENDING_QUERY = `
query ($page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    media(type: ANIME, sort: TRENDING_DESC) {
      id
      title {
        english
        romaji
      }
      coverImage {
        large
        color
      }
      description
      genres
      averageScore
    }
  }
}
`;

export default function AnimeHubScreen() {
  const [anime, setAnime] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAnime = async () => {
    try {
      const response = await fetch(ANILIST_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: TRENDING_QUERY,
          variables: { page: 1, perPage: 20 }
        })
      });
      const json = await response.json();
      setAnime(json.data.Page.media);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnime();
  }, []);

  const renderItem = ({ item }: { item: any }) => (
    <GlassCard style={styles.animeCard}>
      <Image source={{ uri: item.coverImage.large }} style={styles.cover} />
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>
          {item.title.english || item.title.romaji}
        </Text>
        <View style={styles.meta}>
          <View style={styles.scoreWrap}>
            <Ionicons name="star" size={14} color="#FFD700" />
            <Text style={styles.score}>{item.averageScore}%</Text>
          </View>
          <Text style={styles.genres} numberOfLines={1}>{item.genres.slice(0, 2).join(", ")}</Text>
        </View>
        <Pressable style={styles.addBtn}>
          <Ionicons name="add" size={16} color={colors.primary} />
          <Text style={styles.addText}>Link to 2FA</Text>
        </Pressable>
      </View>
    </GlassCard>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScreenHeader title="Anime Hub" />
      
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={anime}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={styles.header}>
              <Text style={styles.sectionTitle}>Trending Anime</Text>
            </View>
          }
        />
      )}

      <BottomNav />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  list: { padding: 16, paddingBottom: 100 },
  header: { marginBottom: 16 },
  sectionTitle: { ...typography.h2, color: colors.textPrimary },
  animeCard: {
    flexDirection: "row",
    marginBottom: 16,
    padding: 12,
    gap: 12,
  },
  cover: {
    width: 80,
    height: 120,
    borderRadius: radii.md,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  info: { flex: 1, justifyContent: "space-between" },
  title: { ...typography.h3, color: colors.textPrimary },
  meta: { flexDirection: "row", alignItems: "center", gap: 12 },
  scoreWrap: { flexDirection: "row", alignItems: "center", gap: 4 },
  score: { color: colors.textSecondary, fontSize: 12 },
  genres: { color: colors.textSecondary, fontSize: 12, flex: 1 },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: radii.sm,
    backgroundColor: "rgba(0, 229, 255, 0.1)",
    alignSelf: "flex-start",
  },
  addText: { color: colors.primary, fontSize: 12, fontWeight: "600" },
});
