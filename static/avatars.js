// RoboDad's avatars: one robot dad per decade, each with three little "idle moves".
// Every avatar is drawn on the same 64x64 grid so they can swap freely.
// Parts that only appear during a move carry opacity="0" and class "mv";
// the page's CSS animates them when the svg gets a "do-<move>" class.
(() => {
  const INK = "var(--ink)";
  // Skin tones: face, neck and hands read --skin (falls back to the look's metal). Face features read --face-ink,
  // so in dark looks (light outlines) a toned face keeps dark eyes and a dark smile instead of going negative.
  const SKIN = "var(--skin, var(--metal))";
  const FACE = "var(--face-ink, var(--ink))";
  const TONES = { steel:null, t1:"#F1D2B6", t2:"#DDAE87", t3:"#C28B60", t4:"#9E6A44" };
  const TONE_NAMES = { steel:"Steel", t1:"Light", t2:"Medium light", t3:"Medium", t4:"Medium deep" };
  const FACE_INK = "#2B1D16";
  const neck = `<rect x="27.5" y="44" width="9" height="6.5" fill="${SKIN}" stroke="${INK}" stroke-width="2"/>`;
  const head = `<rect x="12" y="16" width="40" height="30" rx="11" fill="${SKIN}" stroke="${INK}" stroke-width="2.4"/>
    <rect x="8" y="26" width="5" height="9" rx="2.5" fill="${INK}"/><rect x="51" y="26" width="5" height="9" rx="2.5" fill="${INK}"/>`;
  const smile = `<path class="mouth" d="M25.5 39.5 Q32 43 38.5 39.5" fill="none" stroke="${FACE}" stroke-width="2.4" stroke-linecap="round"/>`;
  const eyes = `<g class="eye eye-l"><circle cx="23" cy="30" r="3.2" fill="${FACE}"/><circle cx="24.1" cy="28.9" r="1" fill="#fff"/></g>
    <g class="eye eye-r"><circle cx="41" cy="30" r="3.2" fill="${FACE}"/><circle cx="42.1" cy="28.9" r="1" fill="#fff"/></g>`;
  // ---------- Faces ----------
  // Each dad has his own eyes, brows and mouth, so he reads as a person and not a costume.
  // Class names are what the moves and expressions animate: eye / eye-l / eye-r, brow / brow-l / brow-r, mouth.
  const eye = (side, cx, o = {}) => {
    const cy = o.cy ?? 30, r = o.r ?? 3.2;
    let inner;
    if (o.happy) inner = `<path d="M${cx - 3.3} ${cy + 1.3} Q${cx} ${cy - 3.6} ${cx + 3.3} ${cy + 1.3}" fill="none" stroke="${FACE}" stroke-width="2.3" stroke-linecap="round"/>`;
    else {
      inner = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${FACE}"/><circle cx="${cx + 1.1}" cy="${cy - 1.1}" r="${o.hl ?? 1}" fill="#fff"/>`;
      if (o.lid) {                               // a relaxed upper lid covering the top part of the eye
        const top = cy - r - .7, h = 2 * r * o.lid + .7;
        inner += `<rect x="${cx - r - .7}" y="${top}" width="${2 * r + 1.4}" height="${h}" fill="${SKIN}"/><path d="M${cx - r - .5} ${top + h} H${cx + r + .5}" stroke="${FACE}" stroke-width="1.3" stroke-linecap="round"/>`;
      }
    }
    return `<g class="eye eye-${side}">${inner}</g>`;
  };
  const eyesOf = (o = {}) => eye("l", 23, o.l || o) + eye("r", 41, o.r || o);
  const brows = (l, r, w = 1.7) => `<path class="brow brow-l" d="${l}" fill="none" stroke="${FACE}" stroke-width="${w}" stroke-linecap="round"/><path class="brow brow-r" d="${r}" fill="none" stroke="${FACE}" stroke-width="${w}" stroke-linecap="round"/>`;
  const softBrows = brows("M19.5 24.7 Q23 22.9 26.5 24.5", "M37.5 24.5 Q41 22.9 44.5 24.7");
  const line = (d, w = 2.4) => `<path class="mouth" d="${d}" fill="none" stroke="${FACE}" stroke-width="${w}" stroke-linecap="round"/>`;
  const MOUTH = {
    smirk: line("M25.8 40.2 Q32 43.6 38.8 38.2"),                // one corner up
    side: line("M26.2 39.9 Q32 44.2 38.6 38.8"),
    lopsided: line("M25 38.9 Q29.5 45 39 39.7", 2.6),
    wide: line("M24.5 39 Q32 44.6 39.5 39"),
    gentle: line("M27 40 Q32 42.5 37 40", 2.2),
    cosy: line("M27.2 39.6 Q32 43.6 36.8 39.6"),
    grin: `<path class="mouth" d="M25.2 38.6 H38.8 Q38.4 44.8 32 44.8 Q25.6 44.8 25.2 38.6Z" fill="#fff" stroke="${FACE}" stroke-width="1.8" stroke-linejoin="round"/>`,
  };

  const torso = (fill) => `<path d="M3 64 C5 55 12 50.5 21 49.5 L32 51 L43 49.5 C52 50.5 59 55 61 64 Z" fill="${fill}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>`;
  const spark = (x, y, s = 1) => `<path transform="translate(${x} ${y}) scale(${s})" d="M0 -3.6 L1 -1 L3.6 0 L1 1 L0 3.6 L-1 1 L-3.6 0 L-1 -1Z" fill="#fff" stroke="#F2B533" stroke-width=".6"/>`;

  const AVATARS = {
    fifties: {
      name: "Diner Dad", era: "1950s", moves: ["collar", "shine", "comb"],
      svg: `<g class="body">
        <path d="M3 64 C5 55 12 50.5 21 49.5 L32 52 L43 49.5 C52 50.5 59 55 61 64 Z" fill="var(--jacket)" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>
        <path d="M23 49.5 L41 49.5 L32 63 Z" fill="#fff" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/>
        <path d="M23 49.5 L29 53 L26 57 Z M41 49.5 L35 53 L38 57 Z" fill="#fff" stroke="${INK}" stroke-width="1.4" stroke-linejoin="round"/>
        <path d="M21 49.5 L26.5 57.5 L29.5 64 L20 64 L15 54 Z M43 49.5 L37.5 57.5 L34.5 64 L44 64 L49 54 Z" fill="var(--jacket2)" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/>
      </g>${neck}
      <g class="hd">${head}
        <g transform="translate(32 25) scale(1.16 1.03) translate(-32 -25)"><path d="M14 25 C12.5 17 15 10.5 21 7.5 C24 2.5 31 0.8 37 3 C43 2.2 49.5 6 50.5 13.5 L50 27 C49 22.5 46 20 41 20 C37.5 20 35 20.8 32 23 C29 20.8 26.5 20 23 20 C18 20 15 22.5 14 27 Z" fill="var(--hair)" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>
        <path class="hair-shine" d="M20.5 12 C25 7.5 32 6 38.5 8 C43 9.2 46.5 11.5 48.5 15 M23.5 16 C29.5 12.5 38 12.5 46 16.5 M25 7 C29 4.8 33.5 4.5 37 5.5" fill="none" stroke="#fff" stroke-width="1.3" stroke-linecap="round" opacity=".4"/>
        </g><path d="M21 17 C17 8 28 3 38 6 C47 8 49 17 42 19 C37 20 35 15 39 13 C32 11 27 15 29 21 C25 22 22 20 21 17Z" fill="var(--hair)" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/><path d="M25 12 C28 8 35 7 40 9" fill="none" stroke="#fff" stroke-width="1.8" opacity=".65" stroke-linecap="round"/>${eyesOf({r:3.6,hl:1.3})}${brows("M18.5 24.9 Q23 23.7 27.5 24.7", "M36.5 24.2 Q41 21.8 45.5 23.8")}
        <g transform="translate(32 30) scale(1.17 1.18) translate(-32 -30)"><path fill-opacity=".5" d="M16 26.5 H30 Q30.5 34 23 34 Q16 34 16 26.5Z M48 26.5 H34 Q33.5 34 41 34 Q48 34 48 26.5Z" fill="var(--lens)"/>
        <path d="M30 27.5 H34" stroke="var(--lens)" stroke-width="2"/>
        <path class="glint" d="M19 28.5 L23 28.5 M37 28.5 L41 28.5" stroke="#fff" stroke-width="1.5" stroke-linecap="round" opacity=".75"/>
        </g>${MOUTH.lopsided}
        <g class="mv mv-spark" opacity="0">${spark(45.5, 26, 1.1)}</g>
        <g class="mv mv-comb" opacity="0"><rect x="0" y="0" width="13" height="3.2" rx="1.2" fill="#D7263D" stroke="${INK}" stroke-width="1"/>
          <path d="M1.6 3.2v2.4M3.8 3.2v2.4M6 3.2v2.4M8.2 3.2v2.4M10.4 3.2v2.4" stroke="#D7263D" stroke-width="1.1"/></g>
      </g>
      <g class="mv mv-collar" opacity="0"><path d="M22.5 51 L12.5 37.5 L20.5 40.5 L27.5 47.5 Z M41.5 51 L51.5 37.5 L43.5 40.5 L36.5 47.5 Z" fill="var(--jacket2)" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/>
        <path d="M14.5 39.5 L21 42 M49.5 39.5 L43 42" stroke="#fff" stroke-width="1.2" stroke-linecap="round" opacity=".55"/></g>`,
    },
    modern: {
      name: "Modern Dad", era: "Today", moves: ["wave", "wink", "sip"],
      svg: `<g class="body">${torso("#E8A33A")}
        <path d="M22 49.8 L32 64 L42 49.8Z" fill="#243257" stroke="${INK}" stroke-width="1.5"/><path d="M22 49.8 L32 64 L27 64 L17.5 51.5Z M42 49.8 L32 64 L37 64 L46.5 51.5Z" fill="#C9822A" stroke="${INK}" stroke-width="1.4" stroke-linejoin="round"/><circle cx="29.3" cy="62" r="1.1" fill="#F4EEE2"/>
      </g>${neck}
      <g class="hd">${head}
        <path d="M14 26.5 C12.5 18 17.5 11 26 10 C31 7.8 40 8.2 45 11.2 C49.5 14 51.2 19.5 50 26.5 C48.5 22 45.5 19.6 40.5 19.6 L26 19.6 C20 19.6 15.5 22 14 26.5Z" fill="#6B4A32" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>
        <path d="M25 11.5 C29 15 36 16.4 45 15.5" fill="none" stroke="#fff" stroke-width="1.2" opacity=".35" stroke-linecap="round"/>
        <path d="M13.6 35 Q15 44.6 23 44.9 H41 Q49 44.6 50.4 35 Q46 41.6 38.5 42.3 Q32 44.8 25.5 42.3 Q18 41.6 13.6 35Z" fill="${FACE}" opacity=".12"/>${brows("M18 23.5 Q23 20.5 27.5 23.5","M36.5 21.5 Q41 18.5 46 21.8",2.8)}${eyesOf({r:4.2,hl:1.6})}${MOUTH.lopsided}
      </g>
      <g class="mv mv-mug" opacity="0"><path d="M35 36 h10 v8 a3 3 0 0 1 -3 3 h-4 a3 3 0 0 1 -3 -3z" fill="#fff" stroke="${INK}" stroke-width="1.6"/>
        <path d="M45 38 h1.5 a2.2 2.2 0 0 1 0 4.4 H45" fill="none" stroke="${INK}" stroke-width="1.6"/><rect x="37" y="39.5" width="6" height="2" fill="#D7263D"/>
        <path d="M38 33.5 c-1 -1.2 1 -2 0 -3.4 M41.5 33.5 c-1 -1.2 1 -2 0 -3.4" stroke="#8796A5" stroke-width="1.1" fill="none" stroke-linecap="round"/></g>
      <g class="mv mv-hand" opacity="0"><rect x="51.5" y="49" width="7" height="17" rx="2" fill="#E8A33A" stroke="${INK}" stroke-width="1.6"/>
        <rect x="50.5" y="40" width="9" height="10.5" rx="3.5" fill="${SKIN}" stroke="${INK}" stroke-width="1.8"/>
        <path d="M52.6 40.5 v-3 M55 40.2 v-4 M57.4 40.5 v-3" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>
        <path d="M52.6 40.5 v-3 M55 40.2 v-4 M57.4 40.5 v-3" stroke="${SKIN}" stroke-width="1.2" stroke-linecap="round"/></g>`,
    },
    eighties: {
      name: "Arcade Dad", era: "1980s", moves: ["bob", "shades", "oneup"],
      svg: `<g class="body">${torso("#22B8CF")}
        <path d="M7 61 L20 52.5 L21.5 55.5 L9 63.5 Z M57 61 L44 52.5 L42.5 55.5 L55 63.5 Z" fill="#FF3EA5"/>
        <path d="M32 52 V64" stroke="${INK}" stroke-width="1.6"/>
      </g>${neck}
      <path d="M22.5 47.5 L41.5 47.5 L42.5 52 L32 53.5 L21.5 52Z" fill="#7048E8" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/>
      <g class="hd">${head}
        <g transform="translate(32 24) scale(1.1 1.05) translate(-32 -24)"><path d="M10.5 29 C7 18 12 8.5 21.5 6 C27.5 1.5 37.5 1.2 43.5 5.2 C52.5 7.5 57.5 17 53.5 29 C51 22.5 47 19.6 41 19.6 L23 19.6 C17 19.6 13 22.5 10.5 29Z" fill="#8A5A2B" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>
        <path d="M18 12 C22 9 27 8 31 9.5 M33 9.5 C37 8 42 9 46 12 M15 18 C18 14 23 13 27 14 M37 14 C41 13 46 14 49 18" stroke="#fff" opacity=".3" stroke-width="1.2" fill="none" stroke-linecap="round"/>
        </g><path d="M12.5 21.5 C14 18 18 16.5 23 16.5 L41 16.5 C46 16.5 50 18 51.5 21.5 L51.5 24.5 L12.5 24.5Z" fill="#FF3EA5" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/>
        <path d="M13.5 22.8 H50.5" stroke="#fff" stroke-width="1" opacity=".7"/>
        <path d="M8 27 C5 1 59 1 56 27" fill="none" stroke="#3A3A44" stroke-width="3.6"/><circle cx="8.5" cy="31" r="8" fill="#FF8C1A" stroke="${INK}" stroke-width="2"/><circle cx="55.5" cy="31" r="8" fill="#FF8C1A" stroke="${INK}" stroke-width="2"/><circle cx="8.5" cy="31" r="3.6" fill="#FFE600" stroke="${INK}" stroke-width="1.2"/><circle cx="55.5" cy="31" r="3.6" fill="#FFE600" stroke="${INK}" stroke-width="1.2"/>
        ${eyesOf({r:4.4,hl:1.8})}${MOUTH.grin}
        <g class="mv mv-shades" opacity="0"><path d="M15.5 26 H30.5 L29.5 32.5 Q23 35 17 32.5Z M48.5 26 H33.5 L34.5 32.5 Q41 35 47 32.5Z" fill="#111" stroke="#111" stroke-width="1"/>
          <path d="M30.5 27.5 H33.5" stroke="#111" stroke-width="2"/><path d="M18 28 L22 28 M36 28 L40 28" stroke="#FF3EA5" stroke-width="1.2" stroke-linecap="round"/></g>
      </g>
      <g class="mv mv-notes" opacity="0"><path d="M50 14 v-7 l5 -1.5 v6.5" fill="none" stroke="#FF3EA5" stroke-width="1.6"/>
        <circle cx="48.8" cy="14" r="1.8" fill="#FF3EA5"/><circle cx="53.8" cy="12.5" r="1.8" fill="#FF3EA5"/></g>
      <text class="mv mv-1up" opacity="0" x="32" y="11" text-anchor="middle" font-family="Nunito, sans-serif" font-size="10" font-weight="900" fill="#FFE600" stroke="#111" stroke-width="1" paint-order="stroke">1UP</text>`,
    },
    nineties: {
      name: "Video Store Dad", era: "1990s", moves: ["capflip", "pager", "wink"],
      svg: `<g class="body">${torso("#B23A3A")}
        <path d="M8 57 H56 M5 61.5 H59 M14 52 V64 M50 52 V64 M22 50 V64 M42 50 V64" stroke="#5E1515" stroke-width="1.6" opacity=".75"/>
        <path d="M23.5 49.5 L40.5 49.5 L37 64 L27 64Z" fill="#A7B1BA" stroke="${INK}" stroke-width="1.4" stroke-linejoin="round"/>
        <path d="M23 49.5 L28.5 55.5 L25.5 58.5 L20.5 51Z M41 49.5 L35.5 55.5 L38.5 58.5 L43.5 51Z" fill="#8E2C2C" stroke="${INK}" stroke-width="1.4" stroke-linejoin="round"/>
        <g class="pager"><rect x="44" y="56" width="8.5" height="6" rx="1.2" fill="#26262B" stroke="${INK}" stroke-width="1.2"/>
          <rect class="pager-scr" x="45.3" y="57.2" width="5.9" height="2.4" rx=".4" fill="#9CDB6A"/></g>
      </g>${neck}
      <g class="hd">${head}
        <path d="M13.5 23 C13.5 27 14.5 30 16.5 32 L20 22Z M50.5 23 C50.5 27 49.5 30 47.5 32 L44 22Z" fill="#4A3426" stroke="${INK}" stroke-width="1.4" stroke-linejoin="round"/>
        <g transform="translate(32 23) scale(1.12 1.14) translate(-32 -23)"><g class="cap"><path d="M12.5 23.5 C12.5 11 21 6 32 6 C43 6 51.5 11 51.5 23.5 Z" fill="#2B59C3" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>
          <path d="M22 8.5 C26 15 27 19 26.5 23.5 M42 8.5 C38 15 37 19 37.5 23.5" stroke="#1E3F8F" stroke-width="1.1" fill="none"/>
          <path d="M26.5 23.5 Q32 17.5 37.5 23.5" fill="${SKIN}" stroke="${INK}" stroke-width="1.6"/>
          <circle cx="32" cy="6.8" r="1.6" fill="#1E3F8F" stroke="${INK}" stroke-width="1"/></g>
        </g><path class="av-hair" display="var(--av-hair, inline)" d="M14 22 C9 28 11 36 15 39 C14 32 17 27 23 22Z M50 22 C55 28 53 36 49 39 C50 32 47 27 41 22Z" fill="#6B4A32" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/>${eyesOf({cy:31,r:4,hl:1.5,lid:.3})}${MOUTH.smirk}
      </g>
      <g class="mv mv-buzz" opacity="0"><path d="M42 57 l-2 -1 M42 60.5 l-2 1 M54.5 57 l2 -1 M54.5 60.5 l2 1" stroke="${INK}" stroke-width="1.2" stroke-linecap="round"/></g>`,
    },
    chef: {
      name: "Chef Dad", era: "Kitchen", moves: ["flip", "taste", "kiss"],
      svg: `<g class="body">${torso("#F7F8FA")}
        <path d="M25 50 L41 64" stroke="${INK}" stroke-width="1.3"/><g fill="#1F2A3A"><circle cx="22" cy="57" r="1.3"/><circle cx="23.5" cy="62" r="1.3"/><circle cx="42" cy="57" r="1.3"/><circle cx="43.5" cy="52.5" r="1.3"/></g>
        <path d="M22 49.5 Q32 53 42 49.5 L34.5 57 L32 61 L29.5 57Z" fill="#D7263D" stroke="${INK}" stroke-width="1.4" stroke-linejoin="round"/>
      </g>${neck}
      <g class="hd">${head}
        <path d="M13.5 23 L14 33 L17.5 29 L18 22Z M50.5 23 L50 33 L46.5 29 L46 22Z" fill="#4A3426" stroke="${INK}" stroke-width="1.1" stroke-linejoin="round"/>
        ${brows("M18 24.5 Q23 21 27.5 24","M36.5 22.5 Q41 19 46 22.8",2.6)}${eyesOf({ r:4.2, hl:1.6 })}${MOUTH.grin}
        <path d="M25 37.2 Q28.5 34.8 32 36.8 Q35.5 34.8 39 37.2 Q35.5 38.8 32 37.9 Q28.5 38.8 25 37.2Z" fill="#4A3426" stroke="${FACE}" stroke-width=".8" stroke-linejoin="round"/>
        <g fill="#fff" stroke="#B8C0C8" stroke-width=".6"><ellipse cx="45.5" cy="37.5" rx="3" ry="1.8" transform="rotate(-20 45.5 37.5)"/><circle cx="47.5" cy="34.5" r=".9"/></g>
        <g class="chat"><path d="M17 18 C6 17 7 4 18 6 C19 0 30 -0.5 33 3 C38 -0.5 50 1 49 7 C61 4 63 17 49 19Z" fill="#fff" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>
          <path d="M22 8 Q24 12 23 17 M33 5 V17 M44 8 Q42 12 43 17" stroke="#C9D3DC" stroke-width="1.3" fill="none" stroke-linecap="round"/>
          <rect x="14.5" y="16.5" width="35" height="6.5" rx="2" fill="#fff" stroke="${INK}" stroke-width="1.8"/></g>
      </g>
      <g class="mv mv-pan" opacity="0"><ellipse cx="50" cy="52" rx="10" ry="3.4" fill="#3A3F4A" stroke="${INK}" stroke-width="1.5"/><path d="M58.5 54 L64 60" stroke="#17181C" stroke-width="3" stroke-linecap="round"/>
        <ellipse class="cake" cx="50" cy="49.5" rx="6.5" ry="2.4" fill="#F2B84B" stroke="#9A5B1E" stroke-width="1.2"/></g>
      <g class="mv mv-spoon" opacity="0"><path d="M36.5 43 L50 55" stroke="#B07A44" stroke-width="3" stroke-linecap="round"/><ellipse cx="35.5" cy="42" rx="3.8" ry="3" fill="#C2562B" stroke="${INK}" stroke-width="1.4"/></g>
      <g class="mv mv-kiss" opacity="0"><rect x="37" y="41" width="10" height="9" rx="3.5" fill="${SKIN}" stroke="${INK}" stroke-width="1.6"/>
        <path d="M52 33 C49 29 54 26 55.5 30 C57 26 62 29 59 33 L55.5 36.5Z" fill="#E8416B" stroke="${INK}" stroke-width="1"/>${spark(52, 22, .9)}${spark(59, 42, .7)}</g>`,
    },
    skater: {
      name: "Skater Dad", era: "Late '90s", moves: ["beanie", "ollie", "fistbump"],
      svg: `<g class="body">${torso("#7D8793")}
        <path d="M32 54 V64" stroke="#C9D3DC" stroke-width="1.4"/><path d="M28 53.5 v6.5 M36 53.5 v6.5" stroke="#fff" stroke-width="1.3" stroke-linecap="round"/>
      </g>${neck}
      <path d="M18.5 50.5 C22 55.5 42 55.5 45.5 50.5 L43.5 48 C40 52 24 52 20.5 48Z" fill="#646E7A" stroke="${INK}" stroke-width="1.4" stroke-linejoin="round"/>
      <g class="hd">${head}
        <path d="M13 24 C12 28 13 31 15 33 L17 24Z M51 24 C52 28 51 31 49 33 L47 24Z" fill="#6B4A32" stroke="${INK}" stroke-width="1.2"/>
        ${eyesOf({r:4.3,hl:1.6,lid:.3})}<path class="av-hair" display="var(--av-hair, inline)" d="M13.5 24 L26 24 L22 27 L19 25.5 L17 31 L13.5 29Z" fill="#6B4A32" ${''}stroke="${INK}" stroke-width="1"/><g transform="rotate(-25 45 38)"><rect x="41" y="36" width="9" height="4" rx="2" fill="#F2C9A0" stroke="${INK}" stroke-width="1"/></g>${MOUTH.side}
        <g class="beanie"><path d="M40 5 C52 -1 63 6 60 22 C58 28 52 26 53 19 C54 12 50 10 45 11Z" fill="#C23B3B" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/><path d="M12.5 21 C11 9 20 3.5 32 3.5 C44 3.5 53 9 51.5 21Z" fill="#C23B3B" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>
          <path d="M22 6 C24 12 25 16 25 20 M32 4 V20 M42 6 C40 12 39 16 39 20" stroke="#9E2B2B" stroke-width="1.2" fill="none"/>
          <rect x="11" y="19" width="42" height="6.5" rx="3" fill="#9E2B2B" stroke="${INK}" stroke-width="1.8"/>
          <path d="M15 20 v4.5 M19 20 v4.5 M23 20 v4.5 M27 20 v4.5 M31 20 v4.5 M35 20 v4.5 M39 20 v4.5 M43 20 v4.5 M47 20 v4.5" stroke="#7A1F1F" stroke-width="1"/></g>
      </g>
      <g class="mv mv-board" opacity="0"><path d="M8 53 C9 54.8 11 56 14 56 H50 C53 56 55 54.8 56 53" fill="none" stroke="#E8572A" stroke-width="3" stroke-linecap="round"/>
        <path d="M13 54.6 H51" stroke="#1C1C1C" stroke-width="1"/><rect x="16" y="57.2" width="5" height="1.8" fill="#9AA5AE"/><rect x="43" y="57.2" width="5" height="1.8" fill="#9AA5AE"/>
        <g class="wheel"><circle cx="18.5" cy="60.5" r="2.4" fill="#F6E7A8" stroke="${INK}" stroke-width="1.1"/><path d="M18.5 58.5 v4" stroke="${INK}" stroke-width=".8"/></g>
        <g class="wheel"><circle cx="45.5" cy="60.5" r="2.4" fill="#F6E7A8" stroke="${INK}" stroke-width="1.1"/><path d="M45.5 58.5 v4" stroke="${INK}" stroke-width=".8"/></g></g>
      <g class="mv mv-fist" opacity="0"><rect x="24" y="44" width="16" height="13" rx="5" fill="${SKIN}" stroke="${INK}" stroke-width="2"/>
        <path d="M28 44.5 v5 M32 44.5 v5 M36 44.5 v5" stroke="${INK}" stroke-width="1.4"/>
        <path d="M20 47 l-3 -1.5 M20 51 l-3 1.5 M44 47 l3 -1.5 M44 51 l3 1.5" stroke="${INK}" stroke-width="1.3" stroke-linecap="round"/></g>`,
    },
    gamer: {
      name: "Gamer Dad", era: "Mid-2000s", moves: ["gg", "mash", "victory"],
      svg: `<g class="body">${torso("#252A3A")}
  <path d="M18 52.5 C18 48 23 48 27 48.5 H37 C41 48 46 48 46 52.5 C42 56.5 37 58 32 58 C27 58 22 56.5 18 52.5Z" fill="#363B4F" stroke="${INK}" stroke-width="1.5" stroke-linejoin="round"/>
  <path d="M28.8 53 L28.2 57 M35.2 53 L35.8 57" fill="none" stroke="#D93636" stroke-width="1.5" stroke-linecap="round"/>
  <rect x="20" y="58.5" width="24" height="4" rx="2" fill="#111" /><rect x="21" y="59.5" width="15" height="2" rx="1" fill="#2A52BE"/></g>${neck}
  <g class="hd">${head}
    <path d="M13 24 Q11 12 22 11 Q30 4 46 8 Q42 10 44 12 Q53 14 51.5 25 L48 19.5 Q39 16 30 19.5 Q23 18 17 20.5Z" fill="#2B2233" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>
    <path d="M27 13 Q33 7.5 42 9 Q35 11.5 32.5 16Z" fill="#C9A46A"/>
    <path d="M13.3 35 Q18 38.5 23 37.4 Q32 35.4 41 37.4 Q46 38.5 50.7 35 A9.7 9.7 0 0 1 41 44.7 H23 A9.7 9.7 0 0 1 13.3 35Z" fill="${FACE}" fill-opacity=".16"/>
    <path d="M8 27 C5 2 59 2 56 27" fill="none" stroke="#15171F" stroke-width="3.6"/>
    <rect x="1.5" y="21" width="13" height="19" rx="6" fill="#15171F" stroke="#2A52BE" stroke-width="2"/><rect x="49.5" y="21" width="13" height="19" rx="6" fill="#15171F" stroke="#2A52BE" stroke-width="2"/>
    <path class="cup-led" d="M5 30.5 h6 M53 30.5 h6" stroke="#2A52BE" stroke-width="2" stroke-linecap="round"/>
    ${brows("M18.5 24.8 L28 26","M36.5 25 L45.5 22.8",2.6)}
    <g class="eye eye-l"><path d="M18.8 28.4 L27.4 29.8 Q26.8 33.8 23 33.8 Q19.3 33.5 18.8 28.4Z" fill="${FACE}"/><circle cx="24.6" cy="31.3" r="1" fill="#fff"/></g>
    <g class="eye eye-r"><path d="M36.6 29.8 L45.2 27.6 Q45.2 33.6 41 33.8 Q37.2 33.6 36.6 29.8Z" fill="${FACE}"/><circle cx="42.8" cy="30.8" r="1" fill="#fff"/></g>
    <path class="mouth" d="M25.5 38.6 Q32 40.6 39.8 37 Q38 43.8 32 43.8 Q27 43.4 25.5 38.6Z" fill="#fff" stroke="${FACE}" stroke-width="1.8" stroke-linejoin="round"/>
    <g class="mic"><path d="M8 38 C9 47 15 48 20 45" fill="none" stroke="#15171F" stroke-width="2.6" stroke-linecap="round"/><rect x="18.5" y="42.5" width="7" height="5" rx="2.5" fill="#15171F" stroke="#2A52BE" stroke-width="1.2"/></g>
  </g>
      <text class="mv mv-gg" opacity="0" x="46" y="13" text-anchor="middle" font-family="Nunito, sans-serif" font-size="10" font-weight="900" fill="#2A52BE" stroke="#fff" stroke-width="1" paint-order="stroke">GG!</text>
      <g class="mv mv-pad" opacity="0"><path d="M18 51 C14 51 11 55 12 59 C13 62.5 17 62.5 19.5 60 L22 57.5 H42 L44.5 60 C47 62.5 51 62.5 52 59 C53 55 50 51 46 51Z" fill="#3A3F4A" stroke="${INK}" stroke-width="1.6"/>
        <path d="M20 54.5 v4 M18 56.5 h4" stroke="#C9D3DC" stroke-width="1.4"/>
        <circle class="pad-btn" cx="44" cy="55" r="1.3" fill="#2A52BE"/><circle class="pad-btn b2" cx="46.6" cy="57.2" r="1.3" fill="#FF5E7E"/><circle cx="41.6" cy="57.2" r="1.3" fill="#38B6FF"/><circle cx="44" cy="59.4" r="1.3" fill="#F2B533"/></g>
      <g class="mv mv-vic" opacity="0"><rect x="51.5" y="47" width="7" height="19" rx="2" fill="#22262E" stroke="${INK}" stroke-width="1.6"/>
        <rect x="49.5" y="38" width="11" height="10" rx="3.5" fill="${SKIN}" stroke="${INK}" stroke-width="1.8"/>
        <path d="M52.5 38.5 v3.5 M55 38.5 v3.5 M57.5 38.5 v3.5" stroke="${INK}" stroke-width="1.2"/></g>
      <g class="mv mv-sparks" opacity="0">${spark(47, 31)}${spark(61, 35, .8)}${spark(52, 27, .6)}</g>`,
    },
    bucket: {
      name: "Bucket Hat Dad", era: "Early 2000s", moves: ["hattip", "dad", "nod"],
      svg: `<g class="body">${torso("#F2B533")}<path d="M22 49.8 L32 56 L42 49.8" fill="none" stroke="#1B2A3A" stroke-width="2.2"/>
        <text class="num" x="32" y="63.5" text-anchor="middle" font-family="Nunito, sans-serif" font-weight="900" font-size="8" fill="#1B2A3A">04</text>
        <text class="mv mv-dad" opacity="0" x="32" y="63" text-anchor="middle" font-family="Nunito, sans-serif" font-weight="900" font-size="6.5" fill="#C2410C">#1 DAD</text>
      </g>${neck}
      <g class="hd">${head}
        <path d="M14 24 C13.5 28 14 31 15.5 33 L18 24Z M50 24 C50.5 28 50 31 48.5 33 L46 24Z" fill="#3A2A1E"/>
        <g transform="translate(32 24) scale(1.13 1.12) translate(-32 -24)"><g class="bucket"><path d="M15 20 C15 10 22 5.5 32 5.5 C42 5.5 49 10 49 20Z" fill="#4E7FB8" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>
          <path d="M16 15 H48" stroke="#3B6696" stroke-width="1.2"/>
          <path d="M8 24 C14 18.5 50 18.5 56 24 L53.5 27.5 C46 23.5 18 23.5 10.5 27.5Z" fill="#5B8EC8" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/></g>
        </g><g><ellipse cx="46" cy="7" rx="6" ry="5" fill="#E8572A" stroke="${INK}" stroke-width="1.6"/><path d="M51 6 L56 7.5 L51 9Z" fill="#FFD23F" stroke="${INK}" stroke-width="1"/><circle cx="48" cy="5.5" r="1.1" fill="#1B2A3A"/><path d="M41 6 L37 3 L40.5 9Z" fill="#E8572A" stroke="${INK}" stroke-width="1"/></g><circle cx="17.5" cy="37" r="3" fill="#FF8FA3" opacity=".6"/><circle cx="46.5" cy="37" r="3" fill="#FF8FA3" opacity=".6"/><g transform="translate(32 30) scale(1.08 1.35) translate(-32 -30)">${eyesOf({ happy:true })}</g><path class="mouth" d="M23.5 37.5 H40.5 Q40 46.5 32 46.5 Q24 46.5 23.5 37.5Z" fill="#fff" stroke="${FACE}" stroke-width="1.9" stroke-linejoin="round"/>
      </g>`,
    },
    dracula: {
      name: "Count Dadcula", era: "Halloween", season: "halloween", moves: ["cape", "bat", "bleh"],
      svg: `<g class="collar2"><g transform="translate(32 50) scale(1.1 1.28) translate(-32 -50)"><path d="M11 50 L3.5 28 L18.5 40 Z M53 50 L60.5 28 L45.5 40 Z" fill="#B3122E" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/>
        <path d="M9 44 L5.5 32 M55 44 L58.5 32" stroke="#E04A64" stroke-width="1.2" opacity=".8"/></g></g>
      <g class="body">${torso("#16121F")}
        <path d="M23 49.5 L41 49.5 L32 62 Z" fill="#fff" stroke="${INK}" stroke-width="1.4" stroke-linejoin="round"/>
        <path d="M24 49.5 L32 56 L40 49.5" fill="none" stroke="#B3122E" stroke-width="1.8"/>
        <circle cx="32" cy="57.6" r="2.5" fill="#F2B533" stroke="${INK}" stroke-width=".8"/>
      </g>${neck}
      <g class="hd">${head}
        <path d="M13 25 C12 15 19 8.5 32 8 C45 8.5 52 15 51 25 C49 21 45 19.5 40 19.5 C37 19.5 34.5 20.5 32 24.5 C29.5 20.5 27 19.5 24 19.5 C19 19.5 15 21 13 25Z" fill="#15121C" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>
        <path d="M19 14 C24 10.5 30 10 33 11 M36 11.5 C40 11 44 12.5 46.5 15" fill="none" stroke="#fff" stroke-width="1.2" opacity=".35" stroke-linecap="round"/>
        <path d="M25 9 C24 2 34 0 41 4 C36 4 34 7 35 9.5Z" fill="#15121C" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/>${brows("M18 25.4 Q22.5 23 27 25", "M37 24.2 Q41.5 21.2 46 24", 2)}
        ${eyesOf({r:4.2,hl:1.6})}${smile}
        <path class="fangs" d="M27.6 40.3 L29.2 45.4 L30.8 40.9 Z M33.2 40.9 L34.8 45.4 L36.4 40.3 Z" fill="#fff" stroke="${FACE}" stroke-width=".8" stroke-linejoin="round"/>
      </g>
      <path class="mv mv-bat" opacity="0" d="M0 0 C2 -3.5 4.5 -3.5 5.5 -1 C6.3 -3 7.7 -3 8.5 -1 C9.5 -3.5 12 -3.5 14 0 C12 -.6 10.5 1 9.3 2.2 C8.4 1.2 7.5 1.4 7 2.4 C6.5 1.4 5.6 1.2 4.7 2.2 C3.5 1 2 -.6 0 0Z" fill="#2A1F3D" stroke="#B3122E" stroke-width=".5"/>`,
    },
    filmi: {
      name: "Filmi Hero Dad", era: "1970s", moves: ["windflip", "shimmy", "dhishoom"],
      svg: `<g class="body">${torso("#C2185B")}
        <g fill="#FFD27A"><circle cx="10" cy="59" r=".9"/><circle cx="14" cy="55" r=".9"/><circle cx="18" cy="61" r=".9"/><circle cx="50" cy="56" r=".9"/><circle cx="54" cy="60" r=".9"/><circle cx="46" cy="61" r=".9"/></g>
        <path d="M23 49.5 L41 49.5 L35 64 L29 64Z" fill="#FFF3D6" stroke="${INK}" stroke-width="1.4" stroke-linejoin="round"/>
        <g transform="translate(32 50) scale(1.25 1.1) translate(-32 -50)"><path d="M23.5 49 L31 53 L23 61 L18.5 52Z M40.5 49 L33 53 L41 61 L45.5 52Z" fill="#FFF3D6" stroke="${INK}" stroke-width="1.5" stroke-linejoin="round"/>
        </g><path d="M32 54 V64" stroke="#E7C98E" stroke-width="1"/>
      </g>${neck}
      <g class="hd">${head}
        <path d="M13.5 25 L13.5 34 L16.5 34 L16.5 24Z M50.5 25 L50.5 34 L47.5 34 L47.5 24Z" fill="#2A1A12"/>
        <g transform="translate(32 26) scale(1.15 1.06) translate(-32 -26)"><g class="hair-f"><path d="M12.5 26 C9 17 14 6 25 5 C29 2.5 37 2.5 41 5 C52 6 56 16 51.5 26 C50 21 46 18.6 41 19 C38 15.5 34 15 31 17.5 C27.5 15 22 15.5 20 19.5 C16.5 20 14 22.5 12.5 26Z" fill="#2A1A12" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>
          <path d="M19 11 C23 8 28 7.5 32 9 M35 9.5 C39 8 44 9.5 47 13" fill="none" stroke="#fff" stroke-width="1.3" opacity=".3" stroke-linecap="round"/></g>
        </g>${brows("M18.5 25 Q23 21.8 27.5 24.4", "M36.5 24.4 Q41 21.8 45.5 25", 2.4)}${eyesOf({r:4.2,hl:1.6})}
        <g transform="translate(32 37) scale(1.28 1.2) translate(-32 -37)"><path d="M24.5 37.5 Q28.5 34.6 32 36.6 Q35.5 34.6 39.5 37.5 Q35.5 39.6 32 38.4 Q28.5 39.6 24.5 37.5Z" fill="#2A1A12" stroke="${FACE}" stroke-width="1" stroke-linejoin="round"/></g>${line("M27 41 Q32 44 37 41", 2.2)}
      </g>
      <g class="mv mv-wind" opacity="0" stroke="#F2B533" stroke-width="1.4" stroke-linecap="round" fill="none"><path d="M1 12 h9 M0 18 h12 M2 24 h8"/></g>
      <g class="mv mv-punch" opacity="0"><rect x="49" y="40" width="12" height="10" rx="3.5" fill="${SKIN}" stroke="${INK}" stroke-width="1.8"/>
        <path d="M52 40.5 v3.5 M55 40.5 v3.5 M58 40.5 v3.5" stroke="${INK}" stroke-width="1.2"/>
        <path d="M44 45 h5" stroke="#C2185B" stroke-width="6" stroke-linecap="round"/></g>
      <g class="mv mv-boom" opacity="0"><path d="M52 18 l3 5 5 -3 -1 6 6 1 -5 4 4 4 -6 0 1 6 -5 -4 -3 5 -2 -6 -6 2 3 -5 -5 -3 6 -1 -2 -6 5 3z" fill="#FFD23F" stroke="#C2185B" stroke-width="1.2" stroke-linejoin="round"/>
        <text x="56" y="32" text-anchor="middle" font-family="Nunito, sans-serif" font-weight="900" font-size="4.2" fill="#C2185B">DHISH!</text></g>`,
    },
    festive: {
      name: "Festive Dad", era: "Diwali", season: "diwali", moves: ["diya", "sparkler", "namaste"],
      svg: `<g class="body">${torso("#F2A01E")}
        <path d="M21 50 Q32 61 43 50" fill="none" stroke="#FFD45C" stroke-width="2.2"/><path d="M27 49.5 h10 v3 h-10z" fill="#C2185B" stroke="${INK}" stroke-width="1.2"/>
        <path d="M32 52.5 V64" stroke="#C2185B" stroke-width="2.4"/>
        
        <path d="M8 60 q4 -3 8 0 M48 60 q4 -3 8 0" stroke="#C2185B" stroke-width="1.2" fill="none"/>
      </g>${neck}
      <g class="hd">${head}
        <path d="M14 26 C12.5 17 18 10.5 26 10 C31 7.5 40 8 45 11 C49.5 13.8 51.3 19.3 50 26 C48.5 21.5 45.5 19.6 40.5 19.6 L26 19.6 C20 19.6 15.5 21.8 14 26Z" fill="#2A1A12" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>
        ${brows("M18.5 24 Q23 20.8 27.5 23.5","M36.5 23.5 Q41 20.8 45.5 24",2.4)}${eyesOf({r:4.2,hl:1.6})}${MOUTH.wide}
      </g>
      <g class="mv mv-diya" opacity="0"><path d="M22 54 Q32 62 42 54 Q37 52 32 52 Q27 52 22 54Z" fill="#C2410C" stroke="${INK}" stroke-width="1.4" stroke-linejoin="round"/>
        <path d="M24.5 54.3 Q32 52.6 39.5 54.3" stroke="#FFD27A" stroke-width="1" fill="none"/>
        <path class="flame" d="M32 51.5 C30 49 31 46.5 32 44.5 C33 46.5 34 49 32 51.5Z" fill="#FFC93C" stroke="#FF7A1A" stroke-width=".8"/></g>
      <g class="mv mv-spark" opacity="0"><path d="M55 48 L49 30" stroke="#8A8F98" stroke-width="1.4" stroke-linecap="round"/>
        <g stroke="#FFD27A" stroke-width="1.1" stroke-linecap="round"><path d="M49 30 l-4 -3 M49 30 l1 -5 M49 30 l5 -2 M49 30 l-5 2 M49 30 l4 4 M49 30 l-3 4"/></g>
        <circle cx="49" cy="30" r="1.6" fill="#fff"/></g>
      <g class="mv mv-namaste" opacity="0"><path d="M27 64 L30.5 47 Q32 44.5 33.5 47 L37 64Z" fill="${SKIN}" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/>
        <path d="M32 46.5 V60" stroke="${INK}" stroke-width="1"/></g>`,
    },
    xmas: {
      name: "Christmas Dad", era: "Christmas", season: "winter", moves: ["hoho", "jingle", "gift"],
      svg: `<g class="body">${torso("#C8102E")}
        <path d="M28 50 L36 50 L36 64 L28 64Z" fill="#fff" stroke="${INK}" stroke-width="1.2"/>
        <rect x="7" y="58.5" width="50" height="5.5" fill="#17181C"/><rect x="26.5" y="57.5" width="11" height="6.5" rx="1.2" fill="#F2B533" stroke="${INK}" stroke-width="1"/><rect x="29.5" y="59.5" width="5" height="2.8" fill="#17181C"/>
      </g>${neck}
      <g class="hd">${head}
        <path d="M12.5 22 C7 23 7 29 10 31 C7 33 9 38 13.5 37 L16 23Z M51.5 22 C57 23 57 29 54 31 C57 33 55 38 50.5 37 L48 23Z" fill="#fff" stroke="${INK}" stroke-width="1.5" stroke-linejoin="round"/>
        ${eyesOf({ happy:true })}
        <circle cx="17.5" cy="34.5" r="3.2" fill="#FF7A8A" opacity=".75"/><circle cx="46.5" cy="34.5" r="3.2" fill="#FF7A8A" opacity=".75"/>
        <path d="M12.5 34 C9 40 12 45 15 45.5 C13.5 50 19 53 22 52 C22 57 28 58.5 32 56.5 C36 58.5 42 57 42 52 C45 53 50.5 50 49 45.5 C52 45 55 40 51.5 34 C47 40 40 37 32 37.5 C24 37 17 40 12.5 34Z" fill="#fff" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/>
        <path class="mouth" d="M26.5 42.5 Q32 43.5 37.5 42.5 Q36.5 49 32 49 Q27.5 49 26.5 42.5Z" fill="#7A1F2B" stroke="${INK}" stroke-width="1.5" stroke-linejoin="round"/>
        <path d="M32 38 C28 35 21.5 36.5 20 41 C23 44 29 44 32 41.5 C35 44 41 44 44 41 C42.5 36.5 36 35 32 38Z" fill="#fff" stroke="${INK}" stroke-width="1.5" stroke-linejoin="round"/>
        <circle cx="32" cy="35.5" r="2.9" fill="#F0808A" stroke="${INK}" stroke-width="1.3"/>
        <path d="M17.5 24.5 Q23 20 28 24 M36 24 Q41 20 46.5 24.5" fill="none" stroke="${INK}" stroke-width="4.2" stroke-linecap="round"/><path d="M17.5 24.5 Q23 20 28 24 M36 24 Q41 20 46.5 24.5" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/>
        <g class="santa"><path d="M13 19 C14 6 26 0.5 38 3 C50 5 58 12 58.5 24 C54 24 52 21 50.5 18Z" fill="#C8102E" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>
          <circle class="pom" cx="58" cy="26" r="4.6" fill="#fff" stroke="${INK}" stroke-width="1.6"/>
          <rect x="10.5" y="15" width="43" height="7.5" rx="3.7" fill="#fff" stroke="${INK}" stroke-width="1.8"/></g>
      </g>
      <g class="mv mv-hoho" opacity="0"><g font-family="Nunito, sans-serif" font-weight="900" fill="#C8102E" stroke="#fff" stroke-width="1.4" paint-order="stroke"><text x="0" y="14" font-size="7.5">HO</text><text x="53" y="9" font-size="8.5">HO</text><text x="55" y="45" font-size="7">HO</text></g></g>
      <g class="mv mv-bells" opacity="0"><g fill="#F2B533" stroke="${INK}" stroke-width="1.2"><circle cx="6" cy="19" r="3.6"/><circle cx="59" cy="40" r="3.6"/></g><path d="M3.5 19.8 h5 M56.5 40.8 h5" stroke="${INK}" stroke-width="1"/>${spark(8, 36, .9)}${spark(52, 6, .9)}</g>
      <g class="mv mv-gift" opacity="0"><rect x="23" y="49" width="18" height="15" rx="1.5" fill="#1E7A46" stroke="${INK}" stroke-width="1.6"/><path d="M32 49 V64 M23 55 H41" stroke="#FFD23F" stroke-width="2.6"/>
        <path d="M32 49 C27 42 22 47 32 49 C42 47 37 42 32 49Z" fill="#FFD23F" stroke="${INK}" stroke-width="1.2"/></g>`,
    },
    lucky: {
      name: "Lucky Dad", era: "Lunar New Year", season: "lunar", moves: ["lantern", "envelope", "firecracker"],
      svg: `<g class="body">${torso("#B3122E")}
        <path d="M26 49.5 h12 v3.5 h-12z" fill="#B3122E" stroke="#F5C04A" stroke-width="1.2"/><path d="M18 46 L29 49 L31 55 L20 53Z M46 46 L35 49 L33 55 L44 53Z" fill="#E8262E" stroke="#F5C04A" stroke-width="1.8" stroke-linejoin="round"/>
        <path d="M32 53 V64" stroke="#F5C04A" stroke-width="1.2"/>
        <g stroke="#F5C04A" stroke-width="1.3" stroke-linecap="round"><path d="M28.5 56 h7 M28.5 59.5 h7 M28.5 63 h7"/></g>
        <g fill="#F5C04A"><circle cx="28.5" cy="56" r=".9"/><circle cx="35.5" cy="56" r=".9"/><circle cx="28.5" cy="59.5" r=".9"/><circle cx="35.5" cy="59.5" r=".9"/></g>
      </g>${neck}
      <g class="hd">${head}
        <path d="M14 26 C12.5 17 18 10.5 26 10 C31 7.5 40 8 45 11 C49.5 13.8 51.3 19.3 50 26 C48.5 21.5 45.5 19.6 40.5 19.6 L26 19.6 C20 19.6 15.5 21.8 14 26Z" fill="#1E1A18" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>
        <path d="M16 17 C14 6 24 6 24 9 C26 1 36 2 36 7 C42 1 52 5 49 17 C40 11 26 12 16 17Z" fill="#1E1A18" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/><path d="M33 9 C37 5 43 5 46 9" fill="none" stroke="#E8262E" stroke-width="2.6" stroke-linecap="round"/>${brows("M19.5 24.3 Q23 22.2 26.5 24", "M37.5 24 Q41 22.2 44.5 24.3")}${eyesOf({r:4.2,hl:1.6})}${MOUTH.grin}<circle cx="17.5" cy="37" r="2.8" fill="#FF8FA3" opacity=".55"/><circle cx="46.5" cy="37" r="2.8" fill="#FF8FA3" opacity=".55"/>
      </g>
      <g class="mv mv-lantern" opacity="0"><path d="M54 30 V34" stroke="#F5C04A" stroke-width="1"/>
        <ellipse cx="54" cy="41" rx="6" ry="7" fill="#E8262E" stroke="${INK}" stroke-width="1.4"/>
        <path d="M51 34.5 h6 M51 47.5 h6" stroke="#F5C04A" stroke-width="2" stroke-linecap="round"/>
        <path d="M54 34.5 V47.5 M50.5 37 Q54 41 50.5 45 M57.5 37 Q54 41 57.5 45" stroke="#F5C04A" stroke-width=".8" fill="none"/>
        <path d="M54 48 v4 M53 52 h2" stroke="#F5C04A" stroke-width="1"/></g>
      <g class="mv mv-envelope" opacity="0"><rect x="25" y="44" width="14" height="18" rx="1.5" fill="#E8262E" stroke="${INK}" stroke-width="1.4"/>
        <circle cx="32" cy="51" r="3" fill="#F5C04A" stroke="${INK}" stroke-width=".8"/><path d="M25 47 L32 51 L39 47" fill="none" stroke="#9C0F1C" stroke-width="1"/></g>
      <g class="mv mv-crackle" opacity="0">${spark(10, 14, 1.1)}${spark(54, 10, .9)}${spark(48, 22, .7)}${spark(16, 26, .7)}</g>`,
    },
    eiddad: {
      name: "Eid Dad", era: "Eid", season: "eid", moves: ["greet", "fanous", "sweets"],
      svg: `<g class="body">${torso("#127C7A")}
        <path d="M27.5 49.5 h9 l-1 14.5 h-7z" fill="#0E5F5D" stroke="${INK}" stroke-width="1.2"/>
        <g stroke="#F2C14E" stroke-width="1" fill="none"><path d="M29 52 q3 2 6 0 M29 55.5 q3 2 6 0 M29 59 q3 2 6 0"/></g>
        <path d="M24 49.5 Q32 52.5 40 49.5" fill="none" stroke="#F2C14E" stroke-width="1.6"/>
      </g>${neck}
      <g class="hd">${head}
        <path d="M14 26 C12.5 17 18 10.5 26 10 C31 7.5 40 8 45 11 C49.5 13.8 51.3 19.3 50 26 C48.5 21.5 45.5 19.6 40.5 19.6 L26 19.6 C20 19.6 15.5 21.8 14 26Z" fill="#2A1A12" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>
        ${brows("M19.5 24.4 Q23 22.4 26.5 24.2", "M37.5 24.2 Q41 22.4 44.5 24.4")}<path d="M13.5 34 C14 45 24 49 32 49 C40 49 50 45 50.5 34 C45 40 40 36.5 32 37 C24 36.5 19 40 13.5 34Z" fill="#2A1A12" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/>${eyesOf({r:4.2,hl:1.6})}<path class="mouth" d="M26 40 H38 Q37.5 45.5 32 45.5 Q26.5 45.5 26 40Z" fill="#fff" stroke="${FACE}" stroke-width="1.6" stroke-linejoin="round"/><path d="M13 20 C13 7 22 3 32 3 C42 3 51 7 51 20 C40 17 24 17 13 20Z" fill="#F8F1E3" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/><path d="M15 15 L19 11 L23 15 L27 11 L32 15 L37 11 L41 15 L45 11 L49 15" fill="none" stroke="#C99A2E" stroke-width="1.5"/><path d="M14 17.5 C25 14.5 39 14.5 50 17.5" fill="none" stroke="#127C7A" stroke-width="1.6"/>
      </g>
      <g class="mv mv-hand" opacity="0"><rect x="51.5" y="49" width="7" height="17" rx="2" fill="#127C7A" stroke="${INK}" stroke-width="1.6"/>
        <rect x="50.5" y="40" width="9" height="10.5" rx="3.5" fill="${SKIN}" stroke="${INK}" stroke-width="1.8"/>
        <path d="M52.6 40.5 v-3 M55 40.2 v-4 M57.4 40.5 v-3" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>
        <path d="M52.6 40.5 v-3 M55 40.2 v-4 M57.4 40.5 v-3" stroke="${SKIN}" stroke-width="1.2" stroke-linecap="round"/></g>
      <g class="mv mv-fanous" opacity="0"><path d="M10 26 V30" stroke="#F2C14E" stroke-width="1"/>
        <path d="M6.5 30 h7 l-1 2 h-5z" fill="#F2C14E" stroke="${INK}" stroke-width=".8"/>
        <path d="M7 32 h6 l1 9 h-8z" fill="#FFE29A" stroke="#C99A2E" stroke-width="1"/>
        <path class="flame" d="M10 39.5 C8.8 38 9.4 36.5 10 35.3 C10.6 36.5 11.2 38 10 39.5Z" fill="#FF9A1F"/>
        <path d="M6 41 h8 l-1.5 2.5 h-5z" fill="#F2C14E" stroke="${INK}" stroke-width=".8"/></g>
      <g class="mv mv-sweets" opacity="0"><ellipse cx="32" cy="58" rx="12" ry="3.2" fill="#E9EEF2" stroke="${INK}" stroke-width="1.4"/>
        <circle cx="27" cy="55.5" r="2.2" fill="#C2185B"/><circle cx="32" cy="54.5" r="2.4" fill="#F2C14E"/><circle cx="37" cy="55.5" r="2.2" fill="#8BC34A"/><circle cx="29.5" cy="53" r="1.8" fill="#FF9A1F"/><circle cx="34.5" cy="53" r="1.8" fill="#F8F1E3" stroke="#C99A2E" stroke-width=".5"/></g>`,
    },
    grandpa: {
      name: "Robo-Grandpa", era: "Secret", secret: true, moves: ["glasses", "nap", "kids"],
      svg: `<g class="body">${torso("#8E3B46")}
    <path d="M23 49.5 L32 62 L41 49.5Z" fill="#F4EEE2" stroke="${INK}" stroke-width="1.4"/>
    <path d="M20 49.8 L32 64 L26 64 L16 52Z M44 49.8 L32 64 L38 64 L48 52Z" fill="#C9763B" stroke="${INK}" stroke-width="1.4" stroke-linejoin="round"/>
    <path d="M28 50 L32 52.5 L36 50 L36 55 L32 52.8 L28 55Z" fill="#1F5C45" stroke="${INK}" stroke-width="1"/></g>${neck}
  <g class="hd">
    <path d="M24 15 L17 5 L12 8" fill="none" stroke="${INK}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="8" r="2.6" fill="#F2B533" stroke="${INK}" stroke-width="1.2"/>
    <rect x="3.5" y="27" width="6" height="11" rx="3" fill="#C9A227" stroke="${INK}" stroke-width="1.4"/><rect x="54.5" y="27" width="6" height="11" rx="3" fill="#C9A227" stroke="${INK}" stroke-width="1.4"/>
    <path d="M7.5 35 C7.5 21 17 15 32 15 C47 15 56.5 21 56.5 35 C56.5 44 50 47 32 47 C14 47 7.5 44 7.5 35Z" fill="${SKIN}" stroke="${INK}" stroke-width="2.4"/><!--gh-->
    <path d="M13 19.5 C15 8 38 5 50 14 C55 16 56 20 52 20.5 C40 17 25 17 13 19.5Z" fill="#5C6B4A" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>
    <path d="M8.5 27 C2 26 2 33 7 34 C3 37 7 41 10 39Z M55.5 27 C62 26 62 33 57 34 C61 37 57 41 54 39Z" fill="#fff" stroke="${INK}" stroke-width="1.3" stroke-linejoin="round"/>
    ${eyesOf({cy:29.5,r:3,hl:1.1,lid:.34})}
    <g class="specs"><circle cx="23" cy="30" r="7" fill="#fff" fill-opacity=".16" stroke="#9A741F" stroke-width="2"/><circle cx="41" cy="30" r="7" fill="#fff" fill-opacity=".16" stroke="#9A741F" stroke-width="2"/><path d="M30 29 Q32 27 34 29" fill="none" stroke="#9A741F" stroke-width="2"/></g>
    <g class="brow"><path d="M15 22.5 Q18 17.5 29 22 Q22 22.5 15 22.5Z M35 20 Q43 14.5 50 19.5 Q43 19 35 20Z" fill="#fff" stroke="${FACE}" stroke-width="1.5" stroke-linejoin="round"/></g>
    <path class="mouth" d="M28 43.5 Q32 41.8 36 43.5" fill="none" stroke="${FACE}" stroke-width="2" stroke-linecap="round"/>
    <path class="stache" d="M32 37 C27 33.5 20 35 17 39 C14 42 8 41 6.5 36 C5 44 12 48 19 45 C24 43 28 41.5 32 42 C36 41.5 40 43 45 45 C52 48 59 44 57.5 36 C56 41 50 42 47 39 C44 35 37 33.5 32 37Z" fill="#fff" stroke="${FACE}" stroke-width="1.5" stroke-linejoin="round"/>
  </g>
      <g class="mv mv-zzz" opacity="0"><text x="45" y="15" font-family="Nunito, sans-serif" font-weight="900" font-size="9" fill="#5B8EC8">Z</text>
        <text x="52" y="8" font-family="Nunito, sans-serif" font-weight="900" font-size="6.5" fill="#5B8EC8">z</text></g>
      <g class="mv mv-gfist" opacity="0"><rect x="51.5" y="47" width="7" height="19" rx="2" fill="#8E3B46" stroke="${INK}" stroke-width="1.6"/>
        <rect x="49.5" y="38" width="11" height="10" rx="3.5" fill="${SKIN}" stroke="${INK}" stroke-width="1.8"/>
        <path d="M52.5 38.5 v3.5 M55 38.5 v3.5 M57.5 38.5 v3.5" stroke="${INK}" stroke-width="1.2"/></g>`,
    },

    // ---------- Teacher Dads (the learning looks) ----------
    professor: {
      name: "Professor Dad", era: "Maths", moves: ["specs", "chalk", "idea"],
      svg: `<g class="body">${torso("#7A5A3C")}
        <path d="M6 60 L12 56 M9 63 L15 59 M50 56 L56 60 M49 59 L55 63" stroke="#5E4329" stroke-width="1.1" stroke-linecap="round"/>
        <path d="M24.5 49.6 L32 58 L39.5 49.6Z" fill="#fff" stroke="${INK}" stroke-width="1.4" stroke-linejoin="round"/>
        <path d="M21 49.5 L27.5 60 L24 64 M43 49.5 L36.5 60 L40 64" fill="none" stroke="#4A3422" stroke-width="1.6" stroke-linejoin="round"/>
      </g>${neck}
      <path d="M32 53.8 L25.8 50.4 L25.8 57.2Z M32 53.8 L38.2 50.4 L38.2 57.2Z" fill="#C8102E" stroke="${INK}" stroke-width="1.3" stroke-linejoin="round"/>
      <circle cx="32" cy="53.8" r="2" fill="#9E0C24" stroke="${INK}" stroke-width="1.1"/>
      <g class="hd">${head}
        <g transform="translate(32 24) scale(1.06 1.22) translate(-32 -24)"><path d="M13.2 27 C11.5 17.5 18 11.2 28 11 C38 10.4 49.5 13 50.8 27 C49.6 22.6 47.4 20.4 43.6 19.8 C37 18.8 31 19.4 27.5 17.2 C25 19.2 20.6 19.8 17.4 21.4 C15.2 22.6 14 24.4 13.2 27Z" fill="#4A4F57" stroke="${INK}" stroke-width="1.9" stroke-linejoin="round"/>
        <path d="M27.5 12.2 C27.2 14.4 27.3 16 27.5 17.2" stroke="#2E3238" stroke-width="1.2" fill="none" stroke-linecap="round"/>
        <path d="M13.6 25.6 C13.2 22.6 14 20.8 15.6 19.6 M50.4 25.6 C50.6 22.6 49.8 20.6 48 19.6" stroke="#C9CED6" stroke-width="1.8" fill="none" stroke-linecap="round"/>
        <path d="M33 13 C38 13 43 14.2 46 17" stroke="#8A9099" stroke-width="1.2" fill="none" stroke-linecap="round"/>
        </g><path class="brow brow-l" d="M18 24.2 L27.5 23" stroke="#3B2A1E" stroke-width="2.6" stroke-linecap="round" fill="none"/><path class="brow brow-r" d="M36.5 23 L46 24.2" stroke="#3B2A1E" stroke-width="2.6" stroke-linecap="round" fill="none"/>
        ${eyesOf({r:3.8,hl:1.4})}
        <g transform="translate(32 30.5) scale(1.24 1.35) translate(-32 -30.5)"><g class="pspecs"><rect x="17" y="26.6" width="12" height="8.2" rx="2" fill="#fff" fill-opacity=".15" stroke="#262B33" stroke-width="2"/><rect x="35" y="26.6" width="12" height="8.2" rx="2" fill="#fff" fill-opacity=".15" stroke="#262B33" stroke-width="2"/>
          <path d="M29 29.6 Q32 28 35 29.6" fill="none" stroke="#262B33" stroke-width="1.8"/>
          <path class="glint" d="M19.2 29.2 L21.2 27.8 M37.2 29.2 L39.2 27.8" stroke="#fff" stroke-width="1.3" stroke-linecap="round" opacity=".8"/></g>
        </g>${MOUTH.gentle}<g transform="rotate(35 55 20)"><rect x="53.5" y="9" width="3.6" height="19" fill="#FFD23F" stroke="${INK}" stroke-width="1.1"/><path d="M53.5 28 L55.3 32 L57.1 28Z" fill="#F2C9A0" stroke="${INK}" stroke-width="1"/><rect x="53.5" y="7" width="3.6" height="3" fill="#FF8FA3" stroke="${INK}" stroke-width="1"/></g>
      </g>
      <g class="mv mv-chalk" opacity="0"><text x="3" y="15" font-family="'Gochi Hand', cursive" font-size="15" fill="#F7D54A" stroke="${INK}" stroke-width=".5">π</text>
        <rect x="52" y="36" width="9" height="3.2" rx="1" fill="#fff" stroke="${INK}" stroke-width="1" transform="rotate(-35 56.5 37.6)"/></g>
      <g class="mv mv-bulb" opacity="0"><circle cx="53" cy="9" r="5.4" fill="#FFE066" stroke="${INK}" stroke-width="1.5"/>
        <rect x="50.6" y="13.6" width="4.8" height="3.4" rx="1" fill="#B8C1CA" stroke="${INK}" stroke-width="1.2"/>
        <path d="M53 1 V-1.5 M45.5 4 L43.8 2.2 M60.5 4 L62.2 2.2" stroke="#F2B533" stroke-width="1.4" stroke-linecap="round"/></g>`,
    },
    labdad: {
      name: "Lab Dad", era: "Science", moves: ["goggles", "beaker", "poof"],
      svg: `<g class="body">${torso("#F4F7F8")}
        <path d="M24 49.6 L32 57.5 L40 49.6Z" fill="#7B3FE4" stroke="${INK}" stroke-width="1.4" stroke-linejoin="round"/>
        <path d="M23 49.5 L28.5 64 M41 49.5 L35.5 64" stroke="${INK}" stroke-width="1.5" fill="none"/>
        <rect x="12" y="55" width="8" height="6.5" rx="1" fill="#E6ECEF" stroke="${INK}" stroke-width="1.2"/>
        <path d="M14 55 V51.5 M16.5 55 V52.3 M18.5 55 V51.2" stroke-width="1.6" stroke-linecap="round" stroke="#12B5A0"/><path d="M16.5 55 V52.3" stroke="#C8102E" stroke-width="1.6" stroke-linecap="round"/>
      </g>${neck}
      <g class="hd">${head}
        <g transform="translate(32 25) scale(1.15 1.12) translate(-32 -25)"><path d="M13 25 L8.5 18.5 L14.5 19 L12 11 L19.5 14 L20 5.5 L26.5 11 L32 2.5 L37.5 11 L44 5.5 L44.5 14 L52 11 L49.5 19 L55.5 18.5 L51 25 C48 21.2 44.5 19.6 40.5 19.6 L23.5 19.6 C19.5 19.6 16 21.2 13 25Z" fill="#F2F2F2" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/>
        </g>${eyesOf({ l:{ r:5, hl:1.9 }, r:{ r:3.4, hl:1.1 } })}${MOUTH.grin}
        <g transform="translate(32 20) scale(1.14 1.15) translate(-32 -20)"><g class="goggles"><path d="M11.5 21 H52.5" stroke="#12B5A0" stroke-width="3"/>
          <rect x="16.5" y="15.5" width="13" height="10" rx="4.5" fill="#BDF3EC" fill-opacity=".8" stroke="${INK}" stroke-width="1.6"/>
          <rect x="34.5" y="15.5" width="13" height="10" rx="4.5" fill="#BDF3EC" fill-opacity=".8" stroke="${INK}" stroke-width="1.6"/>
          <path d="M19 18.5 L22 17.5 M37 18.5 L40 17.5" stroke="#fff" stroke-width="1.2" stroke-linecap="round"/></g></g>
      </g>
      <g class="mv mv-beaker" opacity="0"><path d="M50 38 H58 M51.5 38 V44 L46.5 56 Q46 58.5 48.5 58.5 H59.5 Q62 58.5 61.5 56 L56.5 44 V38" fill="#fff" fill-opacity=".9" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/>
        <path d="M48.6 51 H59.4 L61.4 56 Q61.8 58.5 59.5 58.5 H48.5 Q46.2 58.5 46.6 56Z" fill="#7B3FE4"/>
        <g class="bubs"><circle cx="52" cy="47" r="1.4" fill="#7B3FE4"/><circle cx="55.5" cy="43" r="1.1" fill="#7B3FE4"/><circle cx="53.5" cy="34" r="1.6" fill="#B79BFF"/></g></g>
      <g class="mv mv-poof" opacity="0"><g fill="#C9CED6" stroke="${INK}" stroke-width="1.2"><circle cx="24" cy="9" r="5"/><circle cx="32" cy="6" r="6.5"/><circle cx="40" cy="9" r="5"/></g>
        <path d="M27 13 Q32 15 37 13" fill="#C9CED6"/><g fill="#5B6470"><circle cx="20" cy="27" r="1"/><circle cx="44" cy="25" r="1"/><circle cx="31" cy="21.5" r=".9"/></g></g>`,
    },
    bookworm: {
      name: "Bookworm Dad", era: "Languages", moves: ["book", "tea", "shh"],
      svg: `<g class="body">${torso("#4E7A5F")}
        <path d="M24.5 49.6 L32 64 L39.5 49.6Z" fill="#DCE8F2" stroke="${INK}" stroke-width="1.3" stroke-linejoin="round"/>
        <path d="M24.5 49.6 L32 53 L28.5 56 Z M39.5 49.6 L32 53 L35.5 56Z" fill="#fff" stroke="${INK}" stroke-width="1.2" stroke-linejoin="round"/>
        <path d="M32 53 L30 55.5 L31.4 64 H32.6 L34 55.5Z" fill="#8C2F39" stroke="${INK}" stroke-width="1.1" stroke-linejoin="round"/>
        <g fill="#C9B07A" stroke="${INK}" stroke-width=".6"><circle cx="22.6" cy="57" r="1.1"/><circle cx="23.6" cy="61.5" r="1.1"/><circle cx="41.4" cy="57" r="1.1"/><circle cx="40.4" cy="61.5" r="1.1"/></g>
      </g>${neck}
      <g class="hd">${head}
        <path d="M14 26.5 C12.5 18 17.5 11 26 10 C31 7.8 40 8.2 45 11.2 C49.5 14 51.2 19.5 50 26.5 C48.5 22 45.5 19.6 40.5 19.6 L30 19.6 C27 17 22 17 19 19.6 C16.5 21 15 23.5 14 26.5Z" fill="#6B4A32" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>
        <path d="M29.5 10.2 C35 11 40.5 14 43 19.4" stroke="#C9CDD2" stroke-width="2.2" fill="none" stroke-linecap="round"/>
        <path d="M16 21 C14 8 28 5 36 9 C29 10 24 14 23 20Z" fill="#6B4A32" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/><path d="M40 12 L44 1 L50 2.5 L48.5 14 L45.5 11Z" fill="#F2B533" stroke="${INK}" stroke-width="1.5" stroke-linejoin="round"/>${eyesOf({r:3.8,hl:1.4})}
        <circle cx="22.5" cy="30.5" r="8" fill="#fff" fill-opacity=".14" stroke="#B3263A" stroke-width="2.4"/><circle cx="41.5" cy="30.5" r="8" fill="#fff" fill-opacity=".14" stroke="#B3263A" stroke-width="2.4"/><path d="M30.5 29.5 Q32 28 33.5 29.5" stroke="#B3263A" stroke-width="2" fill="none"/>
        <path d="M17.5 33 Q11 41 19 49 M46.5 33 Q53 41 45 49" stroke="#C99A2E" stroke-width="1.1" stroke-dasharray="1.6 1.4" fill="none"/>
        <path class="mouth" d="M26 41 Q32 44 38 41" fill="none" stroke="${FACE}" stroke-width="2.4" stroke-linecap="round"/>
      </g>
      <g class="mv mv-book" opacity="0"><path d="M32 47 C27 44.5 21.5 44.5 17 46.5 V58 C21.5 56 27 56 32 58.5 C37 56 42.5 56 47 58 V46.5 C42.5 44.5 37 44.5 32 47Z" fill="#FFFBF2" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/>
        <path d="M32 47 V58.5" stroke="${INK}" stroke-width="1.2"/><path d="M20 49.5 H29 M20 52.5 H29 M35 49.5 H44 M35 52.5 H44" stroke="#8C7A66" stroke-width="1"/>
        <path d="M17 58 C21.5 56 27 56 32 58.5 C37 56 42.5 56 47 58 V60 H17Z" fill="#8C2F39" stroke="${INK}" stroke-width="1.2"/></g>
      <g class="mv mv-tea" opacity="0"><path d="M36 37 h10 v8 a3 3 0 0 1 -3 3 h-4 a3 3 0 0 1 -3 -3z" fill="#fff" stroke="${INK}" stroke-width="1.6"/>
        <path d="M46 39 h1.5 a2.2 2.2 0 0 1 0 4.4 H46" fill="none" stroke="${INK}" stroke-width="1.6"/>
        <path d="M41 37 V43" stroke="#C9B07A" stroke-width=".9"/><rect x="39.6" y="43" width="2.8" height="3" fill="#8C2F39"/>
        <path d="M39 34.5 c-1 -1.2 1 -2 0 -3.4 M42.5 34.5 c-1 -1.2 1 -2 0 -3.4" stroke="#8796A5" stroke-width="1.1" fill="none" stroke-linecap="round"/></g>
      <g class="mv mv-shh" opacity="0"><rect x="29.6" y="33" width="4.8" height="15" rx="2.4" fill="${SKIN}" stroke="${INK}" stroke-width="1.5"/>
        <rect x="26" y="45" width="12" height="9" rx="3.5" fill="${SKIN}" stroke="${INK}" stroke-width="1.6"/></g>`,
    },
    coach: {
      name: "Coach Dad", era: "Gym", moves: ["whistle", "clipboard", "stopwatch"],
      svg: `<g class="body">${torso("#1F2F5C")}<path d="M1 64 C2 55 9 50 17 50 L14 64Z M63 64 C62 55 55 50 47 50 L50 64Z" fill="#C8102E" stroke="${INK}" stroke-width="1.8"/>${""}
        <path d="M5.5 60 L14 51.8 M58.5 60 L50 51.8" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/>
        <path d="M27 49.6 L32 52.5 L37 49.6" fill="none" stroke="#fff" stroke-width="1.8" stroke-linejoin="round"/>
        <path d="M32 52.5 V64" stroke="#C9D3DC" stroke-width="1.3"/>
        <path d="M22.5 49.6 Q32 61 41.5 49.6" fill="none" stroke="#C8102E" stroke-width="1.6"/>
        <g transform="translate(32 55) scale(1.5 1.5) translate(-32 -55)"><g class="lwhistle"><rect x="29.5" y="54.5" width="6" height="3.6" rx="1.6" fill="#C9D3DC" stroke="${INK}" stroke-width="1.1"/><circle cx="30.6" cy="56.3" r="1" fill="${INK}"/></g></g>
      </g>${neck}
      <g class="hd">${head}
        <path d="M15 24 C14 28 14.5 30.5 16 32 L18 24Z M49 24 C50 28 49.5 30.5 48 32 L46 24Z" fill="#5A3A22" stroke="${INK}" stroke-width="1.1"/>
        ${brows("M17.5 24 L28.5 27","M46.5 24 L35.5 27",3.4)}${eyesOf({cy:31,r:3.8,hl:1.4})}
        <g transform="translate(32 37) scale(1.3 1.25) translate(-32 -37)"><path d="M24.5 37.5 Q28.5 34.6 32 36.6 Q35.5 34.6 39.5 37.5 Q35.5 39.6 32 38.4 Q28.5 39.6 24.5 37.5Z" fill="#5A3A22" stroke="${FACE}" stroke-width="1" stroke-linejoin="round"/>
        </g><path class="mouth" d="M26.4 40.4 H37.6 Q37.2 45 32 45 Q26.8 45 26.4 40.4Z" fill="#fff" stroke="${FACE}" stroke-width="1.7" stroke-linejoin="round"/>
        <g transform="translate(0 -3) translate(32 23) scale(1.1 1) translate(-32 -23)"><g class="ccap"><path d="M12.5 23 C11.5 10.5 20 4.5 32 4.5 C44 4.5 52.5 10.5 51.5 23Z" fill="#C8102E" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>
          <path d="M32 4.5 C30 10 29.5 16 30 23 M32 4.5 C34 10 34.5 16 34 23" stroke="#9E0C24" stroke-width="1.1" fill="none"/>
          <path d="M11.5 22.5 Q32 26.5 52.5 22.5 L52 25.5 Q32 29.5 12 25.5Z" fill="#9E0C24" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/>
          <text x="32" y="17.5" text-anchor="middle" font-family="Graduate, 'Nunito', sans-serif" font-size="9" fill="#fff">D</text></g></g>
      </g>
      <g class="mv mv-whistle" opacity="0"><rect x="28" y="37.5" width="9" height="5" rx="2.2" fill="#C9D3DC" stroke="${INK}" stroke-width="1.3"/>
        <path d="M39.5 36 L44 33.5 M40 40 H45.5 M39.5 44 L44 46.5" stroke="#C8102E" stroke-width="1.6" stroke-linecap="round"/></g>
      <g class="mv mv-clip" opacity="0"><rect x="46" y="36" width="15" height="21" rx="2" fill="#B07A44" stroke="${INK}" stroke-width="1.6"/>
        <rect x="48" y="40" width="11" height="15" fill="#fff" stroke="${INK}" stroke-width=".8"/><rect x="50.5" y="34.5" width="6" height="3.6" rx="1" fill="#C9D3DC" stroke="${INK}" stroke-width="1"/>
        <path d="M49.5 44 l1.5 1.5 l3 -3 M49.5 49.5 l1.5 1.5 l3 -3" stroke="#2E8B57" stroke-width="1.3" fill="none" stroke-linecap="round"/><path d="M55.5 44.5 H58 M55.5 50 H58" stroke="#8796A5" stroke-width="1"/></g>
      <g class="mv mv-watch" opacity="0"><circle cx="53" cy="11" r="7" fill="#fff" stroke="${INK}" stroke-width="1.6"/><rect x="51.5" y="1.5" width="3" height="2.6" fill="#C9D3DC" stroke="${INK}" stroke-width="1"/>
        <path class="hand" d="M53 11 V6.2" stroke="#C8102E" stroke-width="1.6" stroke-linecap="round"/><circle cx="53" cy="11" r="1" fill="${INK}"/></g>`,
    },
    dojo: {
      name: "Dojo Dad", era: "Karate", moves: ["kiai", "bow", "fistbump"],
      svg: `<g class="body">${torso("#2F4A7A")}
        <path d="M23 49.5 L41 49.5 L32 61Z" fill="#E9EEF2" stroke="${INK}" stroke-width="1.4" stroke-linejoin="round"/>
        <path d="M21 49.5 L35.5 64 L28 64 L16 51.5Z" fill="#fff" stroke="${INK}" stroke-width="1.4" stroke-linejoin="round"/>
        <path d="M43 49.5 L28.5 64 L36 64 L48 51.5Z" fill="#fff" stroke="${INK}" stroke-width="1.4" stroke-linejoin="round"/>
        <rect x="9" y="60" width="46" height="4" fill="#17181C"/><rect x="28" y="58.5" width="8" height="5.5" rx="1.5" fill="#17181C" stroke="#F2B533" stroke-width=".9"/>
      </g>${neck}
      <g class="hd">${head}
        <path d="M12.5 27 C9 13 17 8 23 10 L24 5 L30 8.5 L35 3.5 L38 8 L46 6 L45.5 11 C54 12 55 19 51.5 27 L48 20.5 L41 18 L35 20 L28 18 L20 19.5 L15.5 22Z" fill="#4A3426" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>
        <path d="M13.2 24 L14 31 L17 28 L17.5 21.5Z M50.8 24 L50 31 L47 28 L46.5 21.5Z" fill="#C9CED6" stroke="${INK}" stroke-width="1" stroke-linejoin="round"/>
        ${brows("M17.5 22.8 L28.5 25.6","M46.5 21.5 L35.5 25",3.2)}${eyesOf({ r:4, hl:1.5 })}
        <g fill="${FACE}" opacity=".35"><circle cx="19" cy="39" r=".6"/><circle cx="21.5" cy="42" r=".6"/><circle cx="25" cy="43.5" r=".6"/><circle cx="29" cy="44" r=".6"/><circle cx="35" cy="44" r=".6"/><circle cx="39" cy="43.5" r=".6"/><circle cx="42.5" cy="42" r=".6"/><circle cx="45" cy="39" r=".6"/></g>
        ${MOUTH.lopsided}
      </g>
      <g class="mv mv-punch" opacity="0"><rect x="49" y="40" width="12" height="10" rx="3.5" fill="${SKIN}" stroke="${INK}" stroke-width="1.8"/>
        <path d="M52 40.5 v3.5 M55 40.5 v3.5 M58 40.5 v3.5" stroke="${INK}" stroke-width="1.2"/><path d="M44 45 h5" stroke="#2F4A7A" stroke-width="6" stroke-linecap="round"/></g>
      <g class="mv mv-boom" opacity="0"><path d="M52 18 l3 5 5 -3 -1 6 6 1 -5 4 4 4 -6 0 1 6 -5 -4 -3 5 -2 -6 -6 2 3 -5 -5 -3 6 -1 -2 -6 5 3z" fill="#FFD23F" stroke="#B3263A" stroke-width="1.2" stroke-linejoin="round"/>
        <text x="55" y="32" text-anchor="middle" font-family="Nunito, sans-serif" font-weight="900" font-size="4.6" fill="#B3263A">KIAI!</text></g>
      <g class="mv mv-fist" opacity="0"><rect x="24" y="44" width="16" height="13" rx="5" fill="${SKIN}" stroke="${INK}" stroke-width="2"/>
        <path d="M28 44.5 v5 M32 44.5 v5 M36 44.5 v5" stroke="${INK}" stroke-width="1.4"/></g>`,
    },
  };
  const LOOK_AVATAR = { classic: "modern", arcade: "eighties", vhs: "nineties", y2k: "bucket", diner: "fifties", skate: "skater", gamer: "gamer", summer: "bucket", halloween: "dracula", bolly: "filmi", diwali: "festive", winter: "xmas", lunar: "lucky", eid: "eiddad", chalk: "professor", lab: "labdad", library: "bookworm", gym: "coach", cheat: "eighties" };

  // ---------- Rig ----------
  // Each dad is wrapped in layers so his idle life and his moves stack instead of fighting:
  //   rig (posture, sway)  >  breath-body > body        (moves animate .body inside the breath)
  //                        >  look-hd (tilt while you type) > breath-hd (follows the chest) > idle-hd (his own head habit) > hd (moves)
  // Moves only ever touch .body, .hd and the props, so they play on top of whatever the layers are doing.
  function gEnd(svg, start){
    let depth = 0, i = start;
    const re = /<g\b[^>]*?(\/?)>|<\/g>/g; re.lastIndex = start;
    for (let m; (m = re.exec(svg));) {
      if (m[0] === "</g>") { if (--depth === 0) return re.lastIndex; }
      else if (!m[1]) depth++;
    }
    return -1;
  }
  function rigUp(key, svg){
    const bs = svg.indexOf('<g class="body">'), hs = svg.indexOf('<g class="hd">');
    if (bs < 0 || hs < bs) return svg;
    const be = gEnd(svg, bs), he = gEnd(svg, hs);
    if (be < 0 || he < 0 || be > hs) return svg;
    return `<g class="rig rig-${key}">` + svg.slice(0, bs) + `<g class="breath-body">` + svg.slice(bs, be) + `</g>` + svg.slice(be, hs)
      + `<g class="look-hd"><g class="breath-hd"><g class="idle-hd">` + svg.slice(hs, he) + `</g></g></g>` + svg.slice(he) + `</g>`;
  }
  // ---------- Hair and beard ----------
  // His own hair is tagged av-hair; Bald, Grey temples and Curls hide or overlay it, and Beard adds one in his hair colour.
  // Shown and hidden through CSS variables on <html>, because those reach dads drawn from shared symbols (<use>) too, where class rules don't.
  // Without the page's variables (share cards) the fallbacks keep him as drawn, unless toneSvg bakes the choice in.
  // HAIR_PARTS: how many shapes right after the head are his hair. Robo-Grandpa keeps his own hair; he can still grow a beard.
  const HAIR_PARTS = { fifties:3, modern:2, eighties:2, nineties:1, chef:1, skater:1, gamer:2, bucket:1, dracula:3, filmi:2, festive:1,
    xmas:0, lucky:3, eiddad:1, grandpa:0, professor:4, labdad:1, bookworm:4, coach:1, dojo:2 };
  const HAIRS = { drawn:"As drawn", bald:"Bald", grey:"Grey temples", curls:"Curls" };
  const HATTED = new Set(["nineties", "chef", "skater", "bucket", "xmas", "coach"]);   // their hat sits on top, so curls only show at the sides
  // Curls: his own haircut, curled. The same outline gets a scalloped edge (round dots along it) and a ring of curl marks inside,
  // so the hair keeps his silhouette instead of growing a new one. Hat dads' sideburns curl the same way.
  const pathBox = (d) => {
    const n = (d.match(/-?\d*\.?\d+/g) || []).map(Number), xs = [], ys = [];
    for (let i = 0; i + 1 < n.length; i += 2) { xs.push(n[i]); ys.push(n[i + 1]); }
    return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
  };
  const curlsOf = (c, ds) => {
    const d = ds.join(" "), b = pathBox(d), cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2;
    const big = (b.x1 - b.x0) * (b.y1 - b.y0) > 150 && !/Z\s*M/i.test(d);   // one solid haircut, not two sideburns
    return `<g class="av-curls" display="var(--av-curls, none)">`
      + `<path d="${d}" fill="none" stroke="${INK}" stroke-width="4.4" stroke-dasharray="0 2.9" stroke-linecap="round" stroke-linejoin="round"/>`
      + `<path d="${d}" fill="none" stroke="${c}" stroke-width="2.6" stroke-dasharray="0 2.9" stroke-linecap="round" stroke-linejoin="round"/>`
      + `<path d="${d}" fill="${c}"/>`
      + (big ? `<path d="${d}" fill="none" stroke="#000" stroke-opacity=".2" stroke-width="2.4" stroke-dasharray="0 3.7" stroke-linecap="round" transform="translate(${cx} ${cy}) scale(.7) translate(${-cx} ${-cy})"/>`
             + `<path d="${d}" fill="none" stroke="#000" stroke-opacity=".16" stroke-width="3.2" stroke-dasharray="0 5.6" stroke-linecap="round" transform="translate(${cx} ${cy}) scale(.4) translate(${-cx} ${-cy})"/>` : "")
      + `</g>`;
  };
  const templesOf = () => `<path class="av-temples" display="var(--av-temples, none)" d="M12.7 19.6 Q12.2 27.4 14.2 33.2 L17.4 32.6 Q16 25.6 19.4 20 Q15.8 18.8 12.7 19.6Z M51.3 19.6 Q51.8 27.4 49.8 33.2 L46.6 32.6 Q48 25.6 44.6 20 Q48.2 18.8 51.3 19.6Z" fill="#DCE1E6" stroke="${INK}" stroke-width="1.2" stroke-linejoin="round"/>`;
  const baldOf = () => `<path class="av-bald" display="var(--av-bald, none)" d="M21.5 19.6 Q27 17.4 32.5 18" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" opacity=".5"/>`;
  // Beard: shading in his hair colour over the lower face, kept inside the head outline (nothing hangs below the jaw),
  // with the mouth area left clear so his smile reads, and a moustache for dads who don't already have one.
  const STACHED = new Set(["coach", "filmi", "grandpa", "xmas"]);
  const beardOf = (c, stache) => `<g class="av-beard" display="var(--av-beard, none)">`
    + `<path d="M13.3 29.6 L13.3 35 A9.7 9.7 0 0 0 23 44.7 L41 44.7 A9.7 9.7 0 0 0 50.7 35 L50.7 29.6 Q48.6 34.6 43 36 Q37.5 36.9 32 36.3 Q26.5 36.9 21 36 Q15.4 34.6 13.3 29.6 Z M24.4 40.9 A7.6 3.1 0 1 0 39.6 40.9 A7.6 3.1 0 1 0 24.4 40.9 Z" fill="${c}" fill-opacity=".82" fill-rule="evenodd"/>`
    + `<path d="M16.4 37.6 l.8 1 M19.6 41.2 l.8 .9 M44.4 41.2 l-.8 .9 M47.6 37.6 l-.8 1 M27 44 h1.2 M35.8 44 h1.2" fill="none" stroke="#000" stroke-opacity=".25" stroke-width=".9" stroke-linecap="round"/>`
    + (stache ? "" : `<path d="M25.6 38.4 Q28.7 35.9 32 37.3 Q35.3 35.9 38.4 38.4 Q35.3 37.8 32 38.7 Q28.7 37.8 25.6 38.4Z" fill="${c}"/>`)
    + `</g>`;
  function elEnd(svg, i){
    if (svg.startsWith("<g", i)) return gEnd(svg, i);
    const e = svg.indexOf("/>", i); return e < 0 ? -1 : e + 2;
  }
  function tagHair(el){
    const m = /^<([a-z]+)\b([^>]*)>/.exec(el); if (!m) return el;
    const open = m[0], cls = /\bclass="/.test(open) ? open.replace(/\bclass="/, 'class="av-hair ') : open.replace(/^<([a-z]+)/, '<$1 class="av-hair"');
    const tagged = cls.replace(/^<([a-z]+)/, '<$1 display="var(--av-hair, inline)"');
    return tagged + el.slice(open.length);
  }
  function hairUp(key, svg){
    const hs = svg.indexOf('<g class="hd">'); if (hs < 0) return svg;
    const mark = key === "grandpa" ? "<!--gh-->" : head;
    const at = svg.indexOf(mark, hs); if (at < 0) return svg;
    const afterHead = at + mark.length;
    let i = afterHead, parts = "", firstFill = null; const hairDs = [];
    for (let n = 0; n < (HAIR_PARTS[key] || 0); n++) {
      while (/\s/.test(svg[i])) i++;
      const e = elEnd(svg, i); if (e < 0) return svg;
      const el = svg.slice(i, e);
      if (!firstFill) firstFill = (/fill="([^"]+)"/.exec(el) || [])[1];
      for (const m of el.matchAll(/<path\b[^>]*>/g)) {   // filled hair shapes only, not shine strokes
        const f = (/fill="([^"]+)"/.exec(m[0]) || [])[1], d = (/\bd="([^"]+)"/.exec(m[0]) || [])[1];
        if (d && f && f !== "none") hairDs.push(d);
      }
      parts += tagHair(el); i = e;
    }
    const c = key === "grandpa" ? "#EEF1F4" : (firstFill && firstFill !== "none" ? firstFill : "#3A2A1E");
    const extra = HAIR_PARTS[key] && hairDs.length ? curlsOf(c, hairDs) + templesOf() : (HAIR_PARTS[key] ? templesOf() : "");
    return svg.slice(0, afterHead) + beardOf(c, STACHED.has(key)) + (HAIR_PARTS[key] ? baldOf() : "") + parts + extra + svg.slice(i);
  }
  for (const [k, a] of Object.entries(AVATARS)) a.svg = hairUp(k, a.svg);
  for (const [k, a] of Object.entries(AVATARS)) a.svg = rigUp(k, a.svg);

  function installSymbols(sprite){
    for (const [k, a] of Object.entries(AVATARS)) {
      if (document.getElementById("av-" + k)) continue;
      const sym = document.createElementNS("http://www.w3.org/2000/svg", "symbol");
      sym.id = "av-" + k; sym.setAttribute("viewBox", "0 0 64 64"); sym.innerHTML = a.svg; sprite.appendChild(sym);
    }
  }
  // The chosen tone is saved on the device and applied to <html>, so every dad on every page follows it.
  const SKIN_KEY = "robodad.skin";
  function getSkin(){ let v = null; try { v = localStorage.getItem(SKIN_KEY); } catch {} return Object.hasOwn(TONES, v) ? v : "steel"; }
  // Steel in a dark look (light outlines) used to get light eyes and a light smile on a dim face plate, which read as a negative.
  // There he now gets a lighter plate and the same dark features as the light looks. Light looks are untouched.
  const STEEL_NIGHT_INK = "#1A2230", STEEL_NIGHT_PLATE = "color-mix(in srgb, var(--metal) 55%, #fff)";
  function darkLook(){
    const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(getComputedStyle(document.documentElement).getPropertyValue("--ink").trim());
    if (!m) return false;
    const h = m[1].length === 3 ? m[1].replace(/./g, "$&$&") : m[1], n = parseInt(h, 16);
    return .299 * (n >> 16) + .587 * ((n >> 8) & 255) + .114 * (n & 255) > 128;   // light ink means a dark page
  }
  function applySkin(tone){
    const st = document.documentElement.style, hex = TONES[tone];
    st.removeProperty("--skin"); st.removeProperty("--face-ink");   // clear first so darkLook() reads the look's own ink
    if (hex) { st.setProperty("--skin", hex); st.setProperty("--face-ink", FACE_INK); }
    else if (darkLook()) { st.setProperty("--skin", STEEL_NIGHT_PLATE); st.setProperty("--face-ink", STEEL_NIGHT_INK); }
  }
  function setSkin(tone){
    if (!Object.hasOwn(TONES, tone)) tone = "steel";
    try { localStorage.setItem(SKIN_KEY, tone); } catch {}
    applySkin(tone); return tone;
  }
  // For pictures drawn off-page (share cards, result cards): bake the tone into the markup, leaving plain var(--metal) / var(--ink) otherwise.
  function toneSvg(svg){
    const hex = TONES[getSkin()], h = getHair();
    svg = svg.split(SKIN).join(hex || "var(--metal)").split(FACE).join(hex ? FACE_INK : "var(--ink)");
    const on = { hair: h !== "bald" && h !== "curls", bald: h === "bald", temples: h === "grey", curls: h === "curls", beard: getBeard() };
    return svg.replace(/display="var\(--av-([a-z]+), (?:none|inline)\)"/g, (_, k) => `display="${on[k] ? "inline" : "none"}"`);
  }
  const HAIR_KEY = "robodad.hair", BEARD_KEY = "robodad.beard";
  function getHair(){ let v = null; try { v = localStorage.getItem(HAIR_KEY); } catch {} return Object.hasOwn(HAIRS, v) ? v : "drawn"; }
  function getBeard(){ try { return localStorage.getItem(BEARD_KEY) === "on"; } catch { return false; } }
  function applyHair(){
    const d = document.documentElement.dataset, h = getHair();
    if (h === "drawn") delete d.hair; else d.hair = h;
    if (getBeard()) d.beard = "on"; else delete d.beard;
  }
  function setHair(h){ if (!Object.hasOwn(HAIRS, h)) h = "drawn"; try { localStorage.setItem(HAIR_KEY, h); } catch {} applyHair(); return h; }
  function setBeard(on){ try { localStorage.setItem(BEARD_KEY, on ? "on" : "off"); } catch {} applyHair(); return !!on; }
  try {
    const st = document.createElement("style"); st.id = "av-hair-style";
    st.textContent = 'html[data-hair="bald"]{--av-hair:none;--av-bald:inline}html[data-hair="grey"]{--av-temples:inline}'
      + 'html[data-hair="curls"]{--av-hair:none;--av-curls:inline}html[data-beard="on"]{--av-beard:inline}';
    (document.head || document.documentElement).appendChild(st);
  } catch {}
  applyHair();
  applySkin(getSkin());
  // Looks and light/dark can change while the page is open, so Steel re-checks when they do.
  const resync = () => applySkin(getSkin());
  try {
    new MutationObserver(resync).observe(document.documentElement, { attributes:true, attributeFilter:["data-look", "data-theme", "class"] });
    matchMedia("(prefers-color-scheme: dark)").addEventListener("change", resync);
    document.addEventListener("DOMContentLoaded", resync);
  } catch {}
  window.RoboAvatars = { AVATARS, LOOK_AVATAR, installSymbols, TONES, TONE_NAMES, getSkin, setSkin, toneSvg, HAIRS, getHair, setHair, getBeard, setBeard };
})();
