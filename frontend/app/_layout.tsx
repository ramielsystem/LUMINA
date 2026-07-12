import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { LogBox, StatusBar, View, StyleSheet } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { useIconFonts } from "@/src/hooks/use-icon-fonts";
import { LockProvider, useLock } from "@/src/contexts/LockContext";
import { AuthProvider } from "@/src/contexts/AuthContext";
import { ToastProvider } from "@/src/components/Toast";
import { I18nProvider } from "@/src/i18n";
import { colors } from "@/src/lib/theme";

LogBox.ignoreAllLogs(true);
SplashScreen.preventAutoHideAsync();

const PUBLIC_ROUTES = new Set(["onboarding", "lock", "index", "auth-callback"]);

function AuthGate({ children }: { children: React.ReactNode }) {
  const { state } = useLock();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (state === "loading") return;
    const first = segments[0] ?? "index";
    if (state === "onboarding" && first !== "onboarding") {
      router.replace("/onboarding");
    } else if (state === "locked" && !PUBLIC_ROUTES.has(first)) {
      router.replace("/lock");
    } else if (state === "locked" && first === "onboarding") {
      router.replace("/lock");
    } else if (state === "unlocked" && (first === "lock" || first === "onboarding" || first === "index")) {
      router.replace("/(tabs)/vault");
    }
  }, [state, segments, router]);

  return <>{children}</>;
}

export default function RootLayout() {
  const [loaded, error] = useIconFonts();

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <View style={styles.root}>
          <StatusBar barStyle="light-content" backgroundColor={colors.base} />
          <AuthProvider>
            <LockProvider>
              <I18nProvider>
                <ToastProvider>
                  <AuthGate>
                    <Stack
                      screenOptions={{
                        headerShown: false,
                        contentStyle: { backgroundColor: colors.base },
                        animation: "fade",
                      }}
                    />
                  </AuthGate>
                </ToastProvider>
              </I18nProvider>
            </LockProvider>
          </AuthProvider>
        </View>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.base },
});
