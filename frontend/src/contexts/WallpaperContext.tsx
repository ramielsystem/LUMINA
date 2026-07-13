import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface WallpaperContextType {
  wallpaperUrl: string | null;
  setWallpaper: (url: string | null) => Promise<void>;
  blurIntensity: number;
  setBlurIntensity: (intensity: number) => void;
}

const WallpaperContext = createContext<WallpaperContextType | undefined>(undefined);

const WALLPAPER_STORAGE_KEY = '@lumina_wallpaper_url';
const BLUR_STORAGE_KEY = '@lumina_wallpaper_blur';

export const WallpaperProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [wallpaperUrl, setWallpaperUrl] = useState<string | null>(null);
  const [blurIntensity, setBlurIntensity] = useState<number>(30);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const savedUrl = await AsyncStorage.getItem(WALLPAPER_STORAGE_KEY);
        const savedBlur = await AsyncStorage.getItem(BLUR_STORAGE_KEY);
        
        if (savedUrl) setWallpaperUrl(savedUrl);
        if (savedBlur) setBlurIntensity(parseInt(savedBlur, 10));
      } catch (e) {
        console.error('Failed to load wallpaper settings', e);
      }
    };
    loadSettings();
  }, []);

  const setWallpaper = async (url: string | null) => {
    setWallpaperUrl(url);
    if (url) {
      await AsyncStorage.setItem(WALLPAPER_STORAGE_KEY, url);
    } else {
      await AsyncStorage.removeItem(WALLPAPER_STORAGE_KEY);
    }
  };

  const updateBlurIntensity = async (intensity: number) => {
    setBlurIntensity(intensity);
    await AsyncStorage.setItem(BLUR_STORAGE_KEY, intensity.toString());
  };

  return (
    <WallpaperContext.Provider 
      value={{ 
        wallpaperUrl, 
        setWallpaper, 
        blurIntensity, 
        setBlurIntensity: updateBlurIntensity 
      }}
    >
      {children}
    </WallpaperContext.Provider>
  );
};

export const useWallpaper = () => {
  const context = useContext(WallpaperContext);
  if (context === undefined) {
    throw new Error('useWallpaper must be used within a WallpaperProvider');
  }
  return context;
};
