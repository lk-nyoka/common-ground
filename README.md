# Back Then

> **"You remember three songs. Back Then finds what comes next, and learns which ones still reach them."**

A taste-detective agent for dementia visits, powered by **Qloo's Cultural AI** and closed-loop care logic. Built for the **Qloo Agentic Hackathon on Devpost**.

---

## 🌟 Overview

Families visiting a loved one living with dementia don't lack content; YouTube has every old song. What they lack is knowing **what to try next** when the same three favourites stop working.

**Back Then** turns three or four memories (a singer, a dish, a place) into a tailored 20-minute bedside visit kit:
1. **2–3 Proven Favourites** (Safe ground)
2. **1–2 Qloo Discoveries** (Close cultural neighbours)
3. **1 Labelled Hypothesis** (e.g., *"Testing: does she respond to place-based memories?"*)
4. **1 Small Shared Moment** (20-minute tactile/listening activity)
5. **3 Conversation Openers**
6. **2 Stop Cues** (Safety & distress guidance)

After the visit, a **one-tap log** (lit up, flat, upset) updates the living taste map, adapts future kits, and excludes upsetting memories permanently.

---

## 🔬 Why Qloo Matters: Qloo vs. An LLM Alone

| Dimension | Standard LLM (Without Qloo) | Back Then (With Qloo) |
| :--- | :--- | :--- |
| **Cultural Specificity** | Generic decade stereotypes (Elvis, Beatles, Motown for anyone in the 1960s). | Traverses exact cultural clusters (e.g. Miriam Makeba → Dorothy Masuka, Manhattan Brothers, Hugh Masekela). |
| **Cross-Domain Affinity** | Hallucinates loose thematic analogies. | Real historical and community clustering linking music to regional cinema (*Come Back, Africa*) and heritage places (*Sophiatown*). |
| **Attribution & Trust** | Black-box output; cannot explain reasons. | Direct provenance on every node: *"Discovered by Qloo from Miriam Makeba"*. |
| **Adaptive Memory** | Static prompt session; forgets what worked. | Lit-up nodes feed back as new Qloo signals; upsetting nodes permanently avoid-listed. |

---

## 🚀 Quick Start

### 1. Prerequisites
- Node.js 18+ (tested on v22)
- Qloo Hackathon API Key (optional for sample demo path, required for live API queries)

### 2. Setup
```bash
git clone https://github.com/your-username/back-then.git
cd back-then
npm install
```

### 3. Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
Add your key:
```ini
QLOO_API_KEY=your_qloo_hackathon_api_key
```

### 4. Day 1 Validation Script
Run the automated Qloo API evaluation and LLM baseline comparison:
```bash
npm run test:qloo
```

### 5. Launch the Web Application
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧭 The 45-Second Judge Demo Path

1. **Open the sample profile (5s):** Preloaded with Nomvula (Soweto, born 1948) and three previous visits.
2. **Explore the Living Taste Map (10s):** See Qloo discoveries radiating from seeds, colour-coded:
   - 🟢 **Green:** Reached them (Proven favourite)
   - 🟡 **Amber:** Untested Qloo discovery
   - 🔴 **Red:** Excluded / distress (Permanent avoid list)
3. **Tap "I'm visiting now" (5s):** The visit kit appears with 3 plain-English reasons, confidence words, and this visit's hypothesis.
4. **Log 3 reactions (10s):** Tap one reaction per item (two lit up, one flat or upset).
5. **Watch it adapt (15s):** The map nodes change colour, the agent explains what it noticed, and the Next-Visit Line appears above the new kit.

---

## 🛡️ Caregiver Dignity & Privacy First
- **No account required:** Zero login friction for exhausted caregivers.
- **No diagnosis stored:** Focuses exclusively on taste, music, and shared moments.
- **Session-only by default:** Clean slate on tab close unless saved.
- **Safety stop cues:** Gentle guidance to pause whenever agitation appears.

---

## 📄 License
MIT License — Copyright (c) 2026 Lindokuhle.
