// Service icon resolver.
// Priority: (1) local mapping by keyword -> MaterialCommunityIcons/Ionicons name,
// (2) auto-fetch favicon via Google's public favicon service, (3) initials chip fallback.

export interface ServiceIcon {
  type: "vector" | "favicon" | "initials";
  library?: "MaterialCommunityIcons" | "Ionicons" | "FontAwesome5";
  name?: string;
  url?: string;
  initials?: string;
  color: string;
}

interface KnownService {
  keys: string[];
  library: "MaterialCommunityIcons" | "Ionicons" | "FontAwesome5";
  name: string;
  color: string;
  domain?: string;
}

const KNOWN: KnownService[] = [
  { keys: ["google", "gmail"], library: "MaterialCommunityIcons", name: "google", color: "#EA4335", domain: "google.com" },
  { keys: ["microsoft", "outlook", "azure"], library: "MaterialCommunityIcons", name: "microsoft", color: "#00A4EF", domain: "microsoft.com" },
  { keys: ["github"], library: "MaterialCommunityIcons", name: "github", color: "#FFFFFF", domain: "github.com" },
  { keys: ["gitlab"], library: "MaterialCommunityIcons", name: "gitlab", color: "#FC6D26", domain: "gitlab.com" },
  { keys: ["discord"], library: "MaterialCommunityIcons", name: "discord", color: "#5865F2", domain: "discord.com" },
  { keys: ["slack"], library: "MaterialCommunityIcons", name: "slack", color: "#4A154B", domain: "slack.com" },
  { keys: ["twitter", "x.com"], library: "MaterialCommunityIcons", name: "twitter", color: "#1DA1F2", domain: "twitter.com" },
  { keys: ["facebook", "meta"], library: "MaterialCommunityIcons", name: "facebook", color: "#1877F2", domain: "facebook.com" },
  { keys: ["instagram"], library: "MaterialCommunityIcons", name: "instagram", color: "#E4405F", domain: "instagram.com" },
  { keys: ["linkedin"], library: "MaterialCommunityIcons", name: "linkedin", color: "#0A66C2", domain: "linkedin.com" },
  { keys: ["apple", "icloud"], library: "MaterialCommunityIcons", name: "apple", color: "#FFFFFF", domain: "apple.com" },
  { keys: ["amazon", "aws"], library: "MaterialCommunityIcons", name: "amazon", color: "#FF9900", domain: "amazon.com" },
  { keys: ["dropbox"], library: "MaterialCommunityIcons", name: "dropbox", color: "#0061FF", domain: "dropbox.com" },
  { keys: ["reddit"], library: "MaterialCommunityIcons", name: "reddit", color: "#FF4500", domain: "reddit.com" },
  { keys: ["steam"], library: "MaterialCommunityIcons", name: "steam", color: "#00ADEE", domain: "steampowered.com" },
  { keys: ["twitch"], library: "MaterialCommunityIcons", name: "twitch", color: "#9146FF", domain: "twitch.tv" },
  { keys: ["binance"], library: "FontAwesome5", name: "bitcoin", color: "#F0B90B", domain: "binance.com" },
  { keys: ["coinbase"], library: "MaterialCommunityIcons", name: "bitcoin", color: "#0052FF", domain: "coinbase.com" },
  { keys: ["kraken"], library: "MaterialCommunityIcons", name: "currency-btc", color: "#5741D9", domain: "kraken.com" },
  { keys: ["paypal"], library: "MaterialCommunityIcons", name: "paypal", color: "#00457C", domain: "paypal.com" },
  { keys: ["stripe"], library: "MaterialCommunityIcons", name: "stripe", color: "#635BFF", domain: "stripe.com" },
  { keys: ["cloudflare"], library: "MaterialCommunityIcons", name: "cloud", color: "#F38020", domain: "cloudflare.com" },
  { keys: ["digitalocean"], library: "MaterialCommunityIcons", name: "digital-ocean", color: "#0080FF", domain: "digitalocean.com" },
  { keys: ["notion"], library: "MaterialCommunityIcons", name: "note-text", color: "#FFFFFF", domain: "notion.so" },
  { keys: ["figma"], library: "MaterialCommunityIcons", name: "vector-triangle", color: "#F24E1E", domain: "figma.com" },
  { keys: ["spotify"], library: "MaterialCommunityIcons", name: "spotify", color: "#1DB954", domain: "spotify.com" },
  { keys: ["netflix"], library: "MaterialCommunityIcons", name: "netflix", color: "#E50914", domain: "netflix.com" },
];

const ACCENTS = ["#00F0FF", "#7B61FF", "#FF3B7F", "#FFB020", "#34C759", "#FF6B6B", "#4ADEDE", "#B084F7"];

function accentFor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return ACCENTS[h % ACCENTS.length];
}

function initialsFor(name: string): string {
  const trimmed = (name || "?").trim();
  if (!trimmed) return "?";
  const parts = trimmed.split(/[\s.\-_]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return trimmed.slice(0, 2).toUpperCase();
}

export function resolveIcon(issuer: string, customUrl?: string | null): ServiceIcon {
  if (customUrl) {
    return { type: "favicon", url: customUrl, color: accentFor(issuer), initials: initialsFor(issuer) };
  }
  const lower = (issuer || "").toLowerCase();
  const match = KNOWN.find((k) => k.keys.some((key) => lower.includes(key)));
  if (match) {
    return { type: "vector", library: match.library, name: match.name, color: match.color, initials: initialsFor(issuer) };
  }
  // Try favicon by parsing possible domain in issuer
  const domainMatch = lower.match(/([a-z0-9-]+\.[a-z]{2,})/);
  if (domainMatch) {
    const url = `https://www.google.com/s2/favicons?domain=${domainMatch[1]}&sz=128`;
    return { type: "favicon", url, color: accentFor(issuer), initials: initialsFor(issuer) };
  }
  return { type: "initials", initials: initialsFor(issuer), color: accentFor(issuer) };
}
