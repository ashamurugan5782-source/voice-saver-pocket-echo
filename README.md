# Voice Seva

Voice Seva (voice seva — "voice service") is a small web app that answers
electricity bill questions for households in Tamil Nadu, India. You speak a
question in Tamil or English, the answer appears on screen as text, and it is
read back out loud.

## What it does

- **Talk instead of type** — tap the mic, ask, and stop. Speech recognition
  needs Chrome or Edge; if the browser has no mic support, the app tells you and
  you can type instead.
- **Tamil or English** — switch with the toggle at the top. Answers come back in
  the same language.
- **Answers you can hear** — every answer is shown as text and spoken aloud.
  Use "Read again" to hear it once more.
- **Type or tap an example** — a text box and a few common questions are always
  there for people who would rather not speak.
- **Bill-focused answers** — reading the bill, units and tariff slabs, due
  dates, late fees, paying online, disconnection and reconnection, meter
  problems, new connections and complaints. Off-topic questions get a polite
  redirect.

## Getting started

You need [Bun](https://bun.sh) and Node.js 22+.

```sh
bun install
bun run dev
```

Then open the URL the dev server prints (port 8080 in this sandbox).

## Environment

| Variable | Needed | What it is for |
| --- | --- | --- |
| `LOVABLE_API_KEY` | yes, server-side only | Lets the app ask the AI gateway for an answer. |

Without it the app still loads, but every question comes back with
"AI is not configured." The key is read on the server only — never put it in
browser code. In a Lovable project it lives in **Project Settings → Secrets**.

## Run with Docker

Build the image:

```sh
docker build -t voice-seva .
```

Run it, passing your AI key in:

```sh
docker run --rm -p 8080:8080 -e LOVABLE_API_KEY=your_key_here voice-seva
```

Open <http://localhost:8080>.

The image is built in three stages: dependencies are installed with Bun, the
app is built with `NITRO_PRESET=node-server` so it becomes a plain Node server
rather than an edge bundle, and only the finished build is copied into a small
Node 22 runtime image that runs as a non-root user. `HOST` and `PORT` control
where it listens (default `0.0.0.0:8080`).

## How it works

| Piece | Where |
| --- | --- |
| The page: mic button, language toggle, text box, answer card | `src/routes/index.tsx` |
| The question endpoint | `src/routes/api/answer.ts` |
| The prompt and the AI call | `src/lib/answer.server.ts` |
| Browser speech recognition | the Web Speech API, in the browser |
| Reading answers aloud | the browser's own speech synthesis (a Tamil voice depends on what the device has installed) |

## Other commands

```sh
bun run build      # production build
bun run test       # run the tests
bun run lint       # eslint
bun run format     # prettier
```

## Built with

- TanStack Start (React 19, Vite)
- Tailwind CSS v4
- Web Speech API for listening and speaking
- Lovable AI gateway for the answers

## About this project

This project is connected to [Lovable](https://lovable.dev). Describe what you
want changed and Lovable writes the code; connect it to GitHub and every change
is committed straight to your repository.
