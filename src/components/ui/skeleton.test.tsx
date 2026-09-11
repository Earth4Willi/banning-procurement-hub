import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Skeleton, SkeletonText } from "./skeleton";

describe("Skeleton primitives", () => {
  it("renders an aria-hidden shimmering block with merged classes", () => {
    const html = renderToStaticMarkup(<Skeleton className="h-4 w-24 rounded-xl" />);
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain("skeleton");
    expect(html).toContain("h-4");
    expect(html).toContain("w-24");
    expect(html).toContain("rounded-xl");
  });

  it("SkeletonText renders the requested rows with a narrower last row", () => {
    const html = renderToStaticMarkup(<SkeletonText rows={3} />);
    expect(html.match(/class="skeleton/g)).toHaveLength(3);
    expect(html).toContain("w-2/3");
    expect(html).toContain("w-full");
  });
});

describe("globals.css skeleton styles", () => {
  it("defines the shimmer keyframes and the reduced-motion override", () => {
    const css = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8");
    expect(css).toContain("@keyframes skeleton-shimmer");
    expect(css).toContain(".skeleton");
    expect(css).toContain(".skeleton::after");
    expect(
      css.match(/prefers-reduced-motion: reduce[\s\S]*\.skeleton::after\s*\{\s*animation:\s*none;/),
    ).not.toBeNull();
  });
});
