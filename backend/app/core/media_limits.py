"""Check compressed image dimensions before allocating decoded pixels; bound decoded audio."""
from io import BytesIO


def check_image_dimensions(content: bytes) -> None:
    from PIL import Image, UnidentifiedImageError
    try:
        with Image.open(BytesIO(content)) as image:
            width, height = image.size
            if width < 1 or height < 1 or width > 4096 or height > 4096 or width * height > 12_000_000:
                raise ValueError("Image dimensions exceed the supported limit")
            if image.format not in ("JPEG", "PNG", "WEBP"):
                raise ValueError("Unsupported image format")
    except (UnidentifiedImageError, Image.DecompressionBombError, OSError) as error:
        raise ValueError("Invalid or oversized image") from error


def decode_audio_bounded(path: str, max_seconds: int = 600):
    import av
    import numpy as np
    chunks, count = [], 0
    limit = max_seconds * 16000
    with av.open(path, metadata_errors="ignore", options={
        "protocol_whitelist": "file,pipe",
        "format_whitelist": "wav,mp3,ogg,matroska,webm,mov,aac,flac",
    }) as container:
        if not container.streams.audio:
            raise ValueError("No audio stream")
        resampler = av.audio.resampler.AudioResampler(format="fltp", layout="mono", rate=16000)
        for frame in container.decode(audio=0):
            for converted in resampler.resample(frame):
                samples = converted.to_ndarray().reshape(-1)[:limit - count]
                chunks.append(samples)
                count += len(samples)
                if count >= limit:
                    return np.concatenate(chunks).astype(np.float32, copy=False)
        for converted in resampler.resample(None):
            samples = converted.to_ndarray().reshape(-1)[:limit - count]
            chunks.append(samples)
            count += len(samples)
            if count >= limit:
                break
    if not count:
        raise ValueError("Empty audio stream")
    return np.concatenate(chunks).astype(np.float32, copy=False)
