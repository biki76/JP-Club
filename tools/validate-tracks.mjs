import fs from 'fs';
let errors = 0;
const check = (file, data) => {
  if (!data) { console.log(`FAIL: ${file} empty`); errors++; return; }
  if (Array.isArray(data)) {
    const ids = new Set();
    for (const item of data) {
      if (!item.id) { console.log(`FAIL: ${file} missing id`); errors++; }
      if (ids.has(item.id)) { console.log(`FAIL: ${file} dup id ${item.id}`); errors++; }
      ids.add(item.id);
      if (item.words) {
        const wids = new Set();
        for (const w of item.words) {
          if (!w.id || !w.english_meaning || !w.bengali_meaning) { console.log(`FAIL: ${file} word ${w.id} missing fields`); errors++; }
          if (wids.has(w.id)) { console.log(`FAIL: ${file} dup word ${w.id}`); errors++; }
          wids.add(w.id);
        }
      }
    }
  } else if (data.grammar || data.reading || data.listening) {
    for (const track of ['grammar','reading','listening']) {
      if (!data[track]) continue;
      const ids = new Set();
      for (const item of data[track]) {
        if (!item.id) { console.log(`FAIL: ${file} ${track} missing id`); errors++; }
        if (ids.has(item.id)) { console.log(`FAIL: ${file} dup ${track} ${item.id}`); errors++; }
        ids.add(item.id);
        if (item.questions) {
          for (const q of item.questions) {
            if (q.correctIndex >= q.options.length) { console.log(`FAIL: ${file} ${item.id} correctIndex OOB`); errors++; }
          }
        }
      }
    }
  }
};
for (const f of ['content/mimikara/index.json','content/shinkanzen/index.json']) {
  if (fs.existsSync(f)) {
    try { check(f, JSON.parse(fs.readFileSync(f,'utf8'))); }
    catch (e) { console.log(`FAIL: ${f} ${e.message}`); errors++; }
  }
}
if (errors === 0) console.log('PASS: tracks valid');
else { console.log(`FAIL: ${errors} errors`); process.exit(1); }
