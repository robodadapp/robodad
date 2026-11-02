(() => {
  const get = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
  const open = (parseInt(get("robodad.hunt") || "0", 10) || 0) >= 4 || !!get("robodad.hunt.done") || !!get("robodad.family");
  document.getElementById(open ? "attic" : "locked").hidden = false;
  if (!open) return;
  const said = document.getElementById("said"), stub = document.getElementById("stub");
  document.getElementById("boxes").addEventListener("click", (e) => {
    const b = e.target.closest(".box"); if (!b) return;
    b.setAttribute("aria-expanded", "true");
    if (b.dataset.stub) { said.textContent = "Papers, receipts… and this:"; stub.hidden = false; stub.scrollIntoView({ behavior: "smooth", block: "start" }); }
    else { said.textContent = b.dataset.say; }
  });
})();
