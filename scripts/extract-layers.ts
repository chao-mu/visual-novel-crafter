import fs from "fs";
import path from "path";
import Psd, { type Layer, type Node } from "@webtoon/psd";
import { PNG } from "pngjs";

import process from "process";

// Ours
import { isValidName } from "@/images";

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
      const name = node.name;
      if (isValidName(node.name)) {
        const outPath = path.join(outdir, `${name}.png`);
        render(node, outPath).catch((err) =>
          console.error("Failed to render layer.", node.name, err),
        );
      } else {
        console.log("Invalid name, skipping.", name);
      }
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
