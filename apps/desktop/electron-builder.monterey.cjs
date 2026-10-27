// Keep Intel/Monterey distribution separate from upstream's ARM64 release.
module.exports = {
  extends: "./electron-builder.yml",
  directories: { output: "release" },
  artifactName: "${productName}-${version}-macos12-${arch}.${ext}",
  buildVersion: process.env.GITHUB_RUN_NUMBER || "1",
  mac: {
    identity: "-",
    timestamp: "none",
    notarize: false,
    minimumSystemVersion: "12.0",
    target: [
      { target: "dmg", arch: ["x64"] },
      { target: "zip", arch: ["x64"] },
    ],
  },
  dmg: { sign: false },
  extraMetadata: {
    piGuiLocalBuild: {
      builtFor: "macos12-x64",
      commit: process.env.GITHUB_SHA || "local",
      repository: "NightRain233/pi-gui",
    },
  },
};
