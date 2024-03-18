import process from "process";
import pathlib from "path";
import sharp from "sharp";
import fs from "fs";

// Ours
import { parsePath, type LayerInfo } from "@/images";

async function main() {
  const [, , outDir, ...paths] = process.argv;
  if (!outDir) {
    console.error(
      "Please pass an output directory and at least one image to composite",
    );
    process.exit(1);
  }

  const stat = fs.lstatSync(outDir);
  if (!stat.isDirectory()) {
    console.error("First argument must be a directory");
    process.exit(1);
  }

  const layersByCategory: Record<string, LayerInfo[]> = {};
  for (const path of paths) {
    const layerInfo = parsePath(path);
    const category = layerInfo.category;
    layersByCategory[category] = (layersByCategory[category] ?? []).concat(
      layerInfo,
    );
  }

  const combos: LayerInfo[][] = [];
  const f = (consumedCategories: string[], acc: LayerInfo[]) => {
    if (consumedCategories.length >= Object.keys(layersByCategory).length) {
      combos.push(acc);
      return;
    }

    for (const [category, layers] of Object.entries(layersByCategory)) {
      if (consumedCategories.includes(category)) {
        continue;
      }

      for (const layer of layers) {
        f([...consumedCategories, category], acc.concat(layer));
      }

      return;
    }
  };

  f([], []);

  for (const combo of combos) {
    await render(outDir, combo);
  }
}

async function render(outDir: string, layers: LayerInfo[]) {
  const outPath =
    pathlib.join(outDir, layers.map((info) => info.attribute).join(" ")) +
    ".png";

  console.log(`Rendering ${outPath}`);

  const backgroundLayer = layers.shift();
  if (!backgroundLayer) {
    throw new Error("Expected stack of layers to at least have one layer");
  }

  await sharp(backgroundLayer.path)
    .composite(
      layers.map((layer) => ({ input: layer.path, blend: "multiply" })),
    )
    .toFile(outPath);
}

await main();
