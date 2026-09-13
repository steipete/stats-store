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

  // Match pattern: AppName/Version optionally followed by Sparkle/Version
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

  // Check if the base URL already ends with the appcast filename
  // This handles cases where the full appcast URL is stored in the database
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

    // If requesting a different appcast file, replace the filename
    const baseWithoutFile = cleanBasePath.slice(0, cleanBasePath.lastIndexOf("/"));
    const replacedPath = baseWithoutFile ? `${baseWithoutFile}/${appcastPath}` : appcastPath;
    return withProtocol(`${replacedPath}${baseUrlParts.suffix}`);
  }

  // Handle GitHub URLs - convert to raw.githubusercontent.com
  const githubMatch = cleanBasePath.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/?$/);
  if (githubMatch) {
    const [, owner, repo] = githubMatch;
    return `https://raw.githubusercontent.com/${owner}/${repo}/refs/heads/main/${appcastPath}`;
  }

  // For other URLs, append the appcast path
  // If baseUrl already includes protocol, use as-is
  if (cleanBasePath.startsWith("http://") || cleanBasePath.startsWith("https://")) {
    return `${cleanBasePath}/${appcastPath}${baseUrlParts.suffix}`;
  }

  // Otherwise, add https://
  return `https://${cleanBasePath}/${appcastPath}${baseUrlParts.suffix}`;
}
