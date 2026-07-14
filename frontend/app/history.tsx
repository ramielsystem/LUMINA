import { useMemo } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { colors, radii, typography } from "@/src/lib/theme";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { GlassCard } from "@/src/components/GlassCard";
import { useLock } from "@/src/contexts/LockContext";
import { ServiceIcon } from "@/src/components/ServiceIcon";
import { useToast } from "@/src/components/Toast";

function timeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function HistoryScreen() {
  const { vault, updateVault } = useLock();
  const insets = useSafeAreaInsets();
  const toast = useToast();

  const entries = useMemo(() => (vault?.history ?? []).slice(0, 200), [vault?.history]);

  const clear = async () => {
    await updateVault((draft) => {
      draft.history = [];
      return draft;
    });
    toast.show("History cleared");
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]} testID="history-screen">
      <ScreenHeader
        title="History"
        subtitle={`${entries.length} entries`}
        right={
          entries.length > 0 ? (
            <Pressable
              testID="history-clear-btn"
              onPress={clear}
              hitSlop={12}
              style={styles.clearBtn}
            >
              <Ionicons name="trash-outline" size={20} color={colors.danger} />
            </Pressable>
          ) : null
        }
      />
      {entries.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyBadge}>
            <Ionicons name="time-outline" size={36} color={colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>No history yet</Text>
          <Text style={styles.emptyBody}>
            When you copy a code, we'll log it here (locally) so you can audit
            recent activity.
          </Text>
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(e) => e.id}
          contentContainerStyle={{ padding: 20, gap: 10, paddingBottom: insets.bottom + 24 }}
          renderItem={({ item }) => (
            <GlassCard style={styles.row}>
              <ServiceIcon issuer={item.issuer} size={40} />
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{item.issuer}</Text>
                <Text style={styles.rowSub}>{item.account || " "}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={styles.code}>{item.code}</Text>
                <Text style={styles.ago}>{timeAgo(item.at)}</Text>
              </View>
            </GlassCard>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "transparent" },
  clearBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center", borderRadius: 20, backgroundColor: "rgba(255,59,48,0.10)", borderWidth: 1, borderColor: "rgba(255,59,48,0.3)" },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 32 },
  emptyBadge: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0, 240, 255, 0.10)", borderColor: colors.neonBorder, borderWidth: 1, marginBottom: 8 },
  emptyTitle: { ...typography.h2, color: colors.textPrimary },
  emptyBody: { color: colors.textSecondary, textAlign: "center", paddingHorizontal: 20 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  rowTitle: { color: colors.textPrimary, fontSize: 15, fontWeight: "600" },
  rowSub: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  code: { color: colors.monoAccent, fontWeight: "700", fontSize: 16, letterSpacing: 2, fontVariant: ["tabular-nums"] },
  ago: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
});
