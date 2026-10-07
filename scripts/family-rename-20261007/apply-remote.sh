#!/bin/bash
# Apply vault fontFamily rename on feicode-prod. Run as root.
set -euo pipefail

DATA=/www/wwwroot/fonts-vault/data
DB="$DATA/prod.db"
ALIAS="$DATA/family-aliases.json"
STAMP=20261007-family-rename
WORK=/www/wwwroot/fonts-vault/data/_family-rename-20261007
BAK_DB="$DATA/prod.db.bak-$STAMP"
BAK_ALIAS="$DATA/family-aliases.json.bak-$STAMP"

die() { echo "FATAL: $*" >&2; exit 1; }

[[ -f "$WORK/expected.json" ]] || die "missing $WORK/expected.json"
[[ -f "$WORK/apply.sql" ]] || die "missing $WORK/apply.sql"
[[ -f "$WORK/apply-aliases.json" ]] || die "missing $WORK/apply-aliases.json"
[[ -f "$DB" ]] || die "missing $DB"
command -v sqlite3 >/dev/null || die "no sqlite3"
command -v python3 >/dev/null || die "no python3"
docker inspect fonts-vault >/dev/null 2>&1 || die "fonts-vault container missing"

echo "== pre-verify current font_family matches expected old =="
python3 - "$DB" "$WORK/expected.json" <<'PY'
import json, sqlite3, sys
db, exp_path = sys.argv[1], sys.argv[2]
exp = json.load(open(exp_path))
con = sqlite3.connect(f"file:{db}?mode=ro", uri=True)
con.row_factory = sqlite3.Row
bad = []
missing = []
for r in exp:
    row = con.execute(
        "SELECT font_family, status, normalized_name FROM fonts WHERE id=?",
        (r["id"],),
    ).fetchone()
    if row is None:
        missing.append(r["id"])
        continue
    if row["font_family"] != r["old"] or row["status"] != "published":
        bad.append(
            {
                "id": r["id"],
                "want_old": r["old"],
                "got": row["font_family"],
                "status": row["status"],
                "norm": row["normalized_name"],
            }
        )
print("expected", len(exp), "mismatch", len(bad), "missing", len(missing))
if missing or bad:
    print(json.dumps({"missing": missing[:10], "bad": bad[:10]}, ensure_ascii=False, indent=2))
    sys.exit(2)
PY

echo "== backup =="
if [[ -f "$BAK_DB" ]]; then
  echo "backup already exists: $BAK_DB"
else
  sqlite3 "$DB" ".backup '$BAK_DB'"
fi
if [[ -f "$BAK_ALIAS" ]]; then
  echo "alias bak already exists: $BAK_ALIAS"
else
  cp -a "$ALIAS" "$BAK_ALIAS"
fi
ls -l "$BAK_DB" "$BAK_ALIAS"
# size gate: bak should be ~20MB
python3 - "$BAK_DB" <<'PY'
import os, sys
p=sys.argv[1]
n=os.path.getsize(p)
print("bak_db_bytes", n)
if n < 1_000_000:
    raise SystemExit("backup too small")
PY

echo "== apply two-phase UPDATE (one transaction) =="
python3 - "$DB" "$WORK/expected.json" <<'PY'
import json, sqlite3, sys
db, exp_path = sys.argv[1], sys.argv[2]
exp = json.load(open(exp_path))
ids = [r["id"] for r in exp]
con = sqlite3.connect(db, timeout=30)
con.execute("PRAGMA busy_timeout=30000")
try:
    con.execute("BEGIN IMMEDIATE")
    q = "UPDATE fonts SET font_family = font_family || '__tmp' WHERE id IN ({})".format(
        ",".join("?" * len(ids))
    )
    cur = con.execute(q, ids)
    phase1 = cur.rowcount
    if phase1 != len(ids):
        raise SystemExit(f"phase1 rowcount {phase1} != {len(ids)}")
    bad2 = []
    for r in exp:
        cur = con.execute(
            "UPDATE fonts SET font_family=? WHERE id=? AND font_family=?",
            (r["new"], r["id"], r["old"] + "__tmp"),
        )
        if cur.rowcount != 1:
            bad2.append(r["id"])
    if bad2:
        raise SystemExit(f"phase2 missed {len(bad2)} e.g. {bad2[:5]}")
    tmp = con.execute(
        "SELECT COUNT(*) FROM fonts WHERE font_family LIKE '%__tmp'"
    ).fetchone()[0]
    if tmp:
        raise SystemExit(f"tmp leftover {tmp}")
    con.execute("COMMIT")
    print("phase1", phase1, "phase2", len(exp), "committed")
except Exception:
    try:
        con.execute("ROLLBACK")
    except Exception:
        pass
    raise
finally:
    con.close()
PY

echo "== post-verify new font_family =="
python3 - "$DB" "$WORK/expected.json" <<'PY'
import json, sqlite3, sys
from collections import defaultdict
db, exp_path = sys.argv[1], sys.argv[2]
exp = json.load(open(exp_path))
con = sqlite3.connect(f"file:{db}?mode=ro", uri=True)
bad = []
tmp = con.execute("SELECT COUNT(*) FROM fonts WHERE font_family LIKE '%__tmp'").fetchone()[0]
if tmp:
    raise SystemExit(f"tmp leftover {tmp}")
for r in exp:
    row = con.execute("SELECT font_family, status FROM fonts WHERE id=?", (r["id"],)).fetchone()
    if not row or row[0] != r["new"] or row[1] != "published":
        bad.append({"id": r["id"], "want": r["new"], "got": None if not row else row})
# published uniqueness
dups = con.execute(
    """
    SELECT lower(font_family) ff, COUNT(*) n
    FROM fonts WHERE status='published'
    GROUP BY 1 HAVING n>1
    """
).fetchall()
print("updated_ok", len(exp) - len(bad), "bad", len(bad), "published_dups", len(dups))
if bad or dups:
    print(json.dumps({"bad": bad[:10], "dups": dups[:10]}, ensure_ascii=False))
    sys.exit(3)
# spot
for fam in (
    "wenfeng-xwwkb",
    "wenfeng-harmsa",
    "wenfeng-kisjp",
    "wenfeng-zmxs",
    "wenfeng-zhi-mang-xing",
    "wenfeng-cjksxz",
    "wenfeng-cjkfqlt",
    "wenfeng-hcdht",
    "wenfeng-clduan",
    "wenfeng-hxbsbt",
):
    rows = con.execute(
        "SELECT name, normalized_name, status FROM fonts WHERE font_family=?",
        (fam,),
    ).fetchall()
    print("spot", fam, rows)
PY

echo "== install aliases =="
python3 - "$WORK/apply-aliases.json" <<'PY'
import json, sys
raw=json.load(open(sys.argv[1]))
assert "aliases" in raw and len(raw["aliases"]) > 500
print("alias_keys", len(raw["aliases"]))
PY
cp "$WORK/apply-aliases.json" "$ALIAS"
chmod 644 "$ALIAS"

echo "== chown db (container user mysql:65533) =="
sqlite3 "$DB" "PRAGMA wal_checkpoint(TRUNCATE);" || true
chown mysql:65533 "$DB" || true
chown mysql:65533 "$DB"-wal "$DB"-shm 2>/dev/null || true
ls -l "$DB" "$ALIAS"

echo "== docker restart fonts-vault =="
docker restart fonts-vault
# wait listen
ok=0
for i in $(seq 1 40); do
  code=$(curl -sS -o /dev/null -w '%{http_code}' --max-time 2 "http://127.0.0.1:4000/api/css?family=wenfeng-xwwkb" || true)
  if [[ "$code" == "200" ]]; then ok=1; break; fi
  echo "wait $i code=$code"
  sleep 1
done
[[ "$ok" == "1" ]] || die "fonts-vault did not serve xwwkb after restart"

echo "== probe =="
probe() {
  local fam="$1" expect="$2"
  local tmp="/tmp/css-probe-$fam.css"
  local code
  code=$(curl -sS -o "$tmp" -w '%{http_code}' --max-time 8 "http://127.0.0.1:4000/api/css?family=$fam" || echo ERR)
  local bytes=0
  [[ -f "$tmp" ]] && bytes=$(wc -c < "$tmp" | tr -d ' ')
  local face="no"
  grep -q '@font-face' "$tmp" 2>/dev/null && face=yes
  local wf
  wf=$(grep -o 'font-family:[^;]*' "$tmp" 2>/dev/null | head -1 || true)
  echo "PROBE $fam expect=$expect code=$code bytes=$bytes face=$face $wf"
  if [[ "$expect" == "200" && "$code" != "200" ]]; then
    echo "FAIL $fam" >&2
    return 1
  fi
  if [[ "$expect" == "404" && "$code" != "404" ]]; then
    echo "FAIL $fam wanted 404 got $code" >&2
    return 1
  fi
  if [[ "$expect" == "200" && "$face" != "yes" ]]; then
    echo "FAIL $fam no @font-face" >&2
    return 1
  fi
  return 0
}

fail=0
probe wenfeng-xwwkb 200 || fail=1
probe wenfeng-xwbright 200 || fail=1
probe wenfeng-harmsa 200 || fail=1
probe wenfeng-harmony 200 || fail=1
probe wenfeng-kisjp 200 || fail=1
probe wenfeng-kaiso 404 || fail=1
probe wenfeng-zmxs 200 || fail=1
probe wenfeng-zhi-mang-xing 200 || fail=1
probe wenfeng-clduan 200 || fail=1
probe wenfeng-hcdht 200 || fail=1
probe wenfeng-cjksxz 200 || fail=1
probe wenfeng-cjkfqlt 200 || fail=1
probe wenfeng-hxbsbt 200 || fail=1
probe wenfeng-hxbsb 200 || fail=1
probe wenfeng-hlbst 200 || fail=1
probe wenfeng-hongleibanshu 200 || fail=1
probe wenfeng-mksjhtc 200 || fail=1
probe wenfeng-matc 200 || fail=1
probe xwwkb 200 || fail=1
probe harmony 200 || fail=1

# packs path check: xwwkb should still be Xwbright
echo "== pack path snippets =="
for fam in wenfeng-xwwkb wenfeng-xwbright wenfeng-zmxs wenfeng-zhi-mang-xing wenfeng-clduan wenfeng-cjkfqlt wenfeng-kaiso; do
  echo -n "$fam: "
  grep -oE 'fonts-packages/[^/]+' "/tmp/css-probe-$fam.css" 2>/dev/null | sort -u | tr '\n' ' '
  echo
done

if [[ "$fail" != "0" ]]; then
  die "probe failures"
fi
echo "APPLY_OK"
