"""Bounded real grading pressure: 10 then 20 lecturer-preview fixtures.

No simulated AI, real-student enrollment, biometric templates or cameras. One
consenting owner's clip is repeated/trimmed to a minute. At most 60 answer uploads
and 60 minutes of audio in total; the worker keeps its real shared Groq budgets.
"""
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta
from io import BytesIO
import json
import math
import os
from pathlib import Path
import secrets
import time
import uuid
import wave

import httpx
import numpy as np
from sqlalchemy.orm import undefer
from scripts.load_test_prepare import require_load_database
assert os.environ.get('LOAD_TEST_ENABLED') == '1'
require_load_database(os.environ['DATABASE_URL'])
import app.models
from app.core.database import SessionLocal
from app.core.media_limits import check_audio_only, decode_audio_bounded
from app.core.security import get_password_hash
from app.models.user import User
from app.models.question import Question
from app.models.exam_submission import ExamSubmission
from app.models.grading_job import GradingJob
from app.models.speech_usage import SpeechProviderUsage

ROOT=Path('/reports')
REFERENCE='التعليم الإلكتروني يسمح بالتعلم من أي مكان ومراجعة المحاضرات المسجلة، ويحتاج إنترنت وتنظيم الوقت، وقد يقل فيه التفاعل المباشر، والجمع بينه وبين الحضور يستفيد من مميزات الاثنين.'
report={'kind':'bounded_real_groq_grading_pressure','cohorts':[],
        'account_role':'lecturer_preview_of_own_exam','real_students':0,'distinct_real_speakers':1,
        'biometrics_included':False,'cameras_included':False,'browser_included':False,
        'audio_construction':'owner_clip_repeated_trimmed_to_60_seconds',
        'hard_limits':{'accounts':30,'answers':60,'audio_minutes':60,'uploads_in_flight':10},
        'production_changed':False,'passed':False}
client=httpx.Client(base_url='http://oraliq-owner-preview-api:8000/api/v1',timeout=30,
                    limits=httpx.Limits(max_connections=15,max_keepalive_connections=15))
original=Path('/inputs/input.audio').read_bytes()
check_audio_only(original)
import tempfile
with tempfile.TemporaryFile() as stream:
    stream.write(original);stream.flush()
    signal=decode_audio_bounded(f'/proc/self/fd/{stream.fileno()}',60)
buffer=BytesIO()
with wave.open(buffer,'wb') as output:
    output.setnchannels(1);output.setsampwidth(2);output.setframerate(16000)
    output.writeframes((np.clip(np.resize(signal,60*16000),-1,1)*32767).astype('<i2').tobytes())
audio=buffer.getvalue()
assert len(audio)<2*1024*1024
report['source_seconds']=len(signal)/16000
actor_ids=[]
question_ids=[]


def save():
    (ROOT/'pressure.json').write_text(json.dumps(report,indent=2))


def progress(phase,**values):
    (ROOT/'progress.json').write_text(json.dumps({'phase':phase,**values}))
    print(json.dumps({'phase':phase,**values}),flush=True)


def percentile(values,pct):
    values=sorted(values)
    return values[min(len(values)-1,math.ceil(len(values)*pct)-1)] if values else None


def request(method,path,token=None,expected=200,**kwargs):
    response=client.request(method,path,headers={'Authorization':'Bearer '+token} if token else {},**kwargs)
    if response.status_code!=expected:
        raise RuntimeError('unexpected_http_'+str(response.status_code)+'_expected_'+str(expected))
    return response.json()


try:
    with SessionLocal() as db:
        assert db.query(GradingJob).filter(GradingJob.status.in_(['queued','processing'])).count()==0
        since=datetime.utcnow()-timedelta(hours=1)
        recent=db.query(SpeechProviderUsage).filter(SpeechProviderUsage.reserved_at>since).all()
        assert sum(event.audio_seconds for event in recent)+3600<=6480, 'insufficient_local_hour_headroom'
        day=db.query(SpeechProviderUsage).filter(SpeechProviderUsage.reserved_at>datetime.utcnow()-timedelta(days=1)).all()
        assert sum(event.audio_seconds for event in day)+3600<=25920, 'insufficient_local_day_headroom'
    for size in [10,20]:
        phase_started=time.perf_counter()
        prefix='pressure-'+uuid.uuid4().hex[:12]
        password=secrets.token_urlsafe(24)
        hashed=get_password_hash(password)
        actors=[]
        with SessionLocal() as db:
            for index in range(size):
                user=User(email=f'{prefix}-{index}@loadtest.example.com',full_name=f'Pressure fixture {index}',
                    role='lecturer',hashed_password=hashed,email_verified=True,requires_email_verification=False,
                    is_active=True,plan_tier='enterprise',custom_max_exams=10,custom_max_students=5)
                db.add(user);db.flush();actor_ids.append(user.id)
                group=uuid.uuid4().hex
                questions=[]
                for number in range(2):
                    question=Question(creator_id=user.id,text=f'اختبار ضغط {number+1}: اشرح التعليم الإلكتروني',
                        model_answer=REFERENCE,group_token=group,duration_minutes=1,max_attempts=1,
                        results_policy='immediate',order_index=number)
                    db.add(question);db.flush();questions.append(question.id);question_ids.append(question.id)
                actors.append({'email':user.email,'group':group,'questions':questions,'index':index})
            db.commit()
        progress('login_and_admission',accounts=size)
        login_times=[]
        for actor in actors:
            began=time.perf_counter()
            actor['token']=request('POST','/login/access-token',data={'username':actor['email'],'password':password})['access_token']
            login_times.append(time.perf_counter()-began)
            request('GET','/exams/access-check/'+actor['group'],actor['token'])
        cohort={'accounts':size,'expected_answers':size*2,'login_successes':len(actors),
                'login_p95_seconds':percentile(login_times,.95),'accepted_answers':0}
        report['cohorts'].append(cohort);save()
        progress('uploading',accounts=size)
        upload_started=time.perf_counter()
        def upload(actor):
            accepted=[]
            for question in actor['questions']:
                began=time.perf_counter()
                data={'question_id':str(question),'student_name':f'Pressure fixture {actor["index"]}',
                      'student_number':str(actor['index']),'submission_key':prefix+'-'+str(question)}
                result=request('POST','/exams/submit',actor['token'],expected=202,data=data,
                               files={'audio':('answer.wav',audio,'audio/wav')})
                accepted.append({'id':result['id'],'seconds':time.perf_counter()-began})
            return accepted
        with ThreadPoolExecutor(max_workers=min(size,10)) as pool:
            uploads=[item for values in pool.map(upload,actors) for item in values]
        ids=[item['id'] for item in uploads]
        cohort.update(accepted_answers=len(ids),unique_submissions=len(set(ids)),
                      upload_wave_seconds=time.perf_counter()-upload_started,
                      upload_p95_seconds=percentile([item['seconds'] for item in uploads],.95))
        save()
        snapshots=[]
        deadline=time.monotonic()+600
        while True:
            with SessionLocal() as db:
                jobs=db.query(GradingJob).filter(GradingJob.submission_id.in_(ids)).all()
                counts={status:sum(job.status==status for job in jobs) for status in ['queued','processing','completed','failed']}
                waiters=sum(bool(job.last_error and job.last_error.startswith('speech_provider_wait:')) for job in jobs)
            snapshots.append({'elapsed_seconds':time.perf_counter()-upload_started,**counts,'provider_waiters':waiters})
            cohort['snapshots']=snapshots;save()
            progress('observing',accounts=size,**counts,provider_waiters=waiters)
            if counts['completed']+counts['failed']==len(ids):
                break
            if time.monotonic()>deadline:
                raise TimeoutError('bounded_pressure_observation_expired')
            time.sleep(5)
        with SessionLocal() as db:
            jobs=db.query(GradingJob).options(undefer(GradingJob.audio)).filter(GradingJob.submission_id.in_(ids)).all()
            answers=db.query(ExamSubmission).filter(ExamSubmission.id.in_(ids)).all()
            cohort.update(completed_answers=sum(job.status=='completed' for job in jobs),
                          failed_answers=sum(job.status=='failed' for job in jobs),
                          all_completed_audio_purged=all(job.status=='completed' and job.audio is None for job in jobs),
                          max_attempts=max(job.attempts for job in jobs),
                          processing_p95_seconds=percentile([(job.process_ms or 0)/1000 for job in jobs],.95),
                          queue_wait_p95_seconds=percentile([(job.queue_wait_ms or 0)/1000 for job in jobs],.95),
                          all_grades_finite=all(answer.overall_score is not None and math.isfinite(answer.overall_score) for answer in answers))
        for actor in actors:
            grades=request('GET','/exams/my-grades',actor['token'])
            assert len(grades)==2 and all(g['overall_score'] is not None for g in grades)
        cohort['each_account_received_own_two_grades']=True
        cohort['all_results_seconds_from_first_upload']=time.perf_counter()-upload_started
        cohort['total_phase_seconds']=time.perf_counter()-phase_started
        cohort['passed']=cohort['completed_answers']==size*2 and cohort['failed_answers']==0 and cohort['all_completed_audio_purged']
        save()
        if not cohort['passed']:
            raise RuntimeError('cohort_did_not_complete')
    report['passed']=len(report['cohorts'])==2 and all(c['passed'] for c in report['cohorts'])
except Exception as error:
    report['error_type']=type(error).__name__
finally:
    with SessionLocal() as db:
        if question_ids:
            submissions=[sid for (sid,) in db.query(ExamSubmission.id).filter(ExamSubmission.question_id.in_(question_ids)).all()]
            if submissions:
                incomplete=db.query(GradingJob).filter(GradingJob.submission_id.in_(submissions),GradingJob.status!='completed')
                failed_ids=[job.submission_id for job in incomplete.all()]
                incomplete.update({'status':'failed','audio':None,'audio_purged_at':datetime.utcnow(),
                                   'finished_at':datetime.utcnow(),'last_error':'bounded pressure probe ended'},synchronize_session=False)
                if failed_ids:
                    db.query(ExamSubmission).filter(ExamSubmission.id.in_(failed_ids)).update({'grading_status':'failed'},synchronize_session=False)
            db.query(Question).filter(Question.id.in_(question_ids)).update({'closes_at':datetime.utcnow()},synchronize_session=False)
        if actor_ids:
            db.query(User).filter(User.id.in_(actor_ids)).update({'is_active':False},synchronize_session=False)
        db.commit()
    save();client.close()
    progress('complete' if report['passed'] else 'failed')
raise SystemExit(0 if report['passed'] else 1)
