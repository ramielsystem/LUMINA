import { useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { colors, radii, spacing, typography } from "@/src/lib/theme";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { LANGUAGES, useI18n } from "@/src/i18n";
import { useToast } from "@/src/components/Toast";

export default function LanguageScreen() {
  const { language, setLanguage, t, resolved } = useI18n();
  const toast = useToast();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return LANGUAGES;
    return LANGUAGES.filter(
      (l) => l.name.toLowerCase().includes(q) || l.native.toLowerCase().includes(q) || l.code.toLowerCase().includes(q)
    );
  }, [query]);

  const pick = async (code: string) => {
    await setLanguage(code);
    toast.show(LANGUAGES.find((l) => l.code === code)?.native || code);
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]} testID="language-screen">
      <ScreenHeader title={t("languageTitle")} subtitle={t("languageSubtitle")} />
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput
          testID="language-search-input"
          value={query}
          onChangeText={setQuery}
          placeholder={t("searchLanguage")}
          placeholderTextColor={colors.textMuted}
          style={styles.searchInput}
          autoCorrect={false}
          autoCapitalize="none"
        />
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(l) => l.code}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const selected = language === item.code;
          const active = resolved === item.code;
          return (
            <Pressable
              testID={`language-${item.code}`}
              onPress={() => pick(item.code)}
              style={({ pressed }) => [styles.row, selected && styles.rowSelected, pressed && { opacity: 0.7 }]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.native, item.rtl && styles.rtl]}>{item.native}</Text>
                {item.code !== "system" && item.native !== item.name && (
                  <Text style={styles.english}>{item.name}</Text>
                )}
              </View>
              {(selected || (language === "system" && active && item.code === "system")) && (
                <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
              )}
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "transparent" },
  searchWrap: {
    marginHorizontal: 20,
    marginTop: 4,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: radii.pill,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: colors.glassBorder,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 48,
  },
  searchInput: { flex: 1, color: colors.textPrimary, fontSize: 15, paddingVertical: 0 },
  list: { padding: 20, gap: 6 },
  row: {
    minHeight: 56,
    borderRadius: radii.lg,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: "rgba(255,255,255,0.03)",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  rowSelected: { borderColor: colors.primary, backgroundColor: "rgba(0, 240, 255, 0.06)" },
  native: { color: colors.textPrimary, fontSize: 16, fontWeight: "600" },
  english: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  rtl: { textAlign: "right", writingDirection: "rtl" },
});
