import React from "react";
import { Platform, StyleSheet, View, ViewStyle } from "react-native";
import { BlurView } from "expo-blur";
import { colors, radii } from "@/src/lib/theme";

interface Props {
  children: React.ReactNode;
  intensity?: number;
  style?: ViewStyle | ViewStyle[];
  borderless?: boolean;
  glowColor?: string;
  testID?: string;
}

export function GlassCard({ children, intensity = 40, style, borderless, glowColor, testID }: Props) {
  // Performance optimization: BlurView can be very expensive on Android and Web
  // especially when used in lists. We use a simple semi-transparent background
  // for these platforms to ensure smooth interaction.
  const isWeb = Platform.OS === "web";
  const isAndroid = Platform.OS === "android";
  const skipBlur = isWeb || isAndroid;
  const glowStyle = glowColor
    ? {
        borderColor: glowColor,
        borderWidth: 1,
        ...(isAndroid
          ? {}
          : {
              shadowColor: glowColor,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.35,
              shadowRadius: 12,
            }),
      }
    : null;
  
  return (
    <View testID={testID} style={[styles.wrapper, style, glowStyle]}>
      {skipBlur ? (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(18, 18, 20, 0.92)" }]} />
      ) : (
        <BlurView intensity={intensity} tint="dark" style={StyleSheet.absoluteFill} />
      )}
      <View style={[StyleSheet.absoluteFill, styles.tint]} />
      {!borderless && <View style={[StyleSheet.absoluteFill, styles.border, glowColor ? { borderColor: glowColor } : null]} pointerEvents="none" />}
      {glowColor && <View style={[StyleSheet.absoluteFill, styles.innerGlow, { backgroundColor: glowColor }]} pointerEvents="none" />}
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: radii.xl,
    overflow: "hidden",
    backgroundColor: colors.surface,
  },
  tint: {
    backgroundColor: "rgba(255, 255, 255, 0.03)",
  },
  border: {
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  innerGlow: {
    opacity: 0.08,
  },
  content: {
    padding: 20,
  },
});
