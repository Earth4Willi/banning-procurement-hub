const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#0d3d1a"/>
  <g>
    <circle cx="1130" cy="80" r="260" fill="#1a6b2f"/>
    <circle cx="-60" cy="620" r="300" fill="#1a6b2f"/>
  </g>
  <g transform="translate(96 150) scale(2.6)" fill="#f0b429">
    <path d="M10 5C6.7 6.4 4.5 9 4.5 12.4c0 2.7 1.6 4.6 3.7 4.6 1.9 0 3.2-1.4 3.2-3.3 0-1.8-1.2-3-3-3-.2 0-.4 0-.6.1.3-1.7 2-3.5 3.7-4.3L10 5Zm8 0c-3.3 1.4-5.5 4-5.5 7.4 0 2.7 1.6 4.6 3.7 4.6 1.9 0 3.2-1.4 3.2-3.3 0-1.8-1.2-3-3-3-.2 0-.4 0-.6.1.3-1.7 2-3.5 3.7-4.3L18 5Z"/>
  </g>
  <text x="110" y="210" font-family="'Trebuchet MS', Arial, sans-serif" font-size="58" font-weight="700" fill="#ffffff">BANNING PROCUREMENT HUB</text>
  <text x="110" y="280" font-family="'Trebuchet MS', Arial, sans-serif" font-size="32" fill="#f0b429">Construction materials, delivered across Ghana</text>
  <text x="110" y="380" font-family="'Trebuchet MS', Arial, sans-serif" font-size="26" fill="#d8e4dc">Cement · Iron Rods · Tiles · Roofing · Plumbing · Electricals</text>
  <text x="110" y="520" font-family="'Trebuchet MS', Arial, sans-serif" font-size="24" fill="#f0b429">banningprocurementhub.com · +233 55 885 0667</text>
</svg>`;

async function main() {
  const out = path.join(__dirname, "..", "public", "og.png");
  await sharp(Buffer.from(svg)).png().toFile(out);
  console.log("og.png written");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});