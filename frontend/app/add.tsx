import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { colors, radii, typography } from "@/src/lib/theme";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { GlassCard } from "@/src/components/GlassCard";

export default function AddScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]} testID="add-screen">
      <ScreenHeader title="Add account" subtitle="Choose how you'd like to add a new 2FA account" />
      <View style={styles.body}>
        <Pressable
          testID="add-scan-option"
          onPress={() => router.replace("/scan")}
          style={styles.optionWrap}
        >
          <LinearGradient
            colors={["rgba(0, 240, 255, 0.14)", "rgba(123, 97, 255, 0.10)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <GlassCard style={styles.option}>
            <View style={styles.iconBig}>
              <Ionicons name="scan" size={32} color={colors.primary} />
            </View>
            <Text style={styles.optionTitle}>Scan QR code</Text>
            <Text style={styles.optionBody}>
              Point your camera at the QR shown on any service's 2FA setup page.
            </Text>
          </GlassCard>
        </Pressable>

        <Pressable
          testID="add-manual-option"
          onPress={() => router.replace("/manual")}
          style={styles.optionWrap}
        >
          <GlassCard style={styles.option}>
            <View style={[styles.iconBig, { backgroundColor: "rgba(123, 97, 255, 0.12)", borderColor: "rgba(123, 97, 255, 0.4)" }]}>
              <Ionicons name="create" size={30} color={colors.secondary} />
            </View>
            <Text style={styles.optionTitle}>Enter manually</Text>
            <Text style={styles.optionBody}>
              Paste the secret key from the service. Supports SHA-1/256/512,
              6/8 digits, custom period and Steam Guard.
            </Text>
          </GlassCard>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "transparent" },
  body: { padding: 20, gap: 16 },
  optionWrap: { borderRadius: radii.xl, overflow: "hidden" },
  option: { padding: 24, gap: 10 },
  iconBig: {
    width: 64,
    height: 64,
    borderRadius: radii.lg,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 240, 255, 0.12)",
    borderColor: colors.neonBorder,
    borderWidth: 1,
    marginBottom: 8,
  },
  optionTitle: { ...typography.h2, color: colors.textPrimary },
  optionBody: { color: colors.textSecondary, fontSize: 14, lineHeight: 20 },
});
