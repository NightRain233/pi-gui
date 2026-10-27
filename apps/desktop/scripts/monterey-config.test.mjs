import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { getConfig, validateConfiguration } from "app-builder-lib/out/util/config/config.js";
import { DebugLogger } from "builder-util";

test("Monterey packaging resolves to Intel DMG and ZIP only", async () => {
  const desktopDir = fileURLToPath(new URL("../", import.meta.url));
  const config = await getConfig(
    desktopDir,
    path.join(desktopDir, "electron-builder.monterey.cjs"),
  );
  await validateConfiguration(config, new DebugLogger(false));
  assert.deepEqual(config.mac.target, [
    { target: "dmg", arch: ["x64"] },
    { target: "zip", arch: ["x64"] },
  ]);
});
