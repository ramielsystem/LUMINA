// i18n — lightweight translation dictionary + React context.
// English is authoritative. Missing keys in other locales fall back to English.
//
// To add a language:
//   1. Import the JSON dict from ./translations/xx.ts
//   2. Add it to LANGUAGES and TRANSLATIONS below.

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import * as Localization from "expo-localization";
import { storage } from "@/src/utils/storage";

import en from "./translations/en";
import ptBR from "./translations/pt-BR";
import es from "./translations/es";
import fr from "./translations/fr";
import de from "./translations/de";
import it from "./translations/it";
import ja from "./translations/ja";
import ko from "./translations/ko";
import zhCN from "./translations/zh-CN";
import zhTW from "./translations/zh-TW";
import ru from "./translations/ru";
import ar from "./translations/ar";
import hi from "./translations/hi";
import bn from "./translations/bn";
import nl from "./translations/nl";
import tr from "./translations/tr";
import pl from "./translations/pl";
import id from "./translations/id";
import vi from "./translations/vi";
import th from "./translations/th";
import sv from "./translations/sv";
import da from "./translations/da";
import no from "./translations/no";
import fi from "./translations/fi";
import cs from "./translations/cs";
import el from "./translations/el";
import he from "./translations/he";
import ro from "./translations/ro";
import hu from "./translations/hu";
import uk from "./translations/uk";
import fa from "./translations/fa";
import ms from "./translations/ms";
import tl from "./translations/tl";
import sw from "./translations/sw";
import ur from "./translations/ur";

export type Dict = typeof en;
export type TranslationKey = keyof Dict;

export const LANGUAGES: {
  code: string;
  name: string;
  native: string;
  rtl?: boolean;
}[] = [
  { code: "system", name: "System default", native: "System default" },
  { code: "en", name: "English", native: "English" },
  { code: "pt-BR", name: "Portuguese (Brazil)", native: "Português (Brasil)" },
  { code: "es", name: "Spanish", native: "Español" },
  { code: "fr", name: "French", native: "Français" },
  { code: "de", name: "German", native: "Deutsch" },
  { code: "it", name: "Italian", native: "Italiano" },
  { code: "ja", name: "Japanese", native: "日本語" },
  { code: "ko", name: "Korean", native: "한국어" },
  { code: "zh-CN", name: "Chinese (Simplified)", native: "简体中文" },
  { code: "zh-TW", name: "Chinese (Traditional)", native: "繁體中文" },
  { code: "ru", name: "Russian", native: "Русский" },
  { code: "ar", name: "Arabic", native: "العربية", rtl: true },
  { code: "hi", name: "Hindi", native: "हिन्दी" },
  { code: "bn", name: "Bengali", native: "বাংলা" },
  { code: "nl", name: "Dutch", native: "Nederlands" },
  { code: "tr", name: "Turkish", native: "Türkçe" },
  { code: "pl", name: "Polish", native: "Polski" },
  { code: "id", name: "Indonesian", native: "Bahasa Indonesia" },
  { code: "vi", name: "Vietnamese", native: "Tiếng Việt" },
  { code: "th", name: "Thai", native: "ไทย" },
  { code: "sv", name: "Swedish", native: "Svenska" },
  { code: "da", name: "Danish", native: "Dansk" },
  { code: "no", name: "Norwegian", native: "Norsk" },
  { code: "fi", name: "Finnish", native: "Suomi" },
  { code: "cs", name: "Czech", native: "Čeština" },
  { code: "el", name: "Greek", native: "Ελληνικά" },
  { code: "he", name: "Hebrew", native: "עברית", rtl: true },
  { code: "ro", name: "Romanian", native: "Română" },
  { code: "hu", name: "Hungarian", native: "Magyar" },
  { code: "uk", name: "Ukrainian", native: "Українська" },
  { code: "fa", name: "Persian", native: "فارسی", rtl: true },
  { code: "ms", name: "Malay", native: "Bahasa Melayu" },
  { code: "tl", name: "Filipino", native: "Filipino" },
  { code: "sw", name: "Swahili", native: "Kiswahili" },
  { code: "ur", name: "Urdu", native: "اردو", rtl: true },
];

const TRANSLATIONS: Record<string, Partial<Dict>> = {
  en,
  "pt-BR": ptBR,
  es,
  fr,
  de,
  it,
  ja,
  ko,
  "zh-CN": zhCN,
  "zh-TW": zhTW,
  ru,
  ar,
  hi,
  bn,
  nl,
  tr,
  pl,
  id,
  vi,
  th,
  sv,
  da,
  no,
  fi,
  cs,
  el,
  he,
  ro,
  hu,
  uk,
  fa,
  ms,
  tl,
  sw,
  ur,
};

const K_LANG = "luminaLanguage";

function detectSystemLocale(): string {
  const locales = Localization.getLocales?.() || [];
  const primary = locales[0]?.languageTag || locales[0]?.languageCode || "en";
  // Try exact match first (e.g., pt-BR), then base language.
  if (TRANSLATIONS[primary]) return primary;
  const base = primary.split("-")[0];
  if (TRANSLATIONS[base]) return base;
  // Special case: pt without region → Brazilian Portuguese
  if (base === "pt") return "pt-BR";
  if (base === "zh") return "zh-CN";
  return "en";
}

interface Ctx {
  language: string; // stored value (may be "system")
  resolved: string; // actual code being used
  rtl: boolean;
  setLanguage: (code: string) => Promise<void>;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<Ctx | null>(null);

function interpolate(str: string, vars?: Record<string, string | number>): string {
  if (!vars) return str;
  return str.replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? String(vars[k]) : `{${k}}`));
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<string>("system");
  const [systemLocale, setSystemLocale] = useState<string>("en");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const stored = await storage.getItem<string>(K_LANG, "system");
      setLanguageState(stored || "system");
      setSystemLocale(detectSystemLocale());
      setReady(true);
    })();
  }, []);

  const resolved = useMemo(() => {
    if (language && language !== "system" && TRANSLATIONS[language]) return language;
    return systemLocale;
  }, [language, systemLocale]);

  const rtl = useMemo(() => !!LANGUAGES.find((l) => l.code === resolved)?.rtl, [resolved]);

  const t = useCallback(
    (key: TranslationKey, vars?: Record<string, string | number>) => {
      const dict = TRANSLATIONS[resolved] || {};
      const value = (dict as Partial<Dict>)[key] || en[key] || key;
      return interpolate(value, vars);
    },
    [resolved]
  );

  const setLanguage = useCallback(async (code: string) => {
    setLanguageState(code);
    await storage.setItem(K_LANG, code);
  }, []);

  const value = useMemo<Ctx>(() => ({ language, resolved, rtl, setLanguage, t }), [language, resolved, rtl, setLanguage, t]);

  if (!ready) return null;
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): Ctx {
  const c = useContext(I18nContext);
  if (!c) throw new Error("useI18n must be used inside <I18nProvider>");
  return c;
}
