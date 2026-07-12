import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { colors, typography } from "@/src/lib/theme";
import { useLock } from "@/src/contexts/LockContext";

export default function Index() {
  const router = useRouter();
  const { state } = useLock();

  useEffect(() => {
    if (state === "onboarding") router.replace("/onboarding");
    else if (state === "locked") router.replace("/lock");
    else if (state === "unlocked") router.replace("/(tabs)/vault");
  }, [state, router]);

  return (
    <View style={styles.container} testID="splash-screen">
      <LinearGradient
        colors={["rgba(0, 240, 255, 0.15)", "rgba(123, 97, 255, 0.15)", "rgba(0, 0, 0, 0)"]}
        style={StyleSheet.absoluteFill}
      />
      <Text style={styles.brand}>LUMINA</Text>
      <Text style={styles.subtitle}>Auth</Text>
      <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.base, alignItems: "center", justifyContent: "center" },
  brand: { ...typography.h1, color: colors.textPrimary, letterSpacing: 8, fontSize: 34 },
  subtitle: { color: colors.primary, fontSize: 16, letterSpacing: 4, marginTop: 4, fontWeight: "600" },
});
