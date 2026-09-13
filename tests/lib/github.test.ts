import { describe, expect, it } from "vitest";
import { parseGitHubRepository } from "@/lib/github";
import { constructAppcastUrl } from "@/lib/appcast";

describe("GitHub repository URLs", () => {
  it.each([
    "https://github.com/owner/repo.git?tab=readme",
    "github.com/owner/repo",
    "https://GITHUB.COM/owner/repo/",
  ])("normalizes %s", (value) => {
    expect(parseGitHubRepository(value)).toEqual({ owner: "owner", repo: "repo", isRoot: true });
    expect(constructAppcastUrl(value, "appcast.xml")).toBe(
      "https://raw.githubusercontent.com/owner/repo/refs/heads/main/appcast.xml",
    );
  });
  it.each([
    "https://notgithub.com/owner/repo",
    "https://example.com/github.com/owner/repo",
    "https://github.com/owner",
    "ftp://github.com/owner/repo",
    "https://github.com:444/owner/repo",
    "https://github.com/owner/.git",
    "http://[",
  ])("rejects %s", (value) => {
    expect(parseGitHubRepository(value)).toBeNull();
  });
  it("extracts repositories from GitHub file links without treating them as root folders", () => {
    expect(parseGitHubRepository("https://github.com/owner/repo/blob/main/feed.xml")).toEqual({
      owner: "owner",
      repo: "repo",
      isRoot: false,
    });
  });
});
