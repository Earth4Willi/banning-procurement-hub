const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const svgPath = path.join(__dirname, "..", "src", "app", "icon.svg");
const svg = fs.readFileSync(svgPath, "utf8");

async function main() {
  const outDir = path.join(__dirname, "..", "public");
  const sizes = [192, 512];
  for (const size of sizes) {
    const out = path.join(outDir, `icon-${size}.png`);
    const resized = await sharp(Buffer.from(svg))
      .resize(size, size)
      .png();
    await resized.toFile(out);
  }
  const meta = await sharp(Buffer.from(svg)).metadata();
  console.log(`icons written from ${meta.width}x${meta.height} source`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
