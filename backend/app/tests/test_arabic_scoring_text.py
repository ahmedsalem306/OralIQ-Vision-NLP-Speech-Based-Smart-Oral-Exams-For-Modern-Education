import sys
from types import SimpleNamespace

import pytest

from app.services.arabic_text import scoring_text
from app.services.nlp_ai import NLPAnalyzer


@pytest.mark.parametrize('source,expected', [
    ('الذكاء الاستناعي يساعد الطالب', 'الذكاء الاصطناعي يساعد الطالب'),
    ('طالب ذكاء استناعي', 'طالب ذكاء اصطناعي'),
    ('بالذكاء الاصتناعي', 'بالذكاء الاصطناعي'),
    ('الذَّكَاءُ الاصْطِنَاعِيّ', 'الذكاء الاصطناعي'),
    ('التعــليم الإلكتروني', 'التعليم الالكتروني'),
    ('\nتعليم\t  إلكتروني  ', 'تعليم الكتروني'),
    ('الامتحانات الشبهويه', 'الامتحانات الشفوية'),
    ('الامتحانات الشبهويّة', 'الامتحانات الشفوية'),
    ('والامتحانات الشبهويه في الجامعة', 'والامتحانات الشفوية في الجامعة'),
    ('امتحان شبهوي', 'امتحان شفوي'),
    ('ليست الامتحانات الشبهويه ٣٠ امتحانا', 'ليست الامتحانات الشفوية ٣٠ امتحانا'),
])
def test_bounded_spelling_and_orthography(source, expected):
    assert scoring_text(source) == expected
    assert scoring_text(expected) == expected


@pytest.mark.parametrize('text', [
    'ليس ذكاء استناعي ولا يستطيع العمل خارج الجامعة',
    'لا يزيد عن ٣٠ ملغ وليس 300 ملغ',
    'x = -2.5 وليس x = 25',
    'جامعة الدلتا للعلوم والتكنولوجيا',
    'صالح صابر وظافر ذكي',
])
def test_meaning_bearing_words_names_and_quantities_survive(text):
    result = scoring_text(text)
    assert result == text.replace('ذكاء استناعي', 'ذكاء اصطناعي')


def test_ambiguous_single_word_is_never_guessed_from_reference():
    assert scoring_text('استناعي خارج السياق') == 'استناعي خارج السياق'
    assert scoring_text('هو طالب في جامعة الدلتا') == 'هو طالب في جامعة الدلتا'
    assert scoring_text('الشبهويه خارج السياق') == 'الشبهويه خارج السياق'
    assert scoring_text('النظرية الشبهويه') == 'النظرية الشبهويه'


def test_encoder_receives_negation_and_numbers_in_every_pair(monkeypatch):
    encoded = []
    service = NLPAnalyzer()
    def encode(texts, **kwargs):
        encoded.extend(texts)
        return list(range(len(texts)))
    service._model = SimpleNamespace(encode=encode)
    monkeypatch.setitem(sys.modules, 'sentence_transformers', SimpleNamespace(
        util=SimpleNamespace(cos_sim=lambda *args: SimpleNamespace(item=lambda: .8))))
    service._semantic_score('لا يستخدم الذَّكاء الاستناعي خارج الجامعة ٣٠', 'يستخدم الذكاء الاصطناعي خارج الجامعة 300')
    assert len(encoded) == 4
    assert encoded[0].startswith('لا ') and encoded[2].startswith('لا ')
    assert 'خارج الجامعة' in encoded[2] and '٣٠' in encoded[2]
    assert '300' in encoded[3] and 'خارج الجامعة' in encoded[3]


def test_grading_keeps_original_evidence_and_uses_no_reference_for_cleanup(monkeypatch):
    service = NLPAnalyzer()
    evidence = 'هو طالب ذكاء استناعي في جامعة الدلتا'
    seen = []
    def semantic(student, reference):
        seen.append(student)
        return 10
    monkeypatch.setattr(service, '_semantic_score', semantic)
    result = service.evaluate_answer(evidence, 'التعليم الإلكتروني يسمح بمراجعة المحاضرات من المنزل')
    assert seen == [evidence]
    assert result['score'] < 45
