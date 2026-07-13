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

### Stability & Security
- **Scanner:** Always handle camera permissions and errors in `scan.tsx`.
- **Biometrics:** Fallback to PIN must always be available if biometrics fail.
- **State:** Use Riverpod-like patterns with React Context for 2FA and Anime lists.

### Backend
- **Framework:** Always use FastAPI for API endpoints.
- **Validation:** Use Pydantic models for all request bodies and response schemas.
- **Database:** Use `motor` for asynchronous MongoDB interactions.
- **Environment:** Keep configuration in `.env` files and access via `python-dotenv`.
- **Formatting:** Follow PEP 8 standards; use `black` and `isort` for formatting.

### Security
- **Encryption:** Never store raw passwords or master keys. Use `bcrypt` for hashing.
- **Sensitive Data:** On mobile, sensitive data must be stored in `expo-secure-store`.
- **Biometrics:** Use `expo-local-authentication` to protect sensitive app sections (Vault, Settings).

### Internationalization
- **Translations:** Add all user-facing strings to `frontend/src/i18n/translations/`. Use the `t()` function from the i18n context.
