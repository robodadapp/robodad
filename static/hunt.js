/* The Lost Cartridge: RoboDad's puzzle hunt. Hand-written chapters and hints.
   Each chapter's first hint is a Word clue that pays off words from Vocabulary with Dad.
   Answers are checked on the server (and only stored there as hashes). */
window.HUNT = {
  title: "The Lost Cartridge",
  chapters: {
    1: {
      name: "Scrambled Memory", kicker: "Chapter 1 of 5", who: "Professor Dad's chalkboard",
      story: "Kiddo? It's me. Power surge. My memory chip's scrambled. I hid my favourite cartridge, DAD QUEST, and split the password into five pieces so nobody could steal it. Now I can't remember a single one. First piece is a maths problem. Of course it is.",
      puzzle: `<div class="hunt-board"><p>Solve for <i>x</i>. Then turn each answer into a letter: A&nbsp;=&nbsp;1, B&nbsp;=&nbsp;2, C&nbsp;=&nbsp;3…</p>
        <ol><li>3x − 5 = 25</li><li>2x + 1 = 31</li><li>x ÷ 5 = 5</li><li>x² = 256 <small>(x is positive)</small></li><li>7x = 7</li><li>5x − 3 = 17</li></ol></div>`,
      hints: ["Word clue: the answer is a compound word. The first half is a synonym for elation; the second is something you press with your thumbs. Dad calls it vintage. You might call it obsolete.", "Solve each one for x, then count along the alphabet.", "The first answer is 10, which is J."],
      solved: "JOYPAD. That's it! The first memory's coming back…",
    },
    2: {
      name: "Up the Stairs", kicker: "Chapter 2 of 5", who: "Bookworm Dad's note",
      story: "Ah, the second piece. I wrote it in French so my brother couldn't read it. Smart. Too smart, apparently.",
      puzzle: `<div class="hunt-note"><p lang="fr">« J'ai caché le deuxième morceau tout en haut de la maison, sous le toit, là où on range les vieilles boîtes et les décorations de Noël. Comment s'appelle cette pièce en anglais ? »</p>
        <details><summary>Prefer Spanish?</summary><p lang="es">«Escondí la segunda pieza en lo más alto de la casa, debajo del techo, donde guardamos las cajas viejas y los adornos de Navidad. ¿Cómo se llama ese cuarto en inglés?»</p></details></div>`,
      hints: ["Word clue: this room takes its name from Attica in ancient Greece, where buildings had a decorated top storey. Dad stores his nostalgia up there.", "“Le grenier” in French, “el desván” in Spanish. Now say it in English.", "Five letters, starts with A."],
      solved: "The attic! Of course. Who keeps a password in the attic? Me, apparently.",
    },
    3: {
      name: "The Melody", kicker: "Chapter 3 of 5", who: "A strange signal on RoboRadio",
      story: "Something's coming through on the radio. Five notes, over and over. I think past-me left a message in music.",
      puzzle: `<div class="hunt-keys" data-melody="B A D G E"><button class="primary hunt-play" type="button">▶ Play the signal</button>
        <div class="keys" aria-label="Piano keys">${["C", "D", "E", "F", "G", "A", "B"].map(n => `<span class="key" data-note="${n}"><b>${n}</b></span>`).join("")}</div>
        <p class="small">No sound? Just watch which keys light up.</p></div>`,
      hints: ["Word clue: the five notes spell a noun. It's an emblem you earn, a token of achievement.", "Musical notes are named with the letters A to G.", "Write down the five keys in order. It's something you collect in RoboDad."],
      solved: "BADGE! Past-me was a musical genius. Present-me can't hum.",
    },
    4: {
      name: "Dad's Attic", kicker: "Chapter 4 of 5", who: "robodad.app/attic",
      story: "Last thing I remember: climbing up to the attic with a box. Go have a look around. Mind the dust.",
      puzzle: `<p><a class="primary hunt-link" href="/attic">Climb up to the attic →</a></p>
        <p class="small">Found the password up there? Type it into the secret code box, just like the others.</p>`,
      hints: ["Word clue: “salary” may trace back to sal, the Latin for salt. Dad wants his first one, after deductions. Scrutinize the paystub.", "Take-home pay is gross pay minus every deduction.", "The three deductions add up to $88."],
      solved: "392. My first paycheque. I bought a cassette player and a bag of chips. No regrets.",
    },
    5: {
      name: "The Label", kicker: "Chapter 5 of 5", who: "RoboDad's latest post",
      story: "Found it! The cartridge box. I posted a photo of the label, but the password's hiding in plain sight. Classic me.",
      puzzle: `<figure class="hunt-post"><div class="hp-img"><span>DAD QUEST</span><small>© 1986 RoboDad Games</small></div>
        <figcaption><b>robodadapp</b> Found this old thing in the attic. Still works? 👀<br>
        <span class="tags">#DadJokes #Arcade #DadLife #Quest #Unlocked #Eighties #Secret #Teamwork</span></figcaption></figure>`,
      hints: ["Word clue: an acrostic hides a message in the first letters of lines or words. Robo-Grandpa would spot it in a second.", "Look at the first letter of each hashtag.", "Eight letters, two words, and it's the name of the game."],
      solved: "",
    },
  },
  finale: {
    title: "Cartridge found!",
    line: "You found it. Best co-op partner a robot dad could ask for.",
    note: "P.S. Found this stuck to the box: “An old time capsule in the garage, with a lock on it. Something tells me we'll need it in the new year…”",
  },
};
