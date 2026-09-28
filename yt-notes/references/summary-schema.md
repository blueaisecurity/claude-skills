# Structured summary format

One JSON file per **part**. A part is a chunk of a long video, or a whole video when it isn't chunked
(and in playlist mode). `merge_summaries.js` reads these files, so keep the field names exactly as shown.
Write every text field in your own words; never paste transcript sentences.

```json
{
  "source": {
    "video_id": "abc123XYZ",
    "title": "Video title",
    "channel": "Creator name",
    "url": "https://www.youtube.com/watch?v=abc123XYZ",
    "published": "2026-09-16",
    "duration_seconds": 5400,
    "caption_type": "auto",
    "part": "chunk-03",
    "start": 1800,
    "end": 2700,
    "part_title": "Chapter or block title"
  },
  "one_sentence": "What this part is about, in one sentence.",
  "filler": false,
  "filler_reason": "",
  "points": [
    { "point": "Short statement of the idea", "why": "Why it matters to the viewer", "t": 1932, "importance": 5 }
  ],
  "concepts": [
    { "term": "Term", "explanation": "Plain-language explanation", "example": "Example or analogy" }
  ],
  "claims": [
    { "claim": "A factual claim worth checking", "t": 2100, "check": "verify" }
  ],
  "numbers": [
    { "value": "40%", "context": "what the number measures", "t": 2210 }
  ],
  "frameworks": [
    { "name": "Name of the model or list", "shape": "flow", "items": ["Step 1", "Step 2", "Step 3"] }
  ],
  "visual_candidates": [
    { "idea": "What to draw", "shape": "cycle", "t": 2300 }
  ],
  "memorise": ["Short fact worth remembering"],
  "watch_worthy": [
    { "t": 2400, "why": "Live demo that's clearer on video than in text" }
  ]
}
```

## Field rules

| Field | Rule |
|---|---|
| `t` | Seconds from the start of the **whole video** (not of the chunk). |
| `importance` | 5 = core idea of the video · 4 = important · 3 = useful · 2 = detail · 1 = aside. Judge against the whole video's topic, not the chunk. |
| `filler` | `true` when the part is mostly a sponsor read, intro/outro, small talk, a break or off-topic Q&A. Then give `filler_reason` and leave `points` empty or minimal. |
| `shape` | One of `flow`, `cycle`, `compare`, `layers`, `hub`, `timeline`, `bars`, `matrix`, `architecture` (the patterns in `assets/diagrams.html`). |
| `check` | `verify` for claims that should be checked against a primary source, `ok` for common knowledge. |
| `caption_type` | `auto` or `manual`. |

Counts per part: 3–8 points, 0–5 concepts, 0–4 claims, and whatever numbers, frameworks and watch-worthy moments exist.
Quality beats quantity: a 15-minute chunk rarely has more than 5 points of importance 4 or higher.
