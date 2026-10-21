// Downloads the quantized embedding model into data/models before the build,
// so deployments ship with it instead of fetching ~90MB on every cold start.
// Skips files that are already there.
import fs from "node:fs/promises";
import path from "node:path";

const MODEL = "Xenova/all-MiniLM-L6-v2";
const FILES = ["config.json", "tokenizer.json", "tokenizer_config.json", "onnx/model_quantized.onnx"];
const dir = path.join(process.cwd(), "data", "models", MODEL);

for (const file of FILES) {
  const dest = path.join(dir, file);
  try {
    await fs.access(dest);
    continue;
  } catch {}
  const res = await fetch(`https://huggingface.co/${MODEL}/resolve/main/${file}`);
  if (!res.ok) throw new Error(`${file}: HTTP ${res.status}`);
  await fs.mkdir(path.dirname(dest), { recursive: true });
  await fs.writeFile(dest, Buffer.from(await res.arrayBuffer()));
  console.log(`fetched ${file}`);
}
