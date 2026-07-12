import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, typography } from "@/src/lib/theme";

interface Props {
  title: string;
  onBack?: () => void;
  right?: React.ReactNode;
  subtitle?: string;
}

export function ScreenHeader({ title, onBack, right, subtitle }: Props) {
  const router = useRouter();
  return (
    <View style={styles.wrap}>
      <Pressable
        testID="header-back-btn"
        onPress={() => (onBack ? onBack() : router.back())}
        style={styles.back}
        hitSlop={12}
      >
        <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
      </Pressable>
      <View style={{ flex: 1 }}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {subtitle && (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>
      {right ?? <View style={{ width: 40 }} />}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  back: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  title: { ...typography.h2, color: colors.textPrimary },
  subtitle: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
});
