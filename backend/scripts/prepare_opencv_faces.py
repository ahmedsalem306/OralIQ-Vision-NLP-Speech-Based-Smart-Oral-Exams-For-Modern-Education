"""Explicitly provision hash-pinned face weights; no runtime/request downloads."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import urllib.request


def provision(directory: Path):
    manifest = json.loads((Path(__file__).resolve().parents[1] / 'app/assets/opencv-face-manifest.json').read_text())
    directory.mkdir(mode=0o755, parents=True, exist_ok=True)
    for model in manifest['models'].values():
        target = directory / model['filename']
        assert target.parent.resolve() == directory.resolve()
        if target.exists():
            if target.stat().st_size == model['bytes'] and hashlib.sha256(target.read_bytes()).hexdigest() == model['sha256']:
                continue
            raise RuntimeError('Existing model differs from the pinned manifest')
        temporary = directory / (model['filename'] + '.partial')
        try:
            request = urllib.request.Request(model['url'], headers={'User-Agent':'OralIQ-model-provisioning/1.0'})
            digest, count = hashlib.sha256(), 0
            with urllib.request.urlopen(request, timeout=60) as response, temporary.open('xb') as output:
                while chunk := response.read(1024 * 1024):
                    count += len(chunk)
                    if count > model['bytes']:
                        raise RuntimeError('Model size exceeds manifest')
                    digest.update(chunk)
                    output.write(chunk)
            if count != model['bytes'] or digest.hexdigest() != model['sha256']:
                raise RuntimeError('Model integrity check failed')
            temporary.chmod(0o644)
            os.replace(temporary, target)
        finally:
            temporary.unlink(missing_ok=True)
    print('PINNED_OPENCV_FACE_MODELS_READY')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--directory', type=Path, default=Path('/models/opencv-face'))
    provision(parser.parse_args().directory)
