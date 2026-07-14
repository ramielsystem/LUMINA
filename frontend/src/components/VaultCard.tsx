import React, { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";

import { colors, radii, spacing, typography } from "@/src/lib/theme";
import { generateCode, progressRatio, secondsRemaining } from "@/src/lib/totp";
import type { VaultAccount } from "@/src/lib/vault";
import { CircularTimer } from "./CircularTimer";
import { GlassCard } from "./GlassCard";
import { ServiceIcon } from "./ServiceIcon";
import { useToast } from "./Toast";
import { useAppTheme } from "../contexts/ThemeContext";

interface Props {
  account: VaultAccount;
  now: number;
  hidden?: boolean;
  onToggleFavorite?: (id: string) => void;
  onPress?: (id: string) => void;
  onCopy?: (account: VaultAccount, code: string) => void;
}

function formatCode(code: string): string {
  if (code.length === 6) return code.slice(0, 3) + " " + code.slice(3);
  if (code.length === 8) return code.slice(0, 4) + " " + code.slice(4);
  return code;
}

export const VaultCard = React.memo(function VaultCard({
  account,
  now,
  hidden,
  onToggleFavorite,
  onPress,
  onCopy,
}: Props) {
  const [reveal, setReveal] = useState(!hidden);
  const scale = useSharedValue(1);
  const toast = useToast();
  const { currentTheme } = useAppTheme();

  const animeColor = account.animeTheme?.primaryColor || currentTheme.primaryColor;
  const animeBanner = account.animeTheme?.bannerImage;

  useEffect(() => {
    setReveal(!hidden);
  }, [hidden]);

  const code = useMemo(() => {
    try {
      return generateCode(
        {
          secret: account.secret,
          digits: account.digits,
          period: account.period,
          algorithm: account.algorithm,
          steam: account.steam,
        },
        now
      );
    } catch (e) {
      return "------";
    }
  }, [account.secret, account.digits, account.period, account.algorithm, account.steam, now]);

  const remaining = secondsRemaining(account.period, now);
  const ratio = progressRatio(account.period, now);

  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const doCopy = async () => {
    scale.value = withSpring(0.96, { damping: 14 }, () => {
      scale.value = withSpring(1, { damping: 14 });
    });
    await Clipboard.setStringAsync(code);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    toast.show(`Code copied — ${account.issuer}`);
    onCopy?.(account, code);
  };

  return (
    <Animated.View style={animStyle}>
      <Pressable
        testID={`vault-card-${account.id}`}
        onPress={() => onPress?.(account.id)}
        onLongPress={() => onToggleFavorite?.(account.id)}
        delayLongPress={350}
      >
        <GlassCard
          style={[styles.card, animeBanner ? { overflow: "hidden" } : {}]}
          glowColor={account.animeId ? animeColor : undefined}
        >
          {animeBanner && (
            <Image
              source={{ uri: animeBanner }}
              style={[StyleSheet.absoluteFill, { opacity: 0.22 }]}
              resizeMode="cover"
              resizeMethod="resize"
              fadeDuration={0}
            />
          )}
          {animeBanner && (
            <LinearGradient
              colors={["rgba(0,0,0,0.55)", "rgba(0,0,0,0.92)"]}
              style={StyleSheet.absoluteFill}
            />
          )}
          {account.animeId && <View style={[styles.neonRail, { backgroundColor: animeColor }]} />}
          <View style={styles.headerRow}>
            <ServiceIcon issuer={account.issuer} iconUrl={account.iconUrl} size={44} />
            <View style={styles.headerText}>
              <View style={styles.titleRow}>
                <Text style={styles.issuer} numberOfLines={1} testID={`vault-card-issuer-${account.id}`}>
                  {account.issuer}
                </Text>
                {account.animeId && (
                  <View style={[styles.animeBadge, { borderColor: animeColor, backgroundColor: `${animeColor}22` }]}>
                    <Ionicons name="sparkles" size={11} color={animeColor} />
                    <Text style={[styles.animeBadgeText, { color: animeColor }]}>ANIME</Text>
                  </View>
                )}
              </View>
              <Text style={styles.account} numberOfLines={1}>
                {account.account || " "}
              </Text>
            </View>
            <Pressable

              testID={`vault-card-fav-${account.id}`}
              onPress={() => onToggleFavorite?.(account.id)}
              hitSlop={12}
              style={styles.starBtn}
            >
              <Ionicons
                name={account.favorite ? "star" : "star-outline"}
                size={22}
                color={account.favorite ? colors.warning : colors.textMuted}
              />
            </Pressable>
          </View>

          <View style={styles.codeRow}>
            <View style={styles.codeBlock}>
              <Text style={[styles.codeText, { color: animeColor }]} testID={`vault-card-code-${account.id}`}>
                {reveal ? formatCode(code) : "•• ••••"}
              </Text>
              <Text style={styles.remaining}>{remaining}s remaining</Text>
            </View>
            <CircularTimer
              size={64}
              strokeWidth={5}
              progress={ratio}
              period={account.period}
              colorStart={animeColor}
              colorEnd={currentTheme.accentColor}
            >
              <Text style={[styles.timerText, { color: animeColor }]}>{remaining}</Text>
            </CircularTimer>
          </View>

          <View style={styles.actions}>

            {hidden && (
              <Pressable
                testID={`vault-card-reveal-${account.id}`}
                style={styles.pillGhost}
                onPress={() => setReveal((v) => !v)}
              >
                <Ionicons name={reveal ? "eye-off-outline" : "eye-outline"} size={16} color={colors.textSecondary} />
                <Text style={styles.pillGhostText}>{reveal ? "Hide" : "Reveal"}</Text>
              </Pressable>
            )}
            <Pressable
              testID={`vault-card-copy-${account.id}`}
              onPress={doCopy}
              style={[styles.pillPrimary, { backgroundColor: animeColor }]}
            >
              <Ionicons name="copy-outline" size={16} color={colors.base} />
              <Text style={styles.pillPrimaryText}>Copy</Text>
            </Pressable>
          </View>
        </GlassCard>
      </Pressable>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  card: {
    padding: 0,
  },
  neonRail: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    opacity: 0.95,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerText: { flex: 1 },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  issuer: { ...typography.h3, color: colors.textPrimary, flexShrink: 1 },
  animeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  animeBadgeText: { fontSize: 9, fontWeight: "900", letterSpacing: 0.5 },
  account: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  starBtn: { padding: 4 },
  codeRow: {

    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.md,
  },
  codeBlock: { flex: 1 },
  codeText: {
    fontSize: 34,
    fontWeight: "700",
    letterSpacing: 4,
    fontVariant: ["tabular-nums"],
  },
  remaining: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  timerText: {
    fontSize: 14,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: spacing.md,
  },
  pillPrimary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radii.pill,
  },
  pillPrimaryText: { color: colors.base, fontWeight: "700", fontSize: 13, letterSpacing: 0.2 },
  pillGhost: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderColor: colors.glassBorder,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radii.pill,
  },
  pillGhostText: { color: colors.textSecondary, fontWeight: "600", fontSize: 13 },
});