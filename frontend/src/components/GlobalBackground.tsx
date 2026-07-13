import React from "react";
import { StyleSheet, View, Image } from "react-native";
import { BlurView } from "expo-blur";
import { useAppTheme } from "../contexts/ThemeContext";
import { colors } from "../lib/theme";

export function GlobalBackground() {
  const { currentTheme, customWallpaper } = useAppTheme();
  
  const wallpaper = customWallpaper || currentTheme.wallpaper;

  if (!wallpaper) {
    return <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.base }]} />;
  }

  return (
    <View style={StyleSheet.absoluteFill}>
      <Image 
        source={{ uri: wallpaper }} 
        style={StyleSheet.absoluteFill} 
        resizeMode="cover"
      />
      <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.5)" }]} />
    </View>
  );
}
