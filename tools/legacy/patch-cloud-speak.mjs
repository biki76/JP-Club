import fs from 'fs';
const p = 'js/cloud.js';
let c = fs.readFileSync(p, 'utf8');
if (c.includes('nihongo_speak_log')) { console.log('already patched'); process.exit(0); }

const keyAnchor = "'nihongo_srs_cards', 'nihongo_srs_log', 'nihongo_srs_prefs', 'nihongo_srs_meta',";
const caseAnchor = "case 'nihongo_srs_log': return mergeSrsLog(l, r);";
const fnAnchor = 'function mergeSrsLog';
const missing = [['keys', keyAnchor], ['case', caseAnchor], ['function', fnAnchor]].filter(x => !c.includes(x[1]));
if (missing.length) { console.log('anchor not found: ' + missing.map(x => x[0]).join(', ')); process.exit(1); }

fs.copyFileSync(p, p + '.bak');
const fns = [
'  function mergeSpeakLog(l, r) {',
'    l = (l && typeof l === "object") ? l : {};',
'    r = (r && typeof r === "object") ? r : {};',
'    var out = {}, k;',
'    for (k in l) out[k] = l[k];',
'    for (k in r) out[k] = Math.max(out[k] || 0, r[k] || 0);',
'    return out;',
'  }',
'  function mergeSpeakMeta(l, r) {',
'    l = l || {}; r = r || {};',
'    var ld = l.streakLastDay || "", rd = r.streakLastDay || "";',
'    var cur = ld === rd ? Math.max(l.streakCurrent || 0, r.streakCurrent || 0) : (rd > ld ? (r.streakCurrent || 0) : (l.streakCurrent || 0));',
'    return {',
'      totalSeconds: Math.max(l.totalSeconds || 0, r.totalSeconds || 0),',
'      streakLongest: Math.max(l.streakLongest || 0, r.streakLongest || 0, cur),',
'      streakCurrent: cur,',
'      streakLastDay: rd > ld ? rd : ld',
'    };',
'  }',
''
].join('\n');

c = c.replace(keyAnchor, () => keyAnchor + " 'nihongo_speak_log', 'nihongo_speak_meta',");
c = c.replace(caseAnchor, () => caseAnchor + "\n      case 'nihongo_speak_log': return mergeSpeakLog(l, r);\n      case 'nihongo_speak_meta': return mergeSpeakMeta(l, r);");
c = c.replace(fnAnchor, () => fns + '\n  ' + fnAnchor);
fs.writeFileSync(p, c);
console.log('cloud.js patched');
