import sharp from "sharp";
import { mkdirSync } from "node:fs";

const accent = "#2fb6de";

function svgIcon(size) {
  const r = Math.round(size * 0.22);
  const fontSize = Math.round(size * 0.5);
  return `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" rx="${r}" fill="${accent}"/>
  <text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle"
        font-family="Arial, Helvetica, sans-serif" font-weight="700"
        font-size="${fontSize}" fill="white">M</text>
</svg>`;
}

mkdirSync("public/icons", { recursive: true });

const sizes = [192, 512];
for (const size of sizes) {
  await sharp(Buffer.from(svgIcon(size)))
    .png()
    .toFile(`public/icons/icon-${size}.png`);
  console.log(`wrote public/icons/icon-${size}.png`);
}

await sharp(Buffer.from(svgIcon(180)))
  .png()
  .toFile("public/icons/apple-touch-icon.png");
console.log("wrote public/icons/apple-touch-icon.png");
