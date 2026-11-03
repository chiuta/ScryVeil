# Jurnal de modificări

Format SemVer (MAJOR.MINOR.PATCH).

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
