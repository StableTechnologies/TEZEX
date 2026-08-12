import { existsSync, readFileSync } from "fs";
import { join } from "path";

describe("TEZEX browser identity", () => {
  const publicDirectory = join(__dirname, "..", "public");
  const indexHtml = readFileSync(join(publicDirectory, "index.html"), "utf8");
  const notFoundHtml = readFileSync(join(publicDirectory, "404.html"), "utf8");
  const manifest = JSON.parse(
    readFileSync(join(publicDirectory, "site.webmanifest"), "utf8")
  );

  it("serves an adaptive favicon and scheme-aware browser chrome", () => {
    expect(indexHtml).toContain("%PUBLIC_URL%/favicon.svg");
    expect(indexHtml).toContain('media="(prefers-color-scheme: light)"');
    expect(indexHtml).toContain('media="(prefers-color-scheme: dark)"');
    expect(indexHtml).toContain("%PUBLIC_URL%/safari-pinned-tab.svg");
    expect(indexHtml).toContain("%PUBLIC_URL%/apple-touch-icon.png");
    expect(indexHtml).toContain("%PUBLIC_URL%/site.webmanifest");
    expect(indexHtml.match(/<title>/g)).toHaveLength(1);

    expect(notFoundHtml).toContain("/favicon.svg");
    expect(notFoundHtml).toContain("/site.webmanifest");
  });

  it("ships the complete TEZEX icon set and branded manifest", () => {
    [
      "favicon.svg",
      "favicon.ico",
      "apple-touch-icon.png",
      "safari-pinned-tab.svg",
      "icon-192.png",
      "icon-512.png",
    ].forEach((asset) => {
      expect(existsSync(join(publicDirectory, asset))).toBe(true);
    });

    expect(manifest.name).toBe("TEZEX");
    expect(manifest.short_name).toBe("TEZEX");
    expect(manifest.icons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ src: "/icon-192.png", sizes: "192x192" }),
        expect.objectContaining({ src: "/icon-512.png", sizes: "512x512" }),
      ])
    );
  });
});
