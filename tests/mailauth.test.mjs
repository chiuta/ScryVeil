// Teste v2.1.0: SPF/DKIM/DMARC + DS în panoul DNS, scor cu penalizări noi (spf_open, dmarc_none), export JSON, 8 limbi.
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
  dmarc: 'v=DMARC1; p=none; rua=mailto:dmarc@example.com', ad: true, ds: true, dkim: {google: 'v=DKIM1; k=rsa; p=MIGfMA0GCSq', custom1: 'v=DKIM1; p=XYZ'}};
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
  console.log('— domeniu cu e-mail, SPF permisiv, DMARC p=none');
  const ma = await txt(page, '.mailauth');
  check('secțiunea „Email authentication and DNSSEC” există în panoul DNS', /Email authentication and DNSSEC/.test(ma), ma.slice(0, 60));
  check('SPF: înregistrarea e afișată și ?all e semnalat permisiv', /SPF: v=spf1 include:_spf\.google\.com a mx \?all/.test(ma) && /\?all: neutral, effectively permissive/.test(ma), ma);
  check('SPF: 3 mecanisme cu căutări DNS (include, a, mx)', /lookups \(top level only\): 3 of a maximum of 10/.test(ma), ma);
  check('DMARC: p=none explicat și rua detectat', /DMARC: v=DMARC1; p=none/.test(ma) && /p=none: monitoring only/.test(ma) && /aggregate reports \(rua\) configured/.test(ma), ma);
  check('DKIM: cheia găsită pe selectorul „google”', /DKIM: key found on selectors google\./.test(ma), ma);
  check('DS publicat și AD validat', /DS: record published in the parent zone/.test(ma), ma);
  const sb = await txt(page, '#scoreBody');
  check('scor 86 (−5 SPF permisiv, −3 DMARC p=none, −6 headere)', /86 out of 100/.test(sb) && /−5 · Permissive SPF/.test(sb) && /−3 · DMARC with p=none/.test(sb), sb.slice(0, 300));
  check('planul de remediere conține pașii noi', /Replace \?all or \+all/.test(sb) && /move from p=none to p=quarantine/.test(sb));
  // selector propriu
  await page.fill('.mailauth__dkim input', 'custom1'); await page.click('.mailauth__dkim button');
  await page.waitForFunction(() => /Selector custom1/.test(document.querySelector('.mailauth__dkim p').textContent));
  check('selector propriu găsit', /Selector custom1: DKIM key found\./.test(await txt(page, '.mailauth__dkim p')));
  await page.fill('.mailauth__dkim input', 'nope'); await page.click('.mailauth__dkim button');
  await page.waitForFunction(() => /Selector nope/.test(document.querySelector('.mailauth__dkim p').textContent));
  check('selector inexistent: mesaj clar', /Selector nope: no DKIM key found\./.test(await txt(page, '.mailauth__dkim p')));
  await page.fill('.mailauth__dkim input', 'bad sel!'); await page.click('.mailauth__dkim button');
  check('selector invalid respins fără cerere', /Invalid selector/.test(await txt(page, '.mailauth__dkim p')) && !net.some((u) => /bad/.test(u)));
  check('sondele DKIM merg la dns.google cu numele așteptat', net.some((u) => /name=default\._domainkey\.example\.com&type=16/.test(u)) && net.some((u) => /name=example\.com&type=43/.test(u)));
  const [dlt] = await Promise.all([page.waitForEvent('download'), page.click('#btnSaveReport')]);
  const rtxt = fs.readFileSync(await dlt.path(), 'utf8');
  check('raportul .txt include secțiunea de e-mail, dar nu câmpul de selector', /Email authentication and DNSSEC/.test(rtxt) && /SPF: v=spf1/.test(rtxt) && !/Check a DKIM selector/.test(rtxt) && !/\n\s*Check\s*\n/.test(rtxt), rtxt.slice(rtxt.indexOf('Email auth'), rtxt.indexOf('Email auth') + 200));

  console.log('— export JSON');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#btnSaveJson')]);
  check('nume de fișier .json', /^scryveil-example\.com\.json$/.test(dl.suggestedFilename()), dl.suggestedFilename());
  const rep = JSON.parse(fs.readFileSync(await dl.path(), 'utf8'));
  check('format, versiune, domeniu', rep.format === 'scryveil-report' && rep.domain === 'example.com' && /^2\.2\./.test(rep.version), [rep.format, rep.domain, rep.version]);
  check('scor 86 cu penalizări, motive și remediere', rep.score.value === 86 && rep.score.deductions.some((d) => d.id === 'spf_open' && d.points === -5 && d.reason && d.remediation) && rep.score.deductions.some((d) => d.id === 'dmarc_none'), rep.score);
  check('e-mail: SPF, DMARC, DKIM, DS', rep.email.spfAll === '?all' && rep.email.dmarcPolicy === 'none' && rep.email.dkimSelectorsFound.join() === 'google' && rep.dnssec.dsInParentZone === true && rep.dnssec.resolverValidated === true, rep.email);
  check('panourile și avertismentul sunt incluse', rep.panels.dns === 'ok' && /security audit/i.test(rep.disclaimer), [rep.panels, rep.disclaimer]);
  check('cheia API nu apare în raport', !/gsb|apikey|api key/i.test(JSON.stringify(rep).replace(/Google Safe Browsing/g, '')));

  console.log('— 8 limbi');
  for (const l of ['ro', 'fr', 'it', 'es', 'pt', 'de', 'hu']) {
    await page.selectOption('#langSel', l); await page.waitForTimeout(80);
    const t = await txt(page, '.mailauth');
    check(l + ': secțiunea e tradusă (fără chei brute)', t.length > 200 && !/\bma_[a-z_]+\b/.test(t) && !/Email authentication and DNSSEC/.test(t), t.slice(0, 80));
  }
  check('fără pageerror/CSP', errs.length === 0, errs);
  await ctx.close();
}
{
  console.log('— DS fără validare (AD absent) și domeniu fără MX');
  W = {...BASE, ad: false, MX: [], dkim: {}, txt: [], dmarc: null};
  net.length = 0;
  const {ctx, page, errs} = await open();
  await scan(page);
  const ma = await txt(page, '.mailauth');
  check('DS există dar AD absent → avertisment', /Warning: a DS exists but the resolver did not validate/.test(ma), ma);
  check('fără MX: SPF nu e cerut, DKIM nu se verifică', /SPF: no record; the domain has no MX/.test(ma) && /DKIM: not checked \(the domain has no MX\)/.test(ma), ma);
  check('fără MX: nicio sondă DKIM trimisă', !net.some((u) => /_domainkey/.test(u)));
  check('fără MX nu apar penalizări de e-mail', !/Permissive SPF|DMARC/.test(await txt(page, '#scoreBody').then((s) => s.replace(/DMARC: no record[^\n]*/g, ''))), await txt(page, '#scoreBody'));
  check('fără pageerror/CSP', errs.length === 0, errs);
  await ctx.close();
}
await b.close();
console.log('\n' + ok + ' ok, ' + bad + ' eșuate');
process.exit(bad ? 1 : 0);
