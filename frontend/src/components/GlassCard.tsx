import React from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import { BlurView } from "expo-blur";
import { colors, radii } from "@/src/lib/theme";

interface Props {
  children: React.ReactNode;
  intensity?: number;
  style?: ViewStyle | ViewStyle[];
  borderless?: boolean;
  testID?: string;
}

export function GlassCard({ children, intensity = 40, style, borderless, testID }: Props) {
  return (
    <View testID={testID} style={[styles.wrapper, style]}>
      <BlurView intensity={intensity} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, styles.tint]} />
      {!borderless && <View style={[StyleSheet.absoluteFill, styles.border]} pointerEvents="none" />}
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
  content: {
    padding: 20,
  },
});
