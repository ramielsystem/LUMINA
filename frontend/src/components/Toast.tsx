import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { SlideInUp, SlideOutUp } from "react-native-reanimated";
import { colors, radii, spacing } from "@/src/lib/theme";
import { Ionicons } from "@expo/vector-icons";

interface ToastMessage {
  id: string;
  text: string;
  kind: "success" | "error" | "info";
}

interface ToastCtx {
  show: (text: string, kind?: ToastMessage["kind"]) => void;
}

const ToastContext = createContext<ToastCtx | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastMessage[]>([]);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const show = useCallback((text: string, kind: ToastMessage["kind"] = "success") => {
    const id = Date.now().toString() + Math.random().toString(36).slice(2, 5);
    setItems((cur) => [...cur, { id, text, kind }]);
    timers.current[id] = setTimeout(() => {
      setItems((cur) => cur.filter((t) => t.id !== id));
      delete timers.current[id];
    }, 2200);
  }, []);

  const ctx = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={ctx}>
      {children}
      <View pointerEvents="none" style={styles.stack} testID="toast-stack">
        {items.map((t) => (
          <Animated.View key={t.id} entering={SlideInUp.duration(220)} exiting={SlideOutUp.duration(180)} style={styles.toast}>
            <Ionicons
              name={t.kind === "error" ? "warning" : t.kind === "info" ? "information-circle" : "checkmark-circle"}
              size={18}
              color={t.kind === "error" ? colors.danger : colors.primary}
            />
            <Text style={styles.text} numberOfLines={2}>
              {t.text}
            </Text>
          </Animated.View>
        ))}
      </View>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastCtx {
  const c = useContext(ToastContext);
  if (!c) return { show: () => undefined };
  return c;
}

const styles = StyleSheet.create({
  stack: {
    position: "absolute",
    top: 60,
    left: 0,
    right: 0,
    alignItems: "center",
    gap: 8,
    zIndex: 9999,
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "rgba(18, 18, 20, 0.95)",
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    maxWidth: "88%",
  },
  text: { color: colors.textPrimary, fontSize: 14, fontWeight: "500", flexShrink: 1 },
});
