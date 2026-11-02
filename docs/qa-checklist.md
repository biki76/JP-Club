# QA Checklist for New Features

## 1. Streak Prompt (js/streak-prompt.js)
- **Step 1**: Open `lesson.html?lesson=minna-001` in an incognito window (ensure you are signed out, no `nihongo_sync_user` in localStorage).
- **Step 2**: Scroll to the bottom and click "Mark lesson complete".
- **Expected Result**: A toast or bottom sheet appears with bilingual text ("Save your streak across devices" / "সব ডিভাইসে স্ট্রিক সেভ রাখুন") and a link to `auth.html`.
- **Step 3**: Refresh the page and click "Mark lesson complete" again.
- **Expected Result**: The prompt does NOT appear again (checked via `nihongo_signin_prompted` in localStorage).
- **Step 4**: Sign in (or mock `nihongo_sync_user` in localStorage) and complete a lesson.
- **Expected Result**: The prompt does NOT appear.

## 2. Command Palette (js/cmd-palette.js)
- **Step 1**: Open any content page (e.g., `home.html`).
- **Step 2**: Press `/` or `Ctrl+K` on a keyboard (or tap the search icon in the header on mobile).
- **Expected Result**: A bottom sheet / overlay appears with `role="dialog"` and `aria-modal="true"`. Focus is trapped inside.
- **Step 3**: Type a known vocabulary word (e.g., "水").
- **Expected Result**: Results show vocabulary, kanji, and lessons matching the query.
- **Step 4**: Use Arrow Down / Arrow Up and press Enter.
- **Expected Result**: Navigates to the selected item.
- **Step 5**: Press `Esc`.
- **Expected Result**: The palette closes, and focus returns to the element that opened it.

## 3. Empty States (js/empty-states.js)
- **Progress Empty**: Clear `nihongo_progress` in DevTools Application tab. Open `progress.html`.
  - **Expected Result**: Shows an icon, a bilingual message (e.g., "No activity yet" / "এখনও কোনো অগ্রগতি নেই"), and a CTA button to start a lesson.
- **Search Empty**: Open `search.html` and type a nonsense word like "xyz123".
  - **Expected Result**: Shows an icon, a bilingual "No results found" message, and a CTA to clear search or browse lessons.
- **Flashcards Empty**: Clear `nihongo_srs_cards` or wait until no cards are due. Open `flashcards.html`.
  - **Expected Result**: Shows an icon, a bilingual "Nothing due" message, and a CTA to review lesson vocabulary or change settings.
- **Bookmarks Empty**: Clear `nihongo_bookmarks`. Open `lesson.html` and check the bookmarks tab.
  - **Expected Result**: Shows an icon, a bilingual "No bookmarks yet" message, and a CTA to bookmark a lesson.
