"""Conservative scoring text only; never replace the student's stored transcript.

No expected answer, phonetic letter collapse, stemming, stop-word deletion or
number rewriting belongs here: these can erase negation or change a claim.
"""
import re
import unicodedata

_MARKS = re.compile(r'[\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06ed]')
_ORTHOGRAPHY = str.maketrans({'أ': 'ا', 'إ': 'ا', 'آ': 'ا', 'ٱ': 'ا', 'ـ': None})
# A fixed, context-bound spelling alias. Never derive substitutions from a
# reference answer or guess university/person names and technical quantities.
_AI_TYPO = re.compile(r'(?<!\w)((?:[وبفك])?(?:ال)?ذكاء)\s+((?:ال)?)(?:استناع[يى]|اصتناع[يى]|اصطناعى)(?!\w)')


def scoring_text(text: str) -> str:
    value = unicodedata.normalize('NFC', text or '')
    value = _MARKS.sub('', value).translate(_ORTHOGRAPHY)
    value = _AI_TYPO.sub(lambda match: match[1] + ' ' + match[2] + 'اصطناعي', value)
    return ' '.join(value.split())
