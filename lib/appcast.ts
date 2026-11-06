import { parseGitHubRepository } from "@/lib/github";

interface SparkleUserAgent {
  appName: string;
  appVersion: string;
}

/**
 * Parse Sparkle User-Agent header
 * Format: "AppName/DisplayVersion Sparkle/SparkleVersion"
 * Example: "MyApp/2.1.3 Sparkle/2.0.0"
 */
export function parseSparkleUserAgent(userAgent: string | null): SparkleUserAgent | null {
  if (!userAgent) {
    return null;
  }

  const match = userAgent.match(/^([^/]+)\/([^\s]+)/);

  if (!match) {
    return null;
  }

  return {
    appName: match[1],
    appVersion: match[2],
  };
}

function withProtocol(url: string): string {
  return url.startsWith("http://") || url.startsWith("https://") ? url : `https://${url}`;
}

function appcastFileName(path: string): string {
  return path.split("/").pop() || path;
}

function splitUrlSuffix(url: string): { path: string; suffix: string } {
  const suffixIndex = url.search(/[?#]/);
  if (suffixIndex === -1) {
    return { path: url, suffix: "" };
  }

  return {
    path: url.slice(0, suffixIndex),
    suffix: url.slice(suffixIndex),
  };
}

function isKnownUnstableAppcastFile(fileName: string): boolean {
  return fileName === "appcast-beta.xml" || fileName === "appcast-prerelease.xml";
}

export function constructAppcastUrl(baseUrl: string, appcastPath: string): string {
  // Remove trailing slash from the path without mutating query strings or fragments.
  const baseUrlParts = splitUrlSuffix(baseUrl);
  const cleanBasePath = baseUrlParts.path.replace(/\/$/, "");
  const cleanBaseUrl = `${cleanBasePath}${baseUrlParts.suffix}`;

  if (cleanBasePath.endsWith(".xml")) {
    const storedFileName = appcastFileName(cleanBasePath);

    // Direct XML URLs are stable feeds by default, including custom stable
    // filenames like releases.xml or appcast-enterprise.xml. Only the known
    // unstable proxy basenames are rewritten for stable clients.
    if (
      cleanBasePath.endsWith(`/${appcastPath}`) ||
      cleanBasePath === appcastPath ||
      (appcastPath === "appcast.xml" && !isKnownUnstableAppcastFile(storedFileName))
    ) {
      return withProtocol(cleanBaseUrl);
    }

    const baseWithoutFile = cleanBasePath.slice(0, cleanBasePath.lastIndexOf("/"));
    const replacedPath = baseWithoutFile ? `${baseWithoutFile}/${appcastPath}` : appcastPath;
    return withProtocol(`${replacedPath}${baseUrlParts.suffix}`);
  }

  const repository = parseGitHubRepository(cleanBasePath);
  if (repository?.isRoot) {
    const { owner, repo } = repository;
    return `https://raw.githubusercontent.com/${owner}/${repo}/refs/heads/main/${appcastPath}`;
  }

  return withProtocol(`${cleanBasePath}/${appcastPath}${baseUrlParts.suffix}`);
}

const FEED_MEDIA_TYPES = new Set([
  "application/atom+xml",
  "application/rdf+xml",
  "application/rss+xml",
  "application/xml",
  "text/xml",
]);

// GitHub raw serves appcast XML as text/plain. Some object stores use octet-stream.
const XML_BODY_MEDIA_TYPES = new Set(["application/octet-stream", "text/plain"]);

function mediaTypeParts(value: string | null): { charset?: string; mediaType: string } | null {
  if (!value) return null;
  const [rawType, ...parameters] = value
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean);
  if (!rawType || !/^[\w!#$&^_.+-]+\/[\w!#$&^_.+-]+$/.test(rawType)) return null;

  let charset: string | undefined;
  for (const parameter of parameters) {
    const separator = parameter.indexOf("=");
    if (separator === -1) continue;
    const name = parameter.slice(0, separator).trim().toLowerCase();
    const rawCharset = parameter
      .slice(separator + 1)
      .trim()
      .replaceAll('"', "");
    if (name === "charset" && /^[A-Za-z0-9._+-]+$/.test(rawCharset)) charset = rawCharset;
  }

  return { charset, mediaType: rawType.toLowerCase() };
}

function withCharset(mediaType: string, charset?: string): string {
  return charset ? `${mediaType}; charset=${charset}` : mediaType;
}

function looksLikeXmlFeed(body: string): boolean {
  const start = body.replace(/^\uFEFF/, "").trimStart();
  return /^<(?:\?xml\b|rss\b|feed\b)/i.test(start);
}

export function appcastProxyContentType(
  upstreamContentType: string | null,
  body: string,
): string | null {
  const parsed = mediaTypeParts(upstreamContentType);
  if (parsed && FEED_MEDIA_TYPES.has(parsed.mediaType)) {
    return withCharset(parsed.mediaType, parsed.charset);
  }
  if (looksLikeXmlFeed(body) && (!parsed || XML_BODY_MEDIA_TYPES.has(parsed.mediaType))) {
    return withCharset("application/xml", parsed?.charset ?? "utf-8");
  }
  return null;
}
