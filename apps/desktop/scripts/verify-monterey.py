"""Check the actual Intel slices, not only the application's Info.plist."""

import json
import plistlib
import re
import subprocess
import sys
from pathlib import Path


def check_macos_target(load_commands):
    minimum = None
    for command in re.split(r"\bcmd ", load_commands):
        if command.startswith("LC_BUILD_VERSION"):
            platform = re.search(r"\bplatform\s+(\S+)", command)
            if not platform or platform.group(1).lower() not in ("1", "macos"):
                raise ValueError("Unexpected Mach-O platform")
            minimum = re.search(r"\bminos\s+(\d+(?:\.\d+){1,2})", command)
        elif command.startswith("LC_VERSION_MIN_MACOSX"):
            minimum = re.search(r"\bversion\s+(\d+(?:\.\d+){1,2})", command)
        if minimum:
            break
    if not minimum:
        raise ValueError("Missing macOS minimum version")
    version = minimum.group(1)
    if tuple(map(int, version.split("."))) + (0,) * (3 - len(version.split("."))) > (12, 0, 0):
        raise ValueError(f"Requires macOS {version}; expected macOS 12.0 or earlier")
    return version


def check_binary(candidate):
    subprocess.run(["lipo", str(candidate), "-verify_arch", "x86_64"], check=True)
    # otool-classic treats filenames ending in (...) as archive members.
    with candidate.open("rb") as binary:
        descriptor = binary.fileno()
        commands = subprocess.check_output(
            ["otool", "-arch", "x86_64", "-l", f"/dev/fd/{descriptor}"],
            pass_fds=(descriptor,), text=True,
        )
    return check_macos_target(commands)


def verify_bundle(bundle):
    contents = bundle / "Contents"
    with (contents / "Info.plist").open("rb") as source:
        info = plistlib.load(source)
    if info.get("LSMinimumSystemVersion") != "12.0":
        raise ValueError("Info.plist must declare macOS 12.0")
    binaries = []
    ignored_prebuilds = []
    for candidate in sorted(contents.rglob("*")):
        if candidate.is_symlink() or not candidate.is_file():
            continue
        if "prebuilds" in candidate.parts:
            prebuild = candidate.parts[candidate.parts.index("prebuilds") + 1]
            if prebuild != "darwin-x64":
                ignored_prebuilds.append(str(candidate.relative_to(bundle)))
                continue
        with candidate.open("rb") as source:
            magic = source.read(4)
        if magic not in (b"\xcf\xfa\xed\xfe", b"\xfe\xed\xfa\xcf", b"\xca\xfe\xba\xbe", b"\xca\xfe\xba\xbf"):
            continue
        try:
            minimum = check_binary(candidate)
        except ValueError as error:
            raise ValueError(f"{candidate.relative_to(bundle)}: {error}") from error
        binaries.append({"file": str(candidate.relative_to(bundle)), "minimumMacOS": minimum})
    required = [info["CFBundleExecutable"], "pi-gui-notification-status-helper", "pty.node", "darwin-platform.node"]
    for name in required:
        if not any(Path(binary["file"]).name == name for binary in binaries):
            raise ValueError(f"Required Intel binary was not verified: {name}")
    subprocess.run(["codesign", "--verify", "--deep", "--strict", str(bundle)], check=True)
    return {"architecture": "x86_64", "targetMacOS": "12.0", "binaries": binaries,
            "ignoredOtherPlatformPrebuilds": ignored_prebuilds,
            "montereyHardwareTested": False}


if __name__ == "__main__":
    report = verify_bundle(Path(sys.argv[1]).resolve())
    print(json.dumps(report, indent=2))
