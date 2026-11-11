import json, urllib.request, re, os, time

# All kana page slugs used by Japanivasha
slugs = [
    "a","i","u","e","o",
    "ka","ki","ku","ke","ko",
    "sa","shi","su","se","so",
    "ta","chi","tsu","te","to",
    "na","ni","nu","ne","no",
    "ha","hi","hu","he","ho",
    "ma","mi","mu","me","mo",
    "ya","yu","yo",
    "ra","ri","ru","re","ro",
    "wa"
]

base = "https://japanivasha.blogspot.com/2020/09/{}.html?m=1"
glossary_path = "data/mimikara/bengali_glossary.json"

# Load existing glossary
with open(glossary_path, encoding="utf-8") as f:
    glossary = json.load(f)

before = len(glossary)
added = 0

for slug in slugs:
    url = base.format(slug)
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        html = urllib.request.urlopen(req, timeout=15).read().decode("utf-8", errors="ignore")
    except Exception as e:
        print(f"  x {slug}: {e}")
        continue

    # Each N3 row looks like: kana | Kanji [reading] | Bengali meaning | N3
    # We split by "|" and look for the line containing "N3" at the end.
    for line in html.splitlines():
        if "| N3" not in line and "|N3" not in line:
            continue
        parts = [p.strip() for p in line.split("|")]
        if len(parts) < 4:
            continue
        kanji_field = parts[1]
        meaning = parts[2]

        # Extract the plain kanji from something like "間 [ma] [মা]"
        kanji_match = re.search(r"([\u4e00-\u9fff々]+)", kanji_field)
        if not kanji_match:
            # If no kanji, try the kana field itself (for kana-only words)
            kana_field = parts[0]
            if re.fullmatch(r"[\u3040-\u309f]+", kana_field):
                key = kana_field
            else:
                continue
        else:
            key = kanji_match.group(1)

        # Clean meaning: remove trailing English if present
        meaning = meaning.split(";")[0].strip()
        if key and key not in glossary:
            glossary[key] = meaning
            added += 1
    time.sleep(0.2)

with open(glossary_path, "w", encoding="utf-8") as f:
    json.dump(glossary, f, ensure_ascii=False, indent=2)

print(f"✅ Glossary: {before} → {len(glossary)} entries (+{added} new N3 words from Japanivasha).")
