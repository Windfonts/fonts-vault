#!/usr/bin/env python3
"""Count /api/css Referer splits for suspect families + OPPO."""
from __future__ import annotations

import gzip
import os
import re
from collections import Counter, defaultdict
from urllib.parse import unquote, urlparse

BASE = "/www/wwwlogs"
SELF = re.compile(r"(windfonts\.com|localhost|127\.0\.0\.1)", re.I)
FAM_RE = re.compile(r"[?&]family=([^&\s\"']+)", re.I)

TARGETS = {
    "sypscn",
    "sourcehanserifcnfordisplay",
    "syhtsc",
    "syhtcn",
    "syhttw",
    "syhtxt",
    "systsc",
    "sourcehansansscregular",
    "sourcehansanscnregular",
    "sourcehansanstwregular",
    "sourcehansansxtregular",
    "sourcehanserifscregular",
    "hxbsbt",
    "hzpyt",
    "kslmt",
    "myrbsxt",
    "qtqmt",
    "huxiaobokuhei",
    "happyzcool2016",
    "pmzdcst60",
    "pangmenzhengdaocu60",
    "opposansb",
    "opsa",
}

ORDER = [
    "sypscn",
    "sourcehanserifcnfordisplay",
    "syhtsc",
    "syhtcn",
    "syhttw",
    "syhtxt",
    "systsc",
    "sourcehansansscregular",
    "sourcehansanscnregular",
    "sourcehansanstwregular",
    "sourcehansansxtregular",
    "sourcehanserifscregular",
    "hxbsbt",
    "hzpyt",
    "kslmt",
    "myrbsxt",
    "qtqmt",
    "huxiaobokuhei",
    "happyzcool2016",
    "pmzdcst60",
    "opposansb",
    "opsa",
]


def open_log(path: str):
    if path.endswith(".gz"):
        return gzip.open(path, "rt", errors="replace")
    return open(path, "rt", errors="replace")


def host_of(ref: str) -> str:
    if not ref or ref in ("-", '"-"'):
        return "empty"
    ref = ref.strip().strip('"')
    try:
        h = urlparse(ref).hostname or ""
    except Exception:
        return "empty"
    if not h:
        return "empty"
    if SELF.search(h):
        return "self"
    return h.lower()


def short_key(fam: str) -> str:
    return fam.lower().replace("wenfeng-", "").replace("windfonts-", "")


def main() -> None:
    logs = []
    for name in os.listdir(BASE):
        if name.startswith("windfonts-app.log") or name.startswith("windfonts.com.log"):
            logs.append(os.path.join(BASE, name))

    merged: dict[str, Counter] = defaultdict(Counter)
    hosts: dict[str, Counter] = defaultdict(Counter)
    n_lines = 0
    n_hit = 0

    for path in sorted(logs):
        try:
            f = open_log(path)
        except OSError as e:
            print("skip", path, e)
            continue
        with f:
            for line in f:
                n_lines += 1
                if "/api/css" not in line:
                    continue
                m = FAM_RE.search(line)
                if not m:
                    continue
                key = short_key(unquote(m.group(1)).strip())
                if key not in TARGETS and "oppo" not in key:
                    continue
                n_hit += 1
                parts = re.findall(r'"([^"]*)"', line)
                ref = "-"
                if len(parts) >= 2:
                    # combined: request, referer, ua
                    ref = parts[1] if parts[0].startswith("GET ") or parts[0].startswith("HEAD ") else parts[-2]
                rm = re.search(r'"referer"\s*:\s*"([^"]*)"', line, re.I)
                if rm:
                    ref = rm.group(1)
                cat = host_of(ref)
                if cat == "empty":
                    merged[key]["empty"] += 1
                elif cat == "self":
                    merged[key]["self"] += 1
                else:
                    merged[key]["ext"] += 1
                    hosts[key][cat] += 1

    print(f"logs={len(logs)} lines={n_lines} hits={n_hit}")
    print(f"{'family':36} {'ext':>5} {'self':>5} {'empty':>5}  hosts")
    seen = set()
    for key in ORDER + sorted(k for k in merged if k not in ORDER):
        seen.add(key)
        c = merged.get(key, Counter())
        hs = ", ".join(f"{h}:{n}" for h, n in hosts[key].most_common(6)) or "-"
        print(f"{key:36} {c['ext']:5} {c['self']:5} {c['empty']:5}  {hs}")


if __name__ == "__main__":
    main()
