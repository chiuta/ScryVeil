# Jurnal de modificări

Format SemVer (MAJOR.MINOR.PATCH).

## 2.1.0 — 2026-10-27

Anterior: v2.0.0.

- Nou: secțiunea „Autentificare e-mail și DNSSEC” în panoul DNS — SPF (politica `all`, numărul de mecanisme cu căutări DNS), DMARC (politică, rua), DKIM (9 selectoare uzuale + câmp pentru un selector propriu; lipsa unei chei nu dovedește absența DKIM), DNSSEC (semnal AD + înregistrare DS la zona părinte).
- Scor: două penalizări noi (doar cu MX): SPF permisiv −5, DMARC `p=none` −3, cu motiv și remediere. Scorurile vechi nu se recalculează.
- Nou: „Descarcă raport .json” (scor cu penalizări explicate, DNS, e-mail, DNSSEC, RDAP, certificat, headere, reputație).
- Documentație: „Stare” și „Offline”; interogările DNS suplimentare (DS, selectoare DKIM) merg către aceleași servicii Google/Cloudflare.
- Teste: `tests/mailauth.test.mjs` (32 de verificări); `tests/timeline.test.mjs` actualizat (scor 81 în loc de 84 din cauza noii reguli DMARC `p=none`).
- Notă: traducerile noilor texte în FR/IT/ES/PT/DE/HU sunt automate, neverificate de vorbitori nativi.
