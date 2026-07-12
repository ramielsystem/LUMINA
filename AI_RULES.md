# AI Rules - Lumina

## Tech Stack
- **Frontend:** React Native with Expo (SDK 54) using TypeScript.
- **Routing:** Expo Router (File-based navigation) in `frontend/app/`.
- **Backend:** Python FastAPI for the API server.
- **Database:** MongoDB (using Motor for async operations and Pymongo).
- **Styling:** Native React Native components with `react-native-reanimated` and `expo-blur`.
- **Security:** `expo-secure-store` for sensitive keys and `expo-local-authentication` for biometrics.
- **Authentication:** JWT-based auth with `pyjwt` and `bcrypt` on the backend.
- **Cryptography:** `otpauth` for TOTP generation and `crypto-js` for client-side encryption.

## Development Rules

### Frontend
- **Routing:** All new screens must be added to `frontend/app/`. Use `_layout.tsx` for shared navigation patterns.
- **Components:** Create reusable components in `frontend/src/components/`. Use functional components with hooks.
- **Styling:** Prioritize `react-native-reanimated` for animations and transitions. Use `expo-linear-gradient` for backgrounds as per design guidelines.
- **State Management:** Use React Context (e.g., `AuthContext.tsx`, `LockContext.tsx`) for global app state.
- **Storage:** Use `expo-secure-store` for encryption keys and `async-storage` for non-sensitive persistent data.
- **Icons:** Use `@expo/vector-icons` for all UI icons.

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
