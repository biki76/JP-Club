# Qwen assignment (JP-Club / Nihongo-Bengali)

Read first: context.md, docs/context-phase13.md, docs/handoff-qwen.md (environment and code rules apply to you too).
Reply format: ONE paste-ready bash script in ONE code block, one line of text above it. Every script starts with `cd ~/JP-Club && git status --short && git pull --rebase origin main`, is idempotent, never uses `exit` or /tmp, and ends with `bash tools/finish.sh "message"`.
One agent at a time: Qwen may also be editing. Never touch a file outside your lane without telling the owner.

## Your lane (you own all lanes per docs/handoff-qwen.md)
Any file, but only through guarded, idempotent patches. Never rewrite a file wholesale unless you created it.

## Task 1: Test Qwen's three features
You cannot run a browser, so you write the tests and the owner runs them on a phone and reports back.
1. Write tools/qa-features.mjs (static checks): the files exist, each page loads the scripts it needs, key selectors and localStorage keys are present. Print PASS/FAIL per check.
2. Write docs/qa-checklist.md: a step-by-step manual checklist with the EXPECTED result for each step.
   - Streak prompt (js/streak-prompt.js, key nihongo_signin_prompted): after "Mark lesson complete" while signed out (no nihongo_sync_user) it shows once, links to auth.html, is bilingual, never shows when signed in, never shows twice.
   - Command palette (js/cmd-palette.js): `/` or Ctrl+K opens, Esc closes and returns focus, arrow keys and Enter work, focus is trapped, results include vocabulary, kanji and lessons, role="dialog" aria-modal="true".
   - Empty states (js/empty-states.js): Progress with cleared localStorage, Search with a nonsense word, Flashcards with nothing due, lesson bookmarks. Each shows an icon, one message and one button, in both languages.
3. When the owner reports a failure, fix it with a minimal patch script and re-test.

## Task 2: Real content for Mimikara Oboeru and Shin Kanzen Master
First run an export command to print the current shape of content/mimikara/index.json, content/shinkanzen/index.json, mimikara.html, shinkanzen.html and js/tracks.js. Follow the existing shape. Do not change the page code unless the shape cannot hold the content.
Copyright: write ORIGINAL content. Follow the topic structure of these course types, but do not copy words lists, passages or questions from the published books.
- Mimikara (N3 vocabulary by theme): at least 10 themes (for example time, family, work, travel, health, feelings), 25 words each. Each word uses the same fields as lesson vocabulary: id, kanji (omit if kana-only), furigana, romaji, english_meaning, bengali_meaning, tags, and add one short original example sentence with furigana, romaji, en, bn.
- Shin Kanzen Master (N3): 3 tracks. Grammar: 20 patterns with 3 original examples each. Reading: 10 short passages, each with 3 multiple-choice questions. Listening: 10 transcripts, each with 3 multiple-choice questions. Questions use the same object shape as data/lessons/*/reading.json questions (id, type, prompt{en,bn}, options[3-4], correctIndex, explanation{en,bn}).
- Bengali must be natural Bengali script, never English, never empty.
- Deliver in batches (about 2 themes or 5 items per reply). Write tools/validate-tracks.mjs that checks JSON validity, unique ids, correctIndex < options.length and no empty fields, and run it in each script before finish.sh.
- Remove "Coming soon" only after the content exists: patch the soon flags in js/home.js BOOKS entries for those two tracks.

## Task 3A: Audio files
You cannot synthesize audio yourself. Build the pipeline; the owner (or a tool they pick) produces the sound.
- Check which free TTS works in Termux (for example the Python package edge-tts, or an offline engine). State the license and whether public use is allowed for the voice you recommend, and say if you cannot verify it.
- Write tools/gen-audio.mjs (or .sh) that reads vocabulary and listening transcripts, creates mono mp3 at about 32 kbps in audio/minna-NNN/ (v001.mp3 for vocab by id, l001.mp3 for listening lines), skips files that already exist, and writes audio_url into the data JSON with a relative path.
- Start small: lessons 1 to 5 vocabulary and listening only, then report the total size. Keep the repo well under 500 MB.
- Do not precache audio in sw.js; cache it at runtime on first play. The existing player already tries audio_url first and falls back to the browser voice, so missing files must never break playback.

## Task 3B: Microcopy pass
- Write tools/export-strings.mjs that lists every data-en/data-bn pair in the html pages and in the js files (page, selector or key, en, bn) into ~/strings.json.
- Rewrite weak strings by these rules: verb-first CTAs, outcome over action, no "Submit", errors say what happened and how to fix it, no jargon. Examples to apply: "Start Lesson 1 \u2014 free" / "পাঠ ১ শুরু করুন \u2014 বিনামূল্যে"; sync prompt "Save your streak across devices" / "সব ডিভাইসে স্ট্রিক সেভ রাখুন"; offline "You're offline. Your progress is saved and will sync later." / "আপনি অফলাইনে। অগ্রগতি সংরক্ষিত আছে, পরে সিঙ্ক হবে।"; auth error "That email or password doesn't match. Try again or use a magic link." / "ইমেইল বা পাসওয়ার্ড মেলেনি। আবার চেষ্টা করুন বা ম্যাজিক লিংক ব্যবহার করুন।"
- Write tools/apply-strings.mjs that replaces exact old strings with new ones in the html and js files, only when the old string occurs exactly as exported (idempotent), and never touches code logic. Report counts of replaced and skipped strings.

## Order of work
Task 1 (tests first), then Task 3B (small, fast), then Task 2 (largest), then Task 3A.
After every task give the owner a 3-line checklist: what to open, what to see.
