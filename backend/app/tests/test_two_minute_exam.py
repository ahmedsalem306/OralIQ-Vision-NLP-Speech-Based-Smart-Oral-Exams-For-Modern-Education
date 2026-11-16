from concurrent.futures import ThreadPoolExecutor
import wave

from app.core.media_limits import decode_audio_bounded, grading_audio_limit
from app.models.grading_job import GradingJob
from app.tests.test_exam_sessions import env, check, submit  # noqa: F401


def test_total_exam_limit_is_enforced_at_creation(env):
    client, h = env['client'], env['lect']
    first = client.post('/api/v1/questions/',headers=h,
                         json={'text':'Q1','model_answer':'A','duration_minutes':2}).json()
    second = client.post('/api/v1/questions/',headers=h,
                          json={'text':'Q2','model_answer':'A','duration_minutes':1,'group_token':first['group_token']})
    assert second.status_code == 402
    assert second.json()['detail']['code'] == 'EXAM_DURATION_EXCEEDED'


def test_two_one_minute_questions_have_one_two_minute_sitting_and_per_job_bounds(env):
    token, questions = env['exam'](durations=(1,1))
    _, h = env['user']('two-minute@t.com')
    access = check(env,h,token)
    assert access.status_code == 200
    assert 118 <= access.json()['session']['remaining_seconds'] <= 120
    for qid in questions:
        assert submit(env,h,qid,f'time-{qid}').status_code == 202
    with env['Session']() as db:
        assert [j.audio_limit_seconds for j in db.query(GradingJob).order_by(GradingJob.id)] == [60,60]


def test_grading_audio_bound_is_thread_local_and_resets(tmp_path):
    path = tmp_path/'ninety-seconds.wav'
    with wave.open(str(path),'wb') as audio:
        audio.setnchannels(1); audio.setsampwidth(2); audio.setframerate(16000)
        audio.writeframes(b'\0\0' * 16000 * 90)
    def decode(seconds):
        with grading_audio_limit(seconds):
            return len(decode_audio_bounded(str(path),120)) / 16000
    with ThreadPoolExecutor(max_workers=2) as pool:
        assert list(pool.map(decode,[60,120])) == [60,90]
    assert len(decode_audio_bounded(str(path),120)) == 90*16000
