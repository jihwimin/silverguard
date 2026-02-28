from pathlib import Path
import joblib

# Make path relative to this file
HERE = Path(__file__).resolve().parent
MODELS_DIR = HERE / "models"

_model = None  # cache model in memory


def load_latest_model():
    global _model

    if _model is not None:
        return _model

    if not MODELS_DIR.exists():
        raise FileNotFoundError(f"Models directory not found: {MODELS_DIR}")

    run_dirs = sorted(
        [p for p in MODELS_DIR.glob("*") if p.is_dir()],
        key=lambda x: x.stat().st_mtime,
        reverse=True,
    )

    if not run_dirs:
        raise FileNotFoundError("No trained model found. Train first.")

    model_path = run_dirs[0] / "sms_phishing_calibrated.joblib"

    if not model_path.exists():
        raise FileNotFoundError(f"Model file not found: {model_path}")

    _model = joblib.load(model_path)
    print(f"[info] Loaded model from {model_path}")

    return _model


def phishing_percent(text: str) -> float:
    model = load_latest_model()
    return float(model.predict_proba([text])[0, 1] * 100)


if __name__ == "__main__":
    model = load_latest_model()
    print("Phishing detector ready. Press Enter to quit.\n")

    while True:
        s = input("Text> ").strip()
        if not s:
            break
        p = model.predict_proba([s])[0, 1] * 100
        print(f"Phishing likelihood: {p:.2f}%")