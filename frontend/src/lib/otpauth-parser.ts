// Parse and build otpauth:// URIs.
import type { TOTPAlgorithm } from "./totp";

export interface ParsedOtpAuth {
  type: "totp" | "hotp" | "steam";
  issuer: string;
  account: string;
  secret: string;
  digits: number;
  period: number;
  algorithm: TOTPAlgorithm;
  steam: boolean;
}

export function parseOtpAuthUri(uri: string): ParsedOtpAuth {
  const raw = uri.trim();
  if (!raw.toLowerCase().startsWith("otpauth://")) {
    throw new Error("Not an otpauth:// URI");
  }
  // otpauth://TYPE/LABEL?PARAMS   e.g. otpauth://totp/GitHub:alice?secret=...&issuer=GitHub
  const withoutScheme = raw.substring("otpauth://".length);
  const [typeAndPath, query = ""] = withoutScheme.split("?");
  const [type, ...labelParts] = typeAndPath.split("/");
  const rawLabel = decodeURIComponent(labelParts.join("/") || "");
  const params: Record<string, string> = {};
  for (const pair of query.split("&")) {
    if (!pair) continue;
    const [k, v = ""] = pair.split("=");
    params[decodeURIComponent(k).toLowerCase()] = decodeURIComponent(v);
  }

  let issuer = params.issuer || "";
  let account = rawLabel;
  if (rawLabel.includes(":")) {
    const [labelIssuer, ...rest] = rawLabel.split(":");
    if (!issuer) issuer = labelIssuer;
    account = rest.join(":").trim();
  }
  if (!issuer && !account) {
    issuer = "Unknown";
  }

  const t = (type || "totp").toLowerCase();
  const steam = t === "steam" || (params.type || "").toLowerCase() === "steam";
  const algorithm = (params.algorithm?.toUpperCase() as TOTPAlgorithm) || "SHA1";
  return {
    type: t === "hotp" ? "hotp" : "totp",
    issuer: issuer || account || "Unknown",
    account: account || issuer || "Account",
    secret: (params.secret || "").replace(/\s+/g, "").toUpperCase(),
    digits: parseInt(params.digits || "6", 10),
    period: parseInt(params.period || "30", 10),
    algorithm: (["SHA1", "SHA256", "SHA512"] as const).includes(algorithm)
      ? algorithm
      : "SHA1",
    steam,
  };
}

export function buildOtpAuthUri(a: ParsedOtpAuth): string {
  const label = encodeURIComponent(`${a.issuer}:${a.account}`);
  const params = new URLSearchParams({
    secret: a.secret,
    issuer: a.issuer,
    algorithm: a.algorithm,
    digits: String(a.digits),
    period: String(a.period),
  });
  const type = a.steam ? "steam" : "totp";
  return `otpauth://${type}/${label}?${params.toString()}`;
}
