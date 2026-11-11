import fs from 'fs';
const p = 'js/ai-tutor/api.js';
let a = fs.readFileSync(p, 'utf8');

// 1. fix the Authorization header
a = a.replace(/'Authorization':\s*Bearer \$\{token\},/, () => "'Authorization': `Bearer ${token}`,");

// 2. replace getAuthToken
const s = a.indexOf('async function getAuthToken');
const e = a.indexOf('async function callEdgeFunction');
if (s < 0 || e < 0) { console.log('markers not found'); process.exit(1); }
const fn = [
"async function getAuthToken() {",
"    var client = window.__sb || (window.CloudSync && window.CloudSync.client);",
"    for (var i = 0; i < 20 && !(client && client.auth); i++) {",
"      await new Promise(function (r) { setTimeout(r, 150); });",
"      client = window.__sb || (window.CloudSync && window.CloudSync.client);",
"    }",
"    if (!client || !client.auth) throw new Error('Supabase client not ready. Please refresh the page.');",
"    var res = await client.auth.getSession();",
"    if (res.error || !res.data || !res.data.session) throw new Error('Please sign in to use AI Tutor.');",
"    return res.data.session.access_token;",
"  }",
"",
"  "
].join('\n');
a = a.slice(0, s) + fn + a.slice(e);
fs.writeFileSync(p, a);
console.log('api.js patched');
