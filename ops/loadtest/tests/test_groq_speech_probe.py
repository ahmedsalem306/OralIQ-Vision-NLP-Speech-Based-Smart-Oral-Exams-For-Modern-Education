import importlib.util
from io import BytesIO
import json
from pathlib import Path
import unittest
from urllib.error import HTTPError

spec = importlib.util.spec_from_file_location('groq_probe', Path(__file__).resolve().parents[1] / 'groq_speech_probe.py')
probe = importlib.util.module_from_spec(spec)
spec.loader.exec_module(probe)


class Response:
    status = 200

    def __init__(self, body):
        self.body = BytesIO(body)

    def __enter__(self):
        return self

    def __exit__(self, *args):
        self.body.close()

    def read(self, limit):
        return self.body.read(limit)


class Opener:
    def __init__(self, response=None, error=None):
        self.response, self.error = response, error
        self.requests = []

    def open(self, request, timeout):
        self.requests.append(request)
        if self.error:
            raise self.error
        return self.response


class GroqProbeTests(unittest.TestCase):
    def call(self, opener):
        return probe.request_once(opener, 'gsk_' + 'a' * 32, b'audio', probe.MODELS[0],
                                  'answer.m4a', 'audio/mp4', 34.539)

    def test_upload_is_anonymous_and_has_no_reference_prompt(self):
        body, content_type = probe.multipart(b'owner-audio', 'answer.m4a', 'audio/mp4', probe.MODELS[0])
        self.assertIn(b'filename="answer.m4a"', body)
        self.assertNotIn(b'name="prompt"', body)
        self.assertEqual(body.count(b'name="timestamp_granularities[]"'), 2)
        self.assertTrue(content_type.startswith('multipart/form-data; boundary='))

    def test_rejects_arbitrary_filename_or_model(self):
        with self.assertRaises(ValueError):
            probe.multipart(b'audio', 'student-name.m4a', 'audio/mp4', probe.MODELS[0])
        with self.assertRaises(ValueError):
            probe.multipart(b'audio', 'answer.m4a', 'audio/mp4', 'unknown')

    def test_success_does_not_put_api_key_into_report(self):
        payload = {'text': 'test answer', 'words': [{'word': 'test', 'start': 0, 'end': 1}]}
        opener = Opener(response=Response(json.dumps(payload).encode()))
        result = self.call(opener)
        self.assertEqual(result['http_status'], 200)
        self.assertTrue(result['word_timestamps_usable'])
        self.assertEqual(opener.requests[0].full_url, probe.ENDPOINT)
        self.assertNotIn('gsk_', json.dumps(result))

    def test_429_stops_without_retry_or_leaking_provider_error_body(self):
        body = BytesIO(b'private-provider-error-body')
        error = HTTPError(probe.ENDPOINT, 429, 'rate limited', {'Retry-After': '12'}, body)
        opener = Opener(error=error)
        result = self.call(opener)
        self.assertEqual(len(opener.requests), 1)
        self.assertEqual(result['http_status'], 429)
        self.assertEqual(result['retry_after_seconds'], '12')
        self.assertTrue(body.closed)
        self.assertNotIn('private-provider', json.dumps(result))

    def test_response_size_is_bounded(self):
        result = self.call(Opener(response=Response(b'x' * (probe.MAX_RESPONSE_BYTES + 1))))
        self.assertEqual(result['error'], 'ValueError')
        self.assertIsNone(result['http_status'])

    def test_invalid_word_times_cannot_be_used_for_fluency(self):
        result = probe.normalize({'text': 'answer', 'words': [{'word': 'answer', 'start': 20, 'end': 10}]}, 35)
        self.assertFalse(result['word_timestamps_usable'])
        with self.assertRaises(ValueError):
            probe.normalize({'text': ''}, 35)

    def test_redirect_cannot_forward_authorization_to_another_host(self):
        self.assertIsNone(probe.NoRedirect().redirect_request(None, None, 307, '', {}, 'https://other.invalid/'))


if __name__ == '__main__':
    unittest.main()
