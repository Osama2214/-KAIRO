import sharp from "sharp";
import { stat } from "node:fs/promises";

// Keep the complete transparent canvas: the animation aligns these layers.
const assets = {
  "background-emblem": [990, 780],
  character: [840, 660],
  wordmark: [1044, 720],
  "full-logo": [1040, 720],
};

for (const [name, widths] of Object.entries(assets)) {
  for (const [index, width] of widths.entries()) {
    const source = `public/animat/animeverse-${name}.png`;
    const target = `public/animat/animeverse-${name}${index ? "-mobile" : ""}.webp`;
    await sharp(source)
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: index ? 75 : 80, alphaQuality: 90, effort: 6 })
      .toFile(target);
    console.log(`${target}: ${(await stat(source)).size} → ${(await stat(target)).size} bytes`);
  }
}
