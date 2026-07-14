import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Svg, { Path } from "react-native-svg";

import { colors, radii, typography } from "@/src/lib/theme";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { parseOtpAuthUri } from "@/src/lib/otpauth-parser";
import { isValidBase32 } from "@/src/lib/totp";
import { newAccountId, VaultAccount } from "@/src/lib/vault";
import { useLock } from "@/src/contexts/LockContext";
import { useToast } from "@/src/components/Toast";

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(true);
  const router = useRouter();
  const { updateVault } = useLock();
  const toast = useToast();
  const lastCode = useRef<string | null>(null);

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  // Handle camera mount/unmount to prevent memory leaks and crashes
  useEffect(() => {
    setIsCameraActive(true);
    return () => {
      setIsCameraActive(false);
    };
  }, []);

  const onBarcode = async ({ data }: { data: string }) => {
    if (scanned || !isCameraActive) return;
    if (lastCode.current === data) return;
    lastCode.current = data;
    try {
      const parsed = parseOtpAuthUri(data);
      if (!isValidBase32(parsed.secret)) {
        toast.show("Invalid secret in QR", "error");
        lastCode.current = null;
        return;
      }
      setScanned(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const now = Date.now();
      const newAccount: VaultAccount = {
        id: newAccountId(),
        issuer: parsed.issuer,
        account: parsed.account,
        secret: parsed.secret,
        digits: parsed.digits === 8 ? 8 : 6,
        period: parsed.period || 30,
        algorithm: parsed.algorithm,
        steam: parsed.steam,
        favorite: false,
        category: "Personal",
        iconUrl: null,
        createdAt: now,
        updatedAt: now,
      };
      await updateVault((draft) => {
        draft.accounts = [newAccount, ...draft.accounts];
        return draft;
      });
      toast.show(`Added ${parsed.issuer}`);
      router.replace("/(tabs)/vault");
    } catch (e) {
      toast.show("Not a valid otpauth QR", "error");
      lastCode.current = null;
      setScanned(false);
    }
  };

  const notGranted = permission && !permission.granted;

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]} testID="scan-screen">
      <ScreenHeader
        title="Scan QR"
        right={
          <Pressable
            testID="scan-manual-btn"
            onPress={() => router.replace("/manual")}
            style={styles.manualBtn}
            hitSlop={8}
          >
            <Ionicons name="create-outline" size={20} color={colors.textPrimary} />
          </Pressable>
        }
      />
      <View style={styles.cameraWrap}>
        {permission?.granted && isCameraActive ? (
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={scanned ? undefined : onBarcode}
          />
        ) : (

          <View style={styles.permissionWrap} testID="scan-permission">
            <Ionicons name="camera-outline" size={44} color={colors.primary} />
            <Text style={styles.permissionTitle}>Camera access needed</Text>
            <Text style={styles.permissionBody}>
              Lumina Auth scans QR codes directly on-device. Nothing leaves your phone.
            </Text>
            <Pressable
              testID="scan-grant-btn"
              onPress={requestPermission}
              style={styles.grantBtn}
            >
              <Text style={styles.grantText}>Grant camera access</Text>
            </Pressable>
            <Pressable
              testID="scan-fallback-manual"
              onPress={() => router.replace("/manual")}
            >
              <Text style={styles.manualFallback}>Enter secret manually</Text>
            </Pressable>
          </View>
        )}
        {permission?.granted && (
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <View style={styles.overlayTop} />
            <View style={styles.midRow}>
              <View style={styles.overlaySide} />
              <View style={styles.cutout}>
                <NeonCorner style={{ top: -2, left: -2 }} />
                <NeonCorner style={{ top: -2, right: -2, transform: [{ rotateY: "180deg" }] }} />
                <NeonCorner style={{ bottom: -2, left: -2, transform: [{ rotateX: "180deg" }] }} />
                <NeonCorner style={{ bottom: -2, right: -2, transform: [{ rotate: "180deg" }] }} />
              </View>
              <View style={styles.overlaySide} />
            </View>
            <View style={styles.overlayBottom}>
              <Text style={styles.hint}>Point at the QR code shown by the service</Text>
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

function NeonCorner({ style }: { style?: object }) {
  return (
    <View style={[styles.corner, style]}>
      <Svg width="34" height="34" viewBox="0 0 34 34">
        <Path d="M2 12 L2 2 L12 2" stroke={colors.primary} strokeWidth="3" strokeLinecap="round" fill="none" />
      </Svg>
    </View>
  );
}

const CUTOUT = 260;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "transparent" },
  manualBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center", borderRadius: 20, backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: colors.glassBorder },
  cameraWrap: { flex: 1, backgroundColor: "#000", overflow: "hidden" },
  permissionWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 32 },
  permissionTitle: { ...typography.h2, color: colors.textPrimary, marginTop: 8 },
  permissionBody: { color: colors.textSecondary, textAlign: "center", paddingHorizontal: 20 },
  grantBtn: { marginTop: 16, paddingHorizontal: 24, paddingVertical: 14, borderRadius: radii.pill, backgroundColor: colors.primary },
  grantText: { color: colors.base, fontWeight: "700" },
  manualFallback: { color: colors.primary, marginTop: 12 },
  overlayTop: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)" },
  midRow: { flexDirection: "row", height: CUTOUT },
  overlaySide: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)" },
  cutout: {
    width: CUTOUT,
    height: CUTOUT,
    borderColor: colors.neonBorder,
    borderWidth: 1,
    borderRadius: 20,
  },
  corner: { position: "absolute" },
  overlayBottom: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", paddingTop: 24 },
  hint: { color: colors.textPrimary, fontSize: 14 },
});
