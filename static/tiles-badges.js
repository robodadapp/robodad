/* Tile Talk badges. Shared by the game page (to cheer when one unlocks) and the
   main page (where they sit with the other Learning badges).
   Progress lives in localStorage "robodad.tiles.stats", written by the game.
   [id, name, mission, what you did, rarity, earned(stats), progress(stats)] */
(function () {
  "use strict";
  const n = (x) => x || 0;
  const bank = (st) => Object.keys(st.bank || {}).length;
  window.ROBO_TILE_BADGES = [
    ["tt1", "First Word", "Finish a game of Tile Talk", "Finished a first game of Tile Talk.", "common",
      (st) => n(st.games) >= 1, (st) => `${n(st.games)} game${st.games === 1 ? "" : "s"} finished`],
    ["ttfull", "Full House", "Use all seven tiles in one turn", "Used all seven tiles in one word. Full House!", "rare",
      (st) => n(st.fullHouses) >= 1, (st) => `${n(st.fullHouses)} Full House${st.fullHouses === 1 ? "" : "s"}`],
    ["ttglow", "Fancy Pants", "Play 10 Glow-Up words", "Played ten Glow-Up words. Très classy.", "rare",
      (st) => n(st.glowups) >= 10, (st) => `${n(st.glowups)} of 10 Glow-Up words`],
    ["tttense", "Time Traveller", "Get 15 Tense Twists right", "Fifteen Tense Twists right: past, present and future sorted.", "rare",
      (st) => n(st.tenses) >= 15, (st) => `${n(st.tenses)} of 15 Tense Twists`],
    ["ttorig", "Word Archaeologist", "Look up 25 words with Dad", "Dug up the meaning of 25 words.", "rare",
      (st) => (st.looked || []).length >= 25, (st) => `${(st.looked || []).length} of 25 words looked up`],
    ["ttsent", "Grammar Guardian", "Earn 10 Sentence or Simile bonuses", "Ten bonus sentences, all checked by Dad.", "epic",
      (st) => n(st.sentences) >= 10, (st) => `${n(st.sentences)} of 10 bonus sentences`],
    ["ttbank", "Word Hoarder", "Play 100 different words", "A hundred different words played. That's a word bank.", "epic",
      (st) => bank(st) >= 100, (st) => `${bank(st)} of 100 different words`],
    ["ttboss", "Bookworm Beater", "Beat Bookworm Dad, the Tile Talk boss", "Beat Bookworm Dad at his own game.", "legendary",
      (st) => n((st.wins || {}).bookworm) >= 1, (st) => (n((st.wins || {}).bookworm) ? "Beaten!" : "Not beaten yet")],
  ];
  window.robodadTileStats = () => {
    try { return JSON.parse(localStorage.getItem("robodad.tiles.stats") || "{}") || {}; } catch { return {}; }
  };
})();
