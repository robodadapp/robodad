# Play Console: Data safety answers (draft, matches /privacy as of v1.35)

You are the one who attests to these in Play Console, so read each line against the live app before submitting.
Play's rule of thumb: data that leaves the device is "collected" unless it is processed only in memory and in real time. Data sent to another company is "shared" unless that company acts only as your service provider. When unsure, declare it. An over-declared form is safe. An under-declared one can get the app pulled.

## Top-level questions
| Question | Answer |
|---|---|
| Does the app collect or share any required user data types? | Yes |
| Is all user data encrypted in transit? | Yes (HTTPS only) |
| Do you provide a way for users to request data deletion? | Yes: email dad@robodad.app (see /privacy, "Deleting your data"). Most data is only on the device and is cleared by clearing app data. |
| Account creation | None. The app has no accounts. |
| Independent security review | No |
| Families / under-13 | Not applicable. Audience is 13+. |

## Data types to declare
| Play category / type | Collected | Shared | Purpose | Optional? | Why |
|---|---|---|---|---|---|
| Messages > Other in-app messages | Yes | Yes (Groq, AI provider) | App functionality | No (it is the core feature) | Chat text goes through your server to Groq to write a reply. Not stored by RoboDad. Declaring it is the cautious choice; if you argue Groq is purely your service provider, "shared" can be No. |
| App activity > Other user-generated content | Yes | No | App functionality, analytics | Yes | Thumbs up/down and reports store RoboDad's reply (never what the teen typed) in Supabase. |
| App activity > App interactions | Yes | No | Analytics | No | Anonymous event counts (welcome steps, return visits, tab taps). Fixed event names only, no ID. |
| Device or other IDs | No | No | | | No advertising ID, no device ID, no cookie. |
| Location, contacts, photos, files, health, financial | No | No | | | Not collected. |
| Audio | No | No | | | Mic use is the device's speech recognition. RoboDad only receives text. Re-check this if the Android WebView sends audio to Google's service; if it does, declare Audio > Voice or sound recordings as collected, not stored, for app functionality, optional. |
| Personal info (name, email) | No | No | | | Teens are never asked. The tester sign-up page collects Gmail from adults only, and it is on the website, not in the app. If the app links to it, declare Email address as collected, optional. |

## Security practices block
- Data encrypted in transit: Yes
- Users can request deletion: Yes

## Things to double-check before you submit
1. IP addresses: Render and Cloudflare see them in server logs for security. Play treats IP address as personal data only if you use it beyond normal serving; /privacy says short-term, security only. Mention in the form's optional notes if Play offers it.
2. Google Fonts loads in the app, so Google receives the device's IP. If you want a clean "no third-party SDKs touch user data" story, self-host the Nunito font. I can do that next.
3. Content rating: answer yes to "users can interact / AI-generated content," and say it gives advice to teens. Do not answer as a mental-health or therapy app.
4. Target audience: 13-15 and 16-17 and 18+ only. Do not tick any under-13 band.
5. Keep this file in sync: if you add an event name in `EVENTS` in `app/main.py` that changes what is collected, update this file and /privacy.
