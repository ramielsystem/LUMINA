import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { colors, radii } from "@/src/lib/theme";

interface Props {
  value: string;
  onChange: (v: string) => void;
  length?: number;
  onComplete?: (v: string) => void;
  showBiometric?: boolean;
  onBiometric?: () => void;
  disabled?: boolean;
}

export function PinPad({
  value,
  onChange,
  length = 6,
  onComplete,
  showBiometric,
  onBiometric,
  disabled,
}: Props) {
  const buttons: (string | "back" | "bio" | null)[] = [
    "1", "2", "3",
    "4", "5", "6",
    "7", "8", "9",
    showBiometric ? "bio" : null,
    "0",
    "back",
  ];

  const handlePress = (digit: string) => {
    if (disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (value.length < length) {
      const next = value + digit;
      onChange(next);
      if (next.length === length) onComplete?.(next);
    }
  };

  const handleBack = () => {
    if (disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChange(value.slice(0, -1));
  };

  return (
    <View style={styles.container}>
      <View style={styles.dots} testID="pin-dots">
        {Array.from({ length }).map((_, i) => (
          <View
            key={i}
            style={[styles.dot, value.length > i && styles.dotFilled]}
          />
        ))}
      </View>
      <View style={styles.grid}>
        {buttons.map((b, i) => {
          if (b === null) return <View key={i} style={styles.keySpacer} />;
          if (b === "back") {
            return (
              <PinKey key={i} testID="pin-back" onPress={handleBack}>
                <Ionicons name="backspace-outline" size={26} color={colors.textPrimary} />
              </PinKey>
            );
          }
          if (b === "bio") {
            return (
              <PinKey key={i} testID="pin-bio" onPress={() => onBiometric?.()}>
                <Ionicons name="finger-print" size={30} color={colors.primary} />
              </PinKey>
            );
          }
          return (
            <PinKey key={i} testID={`pin-key-${b}`} onPress={() => handlePress(b)}>
              <Text style={styles.keyLabel}>{b}</Text>
            </PinKey>
          );
        })}
      </View>
    </View>
  );
}

function PinKey({
  children,
  onPress,
  testID,
}: {
  children: React.ReactNode;
  onPress: () => void;
  testID?: string;
}) {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      onPressIn={() => (scale.value = withSpring(0.92, { damping: 14 }))}
      onPressOut={() => (scale.value = withSpring(1, { damping: 14 }))}
      style={styles.key}
    >
      <Animated.View style={[styles.keyInner, style]}>{children}</Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center", gap: 32 },
  dots: { flexDirection: "row", gap: 14 },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: colors.textMuted,
  },
  dotFilled: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.8,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  grid: {
    width: 280,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 16,
  },
  key: { width: 80, height: 80 },
  keySpacer: { width: 80, height: 80 },
  keyInner: {
    flex: 1,
    borderRadius: radii.xxl,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: colors.glassBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  keyLabel: { color: colors.textPrimary, fontSize: 28, fontWeight: "600" },
});
