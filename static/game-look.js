// Game pages (chess, Tile Talk) follow the look you picked in RoboDad: its accent colour, a tint in the dark
// background and its heading font. The games stay dark on purpose; the dad's board skins are untouched.
(function () {
  var LOOKS = {
    classic:["#F5C518", ""], arcade:["#2DE2E6", "Bungee"], vhs:["#FFB547", "Righteous"], y2k:["#6CCB3F", "Comfortaa:wght@700"],
    diner:["#2BB3A3", "Lobster"], skate:["#3FC7D1", "Permanent+Marker"], summer:["#4FC3F7", "Graduate"], gamer:["#A06BFF", "Orbitron:wght@800"],
    bolly:["#FF9A1F", "Rozha+One"], diwali:["#FF5FA2", "Rozha+One"], winter:["#5BE0A0", "Sniglet:wght@800"], lunar:["#F5C04A", "Rozha+One"],
    eid:["#2EC4B6", "Amiri:wght@700"], halloween:["#8BE04E", "Creepster"], chalk:["#F28CB1", "Gochi+Hand"], lab:["#2ED3BC", "Fredoka:wght@700"],
    library:["#C9A227", "Playfair+Display:wght@800"], gym:["#FCA311", "Graduate"], cheat:["#FF4D6D", "Bungee"]
  };
  var look = "classic";
  try { look = localStorage.getItem("robodad.look") || "classic"; } catch (e) {}
  var L = LOOKS[look]; if (!L || look === "classic") return;
  var root = document.documentElement;
  root.dataset.glook = look;
  root.style.setProperty("--look", L[0]);
  if (L[1]) {
    var fam = L[1].split(":")[0].replace(/\+/g, " ");
    root.style.setProperty("--lookfont", '"' + fam + '", Nunito, ui-rounded, system-ui, sans-serif');
    var l = document.createElement("link"); l.rel = "stylesheet";
    l.href = "https://fonts.googleapis.com/css2?family=" + L[1] + "&display=swap"; document.head.appendChild(l);
  }
  var css = document.createElement("style");
  css.textContent =
    ':root[data-glook]{--gold:var(--look); --bg:color-mix(in srgb, var(--look) 13%, #0B0B14); --panel:color-mix(in srgb, var(--look) 15%, #16142A);' +
    ' --edge:color-mix(in srgb, var(--look) 48%, #2A2650)}' +
    ':root[data-glook] body{background:var(--bg)}' +
    ':root[data-glook] .top h1{font-family:var(--lookfont, inherit); letter-spacing:.01em}';
  document.head.appendChild(css);
})();
