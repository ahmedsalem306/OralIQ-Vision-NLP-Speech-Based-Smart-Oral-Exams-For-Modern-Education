"""Build-only compatibility fix for webrtcvad 2.0.10's removed pkg_resources API.

Only version metadata lookup changes; the compiled VAD implementation is untouched.
Upstream: https://github.com/wiseman/py-webrtcvad/blob/2.0.10/webrtcvad.py
"""
from importlib import metadata, util
from pathlib import Path


def patched_source(source):
    old_import = "import pkg_resources"
    old_version = "pkg_resources.get_distribution('webrtcvad').version"
    if source.count(old_import) != 1 or source.count(old_version) != 1:
        raise ValueError("Unexpected legacy VAD wrapper; review before patching")
    return source.replace(old_import, "from importlib.metadata import version").replace(old_version, "version('webrtcvad')")


def main():
    if metadata.version("webrtcvad") != "2.0.10":
        raise ValueError("This patch is scoped to webrtcvad 2.0.10")
    spec = util.find_spec("webrtcvad")  # locate without importing the broken wrapper
    if spec is None or not spec.origin or Path(spec.origin).name != "webrtcvad.py":
        raise ValueError("Cannot locate expected VAD wrapper")
    path = Path(spec.origin)
    path.write_text(patched_source(path.read_text(encoding="utf-8")), encoding="utf-8")


if __name__ == "__main__":
    main()
