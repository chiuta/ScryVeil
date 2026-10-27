// Teste v2.2.0: lista extinsă de selectoare DKIM (19), fiecare sondat; găsirea cheii pe un selector adăugat.
import {createRequire} from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const require = createRequire(process.env.PW_ROOT || import.meta.url);
const {chromium} = require('playwright');
const HERE = path.dirname(fileURLToPath(import.meta.url));
const FILE = 'file://' + path.join(HERE, '..', 'index.html');
let ok = 0, bad = 0;
const check = (n, c, x) => { if (c) { ok++; console.log('  ok   ' + n); } else { bad++; console.log('  FAIL ' + n + (x !== undefined ? '  → ' + JSON.stringify(x) : '')); } };
const NOW = new Date('2026-10-26T10:00:00Z').getTime();
const DNS_CODES = {1: 'A', 28: 'AAAA', 15: 'MX', 16: 'TXT', 2: 'NS', 5: 'CNAME', 6: 'SOA', 257: 'CAA'};
const BASE = {A: ['203.0.113.10'], AAAA: [], MX: ['10 mail.example.com.'], NS: ['ns1.example.com.'], txt: ['v=spf1 include:_spf.google.com a mx ?all'],
  dmarc: 'v=DMARC1; p=none; rua=mailto:dmarc@example.com', ad: true, ds: true, dkim: {protonmail2: 'v=DKIM1; k=rsa; p=AAAA', fm1: 'v=DKIM1; p=BBBB'}};
let W = BASE; const net = [];
const json = (r, o) => r.fulfill({status: 200, contentType: 'application/json', headers: {'access-control-allow-origin': '*'}, body: JSON.stringify(o)});
function handler(r) {
  const u = new URL(r.request().url()); net.push(u.href);
  if (u.host === 'dns.google') {
    const name = u.searchParams.get('name'), type = Number(u.searchParams.get('type')), kind = DNS_CODES[type];
    let ans = [];
    const m = name.match(/^([^.]+)\._domainkey\.example\.com$/);
    if (name === '_dmarc.example.com') { if (type === 16 && W.dmarc) ans = [{name, type: 16, TTL: 60, data: '"' + W.dmarc + '"'}]; }
    else if (m) { if (type === 16 && W.dkim[m[1]]) ans = [{name, type: 16, TTL: 60, data: '"' + W.dkim[m[1]] + '"'}]; }
    else if (name === 'example.com') {
      if (type === 43) { if (W.ds) ans = [{name, type: 43, TTL: 60, data: '12345 13 2 ABCDEF'}]; }
      else if (kind === 'TXT') ans = W.txt.map((x) => ({name, type: 16, TTL: 60, data: '"' + x + '"'}));
      else if (['A', 'AAAA', 'MX', 'NS'].includes(kind)) ans = W[kind].map((x) => ({name, type, TTL: 60, data: x}));
    }
    return json(r, {Status: 0, AD: W.ad, Answer: ans.length ? ans : undefined});
  }
  if (u.host === 'rdap.org') return json(r, {events: [{eventAction: 'expiration', eventDate: '2027-03-01T00:00:00Z'}], entities: [], nameservers: []});
  if (u.host === 'crt.sh') return json(r, [{issuer_name: 'C=US, O=CA', not_before: '2026-09-01T00:00:00', not_after: '2027-03-30T23:59:59', name_value: 'example.com'}]);
  if (u.host === 'example.com') return r.fulfill({status: 200, contentType: 'text/html', headers: {'access-control-allow-origin': '*', 'access-control-expose-headers': '*', 'content-security-policy': "default-src 'self'", 'strict-transport-security': 'max-age=31536000', 'x-content-type-options': 'nosniff'}, body: 'ok'});
  if (u.host === 'ipapi.co') return json(r, {ip: '203.0.113.10', asn: 'AS64500', org: 'Example', city: 'Cluj', region: 'CJ', country_name: 'Romania'});
  return r.abort();
}
const b = await chromium.launch({executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox']});
async function open() {
  const ctx = await b.newContext({viewport: {width: 1280, height: 900}, acceptDownloads: true, locale: 'en-US', timezoneId: 'UTC'});
  await ctx.route(/^https?:/, handler);
  const page = await ctx.newPage(); const errs = [];
  await page.clock.install({time: NOW});
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (/Content Security Policy|Refused to/i.test(m.text())) errs.push('csp: ' + m.text()); });
  await page.goto(FILE); await page.waitForTimeout(300);
  return {ctx, page, errs};
}
async function scan(page) {
  await page.fill('#domainInput', 'example.com');
  await page.click('#scanForm button[type=submit]');
  await page.waitForFunction(() => !document.getElementById('reportBar').hidden && /saved|Could not|no usable/i.test(document.getElementById('tlMsg').textContent), null, {timeout: 20000});
  await page.waitForTimeout(80);
}
const txt = (page, sel) => page.evaluate((s) => document.querySelector(s).innerText, sel);
{
  const {ctx, page, errs} = await open();
  await scan(page);
  const WANT = ['default','google','selector1','selector2','k1','s1','s2','mail','dkim','k2','k3','protonmail','protonmail2','protonmail3','fm1','fm2','fm3','zoho','mandrill'];
  const probed = new Set(net.map((u) => (u.match(/name=([a-z0-9]+)\._domainkey\.example\.com&type=16/) || [])[1]).filter(Boolean));
  check('toate cele 19 selectoare sunt sondate, exact o dată fiecare', WANT.every((s) => probed.has(s)) && probed.size === 19 && net.filter((u) => /_domainkey/.test(u)).length === 19, [...probed].length);
  const ma = await txt(page, '.mailauth');
  check('rezultat: chei găsite pe protonmail2 și fm1', /DKIM: key found on selectors protonmail2, fm1\./.test(ma) || /DKIM: key found on selectors fm1, protonmail2\./.test(ma), ma.match(/DKIM[^\n]*/));
  check('fără erori JS/CSP', errs.length === 0, errs);
  await ctx.close();
}
{
  W = {...BASE, dkim: {}};
  const {ctx, page} = await open();
  await scan(page);
  const ma = await txt(page, '.mailauth');
  check('nicio cheie: mesajul listează toate cele 19 selectoare și spune că nu dovedește absența', /does not prove it is missing/.test(ma) && /fm3/.test(ma) && /mandrill/.test(ma), ma.match(/DKIM[^\n]*/));
  await ctx.close();
}
await b.close();
console.log('\n' + ok + ' ok, ' + bad + ' eșuate');
process.exit(bad ? 1 : 0);
