import { existsSync, readFileSync } from "fs";
import { join } from "path";

describe("first-paint font loading", () => {
  const publicDirectory = join(__dirname, "..", "public");
  const indexCss = readFileSync(join(__dirname, "index.css"), "utf8");
  const indexHtml = readFileSync(join(publicDirectory, "index.html"), "utf8");

  it("self-hosts and preloads both interface fonts", () => {
    const document = new DOMParser().parseFromString(indexHtml, "text/html");
    const fontPreloads = Array.from(
      document.querySelectorAll<HTMLLinkElement>(
        'link[rel="preload"][as="font"]'
      )
    ).map((link) => link.getAttribute("href"));

    expect(indexCss).not.toContain("fonts.googleapis.com");
    expect(indexHtml).toContain("%PUBLIC_URL%/fonts/inter-latin.woff2");
    expect(indexHtml).toContain("%PUBLIC_URL%/fonts/red-hat-mono-latin.woff2");
    expect(fontPreloads).toEqual(
      expect.arrayContaining([
        "%PUBLIC_URL%/fonts/inter-latin.woff2",
        "%PUBLIC_URL%/fonts/red-hat-mono-latin.woff2",
      ])
    );
    expect(indexHtml.match(/font-display: block/g)).toHaveLength(2);

    expect(
      existsSync(join(publicDirectory, "fonts", "inter-latin.woff2"))
    ).toBe(true);
    expect(
      existsSync(join(publicDirectory, "fonts", "red-hat-mono-latin.woff2"))
    ).toBe(true);
  });
});
