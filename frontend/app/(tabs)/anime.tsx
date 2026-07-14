import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { AnimeDetailsModal } from "@/src/components/AnimeDetailsModal";
import { BottomNav } from "@/src/components/BottomNav";
import { GlassCard } from "@/src/components/GlassCard";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { useToast } from "@/src/components/Toast";
import { useLock } from "@/src/contexts/LockContext";
import { useAppTheme } from "@/src/contexts/ThemeContext";
import { useWallpaper } from "@/src/contexts/WallpaperContext";
import { colors, radii, spacing, typography } from "@/src/lib/theme";
import { Anime, animeService } from "@/src/services/animeApi";

const { width } = Dimensions.get("window");
const FALLBACK_COLOR = "#00E5FF";

function getAnimeTitle(anime: Anime) {
  return anime.title?.english || anime.title?.romaji || "Anime";
}

function getAnimeImage(anime: Anime) {
  return anime.bannerImage || anime.coverImage?.extraLarge || anime.coverImage?.large || null;
}

function getAnimeCover(anime: Anime) {
  return anime.coverImage?.extraLarge || anime.coverImage?.large || anime.bannerImage || null;
}

function getAnimeColor(anime: Anime, fallback = FALLBACK_COLOR) {
  return anime.coverImage?.color || fallback;
}

export default function AnimeHubScreen() {
  const { vault, updateVault } = useLock();
  const toast = useToast();
  const { currentTheme, setDynamicTheme } = useAppTheme();
  const { setWallpaper, setBlurIntensity } = useWallpaper();

  const [trending, setTrending] = useState<Anime[]>([]);
  const [seasonReleases, setSeasonReleases] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedAnime, setSelectedAnime] = useState<Anime | null>(null);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [accountPickerVisible, setAccountPickerVisible] = useState(false);

  const linkedAccounts = useMemo(
    () => (vault?.accounts || []).filter((account) => account.animeId),
    [vault?.accounts]
  );

  const heroAnime = trending[0] || seasonReleases[0] || null;
  const themeColor = heroAnime ? getAnimeColor(heroAnime, currentTheme.primaryColor) : currentTheme.primaryColor;

  const loadAnime = async () => {
    try {
      const [trendingData, seasonData] = await Promise.all([
        animeService.getTrending(1, 8),
        animeService.getSeasonReleases(1, 8),
      ]);
      setTrending(trendingData || []);
      setSeasonReleases(seasonData || []);
    } catch (error) {
      console.error("Error loading anime data:", error);
      toast.show("Não consegui carregar o Anime Hub agora.");
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

  const handleApplyTheme = async (anime: Anime) => {
    const wallpaper = getAnimeImage(anime);
    const primaryColor = getAnimeColor(anime, currentTheme.primaryColor);

    await setDynamicTheme({
      primaryColor,
      accentColor: anime.genres?.includes("Action") ? "#FF3B8A" : currentTheme.accentColor,
      wallpaper,
      name: getAnimeTitle(anime),
    });

    if (wallpaper) {
      await setWallpaper(wallpaper);
      setBlurIntensity(18);
    }

    toast.show(`Tema ${getAnimeTitle(anime)} aplicado!`);
  };

  const handleOpenDetails = (anime: Anime) => {
    setSelectedAnime(anime);
    setDetailsVisible(true);
  };

  const handleOpenAccountPicker = (anime: Anime) => {
    setSelectedAnime(anime);
    setDetailsVisible(false);
    setAccountPickerVisible(true);
  };

  const handleLinkToAccount = async (accountId: string) => {
    if (!selectedAnime) return;

    const animeColor = getAnimeColor(selectedAnime, currentTheme.primaryColor);
    const animeImage = getAnimeImage(selectedAnime);

    await updateVault((draft) => {
      const account = draft.accounts.find((item) => item.id === accountId);
      if (account) {
        account.animeId = selectedAnime.id;
        account.animeTheme = {
          primaryColor: animeColor,
          bannerImage: animeImage || undefined,
        };
        account.updatedAt = Date.now();
      }
      return draft;
    });

    setAccountPickerVisible(false);
    toast.show("Conta vinculada com glow neon!");
  };

  const renderHero = () => {
    if (!heroAnime) return null;

    const title = getAnimeTitle(heroAnime);
    const image = getAnimeImage(heroAnime);
    const color = getAnimeColor(heroAnime, currentTheme.primaryColor);

    return (
      <Pressable onPress={() => handleOpenDetails(heroAnime)} style={styles.heroWrap}>
        <View style={[styles.heroCard, { borderColor: `${color}AA` }]}>
          {image && <Image source={{ uri: image }} style={StyleSheet.absoluteFill} resizeMode="cover" />}
          <LinearGradient
            colors={["rgba(0,0,0,0.15)", "rgba(0,0,0,0.72)", "rgba(0,0,0,0.96)"]}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.heroContent}>
            <View style={[styles.liveBadge, { borderColor: color, backgroundColor: `${color}22` }]}>
              <Ionicons name="sparkles" size={13} color={color} />
              <Text style={[styles.liveText, { color }]}>TEMA EM DESTAQUE</Text>
            </View>
            <Text style={styles.heroTitle} numberOfLines={2}>{title}</Text>
            <Text style={styles.heroSubtitle} numberOfLines={2}>
              Aplique wallpaper, paleta neon e deixe seus cartões 2FA com vibe de anime.
            </Text>
            <View style={styles.paletteRow}>
              <View style={[styles.paletteDot, { backgroundColor: color }]} />
              <View style={[styles.paletteDot, { backgroundColor: currentTheme.accentColor }]} />
              <View style={[styles.paletteDot, { backgroundColor: "#FFFFFF" }]} />
            </View>
            <View style={styles.heroActions}>
              <Pressable style={[styles.heroButton, { backgroundColor: color }]} onPress={() => handleApplyTheme(heroAnime)}>
                <Ionicons name="color-palette" size={16} color={colors.base} />
                <Text style={styles.heroButtonText}>Aplicar tema</Text>
              </Pressable>
              <Pressable style={styles.heroGhostButton} onPress={() => handleOpenAccountPicker(heroAnime)}>
                <Ionicons name="link" size={16} color={colors.textPrimary} />
                <Text style={styles.heroGhostText}>Vincular</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Pressable>
    );
  };

  const renderAnimeCard = ({ item }: { item: Anime }, isTrending = false) => {
    const cover = getAnimeCover(item);
    const animeColor = getAnimeColor(item, themeColor);
    const score = item.meanScore ? (item.meanScore / 10).toFixed(1) : "--";

    return (
      <Pressable onPress={() => handleOpenDetails(item)} style={styles.cardPressable}>
        <View style={[styles.animeCard, isTrending && styles.trendingCard, { borderColor: `${animeColor}66` }]}>
          {cover && <Image source={{ uri: cover }} style={styles.coverImage} resizeMode="cover" />}
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.78)", "rgba(0,0,0,0.98)"]}
            style={styles.cardGradient}
          />
          <View style={[styles.cardGlow, { backgroundColor: `${animeColor}22` }]} />
          <View style={styles.cardInfo}>
            <Text style={styles.animeTitle} numberOfLines={2}>{getAnimeTitle(item)}</Text>
            <View style={styles.metaRow}>
              <Text style={[styles.scoreText, { color: animeColor }]}>⭐ {score}</Text>
              {item.status === "RELEASING" && (
                <View style={styles.airingBadge}>
                  <View style={styles.airingDot} />
                  <Text style={styles.airingText}>ON</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </Pressable>
    );
  };

  const renderSection = (title: string, data: Anime[], trendingList = false) => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: currentTheme.primaryColor }]}>{title}</Text>
      {data.length ? (
        <FlatList
          data={data}
          renderItem={(info) => renderAnimeCard(info, trendingList)}
          keyExtractor={(item) => `${title}-${item.id}`}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalList}
          initialNumToRender={4}
          maxToRenderPerBatch={4}
          windowSize={3}
          removeClippedSubviews
        />
      ) : (
        <Text style={styles.emptyText}>Nada para mostrar agora. Puxe para atualizar.</Text>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <ScreenHeader title="Anime Hub" />

      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={currentTheme.primaryColor} />
          <Text style={styles.loadingText}>Carregando energia otaku...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={currentTheme.primaryColor} />
          }
        >
          {renderHero()}

          <View style={styles.statsRow}>
            <GlassCard style={styles.statCard} borderless>
              <Text style={[styles.statValue, { color: currentTheme.primaryColor }]}>{linkedAccounts.length}</Text>
              <Text style={styles.statLabel}>2FA com anime</Text>
            </GlassCard>
            <GlassCard style={styles.statCard} borderless>
              <Text style={[styles.statValue, { color: themeColor }]}>{trending.length + seasonReleases.length}</Text>
              <Text style={styles.statLabel}>temas prontos</Text>
            </GlassCard>
          </View>

          {renderSection("Em Alta Agora 🔥", trending, true)}
          {renderSection("Lançamentos da Temporada 📺", seasonReleases)}

          <View style={styles.linkedSection}>
            <Text style={[styles.sectionTitle, { color: currentTheme.primaryColor }]}>Cofre Otaku ✨</Text>
            <GlassCard style={styles.linkedCard} glowColor={linkedAccounts[0]?.animeTheme?.primaryColor}>
              {linkedAccounts.length ? (
                linkedAccounts.slice(0, 4).map((account) => (
                  <View key={account.id} style={styles.linkedItem}>
                    <View style={[styles.linkedDot, { backgroundColor: account.animeTheme?.primaryColor || currentTheme.primaryColor }]} />
                    <View style={styles.linkedInfo}>
                      <Text style={styles.linkedIssuer} numberOfLines={1}>{account.issuer}</Text>
                      <Text style={styles.linkedAccount} numberOfLines={1}>{account.account || "Conta protegida"}</Text>
                    </View>
                    <Ionicons name="shield-checkmark" size={20} color={account.animeTheme?.primaryColor || currentTheme.primaryColor} />
                  </View>
                ))
              ) : (
                <View style={styles.emptyLinked}>
                  <Ionicons name="sparkles-outline" size={26} color={colors.textMuted} />
                  <Text style={styles.comingSoonTitle}>Nenhum cartão vinculado ainda</Text>
                  <Text style={styles.comingSoonText}>Toque em um anime e vincule uma conta para liberar glow neon no cofre.</Text>
                </View>
              )}
            </GlassCard>
          </View>
        </ScrollView>
      )}

      <AnimeDetailsModal
        visible={detailsVisible}
        anime={selectedAnime}
        onClose={() => setDetailsVisible(false)}
        onLink={handleOpenAccountPicker}
      />

      <Modal visible={accountPickerVisible} transparent animationType="slide" onRequestClose={() => setAccountPickerVisible(false)}>
        <View style={styles.modalOverlay}>
          <GlassCard style={styles.pickerContainer} glowColor={selectedAnime ? getAnimeColor(selectedAnime, currentTheme.primaryColor) : undefined}>
            <View style={styles.pickerHeader}>
              <View>
                <Text style={styles.pickerTitle}>Escolha uma conta</Text>
                <Text style={styles.pickerSubtitle} numberOfLines={1}>{selectedAnime ? getAnimeTitle(selectedAnime) : "Anime selecionado"}</Text>
              </View>
              <Pressable onPress={() => setAccountPickerVisible(false)} hitSlop={12}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </Pressable>
            </View>
            <FlatList
              data={vault?.accounts || []}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <Pressable style={styles.accountItem} onPress={() => handleLinkToAccount(item.id)}>
                  <View style={styles.accountInfo}>
                    <Text style={styles.accountIssuer}>{item.issuer}</Text>
                    <Text style={styles.accountName}>{item.account || "Conta protegida"}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                </Pressable>
              )}
              ListEmptyComponent={<Text style={styles.emptyText}>Nenhuma conta no cofre.</Text>}
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
    backgroundColor: "transparent",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.sm,
  },
  loadingText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  scrollContent: {
    paddingBottom: 110,
  },
  heroWrap: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
  },
  heroCard: {
    minHeight: 270,
    overflow: "hidden",
    borderRadius: radii.xl,
    borderWidth: 1,
    backgroundColor: colors.surface,
  },
  heroContent: {
    flex: 1,
    justifyContent: "flex-end",
    padding: spacing.lg,
  },
  heroTitle: {
    ...typography.h1,
    color: colors.textPrimary,
    marginTop: spacing.sm,
  },
  heroSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    lineHeight: 22,
  },
  paletteRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  paletteDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.45)",
  },
  heroActions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  heroButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderRadius: radii.pill,
  },
  heroButtonText: {
    color: colors.base,
    fontWeight: "800",
  },
  heroGhostButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  heroGhostText: {
    color: colors.textPrimary,
    fontWeight: "700",
  },
  statsRow: {
    flexDirection: "row",
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    marginTop: spacing.md,
  },
  statCard: {
    flex: 1,
  },
  statValue: {
    ...typography.h2,
  },
  statLabel: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  section: {
    marginTop: spacing.lg,
  },
  sectionTitle: {
    ...typography.h2,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  horizontalList: {
    paddingHorizontal: spacing.md,
  },
  cardPressable: {
    marginRight: spacing.md,
  },
  animeCard: {
    width: width * 0.44,
    height: 248,
    overflow: "hidden",
    borderRadius: radii.lg,
    borderWidth: 1,
    backgroundColor: colors.surface,
  },
  trendingCard: {
    width: width * 0.72,
    height: 205,
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
    height: "70%",
  },
  cardGlow: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 4,
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
    color: colors.textPrimary,
    fontSize: 16,
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  scoreText: {
    ...typography.caption,
    fontWeight: "800",
  },
  liveBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  liveText: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  airingBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 59, 48, 0.18)",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: radii.sm,
  },
  airingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.danger,
    marginRight: 4,
  },
  airingText: {
    color: colors.danger,
    fontSize: 10,
    fontWeight: "900",
  },
  linkedSection: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  linkedCard: {
    padding: 0,
  },
  linkedItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  linkedDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: spacing.sm,
  },
  linkedInfo: {
    flex: 1,
  },
  linkedIssuer: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: "700",
  },
  linkedAccount: {
    ...typography.caption,
    color: colors.textMuted,
  },
  emptyLinked: {
    alignItems: "center",
    paddingVertical: spacing.md,
  },
  comingSoonTitle: {
    ...typography.h3,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    marginBottom: 4,
  },
  comingSoonText: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.82)",
    justifyContent: "flex-end",
  },
  pickerContainer: {
    maxHeight: "70%",
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  pickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  pickerTitle: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  pickerSubtitle: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
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
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
  },
});
