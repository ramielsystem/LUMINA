import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons, Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { resolveIcon } from "@/src/lib/icons";

interface Props {
  issuer: string;
  iconUrl?: string | null;
  size?: number;
}

export function ServiceIcon({ issuer, iconUrl, size = 48 }: Props) {
  const icon = resolveIcon(issuer, iconUrl);
  const inner = size - 12;

  if (icon.type === "vector") {
    const Family =
      icon.library === "Ionicons"
        ? Ionicons
        : icon.library === "FontAwesome5"
          ? FontAwesome5
          : MaterialCommunityIcons;
    return (
      <View
        style={[
          styles.wrap,
          { width: size, height: size, backgroundColor: hexA(icon.color, 0.16), borderColor: hexA(icon.color, 0.35) },
        ]}
      >
        <Family name={icon.name as never} size={inner * 0.6} color={icon.color} />
      </View>
    );
  }

  if (icon.type === "favicon" && icon.url) {
    return (
      <View style={[styles.wrap, { width: size, height: size, backgroundColor: hexA(icon.color, 0.14), borderColor: hexA(icon.color, 0.3) }]}>
        <Image source={{ uri: icon.url }} style={{ width: inner, height: inner, borderRadius: 8 }} />
      </View>
    );
  }

  return (
    <View style={[styles.wrap, { width: size, height: size, backgroundColor: hexA(icon.color, 0.2), borderColor: hexA(icon.color, 0.4) }]}>
      <Text style={[styles.initials, { color: icon.color, fontSize: inner * 0.42 }]}>
        {icon.initials}
      </Text>
    </View>
  );
}

function hexA(hex: string, a: number) {
  // Accept hex like #RRGGBB
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  initials: {
    fontWeight: "700",
    letterSpacing: 0.5,
  },
});
