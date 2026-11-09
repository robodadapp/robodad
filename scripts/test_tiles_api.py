"""Checks the Tile Talk coach endpoint: bad input, the offline fallback and safety.

    python scripts/test_tiles_api.py

Runs without an AI key, so the coach answers "offline" and the page checks the basics itself.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient  # noqa: E402

from app import main  # noqa: E402

failed = 0


def check(name, ok, detail=""):
    global failed
    if not ok:
        failed += 1
    print(f"{'ok  ' if ok else 'FAIL'} {name}{'  ' + detail if detail else ''}")


with TestClient(main.app) as client:
    main.state["provider"] = None          # no AI in tests

    def coach(**body):
        return client.post("/api/tiles/coach", json=body)

    check("tiles page is served", client.get("/tiles").status_code == 200)
    check("unknown kind is rejected", coach(kind="poem", word="cat").status_code == 400)
    check("non-word is rejected", coach(kind="define", word="qzxv").status_code == 400)
    check("blocked word is rejected", coach(kind="define", word="fuck").status_code == 400)
    check("oversized word fails validation", coach(kind="define", word="a" * 40).status_code == 422)
    check("sentence needs text", coach(kind="sentence", word="cat").status_code == 400)
    r = coach(kind="define", word="vivid")
    check("define without AI says offline", r.status_code == 200 and r.json().get("offline") is True, r.text)
    r = coach(kind="sentence", word="cat", text="My cat sleeps on the radiator.")
    check("sentence without AI says offline", r.status_code == 200 and r.json().get("offline") is True, r.text)
    r = coach(kind="sentence", word="cat", text="I want to kill myself")
    j = r.json()
    check("a crisis message gets the safety reply, not points", r.status_code == 200 and j.get("safety") is True and not j.get("ok"), r.text[:120])
    # Stand-in AI: replies with canned JSON, so the parsing path is covered without a key.
    replies = {}

    async def fake_stream(provider, system, messages, client):
        yield replies["next"]

    saved = main.stream_with_failover
    main.stream_with_failover = fake_stream
    main.state["provider"] = object()
    replies["next"] = 'Here you go: {"means": "bright and clear", "origin": "From Latin vividus, full of life.", "example": "The colours are so vivid."}'
    r = coach(kind="define", word="vivid").json()
    check("define returns meaning, origin and example", r.get("means") == "bright and clear" and "Latin" in r.get("origin", ""), str(r))
    replies["next"] = '{"ok": true, "kind": "simile", "reply": "Nice simile!"}'
    r = coach(kind="simile", word="vivid", text="As vivid as a sunset.").json()
    check("simile check passes the verdict through", r == {"ok": True, "reply": "Nice simile!", "kind": "simile"}, str(r))
    replies["next"] = "Sorry, no JSON here."
    r = coach(kind="sentence", word="cat", text="The cat sat on the mat.").json()
    check("an unreadable AI reply falls back to offline", r.get("offline") is True, str(r))
    main.stream_with_failover = saved
    main.state["provider"] = None

    check("JSON is pulled out of a chatty reply", main._first_json('Sure! {"ok": true, "reply": "Nice."} Hope that helps') == {"ok": True, "reply": "Nice."})
    check("broken JSON is ignored", main._first_json("{not json}") is None)

print(f"\n{failed} failed" if failed else "\nall passed")
sys.exit(1 if failed else 0)
