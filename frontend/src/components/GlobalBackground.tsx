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
  // On web/android, if intensity is very high, blur might be laggy, but let's try to respect it
  // We'll cap it or use an overlay if it's too much.

  return (
    <View style={StyleSheet.absoluteFill}>
      <Image 
        source={{ uri: wallpaper }} 
        style={StyleSheet.absoluteFill} 
        resizeMode="cover"
      />
      {/* On Web/Android, BlurView can be expensive, but for a global background it's usually okay if not re-rendering constantly */}
      <BlurView 
        intensity={blurIntensity} 
        tint="dark" 
        style={StyleSheet.absoluteFill} 
      />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.4)" }]} />
    </View>
  );
}
