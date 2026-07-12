// LuminaLogo — an SVG anime-inspired mascot mark for Lumina Auth.
// A hexagonal shield of light with an "L" rune, framed by two flowing
// crescent "hair" strokes. Uses gradients + radial glow. Renders sharp at
// any size (used in onboarding, lock screen, splash, and settings).
import React from "react";
import Svg, {
  Defs,
  LinearGradient,
  RadialGradient,
  Path,
  Polygon,
  Stop,
  G,
  Circle,
} from "react-native-svg";

interface Props {
  size?: number;
  glow?: boolean;
}

export function LuminaLogo({ size = 128, glow = true }: Props) {
  const s = size;
  return (
    <Svg width={s} height={s} viewBox="0 0 200 200">
      <Defs>
        <RadialGradient id="bg" cx="100" cy="100" r="100" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#0A1420" stopOpacity="1" />
          <Stop offset="1" stopColor="#050505" stopOpacity="1" />
        </RadialGradient>
        <RadialGradient id="glow" cx="100" cy="100" r="80" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#00F0FF" stopOpacity="0.55" />
          <Stop offset="0.6" stopColor="#7B61FF" stopOpacity="0.15" />
          <Stop offset="1" stopColor="#000000" stopOpacity="0" />
        </RadialGradient>
        <LinearGradient id="shield" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#00F0FF" />
          <Stop offset="1" stopColor="#7B61FF" />
        </LinearGradient>
        <LinearGradient id="shieldFill" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="rgba(0, 240, 255, 0.28)" />
          <Stop offset="1" stopColor="rgba(123, 97, 255, 0.20)" />
        </LinearGradient>
        <LinearGradient id="hair" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#00F0FF" stopOpacity="0.9" />
          <Stop offset="1" stopColor="#7B61FF" stopOpacity="0.9" />
        </LinearGradient>
        <LinearGradient id="hair2" x1="1" y1="0" x2="0" y2="0">
          <Stop offset="0" stopColor="#7B61FF" stopOpacity="0.9" />
          <Stop offset="1" stopColor="#00F0FF" stopOpacity="0.9" />
        </LinearGradient>
      </Defs>

      {/* Rounded-square background (app-icon safe) */}
      <Path
        d="M 40 0 L 160 0 Q 200 0 200 40 L 200 160 Q 200 200 160 200 L 40 200 Q 0 200 0 160 L 0 40 Q 0 0 40 0 Z"
        fill="url(#bg)"
      />
      {glow && (
        <Circle cx="100" cy="100" r="80" fill="url(#glow)" />
      )}

      {/* Flowing crescent "hair" strokes framing the shield */}
      <Path
        d="M 40 60 Q 20 100 40 150 Q 60 130 55 100 Q 55 80 40 60 Z"
        fill="url(#hair)"
        opacity="0.75"
      />
      <Path
        d="M 160 60 Q 180 100 160 150 Q 140 130 145 100 Q 145 80 160 60 Z"
        fill="url(#hair2)"
        opacity="0.75"
      />

      {/* Hex shield */}
      <G>
        <Polygon
          points="100,30 158,62 158,138 100,170 42,138 42,62"
          fill="url(#shieldFill)"
          stroke="url(#shield)"
          strokeWidth="3.5"
          strokeLinejoin="round"
        />
        {/* Inner subtle hexagon */}
        <Polygon
          points="100,50 142,72 142,128 100,150 58,128 58,72"
          fill="none"
          stroke="rgba(255,255,255,0.15)"
          strokeWidth="1"
          strokeLinejoin="round"
        />
      </G>

      {/* Stylized "L" rune */}
      <Path
        d="M 82 66 L 82 132 L 128 132"
        stroke="url(#shield)"
        strokeWidth="9"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Rune sparkle */}
      <Circle cx="128" cy="132" r="4" fill="#FFFFFF" opacity="0.9" />
      <Circle cx="82" cy="66" r="3" fill="#FFFFFF" opacity="0.8" />

      {/* Floating particles */}
      <Circle cx="45" cy="45" r="1.5" fill="#00F0FF" opacity="0.8" />
      <Circle cx="160" cy="45" r="1.2" fill="#7B61FF" opacity="0.8" />
      <Circle cx="50" cy="170" r="1.2" fill="#7B61FF" opacity="0.6" />
      <Circle cx="155" cy="165" r="1.5" fill="#00F0FF" opacity="0.6" />
      <Circle cx="100" cy="185" r="1" fill="#FFFFFF" opacity="0.5" />
    </Svg>
  );
}
