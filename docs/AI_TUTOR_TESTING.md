# AI Tutor Testing Report & Checklist

## 1. Functional Tests
- [ ] **Widget Toggle**: Clicking the floating button opens/closes the chat window smoothly.
- [ ] **Level Selector**: Changing between N5, N4, N3 updates the UI and persists via `localStorage`.
- [ ] **Message Sending**: Typing a message and pressing Enter/Send disables the input, shows a loading spinner, and renders the response.
- [ ] **Correction/Suggestion Cards**: When the AI returns structured feedback, it renders in distinct, styled cards (yellow for correction, blue for suggestion).
- [ ] **Voice Input (STT)**: Clicking the mic button requests microphone permission, shows a pulsing red indicator, and populates the input field with Japanese text.
- [ ] **Voice Output (TTS)**: Clicking the "Auto-Speak" toggle (speaker icon) enables automatic Japanese speech synthesis for AI replies. The replay button on each message works.
- [ ] **History Restoration**: Clicking the history icon fetches past sessions. Clicking a session restores the chat UI with historical messages and corrections.

## 2. Security & RLS Tests
- [ ] **Unauthenticated Access**: Attempting to send a message while logged out shows a clear "Please sign in" error and does not crash the UI.
- [ ] **RLS Isolation**: (Verified via Supabase Dashboard) A user cannot `SELECT` or `INSERT` into `chat_sessions` or `chat_messages` belonging to another `user_id`.
- [ ] **Input Validation**: Sending a message >1000 characters is rejected by the Edge Function with a 400 Bad Request.
- [ ] **No Secret Leakage**: Verified via browser DevTools > Network tab that no API keys (Groq/Gemini) are present in frontend requests or responses.

## 3. Responsive & Accessibility Tests
- [ ] **360px Viewport**: Chat window fits within the screen, input area is not obscured by the mobile keyboard, and touch targets are ≥44px.
- [ ] **390px Viewport**: Layout remains stable, no horizontal scrolling.
- [ ] **Desktop Viewport**: Widget anchors cleanly to the bottom-right without overlapping critical site navigation.
- [ ] **Keyboard Navigation**: `Tab` key cycles through the level selector, input field, and buttons. `Enter` sends the message. `Escape` closes the widget.

## 4. Regression Tests (Existing Features)
- [ ] Home page loads and renders correctly.
- [ ] Lesson pages load, and audio/quiz features remain functional.
- [ ] Flashcards SRS logic operates normally.
- [ ] Existing authentication (login/logout) flow is unaffected.
- [ ] Service Worker successfully caches the new AI Tutor assets and serves the app offline.

## 5. Known Limitations
- **Speech Recognition**: Native `SpeechRecognition` is not supported in Firefox or some older Android browsers. The UI gracefully hides the mic button and provides a tooltip in these cases.
- **Guest Mode**: Unauthenticated users can interact with the widget, but history is strictly limited to 20 messages in `localStorage` and is not synced to the cloud.
