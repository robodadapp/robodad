"""Build the Tile Talk word lists from public sources.

Inputs (download first, see the README note at the top of static/tiles-engine.js):
  enable1.txt        ENABLE word list (public domain), one word per line
  common10k.txt      google-10000-english-no-swears.txt (common English words)
  common20k.txt      20k.txt from the same project

Outputs:
  static/tiles-words.txt    every playable word, teen-safe, sorted
  static/tiles-common.txt   everyday words the lower dads are allowed to play

Usage: python scripts/build_tiles_words.py <dir with the three inputs>
"""
import os
import sys

# Teen-safe filter. RoboDad is for 13+, so slurs, swearing and sexual words are
# never playable, by anyone. Three kinds of rule, picked to avoid wiping out
# innocent words (swank, therapist, retardant, analogy...):
#   CONTAINS  - removed if the root appears anywhere in the word
#   PREFIX    - removed if the word starts with the root
#   EXACT     - removed if the word is the root or a simple inflection of it
CONTAINS = ["fuck", "shit", "cunt", "cocksuck", "motherf"]
PREFIX = ["nigg", "fagg", "whore", "slut", "wank", "dildo", "jizz", "porn", "masturb",
          "bitch", "asshole", "arsehole", "bastard", "twat", "pedoph", "paedoph", "sodom",
          "fellat", "cunnil", "orgasm", "sexpot"]
EXACT = """
ass arse arses asses bollock bollocks bugger crap crappy damn damned damning goddamn goddamned dick dicks
piss pissed pisser pissing prick pricks cock cocks turd turds jism tit tits titty titties boob boobs booby
porno horny hornier horniest hornily horniness sexy sexier sexiest penis penes penises vagina vaginae vaginas vulva vulvae vulvas clit clits
clitoris scrotum scrota scrotums testicle testicles nipple nipples anus anuses semen erotic erotica
rape raped raper rapers rapes raping rapist rapists incest incests pimp pimps pimped pimping
negro negroes coon coons kike kikes spic spics spick spicks chink chinks gook gooks wetback wetbacks
raghead ragheads dyke dykes fag fags fagot fagots homo homos queer queers tranny trannies retard retards
retarded spaz spazz gimp gimps gimpy cripple crippled honky honkie honkies wop wops dago dagos dagoes kraut
krauts jap japs japed japing paki gyp gyps gypped gypping gypsy gypsies squaw squaws redskin redskins
darkie darkies golliwog golliwogs mongoloid mongoloids heeb hebe hebes yid yids crackhead crackheads
nazi nazis hooker hookers harlot harlots strumpet strumpets slattern
""".split()


TWO_LETTER = """am an as at be by do go he hi if in is it me my no of oh ok on or ox so to up us we
ah ha ho yo yes""".split()


def blocked(w: str) -> bool:
    if any(r in w for r in CONTAINS):
        return True
    if any(w.startswith(r) for r in PREFIX):
        return True
    return w in EXACT_SET


EXACT_SET = set(EXACT)


def main(src: str) -> None:
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    words = [w.strip().lower() for w in open(os.path.join(src, "enable1.txt"))]
    words = sorted({w for w in words if 2 <= len(w) <= 15 and w.isalpha() and w.isascii()})
    removed = [w for w in words if blocked(w)]
    keep = [w for w in words if not blocked(w)]
    kept = set(keep)
    # Everyday words. The frequency lists come from web text, so short entries
    # include junk (ut, nu, de): two-letter words come from a hand-picked list,
    # three-letter words only from the top 10k, longer words from the top 20k.
    common = {w for w in TWO_LETTER if w in kept}
    for name, min_len in (("common10k.txt", 3), ("common20k.txt", 4)):
        for w in open(os.path.join(src, name)):
            w = w.strip().lower()
            if w in kept and len(w) >= min_len:
                common.add(w)
    with open(os.path.join(root, "static", "tiles-words.txt"), "w") as f:
        f.write("\n".join(keep) + "\n")
    with open(os.path.join(root, "static", "tiles-common.txt"), "w") as f:
        f.write("\n".join(sorted(common)) + "\n")
    print(f"kept {len(keep)} words, removed {len(removed)}, common {len(common)}")
    if "-v" in sys.argv:
        print(" ".join(removed))


if __name__ == "__main__":
    main(sys.argv[1])
