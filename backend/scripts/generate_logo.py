"""One-shot logo generator for Lumina Auth.

Run: python /app/backend/scripts/generate_logo.py
Generates an anime-styled logo mascot and saves PNG to
/app/frontend/assets/images/lumina-logo.png (plus icon/adaptive/splash).
"""

import asyncio
import base64
import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from emergentintegrations.llm.chat import LlmChat, UserMessage

BACKEND_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BACKEND_DIR / ".env")

ASSETS_DIR = Path("/app/frontend/assets/images")

PROMPTS = {
    "logo": (
        "A premium mobile app icon for a 2FA authenticator called 'Lumina Auth'. "
        "Anime-inspired mascot: a graceful female cyber guardian with long flowing "
        "silver-cyan hair and glowing cyan eyes, wearing a sleek dark holographic "
        "jacket, holding up a radiant hexagonal shield of light in front of her. "
        "The shield is the focal point: crystalline neon-cyan and violet with a "
        "subtle 'L' rune glowing inside. Background: deep obsidian black with soft "
        "cyan and purple bokeh, tiny floating light particles. Cinematic anime key "
        "art, ultra-detailed, symmetrical composition, centered subject, square "
        "1:1 aspect ratio, safe area padded for iOS app icon corners, no text, "
        "no letters, no logo watermarks."
    ),
    "splash": (
        "Minimal premium splash artwork for a 2FA authenticator app called "
        "'Lumina Auth'. Center: a floating crystalline hexagonal shield of neon "
        "cyan and violet light with a glowing 'L' rune inside. Anime aesthetic, "
        "cinematic soft glow, deep obsidian black background, subtle light "
        "particles, symmetrical, portrait orientation, no text, no watermarks."
    ),
}


async def generate(prompt_key: str, output_name: str, model: str = "gemini-3.1-flash-image-preview") -> Path:
    api_key = os.getenv("EMERGENT_LLM_KEY")
    if not api_key:
        raise RuntimeError("EMERGENT_LLM_KEY not set")

    chat = LlmChat(
        api_key=api_key,
        session_id=f"lumina-logo-{prompt_key}",
        system_message="You are a premium mobile app art director.",
    )
    chat.with_model("gemini", model).with_params(modalities=["image", "text"])

    msg = UserMessage(text=PROMPTS[prompt_key])
    text, images = await chat.send_message_multimodal_response(msg)
    if not images:
        raise RuntimeError(f"No image returned for {prompt_key}: {text[:120]}")

    ASSETS_DIR.mkdir(parents=True, exist_ok=True)
    out_path = ASSETS_DIR / output_name
    with open(out_path, "wb") as f:
        f.write(base64.b64decode(images[0]["data"]))
    print(f"Wrote {out_path} ({out_path.stat().st_size} bytes)")
    return out_path


async def main():
    logo = await generate("logo", "lumina-logo.png")
    # Reuse the logo for icon & adaptive; splash uses a different composition.
    import shutil

    for target in ("icon.png", "adaptive-icon.png", "favicon.png"):
        shutil.copy(logo, ASSETS_DIR / target)
        print(f"Copied → {ASSETS_DIR / target}")
    await generate("splash", "splash-image.png")


if __name__ == "__main__":
    asyncio.run(main())
