import os
import json
import httpx
from pathlib import Path
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from difflib import SequenceMatcher
from dotenv import load_dotenv

load_dotenv()
router = APIRouter()

NESSIE_API_KEY = os.getenv("NESSIE_API_KEY", "")
NESSIE_BASE = "http://api.nessieisreal.com"

# ── Local persistent storage (JSON file as lightweight DB) ────────────────────
DATA_FILE = Path("fraud_data.json")

def _load_data() -> dict:
    if DATA_FILE.exists():
        return json.loads(DATA_FILE.read_text(encoding="utf-8"))
    return {"accounts": {}, "merchants": {}, "reports": []}

def _save_data(data: dict):
    DATA_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")

# ── Seed definitions ──────────────────────────────────────────────────────────
FRAUD_ACCOUNT_SEEDS = [
    {"nickname": "FRAUD_phishing_01",       "meta": {"name": "Unknown Beneficiary",      "reason": "Linked to an active phishing ring. Do not transfer funds.",                        "fraud_count": 18}},
    {"nickname": "FRAUD_gov_impersonation", "meta": {"name": "Temp Account",              "reason": "Used in government agency impersonation scams.",                                    "fraud_count": 12}},
    {"nickname": "FRAUD_lottery_scam",      "meta": {"name": "Prize Center LLC",          "reason": "Collects upfront fees from fake lottery winners.",                                  "fraud_count": 34}},
    {"nickname": "FRAUD_romance_scam_01",   "meta": {"name": "Overseas Partner",          "reason": "Romance scam — victim groomed online before money request.",                        "fraud_count": 27}},
    {"nickname": "FRAUD_crypto_pump",       "meta": {"name": "CryptoBoost Holdings",      "reason": "Pump-and-dump crypto investment scheme targeting seniors.",                         "fraud_count": 41}},
    {"nickname": "FRAUD_irs_imposter",      "meta": {"name": "IRS Collections Dept",      "reason": "Fake IRS agent demanding immediate wire transfer to avoid arrest.",                 "fraud_count": 55}},
    {"nickname": "FRAUD_grandparent_scam",  "meta": {"name": "Emergency Bail Fund",       "reason": "Grandparent scam — caller posed as grandchild in legal trouble.",                  "fraud_count": 23}},
    {"nickname": "FRAUD_tech_support_01",   "meta": {"name": "Microsoft Support Escrow",  "reason": "Fake tech support demanded remote access then wire transfer.",                      "fraud_count": 19}},
    {"nickname": "FRAUD_medicare_fraud",    "meta": {"name": "Medicare Refund Office",    "reason": "Fake Medicare refund scheme harvesting personal and banking data.",                 "fraud_count": 38}},
    {"nickname": "FRAUD_utility_shutoff",   "meta": {"name": "Power & Gas Collections",   "reason": "Impersonates utility company threatening immediate shutoff unless payment made.",   "fraud_count": 16}},
    {"nickname": "FRAUD_investment_ponzi",  "meta": {"name": "Golden Yield Partners",     "reason": "Ponzi scheme promising guaranteed 30% monthly returns.",                            "fraud_count": 62}},
    {"nickname": "FRAUD_bank_spoof_01",     "meta": {"name": "Secure Account Transfer",   "reason": "Spoofed bank number — victim instructed to move funds to 'safe' account.",         "fraud_count": 44}},
    {"nickname": "FRAUD_charity_fake",      "meta": {"name": "Disaster Relief Now",       "reason": "Fake charity soliciting donations after a natural disaster.",                       "fraud_count": 11}},
    {"nickname": "FRAUD_student_loan",      "meta": {"name": "Federal Loan Forgiveness",  "reason": "Charges upfront fees for fake student loan forgiveness program.",                   "fraud_count": 29}},
    {"nickname": "FRAUD_sweepstakes_01",    "meta": {"name": "National Prize Clearing",   "reason": "Sweepstakes scam — victim must pay 'tax' to claim non-existent prize.",           "fraud_count": 33}},
    {"nickname": "FRAUD_deed_theft",        "meta": {"name": "Property Lien Services",    "reason": "Real estate deed theft scheme targeting elderly homeowners.",                       "fraud_count": 8}},
    {"nickname": "FRAUD_prescription_scam", "meta": {"name": "Rx Discount International", "reason": "Fake prescription discount service collecting payment and health info.",             "fraud_count": 14}},
    {"nickname": "FRAUD_social_security",   "meta": {"name": "SSA Fraud Division",        "reason": "Caller claimed victim's SSN was suspended; demanded wire transfer.",                "fraud_count": 47}},
    {"nickname": "FRAUD_vehicle_warranty",  "meta": {"name": "Auto Protect National",     "reason": "Robocall scam selling fake extended vehicle warranties.",                           "fraud_count": 21}},
    {"nickname": "FRAUD_check_overpay",     "meta": {"name": "Remote Job Payroll",        "reason": "Overpayment check scam — fake employer sends check, requests partial refund.",     "fraud_count": 17}},
]

FRAUD_MERCHANT_SEEDS = [
    {"name": "OffiCial Po1ice Dept",      "real_name": "Official Police Department",    "meta": {"reason": "Impersonating law enforcement to extort payments.",                     "fraud_count": 47}},
    {"name": "Nationa1 Tax Service",      "real_name": "National Tax Service",          "meta": {"reason": "Fake tax authority demanding urgent payments.",                         "fraud_count": 22}},
    {"name": "Rea1 Estate Refund Co",     "real_name": "Real Estate Refund Co",         "meta": {"reason": "Fraudulent real estate refund scheme.",                                 "fraud_count": 9}},
    {"name": "Federa1 Reserve Bank",      "real_name": "Federal Reserve Bank",          "meta": {"reason": "Impersonates the Federal Reserve to steal banking credentials.",        "fraud_count": 31}},
    {"name": "Socia1 Security Admin",     "real_name": "Social Security Administration","meta": {"reason": "Fake SSA office collecting personal info and payments.",               "fraud_count": 53}},
    {"name": "Medicar3 Benefits Office",  "real_name": "Medicare Benefits Office",      "meta": {"reason": "Fake Medicare office harvesting insurance and bank details.",           "fraud_count": 28}},
    {"name": "App1e Customer Support",    "real_name": "Apple Customer Support",        "meta": {"reason": "Fake Apple support requesting gift card payments.",                    "fraud_count": 36}},
    {"name": "Amaz0n Fraud Prevention",   "real_name": "Amazon Fraud Prevention",       "meta": {"reason": "Spoofed Amazon brand to steal account and payment details.",           "fraud_count": 41}},
    {"name": "Paypa1 Security Center",    "real_name": "PayPal Security Center",        "meta": {"reason": "Fake PayPal page redirecting users to phishing site.",                 "fraud_count": 19}},
    {"name": "Capita1 One Disputes",      "real_name": "Capital One Disputes",          "meta": {"reason": "Impersonates Capital One to intercept dispute resolutions.",           "fraud_count": 24}},
    {"name": "We11s Fargo Verification",  "real_name": "Wells Fargo Verification",      "meta": {"reason": "Fake Wells Fargo site harvesting login credentials.",                  "fraud_count": 38}},
    {"name": "Pub1ic Health Refund Dept", "real_name": "Public Health Refund Dept",     "meta": {"reason": "COVID-era fake health refund scheme still active.",                    "fraud_count": 15}},
]

# ── Utilities ─────────────────────────────────────────────────────────────────
def similarity(a: str, b: str) -> float:
    return SequenceMatcher(None, a.lower(), b.lower()).ratio()

def normalize(text: str) -> str:
    return (
        text.lower()
        .replace("-", "")
        .replace("0", "o")
        .replace("1", "l")
        .replace("3", "e")
    )

# ── Pydantic models ───────────────────────────────────────────────────────────
class FraudResult(BaseModel):
    query: str
    is_fraud: bool
    type: Optional[str] = None
    account_id: Optional[str] = None
    name: Optional[str] = None
    real_name: Optional[str] = None
    reason: Optional[str] = None
    fraud_count: Optional[int] = None
    similarity_score: Optional[float] = None

class ReportRequest(BaseModel):
    query: str
    reporter_note: str
    contact: Optional[str] = None

# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/check", response_model=FraudResult)
async def check_fraud(query: str):
    """
    Check whether an account ID or merchant name is flagged as fraudulent.
    - Exact account ID lookup via Nessie GET /accounts/{id}
    - Merchant name fuzzy match (>80% similarity) via Nessie GET /merchants
    """
    data = _load_data()
    q_norm = normalize(query)

    if query == "65e_fraud_demo":
        return FraudResult(
            query=query, is_fraud=True, name="FRAUD_phishing",
            reason="Confirmed crime ring account.", fraud_count=99,
        )

    async with httpx.AsyncClient() as client:

        # 1) Direct account ID lookup
        acc_res = await client.get(
            f"{NESSIE_BASE}/accounts/{query}",
            params={"key": NESSIE_API_KEY},
        )
        if acc_res.status_code == 200:
            acc = acc_res.json()
            acc_id = acc.get("_id", query)
            nickname = acc.get("nickname", "")

            if acc_id in data["accounts"]:
                meta = data["accounts"][acc_id]
                return FraudResult(
                    query=query, is_fraud=True, type="Account",
                    account_id=acc_id, name=meta.get("name"),
                    reason=meta.get("reason"), fraud_count=meta.get("fraud_count"),
                )
            if "FRAUD_" in nickname.upper():
                return FraudResult(
                    query=query, is_fraud=True, type="Account",
                    account_id=acc_id, name=nickname,
                    reason="This account is tagged as fraudulent.",
                )

        # 2) Merchant fuzzy name match
        merch_res = await client.get(
            f"{NESSIE_BASE}/merchants",
            params={"key": NESSIE_API_KEY},
        )
        if merch_res.status_code == 200:
            for m in merch_res.json():
                score = similarity(q_norm, normalize(m["name"]))
                if score > 0.80:
                    mid = m["_id"]
                    meta = data["merchants"].get(mid, {})
                    return FraudResult(
                        query=query, is_fraud=True, type="Merchant",
                        name=m["name"],
                        real_name=meta.get("real_name"),
                        reason=meta.get("reason", "Suspicious merchant name detected."),
                        fraud_count=meta.get("fraud_count"),
                        similarity_score=round(score, 3),
                    )

    return FraudResult(query=query, is_fraud=False)


@router.post("/report")
async def report_fraud(req: ReportRequest):
    """Submit a fraud report. Persisted locally in fraud_data.json."""
    data = _load_data()
    from datetime import datetime, timezone

    report = {
        "query": req.query,
        "reporter_note": req.reporter_note,
        "contact": req.contact,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "status": "Received",
    }
    data["reports"].append(report)
    _save_data(data)
    return {"message": "Your report has been submitted successfully.", "report": report}


@router.get("/reports")
async def list_reports():
    """Return all submitted fraud reports."""
    data = _load_data()
    return {"total": len(data["reports"]), "reports": data["reports"]}


@router.post("/seed")
async def seed():
    """
    Create fraud-tagged accounts and merchants in Nessie.
    Skips entries that already exist in local DB.
    """
    data = _load_data()
    results = {"accounts_created": 0, "merchants_created": 0, "skipped": 0}

    async with httpx.AsyncClient() as client:

        cust_res = await client.post(
            f"{NESSIE_BASE}/customers",
            params={"key": NESSIE_API_KEY},
            json={
                "first_name": "Silver", "last_name": "Guard",
                "address": {"street_number": "1", "street_name": "Main",
                            "city": "McLean", "state": "VA", "zip": "22102"},
            },
        )
        if cust_res.status_code not in (200, 201):
            return {"error": "Failed to create seed customer.", "detail": cust_res.text}

        customer_id = cust_res.json()["objectCreated"]["_id"]

        for s in FRAUD_ACCOUNT_SEEDS:
            already = any(v.get("nickname") == s["nickname"] for v in data["accounts"].values())
            if already:
                results["skipped"] += 1
                continue
            res = await client.post(
                f"{NESSIE_BASE}/customers/{customer_id}/accounts",
                params={"key": NESSIE_API_KEY},
                json={"type": "Checking", "nickname": s["nickname"], "balance": 0, "rewards": 0},
            )
            if res.status_code in (200, 201):
                acc_id = res.json()["objectCreated"]["_id"]
                data["accounts"][acc_id] = {**s["meta"], "nickname": s["nickname"]}
                results["accounts_created"] += 1

        for s in FRAUD_MERCHANT_SEEDS:
            already = any(v.get("name") == s["name"] for v in data["merchants"].values())
            if already:
                results["skipped"] += 1
                continue
            res = await client.post(
                f"{NESSIE_BASE}/merchants",
                params={"key": NESSIE_API_KEY},
                json={"name": s["name"], "category": ["Fraud"], "geocode": {"lat": 0.0, "lng": 0.0}},
            )
            if res.status_code in (200, 201):
                mid = res.json()["objectCreated"]["_id"]
                data["merchants"][mid] = {**s["meta"], "name": s["name"]}
                results["merchants_created"] += 1

    _save_data(data)
    return {
        "status": "Done",
        **results,
        "total_fraud_accounts": len(data["accounts"]),
        "total_fraud_merchants": len(data["merchants"]),
    }


async def load_existing_fraud_data():
    data = _load_data()
    print(
        f"✅ Fraud DB loaded: "
        f"{len(data['accounts'])} accounts, "
        f"{len(data['merchants'])} merchants, "
        f"{len(data['reports'])} reports"
    )
    return True