import { Stack } from "expo-router";

export default function TabsLayout() {
  // Using a Stack for tabs since we render our own custom bottom tab bar in
  // each screen via <BottomNav />. This avoids the heavy default tab styles
  // while keeping deep-link support intact.
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "transparent" },
        animation: "fade",
      }}
    />
  );
}
