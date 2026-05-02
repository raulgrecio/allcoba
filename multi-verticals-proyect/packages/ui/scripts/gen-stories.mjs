#!/usr/bin/env node
/**
 * Scans src/components for .tsx files missing a .stories.tsx sibling.
 * Usage:
 *   node scripts/gen-stories.mjs          # list missing
 *   node scripts/gen-stories.mjs --write  # create stubs
 */

import { readdirSync, existsSync, writeFileSync } from "node:fs";
import { join, relative, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const __dir = dirname(fileURLToPath(import.meta.url));
const componentsDir = join(__dir, "../src/components");
const write = process.argv.includes("--write");

function scanDir(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      scanDir(full);
    } else if (entry.name.endsWith(".tsx") && !entry.name.endsWith(".stories.tsx")) {
      const storyPath = full.replace(/\.tsx$/, ".stories.tsx");
      if (!existsSync(storyPath)) {
        const rel = relative(componentsDir, full);
        console.log(`[MISSING] ${rel}`);
        if (write) createStub(full, storyPath);
      }
    }
  }
}

function toPascalCase(str) {
  return str.replace(/(^|-)([a-z])/g, (_, _sep, ch) => ch.toUpperCase());
}

function createStub(componentPath, storyPath) {
  const fileName = basename(componentPath, ".tsx");
  const name = toPascalCase(fileName);
  const rel = relative(componentsDir, componentPath);
  const folder = rel.split("/")[0];
  const titleFolder = folder.charAt(0).toUpperCase() + folder.slice(1);

  const content = `import type { Meta, StoryObj } from "@storybook/react";
import { ${name} } from "./${fileName}";

const meta: Meta<typeof ${name}> = {
  title: "${titleFolder}/${name}",
  component: ${name},
  tags: ["autodocs"],
};
export default meta;
type Story = StoryObj<typeof ${name}>;

export const Default: Story = {};
`;
  writeFileSync(storyPath, content, "utf8");
  console.log(`  → created ${relative(componentsDir, storyPath)}`);
}

scanDir(componentsDir);
if (!write) console.log("\nRun with --write to create stubs.");
