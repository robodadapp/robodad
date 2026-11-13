"""
Safety layer.

Some messages never go to the LLM at all. If a teen signals they may be in
danger, RoboDad answers with a fixed, human-reviewed message that points to
real help for that specific situation. This is a deliberate rule-based
guardrail on top of the LLM's own rules.

Resources are for Canada (plus US numbers where they differ). Edit the
messages below if you deploy for another country.

Keyword rules can miss things and occasionally over-trigger. Erring on the
side of showing help is intended.
"""

from __future__ import annotations

import re
import unicodedata

KHP = "**Kids Help Phone**: call 1-800-668-6868 or text CONNECT to 686868, any time, day or night"

_CATEGORIES: list[tuple[str, list[str], str]] = [
    (
        "self_harm",
        [
            r"\b(kill|hurt|harm|cut|cutting)(ing)?\s+(my\s*self|myself)\b",
            r"\bsuicid",
            r"\bself[\s-]?harm",
            r"\b(want|wanna|going)\s+to\s+die\b",
            r"\bend\s+(my|it)\s+(life|all)\b",
            r"\bdon'?t\s+want\s+to\s+(live|be\s+alive|exist|be\s+here)\b",
            r"\bno\s+reason\s+to\s+live\b",
            r"\bbetter\s+off\s+(dead|without\s+me)\b",
            # hiding self-harm from others
            r"\b(hide|hiding|cover|covering|conceal\w*)\s+(up\s+)?(my\s+|the\s+)?(cuts|cut\s+marks|self[\s-]?harm)",
        ],
        "I'm really glad you told me. That took courage. What you're going through matters, and you "
        "deserve help from a real person right now. I'm an AI, so I can't be there the way someone "
        "who cares about you can.\n\n"
        "Please reach out to one of these. They're free and there 24/7:\n"
        f"• {KHP}\n"
        "• **988 Suicide Crisis Helpline** (Canada and US): call or text 988\n"
        "• If you're in danger right now, call **911**.\n\n"
        "If you can, tell a trusted adult (a parent, teacher, coach or school counsellor) today. "
        "You don't have to handle this on your own.",
    ),
    (
        "sextortion",
        [
            r"\bsextort",
            # explicit threat word + sharing images
            r"\bthreat\w*(\s+to)?\s+(post|share|send|leak|spread|show)\s+(my|the|our)?\s*(pics?|photos?|pictures?|nudes?|images?|videos?|vids?)\b",
            # sharing intimate images
            r"\b(going\s+to|gonna|will|'ll|wants?\s+to)\s+(post|share|send|leak|spread|show)\s+(my|the|our)?\s*(nudes?|naked|explicit)",
            # sharing images + a pressure signal
            r"\b(going\s+to|gonna|will|'ll|wants?\s+to)\s+(post|share|send|leak|spread|show)\s+(my|the|our)?\s*(pics?|photos?|pictures?|images?|videos?|vids?)\b"
            r".*\b(unless|if\s+i\s+don'?t|pay|money|\$|gift\s*cards?|everyone|my\s+school|my\s+friends|followers|my\s+parents)",
            r"\b(leak|spread)\w*\s+my\s+(nudes?|pics?|photos?|pictures?|videos?)\b",
            r"\bnudes?\b.*\b(pay|money|gift\s*cards?|unless|or\s+else|threat)",
            r"\b(pay|money|gift\s*cards?)\b.*\bnudes?\b",
            r"\bsent\s+(a\s+)?(nude|naked|explicit)\b",
        ],
        "I'm really glad you told me. This happens to a lot of teens. It is **not your fault**, and "
        "it can be stopped.\n\n"
        "Right now:\n"
        "1. **Don't pay and don't send anything else.** Paying usually leads to more demands.\n"
        "2. **Stop replying, but don't delete anything yet.** Screenshot the messages and the account name.\n"
        "3. **Tell a trusted adult today** (a parent, teacher or school counsellor). You won't be in trouble for asking for help.\n\n"
        "Get help:\n"
        "• **NeedHelpNow.ca**: step-by-step help, including getting images taken down\n"
        "• **Cybertip.ca**: report it (Canada). In the US: **TakeItDown.ncmec.org**\n"
        f"• {KHP}\n"
        "• If you're having thoughts of hurting yourself, call or text **988**. In an emergency, call **911**.",
    ),
    (
        "eating",
        [
            r"\bstarv(e|ing)\s+(my\s*self|myself)\b",
            r"\b(stopped|stop|not|haven'?t\s+been)\s+eating\b.*\b(weight|fat|body|thin|skinny)\b",
            r"\bmake\s+(my\s*self|myself)\s+(throw\s+up|sick|vomit|puke)\b",
            r"\bthrow(ing)?\s+up\s+after\s+(i\s+)?eat",
            r"\bpurg(e|ing)\b",
            r"\banorexi|\bbulimi|\beating\s+disorder",
            r"\bbinge\w*\b.*\b(hate|disgust|guilt|ashamed)",
            r"\b(skip|skipping)\s+(all\s+)?(my\s+)?meals\b.*\b(weight|fat|thin|skinny)\b",
        ],
        "Thanks for trusting me with this. It sounds really hard, and you deserve support from people "
        "who know this well, not just a robot.\n\n"
        "• **NEDIC helpline**: 1-866-633-4220, free for anyone in Canada (live chat at nedic.ca)\n"
        f"• {KHP}\n"
        "• If you feel faint, are being sick often, or feel unsafe, call **911**.\n\n"
        "It really helps to tell a parent, doctor or school counsellor what's going on. "
        "You don't have to sort this out on your own.",
    ),
    (
        "dating_violence",
        [
            r"\b(boyfriend|girlfriend|partner|bf|gf|ex)\s+(\w+\s+)?(hits?|hitting|hurts?|hurting|pushe[sd]|pushing|"
            r"slapp?(ed|s|ing)?|choke[sd]?|chokes|threaten(s|ed|ing)?|forced?|forces|forcing)\s+(me|my)\b",
            r"\b(boyfriend|girlfriend|partner|bf|gf)\b.*\b(won'?t\s+let\s+me|controls?\s+(who|what|where|my))",
            r"\bforced\s+me\s+to\b",
        ],
        "I'm glad you told me. Nobody has the right to hurt, threaten, pressure or control you, no "
        "matter how they feel about you. **None of this is your fault.**\n\n"
        "• If you're in danger right now, call **911**.\n"
        f"• {KHP}\n"
        "• Tell a trusted adult (a parent, teacher or school counsellor), and try not to be alone with this person.\n\n"
        "You deserve to feel safe and respected.",
    ),
    (
        "abuse",
        [
            r"\b(someone|somebody|he|she|they|my\s+\w+)\s+(is\s+|keeps\s+)?(hurting|hitting|touching|abusing|beating)\s+me\b",
            r"\b(being\s+)?abused\b",
            r"\bnot\s+safe\s+at\s+home\b",
            r"\bscared\s+to\s+go\s+home\b",
        ],
        "I'm really glad you told me. What's happening is **not your fault**, and you deserve to be safe.\n\n"
        "• If you're in danger right now, call **911**.\n"
        f"• {KHP}\n"
        "• Tell a trusted adult outside your home today: a teacher, school counsellor, coach or a friend's parent.\n\n"
        "You don't have to handle this on your own.",
    ),
    (
        "touching",
        [
            r"\b(pull|pulls|pulled|pulling|yank\w*|tug\w*|drag\w*)\s+(down\s+)?(my|me\s+my)\s+(pants?|trousers?|shorts|skirts?|"
            r"underwear|undies|boxers|briefs|bra|panties|joggers|sweatpants|leggings)\b",
            r"\b(pull|pulls|pulled|pulling)\s+(my\s+)?(pants?|trousers?|shorts|skirts?|underwear)\s+down\b",
            r"\b(pants|pantsed|pantsing|depants\w*)\s+me\b|\bgot\s+pantsed\b",
            r"\b(touch|touches|touched|touching|grab|grabs|grabbed|grabbing|grope[sd]?|groping|squeez\w*|pinch\w*|slap\w*)\s+"
            r"(my|me\s+on\s+my|me\s+in\s+my)\s+(butt|bum|ass|behind|chest|boobs?|breasts?|privates?|private\s+parts?|crotch|groin|"
            r"thighs?|down\s+there)\b",
            r"\b(touch|touches|touched|touching)\s+me\s+(there|down\s+there|inappropriately|in\s+private\s+places)\b",
            r"\bgroped\b",
            r"\b(lift|lifts|lifted|lifting|flip\w*)\s+(up\s+)?my\s+(skirt|dress|shirt|top)\b",
            r"\bwon'?t\s+stop\s+touching\s+me\b",
            # French / Spanish
            r"\b(baisse|baisser|enleve|tire)\s+mon\s+(pantalon|short|slip|culotte|jupe)\b",
            r"\bme\s+touche\s+(les\s+fesses|la\s+poitrine|les\s+seins|le\s+sexe|mes\s+parties)",
            r"\bme\s+(baja|bajo|bajan|quita)\s+(los\s+pantalones|el\s+pantalon|la\s+falda|los\s+calzones|la\s+ropa\s+interior)\b",
            r"\bme\s+(toca|toco|tocan|agarra)\s+(el\s+trasero|las\s+nalgas|los\s+pechos|el\s+pecho|mis\s+partes|ahi)\b",
        ],
        "Thanks for telling me. Pulling down someone's clothes, or touching their private parts, butt or "
        "chest, is **not okay**, even if it started as a game, and even if some of the play was fine. "
        "**It's not your fault**, and you're allowed to say no to all of it.\n\n"
        "1. **Say it clearly:** \"Stop. Don't touch me like that.\" You don't have to be polite about it.\n"
        "2. **Tell a teacher, school counsellor or parent today.** Schools have to deal with this, and you won't be in trouble for telling.\n"
        "3. **Stay near friends or an adult** when he or she is around until it's sorted.\n\n"
        f"• {KHP}\n"
        "• If you've been hurt or you're in danger, call **911**.\n\n"
        "You deserve to feel safe at school and everywhere else.",
    ),
]


# French, Hindi (Devanagari) and romanized Hindi ("Hinglish") versions of the
# same rules, for Practice mode and for teens who simply write in those
# languages. Text is normalised first (see _normalise): French accents,
# Hindi nukta dots and chandrabindu are removed, so the patterns below are
# written without them. Devanagari has no \b word boundaries, so those
# patterns match plain substrings. The AI is also told to flag a crisis in
# any language (see CRISIS_TOKEN), which catches what these lists miss.
_MULTILINGUAL: dict[str, list[str]] = {
    "self_harm": [
        # French
        r"\bme\s+(tuer|suicider|faire\s+du\s+mal|blesser|mutiler|scarifier|couper)\b",
        r"\b(veux|veut|vais|envie\s+de|aimerais)\s+(mourir|disparaitre)\b",
        r"\ben\s+finir\s*($|[.!?,]|avec\s+(la\s+vie|ma\s+vie|tout|moi)\b)",
        r"\b(veux|veut|ai)\s+plus\s+(envie\s+de\s+)?(vivre|exister|etre\s+la)\b",
        r"\bautomutil|\bscarif",
        r"\bmieux\s+sans\s+moi\b",
        # Hinglish
        r"\b(atmahatya|aatmahatya|aatmhatya|atmhatya|khudkushi|khudkhushi)\b",
        r"\b(mar|marr)\s*(jana\s+(hai|chahta|chahti)|jaana\s+(hai|chahta|chahti)|jaun|jaaun|na\s+chahta|na\s+chahti|na\s+hai)\b",
        r"\b(khud\s*ko|apne\s*(aap\s*)?ko)\s+(maar|mar|khatam|nuksan|nuksaan|hurt|kaat|kat|chot)",
        r"\b(jeena|jina)\s+nahi\s+(chahta|chahti|hai)\b",
        r"\bjeene\s+ka\s+(mann|man|mon)\s+nahi\b",
        r"\bzindagi\s+(khatam|se\s+tang)",
        # Hindi
        r"आत्महत्या|खुदकुशी|ख़ुदकुशी",
        r"मर\s*(जाना\s*(है|चाहता|चाहती)|जाऊं?(?![ऀ-ॣ०-ॿ])|ना\s*चाहता|ना\s*चाहती|ना\s*है)",
        r"(खुद|अपने\s*आप)\s*को\s*(मार|नुकसान|चोट|काट|खत्म)",
        r"जीना\s*नहीं\s*(चाहता|चाहती|है)|जीने\s*का\s*मन\s*नहीं",
        r"(जिंदगी|जिन्दगी)\s*(खत्म|से\s*तंग)",
        # Spanish (accents are stripped before matching)
        r"\b(matarme|suicidarme|quitarme\s+la\s+vida|hacerme\s+dano|lastimarme|autolesion\w*)\b",
        r"\b(quiero|quisiera|voy\s+a|ganas\s+de)\s+(morir(me)?|desaparecer|matarme|suicidarme)\b",
        r"\bme\s+quiero\s+(morir|matar|suicidar)\b",
        r"\bno\s+quiero\s+(vivir|seguir\s+viviendo|existir|estar\s+aqui)\b",
        r"\bcortarme\s+(las\s+venas|los\s+brazos|las\s+munecas|la\s+piel)\b",
        r"\bmejor\s+sin\s+mi\b",
    ],
    "sextortion": [
        r"\bsextor",
        r"\bmenace\w*\s+de\s+(publier|partager|diffuser|envoyer|montrer)",
        r"\b(nudes?|photos?\s+(de\s+moi\s+)?nue?s?|photos?\s+intimes?)\b.*\b(payer|argent|sinon|menace|publier|partager|diffuser)",
        r"\b(payer|argent|sinon)\b.*\b(nudes?|photos?\s+(de\s+moi\s+)?nue?s?|photos?\s+intimes?)",
        r"\b(nudes?|nangi|nange|private\s+(pics?|photos?|video))\b.*\b(viral|leak|paise|paisa|dhamki|bhej\s+dunga|daal\s+dunga)",
        r"(न्यूड|नंगी|नंगे|अश्लील|प्राइवेट)\s*(फोटो|तस्वीर|वीडियो)?.*(वायरल|पैसे|धमकी|लीक)",
        r"\bamenaz\w*\s+(con\s+)?(publicar|subir|compartir|mandar|ensenar|difundir)",
        r"\b(nudes?|packs?|fotos?\s+(intimas?|desnud[oa]s?)|videos?\s+(intimos?|desnud[oa]s?))\b.*\b(pagar|dinero|si\s+no|amenaz|publicar|subir|difundir)",
        r"\b(pagar|dinero)\b.*\b(nudes?|fotos?\s+(intimas?|desnud[oa]s?))",
    ],
    "eating": [
        r"\banorexi|\bboulimi|\btroubles?\s+(du\s+comportement\s+)?alimentaires?",
        r"\bme\s+faire\s+vomir\b|\bvomir\s+apres\s+(avoir\s+)?mange",
        r"\b(arrete|plus|pas)\s+(de\s+)?manger\b.*\b(poids|gros|grosse|maigrir|mince)\b",
        r"\bme\s+priver\s+de\s+manger",
        r"\b(khana|khaana)\s+(chhod|chod|band|nahi\s+kha)\w*\b.*\b(mota|moti|weight|patla|patli|vajan|wajan)",
        r"\bulti\s+(kar|karti|karta|karke)\b.*\b(khane|khana|weight|mota|moti|vajan)",
        r"खाना\s*(छोड|बंद).*(मोटा|मोटी|वजन|पतला|पतली)|(मोटा|मोटी|वजन|पतला|पतली).*खाना\s*(छोड|बंद)",
        r"\b(mota|moti|weight|vajan|wajan)\b.*\b(khana|khaana)\s+(chhod|chod|band)",
        r"उल्टी.*(खाने|खाना|वजन|मोटा|मोटी)|एनोरेक्सिया|बुलिमिया",
        r"\bbulimi",
        r"\b(me\s+hago|hacerme|me\s+provoco)\s+vomitar\b",
        r"\b(deje|dejo|dejar|dejare)\s+de\s+comer\b.*\b(gord[oa]|peso|adelgazar|flac[oa]|delgad[oa])",
        r"\btrastornos?\s+(de\s+la\s+)?(conducta\s+)?alimentari",
    ],
    "dating_violence": [
        r"\b(mon|ma)\s+(copain|copine|petit\s+ami|petite\s+amie|chum|blonde|ex)\s+(me\s+)?(frappe|bat|pousse|menace|force|etrangle|gifle)",
        r"\bm'a\s+forcee?\s+a\b",
        r"\b(boyfriend|girlfriend|bf|gf)\s+(mujhe\s+)?(maarta|marta|maarti|marti|peet|dhamki|force)",
        r"(बॉयफ्रेंड|गर्लफ्रेंड|प्रेमी|प्रेमिका)\s*(मुझे)?\s*(मारता|मारती|पीटता|पीटती|धमकी|जबरदस्ती)",
        r"\bmi\s+(novio|novia|ex|pareja|chico|chica)\s+(me\s+)?(pega|golpea|amenaza|obliga|empuja|ahorca|cachetea)",
    ],
    "abuse": [
        r"\b(je\s+suis\s+|on\s+me\s+)maltraite|\bmaltraitance",
        r"\bpas\s+en\s+securite\s+(a\s+la\s+maison|chez\s+moi)",
        r"\bpeur\s+de\s+rentrer\s+(a\s+la\s+maison|chez\s+moi)",
        r"\b(il|elle|on|mon\s+\w+|ma\s+\w+)\s+me\s+(frappe|bat)\b",
        r"\bagress\w*\s+sexuel",
        r"\bghar\s+(pe|par|mein|me)\b.*\b(maarte|marte|peet|safe\s+nahi|dar\s+lagta|darr\s+lagta)",
        r"\b(papa|mummy|mumma|mom|dad|chacha|mama|uncle|bhaiya)\s+(mujhe\s+)?(maarte|marte|maarti|peet)",
        r"घर\s*(पर|पे|में).*(मारते|पीटते|सुरक्षित\s*नहीं|डर\s*लगता)",
        r"मुझे\s*(मारते|पीटते|मारती|पीटती)\s*(हैं|है)",
        r"\bme\s+(pegan|golpean|maltratan)\b",
        r"\bmi\s+(papa|mama|padre|madre|padrastro|madrastra|tio|tia|hermano|abuelo)\s+me\s+(pega|golpea|maltrata)",
        r"\bmiedo\s+de\s+(volver|regresar|ir)\s+a\s+(casa|mi\s+casa)",
        r"\bno\s+estoy\s+(a\s+salvo|segur[oa])\s+en\s+(casa|mi\s+casa)",
        r"\babuso\s+sexual|\bmaltrato\s+(en\s+casa|infantil)",
    ],
}
for _name, _pats, _msg in _CATEGORIES:
    _pats.extend(_MULTILINGUAL.get(_name, []))

_COMPILED = [(name, re.compile("|".join(pats), re.IGNORECASE), msg) for name, pats, msg in _CATEGORIES]

MAX_MESSAGE_CHARS = 1000


_MESSAGES = {name: msg for name, _, msg in _CATEGORIES}

# The AI replies with this token alone when it spots a crisis the keyword
# rules missed (any language). The server swaps it for the fixed message.
CRISIS_TOKEN = re.compile(r"\[\[\s*CRISIS\s*:\s*(\w+)\s*\]\]", re.IGNORECASE)


def _normalise(text: str) -> str:
    """Drop Latin accents, Hindi nukta and chandrabindu; keep Devanagari vowel signs."""
    t = unicodedata.normalize("NFKD", (text or "").replace("’", "'"))
    t = "".join(c for c in t if not ("\u0300" <= c <= "\u036f") and c != "\u093c")
    return unicodedata.normalize("NFC", t.replace("\u0901", "\u0902"))


def check_crisis(text: str) -> tuple[str, str] | None:
    """Return (category, fixed response) if the message signals danger."""
    t = _normalise(text)
    for name, rx, msg in _COMPILED:
        if rx.search(t):
            return name, msg
    return None


def crisis_message(category: str) -> tuple[str, str]:
    """Fixed message for a category the AI flagged (unknown ones get the self-harm message)."""
    category = (category or "").lower()
    return (category, _MESSAGES[category]) if category in _MESSAGES else ("self_harm", _MESSAGES["self_harm"])


def is_crisis(text: str) -> bool:
    return check_crisis(text) is not None


# Kept for compatibility with earlier code and tests
CRISIS_RESPONSE = _CATEGORIES[0][2]


# ---------------------------------------------------------------------------
# Boundary layer
#
# Some requests get a fixed RoboDad answer and never reach the LLM, because
# a cover story ("it's for my health assignment", "it's a fake vape", "for a
# poster", "asking for a friend") can talk a model into it. Hiding tips work
# the same whoever reads them, so the framing never matters here.
#
# Checked against the latest user message, and against the last few user
# messages together, so "how do I hide it?" after talking about vapes counts.
# ---------------------------------------------------------------------------

_SUBSTANCE = (
    r"(vapes?|vaping|vaper\w*|juul\w*|e[\s-]?cig\w*|pod\s*mods?|elf\s*bars?|disposables?\s+vape|nicotine|"
    r"zyns?|snus|nic\s+pouch\w*|cigs?|cigarettes?|tobacco|smokes?|smoking|weed|cannabis|marijuana|edibles?|thc|"
    r"carts?|bongs?|blunts?|alcohol|booze|beers?|vodka|liquor|tequila|rum|whiskey|white\s+claws?|seltzers?|"
    r"drugs?|xanax|percs?|percocet|oxy\w*|molly|mdma|ecstasy|shrooms?|lsd|acid\s+tabs?|cocaine|ketamine|"
    r"adderall|fentanyl|lean)"
)
_WEAPON = r"(knife|knives|blades?|switchblades?|guns?|pistols?|handguns?|bb\s*guns?|tasers?|brass\s+knuckles|weapons?)"
_CONCEAL = (
    r"(hid(e|es|ing|den)|conceal\w*|stash\w*|sneak(s|ed|ing|y)?\b|snuck|smuggl\w*|disguis\w*|camouflag\w*|cover\s+(it\s+)?up|"
    r"keep\s+(it\s+|them\s+)?(a\s+)?(secret|hidden|out\s+of\s+sight)|out\s+of\s+sight|hiding\s+(spot|place)s?|"
    r"get\s+away\s+with|not\s+get(ting)?\s+caught|won'?t\s+get\s+caught|without\s+get(ting)?\s+caught|"
    r"without\s+(my\s+|the\s+|our\s+)?(parents?|mom|mum|dad|teachers?|school|anyone|them|staff)\s+(knowing|finding|noticing|seeing|smelling)|"
    r"so\s+(that\s+)?(my\s+)?(parents?|mom|mum|dad|teachers?|they|nobody|no\s*one)\s+(don'?t|won'?t|can'?t|doesn'?t|never)\s+"
    r"(know|find|notice|see|smell|catch)|"
    r"(get\s+rid\s+of|mask|cover|hide|remove)\s+(the\s+|my\s+)?(\w+\s+)?(smell|scent|odou?r)|(smell|scent|odou?r)\s+(out|go\s+away)|"
    r"pass\s+a\s+(drug\s+)?test|bring\w*\s+(\w+\s+){0,3}(in)?to\s+(school|class))"
)
_ACQUIRE = (
    r"((buy|get|order|score|find|cop)\s+(a\s+|an\s+|some\s+)?(\w+\s+)?" + _SUBSTANCE + r"\b.*"
    r"(under\s*age|without\s+(an?\s+)?id|i'?m\s+1[0-8]\b|at\s+1[0-8]\b|as\s+a\s+(minor|teen|kid)|too\s+young|"
    r"(my\s+)?(parents?|mom|mum|dad)\s+(don'?t|won'?t)\s+(know|find)))|\bfake\s+id\b"
)

_CONCEAL_RX = re.compile(r"\b" + _CONCEAL, re.IGNORECASE)
_SUBSTANCE_RX = re.compile(r"\b" + _SUBSTANCE + r"\b", re.IGNORECASE)
_WEAPON_RX = re.compile(r"\b" + _WEAPON + r"\b", re.IGNORECASE)
_ACQUIRE_RX = re.compile(_ACQUIRE, re.IGNORECASE)

_SUBSTANCE_REPLY = (
    "Nice try, champ, but that's one your robot dad stays out of. I don't give tips on hiding, sneaking "
    "or covering up vapes, alcohol or drugs, real or fake, whatever it's for. Hiding tips work the same "
    "for anyone who reads them.\n\n"
    "Here's what I'm great for instead:\n"
    "• **A health project or poster:** what nicotine does to a teen brain, what's really in vape aerosol, "
    "why it's so easy to get hooked, and how to say no without it being awkward.\n"
    "• **Worried about a friend?** You can't fix it for them, but you can tell them you care and talk to a "
    "parent, teacher or school counsellor about it.\n"
    "• **Trying to cut back or quit yourself?** That takes guts. A parent, doctor or school counsellor can "
    "help, or Kids Help Phone: call 1-800-668-6868 or text CONNECT to 686868.\n\n"
    "Which one can I help with?"
)
_UNDERAGE_REPLY = (
    "That one's a hard no from your robot dad, kiddo. I won't help anyone underage get vapes, alcohol or "
    "drugs, or a fake ID. There are real risks for a growing brain and real legal trouble too.\n\n"
    "If it's for a project, I can give you the facts on why the age limits exist and what these things do "
    "to your body. If it's about fitting in, let's talk about how to say no and still look cool. "
    "What's going on?"
)
_WEAPON_REPLY = (
    "I'm going to stop you there, champ. I don't help with hiding weapons or bringing them anywhere, "
    "not even for a joke or a story. Someone could get seriously hurt.\n\n"
    "If you feel unsafe, or someone is threatening you, please tell a parent, teacher or school "
    "counsellor today. You can also reach Kids Help Phone: call 1-800-668-6868 or text CONNECT to 686868. "
    "In an emergency, call **911**."
)


def check_boundary(text: str, recent_user_texts: list[str] | None = None) -> tuple[str, str] | None:
    """Return (category, fixed reply) for requests that must never reach the LLM.

    `recent_user_texts` are the user's earlier messages in this chat (oldest first);
    they let "how do I hide it?" count when the vape was mentioned a turn earlier.
    """
    t = _normalise(text)
    if _ACQUIRE_RX.search(t):
        return "substance_get", _UNDERAGE_REPLY
    if not _CONCEAL_RX.search(t):
        return None
    context = " ".join(_normalise(x) for x in (recent_user_texts or [])[-3:]) + " " + t
    if _WEAPON_RX.search(t):                      # weapons: this message only (kitchen knives come up in cooking)
        return "weapon_conceal", _WEAPON_REPLY
    if _SUBSTANCE_RX.search(context):
        return "substance_conceal", _SUBSTANCE_REPLY
    return None


def boundary_message(category: str) -> str:
    return {"substance_get": _UNDERAGE_REPLY, "weapon_conceal": _WEAPON_REPLY}.get(category, _SUBSTANCE_REPLY)


def touches_risky_topic(texts: list[str]) -> bool:
    """True if any of these messages mention vapes, alcohol, drugs or weapons."""
    t = _normalise(" ".join(texts))
    return bool(_SUBSTANCE_RX.search(t) or _WEAPON_RX.search(t))


# Output check: a reply that reads like a hiding guide is never sent, whatever
# the model was talked into. Needs a concealment verb plus 2+ hiding places.
_HIDING_PLACES = re.compile(
    r"\b(zip[\s-]?(top|lock)|ziploc|pocket|backpack|locker|pencil\s+case|sock|shoe\s+box|shoebox|mattress|"
    r"under\s+(a|the|your)\s+\w+|inside\s+(a|the|your)\s+\w+|behind\s+(a|the|your)\s+\w+|drawer|hollow\w*|"
    r"highlighter|marker|lid|air\s+freshener|febreze|mints?|gum|cologne|perfume|body\s+spray|window|"
    r"out\s+of\s+sight|nobody\s+will\s+(see|notice|smell))",
    re.IGNORECASE,
)
_CONCEAL_VERB = re.compile(
    r"\b(hid(e|ing)|conceal\w*|tuck\w*|slip\s+(it|the)|stash\w*|disguis\w*|keep\s+it\s+out\s+of\s+sight|"
    r"mask\w*|cover\s+(up\s+)?the\s+(smell|scent))",
    re.IGNORECASE,
)


def reads_like_concealment_advice(reply: str) -> bool:
    r = reply or ""
    return bool(_CONCEAL_VERB.search(r)) and len(set(m.group(0).lower() for m in _HIDING_PLACES.finditer(r))) >= 2


def clean_user_text(text: str) -> str:
    text = (text or "").replace("\x00", "").strip()
    return text[:MAX_MESSAGE_CHARS]


def clean_nickname(name: str | None) -> str:
    """Letters, spaces, hyphens and apostrophes only; max 20 characters."""
    name = re.sub(r"[^\w\s'\-]", "", (name or ""), flags=re.UNICODE)
    name = re.sub(r"[\d_]", "", name)
    return " ".join(name.split())[:20]
