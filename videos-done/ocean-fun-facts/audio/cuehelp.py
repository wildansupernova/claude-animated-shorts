"""word-time helpers for cues.py files: W('word', nth, fromLine) -> seconds of the word start"""
import json, os, re


def sheet(vdir):
    words = json.load(open(os.path.join(vdir, "voice", "words.json")))
    norm = lambda s: re.sub(r"[^a-z0-9']", "", s.lower())

    def W(word, nth=0, from_line=0, end=False):
        n, k = norm(word), 0
        for w in words:
            if w.get("line", 0) < from_line:
                continue
            if norm(w["w"]) == n:
                if k == nth:
                    return w["e"] if end else w["s"]
                k += 1
        raise KeyError(word)

    def L(i):
        return min(w["s"] for w in words if w.get("line") == i)

    return W, L, words[-1]["e"]
