# Sani AI

Turn questions into notebook-ready answers. Type, photograph or speak a question, get a textbook-style answer, then write it onto a realistic notebook page in handwriting inspired by your own. Download PNG / JPG / PDF. Free to use: there is no credit system.

## How it works

| Step | What happens |
| --- | --- |
| Question | Text, photo (cropped/rotated first), camera, or voice. Photos are read by a vision model; multiple questions can be picked. |
| Answer | `/api/answer` streams a textbook/exam-style answer from your configured LLM (xAI/Grok or Groq, any OpenAI-compatible API). |
| Edit | Edit the text freely. The notebook uses exactly the text you approve. |
| Handwriting | Upload a handwriting photo. A vision model returns a style profile (slant, size, thickness, spacing, messiness) that you can tweak with sliders. |
| Notebook | A built-in renderer draws realistic paper and writes the **exact** text with natural handwriting variation, then paginates it. A word-by-word fidelity check guards the text. |
| Export | PNG, JPG, multi-page PDF, share, save to My Notebook. |

**Honest note on handwriting:** the page is *inspired by* your sample. It uses open-licence handwriting fonts with per-letter variation, tuned by the style profile. It is not a clone of your hand.

**Why not an AI image model?** Generative image models cannot be trusted to render long text exactly. External image generation is deliberately not wired in (`IMAGE_PROVIDER=programmatic`). `lib/image/generate.ts` explains how to add one safely (OCR-verify and fall back).

## Requirements

Node.js 20+ (22 recommended), an API key for xAI or Groq (text and vision models), optionally a speech-to-text key.

## Setup

```bash
npm install
npm run fonts          # downloads handwriting fonts into public/fonts (needs internet)
cp .env.example .env.local   # then edit .env.local
npm run dev            # http://localhost:3000
```

Production: `npm run build && npm run start`. Tests: `npm test`.

## Environment variables (server-side only)

| Variable | Purpose |
| --- | --- |
| `LLM_PROVIDER` | `xai` or `groq` (sets the base URL). Keys starting `xai-` are xAI, keys starting `gsk_` are Groq. |
| `LLM_API_KEY` | Your key. Never prefix with `NEXT_PUBLIC_`. |
| `LLM_MODEL` | Text model id from your provider's model list. |
| `LLM_VISION_MODEL` | A vision-capable model id (used for photo questions and handwriting analysis). |
| `LLM_BASE_URL` | Optional override for any OpenAI-compatible endpoint. |
| `SPEECH_API_KEY`, `SPEECH_MODEL`, `SPEECH_BASE_URL` | Optional server speech-to-text (OpenAI-compatible `/audio/transcriptions`, e.g. Groq Whisper). Browsers with built-in speech recognition work without it. |
| `IMAGE_PROVIDER` | `programmatic` (built in). |
| `NEXT_PUBLIC_APP_NAME` | Branding. Default `Sani AI`. |

Model names change over time. Look up the current ones in your provider's console and put them in `.env.local`; none are hard-coded. If a key or model is missing, the app shows a clear setup message instead of fake output. Notebook rendering, history, saved pages and PDF export work without any AI key.

## Languages

English and Hinglish need a `latin-*` font. Hindi needs a `devanagari-*` font (Kalam is downloaded by `npm run fonts`). Punjabi needs a `gurmukhi-*` font (Mukta Mahee is downloaded; it is readable but less handwriting-like, so add a better one if you have it). If a font is missing the app says so rather than rendering badly. Voice and answer quality in each language depend on your AI/speech provider.

## Security

- API keys are read only in server route handlers and never reach the browser. `.env.local` is git-ignored.
- **If a key was ever pasted into a chat, screenshot or repo, revoke it and create a new one.**
- All inputs are validated with zod on the server. Images are checked by decoding and magic bytes, not just MIME type, with size limits.
- Per-IP rate limiting (in-memory; replace `lib/security/rateLimit.ts` with Redis/Upstash for multi-instance deployments).
- Text inside photos is treated as data, not instructions.
- Security headers are set in `next.config.ts`.

## Privacy

Chats, saved pages and the handwriting sample live in the browser's IndexedDB only. Questions, photos and handwriting samples you submit are sent to your configured AI provider. Users can delete the handwriting sample, clear generated pages and clear history in Settings.

## Deploy

Works on any Node host (Docker, Railway, Render, VPS). For Vercel, set the environment variables in the project settings; `public/fonts` is included in the notebook function bundle by `next.config.ts`. `@napi-rs/canvas` ships prebuilt binaries for common Linux/macOS/Windows targets.

## Project layout

`app/api/*` route handlers, `components/*` UI, `lib/ai` provider abstraction (`AIProvider`, `ImageProvider`, `SpeechProvider`), `lib/notebook` normalize/layout/render, `lib/security` validation and rate limiting, `lib/client` browser helpers, `tests/` unit tests.

## Known limitations

- Answers stream as plain text; the notebook uses the final text exactly.
- "Generate Diagram" is not offered, because no diagram provider is configured. Diagram questions get a "Draw a labelled diagram of…" answer with labels.
- Match-reference quality depends on the vision model's style estimate; use the sliders to fine-tune.
