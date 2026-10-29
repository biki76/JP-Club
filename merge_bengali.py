import json

with open('data/mimikara/bengali_glossary.json', encoding='utf-8') as f:
    glossary = json.load(f)
with open('data/mimikara/vocabulary.json', encoding='utf-8') as f:
    vocab = json.load(f)

merged = 0
for e in vocab:
    k = e.get('kanji', '')
    if k in glossary:
        e['bengali_meaning'] = glossary[k]
        merged += 1

with open('data/mimikara/vocabulary.json', 'w', encoding='utf-8') as f:
    json.dump(vocab, f, ensure_ascii=False, indent=2)

print(f"✅ Merged Bengali into {merged} / {len(vocab)} entries.")
