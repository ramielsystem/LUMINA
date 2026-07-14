import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type AnimeTheme = {
  id: string;
  name: string;
  wallpaper: string | null;
  primaryColor: string;
  accentColor: string;
  isDark: boolean;
};

const DEFAULT_THEMES: AnimeTheme[] = [
  {
    id: "normal",
    name: "Lumina Normal",
    wallpaper: null,
    primaryColor: "#00E5FF",
    accentColor: "#7000FF",
    isDark: true,
  },
  {
    id: "jjk",
    name: "Jujutsu Kaisen",
    wallpaper: "https://images.alphacoders.com/133/1338481.png",
    primaryColor: "#9D4EDD",
    accentColor: "#E0AAFF",
    isDark: true,
  },
  {
    id: "solo",
    name: "Solo Leveling",
    wallpaper: "https://images.alphacoders.com/134/1346571.png",
    primaryColor: "#4895EF",
    accentColor: "#4CC9F0",
    isDark: true,
  },
  {
    id: "one-piece",
    name: "One Piece",
    wallpaper: "https://images.alphacoders.com/132/1322050.png",
    primaryColor: "#F72585",
    accentColor: "#7209B7",
    isDark: true,
  },
  {
    id: "sakura",
    name: "Sakura Blossom",
    wallpaper: "https://images.alphacoders.com/135/1351140.jpeg",
    primaryColor: "#FF85A2",
    accentColor: "#F72585",
    isDark: true,
  },
  {
    id: "demon-slayer",
    name: "Kimetsu",
    wallpaper: "https://images.alphacoders.com/133/1335028.png",
    primaryColor: "#2D6A4F",
    accentColor: "#40916C",
    isDark: true,
  },
  {
    id: "tokyo-ghoul",
    name: "Ghoul",
    wallpaper: "https://images.alphacoders.com/133/1338837.png",
    primaryColor: "#E63946",
    accentColor: "#A8dadc",
    isDark: true,
  },
];

interface Ctx {
  currentTheme: AnimeTheme;
  themes: AnimeTheme[];
  setTheme: (id: string) => Promise<void>;
  customWallpaper: string | null;
  setCustomWallpaper: (uri: string | null) => Promise<void>;
  setDynamicTheme: (theme: Partial<AnimeTheme>) => Promise<void>;
}

const ThemeContext = createContext<Ctx | null>(null);

const THEME_KEY = "@lumina_theme_id";
const WALLPAPER_KEY = "@lumina_custom_wallpaper";
const DYNAMIC_THEME_KEY = "@lumina_dynamic_theme";

function safeColor(value: string | undefined, fallback: string) {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback;
}

function normalizeTheme(theme: AnimeTheme): AnimeTheme {
  return {
    ...theme,
    primaryColor: safeColor(theme.primaryColor, DEFAULT_THEMES[0].primaryColor),
    accentColor: safeColor(theme.accentColor, DEFAULT_THEMES[0].accentColor),
    wallpaper: typeof theme.wallpaper === "string" ? theme.wallpaper : null,
  };
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [currentTheme, setCurrentTheme] = useState<AnimeTheme>(DEFAULT_THEMES[0]);

  const [customWallpaper, setCustomWallpaperState] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const savedId = await AsyncStorage.getItem(THEME_KEY);
      const savedWall = await AsyncStorage.getItem(WALLPAPER_KEY);
      const savedDynamic = await AsyncStorage.getItem(DYNAMIC_THEME_KEY);
      
      if (savedDynamic) {
        try {
          setCurrentTheme(normalizeTheme(JSON.parse(savedDynamic)));
        } catch {
          await AsyncStorage.removeItem(DYNAMIC_THEME_KEY);
        }
      } else if (savedId) {
        const found = DEFAULT_THEMES.find(t => t.id === savedId);
        if (found) setCurrentTheme(found);
      }

      if (savedWall) {
        setCustomWallpaperState(savedWall);
      }

    }
    load();
  }, []);

  const setTheme = async (id: string) => {
    const found = DEFAULT_THEMES.find(t => t.id === id);
    if (found) {
      setCurrentTheme(found);
      await AsyncStorage.setItem(THEME_KEY, id);
      await AsyncStorage.removeItem(DYNAMIC_THEME_KEY);
    }
  };

  const setDynamicTheme = async (theme: Partial<AnimeTheme>) => {
    const newTheme = normalizeTheme({
      ...DEFAULT_THEMES[0],
      id: "dynamic",
      name: "Custom Anime",
      ...theme,
    });
    setCurrentTheme(newTheme);
    await AsyncStorage.setItem(DYNAMIC_THEME_KEY, JSON.stringify(newTheme));
    await AsyncStorage.removeItem(THEME_KEY);
  };

  const setCustomWallpaper = async (uri: string | null) => {
    setCustomWallpaperState(uri);
    if (uri) {
      await AsyncStorage.setItem(WALLPAPER_KEY, uri);
    } else {
      await AsyncStorage.removeItem(WALLPAPER_KEY);
    }
  };

  return (
    <ThemeContext.Provider value={{ currentTheme, themes: DEFAULT_THEMES, setTheme, customWallpaper, setCustomWallpaper, setDynamicTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useAppTheme() {
  const c = useContext(ThemeContext);
  if (!c) throw new Error("useAppTheme must be used inside <ThemeProvider>");
  return c;
}
