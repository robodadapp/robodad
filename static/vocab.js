/* RoboDad Vocabulary with Dad: Sentence Glow-Up, Classy Comebacks, Word Origins and Vocab Duel.
   Everything here is hand-written and checked, so nothing is made up on the fly.
   Only Sentence Glow-Up uses the AI (as a coach, like the maths and brain teaser coaches);
   the before-and-after examples below work without it. */
(function(){

  // ---------- Sentence Glow-Up: worked examples (before, after, what changed) ----------
  const GLOWUPS = [
    { ctx: "Email to a teacher", before: "hey can u tell me what the hw is i wasnt here",
      after: "Hi Ms. Lee, I was away today. Could you let me know what the homework is? Thank you!",
      why: "A greeting with her name, full words instead of text-speak, and \"Could you\" turns a demand into a polite request." },
    { ctx: "Essay line", before: "In this book there is a lot of stuff about being brave.",
      after: "The novel explores courage in many forms.",
      why: "\"Stuff\" is vague, so name the idea: courage. \"Explores\" is a strong essay verb that does the work of five weaker words." },
    { ctx: "Message to a coach", before: "i cant come to practice tmrw",
      after: "Hi Coach, I can't make it to practice tomorrow because of a dentist appointment. I'll be back on Thursday.",
      why: "Give the reason and say when you'll be back. That's exactly what a coach needs to plan." },
    { ctx: "Asking for more time", before: "I need more time for the project.",
      after: "Would it be possible to have two more days for the project? I want to do it properly.",
      why: "A question instead of a demand, a specific ask (two days), and a reason that shows you care about the work." },
    { ctx: "Apology to a friend", before: "sorry if you got mad",
      after: "I'm sorry I forgot to save you a seat. That wasn't fair to you.",
      why: "\"Sorry if you got mad\" puts it on them. Naming what you did makes the apology real." },
    { ctx: "Disagreeing in a group", before: "that's a dumb idea",
      after: "I see it differently. What if we tried it this way?",
      why: "Push back on the idea, not the person, and offer another option so it stays a team effort." },
    { ctx: "First job application", before: "I'm good with people and stuff.",
      after: "I enjoy helping people, and I stay calm when it gets busy.",
      why: "Specific strengths beat vague claims. An employer can picture you doing the job." },
    { ctx: "Thank-you message", before: "thx for the gift",
      after: "Thank you for the hoodie! I've already worn it twice.",
      why: "Name the gift and say how you're using it. That's what makes a thank-you feel genuine." },
  ];
  const GLOW_CONTEXTS = ["Email to a teacher", "Essay or assignment", "Message to a coach", "Text to a friend", "Job or volunteer application", "Thank-you or apology"];

  // ---------- Classy Comebacks: aimed at the idea, the move, or yourself ----------
  // src marks the few real Shakespeare lines (public domain); the rest are RoboDad originals.
  const COMEBACK_RULES = [
    "Aim at the idea, the move, or yourself.",
    "Never at looks, family, background, or anything someone can't change.",
    "If they look hurt, it wasn't a joke. Say sorry and move on.",
    "Smile when you say it. Tone is half the joke.",
  ];
  const COMEBACKS = [
    { cat: "When the argument is weak", items: [
      { line: "That argument has more holes than a colander.", when: "A friend's theory falls apart with one question." },
      { line: "Bold claim. Got a source, or is it just vibes?", when: "Someone states something wild as fact." },
      { line: "I admire your confidence. Your evidence, less so.", when: "Lots of certainty, not much proof." },
      { line: "That theory needs a software update.", when: "An idea that was true about ten years ago." },
      { line: "Interesting. Wrong, but interesting.", when: "A creative answer that just isn't right." },
    ]},
    { cat: "When someone brags", items: [
      { line: "Impressive. Should I alert the newspapers?", when: "Someone won't stop talking about their high score." },
      { line: "Noted. I'll have the statue commissioned.", when: "A small win, described like a world record." },
      { line: "Humble as ever, I see.", when: "Say it with a grin to a friend who's showing off." },
    ]},
    { cat: "When you lose a game", items: [
      { line: "I wasn't losing. I was gathering data.", when: "You got crushed and want to keep your dignity." },
      { line: "That was a strategic retreat. Very advanced.", when: "Your plan went badly wrong." },
      { line: "Well played. Enjoy it while it lasts. Rematch?", when: "Good sport and a challenge in one line." },
      { line: "GG. I let you win, is what I'll be telling everyone.", when: "Honest loss, cheeky spin." },
    ]},
    { cat: "When someone roasts you", items: [
      { line: "Wow, you've clearly been studying me. I'm flattered.", when: "Someone points out one of your habits." },
      { line: "Fair. I'll add it to my list of features.", when: "The roast is true, so own it." },
      { line: "You're not wrong, and that's what hurts.", when: "Laughing at yourself wins every time." },
      { line: "Careful, that was almost clever.", when: "A friendly roast back. Only with friends who'd laugh." },
    ]},
    { cat: "Shakespeare mode", items: [
      { line: "Thy argument is as hollow as a drum, and twice as loud.", when: "Someone's loud but not convincing." },
      { line: "Methinks thy logic hath wandered off and lost its way home.", when: "An argument goes in circles." },
      { line: "Thy excuses are many; thy reasons, few.", when: "Someone has ten excuses and no explanation." },
      { line: "Forsooth, that move was bolder than it was wise.", when: "A risky chess move that didn't work." },
      { line: "I have seen sturdier plans built from wet bread.", when: "A group plan that's clearly going to fall apart." },
      { line: "The lady doth protest too much, methinks.", when: "Someone denies something a little too hard.", src: "Shakespeare, Hamlet" },
      { line: "I do desire we may be better strangers.", when: "A classy way to end an argument and walk away.", src: "Shakespeare, As You Like It" },
    ]},
  ];

  // ---------- Word Origins with Dad: one-minute stories, each checked against a dictionary ----------
  // myth: true marks a popular story that turns out to be false (the real origin is given).
  const ORIGINS = [
    { w: "clue", from: "Old English", story: "A clue was once a clew: a ball of thread. In the Greek myth, Theseus unrolled a clew as he walked into the Labyrinth, then followed it back out after facing the Minotaur. So the thread that led you out of a maze became the hint that leads you to an answer.", dad: "Next time you're stuck on a puzzle, you're looking for your thread." },
    { w: "salary", from: "Latin", story: "Salary comes from the Latin salarium, which is linked to sal, meaning salt. Salt was precious in ancient Rome. The popular story that soldiers were paid in salt is probably not true, but the salt connection in the word is real.", dad: "So when someone says a person is 'worth their salt', they're saying they earn their pay." },
    { w: "robot", from: "Czech", story: "Robot comes from robota, a Czech word for forced labour. Writer Karel Čapek used it in his 1920 play R.U.R., about factory-made workers. He said his brother Josef, a painter, suggested the word.", dad: "Good thing this robot works for hugs and dad jokes." },
    { w: "companion", from: "Latin", story: "Companion comes from com (with) and panis (bread). A companion was literally someone you share bread with.", dad: "Which is why the best conversations happen around the dinner table." },
    { w: "muscle", from: "Latin", story: "Muscle comes from the Latin musculus, meaning 'little mouse'. People thought a flexing muscle looked like a mouse moving under the skin.", dad: "Go on, flex. Let's see the mouse." },
    { w: "disaster", from: "Italian", story: "Disaster comes from the Italian disastro: dis (bad) and astro (star). People once blamed bad events on the stars being in the wrong place.", dad: "Burnt toast isn't a disaster. Blame the toaster, not the stars." },
    { w: "quarantine", from: "Italian", story: "Quarantine comes from quaranta giorni, Venetian for 'forty days'. During outbreaks of plague in the 1300s and 1400s, ships arriving at Venice had to wait at anchor for forty days before anyone came ashore.", dad: "Forty days. And you complain about waiting for the Wi-Fi to reconnect." },
    { w: "nice", from: "Latin", story: "Nice comes from the Latin nescius, meaning 'not knowing'. In Middle English it meant foolish or silly. Over hundreds of years it drifted to mean pleasant.", dad: "So 'nice try' used to be a bit of an insult. Still is, sometimes." },
    { w: "silly", from: "Old English", story: "Silly comes from the Old English sælig, which meant happy, lucky or blessed. Over time it shifted to innocent, then to foolish.", dad: "Being silly with your family is still a kind of blessed, if you ask me." },
    { w: "goodbye", from: "English", story: "Goodbye is a squashed-together version of 'God be with ye'. Over time people swapped 'God' for 'good', probably to match 'good day' and 'good night'.", dad: "So every goodbye is secretly a 'take care of yourself'." },
    { w: "avatar", from: "Sanskrit", story: "Avatar comes from the Sanskrit avatāra, meaning 'descent'. In Hindu tradition it means a god coming down to Earth in a bodily form. Today it means the version of you that appears online.", dad: "Pick your RoboDad avatar wisely. It's a whole descent from the heavens." },
    { w: "shampoo", from: "Hindi", story: "Shampoo comes from the Hindi chāmpo, meaning 'press' or 'massage'. In the early 1800s Sake Dean Mahomed, a businessman from Patna in India, opened a famous shampooing bath in Brighton, England, where it meant a head-and-body massage.", dad: "So technically, your shampoo is a head massage. Take your time in there. Not too much time." },
    { w: "bungalow", from: "Bengali", story: "Bungalow comes from the Hindi and Bengali word for 'in the Bengal style'. It described the one-storey houses with wide verandas that British officials lived in, and the word travelled around the world.", dad: "Ask your grandparents what 'bangla' means. You might get a whole story." },
    { w: "pyjamas", from: "Persian and Hindi", story: "Pyjamas comes from pāy (leg) and jāma (garment). The loose trousers were worn across South Asia, and the British brought the word, and the comfy trousers, home.", dad: "Best gift South Asia ever gave the world. After chai." },
    { w: "jungle", from: "Hindi", story: "Jungle comes from the Hindi jangal, from the Sanskrit jaṅgala, which actually meant dry, rough land. In English it came to mean thick tropical forest, almost the opposite.", dad: "Your room isn't a jungle. A jungle has some kind of system." },
    { w: "loot", from: "Hindi", story: "Loot comes from the Hindi lūṭ, meaning stolen goods, from Sanskrit. It came into English in the 1700s. Now gamers use it for anything you pick up in a game.", dad: "Loot in a game: fine. Loot from the cookie jar: we need to talk." },
    { w: "checkmate", from: "Persian", story: "Checkmate comes from the Persian shāh māt, usually translated as 'the king is helpless'. Chess travelled from India to Persia, then through the Arab world to Europe, and the phrase came with it.", dad: "Say it to me at chess and I'll say 'rematch' in any language you like." },
    { w: "denim", from: "French", story: "Denim comes from serge de Nîmes, a sturdy fabric from the town of Nîmes in France. 'De Nîmes' got squashed into denim.", dad: "Your jeans are basically French. Très chic." },
    { w: "jumbo", from: "English", story: "Jumbo was the name of a huge African elephant at London Zoo. When P. T. Barnum bought him for his circus in 1882, Jumbo became so famous that his name came to mean anything extra large.", dad: "So a jumbo popcorn is technically an elephant-sized popcorn. Sharing is caring." },
    { w: "ketchup", from: "Hokkien Chinese", story: "Ketchup probably comes from kê-tsiap, a fermented fish sauce from southern China. British sailors took to it, and over the years the recipe changed until tomatoes took over.", dad: "Next time someone puts ketchup on everything, tell them it used to be fish." },
    { w: "spam", from: "English", story: "Spam the junk message is named after a 1970 Monty Python comedy sketch, where a café menu has Spam in almost every dish and a group keeps singing the word until nobody can hear anything else. Early internet users borrowed it for messages that drown everything out.", dad: "Your group chat at midnight? Spam." },
    { w: "emoji", from: "Japanese", story: "Emoji comes from the Japanese e (picture) and moji (character). It sounds like 'emotion', but that's a coincidence.", dad: "Dad's favourite emoji is the thumbs up. Yes, I know what it means to you. No, I'm not changing." },
    { w: "nerd", from: "English", story: "The first known printing of 'nerd' is in Dr. Seuss's 1950 book If I Ran the Zoo, as the name of a made-up creature. Within a year people were using it to describe someone who's very into studying.", dad: "Being a nerd just means you care about something a lot. Wear it proudly." },
    { w: "OK", from: "American English", story: "OK started in 1839 as a newspaper joke in Boston: a deliberate misspelling of 'oll korrect' for 'all correct'. A presidential campaign later helped it spread, and now it's one of the most used words on Earth.", dad: "A joke that went global. There's hope for my puns yet." },
    { w: "bug", from: "English", story: "The famous 1947 moth found in a Harvard computer is real, but engineers were calling glitches 'bugs' long before that. Thomas Edison wrote about bugs in his inventions in the 1870s. The team taped the moth in their logbook as the 'first actual case of bug being found' because the word was already a joke.", dad: "So the moth wasn't the first bug. It was the first bug with a real bug in it." },
    { w: "hello", from: "English", story: "Hello became a common greeting with the telephone. Thomas Edison pushed for 'hello' as the word to answer with, while Alexander Graham Bell preferred 'ahoy'. Edison's choice won.", dad: "Imagine answering every call with 'ahoy'. I might start." },
    { w: "trivia", from: "Latin", story: "Trivia comes from the Latin trivium, a place where three roads meet. The word trivialis came to mean common or ordinary, the kind of thing anyone might chat about at a crossroads.", dad: "Which makes Dad's endless facts... crossroads chat. Fair." },
    { w: "sincere", from: "Latin", myth: true, story: "A popular story says sincere comes from sine cera, 'without wax', because honest sculptors didn't hide cracks with wax. It's a myth. Sincere comes from the Latin sincerus, meaning clean or pure.", dad: "Even word stories can be fake news. Always check the source." },
    { w: "posh", from: "English", myth: true, story: "You may hear that posh stands for 'port out, starboard home', the cooler cabins on ships to India. There's no evidence for it, and no tickets were ever stamped that way. The real origin is unknown.", dad: "When a story is too neat, be skeptical. That's a life skill." },
    { w: "sandwich", from: "English", story: "The sandwich is named after John Montagu, the 4th Earl of Sandwich, in the 1700s. The story goes that he asked for meat between bread so he could keep playing cards without stopping. His biographer thinks he more likely ate it at his desk while working.", dad: "Either way, the man didn't want to stop what he was doing. Relatable." },
  ];

  // ---------- Vocab Duel: the chess ladder, from Modern Dad up to Robo-Grandpa ----------
  // m: word and meaning (wrong options come from other meanings at the same level).
  // u: pick the best upgrade (ok is right, no are wrong, why explains the trap).
  const DUEL = [
    { id: "modern", av: "modern", name: "Modern Dad", tier: 1, blurb: "Everyday words, done right.",
      m: [["brave", "showing courage"], ["curious", "wanting to know or learn"], ["generous", "happy to give and share"], ["honest", "telling the truth"],
          ["patient", "able to wait calmly"], ["clumsy", "often bumping into or dropping things"], ["ancient", "very, very old"], ["enormous", "extremely big"],
          ["fragile", "easy to break"], ["gloomy", "dark or sad"], ["hilarious", "extremely funny"], ["rapid", "very fast"]],
      u: [{ plain: "very good", ctx: "Your project was ___.", ok: "excellent", no: ["average", "mediocre", "so-so"], why: "Excellent means very good in one word. The others are a step down." },
          { plain: "very big", ctx: "There was an ___ line for the ride.", ok: "enormous", no: ["tiny", "narrow", "average"], why: "Enormous means extremely big." },
          { plain: "very tired", ctx: "After the tournament I was ___.", ok: "exhausted", no: ["alert", "rested", "lively"], why: "Exhausted means completely worn out. The others mean the opposite." },
          { plain: "very happy", ctx: "Grandma was ___ with the card.", ok: "delighted", no: ["grumpy", "bored", "nervous"], why: "Delighted means very pleased." },
          { plain: "very scared", ctx: "I was ___ on the roller coaster.", ok: "terrified", no: ["calm", "relaxed", "sleepy"], why: "Terrified means extremely scared." },
          { plain: "very funny", ctx: "Dad's joke was actually ___.", ok: "hilarious", no: ["dull", "serious", "bland"], why: "Hilarious means extremely funny. Rare for a dad joke, but it happens." }] },
    { id: "skater", av: "skater", name: "Skater Dad & Arcade Dad", tier: 2, blurb: "Words that sound sharp, not stiff.",
      m: [["reluctant", "not wanting to do something"], ["spontaneous", "done suddenly, without planning"], ["cautious", "careful to avoid danger or mistakes"], ["quirky", "unusual in a fun, charming way"],
          ["tedious", "long, slow and boring"], ["novice", "a beginner"], ["vivid", "bright, clear and full of detail"], ["frugal", "careful about spending money"],
          ["humble", "not bragging about yourself"], ["optimistic", "expecting good things to happen"], ["obsolete", "no longer used because something newer replaced it"], ["genuine", "real and sincere, not fake"]],
      u: [{ plain: "boring", ctx: "Copying notes by hand is ___.", ok: "tedious", no: ["tense", "hasty", "timid"], why: "Tedious is the classy word for a long, boring task." },
          { plain: "weird (in a good way)", ctx: "I love her ___ taco socks.", ok: "quirky", no: ["creepy", "rude", "broken"], why: "Quirky is the friendly version of weird." },
          { plain: "cheap (smart with money)", ctx: "He's ___, so he saved for months.", ok: "frugal", no: ["stingy", "greedy", "broke"], why: "Stingy sounds mean. Frugal sounds smart." },
          { plain: "old (replaced by newer tech)", ctx: "VHS tapes are pretty much ___.", ok: "obsolete", no: ["elderly", "stale", "aged"], why: "Elderly is for people and stale is for bread. Obsolete means replaced by something newer." },
          { plain: "real", ctx: "His apology felt ___.", ok: "genuine", no: ["fake", "artificial", "rough"], why: "Genuine means real and sincere." },
          { plain: "didn't want to", ctx: "I was ___ to try sushi, but now I love it.", ok: "reluctant", no: ["eager", "excited", "keen"], why: "Reluctant means not wanting to. The others mean the opposite." }] },
    { id: "gamer", av: "gamer", name: "Gamer Dad & Coach Dad", tier: 3, blurb: "Report-card words. Teachers love these.",
      m: [["tenacious", "not letting go or giving up easily"], ["diligent", "working hard and steadily"], ["resilient", "able to bounce back after something hard"], ["meticulous", "very careful about every small detail"],
          ["skeptical", "doubting whether something is true"], ["candid", "honest and direct"], ["versatile", "able to do many different things well"], ["ambiguous", "could mean more than one thing"],
          ["feasible", "possible and practical to do"], ["rigorous", "very thorough and strict"], ["valiant", "brave and determined"], ["ingenious", "very clever and original"]],
      u: [{ plain: "never gives up", ctx: "The ___ goalie dove for every shot.", ok: "tenacious", no: ["stubborn", "talkative", "restless"], why: "Stubborn is a complaint. Tenacious is a compliment." },
          { plain: "careful with details", ctx: "She was ___ with her science board.", ok: "meticulous", no: ["picky", "nervous", "messy"], why: "Picky sounds like a complaint. Meticulous is praise." },
          { plain: "honest (feedback)", ctx: "Can I be ___? The second ending is better.", ok: "candid", no: ["blunt", "rude", "sneaky"], why: "Blunt can sting. Candid means honest in a kind, open way." },
          { plain: "clever", ctx: "Using a binder clip as a phone stand was ___.", ok: "ingenious", no: ["ingenuous", "sly", "weird"], why: "Watch the trap: ingenuous means innocent and trusting. Ingenious means clever." },
          { plain: "unclear", ctx: "The instructions were ___. Later today or this week?", ok: "ambiguous", no: ["ambitious", "anonymous", "obvious"], why: "Ambiguous means it could mean more than one thing." },
          { plain: "brave (even though we lost)", ctx: "We made a ___ comeback but lost by a point.", ok: "valiant", no: ["violent", "vain", "valid"], why: "Valiant means brave and determined, win or lose." }] },
    { id: "bookworm", av: "bookworm", name: "Bookworm Dad & Lab Dad", tier: 4, blurb: "Essay and science words.",
      m: [["articulate", "able to express ideas clearly"], ["eloquent", "speaking or writing in a powerful, graceful way"], ["pragmatic", "practical, focused on what actually works"], ["nuance", "a small but important difference"],
          ["plausible", "possible, could be true"], ["hypothesis", "an idea you test to see if it's true"], ["catalyst", "something that makes change happen faster"], ["impartial", "fair, not taking sides"],
          ["mitigate", "to make something less bad"], ["scrutinize", "to look at very closely"], ["coherent", "clear and logical, making sense together"], ["lucid", "clear and easy to understand"]],
      u: [{ plain: "says (in an essay)", ctx: "The author ___ that school should start later.", ok: "contends", no: ["chats", "reckons", "yells"], why: "Contends means argues, in a formal way. Reckons is too casual for an essay." },
          { plain: "makes it less bad", ctx: "A helmet ___ the risk of a bad fall.", ok: "mitigates", no: ["magnifies", "imitates", "motivates"], why: "Mitigates means makes less bad. Magnifies would make it worse." },
          { plain: "look closely at", ctx: "___ the question before you answer it.", ok: "Scrutinize", no: ["Skim", "Glance at", "Scribble"], why: "Scrutinize means read it like a detective. Skimming is the opposite." },
          { plain: "fair", ctx: "A referee has to be ___.", ok: "impartial", no: ["partial", "impatient", "imperial"], why: "Trap: partial means biased. Impartial means fair, not taking sides." },
          { plain: "practical", ctx: "Taking the bus was the ___ choice.", ok: "pragmatic", no: ["dramatic", "problematic", "dogmatic"], why: "Pragmatic means practical, focused on what works." },
          { plain: "small difference", ctx: "There's a ___ between confident and cocky.", ok: "nuance", no: ["nuisance", "nonsense", "nudge"], why: "A nuance is a small but important difference. A nuisance is just annoying." }] },
    { id: "professor", av: "professor", name: "Professor Dad", tier: 5, blurb: "The top visible tier. Big brain words.",
      m: [["juxtapose", "to put two things side by side to compare them"], ["vindicate", "to prove someone was right"], ["undermine", "to weaken something, often slowly"], ["reciprocate", "to give something back in return"],
          ["discern", "to notice or tell the difference"], ["brevity", "using few words; shortness"], ["fortitude", "courage when facing pain or difficulty"], ["negligible", "so small it doesn't matter"],
          ["zenith", "the highest point"], ["allude", "to hint at something without saying it directly"], ["bolster", "to support or make stronger"], ["enigma", "a mystery, something hard to understand"]],
      u: [{ plain: "hint at", ctx: "He ___ to a surprise but wouldn't say more.", ok: "alluded", no: ["eluded", "deluded", "illuded"], why: "Elude means escape and delude means fool. Allude means hint." },
          { plain: "proved right", ctx: "The results ___ her answer.", ok: "vindicated", no: ["vindictive", "invalidated", "vandalized"], why: "Vindicated means proved right. Invalidated means proved wrong." },
          { plain: "so small it doesn't matter", ctx: "The price difference was ___.", ok: "negligible", no: ["negligent", "noticeable", "eligible"], why: "Trap: negligent means careless. Negligible means tiny." },
          { plain: "best moment", ctx: "The championship was the ___ of their season.", ok: "zenith", no: ["nadir", "zealot", "zephyr"], why: "Zenith is the highest point. Nadir is the lowest." },
          { plain: "made stronger", ctx: "This evidence ___ my argument.", ok: "bolsters", no: ["bloats", "boasts", "blusters"], why: "Bolsters means supports or strengthens." },
          { plain: "return the favour", ctx: "She helped me, so I ___ by helping her.", ok: "reciprocated", no: ["retaliated", "recuperated", "replicated"], why: "Retaliate means get back at someone in a bad way. Reciprocate means return kindness." }] },
    { id: "grandpa", av: "grandpa", name: "Robo-Grandpa", tier: 6, secret: true, blurb: "The secret, strongest opponent. Puzzle-maker words.",
      m: [["acrostic", "a message hidden in the first letters of lines or words"], ["cipher", "a secret code that swaps letters or symbols"], ["anagram", "a word made by rearranging the letters of another"], ["palindrome", "a word or phrase that reads the same backwards"],
          ["cryptic", "mysterious and hard to understand"], ["perspicacious", "quick to notice and understand things"], ["magnanimous", "generous and forgiving, especially to a rival"], ["ephemeral", "lasting a very short time"],
          ["ubiquitous", "found everywhere"], ["obfuscate", "to make something deliberately unclear"], ["serendipity", "finding something good by happy accident"], ["sagacious", "wise and good at judging"]],
      u: [{ plain: "kind to the team you beat", ctx: "The champions were ___ in victory.", ok: "magnanimous", no: ["malicious", "monotonous", "meticulous"], why: "Magnanimous means generous to a rival. Malicious means wanting to hurt." },
          { plain: "everywhere", ctx: "Phones are ___ these days.", ok: "ubiquitous", no: ["ambiguous", "iniquitous", "unanimous"], why: "Ubiquitous means found everywhere." },
          { plain: "lasts a short time", ctx: "A snowflake's shape is ___.", ok: "ephemeral", no: ["ethereal", "eternal", "emphatic"], why: "Trap: ethereal means delicate and light. Ephemeral means short-lived." },
          { plain: "lucky accident", ctx: "Finding that book was pure ___.", ok: "serendipity", no: ["sincerity", "severity", "solemnity"], why: "Serendipity is finding something good by happy accident." },
          { plain: "make unclear on purpose", ctx: "Don't ___ the rules so you can win.", ok: "obfuscate", no: ["elucidate", "obliterate", "officiate"], why: "Obfuscate means muddy the waters. Elucidate is the opposite: make clear." },
          { plain: "wise", ctx: "Grandpa gave a ___ bit of advice.", ok: "sagacious", no: ["audacious", "spacious", "sarcastic"], why: "Sagacious means wise. Audacious means bold." }] },
  ];
  // Robo-Grandpa's reward: a nudge toward The Lost Cartridge (it never gives away an answer).
  const GRANDPA_SECRET = "Back in my day, puzzles came on paper. Here's a secret: every chapter of The Lost Cartridge has a Word clue tucked into its hints. And the word for a message hidden in first letters? You just learned it. Words are keys, kiddo.";

  window.VOCAB = { GLOWUPS, GLOW_CONTEXTS, COMEBACK_RULES, COMEBACKS, ORIGINS, DUEL, GRANDPA_SECRET };

  // Sentence Glow-Up coach: the same chat machinery as the maths and brain teaser coaches.
  window.LESSONS = window.LESSONS || {};
  window.LESSONS.vocab = {
    name: "Sentence Glow-Up", native: "Sentence Glow-Up", voice: "en-CA", hello: "Hi", coach: true,
    coachTag: "Sentence Glow-Up", coachSub: "Dad polishes it, then you try one change", placeholder: "Paste a sentence to glow up…",
    lessons: [],
    scenes: [{
      id: "glowup", title: "Your sentence", who: "Dad's your writing coach",
      open: "Glow-Up mode. Paste a sentence you're about to send or hand in, and tell me who it's for (a teacher, a coach, an essay). I'll polish it and show you the one or two changes that make the difference.",
      hints: ["Make it more polite", "Make it sound less stiff", "Here's another sentence: "],
    }],
  };
})();
