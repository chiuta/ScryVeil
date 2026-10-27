// Teste v2.1.0: cronologie locală de securitate, diff între scanări, scor explicat, plan de remediere, avertizare de expirare.
// [fff-portable] axe-core: FFF_AXE / AXE_PATH, apoi pachetul `axe-core`.
import {createRequire as __fffCR} from 'node:module';
import {readFileSync as __fffRF} from 'node:fs';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const __fffAxe = () => process.env.FFF_AXE || process.env.AXE_PATH || (() => { try { return __fffCR(import.meta.url).resolve('axe-core/axe.min.js'); } catch { return undefined; } })();
const APP = JSON.parse(__fffRF(new URL('../app.json', import.meta.url), 'utf8'));
const require = createRequire(process.env.PW_ROOT || import.meta.url);
const {chromium} = require('playwright');
const HERE = path.dirname(fileURLToPath(import.meta.url));
const FILE = 'file://' + path.join(HERE, '..', 'index.html');
const AXE = __fffAxe();
let ok = 0, bad = 0;
const check = (n, c, x) => { if (c) { ok++; console.log('  ok   ' + n); } else { bad++; console.log('  FAIL ' + n + (x !== undefined ? '  → ' + JSON.stringify(x) : '')); } };
const TMP = fs.mkdtempSync(path.join(process.env.FFF_TMP || os.tmpdir(), 'scry2-'));
const NOW = new Date('2026-10-26T10:00:00Z').getTime();
const DAY = 86400000;
const KEY = 'scryveil.timeline';

// „lumea” simulată: schimbată între scanări
const W1 = {
  A: ['203.0.113.10'], AAAA: [], MX: ['10 mail.example.com.'], NS: ['ns1.old.example.', 'ns2.old.example.'],
  txt: ['v=spf1 mx -all'], dmarc: null, ad: false,
  certIssuer: "C=US, O=Let's Encrypt, CN=R3", certFrom: '2026-09-01T00:00:00', certTo: '2026-11-30T23:59:59',
  rdapExp: '2027-03-01T00:00:00Z', registrar: 'Registrar One',
  hdr: {'content-security-policy': "default-src 'self'", 'strict-transport-security': 'max-age=31536000', 'x-content-type-options': 'nosniff'}, cors: true
};
const W2 = {
  ...W1, A: ['203.0.113.77'], NS: ['ns1.old.example.', 'ns2.new.example.'], dmarc: 'v=DMARC1; p=none', ad: true,
  certIssuer: 'C=US, O=Other CA, CN=X1', certTo: '2026-11-05T12:00:00'
};
const W3 = {...W2, cors: false};
let W = W1;
const DNS_CODES = {1: 'A', 28: 'AAAA', 15: 'MX', 16: 'TXT', 2: 'NS', 5: 'CNAME', 6: 'SOA', 257: 'CAA'};
const json = (r, o, extra = {}) => r.fulfill({status: 200, contentType: 'application/json', headers: {'access-control-allow-origin': '*', ...extra}, body: JSON.stringify(o)});
function handler(r) {
  const u = new URL(r.request().url());
  if (u.host === 'dns.google') {
    const name = u.searchParams.get('name'), type = Number(u.searchParams.get('type')), kind = DNS_CODES[type];
    let ans = [];
    if (name === '_dmarc.example.com') { if (type === 16 && W.dmarc) ans = [{name, type: 16, TTL: 60, data: '"' + W.dmarc + '"'}]; }
    else if (name === 'example.com') {
      if (kind === 'TXT') ans = W.txt.map((x) => ({name, type: 16, TTL: 60, data: '"' + x + '"'}));
      else if (['A', 'AAAA', 'MX', 'NS'].includes(kind)) ans = W[kind].map((x) => ({name, type, TTL: 60, data: x}));
    }
    return json(r, {Status: 0, AD: W.ad, Answer: ans.length ? ans : undefined});
  }
  if (u.host === 'rdap.org') return json(r, {
    events: [{eventAction: 'registration', eventDate: '2015-01-01T00:00:00Z'}, {eventAction: 'expiration', eventDate: W.rdapExp}, {eventAction: 'last changed', eventDate: '2026-01-01T00:00:00Z'}],
    entities: [{roles: ['registrar'], vcardArray: ['vcard', [['fn', {}, 'text', W.registrar]]]}],
    nameservers: W.NS.map((n) => ({ldhName: n.toUpperCase()}))
  });
  if (u.host === 'crt.sh') return json(r, [{issuer_name: W.certIssuer, not_before: W.certFrom, not_after: W.certTo, name_value: 'example.com\nwww.example.com'}]);
  if (u.host === 'example.com') {
    if (r.request().resourceType() === 'fetch' && r.request().headers()['sec-fetch-mode'] === 'no-cors') return r.fulfill({status: 200, contentType: 'text/html', body: 'ok'});
    return r.fulfill({status: 200, contentType: 'text/html', headers: W.cors ? {'access-control-allow-origin': '*', 'access-control-expose-headers': '*', ...W.hdr} : {}, body: 'ok'});
  }
  if (u.host === 'ipapi.co') return json(r, {ip: '203.0.113.10', asn: 'AS64500', org: 'Example Hosting', city: 'Cluj', region: 'CJ', country_name: 'Romania'});
  return r.abort();
}
const b = await chromium.launch({executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox']});
async function open(o = {}) {
  const ctx = o.ctx || await b.newContext({viewport: {width: o.w || 1280, height: 900}, acceptDownloads: true, locale: 'en-US', timezoneId: 'UTC', ...(o.bypass ? {bypassCSP: true} : {})});
  const net = [];
  if (!o.ctx) await ctx.route(/^https?:/, (r) => { net.push(r.request().url()); handler(r); });
  const page = await ctx.newPage();
  await page.clock.install({time: NOW});
  const errs = [];
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  page.on('console', (m) => { const t = m.text(); if (/Content Security Policy|Refused to/i.test(t)) errs.push('csp: ' + t); });
  if (o.seed !== undefined) await page.addInitScript(([k, v]) => { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.setItem(k, v); } }, [KEY, o.seed]);
  await page.goto(FILE); await page.waitForTimeout(300);
  return {ctx, page, errs, net};
}
async function scan(page, domain = 'example.com') {
  await page.evaluate(() => { document.getElementById('scoreBox').dataset.prev = document.getElementById('scoreBody').textContent; });
  await page.fill('#domainInput', domain);
  await page.click('#scanForm button[type=submit]');
  await page.waitForFunction(() => !document.getElementById('reportBar').hidden && /saved|Could not|no usable/i.test(document.getElementById('tlMsg').textContent), null, {timeout: 20000});
  await page.waitForTimeout(80);
}
const stored = (page) => page.evaluate((k) => { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; }, KEY);
const txt = (page, sel) => page.evaluate((s) => document.querySelector(s).innerText, sel);

{
  const {ctx, page, errs, net} = await open();
  console.log('— pornire');
  check('versiune ' + APP.version, await page.evaluate((v) => document.querySelector('#app-version').textContent.includes(v), APP.version));
  check('cheia timeline în storageKeys (app.json)', APP.storageKeys.includes(KEY), APP.storageKeys);
  check('fără pageerror/CSP', errs.length === 0, errs);
  check('stare goală: mesaj și fără controale', await page.evaluate(() => !document.getElementById('tlEmpty').hidden && document.getElementById('tlControls').hidden));
  check('caseta de scor ascunsă înainte de scanare', await page.evaluate(() => document.getElementById('scoreBox').hidden));
  check('butonul de ștergere dezactivat când nu e istoric', await page.evaluate(() => document.getElementById('tlClear').disabled && document.getElementById('tlExport').disabled));

  console.log('— scanarea 1: scor explicat și plan');
  await scan(page);
  const s1 = await stored(page);
  check('o înregistrare salvată sub scryveil.timeline', s1 && s1.list.length === 1 && s1.list[0].d === 'example.com', s1 && s1.list.length);
  const r1 = s1.list[0];
  check('NS, MX, A salvate normalizat (fără punct final, sortate)', JSON.stringify(r1.dns.NS) === JSON.stringify(['ns1.old.example', 'ns2.old.example']) && r1.dns.MX[0] === '10 mail.example.com' && r1.dns.A[0] === '203.0.113.10', r1.dns);
  check('SPF reținut, DMARC absent = șir gol, DNSSEC fals', r1.spf === 'v=spf1 mx -all' && r1.dmarc === '' && r1.dnssec === false, [r1.spf, r1.dmarc, r1.dnssec]);
  check('certificat și RDAP reținute', r1.cert.to === '2026-11-30T23:59:59' && r1.rdap.exp === '2027-03-01T00:00:00Z' && r1.rdap.registrar === 'Registrar One');
  check('headere: 3 prezente, 3 lipsă', r1.hdr.have.length === 3 && r1.hdr.miss.length === 3, r1.hdr);
  // scor recalculat independent: DNSSEC -5, DMARC lipsă (are MX) -10, 3 headere lipsă -6, certificat la 35 zile (fără penalizare)
  check('scor 79 (100−5−10−6)', r1.score.n === 79, r1.score);
  const sb = await txt(page, '#scoreBody');
  check('scor afișat „79 out of 100”', /79 out of 100/.test(sb), sb.slice(0, 80));
  check('fiecare penalizare are motiv', /−5 · DNSSEC/.test(sb) && /−10 · The domain has MX records but no DMARC/.test(sb) && /−6 · Missing security headers/.test(sb), sb);
  check('zonele blocate sunt numite, nu penalizate', /Not assessed[^\n]*Reputation/i.test(sb) && /Areas assessed: 5 of 6/.test(sb), sb);
  const plan = await page.$$eval('#scoreBody ol li', (l) => l.map((x) => x.textContent));
  check('plan ordonat după impact (DMARC, headere, DNSSEC)', plan.length === 3 && /DMARC/.test(plan[0]) && /headers/i.test(plan[1]) && /DNSSEC/.test(plan[2]), plan);
  check('o singură scanare: mesaj „necesare două”', /two saved scans/i.test(await txt(page, '#tlDiff')));
  check('tabelul are un rând', (await page.$$('#tlTable tbody tr')).length === 1);
  check('nicio cerere în afara gazdelor cunoscute', net.every((u) => /^https:\/\/(dns\.google|cloudflare-dns\.com|rdap\.org|crt\.sh|ipapi\.co|example\.com)\//.test(u)), net.filter((u) => !/^https:\/\/(dns\.google|rdap\.org|crt\.sh|ipapi\.co|example\.com)\//.test(u)));
  check('interogare _dmarc prin DNS-ul existent', net.some((u) => /dns\.google\/resolve\?name=_dmarc\.example\.com&type=16/.test(u)));

  console.log('— scanarea 2: diff');
  W = W2;
  await scan(page);
  const s2 = await stored(page);
  check('două înregistrări', s2.list.length === 2);
  check('scor 81 (certificat în 10 zile −10, DMARC p=none −3, restul −6; 2.1.0)', s2.list[1].score.n === 81, s2.list[1].score);
  const df = await txt(page, '#tlDiff');
  check('diff: NS adăugat și eliminat', /ns2\.new\.example \(added\)/.test(df) && /ns2\.old\.example \(removed\)/.test(df), df);
  check('diff: A schimbat', /203\.0\.113\.77 \(added\)/.test(df) && /203\.0\.113\.10 \(removed\)/.test(df));
  check('diff: DMARC din (none) în politică', /DMARC policy: \(none\) → v=DMARC1; p=none/.test(df), df);
  check('diff: DNSSEC off → on', /DNSSEC: off → on/.test(df));
  check('diff: emitent și expirare certificat', /Certificate issuer:/.test(df) && /Certificate valid until:/.test(df));
  check('diff: scorul 79 → 81', /Score: 79 → 81/.test(df));
  check('diff nu inventează schimbări (MX, SPF identice)', !/Mail servers/.test(df) && !/SPF policy/.test(df) && !/Registrar:/.test(df));
  check('delta față de scanarea anterioară', /\+2 compared with the previous scan/.test(await txt(page, '#scoreBody')));
  const plan2 = await page.$$eval('#scoreBody ol li', (l) => l.map((x) => x.textContent));
  check('plan 2: certificatul primul', /Renew the certificate before/.test(plan2[0]), plan2);
  check('tabel cu 2 rânduri, cel mai nou primul', (await page.$$('#tlTable tbody tr')).length === 2 && await page.evaluate(() => document.getElementById('tlB').selectedIndex === 0 && document.getElementById('tlA').selectedIndex === 1));
  await page.selectOption('#tlA', {index: 0}); await page.selectOption('#tlB', {index: 1});
  const rev = await txt(page, '#tlDiff');
  check('inversarea selecției inversează diff-ul', /ns2\.old\.example \(added\)/.test(rev) && /Score: 81 → 79/.test(rev), rev.slice(0, 200));
  await page.selectOption('#tlA', {index: 0}); await page.selectOption('#tlB', {index: 0});
  check('aceeași scanare ambele părți: fără diff fals', /two saved scans/i.test(await txt(page, '#tlDiff')) || !/Score:/.test(await txt(page, '#tlDiff')));

  console.log('— scanarea 3: necunoscut nu înseamnă „schimbat”');
  W = W3;
  await scan(page);
  const s3 = await stored(page);
  check('headere nelegibile: hdr nul, fără penalizare', s3.list[2].hdr === null && !s3.list[2].score.items.some((i) => i.id === 'hdr_missing'), s3.list[2].score);
  await page.selectOption('#tlA', {index: 1}); await page.selectOption('#tlB', {index: 0});
  const d3 = await txt(page, '#tlDiff');
  check('diff 2→3 fără intrare pentru headere', !/Missing security headers/.test(d3), d3);

  console.log('— raport');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#btnSaveReport')]);
  const rp = path.join(TMP, dl.suggestedFilename()); await dl.saveAs(rp);
  const rtxt = fs.readFileSync(rp, 'utf8');
  check('raportul .txt conține scorul și motivele', /== Explained score ==/.test(rtxt) && /Score: \d+ out of 100/.test(rtxt) && /−10 · The certificate expires in 10 days/.test(rtxt), rtxt.slice(-600));

  console.log('— export JSON');
  const [dl2] = await Promise.all([page.waitForEvent('download'), page.click('#tlExport')]);
  const ep = path.join(TMP, dl2.suggestedFilename()); await dl2.saveAs(ep);
  const ej = JSON.parse(fs.readFileSync(ep, 'utf8'));
  check('export: app, tip și 3 înregistrări', ej.app === 'scryveil' && ej.kind === 'timeline' && ej.records.length === 3 && /^scryveil-timeline-2026-10-26\.json$/.test(dl2.suggestedFilename()), [ej.app, ej.records.length, dl2.suggestedFilename()]);
  check('export nu conține cheia Safe Browsing/alt text liber', !/key=|apikey/i.test(JSON.stringify(ej)));
  check('fără pageerror/CSP după scanări', errs.length === 0, errs);
  await ctx.close();
}

console.log('— avertizare la deschidere (fără rețea)');
{
  const seed = JSON.stringify({v: 1, list: [
    {v: 1, t: new Date(NOW - 3 * DAY).toISOString(), d: 'soon.example', ip: null, dns: null, spf: null, dmarc: null, dnssec: null, rdap: {registrar: '', exp: '2026-11-05T00:00:00Z', ns: []}, cert: {issuer: 'X', from: '2026-08-01T00:00:00', to: '2026-10-30T12:00:00', sans: []}, reach: true, hdr: null, rep: null, st: {}, score: {n: 90, items: [], assessed: 2, un: []}},
    {v: 1, t: new Date(NOW - 2 * DAY).toISOString(), d: 'gone.example', ip: null, dns: null, spf: null, dmarc: null, dnssec: null, rdap: null, cert: {issuer: 'X', from: '2026-01-01T00:00:00', to: '2026-10-01T00:00:00', sans: []}, reach: true, hdr: null, rep: null, st: {}, score: {n: 75, items: [], assessed: 1, un: []}},
    {v: 1, t: new Date(NOW - 1 * DAY).toISOString(), d: 'fine.example', ip: null, dns: null, spf: null, dmarc: null, dnssec: null, rdap: {registrar: '', exp: '2028-01-01T00:00:00Z', ns: []}, cert: {issuer: 'X', from: '2026-09-01T00:00:00', to: '2027-06-01T00:00:00', sans: []}, reach: true, hdr: null, rep: null, st: {}, score: {n: 100, items: [], assessed: 2, un: []}}
  ]});
  const {ctx, page, errs, net} = await open({seed});
  const ex = await txt(page, '#tlExpiry');
  check('banner vizibil la deschidere', await page.evaluate(() => !document.getElementById('tlExpiry').hidden), ex);
  check('certificat care expiră în 4 zile', /soon\.example: certificate expires in 4 days/.test(ex), ex);
  check('domeniu care expiră în 9 zile', /soon\.example: domain registration expires in 9 days/.test(ex), ex);
  check('certificat deja expirat', /gone\.example: certificate expired/.test(ex), ex);
  check('domeniul fără probleme nu apare', !/fine\.example/.test(ex));
  check('banner recomandă o scanare nouă', /may be outdated/.test(ex));
  check('deschiderea nu face cereri de rețea', net.length === 0, net);
  check('fără erori', errs.length === 0, errs);
  console.log('— ștergere cu dialog propriu');
  check('3 domenii în listă', await page.$$eval('#tlDomain option', (o) => o.length) === 3);
  await page.selectOption('#tlDomain', 'gone.example');
  await page.click('#tlDelDom');
  await page.waitForSelector('dialog[open], .fff-dlg', {timeout: 3000});
  const dlgTxt = await page.evaluate(() => (document.querySelector('dialog[open]') || document.querySelector('.fff-dlg')).innerText);
  check('confirmarea numește domeniul și numărul', /1 saved scans for gone\.example/.test(dlgTxt), dlgTxt);
  await page.getByRole('button', {name: 'Cancel'}).click();
  check('Anulează păstrează datele', (await stored(page)).list.length === 3);
  await page.click('#tlDelDom');
  await page.getByRole('button', {name: 'Yes'}).click();
  await page.waitForTimeout(150);
  check('domeniul șters, celelalte rămân', (await stored(page)).list.map((r) => r.d).sort().join() === 'fine.example,soon.example');
  check('bannerul se actualizează după ștergere', !/gone\.example/.test(await txt(page, '#tlExpiry')));
  await page.click('#tlClear');
  await page.getByRole('button', {name: 'Yes'}).click();
  await page.waitForTimeout(150);
  const after = await stored(page);
  check('„șterge tot” golește istoricul', after && after.list.length === 0);
  check('stare goală revine', await page.evaluate(() => !document.getElementById('tlEmpty').hidden && document.getElementById('tlExpiry').hidden));
  await ctx.close();
}

console.log('— limită pe domeniu și date corupte');
{
  const mk = (i) => ({v: 1, t: new Date(NOW - (40 - i) * DAY).toISOString(), d: 'example.com', ip: null, dns: null, spf: null, dmarc: null, dnssec: null, rdap: null, cert: null, reach: null, hdr: null, rep: null, st: {}, score: {n: 50, items: [], assessed: 0, un: []}});
  const seed = JSON.stringify({v: 1, list: Array.from({length: 30}, (_, i) => mk(i))});
  const {ctx, page, errs} = await open({seed});
  W = W1;
  await scan(page);
  const st = await stored(page);
  check('maxim 30 de scanări pe domeniu (cea mai veche iese)', st.list.length === 30 && st.list[29].score.n === 79 && st.list[0].t === new Date(NOW - 39 * DAY).toISOString(), [st.list.length, st.list[0].t]);
  await ctx.close();
  const c2 = await open({seed: '{coruptă'});
  check('date corupte: pornește curat, fără erori', c2.errs.length === 0 && await c2.page.evaluate(() => !document.getElementById('tlEmpty').hidden), c2.errs);
  await scan(c2.page);
  check('după date corupte, scanarea se salvează', (await stored(c2.page)).list.length === 1);
  await c2.ctx.close();
  const c3 = await open({seed: JSON.stringify({v: 1, list: [{d: 5}, null, 'x']})});
  check('înregistrări invalide ignorate', c3.errs.length === 0 && await c3.page.evaluate(() => !document.getElementById('tlEmpty').hidden));
  await c3.ctx.close();
}

console.log('— cele 8 limbi, fără chei netraduse');
{
  const {ctx, page} = await open();
  W = W1; await scan(page); W = W2; await scan(page);
  for (const l of ['ro', 'fr', 'it', 'es', 'pt', 'de', 'hu', 'en']) {
    await page.selectOption('#langSel', l);
    await page.waitForTimeout(60);
    const body = await page.evaluate(() => document.body.innerText);
    const raw = body.match(/\b(tl|sc|rm|df|v)_[a-z_A-Z]+\b/g);
    const head = await txt(page, '#tlH');
    check(l + ': titlu tradus, fără chei brute, diff și plan randate', !raw && head.length > 5 && (l === 'en' || head !== 'Security timeline (local)') && (await page.$$('#tlDiff li')).length > 3 && (await page.$$('#scoreBody ol li')).length >= 2, [raw, head]);
  }
  check('limba se păstrează la re-randare: raport încă disponibil', await page.evaluate(() => !document.getElementById('reportBar').hidden));
  await ctx.close();
}

console.log('— accesibilitate și 360px');
if (AXE) {
  const {ctx, page} = await open({bypass: true});
  W = W1; await scan(page); W = W2; await scan(page);
  await page.waitForTimeout(800);
  await page.addScriptTag({path: AXE});
  const v = await page.evaluate(async () => (await axe.run(document, {runOnly: ['wcag2a', 'wcag2aa']})).violations.map((x) => x.id + ':' + x.nodes.length));
  const vn = await page.evaluate(async () => (await axe.run(document, {runOnly: ['wcag2a', 'wcag2aa']})).violations.flatMap((x) => x.nodes.map((n) => x.id + ' ' + n.target.join(' ') + ' ' + (n.any[0] && n.any[0].message))));
  check('axe fără încălcări (cu scor, cronologie și diff)', v.length === 0, vn);
  await ctx.close();
  const m = await open({w: 360});
  W = W1; await scan(m.page); W = W2; await scan(m.page);
  check('fără defilare orizontală la 360px', await m.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), await m.page.evaluate(() => document.documentElement.scrollWidth));
  await m.ctx.close();
} else check('axe lipsă (omis)', true);

await b.close();
console.log('\n' + ok + ' ok, ' + bad + ' eșuate');
process.exit(bad ? 1 : 0);
