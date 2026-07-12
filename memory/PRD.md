# Lumina Auth — PRD

## What is it
A premium, dark-themed, cross-platform 2FA authenticator built in Expo React
Native. Generates RFC 6238 TOTP codes for any service that speaks the standard
`otpauth://` protocol, plus Steam Guard. All secrets are encrypted at rest with
AES-256 using a PBKDF2 key derived from the user's PIN. Codes never leave the
device unencrypted.

## MVP scope (v1.0)
- **Onboarding**: 6-digit PIN setup with confirmation, optional biometric enrolment.
- **Lock screen**: PIN pad + biometric (Face ID / Touch ID / Fingerprint) unlock,
  auto-lock after configurable inactivity (default 60s).
- **Vault (Home)**: searchable list of accounts, favorites pinned to top,
  horizontal category chips row, empty state, add-FAB.
- **VaultCard**: glassmorphic card with service icon, issuer, account, large
  monospace TOTP, animated circular timer, remaining-seconds text, copy button
  (haptic + toast), star for favorite, long-press to toggle favorite.
- **Add flow**:
  - QR scan (`expo-camera`) with neon-cornered cutout overlay
  - Manual entry (issuer, account, secret, 6/8 digits, 30/60s, SHA-1/256/512,
    Steam Guard toggle, category picker)
- **Categories / folders**: default Personal/Work/Crypto/Gaming, add/remove custom.
- **Edit account**: rename issuer/account, change folder, toggle favorite, delete.
- **History**: local audit log of copied codes (opt-in).
- **Settings**: biometric on/off, require biometrics on open, hide codes,
  auto-lock, keep history, lock now, about.
- **Backup**:
  - Local: export/import encrypted JSON via `expo-sharing` + `expo-document-picker`.
  - Cloud: Emergent Google Auth → upload/restore/delete client-side-encrypted
    blob (server sees only ciphertext).

## Security
- PIN → PBKDF2(SHA-256, 20 000 iters) → 256-bit key
- AES-256-CBC with random 128-bit IV, PKCS7 padding (crypto-js).
- PIN hash stored in `expo-secure-store` (Keychain / EncryptedSharedPreferences).
- Encrypted vault blob stored in secure storage.
- Biometric option stores the PIN passphrase in secure storage, unlocked by the
  device's biometric prompt.
- Backups (local + cloud) are client-encrypted with a separate passphrase.

## API (backend)
- `POST /api/auth/session` — exchange Emergent session_token for user + persist
- `GET /api/auth/me` — current user
- `POST /api/auth/logout`
- `GET /api/backup` / `POST /api/backup` / `DELETE /api/backup` — store an
  encrypted ciphertext blob only (server never sees plaintext).

## Roadmap (post-MVP)
- Native widgets (dev build only)
- Multi-device sync (delta merges)
- Custom icons per account (gallery upload)
- Import from Google Authenticator export QR / Aegis / 2FAS
- Dynamic Material You theming based on account icon color
