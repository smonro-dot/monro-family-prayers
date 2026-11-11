# Monro Family Prayers

A dark, mobile-first prayer book for iPhone Safari and Add to Home Screen. It is a static site. It works offline after the first visit.

The intended public address, after the owner approves both the merge and GitHub Pages, is:

https://smonro-dot.github.io/monro-family-prayers/

This repository does not turn Pages on, and this branch does not deploy. Screenshots of every screen are in [docs/preview](docs/preview). They were taken locally. There is no public preview URL.

## What’s inside

- Night Prayer (Compline) for Sunday through Saturday
- Morning Offering, with the Our Father, Hail Mary, and Glory Be
- The Rosary, with the mysteries for each day
- Common prayers
- One HTML audio player per prayer, with Media Session metadata
- A service worker that stores the text, icons, and any recordings already played

Text sources are in [SOURCES.md](SOURCES.md) and on the in-app Text sources page.

## Audio filename contract

Recordings are not in this repository yet. Later recordings (including ElevenLabs) replace the files below. Keep the filename. Do not edit JavaScript, the service worker, or the page templates.

The only configuration file is [`audio/catalog.json`](audio/catalog.json). The app requests `audio/<filename>` from that list. `file` is a basename ending in `.mp3` with no folders.

| id | filename | prayer |
| --- | --- | --- |
| compline-sunday | compline-sunday.mp3 | Sunday Night Prayer |
| compline-monday | compline-monday.mp3 | Monday Night Prayer |
| compline-tuesday | compline-tuesday.mp3 | Tuesday Night Prayer |
| compline-wednesday | compline-wednesday.mp3 | Wednesday Night Prayer |
| compline-thursday | compline-thursday.mp3 | Thursday Night Prayer |
| compline-friday | compline-friday.mp3 | Friday Night Prayer |
| compline-saturday | compline-saturday.mp3 | Saturday Night Prayer |
| morning-offering | morning-offering.mp3 | Morning Offering |
| rosary | rosary.mp3 | The Rosary |
| apostles-creed | apostles-creed.mp3 | Apostles' Creed |
| our-father | our-father.mp3 | Our Father |
| hail-mary | hail-mary.mp3 | Hail Mary |
| glory-be | glory-be.mp3 | Glory Be |
| hail-holy-queen | hail-holy-queen.mp3 | Hail Holy Queen |
| act-of-contrition | act-of-contrition.mp3 | Act of Contrition |
| guardian-angel | guardian-angel.mp3 | Guardian Angel |
| saint-michael | saint-michael.mp3 | Saint Michael |
| angelus | angelus.mp3 | The Angelus |

Contract:

- Format: MPEG Layer III (`.mp3`), mono or stereo, any bitrate. One file per row.
- Put the file at `audio/<filename>`. Example: `audio/compline-sunday.mp3`.
- If the file is absent, the page says **No recording yet** and names the file. It does not show a player pointed at a missing file.
- Replacing a file and reloading once while online updates the offline copy. No cache-busting query and no code edit.
- The same file is reused wherever that prayer appears (the Our Father on Morning, Rosary, and Common is one file).

Export an ElevenLabs take as MP3 and overwrite the matching filename.

## Playback on a locked phone

Press Play after the recording has loaded. The page does not start audio by itself, and it does not pause when the document is hidden.

What this page does:

- Uses a real `<audio controls playsinline>` element, which is what iOS keeps playing after the screen locks.
- Sets `navigator.audioSession.type = "playback"` when the browser has that API (iOS Safari), so the session is media playback rather than a short sound.
- Sets Media Session title, artist (`Monro Family Prayers`), album, and icons, plus play, pause, stop, and 10-second seek where the browser allows those handlers.

What was not verified here: a physical iPhone, face-down, or the silent switch. There is no web event for face-down. Hiding the page (the signal a lock sends) does not pause playback in this app. iOS can still stop audio if it jetsams the process, if a phone call interrupts, or if an older iOS version limits background audio in a Safari tab. An installed Home Screen icon is the more reliable place. Lock-screen artwork depends on the iOS version; the audio element is the part that actually plays. Desktop Chrome used for the local test does not implement `audioSession`.

The service worker answers byte-range requests (`206`) from the stored full file, including the small `bytes=0-1` probe Safari sends. Partial responses are not cached.

## Subpath

GitHub project Pages serves this repo at `/monro-family-prayers/`, not at the domain root. `manifest.json` sets `id`, `start_url`, and `scope` to `/monro-family-prayers/`, and icon URLs use that prefix. The service worker is registered at the directory of the page, so its scope is that folder. Audio and other assets are relative to the page, not to `/`.

Do not move the files into a nested `monro-family-prayers/` folder in the repo. That would double the path.

## Local check

Loopback only. Nothing is published.

```bash
node scripts/serve-subpath.mjs
```

Then open the URL it prints. It is `http://127.0.0.1:4173/monro-family-prayers/`.

The screenshot and install check is:

```bash
node scripts/verify-pwa.mjs
```

That script needs `playwright-core` (default lookup `/tmp/pwa-tools/package.json`, override with `PLAYWRIGHT_PACKAGE`) and system Chrome. It writes `docs/preview/*.png` and `docs/preview/verify-log.txt`. It binds `127.0.0.1` only. A short test tone is created for the playing-state screenshot and deleted afterward. It is not speech and it is not committed.

## GitHub Pages, after approval

Do not enable this until you intend the site to be public.

1. Merge the pull request into `main` yourself.
2. One-time setting: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. The workflow [`.github/workflows/pages.yml`](.github/workflows/pages.yml) runs on pushes to `main`. It does not enable Pages (`enablement: false`). It needs no secrets. Permissions are `contents: read`, `pages: write`, and `id-token: write`.
4. A previous run failed with `Get Pages site failed` because that setting was off. After step 2, the next push to `main` (or a manual run of “Deploy to GitHub Pages”) publishes the site.
5. Live URL: https://smonro-dot.github.io/monro-family-prayers/

The Pages artifact is the app only (`index.html`, `sources.html`, manifest, service worker, `css`, `js`, `icons`, `audio`, `.nojekyll`). Preview screenshots are not uploaded.

Vercel is not the target. A Vercel login wall would block install and the service worker, and the manifest scope is the GitHub Pages path above.

## Privacy

No analytics, no third-party fonts, no accounts, and no personal names beyond the app title. The recording catalog does not contain a speaker’s name.
