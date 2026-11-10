// RoboDad's avatars: one robot dad per decade, each with three little "idle moves".
// Every avatar is drawn on the same 64x64 grid so they can swap freely.
// Parts that only appear during a move carry opacity="0" and class "mv";
// the page's CSS animates them when the svg gets a "do-<move>" class.
(() => {
  const INK = "var(--ink)";
  const neck = `<rect x="27.5" y="44" width="9" height="6.5" fill="var(--metal)" stroke="${INK}" stroke-width="2"/>`;
  const head = `<rect x="12" y="16" width="40" height="30" rx="11" fill="var(--metal)" stroke="${INK}" stroke-width="2.4"/>
    <rect x="8" y="26" width="5" height="9" rx="2.5" fill="${INK}"/><rect x="51" y="26" width="5" height="9" rx="2.5" fill="${INK}"/>`;
  const smile = `<path class="mouth" d="M25.5 39.5 Q32 43 38.5 39.5" fill="none" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/>`;
  const eyes = `<g class="eye eye-l"><circle cx="23" cy="30" r="3.2" fill="${INK}"/><circle cx="24.1" cy="28.9" r="1" fill="#fff"/></g>
    <g class="eye eye-r"><circle cx="41" cy="30" r="3.2" fill="${INK}"/><circle cx="42.1" cy="28.9" r="1" fill="#fff"/></g>`;
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
        <path d="M14 25 C12.5 17 15 10.5 21 7.5 C24 2.5 31 0.8 37 3 C43 2.2 49.5 6 50.5 13.5 L50 27 C49 22.5 46 20 41 20 C37.5 20 35 20.8 32 23 C29 20.8 26.5 20 23 20 C18 20 15 22.5 14 27 Z" fill="var(--hair)" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>
        <path class="hair-shine" d="M20.5 12 C25 7.5 32 6 38.5 8 C43 9.2 46.5 11.5 48.5 15 M23.5 16 C29.5 12.5 38 12.5 46 16.5 M25 7 C29 4.8 33.5 4.5 37 5.5" fill="none" stroke="#fff" stroke-width="1.3" stroke-linecap="round" opacity=".4"/>
        <path d="M16 26.5 H30 Q30.5 34 23 34 Q16 34 16 26.5Z M48 26.5 H34 Q33.5 34 41 34 Q48 34 48 26.5Z" fill="var(--lens)"/>
        <path d="M30 27.5 H34" stroke="var(--lens)" stroke-width="2"/>
        <path class="glint" d="M19 28.5 L23 28.5 M37 28.5 L41 28.5" stroke="#fff" stroke-width="1.5" stroke-linecap="round" opacity=".75"/>
        ${smile}
        <g class="mv mv-spark" opacity="0">${spark(45.5, 26, 1.1)}</g>
        <g class="mv mv-comb" opacity="0"><rect x="0" y="0" width="13" height="3.2" rx="1.2" fill="#D7263D" stroke="${INK}" stroke-width="1"/>
          <path d="M1.6 3.2v2.4M3.8 3.2v2.4M6 3.2v2.4M8.2 3.2v2.4M10.4 3.2v2.4" stroke="#D7263D" stroke-width="1.1"/></g>
      </g>
      <g class="mv mv-collar" opacity="0"><path d="M22.5 51 L12.5 37.5 L20.5 40.5 L27.5 47.5 Z M41.5 51 L51.5 37.5 L43.5 40.5 L36.5 47.5 Z" fill="var(--jacket2)" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/>
        <path d="M14.5 39.5 L21 42 M49.5 39.5 L43 42" stroke="#fff" stroke-width="1.2" stroke-linecap="round" opacity=".55"/></g>`,
    },
    modern: {
      name: "Modern Dad", era: "Today", moves: ["wave", "wink", "sip"],
      svg: `<g class="body">${torso("#3D7CB8")}
        <path d="M24 49.2 L32 53.5 L27.5 57.5 L22 51 Z M40 49.2 L32 53.5 L36.5 57.5 L42 51 Z" fill="#5B97D1" stroke="${INK}" stroke-width="1.5" stroke-linejoin="round"/>
        <path d="M32 53.5 V61.5" stroke="${INK}" stroke-width="1.3"/><circle cx="32" cy="56.3" r=".95" fill="#fff"/><circle cx="32" cy="59.3" r=".95" fill="#fff"/>
      </g>${neck}
      <g class="hd">${head}
        <path d="M14 26.5 C12.5 18 17.5 11 26 10 C31 7.8 40 8.2 45 11.2 C49.5 14 51.2 19.5 50 26.5 C48.5 22 45.5 19.6 40.5 19.6 L26 19.6 C20 19.6 15.5 22 14 26.5Z" fill="#6B4A32" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>
        <path d="M25 11.5 C29 15 36 16.4 45 15.5" fill="none" stroke="#fff" stroke-width="1.2" opacity=".35" stroke-linecap="round"/>
        ${eyes}${smile}
      </g>
      <g class="mv mv-mug" opacity="0"><path d="M35 36 h10 v8 a3 3 0 0 1 -3 3 h-4 a3 3 0 0 1 -3 -3z" fill="#fff" stroke="${INK}" stroke-width="1.6"/>
        <path d="M45 38 h1.5 a2.2 2.2 0 0 1 0 4.4 H45" fill="none" stroke="${INK}" stroke-width="1.6"/><rect x="37" y="39.5" width="6" height="2" fill="#D7263D"/>
        <path d="M38 33.5 c-1 -1.2 1 -2 0 -3.4 M41.5 33.5 c-1 -1.2 1 -2 0 -3.4" stroke="#8796A5" stroke-width="1.1" fill="none" stroke-linecap="round"/></g>
      <g class="mv mv-hand" opacity="0"><rect x="51.5" y="49" width="7" height="17" rx="2" fill="#3D7CB8" stroke="${INK}" stroke-width="1.6"/>
        <rect x="50.5" y="40" width="9" height="10.5" rx="3.5" fill="var(--metal)" stroke="${INK}" stroke-width="1.8"/>
        <path d="M52.6 40.5 v-3 M55 40.2 v-4 M57.4 40.5 v-3" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>
        <path d="M52.6 40.5 v-3 M55 40.2 v-4 M57.4 40.5 v-3" stroke="var(--metal)" stroke-width="1.2" stroke-linecap="round"/></g>`,
    },
    eighties: {
      name: "Arcade Dad", era: "1980s", moves: ["bob", "shades", "oneup"],
      svg: `<g class="body">${torso("#22B8CF")}
        <path d="M7 61 L20 52.5 L21.5 55.5 L9 63.5 Z M57 61 L44 52.5 L42.5 55.5 L55 63.5 Z" fill="#FF3EA5"/>
        <path d="M32 52 V64" stroke="${INK}" stroke-width="1.6"/>
      </g>${neck}
      <path d="M22.5 47.5 L41.5 47.5 L42.5 52 L32 53.5 L21.5 52Z" fill="#7048E8" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/>
      <g class="hd">${head}
        <path d="M10.5 29 C7 18 12 8.5 21.5 6 C27.5 1.5 37.5 1.2 43.5 5.2 C52.5 7.5 57.5 17 53.5 29 C51 22.5 47 19.6 41 19.6 L23 19.6 C17 19.6 13 22.5 10.5 29Z" fill="#8A5A2B" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>
        <path d="M18 12 C22 9 27 8 31 9.5 M33 9.5 C37 8 42 9 46 12 M15 18 C18 14 23 13 27 14 M37 14 C41 13 46 14 49 18" stroke="#fff" opacity=".3" stroke-width="1.2" fill="none" stroke-linecap="round"/>
        <path d="M12.5 21.5 C14 18 18 16.5 23 16.5 L41 16.5 C46 16.5 50 18 51.5 21.5 L51.5 24.5 L12.5 24.5Z" fill="#FF3EA5" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/>
        <path d="M13.5 22.8 H50.5" stroke="#fff" stroke-width="1" opacity=".7"/>
        <path d="M9.5 27 C8 1.5 56 1.5 54.5 27" fill="none" stroke="#3A3A44" stroke-width="2.2"/>
        <rect x="5.5" y="24.5" width="7" height="11" rx="3.5" fill="#FF8C1A" stroke="${INK}" stroke-width="1.6"/>
        <rect x="51.5" y="24.5" width="7" height="11" rx="3.5" fill="#FF8C1A" stroke="${INK}" stroke-width="1.6"/>
        ${eyes}${smile}
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
        <g class="cap"><path d="M12.5 23.5 C12.5 11 21 6 32 6 C43 6 51.5 11 51.5 23.5 Z" fill="#2B59C3" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>
          <path d="M22 8.5 C26 15 27 19 26.5 23.5 M42 8.5 C38 15 37 19 37.5 23.5" stroke="#1E3F8F" stroke-width="1.1" fill="none"/>
          <path d="M26.5 23.5 Q32 17.5 37.5 23.5" fill="var(--metal)" stroke="${INK}" stroke-width="1.6"/>
          <circle cx="32" cy="6.8" r="1.6" fill="#1E3F8F" stroke="${INK}" stroke-width="1"/></g>
        ${eyes}${smile}
      </g>
      <g class="mv mv-buzz" opacity="0"><path d="M42 57 l-2 -1 M42 60.5 l-2 1 M54.5 57 l2 -1 M54.5 60.5 l2 1" stroke="${INK}" stroke-width="1.2" stroke-linecap="round"/></g>`,
    },
    y2k: {
      name: "Trucker Hat Dad", era: "2000s", moves: ["tipcap", "bob", "peace"],
      svg: `<g class="body">${torso("#3B3F46")}
        <path d="M33.5 52.5 L28.5 58.5 H32 L30.5 63.5 L36 56.8 H32.4Z" fill="#FF8C1A" stroke="${INK}" stroke-width=".8" stroke-linejoin="round"/>
      </g>${neck}
      <g class="hd">${head}
        <path d="M13.5 26 L13.5 31 L16 31 L16 25Z M50.5 26 L50.5 31 L48 31 L48 25Z" fill="#6B4A32"/>
        <g class="tcap"><path d="M13 23 C13 11 21 6 32 6 C43 6 51 11 51 23Z" fill="#2B2B30" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>
          <path d="M16 13 l2 2 M16 17 l2 2 M46 13 l2 2 M46 17 l2 2 M18 10 l2 2 M44 10 l2 2" stroke="#8A8F98" stroke-width="1"/>
          <path d="M20.5 22.5 C20.5 12.5 25.5 7.5 32 7.5 C38.5 7.5 43.5 12.5 43.5 22.5Z" fill="#fff" stroke="${INK}" stroke-width="1.6"/>
          <circle cx="32" cy="15.5" r="3.6" fill="#FF8C1A" stroke="${INK}" stroke-width="1"/><path d="M30.2 15.5 h3.6 M32 13.7 v3.6" stroke="#fff" stroke-width="1"/>
          <path d="M9 24 C16 19 48 19 55 24 C48 27 16 27 9 24Z" fill="#E8572A" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/></g>
        ${eyes}${smile}
        <circle cx="10.5" cy="32" r="1.8" fill="#fff" stroke="${INK}" stroke-width=".8"/><circle cx="53.5" cy="32" r="1.8" fill="#fff" stroke="${INK}" stroke-width=".8"/>
        <path d="M10.5 33.8 C11 42 14 46 17 48 M53.5 33.8 C53 42 50 46 47 48" fill="none" stroke="#fff" stroke-width="1.3"/>
      </g>
      <g class="mv mv-notes" opacity="0"><path d="M50 14 v-7 l5 -1.5 v6.5" fill="none" stroke="#FF8C1A" stroke-width="1.6"/>
        <circle cx="48.8" cy="14" r="1.8" fill="#FF8C1A"/><circle cx="53.8" cy="12.5" r="1.8" fill="#FF8C1A"/></g>
      <g class="mv mv-peace" opacity="0"><rect x="51.5" y="49" width="7" height="17" rx="2" fill="#3B3F46" stroke="${INK}" stroke-width="1.6"/>
        <rect x="50" y="41.5" width="10" height="8.5" rx="3.2" fill="var(--metal)" stroke="${INK}" stroke-width="1.8"/>
        <path d="M53 43 L51 35.5 M57 43 L59.5 35.5" stroke="${INK}" stroke-width="3.4" stroke-linecap="round"/><path d="M53 43 L51 35.5 M57 43 L59.5 35.5" stroke="var(--metal)" stroke-width="1.6" stroke-linecap="round"/></g>`,
    },
    skater: {
      name: "Skater Dad", era: "Late '90s", moves: ["beanie", "ollie", "fistbump"],
      svg: `<g class="body">${torso("#7D8793")}
        <path d="M32 54 V64" stroke="#C9D3DC" stroke-width="1.4"/><path d="M28 53.5 v6.5 M36 53.5 v6.5" stroke="#fff" stroke-width="1.3" stroke-linecap="round"/>
      </g>${neck}
      <path d="M18.5 50.5 C22 55.5 42 55.5 45.5 50.5 L43.5 48 C40 52 24 52 20.5 48Z" fill="#646E7A" stroke="${INK}" stroke-width="1.4" stroke-linejoin="round"/>
      <g class="hd">${head}
        <path d="M13 24 C12 28 13 31 15 33 L17 24Z M51 24 C52 28 51 31 49 33 L47 24Z" fill="#6B4A32" stroke="${INK}" stroke-width="1.2"/>
        ${eyes}${smile}
        <g class="beanie"><path d="M12.5 21 C11 9 20 3.5 32 3.5 C44 3.5 53 9 51.5 21Z" fill="#C23B3B" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>
          <path d="M22 6 C24 12 25 16 25 20 M32 4 V20 M42 6 C40 12 39 16 39 20" stroke="#9E2B2B" stroke-width="1.2" fill="none"/>
          <rect x="11" y="19" width="42" height="6.5" rx="3" fill="#9E2B2B" stroke="${INK}" stroke-width="1.8"/>
          <path d="M15 20 v4.5 M19 20 v4.5 M23 20 v4.5 M27 20 v4.5 M31 20 v4.5 M35 20 v4.5 M39 20 v4.5 M43 20 v4.5 M47 20 v4.5" stroke="#7A1F1F" stroke-width="1"/></g>
      </g>
      <g class="mv mv-board" opacity="0"><path d="M8 53 C9 54.8 11 56 14 56 H50 C53 56 55 54.8 56 53" fill="none" stroke="#E8572A" stroke-width="3" stroke-linecap="round"/>
        <path d="M13 54.6 H51" stroke="#1C1C1C" stroke-width="1"/><rect x="16" y="57.2" width="5" height="1.8" fill="#9AA5AE"/><rect x="43" y="57.2" width="5" height="1.8" fill="#9AA5AE"/>
        <g class="wheel"><circle cx="18.5" cy="60.5" r="2.4" fill="#F6E7A8" stroke="${INK}" stroke-width="1.1"/><path d="M18.5 58.5 v4" stroke="${INK}" stroke-width=".8"/></g>
        <g class="wheel"><circle cx="45.5" cy="60.5" r="2.4" fill="#F6E7A8" stroke="${INK}" stroke-width="1.1"/><path d="M45.5 58.5 v4" stroke="${INK}" stroke-width=".8"/></g></g>
      <g class="mv mv-fist" opacity="0"><rect x="24" y="44" width="16" height="13" rx="5" fill="var(--metal)" stroke="${INK}" stroke-width="2"/>
        <path d="M28 44.5 v5 M32 44.5 v5 M36 44.5 v5" stroke="${INK}" stroke-width="1.4"/>
        <path d="M20 47 l-3 -1.5 M20 51 l-3 1.5 M44 47 l3 -1.5 M44 51 l3 1.5" stroke="${INK}" stroke-width="1.3" stroke-linecap="round"/></g>`,
    },
    gamer: {
      name: "Gamer Dad", era: "Mid-2000s", moves: ["gg", "mash", "victory"],
      svg: `<g class="body">${torso("#22262E")}<path d="M8 59 H56" stroke="#39FF88" stroke-width="2.2"/></g>${neck}
      <g class="hd">${head}
        <path d="M14 25 C12.5 16 18 10 25 9.5 C28 7 37 7 41 9.5 C47 10.5 51.5 16 50 25 C47 20.5 43 19 38 19.5 L26 19.5 C21 19 16.5 20.5 14 25Z" fill="#3A2A1E" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>
        <path d="M8.5 27 C7 4 57 4 55.5 27" fill="none" stroke="#2A2E36" stroke-width="3"/>
        <rect x="4.5" y="23.5" width="9" height="13" rx="4" fill="#2A2E36" stroke="${INK}" stroke-width="1.6"/><rect x="50.5" y="23.5" width="9" height="13" rx="4" fill="#2A2E36" stroke="${INK}" stroke-width="1.6"/>
        <path class="cup-led" d="M7 30 h4 M53 30 h4" stroke="#39FF88" stroke-width="1.6" stroke-linecap="round"/>
        ${eyes}${smile}
        <g class="mic"><path d="M10 35.5 C11 42 17 44.5 23 43" fill="none" stroke="#2A2E36" stroke-width="2.2" stroke-linecap="round"/><circle cx="24" cy="42.8" r="2" fill="#2A2E36" stroke="#39FF88" stroke-width="1"/></g>
      </g>
      <text class="mv mv-gg" opacity="0" x="46" y="13" text-anchor="middle" font-family="Nunito, sans-serif" font-size="10" font-weight="900" fill="#39FF88" stroke="#111" stroke-width="1" paint-order="stroke">GG!</text>
      <g class="mv mv-pad" opacity="0"><path d="M18 51 C14 51 11 55 12 59 C13 62.5 17 62.5 19.5 60 L22 57.5 H42 L44.5 60 C47 62.5 51 62.5 52 59 C53 55 50 51 46 51Z" fill="#3A3F4A" stroke="${INK}" stroke-width="1.6"/>
        <path d="M20 54.5 v4 M18 56.5 h4" stroke="#C9D3DC" stroke-width="1.4"/>
        <circle class="pad-btn" cx="44" cy="55" r="1.3" fill="#39FF88"/><circle class="pad-btn b2" cx="46.6" cy="57.2" r="1.3" fill="#FF5E7E"/><circle cx="41.6" cy="57.2" r="1.3" fill="#38B6FF"/><circle cx="44" cy="59.4" r="1.3" fill="#F2B533"/></g>
      <g class="mv mv-vic" opacity="0"><rect x="51.5" y="47" width="7" height="19" rx="2" fill="#22262E" stroke="${INK}" stroke-width="1.6"/>
        <rect x="49.5" y="38" width="11" height="10" rx="3.5" fill="var(--metal)" stroke="${INK}" stroke-width="1.8"/>
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
        <g class="bucket"><path d="M15 20 C15 10 22 5.5 32 5.5 C42 5.5 49 10 49 20Z" fill="#4E7FB8" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>
          <path d="M16 15 H48" stroke="#3B6696" stroke-width="1.2"/>
          <path d="M8 24 C14 18.5 50 18.5 56 24 L53.5 27.5 C46 23.5 18 23.5 10.5 27.5Z" fill="#5B8EC8" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/></g>
        ${eyes}${smile}
      </g>`,
    },
    dracula: {
      name: "Count Dadcula", era: "Halloween", season: "halloween", moves: ["cape", "bat", "bleh"],
      svg: `<g class="collar2"><path d="M11 50 L3.5 28 L18.5 40 Z M53 50 L60.5 28 L45.5 40 Z" fill="#B3122E" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/>
        <path d="M9 44 L5.5 32 M55 44 L58.5 32" stroke="#E04A64" stroke-width="1.2" opacity=".8"/></g>
      <g class="body">${torso("#16121F")}
        <path d="M23 49.5 L41 49.5 L32 62 Z" fill="#fff" stroke="${INK}" stroke-width="1.4" stroke-linejoin="round"/>
        <path d="M24 49.5 L32 56 L40 49.5" fill="none" stroke="#B3122E" stroke-width="1.8"/>
        <circle cx="32" cy="57.6" r="2.5" fill="#F2B533" stroke="${INK}" stroke-width=".8"/>
      </g>${neck}
      <g class="hd">${head}
        <path d="M13 25 C12 15 19 8.5 32 8 C45 8.5 52 15 51 25 C49 21 45 19.5 40 19.5 C37 19.5 34.5 20.5 32 24.5 C29.5 20.5 27 19.5 24 19.5 C19 19.5 15 21 13 25Z" fill="#15121C" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>
        <path d="M19 14 C24 10.5 30 10 33 11 M36 11.5 C40 11 44 12.5 46.5 15" fill="none" stroke="#fff" stroke-width="1.2" opacity=".35" stroke-linecap="round"/>
        <path d="M17.5 25.8 L27 24 M37 24 L46.5 25.8" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>
        ${eyes}${smile}
        <path class="fangs" d="M28.3 40.5 L29.4 43.6 L30.5 40.9 Z M33.5 40.9 L34.6 43.6 L35.7 40.5 Z" fill="#fff" stroke="${INK}" stroke-width=".8" stroke-linejoin="round"/>
      </g>
      <path class="mv mv-bat" opacity="0" d="M0 0 C2 -3.5 4.5 -3.5 5.5 -1 C6.3 -3 7.7 -3 8.5 -1 C9.5 -3.5 12 -3.5 14 0 C12 -.6 10.5 1 9.3 2.2 C8.4 1.2 7.5 1.4 7 2.4 C6.5 1.4 5.6 1.2 4.7 2.2 C3.5 1 2 -.6 0 0Z" fill="#2A1F3D" stroke="#B3122E" stroke-width=".5"/>`,
    },
    filmi: {
      name: "Filmi Hero Dad", era: "1970s", moves: ["windflip", "shimmy", "dhishoom"],
      svg: `<g class="body">${torso("#C2185B")}
        <g fill="#FFD27A"><circle cx="10" cy="59" r=".9"/><circle cx="14" cy="55" r=".9"/><circle cx="18" cy="61" r=".9"/><circle cx="50" cy="56" r=".9"/><circle cx="54" cy="60" r=".9"/><circle cx="46" cy="61" r=".9"/></g>
        <path d="M23 49.5 L41 49.5 L35 64 L29 64Z" fill="#FFF3D6" stroke="${INK}" stroke-width="1.4" stroke-linejoin="round"/>
        <path d="M23.5 49 L31 53 L23 61 L18.5 52Z M40.5 49 L33 53 L41 61 L45.5 52Z" fill="#FFF3D6" stroke="${INK}" stroke-width="1.5" stroke-linejoin="round"/>
        <path d="M32 54 V64" stroke="#E7C98E" stroke-width="1"/>
      </g>${neck}
      <g class="hd">${head}
        <path d="M13.5 25 L13.5 34 L16.5 34 L16.5 24Z M50.5 25 L50.5 34 L47.5 34 L47.5 24Z" fill="#2A1A12"/>
        <g class="hair-f"><path d="M12.5 26 C9 17 14 6 25 5 C29 2.5 37 2.5 41 5 C52 6 56 16 51.5 26 C50 21 46 18.6 41 19 C38 15.5 34 15 31 17.5 C27.5 15 22 15.5 20 19.5 C16.5 20 14 22.5 12.5 26Z" fill="#2A1A12" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>
          <path d="M19 11 C23 8 28 7.5 32 9 M35 9.5 C39 8 44 9.5 47 13" fill="none" stroke="#fff" stroke-width="1.3" opacity=".3" stroke-linecap="round"/></g>
        ${eyes}${smile}
      </g>
      <g class="mv mv-wind" opacity="0" stroke="#F2B533" stroke-width="1.4" stroke-linecap="round" fill="none"><path d="M1 12 h9 M0 18 h12 M2 24 h8"/></g>
      <g class="mv mv-punch" opacity="0"><rect x="49" y="40" width="12" height="10" rx="3.5" fill="var(--metal)" stroke="${INK}" stroke-width="1.8"/>
        <path d="M52 40.5 v3.5 M55 40.5 v3.5 M58 40.5 v3.5" stroke="${INK}" stroke-width="1.2"/>
        <path d="M44 45 h5" stroke="#C2185B" stroke-width="6" stroke-linecap="round"/></g>
      <g class="mv mv-boom" opacity="0"><path d="M52 18 l3 5 5 -3 -1 6 6 1 -5 4 4 4 -6 0 1 6 -5 -4 -3 5 -2 -6 -6 2 3 -5 -5 -3 6 -1 -2 -6 5 3z" fill="#FFD23F" stroke="#C2185B" stroke-width="1.2" stroke-linejoin="round"/>
        <text x="56" y="32" text-anchor="middle" font-family="Nunito, sans-serif" font-weight="900" font-size="4.2" fill="#C2185B">DHISH!</text></g>`,
    },
    festive: {
      name: "Festive Dad", era: "Diwali", season: "diwali", moves: ["diya", "sparkler", "namaste"],
      svg: `<g class="body">${torso("#F2A01E")}
        <path d="M27 49.5 h10 v3 h-10z" fill="#C2185B" stroke="${INK}" stroke-width="1.2"/>
        <path d="M32 52.5 V64" stroke="#C2185B" stroke-width="2.4"/>
        <g fill="#FFF3D6"><circle cx="32" cy="55.5" r=".8"/><circle cx="32" cy="58.5" r=".8"/><circle cx="32" cy="61.5" r=".8"/></g>
        <path d="M8 60 q4 -3 8 0 M48 60 q4 -3 8 0" stroke="#C2185B" stroke-width="1.2" fill="none"/>
      </g>${neck}
      <g class="hd">${head}
        <path d="M14 26 C12.5 17 18 10.5 26 10 C31 7.5 40 8 45 11 C49.5 13.8 51.3 19.3 50 26 C48.5 21.5 45.5 19.6 40.5 19.6 L26 19.6 C20 19.6 15.5 21.8 14 26Z" fill="#2A1A12" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>
        ${eyes}${smile}
      </g>
      <g class="mv mv-diya" opacity="0"><path d="M22 54 Q32 62 42 54 Q37 52 32 52 Q27 52 22 54Z" fill="#C2410C" stroke="${INK}" stroke-width="1.4" stroke-linejoin="round"/>
        <path d="M24.5 54.3 Q32 52.6 39.5 54.3" stroke="#FFD27A" stroke-width="1" fill="none"/>
        <path class="flame" d="M32 51.5 C30 49 31 46.5 32 44.5 C33 46.5 34 49 32 51.5Z" fill="#FFC93C" stroke="#FF7A1A" stroke-width=".8"/></g>
      <g class="mv mv-spark" opacity="0"><path d="M55 48 L49 30" stroke="#8A8F98" stroke-width="1.4" stroke-linecap="round"/>
        <g stroke="#FFD27A" stroke-width="1.1" stroke-linecap="round"><path d="M49 30 l-4 -3 M49 30 l1 -5 M49 30 l5 -2 M49 30 l-5 2 M49 30 l4 4 M49 30 l-3 4"/></g>
        <circle cx="49" cy="30" r="1.6" fill="#fff"/></g>
      <g class="mv mv-namaste" opacity="0"><path d="M27 64 L30.5 47 Q32 44.5 33.5 47 L37 64Z" fill="var(--metal)" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/>
        <path d="M32 46.5 V60" stroke="${INK}" stroke-width="1"/></g>`,
    },
    cozy: {
      name: "Cozy Dad", era: "Winter", season: "winter", moves: ["cocoa", "snowball", "pompom"],
      svg: `<g class="body">${torso("#1F3A68")}
        <path d="M7 58 H57" stroke="#E84855" stroke-width="4"/>
        <g fill="#fff"><path d="M11 58 l1.5 -1.5 1.5 1.5 -1.5 1.5z"/><path d="M19 58 l1.5 -1.5 1.5 1.5 -1.5 1.5z"/><path d="M27 58 l1.5 -1.5 1.5 1.5 -1.5 1.5z"/><path d="M35 58 l1.5 -1.5 1.5 1.5 -1.5 1.5z"/><path d="M43 58 l1.5 -1.5 1.5 1.5 -1.5 1.5z"/><path d="M51 58 l1.5 -1.5 1.5 1.5 -1.5 1.5z"/></g>
        <path d="M24 49.5 Q32 54 40 49.5" fill="none" stroke="#E84855" stroke-width="2.4"/>
      </g>${neck}
      <g class="hd">${head}
        <path d="M14 25 C13.5 28 14.5 31 16 33 L18 25Z M50 25 C50.5 28 49.5 31 48 33 L46 25Z" fill="#6B4A32"/>
        <g class="toque"><path d="M13 22 C12 11 21 5 32 5 C43 5 52 11 51 22Z" fill="#E84855" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>
          <path d="M18 12 h28 M15.5 16.5 h33" stroke="#fff" stroke-width="2.2" opacity=".9"/>
          <rect x="11.5" y="19.5" width="41" height="6" rx="3" fill="#fff" stroke="${INK}" stroke-width="1.6"/>
          <circle class="pom" cx="32" cy="4.5" r="4" fill="#fff" stroke="${INK}" stroke-width="1.6"/></g>
        ${eyes}${smile}
      </g>
      <g class="mv mv-mug" opacity="0"><path d="M35 36 h10 v8 a3 3 0 0 1 -3 3 h-4 a3 3 0 0 1 -3 -3z" fill="#E84855" stroke="${INK}" stroke-width="1.6"/>
        <path d="M45 38 h1.5 a2.2 2.2 0 0 1 0 4.4 H45" fill="none" stroke="${INK}" stroke-width="1.6"/><path d="M36.5 39.5 h7" stroke="#fff" stroke-width="1.2"/>
        <path d="M38 33.5 c-1 -1.2 1 -2 0 -3.4 M41.5 33.5 c-1 -1.2 1 -2 0 -3.4" stroke="#C9D3DC" stroke-width="1.1" fill="none" stroke-linecap="round"/></g>
      <circle class="mv mv-snowball" opacity="0" cx="52" cy="46" r="3.6" fill="#fff" stroke="#A9BDD6" stroke-width="1"/>`,
    },
    lucky: {
      name: "Lucky Dad", era: "Lunar New Year", season: "lunar", moves: ["lantern", "envelope", "firecracker"],
      svg: `<g class="body">${torso("#B3122E")}
        <path d="M26 49.5 h12 v3.5 h-12z" fill="#B3122E" stroke="#F5C04A" stroke-width="1.2"/>
        <path d="M32 53 V64" stroke="#F5C04A" stroke-width="1.2"/>
        <g stroke="#F5C04A" stroke-width="1.3" stroke-linecap="round"><path d="M28.5 56 h7 M28.5 59.5 h7 M28.5 63 h7"/></g>
        <g fill="#F5C04A"><circle cx="28.5" cy="56" r=".9"/><circle cx="35.5" cy="56" r=".9"/><circle cx="28.5" cy="59.5" r=".9"/><circle cx="35.5" cy="59.5" r=".9"/></g>
      </g>${neck}
      <g class="hd">${head}
        <path d="M14 26 C12.5 17 18 10.5 26 10 C31 7.5 40 8 45 11 C49.5 13.8 51.3 19.3 50 26 C48.5 21.5 45.5 19.6 40.5 19.6 L26 19.6 C20 19.6 15.5 21.8 14 26Z" fill="#1E1A18" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>
        ${eyes}${smile}
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
        ${eyes}${smile}
      </g>
      <g class="mv mv-hand" opacity="0"><rect x="51.5" y="49" width="7" height="17" rx="2" fill="#127C7A" stroke="${INK}" stroke-width="1.6"/>
        <rect x="50.5" y="40" width="9" height="10.5" rx="3.5" fill="var(--metal)" stroke="${INK}" stroke-width="1.8"/>
        <path d="M52.6 40.5 v-3 M55 40.2 v-4 M57.4 40.5 v-3" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>
        <path d="M52.6 40.5 v-3 M55 40.2 v-4 M57.4 40.5 v-3" stroke="var(--metal)" stroke-width="1.2" stroke-linecap="round"/></g>
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
        <path d="M23.5 49.5 L40.5 49.5 L35 64 L29 64Z" fill="#DCE8F2" stroke="${INK}" stroke-width="1.4" stroke-linejoin="round"/>
        <path d="M24 49.2 L32 53.5 L28 57 L22.5 51Z M40 49.2 L32 53.5 L36 57 L41.5 51Z" fill="#fff" stroke="${INK}" stroke-width="1.3" stroke-linejoin="round"/>
        <circle cx="27.6" cy="60" r="1.1" fill="#F2D7A0" stroke="${INK}" stroke-width=".5"/><circle cx="36.4" cy="60" r="1.1" fill="#F2D7A0" stroke="${INK}" stroke-width=".5"/>
      </g>${neck}
      <g class="hd">${head}
        <path d="M19.5 20 Q25 17.3 30.5 18.2" stroke="#fff" stroke-width="1.7" opacity=".65" fill="none" stroke-linecap="round"/>
        <path d="M12.5 21.5 C8.5 20.5 7.2 24.6 9.4 26.8 C7.3 28.3 8.6 32.4 12.4 31.4Z M51.5 21.5 C55.5 20.5 56.8 24.6 54.6 26.8 C56.7 28.3 55.4 32.4 51.6 31.4Z" fill="#EEF1F4" stroke="${INK}" stroke-width="1.4" stroke-linejoin="round"/>
        <path d="M17.8 24.6 C20 22.4 25 22.4 27.6 24.6 M36.4 24.6 C39 22.4 44 22.4 46.2 24.6" stroke="${INK}" stroke-width="4.4" stroke-linecap="round" fill="none"/>
        <path d="M17.8 24.6 C20 22.4 25 22.4 27.6 24.6 M36.4 24.6 C39 22.4 44 22.4 46.2 24.6" stroke="#EEF1F4" stroke-width="2.8" stroke-linecap="round" fill="none"/>
        ${eyes}
        <g class="specs"><circle cx="23" cy="31" r="5.2" fill="#fff" fill-opacity=".18" stroke="#8A6A2E" stroke-width="1.5"/><circle cx="41" cy="31" r="5.2" fill="#fff" fill-opacity=".18" stroke="#8A6A2E" stroke-width="1.5"/>
          <path d="M28.2 31 Q32 29 35.8 31" fill="none" stroke="#8A6A2E" stroke-width="1.5"/></g>
        <path class="mouth" d="M26 41.6 Q32 45.6 38 41.6" fill="none" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/>
        <path class="stache" d="M32 37.2 C29.5 35 25.8 34.8 23.4 36.4 C21.8 37.4 20.6 36.8 20.2 35.4 C19.6 38.6 21.8 40.6 25 40 C27.6 39.6 30 39.4 32 39.8 C34 39.4 36.4 39.6 39 40 C42.2 40.6 44.4 38.6 43.8 35.4 C43.4 36.8 42.2 37.4 40.6 36.4 C38.2 34.8 34.5 35 32 37.2Z" fill="#EEF1F4" stroke="${INK}" stroke-width="1.4" stroke-linejoin="round"/>
        <path d="M26 37.4 Q28 36.8 30 37.6 M34 37.6 Q36 36.8 38 37.4" stroke="#B8C0C8" stroke-width=".9" fill="none" stroke-linecap="round"/>
      </g>
      <g class="mv mv-zzz" opacity="0"><text x="45" y="15" font-family="Nunito, sans-serif" font-weight="900" font-size="9" fill="#5B8EC8">Z</text>
        <text x="52" y="8" font-family="Nunito, sans-serif" font-weight="900" font-size="6.5" fill="#5B8EC8">z</text></g>
      <g class="mv mv-gfist" opacity="0"><rect x="51.5" y="47" width="7" height="19" rx="2" fill="#8E3B46" stroke="${INK}" stroke-width="1.6"/>
        <rect x="49.5" y="38" width="11" height="10" rx="3.5" fill="var(--metal)" stroke="${INK}" stroke-width="1.8"/>
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
        <path d="M13.2 27 C11.5 17.5 18 11.2 28 11 C38 10.4 49.5 13 50.8 27 C49.6 22.6 47.4 20.4 43.6 19.8 C37 18.8 31 19.4 27.5 17.2 C25 19.2 20.6 19.8 17.4 21.4 C15.2 22.6 14 24.4 13.2 27Z" fill="#4A4F57" stroke="${INK}" stroke-width="1.9" stroke-linejoin="round"/>
        <path d="M27.5 12.2 C27.2 14.4 27.3 16 27.5 17.2" stroke="#2E3238" stroke-width="1.2" fill="none" stroke-linecap="round"/>
        <path d="M13.6 25.6 C13.2 22.6 14 20.8 15.6 19.6 M50.4 25.6 C50.6 22.6 49.8 20.6 48 19.6" stroke="#C9CED6" stroke-width="1.8" fill="none" stroke-linecap="round"/>
        <path d="M33 13 C38 13 43 14.2 46 17" stroke="#8A9099" stroke-width="1.2" fill="none" stroke-linecap="round"/>
        <path d="M18 24.2 L27.5 23 M36.5 23 L46 24.2" stroke="#3B2A1E" stroke-width="2.6" stroke-linecap="round" fill="none"/>
        ${eyes}
        <g class="pspecs"><rect x="17" y="26.6" width="12" height="8.2" rx="2" fill="#fff" fill-opacity=".15" stroke="#262B33" stroke-width="2"/><rect x="35" y="26.6" width="12" height="8.2" rx="2" fill="#fff" fill-opacity=".15" stroke="#262B33" stroke-width="2"/>
          <path d="M29 29.6 Q32 28 35 29.6" fill="none" stroke="#262B33" stroke-width="1.8"/>
          <path class="glint" d="M19.2 29.2 L21.2 27.8 M37.2 29.2 L39.2 27.8" stroke="#fff" stroke-width="1.3" stroke-linecap="round" opacity=".8"/></g>
        ${smile}
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
        <path d="M13 25 L8.5 18.5 L14.5 19 L12 11 L19.5 14 L20 5.5 L26.5 11 L32 2.5 L37.5 11 L44 5.5 L44.5 14 L52 11 L49.5 19 L55.5 18.5 L51 25 C48 21.2 44.5 19.6 40.5 19.6 L23.5 19.6 C19.5 19.6 16 21.2 13 25Z" fill="#F2F2F2" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/>
        ${eyes}${smile}
        <g class="goggles"><path d="M11.5 21 H52.5" stroke="#12B5A0" stroke-width="3"/>
          <rect x="16.5" y="15.5" width="13" height="10" rx="4.5" fill="#BDF3EC" fill-opacity=".8" stroke="${INK}" stroke-width="1.6"/>
          <rect x="34.5" y="15.5" width="13" height="10" rx="4.5" fill="#BDF3EC" fill-opacity=".8" stroke="${INK}" stroke-width="1.6"/>
          <path d="M19 18.5 L22 17.5 M37 18.5 L40 17.5" stroke="#fff" stroke-width="1.2" stroke-linecap="round"/></g>
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
        ${eyes}
        <path d="M17.5 32 H28.5 Q28.5 36.5 23 36.5 Q17.5 36.5 17.5 32Z M35.5 32 H46.5 Q46.5 36.5 41 36.5 Q35.5 36.5 35.5 32Z" fill="#fff" fill-opacity=".25" stroke="#8C2F39" stroke-width="1.5"/>
        <path d="M28.5 32.5 Q32 31 35.5 32.5" stroke="#8C2F39" stroke-width="1.4" fill="none"/>
        <path d="M17.5 33 Q11 41 19 49 M46.5 33 Q53 41 45 49" stroke="#C99A2E" stroke-width="1.1" stroke-dasharray="1.6 1.4" fill="none"/>
        <path class="mouth" d="M26 41 Q32 44 38 41" fill="none" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/>
      </g>
      <g class="mv mv-book" opacity="0"><path d="M32 47 C27 44.5 21.5 44.5 17 46.5 V58 C21.5 56 27 56 32 58.5 C37 56 42.5 56 47 58 V46.5 C42.5 44.5 37 44.5 32 47Z" fill="#FFFBF2" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/>
        <path d="M32 47 V58.5" stroke="${INK}" stroke-width="1.2"/><path d="M20 49.5 H29 M20 52.5 H29 M35 49.5 H44 M35 52.5 H44" stroke="#8C7A66" stroke-width="1"/>
        <path d="M17 58 C21.5 56 27 56 32 58.5 C37 56 42.5 56 47 58 V60 H17Z" fill="#8C2F39" stroke="${INK}" stroke-width="1.2"/></g>
      <g class="mv mv-tea" opacity="0"><path d="M36 37 h10 v8 a3 3 0 0 1 -3 3 h-4 a3 3 0 0 1 -3 -3z" fill="#fff" stroke="${INK}" stroke-width="1.6"/>
        <path d="M46 39 h1.5 a2.2 2.2 0 0 1 0 4.4 H46" fill="none" stroke="${INK}" stroke-width="1.6"/>
        <path d="M41 37 V43" stroke="#C9B07A" stroke-width=".9"/><rect x="39.6" y="43" width="2.8" height="3" fill="#8C2F39"/>
        <path d="M39 34.5 c-1 -1.2 1 -2 0 -3.4 M42.5 34.5 c-1 -1.2 1 -2 0 -3.4" stroke="#8796A5" stroke-width="1.1" fill="none" stroke-linecap="round"/></g>
      <g class="mv mv-shh" opacity="0"><rect x="29.6" y="33" width="4.8" height="15" rx="2.4" fill="var(--metal)" stroke="${INK}" stroke-width="1.5"/>
        <rect x="26" y="45" width="12" height="9" rx="3.5" fill="var(--metal)" stroke="${INK}" stroke-width="1.6"/></g>`,
    },
    coach: {
      name: "Coach Dad", era: "Gym", moves: ["whistle", "clipboard", "stopwatch"],
      svg: `<g class="body">${torso("#1F2F5C")}
        <path d="M5.5 60 L14 51.8 M58.5 60 L50 51.8" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/>
        <path d="M27 49.6 L32 52.5 L37 49.6" fill="none" stroke="#fff" stroke-width="1.8" stroke-linejoin="round"/>
        <path d="M32 52.5 V64" stroke="#C9D3DC" stroke-width="1.3"/>
        <path d="M22.5 49.6 Q32 61 41.5 49.6" fill="none" stroke="#C8102E" stroke-width="1.6"/>
        <g class="lwhistle"><rect x="29.5" y="54.5" width="6" height="3.6" rx="1.6" fill="#C9D3DC" stroke="${INK}" stroke-width="1.1"/><circle cx="30.6" cy="56.3" r="1" fill="${INK}"/></g>
      </g>${neck}
      <g class="hd">${head}
        <path d="M15 24 C14 28 14.5 30.5 16 32 L18 24Z M49 24 C50 28 49.5 30.5 48 32 L46 24Z" fill="#5A3A22" stroke="${INK}" stroke-width="1.1"/>
        ${eyes}
        <path d="M24.5 37.5 Q28.5 34.6 32 36.6 Q35.5 34.6 39.5 37.5 Q35.5 39.6 32 38.4 Q28.5 39.6 24.5 37.5Z" fill="#5A3A22" stroke="${INK}" stroke-width="1" stroke-linejoin="round"/>
        <path class="mouth" d="M27 41 Q32 44 37 41" fill="none" stroke="${INK}" stroke-width="2.2" stroke-linecap="round"/>
        <g class="ccap"><path d="M12.5 23 C11.5 10.5 20 4.5 32 4.5 C44 4.5 52.5 10.5 51.5 23Z" fill="#C8102E" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>
          <path d="M32 4.5 C30 10 29.5 16 30 23 M32 4.5 C34 10 34.5 16 34 23" stroke="#9E0C24" stroke-width="1.1" fill="none"/>
          <path d="M11.5 22.5 Q32 26.5 52.5 22.5 L52 25.5 Q32 29.5 12 25.5Z" fill="#9E0C24" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/>
          <text x="32" y="17.5" text-anchor="middle" font-family="Graduate, 'Nunito', sans-serif" font-size="9" fill="#fff">D</text></g>
      </g>
      <g class="mv mv-whistle" opacity="0"><rect x="28" y="37.5" width="9" height="5" rx="2.2" fill="#C9D3DC" stroke="${INK}" stroke-width="1.3"/>
        <path d="M39.5 36 L44 33.5 M40 40 H45.5 M39.5 44 L44 46.5" stroke="#C8102E" stroke-width="1.6" stroke-linecap="round"/></g>
      <g class="mv mv-clip" opacity="0"><rect x="46" y="36" width="15" height="21" rx="2" fill="#B07A44" stroke="${INK}" stroke-width="1.6"/>
        <rect x="48" y="40" width="11" height="15" fill="#fff" stroke="${INK}" stroke-width=".8"/><rect x="50.5" y="34.5" width="6" height="3.6" rx="1" fill="#C9D3DC" stroke="${INK}" stroke-width="1"/>
        <path d="M49.5 44 l1.5 1.5 l3 -3 M49.5 49.5 l1.5 1.5 l3 -3" stroke="#2E8B57" stroke-width="1.3" fill="none" stroke-linecap="round"/><path d="M55.5 44.5 H58 M55.5 50 H58" stroke="#8796A5" stroke-width="1"/></g>
      <g class="mv mv-watch" opacity="0"><circle cx="53" cy="11" r="7" fill="#fff" stroke="${INK}" stroke-width="1.6"/><rect x="51.5" y="1.5" width="3" height="2.6" fill="#C9D3DC" stroke="${INK}" stroke-width="1"/>
        <path class="hand" d="M53 11 V6.2" stroke="#C8102E" stroke-width="1.6" stroke-linecap="round"/><circle cx="53" cy="11" r="1" fill="${INK}"/></g>`,
    },
  };
  const LOOK_AVATAR = { classic: "modern", arcade: "eighties", vhs: "nineties", y2k: "y2k", diner: "fifties", skate: "skater", gamer: "gamer", summer: "bucket", halloween: "dracula", bolly: "filmi", diwali: "festive", winter: "cozy", lunar: "lucky", eid: "eiddad", chalk: "professor", lab: "labdad", library: "bookworm", gym: "coach", cheat: "eighties" };

  function installSymbols(sprite){
    for (const [k, a] of Object.entries(AVATARS)) {
      if (document.getElementById("av-" + k)) continue;
      const sym = document.createElementNS("http://www.w3.org/2000/svg", "symbol");
      sym.id = "av-" + k; sym.setAttribute("viewBox", "0 0 64 64"); sym.innerHTML = a.svg; sprite.appendChild(sym);
    }
  }
  window.RoboAvatars = { AVATARS, LOOK_AVATAR, installSymbols };
})();
