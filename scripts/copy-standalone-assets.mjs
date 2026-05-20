import { existsSync } from "node:fs";
import { cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const standaloneDir = path.join(root, ".next", "standalone");

if (!existsSync(standaloneDir)) {
  throw new Error("Missing .next/standalone. Run next build first.");
}

const copies = [
  {
    from: path.join(root, ".next", "static"),
    to: path.join(standaloneDir, ".next", "static"),
  },
  {
    from: path.join(root, "public"),
    to: path.join(standaloneDir, "public"),
  },
];

for (const { from, to } of copies) {
  if (!existsSync(from)) continue;
  await mkdir(path.dirname(to), { recursive: true });
  await rm(to, { recursive: true, force: true });
  await cp(from, to, { recursive: true });
}
