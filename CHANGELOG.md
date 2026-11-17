# Jurnal de modificări

Format SemVer (MAJOR.MINOR.PATCH).

## 2.3.2 — 2026-11-17

- Compatibilitate cu browsere mai vechi (Chrome/Edge 55+, Firefox 52+, Safari 10.1+/iOS 10.3+): kitul 1.8.0 aduce stratul de compatibilitate (rezerve pentru API-urile care lipsesc în motoarele vechi), iar sintaxa JavaScript mai nouă decât ES2017 a fost înlocuită cu forme echivalente acolo unde exista; expresiile regulate noi și `import()` trec prin rezerve. Fără modificări de funcționalitate intenționate. Verificat cu parser ES2017 și într-un motor vechi simulat, nu pe dispozitive reale.

## 2.3.1 — 2026-11-15

- Nou: butoane de distribuire pe rețele sociale (vertical, pe marginea din stânga; fără scripturi externe, doar linkuri deschise la clic); bara de zoom cu lupă și „potrivire ecran” revine pe marginea din dreapta, centrată pe verticală; corectat afișarea suprapusă la zoom mare (panourile cu înălțimi în vh/vw nu mai ies din ecran).

## 2.3.0 — 2026-11-15

- Nou: accesibilitate pe toate ecranele — butonul „Aa” (mărimea textului, contrast ridicat, fără animații, text lizibil, linkuri subliniate, citire cu voce), săgeata „Înapoi sus” și „Sari la conținut”; fereastra se potrivește mereu ecranului; zoom-ul cu lupă și „potrivire ecran” stau acum pe marginea din stânga (fff-kit 1.6.0).

## 2.2.9 — 2026-11-15

- Nou: texturi fractale hiper-detaliate (fff-texturi 1.1.2) — fundalul și suprafețele mari (carduri, panouri, antete, butoane; filele și dialogurile ascunse la încărcare, când se deschid) primesc un material generat local (WebGL2, fără rețea și fără imagini), care se repetă fără cusătură; culorile aplicației rămân ale ei. Se oprește din dialogul „Transparență” sau cu `?notex=1`.

## 2.2.2 — 2026-11-03

Etapa 7 (audit axe): butonul A/B al motorului comun are acum numele accesibil „A/B — …”, care conține textul vizibil (regula label-content-name-mismatch).

## 2.2.1 — 2026-11-03

Etapa 4: motorul A/B comun («Ce variantă e mai bună?», clasament Elo, rezultat în plicul experiment/ab)

## 2.2.0 — 2026-11-02 (reîmprospătare kit)

- Nou (kit): **Sincronizare între dispozitive** (`FFF.sync`) — în dialogul «Transparență» (clic pe versiune → Copie de siguranță): conectezi două dispozitive direct (WebRTC, cod/QR, fără server și fără cont) și își schimbă datele aplicației; cea mai recentă valoare câștigă, secretele (chei API, parole) nu se trimit, ștergerile nu se propagă. Aplicarea trece prin importul kitului (confirmare, chei permise, rollback).
- Nou (kit): **Istoric local — «mașina timpului»** (`FFF.history`) — instantanee automate ale datelor (IndexedDB, fără secrete), diferență față de starea curentă și restaurare reversibilă; «Șterge datele aplicației» șterge și istoricul.
- Module adăugate: `qr`, `p2p`, `sync`, `history` (+~140 KB). Versiunea aplicației nu se schimbă.

## 2.2.0 — 2026-10-27

Anterior: v2.1.0.

- Mai multe selectoare DKIM uzuale: de la 9 la 19. Adăugate: `k2`, `k3` (Mailchimp), `protonmail`, `protonmail2`, `protonmail3` (Proton Mail), `fm1`, `fm2`, `fm3` (Fastmail), `zoho` (Zoho Mail), `mandrill` (Mandrill, selector vechi). Justificare: nume raportate de pagini publice de ghiduri (căutare web 2026-10-27, de ex. mailflowauthority.com pentru Fastmail, captaindns.com pentru Mailchimp/Proton/Zoho/Mandrill); NU sunt documentație oficială a furnizorilor și nu s-au verificat pe domenii reale. Selectoarele Mandrill `mte1`/`mte2` și Zoho `zmail`, văzute în aceeași sursă, nu au fost adăugate (confirmare insuficientă).
- Consecință: pentru domeniile cu MX se trimit 19 interogări DKIM (în loc de 9) către aceleași servicii Google/Cloudflare DoH. Mesajul „nicio cheie” rămâne informativ (nu dovedește lipsa DKIM).
- Teste: `tests/selectors.test.mjs` nou (4 verificări: toate cele 19 sondate o dată, cheie găsită pe un selector adăugat, mesajul pentru zero chei); `mailauth` 32/32 (versiunea actualizată), `timeline` 69/69.
- Neimplementat: urmărirea include-urilor SPF și validarea semnăturilor DKIM/DNSSEC (imposibile rezonabil fără server); selectoare Amazon SES și altele cu nume aleatoare (nu se pot ghici).

## 2.1.0 — 2026-10-27

Anterior: v2.0.0.

- Nou: secțiunea „Autentificare e-mail și DNSSEC” în panoul DNS — SPF (politica `all`, numărul de mecanisme cu căutări DNS), DMARC (politică, rua), DKIM (9 selectoare uzuale + câmp pentru un selector propriu; lipsa unei chei nu dovedește absența DKIM), DNSSEC (semnal AD + înregistrare DS la zona părinte).
- Scor: două penalizări noi (doar cu MX): SPF permisiv −5, DMARC `p=none` −3, cu motiv și remediere. Scorurile vechi nu se recalculează.
- Nou: „Descarcă raport .json” (scor cu penalizări explicate, DNS, e-mail, DNSSEC, RDAP, certificat, headere, reputație).
- Documentație: „Stare” și „Offline”; interogările DNS suplimentare (DS, selectoare DKIM) merg către aceleași servicii Google/Cloudflare.
- Teste: `tests/mailauth.test.mjs` (32 de verificări); `tests/timeline.test.mjs` actualizat (scor 81 în loc de 84 din cauza noii reguli DMARC `p=none`).
- Notă: traducerile noilor texte în FR/IT/ES/PT/DE/HU sunt automate, neverificate de vorbitori nativi.
