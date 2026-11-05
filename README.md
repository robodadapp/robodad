---
title: RoboDad
emoji: 🤖
colorFrom: blue
colorTo: yellow
sdk: docker
app_port: 7860
pinned: false
---

# RoboDad: from intent classifier to a hosted LLM chatbot

**Live: https://robodad.app** · for parents: https://robodad.ca · Learn with Dad: https://robodad.online

(Free hosting: the first visit after a quiet spell can take up to a minute to wake up. The old robodad.onrender.com address forwards to robodad.app.)

## Why RoboDad exists

I lost my dad before I became a teenager, and life was never the same again.

The years that followed were full of questions, the kind a kid would normally
take to his dad. I figured most of them out eventually, on my own and often the
hard way. But the answers always came later. When I needed them most, there was
no one to ask.

RoboDad is the dad I wish I could have asked. He's patient, a bit corny, and
always there for **teenagers (13+)** who need a straight answer, some
encouragement, or just someone to think out loud with. He doesn't replace a
parent or a trusted adult, and when something serious comes up, he points you
to real people and real help.

## How it works

RoboDad began as a terminal chatbot: TF-IDF + Logistic Regression intent
classification, VADER sentiment, regex NER and canned responses. This version
turns it into a web app that talks like a real LLM while keeping that NLP
pipeline in charge of grounding and safety.

## What changed

| | Original version | Web version |
|---|---|---|
| Interface | Terminal `input()` loop | Web chat page, works on phone and desktop |
| Replies | Random pick from the intent's canned list | Streamed, word-by-word replies from an LLM (Claude, Groq or any OpenAI-compatible model) |
| Intent classifier | 57.8% accuracy; confident on only 29% of messages | 68.7% accuracy; confident on 79% of messages at the same reliability (see below) |
| Voice | None | Talk with the mic button. RoboDad reads replies aloud in his own male voice: Joe King (default, Groq's Troy), Ray Dio (Troy slowed slightly for a deeper sound), Al Gorithm (Groq's Austin) or Sir Kit Breaker (Austin, deeper), from Groq Orpheus, the same on every device, and falls back to the device's best male voice if the online voice is unavailable |
| Phone | None | Installs as a home-screen app and opens instantly |
| Feedback | None | Thumbs up/down and "Report" on every reply, saved to a free database |
| Look and feel | Terminal text | Eight looks the user picks, including **Skate Park '99**, **Block Party '03** and **Game Night '05**, plus: **Classic**, **Arcade Neon**, **VHS Sunset**, **Y2K Gloss** (glossy bubbles, "Dialing up at 56k…") and **Diner '55** (chrome header, checkerboard trim, neon-script headline, starburst, a tail-finned cruiser, shake, burger and fries, and a spinning 45 while RoboDad thinks). RoboDad has slicked-back 80s hair, aviators and a leather jacket over a white shirt; a cassette spins while he thinks; "blowing on the cartridge" while the free server wakes up |
| Music | None | **RoboDad Radio**: seven stations (Lobby Lounge, Canon in D, Midnight Drive, and originals in period styles: doo-wop Jukebox '55, pop-punk Half-Pipe '99, boom-bap Block Party '03 and game-lobby electronica Respawn Lounge; the matching one starts when you pick a look) synthesised live in the browser with the Web Audio API: no recordings, no licences, works offline. Music dips while RoboDad reads a reply aloud |
| Music button | None | Each look has its own animated player in the top bar that turns the music on and off: a smart speaker (Classic), a spinning CD (Arcade Neon), a cassette player (VHS Sunset), a generic MP3 player with a scrolling screen (Y2K Gloss) and a jukebox with bubbling light tubes (Diner '55). They only animate while music plays |
| Dashboard | None | Beside the chat on wide screens, a sheet on phones: Radio, Focus timer (25/5), Countdown, Dad joke and Tip of the day (`/api/daily`, from the dataset), belt progress, and a help card with tap-to-call numbers |
| Real-life skills | None | **Badge collection**: 12 collectible life-skill badges in four rarities (Common coins, Rare shields, Epic hexagons, a Legendary starburst) plus 5 secret bonus badges for completing sets. Tapping a badge shows its mission; unlocking one (honour system) plays a reveal with rays, confetti and a chime, and any badge can be shared as a 1080×1350 image. The championship belt shows progress. Stored only on the device, no streaks. **Dad's Mixtape**: a classic-rock track suggestion when someone's having a rough time (titles only). **Ask your real one**: a question to take to a parent, tied to the topic |
| Avatars | One robot dad | Eight decade avatars that follow the look (or pick one in the menu): Modern Dad (polo), Arcade Dad (80s), Video Store Dad (90s), Trucker Hat Dad (2000s), Skater Dad (late '90s), Bucket Hat Dad (early 2000s), Gamer Dad (mid-2000s) and Diner Dad (50s). Each has three idle moves (collar pop, shades shine, comb; wave, wink, coffee; head-bob, shades drop, 1UP; cap flip, pager buzz, wink; cap tip, earbud bop, peace sign; beanie pull, ollie, fist bump; "GG!", button-mash, victory fist; hat tip, "#1 DAD", cool nod), played every 5 minutes or when tapped. Drawn in `static/avatars.js` |
| Little touches | None | RoboDad nods when you send a message or earn a plate; new belt plates get a gold shine; a gold ring around his avatar counts down the focus timer (green on breaks) |
| Quick controls | None | A **speech bubble** (voice) and a **thought bubble** (music) beside the header avatar. One tap toggles; a caption shows the current voice or station with a **Change** button that opens the list. The thought bubble shows the look's animated player while music plays; the speech bubble bounces while RoboDad reads aloud and shows a word during some idle moves |
| Changelog | None | A "What's new" page at `/changelog` (linked in Settings and under the chat) listing every release from the original version to now |
| Play Store testers | None | **Help test RoboDad** page at `/testers` with a QR code (`static/testers-qr.png`): adults sign up with their Android Gmail, a live "x of 12" meter counts sign-ups, and emails are stored in a private Supabase `testers` table (duplicates ignored, spam honeypot) |
| Audience | Kids, terminal only | Teens 13+: teen persona, teen topics (first jobs, life after high school, healthy relationships, peer pressure, budgeting, driving), neutral birth-year age check, optional nickname, privacy page |
| Memory | None, every message stands alone | Remembers the last 16 messages of the conversation |
| Out-of-scope questions ("help me cook pasta") | Fallback: "I didn't quite catch that" | Real answer, in RoboDad's voice |
| Use of the dataset | Training data + response bank | Also a retrieval index: the 4 most similar examples are fed to the LLM as style and content guidance (retrieval-augmented generation) |
| NLP analysis | Printed to the console | Shown under each reply in "How RoboDad read this" |
| Safety | Confidence threshold only | **Dad Mode**: trick, troll, jailbreak and "what happens if" questions get a playful dad answer instead of a bare refusal (a backstop rewrites any bare refusal and strips stock "I'm sorry, but I can't help with that" openers; test set in `scripts/test_dad_mode.py`). Crisis guardrail that bypasses the LLM with situation-specific help (self-harm, sextortion, eating struggles, dating violence, abuse at home) and tap-to-call links; persona rules (no diet plans, no drug how-tos, nothing sexual); input limits; per-visitor rate limit; daily LLM budget; API keys redacted from logs |
| Reliability | Needed the exact scikit-learn version that made the `.joblib` files | Model trained during the build, so it always matches; switches AI model automatically if one is retired; falls back to the classic classifier if the LLM is down or no key is set; shows "waking up" while the free server starts |
| Data | Windows-1252 file read as Latin-1, so apostrophes turned into junk ("Im") | Cleaned to UTF-8, 61 duplicate rows removed (1,042 → 981) |

## How a message flows

```
 user message
     │
     ▼
 safety check ──── danger signs? ──► fixed help message for that situation
     │                                (Kids Help Phone, 988, NeedHelpNow, Cybertip, NEDIC, 911); no LLM
     │
     ▼
 NLP pipeline (app/nlp.py)
   • normalise text
   • intent + confidence      (TF-IDF words + character n-grams, Logistic Regression)
   • sentiment                (VADER)
   • entities                 (regex NER: names, dates, times, money, numbers)
   • 4 most similar examples  (TF-IDF cosine retrieval over the dataset)
     │
     ▼
 system prompt = RoboDad persona + rules + the signals above + retrieved examples
     │
     ▼
 LLM (streams tokens) ──── model retired? ──► try backup / discover a current model, retry
     │               └──── other error / no key / daily budget used up ──► classic classifier reply
     │
     ▼
 browser renders the reply live, plus the "How RoboDad read this" panel
```

## Improving the intent classifier

### Teen version (current)

The original 981 examples plus 125 new teen examples (`data/teen_intents.csv`),
with snacks and breakfast merged into food, and lightbulbs into home basics:
**1,106 examples, 34 intents**.

| Set-up | Accuracy | Confident† | Right when confident |
|---|---|---|---|
| 1. Original model | 51.0% | 11.7% | 88.9% |
| 4. Production model | **65.8%** | 75.1% | 75.7% |

†Above the 0.40 fallback threshold. Majority-class baseline: 7.9%.
Every new teen topic is recognised with 0.81–0.90 confidence on unseen test
phrases ("how do i ask my crush out", "my friends keep pushing me to vape").

### Original data only (32 intents)

These are the results before the teen topics were added, tested only on the
original 981 RoboDad examples with 5-fold cross-validation
(`python scripts/evaluate.py` now runs the teen version).

| Set-up | Accuracy | Confident* | Right when confident |
|---|---|---|---|
| 1. Original model (stop words removed, word 1–2-grams) | 57.8% | 29.3% | 79.1% |
| 2. Keep stop words, less regularisation (C=10) | 60.9% | 87.8% | 66.1% |
| 3. Add character 2–5-grams (handles typos and slang) | 63.6% | 92.7% | 67.2% |
| 4. #3 + 480 extra training examples | **68.7%** | 95.8% | 70.2% |

\*Above the 0.20 fallback threshold. Majority-class baseline: 4.7%.

The production model is set-up 4 with the fallback threshold raised to
**0.40**, chosen from the same cross-validation: it is confident on **79%** of
messages and right **77%** of the time when it is, about the same reliability as
the original model but on 2.7× as many messages.

How the extra examples were made fair: they are in
`data/augmented_utterances.csv`, were written from the intent *names* (not by
rewording the existing examples), are only ever added to the training folds,
and any that exactly match an original example (67 of 480) are dropped first.

Messages from the original testing transcript:

| Message | Original model | Now |
|---|---|---|
| "help me cook pasta" | fallback (0.16) | cooking (0.89) |
| "yo" | fallback (0.07) | greeting (0.88) |

Even at 69% the classifier is a signal, not an answer, which is why the LLM
writes the replies and the classifier grounds them.

## Project layout

```
app/
  main.py      web server: chat streaming, rate limits, fallbacks
  nlp.py       the original NLP pipeline: classifier, retrieval, sentiment, NER
  llm.py       RoboDad persona prompt + Claude / Groq / OpenAI-compatible streaming
  safety.py    crisis detection (English, French, Hindi): situation-specific help messages
static/
  index.html   the chat page (no build step): voice, feedback, report, age check, nickname, Practice with Dad
  lessons.js   hand-written French and Hindi lessons and role-play scenes
  privacy.html privacy policy (served at /privacy)
  sw.js, manifest.webmanifest, icon-*.png   phone-app (PWA) files
  favicon.svg
data/
  robodad_intents.csv       cleaned dataset (UTF-8)
  teen_intents.csv          125 teen-topic examples with RoboDad replies
  augmented_utterances.csv  480 extra training-only examples
scripts/
  evaluate.py      compares classifier set-ups with cross-validation
  test_safety.py   99 checks: messages that must / must not trigger help
  test_dad_mode.py trick questions (EN, FR, HI) against a running RoboDad
Dockerfile, requirements.txt, .env.example
```

---

## Put it on the internet (free): Render

Render runs the Dockerfile on its free plan: no credit card, and a public link
like `https://robodad.onrender.com`. Free services sleep after 15 minutes
without visitors; the first visit after that takes up to a minute to wake up.

### 1. Get a free LLM key from Groq

1. Go to **console.groq.com** and sign in with Google or GitHub.
2. Open **API Keys** → **Create API Key**, name it `robodad`, and copy the key
   (it starts with `gsk_`). It's only shown once.

Prefer Claude? Create a key in the Claude Console at **console.anthropic.com**
and use `ANTHROPIC_API_KEY` instead of `GROQ_API_KEY` below. RoboDad uses
`claude-haiku-5-5`, the fastest and cheapest Claude model.

### 2. Deploy on Render

1. Go to **render.com** → **Get Started** → **GitHub** to sign up with your GitHub account.
2. In the dashboard: **New** → **Web Service** → **GitHub**, and allow Render
   to access the `robodad` repository.
3. Pick the `robodad` repository → **Connect**.
4. Name: `robodad`. Language: **Docker**. Branch: `main`. Region: **Ohio (US East)**.
   Instance type: **Free**.
5. Under **Environment Variables** add `GROQ_API_KEY` with your key.
6. Click **Deploy Web Service**. The first build takes about 3–5 minutes.
7. When the log says "Your service is live", open the link at the top of the page.
   The header should read "Online · Groq · openai/gpt-oss-120b".
   "Classic mode" means the key is missing or misspelled
   (fix it under **Environment**, then **Manual Deploy** → **Deploy latest commit**).

Every time you push a change to GitHub, Render redeploys automatically.

### 3. Optional: save thumbs up/down to a free database

Without this step, ratings still work and appear in Render's **Logs** as
`FEEDBACK up …` / `FEEDBACK down …` lines, but logs don't keep them long.

1. Sign up at **supabase.com** (free) and create a project called `robodad`.
2. Open **SQL Editor**, paste this and click **Run**:

   ```sql
   create table public.feedback (
     id uuid primary key default gen_random_uuid(),
     created_at timestamptz not null default now(),
     rating smallint not null check (rating in (-1, 1)),
     intent text,
     confidence real,
     mode text,
     model text,
     reply text,
     kind text not null default 'rating',   -- 'rating' or 'report'
     reason text                            -- report reason
   );
   alter table public.feedback enable row level security;
   grant select, insert on public.feedback to service_role;
   ```

3. In **Project Settings → API Keys**, copy the **secret** key (starts with `sb_secret_`),
   and from the **Connect** dialog copy the project URL (`https://xxxx.supabase.co`).
4. In Render → **Environment**, add `SUPABASE_URL` and `SUPABASE_KEY` with those values.
5. Ratings now appear in Supabase under **Table Editor → feedback**.

Only the rating or report reason, the detected intent, the model and RoboDad's
reply are saved, never what the user typed. Reported replies also appear in
Render's logs as `REPORTED REPLY` warnings. Free Supabase projects pause after a week without
activity; open the dashboard and click **Restore** to wake one up.

### Install on a phone

- **Android (Chrome):** open the site → menu (⋮) → **Add to Home screen** / **Install app**.
- **iPhone (Safari):** open the site → **Share** → **Add to Home Screen**.
- **Desktop (Chrome/Edge):** click **Install app** in RoboDad's header.

The installed app opens instantly, even while the server is waking up.

### Why not Hugging Face Spaces?

The `README.md` header still works for Hugging Face Docker Spaces, but since
October 2026 those need a PRO subscription on the free CPU tier.

---

## Run it on your own computer

```bash
cd robodad
python -m venv .venv
# Windows: .venv\Scripts\activate     macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
copy .env.example .env      # macOS/Linux: cp .env.example .env
# open .env and paste your key after GROQ_API_KEY=
uvicorn app.main:app --reload --port 7860
```

Then open http://localhost:7860. With no key in `.env`, it runs in classic mode.

In PyCharm: open the `robodad` folder, create a virtualenv interpreter,
install `requirements.txt`, and add a Run configuration with module `uvicorn`
and parameters `app.main:app --reload --port 7860`.

## Settings

All settings are environment variables (Render environment or `.env` locally).

| Variable | Default | What it does |
|---|---|---|
| `GROQ_API_KEY` | none | Use Groq. Model set by `GROQ_MODEL` (default `openai/gpt-oss-120b`), backups by `GROQ_BACKUP_MODELS` (default `openai/gpt-oss-20b`) |
| `ANTHROPIC_API_KEY` | none | Use Claude. Model set by `ANTHROPIC_MODEL` (default `claude-haiku-5-5`) |
| `OPENAI_API_KEY` | none | Any OpenAI-compatible API, with `OPENAI_BASE_URL` and `OPENAI_MODEL` |
| `LLM_PROVIDER` | `auto` | Force `anthropic`, `groq`, `openai`, or `none` (classic only) |
| `RATE_LIMIT` | `30/600` | Messages allowed per visitor per time window (seconds) |
| `DAILY_LLM_LIMIT` | `1500` | LLM calls per day before switching to classic mode; caps your bill |
| `LLM_MAX_TOKENS` | `400` | Maximum reply length |
| `LLM_TEMPERATURE` | `0.7` | Higher is more playful, lower is more consistent |
| `SUPABASE_URL`, `SUPABASE_KEY` | none | Save thumbs up/down and reports to Supabase (otherwise they go to the log) |
| `ANDROID_PACKAGE`, `ANDROID_SHA256` | none | For the Google Play app: serves `/.well-known/assetlinks.json` so the app opens without a browser bar |

If several keys are set, Claude is used first, then Groq, then OpenAI-compatible.
If the provider says a model has been retired, RoboDad tries the backup list,
then asks the provider for its current models and picks a chat model.

## Safety notes

- Messages that suggest danger never reach the LLM. RoboDad replies with a fixed
  message for the situation, with tap-to-call numbers and links:
  - self-harm or suicide: Kids Help Phone (1-800-668-6868, text CONNECT to 686868), 988, 911
  - sextortion: don't pay, keep evidence, tell an adult; NeedHelpNow.ca, Cybertip.ca (US: TakeItDown.ncmec.org)
  - eating struggles: NEDIC (1-866-633-4220), Kids Help Phone
  - dating violence or abuse at home: 911, Kids Help Phone, a trusted adult
  These are Canada/US services; edit `app/safety.py` for other countries.
  The keyword rules cover English, French, Hindi in Devanagari and romanized Hindi (Hinglish);
  accents, nukta dots and chandrabindu are normalised away before matching.
  For anything they miss, in any language, the persona tells the model to answer with only a
  token such as `[[CRISIS:self_harm]]`; the server spots it in the held-back first part of the
  reply and swaps in the same fixed help message (`mode: safety`).
  `python scripts/test_safety.py` checks 99 messages (English, French, Hindi) that must or must not trigger help.
- The persona prompt in `app/llm.py` is written for teens: respectful, no
  lecturing, nothing sexual, no diet plans or weight targets, no drug or vaping
  how-tos, and it steers medical, legal and dangerous topics to trusted adults.
- **Dad Mode** (in `app/llm.py`): for odd, tricky or boundary-pushing messages RoboDad never sends a
  bare "Sorry, I can't help with that". He asks what they mean when a message is confusing, plays along
  with harmless trolling, and for anything harmful gives a short boundary, one honest reason and a
  helpful redirect. The server holds back the first ~150 characters of each reply; if the model still
  produces a stock refusal, it is rewritten in Dad Mode before anyone sees it.
  `python scripts/test_dad_mode.py` runs 34 trick questions against the live site, including French
  and Hindi versions, crises only the AI flag can catch (French, Hindi, Spanish) and Practice-mode role-plays.
- A neutral age check asks for the birth year on first visit and stores only
  pass/fail on the device. Under-13s see a message instead of the chat.
- Conversations aren't stored on the server. Each browser tab keeps its own
  chat until it's closed. Feedback stores ratings and RoboDad's replies only.
- Voice input uses the browser's own speech recognition (Chrome and Edge send
  the audio to their speech service); nothing is recorded by RoboDad.
- Keyword guardrails can miss things. Anyone running RoboDad publicly for real
  teens should add a moderation API and human review.

## Collecting Play Store testers

Google needs 12 testers for 14 days before a new personal developer account can publish. Share `https://robodad.app/testers` (or print `static/testers-qr.png`). Sign-ups land in Supabase:

```sql
create table if not exists testers (
  id bigint generated always as identity primary key,
  created_at timestamptz default now(),
  email text unique not null,
  first_name text
);
alter table testers enable row level security;
```

When testing opens, copy the emails from **Table Editor → testers** into Play Console → Testing → Closed testing → Testers (email list). Delete the rows when testing is finished, as the privacy page promises.

## Voice limits (free tier)

Groq's free tier allows about 3,600 characters of speech a day for the Orpheus voices (roughly 15 to 25 spoken replies, shared by everyone). After that the server pauses the online voice until Groq's allowance resets, and the page reads whole replies with the phone's own voice instead, never switching mid-reply. Pay-as-you-go pricing is $22 per million characters if more is ever needed.

## Seasonal look, challenges and extras (v1.16)

- **Haunted House** (Halloween): turns on by itself once a season (Oct 15 to Nov 2), remembering the previous look and restoring it afterwards. Count Dadcula avatar (cape, bat, "Bleh!"), jack-o'-lantern player, original "Haunted Hayride" station. Preview any time with `/?season=halloween`; `/?season=off` hides it.
- **Daily Dad Challenge**: 40 small real-world tasks, one per day (same for everyone), on the welcome screen and dashboard. Honour system, no streaks; 7 done unlocks the secret "Challenge Accepted" badge. Stored only on the device.
- **Dad-joke cards**: "Share joke" on joke replies and "Share it" on the joke of the day make a 1080×1350 picture.
- **Easter egg**: tap RoboDad 5 times quickly, or say "back in my day", to unlock Robo-Grandpa.
- **For parents** page at `/parents`.
- **Keep-awake**: `.github/workflows/keep-awake.yml` pings `/health` every 10 minutes (free on public repos; GitHub pauses scheduled jobs after 60 days without commits).

## Bollywood '75 and Diwali Lights (v1.17)

- **Bollywood '75** (permanent look): 1970s hand-painted poster style, Filmi Hero Dad (wind-machine hair flip, shoulder shimmy, "Dhishoom!" punch), film-reel player and the original **Filmi Nights '75** station (dholak-style drums, harmonium, sitar-like melody, strings). No real films, actors, dialogue or songs are referenced.
- **Diwali Lights** (seasonal, Nov 5 to 12; Diwali 2026 is Nov 8, so update `SEASONS` each year): lights, rangoli, diyas, Festive Dad (diya, sparkler, namaste "Happy Diwali!"), diya player and the original **Diya Glow** station. Preview with `/?season=diwali`.
- Seasons are listed in `SEASONS` in `static/index.html`; each switches on once per year, remembers the previous look and restores it afterwards.

## Holiday looks and spinning centrepieces (v1.18)

| Look | Dates | Dad and moves | Station | Player |
|---|---|---|---|---|
| Halloween | Oct 15 to Nov 2 (every year) | Count Dadcula: cape, bat, "Bleh!" | Haunted Hayride | jack-o'-lantern |
| Diwali Lights | 2026-11-05 to 11-12 | Festive Dad: diya, sparkler, namaste | Diya Glow | diya |
| Winter Holidays | Dec 15 to Jan 2 (every year) | Cozy Dad: cocoa, snowball, pompom | Snow Day | snow globe |
| Lunar New Year | 2027-02-02 to 02-14 | Lucky Dad: lantern, red envelope, firecrackers | Lantern Festival | lantern |
| Eid | 2027-03-07 to 03-13 and 2027-05-14 to 05-19 | Eid Dad: "Eid Mubarak!" wave, lantern, sweets | Crescent Night | lantern |

Diwali, Lunar New Year and Eid move every year: update their `YYYY-MM-DD` ranges in `SEASONS` (`static/index.html`). Each holiday switches on once per run (remembering the previous look) and restores it afterwards. Preview any of them with `/?season=<name>`.

Every look also has a slowly rotating centrepiece (`.spinner`), drawn as an inline SVG per look; it stops for anyone using reduced motion.

## Practice with Dad: French and Hindi (v1.19)

- **Lessons** (`static/lessons.js`): 8 per language, 5 phrases each, written by hand so they can be
  checked by a fluent speaker. Hindi has Devanagari, Roman letters and English. The speaker button
  uses the device's own `fr-CA` / `hi-IN` voice (free; some phones need the voice installed).
- **Quiz**: 5 questions per lesson, built from that lesson. 3 or more correct marks it done.
- **Role-plays**: the browser sends `practice: {lang, scenario}` with each message. Scenario text
  lives on the server (`PRACTICE_LANGS` in `app/llm.py`), so it can't be swapped from the browser.
  RoboDad opens the scene; the server keeps that opening line behind a stand-in user turn.
  The normal chat is set aside (per tab) and comes back on **Exit practice**.
- **Badges**: 9 practice-milestone badges (lessons done, a 4-message role-play, both courses).
  They unlock automatically, are stored only on the device, and are not a fluency certificate.
  No language is locked behind another.
- **Safety**: every rule applies in practice mode; crisis keywords exist in French and Hindi, and
  the AI crisis flag covers other languages. Marathi is planned once a fluent speaker can review it.

## Security

See [SECURITY.md](SECURITY.md) for how to report a problem. In short:
- Keys live only in Render's environment settings; nothing secret is in this repo or sent to the browser.
- Rate limits use Cloudflare's `CF-Connecting-IP` (Render sits behind Cloudflare), so they can't be dodged with a fake `X-Forwarded-For`.
- Request bodies over 64 KB are refused; chat messages are capped at 4,000 characters.
- Every page gets a strict Content-Security-Policy (inline scripts allowed only by hash), `frame-ancestors 'none'`, HSTS, `nosniff` and a locked-down Permissions-Policy.
- FastAPI's `/docs`, `/redoc` and `/openapi.json` are switched off.
- `.github/workflows/security.yml` runs pip-audit, gitleaks and the safety tests on every push and weekly; Dependabot proposes dependency updates.

## Licence and trademarks

The code is published so people can see how RoboDad works, not for reuse: see [LICENSE](LICENSE).
"RoboDad"™, the logo, the avatar characters and the app icons are trademarks of Saikat Sunil Ganguly.



## Domains and link counts

One free Render service answers for all three addresses (see `route_domains` in `app/main.py`):

| Address | What it shows |
|---|---|
| robodad.app | The app (main address). Render custom domain. |
| robodad.ca | The parents page. Anything else on .ca goes to robodad.app. Render custom domain. |
| robodad.online | Porkbun URL forwarding (with path) to robodad.app/learn, the Learn with Dad hub. |

Setting `CANONICAL_HOST=robodad.app` sends visitors on robodad.onrender.com to robodad.app (health checks and the API stay put).

Short links for bios and posts count visits by platform: `robodad.app/go/ig`, `/go/tiktok`, `/go/yt`, `/go/threads`, `/go/x`, `/go/reddit`, `/go/fb`, `/go/linkedin`, `/go/qr`, or `robodad.online/ig` and so on for the learning hub. Each visit stores only the platform name in the Supabase `clicks` table: no cookies, no IP addresses. "I want this" votes on the learning hub go to the same table.

```sql
create table if not exists public.clicks (id bigint generated always as identity primary key,
  created_at timestamptz not null default now(), kind text not null, name text not null);
alter table public.clicks enable row level security;
```
