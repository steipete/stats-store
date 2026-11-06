import { describe, expect, it } from "vitest";
import { appcastProxyContentType } from "@/lib/appcast";

describe("appcastProxyContentType", () => {
  const xml = '<?xml version="1.0"?><rss></rss>';

  it("keeps a feed media type and drops an unsafe charset", () => {
    expect(appcastProxyContentType("application/xml", xml)).toBe("application/xml");
    expect(appcastProxyContentType('text/xml; charset="utf-8"', xml)).toBe(
      "text/xml; charset=utf-8",
    );
    expect(appcastProxyContentType("application/xml; charset=utf-8\r\nX-Evil: 1", xml)).toBe(
      "application/xml",
    );
  });

  it("labels a typeless or plain-text XML document as application/xml", () => {
    expect(appcastProxyContentType(null, "\uFEFF<rss></rss>")).toBe(
      "application/xml; charset=utf-8",
    );
    expect(
      appcastProxyContentType("text/plain", "<feed xmlns='http://www.w3.org/2005/Atom'></feed>"),
    ).toBe("application/xml; charset=utf-8");
  });

  it("refuses HTML, SVG, and XHTML even when the body contains a feed tag later", () => {
    const page = "<!doctype html><html><rss></rss></html>";
    expect(appcastProxyContentType("text/html; charset=utf-8", page)).toBeNull();
    expect(appcastProxyContentType("text/plain", page)).toBeNull();
    expect(appcastProxyContentType("image/svg+xml", "<svg><rss></rss></svg>")).toBeNull();
    expect(appcastProxyContentType("application/xhtml+xml", xml)).toBeNull();
  });
});
