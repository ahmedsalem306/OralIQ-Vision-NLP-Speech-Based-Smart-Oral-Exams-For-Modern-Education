"""Reproducible launch budget; assumptions, not a provider bill or guaranteed profit.

Run: python ops/costs/launch_costs.py --frontend-usd 0
No API calls, credentials, dependencies or live billing changes.
"""
import argparse
from decimal import Decimal, ROUND_CEILING
import json
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "backend"))
from app.core.plans import PLANS  # noqa: E402


def number(value):
    return Decimal(str(value))


def rounded(value):
    return float(value.quantize(Decimal("0.01")))


def calculate(*, server_usd=20, frontend_usd=0, fx=60, operations_egp=300,
              trial_egp=200, face_license_egp=0, retry_tax_factor="1.25"):
    """Maximum offered audio; 25% expected retry/tax buffer, separately stress at 3x.

    300 EGP ops reserve covers estimated domain amortization, off-site storage,
    mail and alerts. 200 EGP trial reserve is a planning allowance, not an enforced
    global free-signup spend cap. Support/refund reserve = 10% of revenue.
    Kashier published domestic card fee: (2.75% + 3 EGP) * 1.14 fee VAT.
    Tax on sales/profits, salaries and marketing excluded. YuNet/SFace model
    licenses add no royalty fee; their notices are retained with the deployment.
    """
    fixed = (number(server_usd) + number(frontend_usd)) * number(fx) + number(operations_egp) + number(trial_egp) + number(face_license_egp)
    minute = number("0.111") / 60 * number(fx)
    output = {
        "assumptions": {"server_usd_month": server_usd, "frontend_usd_month": frontend_usd,
                        "egp_per_usd_planning_rate": fx, "groq_large_usd_audio_hour": 0.111,
                        "retry_tax_factor": str(retry_tax_factor), "operations_reserve_egp": operations_egp,
                        "trial_reserve_egp": trial_egp, "face_license_monthly_egp": face_license_egp,
                        "face_models_license": "YuNet MIT / SFace Apache-2.0; no model license fee"},
        "fixed_monthly_egp": rounded(fixed), "plans": {},
    }
    for tier in ("pro", "campus"):
        plan = PLANS[tier]
        price = number(plan["price_egp"])
        minutes = plan["max_student_attempts"] * plan["max_exam_duration_minutes"]
        audio = number(minutes) * minute * number(retry_tax_factor)
        payment = (price * number("0.0275") + 3) * number("1.14")
        support = price * number("0.10")
        contribution = price - audio - payment - support
        stress = price - number(minutes) * minute * 3 - payment - support
        target = contribution - price * number("0.30")
        output["plans"][tier] = {
            "price_egp": int(price), "student_attempts": plan["max_student_attempts"],
            "max_audio_minutes": minutes, "buffered_audio_cost_egp": rounded(audio),
            "payment_fee_egp": rounded(payment), "support_refund_reserve_egp": rounded(support),
            "contribution_before_fixed_egp": rounded(contribution),
            "break_even_monthly_subscribers": int((fixed / contribution).to_integral_value(rounding=ROUND_CEILING)),
            "subscribers_for_30pct_operating_margin": int((fixed / target).to_integral_value(rounding=ROUND_CEILING)) if target > 0 else None,
            "three_attempt_retry_stress_contribution_egp": rounded(stress),
            "five_monthly_subscribers_operating_result_egp": rounded(contribution * 5 - fixed),
        }
    # Term grants 4 complete 30-day cycles. A 365-day year can open a 13th
    # allowance at day 360; use that conservative bound rather than pretending 12.
    output["prepaid_period_bounds"] = {}
    for tier in ("pro", "campus"):
        p = output["plans"][tier]
        output["prepaid_period_bounds"][tier] = {}
        for period, multiplier, allowances in (("term", 3, 4), ("yearly", 10, 13)):
            gross = number(p["price_egp"]) * multiplier
            fee = (gross * number("0.0275") + 3) * number("1.14")
            audio = number(p["max_audio_minutes"]) * minute * number(retry_tax_factor) * allowances
            contribution = gross - fee - gross * number("0.10") - audio
            output["prepaid_period_bounds"][tier][period] = {
                "price_egp": int(gross), "maximum_cycle_allowances": allowances,
                "contribution_before_fixed_egp": rounded(contribution),
            }
    return output


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--frontend-usd", type=int, default=0)
    parser.add_argument("--face-license-egp", type=int, default=0)
    args = parser.parse_args()
    print(json.dumps(calculate(frontend_usd=args.frontend_usd, face_license_egp=args.face_license_egp), indent=2))
