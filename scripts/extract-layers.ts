import fs from "fs";
import path from "path";
import Psd, { type Layer, type Node } from "@webtoon/psd";
import { PNG } from "pngjs";

import process from "process";

// Recursively traverse layers and layer groups

const nameOverrides: Record<string, string | null> = {
  Anger: "Expression - Anger",
  Fear: "Expression - Fear",
  Frown: "Expression - Frown",
  Grimace: "Expression - Grimace",
  Grin: "Expression - Grin",
  Neutral: "Expression - Neutral",
  Shock: "Expression - Shock",
  Surprise: "Expression - Surprise",
  Smile: "Expression - Smile",
  Layer10: "Gesture - 1",
  Layer1: null,
  Layer2: "Gesture - Pointing",
  Layer3: "Gesture - Arms Crossed",
  Layer4: null,
  Layer5: null,
  Layer6: null,
  Layer7: null,
  Layer8: "Gesture - Hand behind head",
  Layer9: "Gesture - Surprised",
};

async function render(layer: Layer, outPath: string) {
  console.log(`Rendering ${layer.name} to ${outPath}`);

  const pixels = await layer.composite();
  const png = new PNG({
    width: layer.width,
    height: layer.height,
  });

  png.data = Buffer.from(pixels);
  png.pack().pipe(fs.createWriteStream(outPath));
}

function traverse(parent: Node, outdir: string) {
  function traverseNode(node: Node) {
    if (node.type === "Layer") {
      const alias = nameOverrides[node.name];
      if (alias === undefined) {
        console.log("Skipping", node.name, "name not found in overrides");
        return;
      }

      if (alias === null) {
        console.log("Skipping", node.name, "name marked to be skipped");
        return;
      }

      const outPath = path.join(outdir, `${alias}.png`);
      render(node, outPath).catch((err) =>
        console.error("Failed to render layer", node.name, err),
      );
    } else if (node.type === "Group") {
      // Do something with Group
    } else if (node.type === "Psd") {
      // Do something with Psd
    } else {
      throw new Error("Invalid node type");
    }

    node.children?.forEach((child) => traverseNode(child));
  }

  return traverseNode(parent);
}

async function main() {
  const [, , path, outdir] = process.argv;
  if (!path) {
    console.error("Mising file path argument");
    process.exit(1);
  }

  if (!outdir) {
    console.error("Mising outdir argument");
    process.exit(1);
  }

  console.log("reading..");
  const psdData = fs.readFileSync(path);
  console.log("parsing...");
  const psdFile = Psd.parse(psdData.buffer);

  console.log("traversing...");
  traverse(psdFile, outdir);
}

main()
  .then(() => console.log("success"))
  .catch((e) => console.error("error", e));
