import React from "react";
import { StyleSheet, View, Image, Platform } from "react-native";
import { BlurView } from "expo-blur";
import { useWallpaper } from "../contexts/WallpaperContext";
import { useAppTheme } from "../contexts/ThemeContext";
import { colors } from "../lib/theme";

export function GlobalBackground() {
  const { wallpaperUrl, blurIntensity } = useWallpaper();
  const { currentTheme, customWallpaper } = useAppTheme();
  
  // Prioritize WallpaperContext URL, then custom wallpaper from theme, then theme wallpaper
  const wallpaper = wallpaperUrl || customWallpaper || currentTheme.wallpaper;

  if (!wallpaper) {
    return <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.base }]} />;
  }

  const isWeb = Platform.OS === "web";
  const isAndroid = Platform.OS === "android";
  // On Web/Android, BlurView is expensive. We use a dark overlay instead.
  const skipBlur = isWeb || isAndroid;

  return (
    <View style={StyleSheet.absoluteFill}>
      <Image
        source={{ uri: wallpaper }}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
        resizeMethod="resize"
        fadeDuration={0}
      />
      {skipBlur ? (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.86)" }]} />
      ) : (
        <BlurView
          intensity={Math.min(blurIntensity, 28)}
          tint="dark"
          style={StyleSheet.absoluteFill}
        />
      )}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.38)" }]} />

    </View>
  );
}