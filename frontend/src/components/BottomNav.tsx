import { Pressable, StyleSheet, Text, View } from "react-native";
import { usePathname, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@/src/lib/theme";

type Tab = {
  href: "/(tabs)/vault" | "/(tabs)/categories" | "/(tabs)/settings";
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
  label: string;
  match: string;
};

const TABS: Tab[] = [
  { href: "/(tabs)/vault", icon: "shield-outline", activeIcon: "shield", label: "Vault", match: "vault" },
  { href: "/(tabs)/categories", icon: "folder-outline", activeIcon: "folder", label: "Folders", match: "categories" },
  { href: "/(tabs)/settings", icon: "settings-outline", activeIcon: "settings", label: "Settings", match: "settings" },
];

export function BottomNav() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 8) }]} testID="bottom-nav">
      <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, styles.tint]} />
      <View style={[StyleSheet.absoluteFill, styles.topBorder]} pointerEvents="none" />
      <View style={styles.row}>
        {TABS.map((t) => {
          const active = pathname?.includes(t.match);
          return (
            <Pressable
              key={t.match}
              testID={`tab-${t.match}`}
              onPress={() => router.replace(t.href)}
              style={styles.tab}
              hitSlop={4}
            >
              <Ionicons
                name={active ? t.activeIcon : t.icon}
                size={22}
                color={active ? colors.primary : colors.textMuted}
              />
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{t.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const HEIGHT = 64;

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    minHeight: HEIGHT,
    backgroundColor: "rgba(10, 10, 12, 0.6)",
  },
  tint: { backgroundColor: "rgba(255, 255, 255, 0.03)" },
  topBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.glassBorder },
  row: { flexDirection: "row", height: HEIGHT, alignItems: "center", justifyContent: "space-around" },
  tab: { alignItems: "center", justifyContent: "center", gap: 4, minWidth: 64, minHeight: 48 },
  tabLabel: { color: colors.textMuted, fontSize: 11, fontWeight: "600" },
  tabLabelActive: { color: colors.primary },
});

export const BOTTOM_NAV_HEIGHT = HEIGHT;
