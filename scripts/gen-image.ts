import OpenAI from "openai";

import { exit, argv, env } from "process";

const apiKey = env.OPENAI_API_KEY;
if (!apiKey) {
  console.error("No OpenAI API key found. Try setting OPENAI_API_KEY.");
  exit(1);
}

const openai = new OpenAI({ apiKey });

async function main() {
  const [imagePath, prompt] = argv.slice(2);

  if (!imagePath || !prompt) {
    console.error("Usage: ts-node scripts/gen-image.ts <imagePath> <prompt>");
    exit(1);
  }

  const response = await openai.images.generate({
    model: "dall-e-3",
    prompt: prompt,
    n: 1,
    size: "1792x1024",
  });

  console.log(response.data);
}

await main();
