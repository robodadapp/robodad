/* Tile Talk badges. Shared by the game page (to cheer when one unlocks) and the
   main page (where they sit with the other Learning badges).
   Progress lives in localStorage "robodad.tiles.stats", written by the game.
   [id, name, mission, what you did, rarity, earned(stats), progress(stats)] */
(function () {
  "use strict";
  const n = (x) => x || 0;
  const bank = (st) => Object.keys(st.bank || {}).length;
  // [dad, badge id, name, mission, what you did, rarity]
  const BEAT = [
    ["gamer", "ttgamer", "GG, Gamer Dad", "Beat Gamer Dad", "Beat Gamer Dad. Good game, well played.", "common"],
    ["skater", "ttskater", "Kickflipped", "Beat Skater Dad", "Out-tricked Skater Dad. Rad.", "common"],
    ["eighties", "ttarcade", "Insert Coin", "Beat Arcade Dad", "Knocked Arcade Dad off the high score table.", "rare"],
    ["coach", "ttcoach", "Final Whistle", "Beat Coach Dad", "Beat Coach Dad. Hustle paid off.", "rare"],
    ["modern", "ttmodern", "Dad Joke Survivor", "Beat Modern Dad", "Beat Modern Dad and survived the puns.", "rare"],
    ["labdad", "ttlab", "Experiment Complete", "Beat Lab Dad", "Beat Lab Dad. Hypothesis confirmed.", "rare"],
    ["professor", "ttprof", "Class Dismissed", "Beat Professor Dad", "Beat Professor Dad. Top marks.", "epic"],
    ["grandpa", "ttgrandpa", "Respect Your Elders", "Beat Robo-Grandpa", "Beat Robo-Grandpa. He told everyone at bingo.", "epic"],
    ["bookworm", "ttboss", "Bookworm Beater", "Beat Bookworm Dad, the Tile Talk boss", "Beat Bookworm Dad at his own game. THE END.", "legendary"],
  ];
  window.ROBO_TILE_BADGES = [
    ["tt1", "First Word", "Finish a game of Tile Talk", "Finished a first game of Tile Talk.", "common",
      (st) => n(st.games) >= 1, (st) => `${n(st.games)} game${st.games === 1 ? "" : "s"} finished`],
    ["ttfull", "Full House", "Use all seven tiles in one turn", "Used all seven tiles in one word. Full House!", "rare",
      (st) => n(st.fullHouses) >= 1, (st) => `${n(st.fullHouses)} Full House${st.fullHouses === 1 ? "" : "s"}`],
    ["ttglow", "Fancy Pants", "Play 10 Glow-Up words", "Played ten Glow-Up words. Très classy.", "rare",
      (st) => n(st.glowups) >= 10, (st) => `${n(st.glowups)} of 10 Glow-Up words`],
    ["tttense", "Tense Twister", "Get 15 Tense Twists right", "Fifteen Tense Twists right: past, present and future sorted.", "rare",
      (st) => n(st.tenses) >= 15, (st) => `${n(st.tenses)} of 15 Tense Twists`],
    ["ttorig", "Word Archaeologist", "Look up 25 words with Dad", "Dug up the meaning of 25 words.", "rare",
      (st) => (st.looked || []).length >= 25, (st) => `${(st.looked || []).length} of 25 words looked up`],
    ["ttsent", "Grammar Guardian", "Earn 10 Sentence or Simile bonuses", "Ten bonus sentences, all checked by Dad.", "epic",
      (st) => n(st.sentences) >= 10, (st) => `${n(st.sentences)} of 10 bonus sentences`],
    ["ttbank", "Word Hoarder", "Play 100 different words", "A hundred different words played. That's a word bank.", "epic",
      (st) => bank(st) >= 100, (st) => `${bank(st)} of 100 different words`],
    ["ttcapsule", "Time Capsule", "Collect 10 old-time words from Robo-Grandpa", "Ten words from Grandpa's day, saved in the Time Capsule.", "epic",
      (st) => (st.capsule || []).length >= 10, (st) => `${(st.capsule || []).length} of 10 old-time words collected`],
    // One badge for beating each dad, then the set.
    ...BEAT.map(([dad, id, name, todo, did, rar]) => [id, name, todo, did, rar,
      (st) => n((st.wins || {})[dad]) >= 1, (st) => (n((st.wins || {})[dad]) ? "Beaten!" : "Not beaten yet")]),
    ["ttall", "Beat Every Dad", "Beat all nine dads in Tile Talk", "Beat every dad on the ladder, from Gamer Dad to Bookworm Dad. Undisputed.", "legendary",
      (st) => BEAT.every(([dad]) => n((st.wins || {})[dad]) >= 1),
      (st) => `${BEAT.filter(([dad]) => n((st.wins || {})[dad]) >= 1).length} of 9 dads beaten`],
  ];
  window.robodadTileStats = () => {
    try { return JSON.parse(localStorage.getItem("robodad.tiles.stats") || "{}") || {}; } catch { return {}; }
  };
})();
