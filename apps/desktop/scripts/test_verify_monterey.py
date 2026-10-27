import unittest
import subprocess
import sys
import tempfile

from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path

spec = spec_from_file_location("verify_monterey", Path(__file__).with_name("verify-monterey.py"))
verifier = module_from_spec(spec)
spec.loader.exec_module(verifier)


class MacOSCompatibilityTests(unittest.TestCase):
    @unittest.skipUnless(sys.platform == "darwin", "requires Apple's native build tools")
    def test_inspects_a_real_intel_monterey_binary(self):
        executable = Path(tempfile.mkdtemp(prefix="pi-gui-monterey-probe-")) / "Helper (GPU)"
        subprocess.run(["xcrun", "clang", "-target", "x86_64-apple-macos12.0", "-x", "c", "-o", str(executable), "-"],
                       input="int main(void) { return 0; }", text=True, check=True)
        self.assertEqual(verifier.check_binary(executable), "12.0")

    def test_accepts_monterey_build_version(self):
        self.assertEqual(verifier.check_macos_target("cmd LC_BUILD_VERSION\nplatform 1\nminos 12.0\nsdk 15.5"), "12.0")

    def test_accepts_legacy_minimum_version(self):
        self.assertEqual(verifier.check_macos_target("cmd LC_VERSION_MIN_MACOSX\nversion 10.15\nsdk 15.0"), "10.15")

    def test_rejects_ventura_binary_despite_newer_sdk(self):
        with self.assertRaisesRegex(ValueError, "13.0"):
            verifier.check_macos_target("cmd LC_BUILD_VERSION\nplatform 1\nminos 13.0\nsdk 15.5")

    def test_rejects_unknown_minimum(self):
        with self.assertRaisesRegex(ValueError, "minimum"):
            verifier.check_macos_target("cmd LC_UUID\nuuid placeholder")

    def test_rejects_non_macos_platform(self):
        with self.assertRaisesRegex(ValueError, "platform"):
            verifier.check_macos_target("cmd LC_BUILD_VERSION\nplatform 2\nminos 12.0\nsdk 15.5")


if __name__ == "__main__":
    unittest.main()
