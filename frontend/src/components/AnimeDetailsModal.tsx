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
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { colors, radii, spacing, typography } from "@/src/lib/theme";
import { Anime } from "@/src/services/animeApi";
import { GlassCard } from "./GlassCard";
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
  const { setWallpaper, setBlurIntensity } = useWallpaper();
  const toast = useToast();

  if (!anime) return null;

  const handleSetWallpaper = async () => {
    const url = anime.bannerImage || anime.coverImage.extraLarge || anime.coverImage.large;
    await setWallpaper(url);
    setBlurIntensity(25); // Default comfortable blur
    toast.show("Papel de parede definido!");
    onClose();
  };

  const isWeb = Platform.OS === "web";

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.overlay}>
        <View style={styles.backdrop} onTouchEnd={onClose} />
        <GlassCard style={styles.container}>
          <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
            <View style={styles.imageContainer}>
              <Image
                source={{ uri: anime.bannerImage || anime.coverImage.extraLarge || anime.coverImage.large }}
                style={styles.banner}
                resizeMode="cover"
              />
              <Pressable style={styles.closeBtn} onPress={onClose}>
                <Ionicons name="close" size={24} color="#fff" />
              </Pressable>
            </View>

            <View style={styles.content}>
              <Text style={styles.title}>
                {anime.title.english || anime.title.romaji}
              </Text>
              
              <View style={styles.row}>
                <Text style={styles.score}>⭐ {anime.meanScore / 10}</Text>
                <Text style={styles.status}>{anime.status}</Text>
              </View>

              <Text style={styles.description} numberOfLines={6}>
                {anime.description?.replace(/<[^>]*>?/gm, "")}
              </Text>

              <View style={styles.actions}>
                <Pressable style={styles.actionBtn} onPress={handleSetWallpaper}>
                  <Ionicons name="image-outline" size={20} color={colors.primary} />
                  <Text style={styles.actionText}>Set Wallpaper</Text>
                </Pressable>

                <Pressable 
                  style={[styles.actionBtn, styles.primaryAction]} 
                  onPress={() => onLink(anime)}
                >
                  <Ionicons name="link" size={20} color={colors.base} />
                  <Text style={[styles.actionText, { color: colors.base }]}>Link Account</Text>
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
  content: {
    padding: spacing.l,
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
    marginBottom: spacing.m,
  },
  score: {
    ...typography.caption,
    color: colors.accent,
    fontWeight: "bold",
  },
  status: {
    ...typography.caption,
    color: colors.textMuted,
    textTransform: "uppercase",
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
    gap: 12,
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
