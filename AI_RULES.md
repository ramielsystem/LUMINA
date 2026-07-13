# AI Rules - Lumina

## Tech Stack
- **Frontend:** React Native with Expo (SDK 54) using TypeScript.
- **Routing:** Expo Router (File-based navigation) in `frontend/app/`.
- **Backend:** Python FastAPI for the API server.
- **Database:** MongoDB (using Motor for async operations).
- **Styling:** `react-native-reanimated` for animations and `expo-blur` for Glassmorphism.
- **External APIs:** AniList API (GraphQL) for Anime Hub.

## Development Rules

### Anime Theme & UI
- **Aesthetic:** Dark mode with Neon accents (Cyan, Pink, Purple).
- **Wallpapers:** Support for dynamic anime wallpapers with blur overlay.
- **Components:** Use `GlassCard.tsx` for all list items and containers.
- **Visuals:** Neon glow effects for 2FA cards when linked to an anime.

### Anime Hub
- **Integration:** Use AniList GraphQL API for fetching data.
- **Features:** Trending Animes, New Releases, and "My Anime List".
- **Linking:** Each 2FA token can be associated with an anime ID from AniList.

### Stability & Security
- **Security:** Sensitive data in `expo-secure-store`.
- **Biometrics:** `expo-local-authentication` for vault access.
- **Performance:** Avoid heavy re-renders in the TOTP list.

### Internationalization
- **Translations:** Add all strings to `frontend/src/i18n/translations/`.
