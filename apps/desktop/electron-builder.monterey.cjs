const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { parse } = require("yaml");

const upstream = parse(readFileSync(join(__dirname, "electron-builder.yml"), "utf8"));

// Replace the target array before electron-builder sees it: `extends` concatenates arrays.
module.exports = {
  ...upstream,
  extends: null,
  directories: { ...upstream.directories, output: "release" },
  artifactName: "${productName}-${version}-macos12-${arch}.${ext}",
  buildVersion: process.env.GITHUB_RUN_NUMBER || "1",
  mac: {
    ...upstream.mac,
    identity: "-",
    timestamp: "none",
    notarize: false,
    minimumSystemVersion: "12.0",
    target: [
      { target: "dmg", arch: ["x64"] },
      { target: "zip", arch: ["x64"] },
    ],
  },
  dmg: { ...upstream.dmg, sign: false },
  extraMetadata: {
    ...upstream.extraMetadata,
    piGuiLocalBuild: {
      builtFor: "macos12-x64",
      commit: process.env.GITHUB_SHA || "local",
      repository: "NightRain233/pi-gui",
    },
  },
};
