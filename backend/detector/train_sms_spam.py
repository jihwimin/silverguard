import os
import re
import json
import shutil
import zipfile
import argparse
from pathlib import Path
from datetime import datetime

import pandas as pd

import joblib
from dotenv import load_dotenv

from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.calibration import CalibratedClassifierCV
from sklearn.metrics import classification_report, roc_auc_score, confusion_matrix


# -------------------------
# Kaggle dataset slugs
# -------------------------
BASE_SMS_SPAM = "uciml/sms-spam-collection-dataset"
SMS_SMISHING = "galactus007/sms-smishing-collection-data-set"
SMS_PHISHING = "fadlifatih/sms-phishing-dataset"


# -------------------------
# Paths (ALL relative to detector folder)
# -------------------------
HERE = Path(__file__).resolve().parent
DATA_DIR = HERE / "data"

MODELS_DIR = HERE / "models"
CUSTOM_DIR = HERE / "custom"
ENV_FILE = HERE / ".env"


# -------------------------
# Utility functions
# -------------------------
def simple_normalize_text(s: str) -> str:
    if not isinstance(s, str):
        s = "" if s is None else str(s)
    s = s.strip()
    s = re.sub(r"\s+", " ", s)
    return s


def load_env():
    if ENV_FILE.exists():
        load_dotenv(ENV_FILE)
        print(f"[info] Loaded .env from {ENV_FILE}")
    else:
        print("[warn] No .env found (continuing if Kaggle env vars already set)")


def kaggle_download(slug: str) -> Path:
    DATA_DIR.mkdir(exist_ok=True)

    print(f"[info] Downloading: {slug}")
    cmd = f'kaggle datasets download -d "{slug}" -p "{DATA_DIR}"'
    rc = os.system(cmd)
    if rc != 0:
        raise RuntimeError(f"Kaggle download failed for {slug}")

    # ✅ pick the correct zip for THIS slug, not the newest zip in the folder
    dataset_name = slug.split("/", 1)[1]  # e.g. sms-smishing-collection-data-set
    zip_candidates = sorted(DATA_DIR.glob("*.zip"), key=lambda p: p.stat().st_mtime, reverse=True)

    matching = [z for z in zip_candidates if dataset_name in z.name]
    if not matching:
        # fallback (but print warning so you notice)
        print(f"[warn] Could not find zip matching '{dataset_name}', falling back to newest zip.")
        if not zip_candidates:
            raise RuntimeError("No zip found after Kaggle download")
        zip_path = zip_candidates[0]
    else:
        zip_path = matching[0]

    extract_dir = DATA_DIR / slug.replace("/", "__")
    if extract_dir.exists():
        shutil.rmtree(extract_dir)
    extract_dir.mkdir()

    with zipfile.ZipFile(zip_path, "r") as zf:
        zf.extractall(extract_dir)

    return extract_dir


def load_dataset_from_folder(folder: Path) -> pd.DataFrame:
    # ✅ Search for csv/tsv/txt
    files = []
    for ext in ("*.csv", "*.tsv", "*.txt"):
        files.extend(folder.rglob(ext))

    if not files:
        # Helpful debug
        all_files = list(folder.rglob("*"))
        print(f"[debug] Files in {folder}:")
        for f in all_files[:40]:
            print(" -", f.relative_to(folder))
        raise RuntimeError(f"No CSV/TSV/TXT found in {folder}")

    # Prefer csv, then tsv, then txt
    def priority(p: Path) -> int:
        n = p.name.lower()
        if n.endswith(".csv"):
            return 0
        if n.endswith(".tsv"):
            return 1
        return 2

    files = sorted(files, key=priority)
    path = files[0]

    # ---- Load depending on extension ----
    if path.suffix.lower() == ".csv":
        df = pd.read_csv(path, encoding="latin-1")
        sep_hint = ","
    elif path.suffix.lower() == ".tsv":
        df = pd.read_csv(path, sep="\t", encoding="latin-1")
        sep_hint = "\t"
    else:
        # .txt: try tab-separated "label<TAB>text" first
        # If it fails, try comma-separated.
        try:
            df = pd.read_csv(path, sep="\t", header=None, encoding="latin-1")
            sep_hint = "\t"
        except Exception:
            df = pd.read_csv(path, sep=",", header=None, encoding="latin-1")
            sep_hint = ","

    # ---- Infer columns ----
    # Common case: 2 columns label/text (no header)
    if df.shape[1] == 2 and (df.columns.tolist() == [0, 1] or all(isinstance(c, int) for c in df.columns)):
        df.columns = ["label", "text"]
    else:
        cols = [str(c).lower() for c in df.columns]

        # infer text column
        text_col = None
        for cand in ["text", "message", "sms", "content", "v2", "body"]:
            if cand in cols:
                text_col = df.columns[cols.index(cand)]
                break
        if text_col is None:
            text_col = df.columns[1] if df.shape[1] >= 2 else df.columns[0]

        # infer label column
        label_col = None
        for cand in ["label", "class", "category", "type", "v1", "y"]:
            if cand in cols:
                label_col = df.columns[cols.index(cand)]
                break
        if label_col is None:
            label_col = df.columns[0]

        df = df[[label_col, text_col]].copy()
        df.columns = ["label", "text"]

    df["text"] = df["text"].apply(simple_normalize_text)

    # ---- Map labels -> y ----
    lab = df["label"].astype(str).str.lower().str.strip()

    # Strong mapping for smishing datasets: ham vs smish
    y = lab.isin(["spam", "smish", "smishing", "phish", "phishing", "scam"]).astype(int)

    # Also handle numeric labels 0/1
    if y.sum() == 0 and lab.str.fullmatch(r"\d+").any():
        y = (lab.astype(int) != 0).astype(int)

    # Handle ham explicitly
    # (If label is ham, ensure it's 0)
    y = y.where(~lab.eq("ham"), other=0)

    df["y"] = y
    df = df.dropna(subset=["text"]).reset_index(drop=True)

    print(f"[info] Loaded {len(df)} rows from {path.name} (sep='{sep_hint}')")
    return df[["text", "y"]]


def load_custom_dataset() -> pd.DataFrame | None:
    custom_path = CUSTOM_DIR / "authority_aug.csv"
    if not custom_path.exists():
        print("[warn] No custom authority CSV found")
        return None

    df = pd.read_csv(custom_path)
    df = df.rename(columns={"label": "y"})[["text", "y"]]
    df["text"] = df["text"].apply(simple_normalize_text)
    df["y"] = df["y"].astype(int)
    print("[info] Loaded custom authority dataset")
    return df


# -------------------------
# Model functions
# -------------------------
def build_pipeline():
    return Pipeline([
        ("tfidf", TfidfVectorizer(ngram_range=(1, 2), min_df=2, max_df=0.95)),
        ("lr", LogisticRegression(max_iter=3000, class_weight="balanced")),
    ])


def train_calibrated(X_train, y_train, method="sigmoid", cv=5):
    base = build_pipeline()
    model = CalibratedClassifierCV(base, method=method, cv=cv)
    model.fit(X_train, y_train)
    return model


def evaluate(model, X_test, y_test):
    probs = model.predict_proba(X_test)[:, 1]
    preds = (probs >= 0.5).astype(int)

    auc = roc_auc_score(y_test, probs)
    cm = confusion_matrix(y_test, preds)
    report = classification_report(y_test, preds, digits=4)

    print("\n=== Evaluation ===")
    print(f"AUC: {auc:.4f}")
    print("Confusion Matrix:\n", cm)
    print("\nClassification Report:\n", report)

    return {
        "auc": float(auc),
        "confusion_matrix": cm.tolist(),
        "classification_report": report,
    }


# -------------------------
# Main
# -------------------------
def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--calibration", default="sigmoid")
    args = parser.parse_args()

    load_env()

    DATA_DIR.mkdir(exist_ok=True)
    MODELS_DIR.mkdir(exist_ok=True)

    # Load data
    df_base = load_dataset_from_folder(kaggle_download(BASE_SMS_SPAM))

    print("[info] Loading PHISHING dataset...")
    df_phish = load_dataset_from_folder(kaggle_download(SMS_PHISHING))

    df_all = pd.concat([df_base, df_phish], ignore_index=True)

    df_custom = load_custom_dataset()
    if df_custom is not None:
        df_all = pd.concat([df_all, df_custom], ignore_index=True)

    print("[debug] Duplicate rows before global dedupe:", df_all["text"].duplicated().sum())
    df_all = df_all.drop_duplicates(subset=["text"]).reset_index(drop=True)
    print("[debug] Dataset size after global dedupe:", len(df_all))

    print(f"[info] Final dataset size: {len(df_all)}")

    X = df_all["text"].values
    y = df_all["y"].values

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    print("[info] Training calibrated model...")
    model = train_calibrated(X_train, y_train, method=args.calibration, cv=5)

    metrics = evaluate(model, X_test, y_test)

    run_dir = MODELS_DIR / datetime.now().strftime("%Y%m%d_%H%M%S")
    run_dir.mkdir(parents=True, exist_ok=True)

    model_path = run_dir / "sms_phishing_calibrated.joblib"
    joblib.dump(model, model_path)

    with open(run_dir / "metrics.json", "w") as f:
        json.dump(metrics, f, indent=2)

    print(f"[info] Saved model to: {model_path}")

    # Demo checks
    demo_texts = [
        "URGENT! Your bank account is locked. Verify now: http://bit.ly/abcd",
        "Hey are we still on for dinner tonight?",
        "Police department: your identity is under investigation. Transfer funds immediately.",
        "IRS: unpaid taxes detected. Confirm your SSN to avoid arrest.",
        "Bank security: read me the OTP code to cancel the transfer."
    ]

    print("\n=== Demo scores ===")
    for t in demo_texts:
        p = model.predict_proba([t])[0, 1] * 100
        print(f"{p:6.2f}% | {t}")


if __name__ == "__main__":
    main()