"""
Sentiment Analysis Script — Elevate Black Voices
=================================================
Uses HuggingFace Transformers (100% offline after first download)
Model: cardiffnlp/twitter-roberta-base-sentiment-latest
- No data ever leaves your computer
- Trained on 124M tweets — handles conversational English well
- Free, open source, citable in research papers

SETUP (run once in terminal):
    pip install transformers torch sentencepiece openpyxl pandas matplotlib seaborn tqdm

FIRST RUN:
    Downloads the model (~500MB) to your computer once.
    After that, runs completely offline.

USAGE:
    python sentiment_analysis.py

OUTPUT:
    - sentiment_results.csv       full comparison table
    - sentiment_comparison.png    4-chart visualization
    - sentiment_summary.txt       plain English summary
"""

import os
import sys
import time
import warnings
warnings.filterwarnings('ignore')

# ── CHECK DEPENDENCIES ─────────────────────────────────────────────────────────
missing = []
try:
    import pandas as pd
except ImportError:
    missing.append('pandas')
try:
    import matplotlib.pyplot as plt
    import matplotlib.gridspec as gridspec
except ImportError:
    missing.append('matplotlib')
try:
    import seaborn as sns
except ImportError:
    missing.append('seaborn')
try:
    import numpy as np
except ImportError:
    missing.append('numpy')
try:
    from transformers import pipeline, AutoTokenizer, AutoModelForSequenceClassification
    import torch
except ImportError:
    missing.append('transformers torch')
try:
    from tqdm import tqdm
except ImportError:
    missing.append('tqdm')
try:
    import requests
except ImportError:
    missing.append('requests')

if missing:
    print("❌ Missing packages. Run this first:")
    print(f"   pip install {' '.join(missing)}")
    sys.exit(1)

print("✅ All packages found")

# ── CONFIGURATION ──────────────────────────────────────────────────────────────

EXCEL_PATH = "public/sample-data.xlsx"

# HuggingFace model — runs offline after first download
# 7-class emotion model: joy, surprise, neutral, sadness, disgust, fear, anger
MODEL_NAME = "j-hartmann/emotion-english-distilroberta-base"

# Local cache folder — model saved here after first download
MODEL_CACHE = "./hf_model_cache"

# Local LLM via Ollama — used for semantic agreement checking
# Set USE_LLM = False to skip Ollama entirely (fast string-match fallback)
USE_LLM    = True
LLM_MODEL  = "llama3:latest"  # Ollama model name (e.g. "llama3:latest")
OLLAMA_URL = "http://localhost:11434"

# Emotion color schema (matches the globe exactly)
EMOTION_COLORS = {
    "Neutral":            "#A0AEC0",
    "Emphasis / Excited": "#7B61FF",
    "Enthusiastic":       "#00C48C",
    "Proud":              "#F5C518",
    "Deprecation":        "#FF851B",
    "Upset / Anger":      "#E53E3E",
}

# Map HuggingFace 3-class output → your 6 emotion labels
# HuggingFace gives: POSITIVE, NEUTRAL, NEGATIVE + a score 0-1
# Normalize raw human annotation labels → standard emotion categories
_LABEL_MAP = {
    # exact matches (lowercase)
    'neutral':           'Neutral',
    'enthusiastic':      'Enthusiastic',
    'proud':             'Proud',
    'deprecation':       'Deprecation',
    'deprication':       'Deprecation',   # common misspelling
    # slash / spacing variants
    'emphasis/excited':  'Emphasis / Excited',
    'emphasis / excited':'Emphasis / Excited',
    'emphasis/excite':   'Emphasis / Excited',
    'upset/anger':       'Upset / Anger',
    'upset / anger':     'Upset / Anger',
    'upset/angry':       'Upset / Anger',
    # extra labels — mapped to closest standard category
    'humor':             'Emphasis / Excited',  # humor is playful/energetic
    'sarcasm':           'Deprecation',          # sarcasm carries a negative/mocking tone
    'toughness':         'Proud',                # expressing strength/confidence
    'hostile':           'Upset / Anger',
    'sensual':           'Enthusiastic',         # positive, engaged
}

def normalize_human_label(raw):
    """Maps a raw human annotation string → one of the 6 standard emotion labels."""
    key = str(raw).strip().lower()
    return _LABEL_MAP.get(key, raw.strip())  # return as-is if no mapping found


def hf_to_emotion(label, score):
    """
    Maps j-hartmann 7-class emotion output → your 6 emotion categories

    joy      → Enthusiastic (high confidence) or Proud (lower)
    surprise → Emphasis / Excited
    neutral  → Neutral
    sadness  → Deprecation
    disgust  → Deprecation
    fear     → Deprecation
    anger    → Upset / Anger
    """
    label = label.lower()

    if label == 'joy':
        return "Enthusiastic" if score >= 0.70 else "Proud"
    elif label == 'surprise':
        return "Emphasis / Excited"
    elif label == 'neutral':
        return "Neutral"
    elif label in ('sadness', 'disgust', 'fear'):
        return "Deprecation"
    elif label == 'anger':
        return "Upset / Anger"

    return "Neutral"

def hf_to_numeric_score(label, score):
    """
    Converts j-hartmann emotion label + confidence → a -1 to 1 numeric score.
      1.0  Mostly Positive
      0.5  Slightly Positive
      0.0  Mostly Neutral
     -0.5  Slightly Negative
     -1.0  Mostly Negative
    """
    label = label.lower()
    if label == 'joy':
        return (1.0, "Mostly Positive") if score >= 0.70 else (0.5, "Slightly Positive")
    elif label == 'surprise':
        return (0.5, "Slightly Positive")
    elif label == 'neutral':
        return (0.0, "Mostly Neutral")
    elif label in ('sadness', 'disgust', 'fear'):
        return (-0.5, "Slightly Negative")
    elif label == 'anger':
        return (-1.0, "Mostly Negative")
    return (0.0, "Mostly Neutral")

def llm_agrees(human_label, hf_emotion, _retries=3, _delay=5):
    """
    Asks a local Ollama LLM whether the human label and HF emotion
    are semantically equivalent for this transcript.
    Retries up to _retries times with _delay seconds between attempts.
    Falls back to case-insensitive string match if USE_LLM=False or all retries fail.
    """
    if not USE_LLM:
        return hf_emotion.lower() == human_label.lower()

    prompt = (
        f"Human annotator emotion label: {human_label}\n"
        f"AI model emotion prediction:   {hf_emotion}\n"
        "Do these two emotion labels describe the same or very similar emotional tone?\n"
        "Reply with only YES or NO."
    )
    for attempt in range(1, _retries + 1):
        try:
            resp = requests.post(
                f"{OLLAMA_URL}/api/generate",
                json={"model": LLM_MODEL, "prompt": prompt, "stream": False},
                timeout=5,
            )
            resp.raise_for_status()
            answer = resp.json().get("response", "").strip().upper()
            return answer.startswith("YES")
        except Exception as e:
            print(f"⚠️  Ollama attempt {attempt}/{_retries} failed: {e}")
            if attempt < _retries:
                print(f"   Retrying in {_delay}s...")
                time.sleep(_delay)
            else:
                print("   All retries exhausted — falling back to string match.")
                return hf_emotion.lower() == human_label.lower()

# ── LOAD MODEL ─────────────────────────────────────────────────────────────────

print("\n── LOADING MODEL ────────────────────────────────────────")
print(f"   Model: {MODEL_NAME}")
print(f"   Cache: {MODEL_CACHE}")
print("   (First run downloads ~500MB. After that, fully offline.)\n")

os.makedirs(MODEL_CACHE, exist_ok=True)

try:
    tokenizer = AutoTokenizer.from_pretrained(
        MODEL_NAME,
        cache_dir=MODEL_CACHE,
    )
    model = AutoModelForSequenceClassification.from_pretrained(
        MODEL_NAME,
        cache_dir=MODEL_CACHE,
    )
    
    # Use GPU if available, otherwise CPU
    device = 0 if torch.cuda.is_available() else -1
    device_name = "GPU 🚀" if device == 0 else "CPU"
    print(f"   Running on: {device_name}")
    
    sentiment_pipeline = pipeline(
        "sentiment-analysis",
        model=model,
        tokenizer=tokenizer,
        device=device,
        truncation=True,
        max_length=512,
    )
    print("✅ Model loaded successfully\n")

except Exception as e:
    print(f"❌ Could not load model: {e}")
    print("\nTry running:")
    print("   pip install transformers torch sentencepiece tokenizers tiktoken")
    print("   Make sure you have internet for the first download.")
    sys.exit(1)

# ── LOAD EXCEL DATA ────────────────────────────────────────────────────────────

print("── LOADING DATA ─────────────────────────────────────────")

if not os.path.exists(EXCEL_PATH):
    print(f"❌ Could not find: {EXCEL_PATH}")
    print("\nPlease update EXCEL_PATH at the top of this script.")
    print("Example: EXCEL_PATH = 'path/to/your-data.xlsx'")
    sys.exit(1)

try:
    xl = pd.ExcelFile(EXCEL_PATH)
    print(f"   Sheets found: {xl.sheet_names}")

    dfs = []
    for sheet in xl.sheet_names:
        try:
            df = pd.read_excel(EXCEL_PATH, sheet_name=sheet)
            df['_sheet'] = sheet
            dfs.append(df)
            print(f"   Sheet '{sheet}': {len(df)} rows")
        except Exception as e:
            print(f"   Could not read '{sheet}': {e}")

    data = pd.concat(dfs, ignore_index=True)
    print(f"\n   Total rows: {len(data)}")
    print(f"   Columns: {list(data.columns)}\n")

except Exception as e:
    print(f"❌ Error reading Excel: {e}")
    sys.exit(1)

# ── AUTO-DETECT COLUMNS ────────────────────────────────────────────────────────

print("── DETECTING COLUMNS ────────────────────────────────────")

def find_col(df, keywords):
    for c in df.columns:
        if any(k in str(c).lower() for k in keywords):
            return c
    return None

column_lookup = {str(col).strip().lower(): col for col in data.columns}

def resolve_col(name, required=False, display="Column"):
    resolved = column_lookup.get(str(name).strip().lower()) if name else None
    if not resolved and required:
        print(f"❌ {display} not found: {name}")
        print(f"   Available columns: {list(data.columns)}")
        sys.exit(1)
    return resolved

transcript_col = resolve_col('AAVE phonetic transcript', required=True,  display="Transcript column")
label_col      = resolve_col('EMOTION LABEL', required=False, display="Human label column")
session_col    = resolve_col('ResponseID', required=False, display="Session ID column")
# state_col      = resolve_col('', required=False, display="State column")

print(f"   Transcript column : {transcript_col}")
print(f"   Human label column: {label_col}")
print(f"   Session ID column : {session_col}\n")
# print(f"   State column      : {state_col}\n")

if not transcript_col:
    print("❌ Could not find transcript column.")
    print(f"   Available columns: {list(data.columns)}")
    print("   Update TRANSCRIPT_COL in the script.")
    sys.exit(1)
    
if not label_col:
    print("⚠️  Warning: Could not find human label column.")
    print(f"   Available columns: {list(data.columns)}")
    print("   Update LABEL_COL in the script if you have human labels.\n")
    sys.exit(1)
    
if not session_col:
    print("⚠️  Warning: Could not find session ID column.")
    print(f"   Available columns: {list(data.columns)}")
    print("   Update SESSION_COL in the script if you have a session ID column.\n")
    sys.exit(1)

# ── RUN ANALYSIS ───────────────────────────────────────────────────────────────

print("── RUNNING HUGGINGFACE ANALYSIS ─────────────────────────")
print("   (Your data stays on your computer — nothing is sent online)\n")

results = []
skipped = 0
batch_size = 16  # process 16 at a time for speed

# Collect valid rows
valid_rows = []
for idx, row in data.iterrows():
    transcription_text = str(row.get(transcript_col, '')).strip()
    human_label_text = str(row.get(label_col, '')).strip() if label_col else ''
    print(f"   Processing row {idx} - Transcript: '{transcription_text[:30]}...' Human Label: '{human_label_text}'")
    # Check the transcript column for empty or invalid entries and check the human label column for empty or invalid entries
    if not transcription_text or transcription_text.lower() in ['nan', 'none', ''] or not human_label_text or human_label_text.lower() in ['nan', 'none', '']:
        skipped += 1
        continue
    valid_rows.append((idx, row, transcription_text, human_label_text))

print(f"   Analyzing {len(valid_rows)} responses ({skipped} skipped)\n")

# Process in batches with progress bar
texts = [r[2] for r in valid_rows]
all_preds = []

for i in tqdm(range(0, len(texts), batch_size), desc="   Analyzing", unit="batch"):
    batch = texts[i:i+batch_size]
    try:
        preds = sentiment_pipeline(batch)
        all_preds.extend(preds)
    except Exception as e:
        # Fallback: process one at a time
        for text in batch:
            try:
                pred = sentiment_pipeline(text[:512])
                all_preds.extend(pred)
            except:
                all_preds.append({'label': 'NEUTRAL', 'score': 0.5})

# Build results table
for (idx, row, text, human_label_text), pred in zip(valid_rows, all_preds):
    hf_label = pred['label']
    hf_score = pred['score']
    hf_emotion = hf_to_emotion(hf_label, hf_score)
    num_score, score_label = hf_to_numeric_score(hf_label, hf_score)
    human_label = normalize_human_label(human_label_text) if label_col else 'Unknown'    
    agrees = llm_agrees(human_label, hf_emotion)
    score_fmt = f"{num_score}: {score_label}"

    results.append({
        'session_id':       str(row.get(session_col, idx)) if session_col else str(idx),
        'sheet':            row.get('_sheet', ''),
        'transcript':       text[:200] + ('...' if len(text) > 200 else ''),
        'human_label':      human_label,
        'hf_raw_label':     hf_label,
        'hf_confidence':    round(hf_score, 4),
        'hf_emotion':       hf_emotion,
        'llm_score':        num_score,
        'llm_score_label':  score_label,
        'agreement':        agrees,
    })

df_results = pd.DataFrame(results)

# ── PRINT STATS ────────────────────────────────────────────────────────────────

total   = len(df_results)
matches = df_results['agreement'].sum()
pct     = matches / total * 100 if total > 0 else 0

print(f"\n── RESULTS ──────────────────────────────────────────────")
print(f"   Total analyzed  : {total}")
print(f"   Agreement       : {matches} ({pct:.1f}%)")
print(f"   Disagreement    : {total - matches} ({100-pct:.1f}%)")

print(f"\n── HUGGINGFACE DISTRIBUTION ─────────────────────────────")
hf_dist = df_results['hf_emotion'].value_counts()
for emotion, count in hf_dist.items():
    bar = '█' * int(count / total * 40)
    print(f"   {emotion:<24} {count:>4}  {bar}")

if label_col:
    print(f"\n── HUMAN LABEL DISTRIBUTION ─────────────────────────────")
    human_dist = df_results['human_label'].value_counts()
    for emotion, count in human_dist.items():
        bar = '█' * int(count / total * 40)
        print(f"   {emotion:<24} {count:>4}  {bar}")

# Per-emotion agreement
print(f"\n── AGREEMENT BY EMOTION ─────────────────────────────────")
for emotion in EMOTION_COLORS.keys():
    subset = df_results[df_results['human_label'] == emotion]
    if len(subset) == 0:
        continue
    agree = subset['agreement'].sum()
    pct_e = agree / len(subset) * 100
    bar = '█' * int(pct_e / 5)
    print(f"   {emotion:<24} {pct_e:>5.1f}%  {bar}")

# ── SAVE CSV ───────────────────────────────────────────────────────────────────

df_results.to_csv("sentiment_results.csv", index=False)
print(f"\n✅ Saved: sentiment_results.csv")

# Save plain English summary
with open("sentiment_summary.txt", "w") as f:
    f.write("SENTIMENT ANALYSIS SUMMARY\n")
    f.write("Elevate Black Voices — Howard University × Google\n")
    f.write("=" * 50 + "\n\n")
    f.write(f"Model: {MODEL_NAME}\n")
    f.write(f"Total responses analyzed: {total}\n")
    f.write(f"Agreement with human labels: {matches} ({pct:.1f}%)\n\n")
    
    f.write("HUGGINGFACE DISTRIBUTION:\n")
    for emotion, count in hf_dist.items():
        f.write(f"  {emotion}: {count} ({count/total*100:.1f}%)\n")
    
    if label_col:
        f.write("\nHUMAN LABEL DISTRIBUTION:\n")
        for emotion, count in human_dist.items():
            f.write(f"  {emotion}: {count} ({count/total*100:.1f}%)\n")
    
    f.write(f"\nKEY FINDING:\n")
    f.write(f"HuggingFace agreed with human annotators {pct:.1f}% of the time.\n")
    f.write("Note: Lower agreement on AAVE expressions is expected\n")
    f.write("and is itself a research finding about AI bias.\n")

print("✅ Saved: sentiment_summary.txt")

# ── VISUALIZE ──────────────────────────────────────────────────────────────────

print("\n── GENERATING CHARTS ────────────────────────────────────")

CREAM   = '#f5f0e8'
GREEN1  = '#1b4332'
GREEN2  = '#2d6a4f'
GREEN3  = '#40916c'
BROWN   = '#a07850'

fig = plt.figure(figsize=(18, 13), facecolor=CREAM)
fig.suptitle(
    'Sentiment Analysis: HuggingFace RoBERTa vs Human Annotation\n'
    'Elevate Black Voices  ·  Howard University × Google',
    fontsize=15, fontweight='bold', color=GREEN1, y=0.98
)

gs = gridspec.GridSpec(2, 3, figure=fig, hspace=0.42, wspace=0.35)
ax1 = fig.add_subplot(gs[0, :2])   # wide bar chart top left
ax2 = fig.add_subplot(gs[0, 2])    # pie top right
ax3 = fig.add_subplot(gs[1, :2])   # confusion heatmap bottom left
ax4 = fig.add_subplot(gs[1, 2])    # per-emotion agreement bottom right

emotions = list(EMOTION_COLORS.keys())
colors   = list(EMOTION_COLORS.values())

# ── Chart 1: Side-by-side bars ──
human_counts = [human_dist.get(e, 0) if label_col else 0 for e in emotions]
hf_counts    = [hf_dist.get(e, 0) for e in emotions]
x = np.arange(len(emotions))
w = 0.38

bars_h = ax1.bar(x - w/2, human_counts, w,
                 color=colors, alpha=0.92, edgecolor='white', linewidth=1.2,
                 label='Human Annotation')
bars_v = ax1.bar(x + w/2, hf_counts, w,
                 color=colors, alpha=0.42, edgecolor='white', linewidth=1.2,
                 hatch='//', label='HuggingFace RoBERTa')

for bar in bars_h:
    h = bar.get_height()
    if h > 0:
        ax1.text(bar.get_x() + bar.get_width()/2, h + 1,
                 str(int(h)), ha='center', va='bottom', fontsize=8, color=GREEN1)
for bar in bars_v:
    h = bar.get_height()
    if h > 0:
        ax1.text(bar.get_x() + bar.get_width()/2, h + 1,
                 str(int(h)), ha='center', va='bottom', fontsize=8, color=GREEN2, alpha=0.7)

ax1.set_xticks(x)
ax1.set_xticklabels(emotions, rotation=20, ha='right', fontsize=9, color=GREEN1)
ax1.set_title('Emotion Distribution: Human vs HuggingFace', 
              fontweight='bold', color=GREEN1, pad=10)
ax1.set_ylabel('Number of Responses', color=GREEN1)
ax1.legend(loc='upper right', framealpha=0.7)
ax1.set_facecolor(CREAM)
ax1.spines['top'].set_visible(False)
ax1.spines['right'].set_visible(False)
ax1.tick_params(colors=GREEN1)
ax1.text(0.5, -0.22,
         'Solid bars = human annotators · Hatched bars = AI model.\n'
         'Compare heights to see where the AI over- or under-predicts each emotion.',
         ha='center', va='top', transform=ax1.transAxes,
         fontsize=8, color=GREEN2, style='italic')

# ── Chart 2: Agreement pie ──
agree_data   = [int(matches), int(total - matches)]
agree_labels = [f'Agree\n{int(matches)}', f'Disagree\n{int(total-matches)}']
wedges, texts, autotexts = ax2.pie(
    agree_data,
    labels=agree_labels,
    colors=[GREEN2, BROWN],
    autopct='%1.1f%%',
    startangle=90,
    wedgeprops={'edgecolor': 'white', 'linewidth': 2.5},
    textprops={'fontsize': 9, 'color': GREEN1},
)
for at in autotexts:
    at.set_fontweight('bold')
    at.set_color('white')
    at.set_fontsize(10)
ax2.set_title(f'Agreement Rate\n({total} responses total)',
              fontweight='bold', color=GREEN1, pad=10)
ax2.set_facecolor(CREAM)
ax2.text(0.5, -0.08,
         'Agree = AI and human chose the same emotion.\n'
         'Lower agreement on AAVE is itself a key research finding about AI bias.',
         ha='center', va='top', transform=ax2.transAxes,
         fontsize=8, color=GREEN2, style='italic')

# ── Chart 3: Confusion matrix ──
if label_col:
    confusion = pd.crosstab(
        df_results['human_label'],
        df_results['hf_emotion'],
        rownames=['Human Label'],
        colnames=['HuggingFace']
    ).reindex(index=emotions, columns=emotions, fill_value=0)

    short = [e.split(' ')[0] for e in emotions]
    sns.heatmap(
        confusion, ax=ax3,
        cmap=sns.light_palette(GREEN2, as_cmap=True),
        annot=True, fmt='d', linewidths=0.8,
        linecolor='white',
        cbar_kws={'shrink': 0.7, 'label': 'Count'},
        xticklabels=short, yticklabels=short,
    )
    ax3.set_title('Confusion Matrix\n(rows = Human, columns = HuggingFace)',
                  fontweight='bold', color=GREEN1, pad=10)
    ax3.tick_params(axis='x', rotation=30, colors=GREEN1)
    ax3.tick_params(axis='y', rotation=0, colors=GREEN1)
    ax3.set_facecolor(CREAM)
    ax3.set_xlabel('HuggingFace Prediction', color=GREEN1)
    ax3.set_ylabel('Human Annotation', color=GREEN1)
    ax3.text(0.5, -0.22,
             'Diagonal cells = correct AI predictions · Off-diagonal = misclassifications.\n'
             'Darker shading = more responses in that cell.',
             ha='center', va='top', transform=ax3.transAxes,
             fontsize=8, color=GREEN2, style='italic')

# ── Chart 4: Per-emotion agreement bars ──
agree_pcts = []
agree_colors_list = []
emotion_labels_short = []

for emotion, color in EMOTION_COLORS.items():
    subset = df_results[df_results['human_label'] == emotion] if label_col else pd.DataFrame()
    if len(subset) == 0:
        continue
    a = subset['agreement'].sum() / len(subset) * 100
    agree_pcts.append(a)
    agree_colors_list.append(color)
    emotion_labels_short.append(emotion.split(' ')[0])

y_pos = np.arange(len(agree_pcts))
bars = ax4.barh(y_pos, agree_pcts,
                color=agree_colors_list, alpha=0.88,
                edgecolor='white', linewidth=1)
ax4.set_yticks(y_pos)
ax4.set_yticklabels(emotion_labels_short, fontsize=9, color=GREEN1)
ax4.set_xlim(0, 105)
ax4.set_xlabel('Agreement %', color=GREEN1)
ax4.set_title('Agreement Rate\nby Emotion Category',
              fontweight='bold', color=GREEN1, pad=10)
ax4.axvline(x=pct, color=BROWN, linestyle='--',
            linewidth=1.5, label=f'Overall avg {pct:.0f}%')
ax4.legend(fontsize=8, loc='lower right')

for i, (bar, val) in enumerate(zip(bars, agree_pcts)):
    ax4.text(val + 1, bar.get_y() + bar.get_height()/2,
             f'{val:.0f}%', va='center', fontsize=9,
             color=GREEN1, fontweight='bold')

ax4.set_facecolor(CREAM)
ax4.spines['top'].set_visible(False)
ax4.spines['right'].set_visible(False)
ax4.tick_params(colors=GREEN1)
ax4.text(0.5, -0.14,
         'Each bar = % of responses where AI matched the human label\n'
         'for that emotion. Dashed line = overall average agreement.',
         ha='center', va='top', transform=ax4.transAxes,
         fontsize=8, color=GREEN2, style='italic')

plt.savefig("sentiment_comparison.png",
            dpi=150, bbox_inches='tight', facecolor=CREAM)
print("✅ Saved: sentiment_comparison.png")

plt.show()

print("\n" + "="*55)
print("  DONE ✅")
print("="*55)
print(f"  Agreement rate  : {pct:.1f}%")
print(f"  Results file    : sentiment_results.csv")
print(f"  Charts file     : sentiment_comparison.png")
print(f"  Summary file    : sentiment_summary.txt")
print(f"  Model cache     : {MODEL_CACHE}/")
print("="*55)
print("\n  ℹ️  Your data never left your computer.")
print("  ℹ️  Model is cached — next run works fully offline.")