import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  Image,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  Pressable,
  Modal,
} from "react-native";
import { colors, spacing, typography, radii } from "@/src/lib/theme";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { BottomNav } from "@/src/components/BottomNav";
import { GlassCard } from "@/src/components/GlassCard";
import { animeService, Anime } from "@/src/services/animeApi";
import { useI18n } from "@/src/i18n";
import { LinearGradient } from "expo-linear-gradient";
import { AnimeDetailsModal } from "@/src/components/AnimeDetailsModal";
import { useLock } from "@/src/contexts/LockContext";
import { useToast } from "@/src/components/Toast";
import { Ionicons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");

export default function AnimeHubScreen() {
  const { t } = useI18n();
  const { vault, updateVault } = useLock();
  const toast = useToast();
  
  const [trending, setTrending] = useState<Anime[]>([]);
  const [seasonReleases, setSeasonReleases] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const [selectedAnime, setSelectedAnime] = useState<Anime | null>(null);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [accountPickerVisible, setAccountPickerVisible] = useState(false);

  const loadAnime = async () => {
    try {
      const [trendingData, seasonData] = await Promise.all([
        animeService.getTrending(1, 10),
        animeService.getSeasonReleases(1, 10),
      ]);
      setTrending(trendingData || []);
      setSeasonReleases(seasonData || []);
    } catch (error) {
      console.error("Error loading anime data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAnime();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadAnime();
  };

  const handleLinkToAccount = async (accountId: string) => {
    if (!selectedAnime) return;

    await updateVault((draft) => {
      const acc = draft.accounts.find((a) => a.id === accountId);
      if (acc) {
        acc.animeId = selectedAnime.id;
        acc.animeTheme = {
          primaryColor: selectedAnime.coverImage.color,
          bannerImage: selectedAnime.bannerImage || selectedAnime.coverImage.extraLarge || selectedAnime.coverImage.large,
        };
      }
      return draft;
    });

    setAccountPickerVisible(false);
    setDetailsVisible(false);
    toast.show("Conta vinculada com sucesso!");
  };

  const renderAnimeCard = ({ item }: { item: Anime }, isTrending = false) => (
    <Pressable
      onPress={() => {
        setSelectedAnime(item);
        setDetailsVisible(true);
      }}
    >
      <GlassCard style={[styles.animeCard, isTrending && styles.trendingCard]}>
        <Image
          source={{ uri: item.coverImage.extraLarge || item.coverImage.large }}
          style={styles.coverImage}
        />
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.8)", "rgba(0,0,0,1)"]}
          style={styles.cardGradient}
        />
        <View style={styles.cardInfo}>
          <Text style={styles.animeTitle} numberOfLines={2}>
            {item.title.english || item.title.romaji}
          </Text>
          <View style={styles.metaRow}>
            <Text style={styles.scoreText}>⭐ {(item.meanScore || 0) / 10}</Text>
            {item.status === "RELEASING" && (
              <View style={styles.liveBadge}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>LIVE</Text>
              </View>
            )}
          </View>
        </View>
      </GlassCard>
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <ScreenHeader title="Anime Hub" />

      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
        >
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Em Alta Agora 🔥</Text>
            <FlatList
              data={trending}
              renderItem={(info) => renderAnimeCard(info, true)}
              keyExtractor={(item) => `trending-${item.id}`}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
              snapToInterval={width * 0.75 + spacing.md}
              decelerationRate="fast"
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Lançamentos da Temporada 📺</Text>
            <FlatList
              data={seasonReleases}
              renderItem={(info) => renderAnimeCard(info, false)}
              keyExtractor={(item) => `season-${item.id}`}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
              snapToInterval={width * 0.45 + spacing.md}
              decelerationRate="fast"
            />
          </View>

          <View style={styles.comingSoon}>
            <Text style={styles.comingSoonTitle}>My Anime List</Text>
            <Text style={styles.comingSoonText}>
              Vincule seus favoritos às suas contas 2FA clicando em um anime.
            </Text>
          </View>
        </ScrollView>
      )}

      <AnimeDetailsModal
        visible={detailsVisible}
        anime={selectedAnime}
        onClose={() => setDetailsVisible(false)}
        onLink={() => setAccountPickerVisible(true)}
      />

      {/* Modal de Seleção de Conta */}
      <Modal visible={accountPickerVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <GlassCard style={styles.pickerContainer}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Escolha uma conta</Text>
              <Pressable onPress={() => setAccountPickerVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </Pressable>
            </View>
            <FlatList
              data={vault?.accounts || []}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.accountItem}
                  onPress={() => handleLinkToAccount(item.id)}
                >
                  <View style={styles.accountInfo}>
                    <Text style={styles.accountIssuer}>{item.issuer}</Text>
                    <Text style={styles.accountName}>{item.account}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                </Pressable>
              )}
              ListEmptyComponent={
                <Text style={styles.emptyText}>Nenhuma conta no cofre.</Text>
              }
            />
          </GlassCard>
        </View>
      </Modal>

      <BottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.base,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    paddingBottom: 100,
  },
  section: {
    marginTop: spacing.lg,
  },
  sectionTitle: {
    ...typography.h2,
    color: colors.primary,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  horizontalList: {
    paddingHorizontal: spacing.md,
  },
  animeCard: {
    width: width * 0.45,
    height: 250,
    marginRight: spacing.md,
    padding: 0,
    overflow: "hidden",
    borderRadius: 16,
    borderWidth: 0,
  },
  trendingCard: {
    width: width * 0.75,
    height: 200,
  },
  coverImage: {
    width: "100%",
    height: "100%",
    position: "absolute",
  },
  cardGradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "60%",
  },
  cardInfo: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.md,
  },
  animeTitle: {
    ...typography.h3,
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  scoreText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: "bold",
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 0, 0, 0.2)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "rgba(255, 0, 0, 0.4)",
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#ff4444",
    marginRight: 4,
  },
  liveText: {
    color: "#ff4444",
    fontSize: 10,
    fontWeight: "bold",
  },
  comingSoon: {
    margin: spacing.md,
    marginTop: spacing.xl,
    padding: spacing.lg,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderStyle: "dashed",
    alignItems: "center",
  },
  comingSoonTitle: {
    ...typography.h3,
    color: colors.textMuted,
    marginBottom: 8,
  },
  comingSoonText: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: "center",
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "flex-end",
  },
  pickerContainer: {
    height: "60%",
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    padding: spacing.md,
  },
  pickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  pickerTitle: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  accountItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  accountInfo: {
    flex: 1,
  },
  accountIssuer: {
    ...typography.body,
    fontWeight: "bold",
    color: colors.textPrimary,
  },
  accountName: {
    ...typography.caption,
    color: colors.textMuted,
  },
  emptyText: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: 40,
  },
});