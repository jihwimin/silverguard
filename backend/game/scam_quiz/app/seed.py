"""Seed database with phishing quiz questions (SMS, email, call transcript).
Run idempotently: python -m app.seed
"""

import hashlib
from sqlmodel import Session, select

from app.models.db import get_engine, init_db
from app.models.question import Question, QuestionType


def content_hash(type_value: str, content: str) -> str:
    """Compute unique hash for (type, content)."""
    return hashlib.sha256(f"{type_value}|{content}".encode()).hexdigest()


QUESTIONS = [
    {
        "content": "Hi! Your package couldn't be delivered. Click here to reschedule: http://track-delivery-xyz.com/ref/8821",
        "type": QuestionType.SMS,
        "is_phishing": True,
        "explanation": "Legitimate carriers don't ask you to click links in SMS to reschedule. This is a common smishing (SMS phishing) tactic.",
    },
    {
        "content": "Your bank account has been locked. Call 1-800-555-0199 immediately to verify your identity and unlock.",
        "type": QuestionType.SMS,
        "is_phishing": True,
        "explanation": "Banks may send alerts, but they usually direct you to log in to the official app or call the number on the back of your card—not a number in the text.",
    },
    {
        "content": "Subject: Your Amazon order #1092-3847 has shipped. Track at: https://amazon-delivery-tracking.com",
        "type": QuestionType.EMAIL,
        "is_phishing": True,
        "explanation": "The link domain is not amazon.com. Real Amazon links use amazon.com or amzn.com. This is a phishing email.",
    },
    {
        "content": "Subject: Team meeting moved to 3pm Thursday. Location: Conference Room B. — Sent from company mail.",
        "type": QuestionType.EMAIL,
        "is_phishing": False,
        "explanation": "Simple scheduling change with no links or requests for credentials. Typical internal email.",
    },
    {
        "content": "You've won $1,000! Reply with your full name, address, and SSN to claim your prize. Reply STOP to opt out.",
        "type": QuestionType.SMS,
        "is_phishing": True,
        "explanation": "Real giveaways never ask for SSN or sensitive data via text. This is a scam to steal identity.",
    },
    {
        "content": "Hi, this is Sarah from Card Services. We're seeing unusual activity on your account. Can you confirm the last four digits of your card and your mother's maiden name?",
        "type": QuestionType.CALL_TRANSCRIPT,
        "is_phishing": True,
        "explanation": "Legitimate card services don't call asking for full verification details. They ask you to call the number on your card.",
    },
    {
        "content": "Subject: Invoice #4472 attached. Please pay by Friday. Questions? Reply to this email.",
        "type": QuestionType.EMAIL,
        "is_phishing": False,
        "explanation": "Normal B2B invoice email. No urgent link or credential request. Always verify sender and avoid opening suspicious attachments.",
    },
    {
        "content": "URGENT: Your iCloud was accessed from Russia. Click to secure: http://apple-id-secure.com. If you don't act in 24h we'll lock your account.",
        "type": QuestionType.EMAIL,
        "is_phishing": True,
        "explanation": "Apple uses apple.com domains. Fake urgency and a non-Apple link are signs of phishing.",
    },
    {
        "content": "This is the IRS. You have an outstanding tax debt. To avoid arrest, pay now via gift cards. Call this number to complete payment.",
        "type": QuestionType.CALL_TRANSCRIPT,
        "is_phishing": True,
        "explanation": "The IRS does not call demanding immediate payment or gift cards. This is a classic phone scam.",
    },
    {
        "content": "Hi, this is Mike from the pharmacy. Your prescription is ready for pickup. We're open until 8pm.",
        "type": QuestionType.CALL_TRANSCRIPT,
        "is_phishing": False,
        "explanation": "Routine prescription pickup reminder with no request for personal or payment info. Legitimate pharmacy callback.",
    },
    # --- 20 additional questions (10 phishing / 10 non-phishing) ---
    {
        "content": "FedEx: Package on hold. Pay $2.99 delivery fee at http://fedex-fee-pay.com to release.",
        "type": QuestionType.SMS,
        "is_phishing": True,
        "explanation": "Real carriers do not send payment links via SMS; the fake domain and fee demand are smishing cues.",
    },
    {
        "content": "Subject: Action required – verify your Netflix account. Your payment failed. Update at: https://netflix-billing.com",
        "type": QuestionType.EMAIL,
        "is_phishing": True,
        "explanation": "Netflix uses netflix.com only; the linked domain is fake and the payment-failure urgency is a common phishing hook.",
    },
    {
        "content": "Hi, this is Tech Support. We detected a virus on your computer. We need remote access to fix it—can you go to download[.]example[.]com and run the file?",
        "type": QuestionType.CALL_TRANSCRIPT,
        "is_phishing": True,
        "explanation": "Legitimate tech support does not cold-call or ask you to download and run files from unknown sites; this is a support scam.",
    },
    {
        "content": "Your PayPal has been limited. Log in within 48 hours at https://paypal-secure.com or we will close your account.",
        "type": QuestionType.SMS,
        "is_phishing": True,
        "explanation": "PayPal does not use SMS links for account verification; the fake domain and account-closure threat are phishing signs.",
    },
    {
        "content": "Subject: You have an undelivered FedEx package. Open the attachment for delivery details and to confirm your address.",
        "type": QuestionType.EMAIL,
        "is_phishing": True,
        "explanation": "Unexpected attachments about deliveries are a common vector for malware; real FedEx uses tracking on their official site.",
    },
    {
        "content": "This is the Social Security Administration. Your number has been suspended due to criminal activity. Press 1 to speak to an agent and resolve this now.",
        "type": QuestionType.CALL_TRANSCRIPT,
        "is_phishing": True,
        "explanation": "The SSA does not call to suspend your SSN; the claim of suspension and pressure to act immediately are hallmarks of a government-impersonation scam.",
    },
    {
        "content": "Walmart: You won a $500 gift card! Claim at http://walmart-gift.com. Enter your card number to verify.",
        "type": QuestionType.SMS,
        "is_phishing": True,
        "explanation": "Unsolicited 'you won' texts and requests to enter card details on a linked site are classic smishing; Walmart does not verify via SMS links.",
    },
    {
        "content": "Subject: Your Microsoft 365 license expires in 24 hours. Renew now: https://microsoft-renew.com to avoid losing access.",
        "type": QuestionType.EMAIL,
        "is_phishing": True,
        "explanation": "Microsoft uses microsoft.com domains; the fake renewal link and short deadline are typical phishing tactics.",
    },
    {
        "content": "We're calling from the warranty department about your car's extended warranty. Your coverage is about to lapse. To renew, we need your card number and ZIP code.",
        "type": QuestionType.CALL_TRANSCRIPT,
        "is_phishing": True,
        "explanation": "Cold calls about 'expiring' car warranties that ask for payment details are a well-known scam; real warranty companies do not operate this way.",
    },
    {
        "content": "Subject: Your DocuSign document is ready. Sign here: https://docusign-sign.com/doc/8821",
        "type": QuestionType.EMAIL,
        "is_phishing": True,
        "explanation": "DocuSign uses docusign.com; a link to a different domain to sign documents is a credential-phishing attempt.",
    },
    {
        "content": "Your appointment at City Dental is confirmed for Tuesday at 2pm. Reply YES to confirm or call 555-0123 to reschedule.",
        "type": QuestionType.SMS,
        "is_phishing": False,
        "explanation": "Standard appointment confirmation with a local 555 number and no links or requests for sensitive data; consistent with a real clinic reminder.",
    },
    {
        "content": "Subject: Re: Project proposal – please review the draft by EOD. Attached is the latest version. Thanks.",
        "type": QuestionType.EMAIL,
        "is_phishing": False,
        "explanation": "Normal work email with a contextual attachment and no urgency or login links; typical professional correspondence.",
    },
    {
        "content": "Hi, this is the front desk. Your table for two is ready at 7pm tonight. We'll see you then.",
        "type": QuestionType.CALL_TRANSCRIPT,
        "is_phishing": False,
        "explanation": "Simple reservation confirmation with no request for payment or personal details; matches a legitimate restaurant callback.",
    },
    {
        "content": "Your Lyft ride with Mike (Toyota Camry) has arrived. Meet your driver at the north entrance.",
        "type": QuestionType.SMS,
        "is_phishing": False,
        "explanation": "Concrete ride details and pickup instructions with no link or payment request; consistent with a real ride-share notification.",
    },
    {
        "content": "Subject: Your statement is available. Log in at chase.com (link in our app) to view. We never ask for your password by email.",
        "type": QuestionType.EMAIL,
        "is_phishing": False,
        "explanation": "Directs users to the real domain and explicitly states they do not ask for passwords by email; aligns with safe banking communication.",
    },
    {
        "content": "This is the pharmacy. Your refill for the medication we discussed is ready. You can pick it up anytime before 8pm.",
        "type": QuestionType.CALL_TRANSCRIPT,
        "is_phishing": False,
        "explanation": "Refill ready notice with no request for SSN, card numbers, or clicks; typical pharmacy callback.",
    },
    {
        "content": "USPS: Your package is at the local office. Pickup hours 9am–5pm. Bring ID. No link or payment required.",
        "type": QuestionType.SMS,
        "is_phishing": False,
        "explanation": "Informational notice with no link or payment request and clear instructions; consistent with a legitimate pickup notice.",
    },
    {
        "content": "Subject: Calendar invite – Q3 review, Sept 15 10am. Accept/decline in Outlook. Location: Conference Room A.",
        "type": QuestionType.EMAIL,
        "is_phishing": False,
        "explanation": "Standard meeting invite with platform-specific action (Outlook) and no external links or credential requests.",
    },
    {
        "content": "Hi, this is the library. The book you requested is ready for pickup. Hold expires in 7 days.",
        "type": QuestionType.CALL_TRANSCRIPT,
        "is_phishing": False,
        "explanation": "Routine hold notification with no payment or personal data requested; typical library callback.",
    },
    {
        "content": "Your 2FA code is 847291. Do not share it. We will never ask for this code by phone or email.",
        "type": QuestionType.SMS,
        "is_phishing": False,
        "explanation": "One-time code with an explicit security warning and no link or follow-up request; matches legitimate 2FA messages.",
    },
]


def _ensure_content_hash_column(engine):
    """Add content_hash column to questions table if it doesn't exist (SQLite)."""
    from sqlalchemy import inspect, text
    insp = inspect(engine)
    if "questions" not in insp.get_table_names():
        return
    cols = [c["name"] for c in insp.get_columns("questions")]
    if "content_hash" in cols:
        return
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE questions ADD COLUMN content_hash VARCHAR(256)"))
        conn.commit()


def run_seed():
    """Idempotent seed: insert each question only if its content_hash is not already present."""
    engine = get_engine()
    init_db(engine)
    _ensure_content_hash_column(engine)

    inserted = 0
    skipped = 0

    with Session(engine) as db:
        # Backfill content_hash for existing rows that have none
        for row in db.exec(select(Question).where(Question.content_hash.is_(None))).all():
            row.content_hash = content_hash(row.type.value, row.content)
        db.commit()

        existing_hashes = {
            r for r in db.exec(select(Question.content_hash).where(Question.content_hash.isnot(None))).all()
        }

        for q in QUESTIONS:
            type_val = q["type"].value if isinstance(q["type"], QuestionType) else q["type"]
            h = content_hash(type_val, q["content"])
            if h in existing_hashes:
                skipped += 1
                continue
            db.add(Question(**q, content_hash=h))
            existing_hashes.add(h)
            inserted += 1
        db.commit()

    print(f"Inserted: {inserted}, Skipped: {skipped}")


if __name__ == "__main__":
    run_seed()
