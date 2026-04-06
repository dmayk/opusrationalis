# Corpora Manifest

This document defines the authoritative source corpora for the project, per PROJECT.md §5.  
Every corpus listed here must be addressable at the verse (or section) level and must carry explicit edition metadata.

This repository does **not** commit copyrighted primary texts unless they are freely licensed.
Where licensing prevents inclusion, this file defines:

- Exact edition and editor
- Publication metadata
- Canonical abbreviation
- Licensing status
- Acquisition instructions
- Machine-readable addressing scheme used by debates and claims

---

# 1. Scripture — Original Languages

## 1.1 Hebrew Bible

### Biblia Hebraica Stuttgartensia (BHS)

- **Canonical ID:** `BHS-1997`
- **Full Title:** *Biblia Hebraica Stuttgartensia*
- **Editor:** Karl Elliger and Wilhelm Rudolph
- **Publisher:** Deutsche Bibelgesellschaft
- **Edition:** 5th corrected edition (1997)
- **License:** Copyrighted — not included in repository
- **Acquisition:** Obtain via Deutsche Bibelgesellschaft or academic license
- **Addressing Scheme:**  
  `BHS-1997:Book.Chapter.Verse`  
  Example: `BHS-1997:Gen.1.1`

Notes:
- Masoretic Text base
- Apparatus not currently modeled in schema (future extension candidate)

---

### Biblia Hebraica Quinta (BHQ)

- **Canonical ID:** `BHQ`
- **Publisher:** Deutsche Bibelgesellschaft
- **Status:** In progress (partial volumes)
- **License:** Copyrighted
- **Addressing Scheme:** Same as BHS

Usage:
- Where BHQ volume exists for a book, debates may specify `BHQ` explicitly.

---

## 1.2 Septuagint (LXX)

### Rahlfs-Hanhart

- **Canonical ID:** `LXX-Rahlfs-2006`
- **Full Title:** *Septuaginta: Editio altera*
- **Editor:** Alfred Rahlfs, revised by Robert Hanhart
- **Publisher:** Deutsche Bibelgesellschaft
- **Edition:** 2006
- **License:** Copyrighted
- **Addressing Scheme:**  
  `LXX-Rahlfs-2006:Book.Chapter.Verse`

---

### Göttingen Septuagint

- **Canonical ID:** `LXX-Goettingen`
- **Publisher:** Vandenhoeck & Ruprecht
- **Status:** Multi-volume critical edition (partial)
- **License:** Copyrighted
- **Addressing Scheme:** Same pattern as above

---

## 1.3 Greek New Testament

### NA28

- **Canonical ID:** `NA28-2012`
- **Full Title:** *Nestle-Aland Novum Testamentum Graece*
- **Edition:** 28th revised edition (2012)
- **Publisher:** Deutsche Bibelgesellschaft
- **License:** Copyrighted
- **Addressing Scheme:**  
  `NA28-2012:Book.Chapter.Verse`

Primary NT base text for critical scholarship.

---

### Byzantine / Majority Text

- **Canonical ID:** `BYZ-Robinson-Pierpont-2005`
- **Full Title:** *The New Testament in the Original Greek: Byzantine Textform*
- **Editors:** Maurice Robinson & William Pierpont
- **Edition:** 2005
- **License:** Copyrighted
- **Addressing Scheme:**  
  `BYZ-Robinson-Pierpont-2005:Book.Chapter.Verse`

---

### Textus Receptus

- **Canonical ID:** `TR-Scrivener-1894`
- **Editor:** F. H. A. Scrivener
- **Edition:** 1894
- **License:** Public domain
- **Repository Status:** Eligible for inclusion (not yet committed)
- **Addressing Scheme:**  
  `TR-Scrivener-1894:Book.Chapter.Verse`

---

## 1.4 Syriac Witness

### Peshitta (NT)

- **Canonical ID:** `Peshitta-NT`
- **Primary Edition Reference:** George Anton Kiraz (where applicable)
- **License:** Varies by edition
- **Addressing Scheme:**  
  `Peshitta-NT:Book.Chapter.Verse`

---

## 1.5 Latin Tradition

### Vulgate (Weber-Gryson)

- **Canonical ID:** `Vulgate-Weber-2007`
- **Editors:** Robert Weber, Roger Gryson
- **Edition:** 5th edition (2007)
- **Publisher:** Deutsche Bibelgesellschaft
- **License:** Copyrighted
- **Addressing Scheme:**  
  `Vulgate-Weber-2007:Book.Chapter.Verse`

---

# 2. Scripture — English Translations

Translations are treated as interpretive witnesses, not primary evidence.

Each translation is referenced by canonical abbreviation and edition year.

| Canonical ID | Translation | Edition | License Status |
|--------------|------------|---------|----------------|
| ESV-2016 | English Standard Version | 2016 | Copyright |
| NASB-2020 | New American Standard Bible | 2020 | Copyright |
| NRSVue-2021 | New Revised Standard Version Updated Edition | 2021 | Copyright |
| NIV-2011 | New International Version | 2011 | Copyright |
| KJV-1769 | King James Version | 1769 | Public domain |
| NKJV-1982 | New King James Version | 1982 | Copyright |
| DR-1899 | Douay-Rheims | 1899 | Public domain |
| NABRE-2011 | New American Bible Revised Edition | 2011 | Copyright |
| LSB-2021 | Legacy Standard Bible | 2021 | Copyright |
| NET-2019 | NET Bible (Full Notes) | 2019 | Copyright (limited quotation permitted) |

Addressing scheme:
`<ID>:Book.Chapter.Verse`

Example:
`ESV-2016:Rom.3.24`

---

# 3. Historical Primary Sources

These function as authoritative articulations of tradition, not as scripture.

## Ecumenical Creeds

| Canonical ID | Source | Status |
|--------------|--------|--------|
| Apostles-Creed | Apostles' Creed | Public domain |
| Nicene-381 | Niceno-Constantinopolitan Creed (381) | Public domain |
| Chalcedon-451 | Definition of Chalcedon | Public domain |
| Athanasian | Athanasian Creed | Public domain |

Addressing scheme:
`Nicene-381:Section.3`

---

## Reformation & Post-Reformation Confessions

| Canonical ID | Document |
|--------------|----------|
| Westminster-1646 | Westminster Confession of Faith |
| Trent-1547-S6 | Council of Trent, Session 6 (Justification) |
| Concord-1580 | Book of Concord |
| ThirtyNine-1571 | Thirty-Nine Articles |
| Schleitheim-1527 | Schleitheim Confession |

Addressing scheme:
`Westminster-1646:Chapter.11.1`

---

## Major Theological Works (Representative)

These are cited when seeding proponent/opponent agents.

Examples:

| Canonical ID | Work |
|--------------|------|
| Calvin-Inst-1559 | *Institutes of the Christian Religion* (1559) |
| Aquinas-ST | *Summa Theologiae* |
| Luther-Bondage | *The Bondage of the Will* |
| Chemnitz-Examination | *Examination of the Council of Trent* |
| Wesley-Sermons | Standard Sermons |
| Newman-Development | *Essay on the Development of Christian Doctrine* |
| Florovsky-BibleChurch | *Bible, Church, Tradition* |
| Zizioulas-Being | *Being as Communion* |

Addressing scheme:
`Calvin-Inst-1559:3.11.2`

---

# 4. Canon Transparency

Parallel canon groupings maintained logically (not yet materialized as separate directories):

- `Tanakh`
- `Protestant-66`
- `Catholic-73`
- `Orthodox`
- `Ethiopian`

Canon selection must be declared in every debate run.

---

# 5. Machine-Readable Conventions

All textual citations in:

- `claims/`
- `debates/`
- `resolution_trees/`
- `graph/`

must use the canonical IDs defined here.

No free-form citation strings are permitted.

---

# 6. Phase 0 Status

✅ Edition metadata defined  
✅ Addressing scheme defined  
❌ Text bodies committed (pending licensing review and size considerations)  
❌ Automated verse retrieval script not yet implemented  

Completion of Phase 0 requires:
- Addressability verified via script
- At least one public-domain text committed for testing (e.g., TR-Scrivener-1894 or KJV-1769)

