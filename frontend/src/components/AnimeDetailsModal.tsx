import React from "react";
import {
  Modal,
  StyleSheet,
  Text,
  View,
  Image,
  Pressable,
  ScrollView,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radii, spacing, typography } from "@/src/lib/theme";
import { Anime } from "@/src/services/animeApi";
import { GlassCard } from "./GlassCard";
import { useAppTheme } from "../contexts/ThemeContext";
import { useWallpaper } from "../contexts/WallpaperContext";
import { useToast } from "./Toast";

const { height } = Dimensions.get("window");

interface Props {
  anime: Anime | null;
  visible: boolean;
  onClose: () => void;
  onLink: (anime: Anime) => void;
}

export function AnimeDetailsModal({ anime, visible, onClose, onLink }: Props) {
  const { currentTheme, setDynamicTheme } = useAppTheme();
  const { setWallpaper, setBlurIntensity } = useWallpaper();
  const toast = useToast();

  if (!anime) return null;

  const title = anime.title?.english || anime.title?.romaji || "Anime";
  const accentColor = anime.coverImage?.color || currentTheme.primaryColor;
  const wallpaper = anime.bannerImage || anime.coverImage?.extraLarge || anime.coverImage?.large || null;
  const score = anime.meanScore ? (anime.meanScore / 10).toFixed(1) : "--";
  const cleanDescription = anime.description?.replace(/<[^>]*>?/gm, "") || "Sem descrição disponível.";

  const handleSetWallpaper = async () => {
    if (!wallpaper) return;
    await setWallpaper(wallpaper);
    setBlurIntensity(18);
    toast.show("Papel de parede definido!");
    onClose();
  };

  const handleApplyTheme = async () => {
    await setDynamicTheme({
      name: title,
      primaryColor: accentColor,
      accentColor: currentTheme.accentColor,
      wallpaper,
    });
    if (wallpaper) await setWallpaper(wallpaper);
    setBlurIntensity(18);
    toast.show("Tema anime aplicado!");
    onClose();
  };

  return (

    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.overlay}>
        <View style={styles.backdrop} onTouchEnd={onClose} />
        <GlassCard style={styles.container} glowColor={accentColor}>
          <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
            <View style={styles.imageContainer}>
              {wallpaper && (
                <Image
                  source={{ uri: wallpaper }}
                  style={styles.banner}
                  resizeMode="cover"
                  resizeMethod="resize"
                  fadeDuration={0}
                />
              )}
              <View style={[styles.colorRail, { backgroundColor: accentColor }]} />
              <Pressable style={styles.closeBtn} onPress={onClose}>
                <Ionicons name="close" size={24} color="#fff" />
              </Pressable>
            </View>

            <View style={styles.content}>
              <Text style={styles.title}>{title}</Text>
              
              <View style={styles.row}>
                <Text style={[styles.score, { color: accentColor }]}>⭐ {score}</Text>
                <Text style={styles.status}>{anime.status || "ANIME"}</Text>
              </View>

              <View style={styles.paletteRow}>
                <View style={[styles.paletteDot, { backgroundColor: accentColor }]} />
                <Text style={styles.paletteText}>Paleta neon detectada</Text>
              </View>

              <Text style={styles.description} numberOfLines={6}>{cleanDescription}</Text>

              <View style={styles.actions}>
                <Pressable style={[styles.actionBtn, { borderColor: accentColor }]} onPress={handleSetWallpaper}>
                  <Ionicons name="image-outline" size={20} color={accentColor} />
                  <Text style={[styles.actionText, { color: accentColor }]}>Wallpaper</Text>
                </Pressable>

                <Pressable style={[styles.actionBtn, { borderColor: accentColor }]} onPress={handleApplyTheme}>
                  <Ionicons name="color-palette-outline" size={20} color={accentColor} />
                  <Text style={[styles.actionText, { color: accentColor }]}>Tema</Text>
                </Pressable>

                <Pressable
                  style={[styles.actionBtn, styles.primaryAction, { backgroundColor: accentColor, borderColor: accentColor }]}
                  onPress={() => onLink(anime)}
                >
                  <Ionicons name="link" size={20} color={colors.base} />
                  <Text style={[styles.actionText, { color: colors.base }]}>Vincular</Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </GlassCard>

      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.85)",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  container: {
    width: "90%",
    maxHeight: height * 0.8,
    padding: 0,
    overflow: "hidden",
    borderRadius: radii.xl,
  },
  imageContainer: {
    width: "100%",
    height: 200,
  },
  banner: {
    width: "100%",
    height: "100%",
  },
  closeBtn: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 20,
    padding: 4,
  },
  colorRail: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 4,
  },
  content: {
    padding: spacing.lg,
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: spacing.md,
  },
  score: {
    ...typography.caption,
    fontWeight: "bold",
  },
  status: {
    ...typography.caption,
    color: colors.textMuted,
    textTransform: "uppercase",
  },
  paletteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: spacing.md,
  },
  paletteDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.45)",
  },
  paletteText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: spacing.xl,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
  },

  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  primaryAction: {
    backgroundColor: colors.primary,
  },
  actionText: {
    ...typography.body,
    fontWeight: "bold",
    color: colors.primary,
    fontSize: 14,
  },
});
