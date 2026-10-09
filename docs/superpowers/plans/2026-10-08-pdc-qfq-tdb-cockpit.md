# PDC = Qui fait quoi · TDB cockpit mixte — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Faire du Plan de charge l’écran Qui fait quoi éditable, et transformer le Tableau de bord en cockpit synthèse + alertes (+ projets en P1), sans grille d’affectation.

**Architecture:** P0 = **déplacer** le module QFQ de `TableauDeBord.yaml` vers `PlanDeCharge.yaml` (une seule copie), retirer `PlanningGridV2` + trimestres du PDC, puis alléger le TDB (zones A/B). Deep-links one-shot via `sessionStorage` `pfc:qfq:*`. Pas de nouveau BE. Zone C projets = P1 après P0 vert.

**Tech Stack:** Convertigo NGX (`PortefeuilleLCNC_fe`), YAML pages + `scriptContent` / `PageStyle`, MCP Convertigo pour apply/save, vérif manuelle builder + checklist spec.

**Spec :** `docs/superpowers/specs/2026-10-08-pdc-qfq-tdb-cockpit-design.md`

---

## File map

| Fichier | Rôle après changement |
|---------|----------------------|
| `_c8oProject/mobilePages/PlanDeCharge.yaml` | Hôte QFQ (script + UI + styles `dash-*` / drawer) ; plus de `PlanningGridV2` ni trimestres |
| `_c8oProject/mobilePages/TableauDeBord.yaml` | Cockpit A/B (hero, KPIs, pills, insights) ; writers deep-link ; plus de grille/aside QFQ/drawer |
| `_c8oProject/mobileSharedComponents/PfaSidebar.yaml` | Libellés nav si besoin (déjà Plan de charge / Tableau de bord) |
| `docs/superpowers/specs/2026-10-08-pdc-qfq-tdb-cockpit-design.md` | Référence (ne pas modifier sauf écart produit) |

**Helpers à introduire (dans le script de chaque page ou un mini bloc partagé copié) :**

```typescript
// Noms exacts à utiliser
écrireQfqDeepLink(opts: {
  periodFrom: string;
  periodTo: string;
  focusDay?: string;   // ISO
  focusEl?: string;
  scroll?: "dispos";
}): void

lireEtConsommerQfqDeepLink(): {
  periodFrom?: string;
  periodTo?: string;
  focusDay?: string;
  focusEl?: string;
  scroll?: string;
} | null
```

Clés : `pfc:qfq:periodFrom`, `pfc:qfq:periodTo`, `pfc:qfq:focusDay`, `pfc:qfq:focusEl`, `pfc:qfq:scroll`.

**Jamais** dans `pfc:qfq:*` : filtres `profil` / `q` (spec §4) — restent locaux à chaque écran.

---

## Chunk 1: Fondations deep-link + nettoyage PDC (sans QFQ encore)

### Task 1: Helpers deep-link sur PlanDeCharge (lecture)

**Files:**
- Modify: `_c8oProject/mobilePages/PlanDeCharge.yaml` (`scriptContent`, près de `ionViewWillEnter` / init page ~L110–400)

- [ ] **Step 1: Ajouter les deux fonctions helpers** dans le script PlanDeCharge

```typescript
écrireQfqDeepLink(opts) {
  try {
    if (opts.periodFrom) window.sessionStorage.setItem("pfc:qfq:periodFrom", opts.periodFrom);
    if (opts.periodTo) window.sessionStorage.setItem("pfc:qfq:periodTo", opts.periodTo);
    if (opts.focusDay) window.sessionStorage.setItem("pfc:qfq:focusDay", opts.focusDay);
    else window.sessionStorage.removeItem("pfc:qfq:focusDay");
    if (opts.focusEl) window.sessionStorage.setItem("pfc:qfq:focusEl", opts.focusEl);
    else window.sessionStorage.removeItem("pfc:qfq:focusEl");
    if (opts.scroll) window.sessionStorage.setItem("pfc:qfq:scroll", opts.scroll);
    else window.sessionStorage.removeItem("pfc:qfq:scroll");
  } catch (e) {}
}
lireEtConsommerQfqDeepLink() {
  try {
    var from = window.sessionStorage.getItem("pfc:qfq:periodFrom");
    var to = window.sessionStorage.getItem("pfc:qfq:periodTo");
    var focusDay = window.sessionStorage.getItem("pfc:qfq:focusDay");
    var focusEl = window.sessionStorage.getItem("pfc:qfq:focusEl");
    var scroll = window.sessionStorage.getItem("pfc:qfq:scroll");
    ["pfc:qfq:periodFrom","pfc:qfq:periodTo","pfc:qfq:focusDay","pfc:qfq:focusEl","pfc:qfq:scroll"]
      .forEach(function (k) { window.sessionStorage.removeItem(k); });
    if (!from && !to && !focusDay && !focusEl && !scroll) return null;
    if (from && to && from > to) return null;
    return { periodFrom: from || undefined, periodTo: to || undefined,
      focusDay: focusDay || undefined, focusEl: focusEl || undefined, scroll: scroll || undefined };
  } catch (e) { return null; }
}
```

- [ ] **Step 2: Vérifier** via MCP `databaseobject-tree-get` que le script contient `lireEtConsommerQfqDeepLink`

- [ ] **Step 3: Commit**

```bash
cd PortefeuilleLCNC_fe
git add _c8oProject/mobilePages/PlanDeCharge.yaml
git commit -m "Ajoute les helpers deep-link QFQ sur PlanDeCharge."
```

### Task 2: Retirer trimestres + PlanningGridV2 du template PDC

**Files:**
- Modify: `_c8oProject/mobilePages/PlanDeCharge.yaml` (~L2745–2829 trimestres, ~L3150–3298 PlanningGridV2, styles `.pfc-trimestres`)

- [ ] **Step 1: Masquer / supprimer** le `p_multiselect` trimestres de la topbar (ne plus binder `choisirTrimestres` dans l’UI)

- [ ] **Step 2: Remplacer** le bloc `view === 'grille'` + `PlanningGridV2` par un conteneur placeholder

```html
<!-- Convertigo UIDynamicElement class: pfc-qfq-host -->
<div class="pfc-qfq-host">
  <p class="muted">Qui fait quoi — migration en cours</p>
</div>
```

- [ ] **Step 3: Garder** les modales affectation PDC (`pfModal*`) **intactes** jusqu’à Task 5b (après drawer QFQ). Ne pas les brancher au placeholder.

- [ ] **Step 4: Builder** — reload PlanDeCharge : plus de grille trimestre, placeholder visible, pas d’erreur TS

- [ ] **Step 5: Commit**

```bash
git commit -m "Retire PlanningGridV2 et le sélecteur trimestres du Plan de charge."
```

---

## Chunk 2: Porter le QFQ dans PlanDeCharge

### Task 3a: Déclarations d’état QFQ

**Files:**
- Modify: `PlanDeCharge.yaml` `scriptContent`
- Copy from: `TableauDeBord.yaml` L21–148 (fields) + init L410–435

- [ ] **Step 1: Ajouter** les champs QFQ manquants au type page PDC — **copie exhaustive** des fields du type TDB **L21–148** (`_focusSig` inclus) utilisés par QFQ (`reconstruire` / `affOuvrir` / `chargerSemaine` / drawer / commentaires / frise), plus les champs deep-link absents du TDB : `_pendingApplied`, `_pendingPeriodOnly`, `_pendingFocusDayIso`, `_pendingFocusEl`, `_pendingScroll`

- [ ] **Step 2: Init défaut période** (copier tel quel) :

```typescript
this.periodFrom = this.iso(this.monday(0));
var finInit = this.monday(0);
finInit.setDate(finInit.getDate() + 4);
this.periodTo = this.iso(finInit);
this.gridStart = 0;
this.dashCols = 5;
this.focusEl = "";
this.focusDay = null;
this._pendingApplied = true; // pas de pending tant qu’aucun deep-link
this._pendingPeriodOnly = false;
this._pendingFocusDayIso = "";
this._pendingFocusEl = "";
this._pendingScroll = "";
try { this.canAdmin = window.sessionStorage.getItem("pfc:canAdmin") === "1"; } catch (eA) {}
```

- [ ] **Step 3: MCP get** — confirmer présence de `periodFrom` et `canAdmin` dans le script PDC

- [ ] **Step 4: Commit**

```bash
git commit -m "Ajoute l’état Qui fait quoi sur PlanDeCharge."
```

### Task 3b: Méthodes charge / analyse / fenêtre

**Files:**
- Modify: `PlanDeCharge.yaml`
- Copy from TDB: `monday`, `iso`, `joursOuvres`, `fenetreVisible`, `maxGridStart`, `periodeCourante`, `periodePrecedente`, `noeud`, `assurerPlaceSemaine`, `assurerLayoutCss`, `chargerSemaine`, `analyser`, `reconstruire`, `centrerFriseSur`, frise helpers

- [ ] **Step 1: Copier** le **bloc contigu** helpers QFQ depuis TDB (de `iso`/`monday` jusqu’à la fin de `reconstruire`, plus `setProfil` / `setRecherche` / `resetFiltres` / focus locaux) — pas seulement la liste nominative

- [ ] **Step 2: Builder** — compile OK même sans UI complète

- [ ] **Step 3: Commit**

```bash
git commit -m "Porte charge/analyse/fenêtre QFQ vers PlanDeCharge."
```

### Task 3c: Deep-link apply + gridStart

**Files:**
- Modify: `PlanDeCharge.yaml` (hook dans `ionViewWillEnter` / `ionViewDidEnter` + fin de charge)

- [ ] **Step 1: Ajouter** les méthodes suivantes :

```typescript
appliquerDeepLinkQfq() {
  var dl = this.lireEtConsommerQfqDeepLink();
  this._pendingApplied = false;
  this._pendingPeriodOnly = false;
  if (!dl) {
    if (!this.periodFrom || !this.periodTo) {
      this.periodFrom = this.iso(this.monday(0));
      var fin = this.monday(0); fin.setDate(fin.getDate() + 4);
      this.periodTo = this.iso(fin);
    }
    this._pendingFocusDayIso = "";
    this._pendingFocusEl = "";
    this._pendingScroll = "";
    this._pendingApplied = true; // entrée nu : pas de centrage forcé
    return;
  }
  if (dl.periodFrom && dl.periodTo) {
    this.periodFrom = dl.periodFrom;
    this.periodTo = dl.periodTo;
  }
  this._pendingFocusDayIso = dl.focusDay || "";
  this._pendingFocusEl = dl.focusEl || "";
  this._pendingScroll = dl.scroll || "";
  // Spec §7.4 : centrer frise seulement si deep-link période seule (pas focusDay/focusEl)
  this._pendingPeriodOnly = !!(dl.periodFrom && dl.periodTo && !dl.focusDay && !dl.focusEl);
}
/**
 * Accroche UNIQUE dans reconstruire() — voir Step 2 pour l’ordre exact.
 * NE PAS rappeler reconstruire() (sinon boucle). Garde `_pendingApplied` dure.
 */
appliquerPendingFocusInPlace() {
  if (this._pendingApplied) return;
  this._pendingApplied = true;
  var all = this._allDays || [];
  if (this._pendingFocusDayIso) {
    var iso = this._pendingFocusDayIso; this._pendingFocusDayIso = "";
    var idx = -1;
    for (var i = 0; i < all.length; i++) if (this.iso(all[i]) === iso) { idx = i; break; }
    if (idx >= 0) {
      this.focusDay = idx;
      var win = this.fenetreVisible(all.length);
      this.gridStart = Math.max(0, Math.min(idx - Math.floor(win / 2), this.maxGridStart(all.length, win)));
    }
  } else if (this._pendingPeriodOnly) {
    this._pendingPeriodOnly = false;
    this.centrerFriseSur(all); // spec §7.4 — CTA / période seule uniquement
  }
  if (this._pendingFocusEl) { this.focusEl = this._pendingFocusEl; this._pendingFocusEl = ""; }
  if (this._pendingScroll === "dispos") {
    this._pendingScroll = "";
    setTimeout(function () {
      var nodes = document.querySelectorAll(".tdb .dash-side, .tdb .dash-aside .card");
      for (var j = 0; j < nodes.length; j++) {
        var t = (nodes[j].textContent || "");
        if (t.indexOf("Disponibles") >= 0) { nodes[j].scrollIntoView({ block: "nearest", behavior: "smooth" }); break; }
      }
    }, 400);
  }
}
```

- [ ] **Step 2: Brancher l’ordre d’appel** (obligatoire — le code actuel a `_allDays = allDays` **après** clamp/slice ~L1810–1818 ; il faut **réordonner**) :

1. `ionViewWillEnter` / `ionViewDidEnter` → `this.appliquerDeepLinkQfq()` **avant** `this.chargerSemaine()`
2. Dans `reconstruire()`, ordre exact de la passe :
   - calculer `allDays` / `win` / `maxStart` comme aujourd’hui
   - **`this._allDays = allDays` en premier** (déplacer avant le clamp/slice)
   - **`this.appliquerPendingFocusInPlace()`** (peut muter `focusDay` / `gridStart` / `focusEl`)
   - **puis** clamp `gridStart`, slice `days`, `_winDays`, `_winStart`, `dashCols`, reste du rendu
   - **Interdit** d’appeler `reconstruire()` depuis le pending
- [ ] **Step 3: Commit**

```bash
git commit -m "Applique les deep-links QFQ et le centrage frise sur PlanDeCharge."
```

### Task 3d: Drawer affectation + commentaires (script)

**Files:**
- Modify: `PlanDeCharge.yaml`
- Copy from TDB: `affOuvrir`, `affEnregistrer`, `ouvrirSeg`, `calerCommentaires`, fil commentaires

- [ ] **Step 1: Copier** méthodes drawer + commentaires

- [ ] **Step 2: Commit**

```bash
git commit -m "Porte drawer affectation et commentaires QFQ vers PlanDeCharge."
```

### Task 4: Template + styles QFQ

**Files:**
- Modify: `PlanDeCharge.yaml` Content + PageStyle
- Source UI: TDB `dash-layout` (~L3734 / ~L5913), aside (~L6826+), comments (~L6625+), AffIf drawer (~L8207+)

- [ ] **Step 1: Remplacer** `pfc-qfq-host` par le markup QFQ (main + aside + comments)

- [ ] **Step 2: Ajouter** AffIf drawer (copie TDB)

- [ ] **Step 3: Wrapper** zone contenu class `tdb`

- [ ] **Step 4: Copier** PageStyle `.tdb` / `.dash-*` / layout week / comments max-height depuis TDB

- [ ] **Step 5: Builder** — grille visible, frise, aside

- [ ] **Step 6: Commit**

```bash
git commit -m "Ajoute l’UI Qui fait quoi au Plan de charge."
```

### Task 5b: Supprimer les anciennes modales PDC

**Files:**
- Modify: `PlanDeCharge.yaml` (supprimer UI/modales `pfModal*`, `pfSheet*`, handlers `pfOpen*` devenus inutiles **après** que le drawer QFQ fonctionne)

- [ ] **Step 1: Grep** `pfModal|pfOpenCreate|PlanningGrid` dans PlanDeCharge.yaml — doit être 0 usage UI

- [ ] **Step 2: Supprimer** les nœuds UI modales héritées + script mort associé

- [ ] **Step 3: Builder** — affectation uniquement via drawer QFQ

- [ ] **Step 4: Commit**

```bash
git commit -m "Supprime les anciennes modales d’affectation du Plan de charge."
```

### Task 5: Droits + smoke PDC

- [ ] **Step 1: Confirmer** `canAdmin` lit `pfc:canAdmin`

- [ ] **Step 2: Checklist** : 5 j, filtres, aside, drawer admin, commentaires max-height, deep-link manuel (`sessionStorage` set + reload)

- [ ] **Step 3: Commit** si correctifs

```bash
git commit -m "Aligne les droits readonly du QFQ sur PlanDeCharge."
```

---

## Chunk 3: Transformer le Tableau de bord en cockpit

### Task 6: Retirer la grille QFQ du TDB (garder cockpit)

**Files:**
- Modify: `TableauDeBord.yaml` Content + script

- [ ] **Step 1: Supprimer** UI : card `dash-main` QFQ, aside Effort/Dispos/Absences, `dash-comments`, AffIf drawer affectation

- [ ] **Step 2: Conserver** (ne pas casser) :
  - `chargerSemaine` / `analyser` / `reconstruire` / `_allDays` / `capDays` / insights / KPIs / `periodFrom`/`periodTo`
  - hero (période, barre capacité, insights)
  - KPIs + **pills B1** (sans rôle / référent / chef / participant) — `ouvrirPill` → `lignes`/`projets` inchangé

- [ ] **Step 3: Grep** call sites UI `Jour_Enregistrer|affEnregistrer\(|ouvrirSeg\(` (pas les seules définitions) — **0** ; supprimer drawer + méthodes mortes d’écriture si encore présentes

- [ ] **Step 4: Grep** `data-route` pills — routes `lignes`/`projets` toujours présentes

- [ ] **Step 5: Builder** — TDB sans card « Qui fait quoi »

- [ ] **Step 6: Commit**

```bash
git commit -m "Retire la grille Qui fait quoi du Tableau de bord."
```

### Task 7: Deep-link writers + rewire clics TDB

**Files:**
- Modify: `TableauDeBord.yaml` (`aller` ~L3023, `allerPlan` ~L3069, handlers insight ~L5058, capacité / CapDayClick)

**Règle spec §6 :** périodes TDB/PDC **indépendantes**. Deep-link **uniquement** via CTA / alerte / capacité / projet / KPI. Nav sidebar `choisir("grille")` → `aller("grille")` **sans** écrire `pfc:qfq:*`.

- [ ] **Step 1: Copier** `écrireQfqDeepLink` depuis PDC

- [ ] **Step 2: Scinder** writers vs nav nu (conserver `pfc:vue` hors `pfc:qfq:*`) :

```typescript
// CTA topbar — déjà binder page.allerPlan() (~L7707)
allerPlan() {
  this.detailOn = false;
  this.écrireQfqDeepLink({ periodFrom: this.periodFrom, periodTo: this.periodTo });
  try { window.sessionStorage.setItem("pfc:vue", "grille"); window.sessionStorage.removeItem("pfc:preset"); } catch (e) {}
  this.routerProvider.navigateRoot("PlanDeCharge", false, null);
}
aller(route, preset) {
  // projets / lignes inchangés (L3026–3042) …
  if (route === "grille" || route === "plan") {
    try {
      window.sessionStorage.setItem("pfc:vue", "grille");
      if (preset === "surcharge") {
        window.sessionStorage.removeItem("pfc:preset");
        this.écrireQfqDeepLink({ periodFrom: this.periodFrom, periodTo: this.periodTo });
      } else {
        if (preset) window.sessionStorage.setItem("pfc:preset", String(preset));
        else window.sessionStorage.removeItem("pfc:preset");
        // nav sidebar nu : PAS de pfc:qfq:*
      }
    } catch (e) {}
    this.routerProvider.navigateRoot("PlanDeCharge", false, null);
    return;
  }
}
```

- [ ] **Step 3: Rewire insights** — miroir event-based de `focusJour`/`focusProjet` (~L2291–2309). Remplacer le body de `InsightActClickDo` (~L5058) :

```typescript
// Ancien : if (...data-act === 'jour') page.focusJour(event); else page.focusProjet(event);
// Nouveau :
if ((event.currentTarget || event.target).getAttribute('data-act') === 'jour') page.ouvrirInsightJour(event);
else page.ouvrirInsightProjet(event);
```

```typescript
ouvrirInsightJour(event) {
  var n = this.noeud(event);
  if (n && n.closest) n = n.closest("[data-day]") || n;
  var day = Number(n && n.getAttribute ? n.getAttribute("data-day") : -1);
  if (isNaN(day) || day < 0) return;
  var d = (this._allDays || [])[day];
  if (!d) return;
  this.écrireQfqDeepLink({ periodFrom: this.periodFrom, periodTo: this.periodTo, focusDay: this.iso(d) });
  this.routerProvider.navigateRoot("PlanDeCharge", false, null);
}
ouvrirInsightProjet(event) {
  var n = this.noeud(event);
  if (n && n.closest) n = n.closest("[data-el]") || n;
  var code = n && n.getAttribute ? (n.getAttribute("data-el") || "") : "";
  if (!code) return;
  this.écrireQfqDeepLink({ periodFrom: this.periodFrom, periodTo: this.periodTo, focusEl: code });
  this.routerProvider.navigateRoot("PlanDeCharge", false, null);
}
```

- [ ] **Step 4: Rewire barre capacité** — remplacer `CapDayClickDo` (~L5639 `page.focusJour(event)`) :

```typescript
// CapDayClickDo :
page.ouvrirCapaciteJour(event);
```

```typescript
ouvrirCapaciteJour(event) {
  var n = this.noeud(event);
  if (n && n.closest) n = n.closest("[data-day]") || n;
  var day = Number(n && n.getAttribute ? n.getAttribute("data-day") : -1);
  if (isNaN(day) || day < 0) return;
  var d = (this._allDays || [])[day];
  if (!d) return;
  this.écrireQfqDeepLink({ periodFrom: this.periodFrom, periodTo: this.periodTo, focusDay: this.iso(d) });
  this.routerProvider.navigateRoot("PlanDeCharge", false, null);
}
```

- [ ] **Step 5: KPI À planifier** — patcher **les deux** factories `kpi` (~L1897) **et** `kpiK` (~L1930) + les deux tableaux `this.kpis = [...]`, puis binder via **data-*** (pattern pills — la var de boucle `kpi` n’est **pas** dans le scope `UICustomAction`) :

```typescript
function kpi(label, value, delta, goodUp, unit, key, raw) {
  var tone = !delta ? "flat" : ((delta > 0) === goodUp ? "good" : "bad");
  var txt = !delta ? "Stable" : ((delta > 0 ? "\u25b2 +" : "\u25bc \u2212") + self.fmtCoef(Math.abs(delta)) + unit);
  return { label: label, value: value, delta: txt, tone: tone, key: key || "", raw: raw == null ? null : raw };
}
// Idem kpiK(...).
kpi("\u00c0 planifier", this.fmtJ(cur.libre), (cur.libre - prev.libre) / 2, false, " j", "libre", cur.libre)
kpiK("\u00c0 planifier", this.fmtJ(vueK.libre), (vueK.libre - vueP.libre) / 2, false, " j", "libre", vueK.libre)
// Autres KPIs : key "" / raw null
```

Sur le nœud `Kpi` (~L5828) : attributs `[attr.data-key]="kpi.key"` et `[attr.data-raw]="kpi.raw"` + `UIControlEvent` click :

```typescript
page.ouvrirKpiAPlanifier(event);
```

```typescript
ouvrirKpiAPlanifier(event) {
  var n = this.noeud(event);
  if (n && n.closest) n = n.closest("[data-key]") || n;
  var key = n && n.getAttribute ? (n.getAttribute("data-key") || "") : "";
  if (key !== "libre") return;
  var raw = Number(n.getAttribute("data-raw"));
  if (!raw || raw <= 0) return;
  this.écrireQfqDeepLink({ periodFrom: this.periodFrom, periodTo: this.periodTo, scroll: "dispos" });
  this.routerProvider.navigateRoot("PlanDeCharge", false, null);
}
```

- [ ] **Step 6: Autres KPIs** — `data-key` vide → no-op dans le handler

- [ ] **Step 7: Test manuel** CTA (`allerPlan`), sidebar grille (sans deep-link, `pfc:vue=grille` OK), capacité, insight jour/projet, KPI à planifier &gt;0 / =0

- [ ] **Step 8: Commit**
```bash
git commit -m "Branche les deep-links TDB vers le Plan de charge QFQ."
```

### Task 8: Pill Surcharge (nouveau P0)

**Files:**
- Modify: `TableauDeBord.yaml` (~L2157 pills)

- [ ] **Step 1: Compter** `nOver` = nombre de `cur.personnes` avec `taux > 100` **juste avant** `this.pills = pills` (~L2136)

- [ ] **Step 2: Si nOver &gt; 0**, push pill :
```typescript
pills.push({
  n: String(nOver),
  label: "en surcharge",
  route: "grille",
  preset: "surcharge"
});
```

- [ ] **Step 3: `ouvrirPill`** — si `preset === "surcharge"` ou route grille + surcharge, utiliser deep-link période (Task 7 `aller`) **sans** `pfc:preset` Lignes

- [ ] **Step 4: Vérifier** affichage si données &gt;100 %

- [ ] **Step 5: Commit**

```bash
git commit -m "Ajoute la pill alerte surcharge sur le Tableau de bord."
```

### Task 9: Libellés nav / topbar

**Files:**
- Modify: `PlanDeCharge.yaml`, `TableauDeBord.yaml` (et `PfaSidebar.yaml` si besoin)

- [ ] **Step 1: PDC** `pageSub` / topbar → « Qui fait quoi sur la période »

- [ ] **Step 2: TDB** `pageSub` → garder/orienter « retenir et où agir » (déjà L3062) ; CTA visible « Ouvrir le plan de charge »

- [ ] **Step 3: Smoke** sidebar : labels Plan de charge / Tableau de bord OK

- [ ] **Step 4: Builder** reload les deux pages

- [ ] **Step 5: Commit**

```bash
git commit -m "Met à jour les libellés Plan de charge et Tableau de bord."
```

---

## Chunk 4: P1 zone projets + stabilisation

### Task 10: Zone C portefeuille projets (P1)

**Files:**
- Modify: `TableauDeBord.yaml` (sous KPIs / pills)

- [ ] **Step 1: Section UI** « Portefeuille » listant `efforts` (ou équivalent analyse) : pour chaque entrée afficher **nom projet**, **jours** (`fmtJ`), **%**, **participants** (noms ou count)

- [ ] **Step 2: Bouton / clic ligne** « Isoler dans le plan » → `écrireQfqDeepLink({ periodFrom, periodTo, focusEl: code })` + `navigateRoot("PlanDeCharge")`

- [ ] **Step 3: Lien secondaire** « Fiche projet » → `aller("projets", code)` (existant)

- [ ] **Step 4: Vérifier** liste non vide sur période avec effort ; clic isolement ouvre PDC filtré

- [ ] **Step 5: Commit**

```bash
git commit -m "Ajoute le classement projets sur le cockpit Tableau de bord."
```

### Task 11: Checklist acceptation + save

- [ ] **Step 1: Exécuter** Verification matrix ci-dessous (P0 ; + P1 si Task 10)

- [ ] **Step 2: MCP `project-save`** `PortefeuilleLCNC_fe`

- [ ] **Step 3: Commit** correctifs éventuels

- [ ] **Step 4: Ne pas `git push`** sauf demande explicite utilisateur

---

## Verification matrix (manuel)

| Cas | Attendu |
|-----|---------|
| Ouvrir Plan de charge | QFQ ≤5 j, **pas** PlanningGridV2 |
| Non-admin | Pas d’édition cellule |
| TDB sans card QFQ | Hero + KPIs + pills visibles |
| Sidebar TDB → PDC | Nav **sans** deep-link (période PDC inchangée) |
| TDB CTA (`allerPlan`) → PDC | Même `periodFrom`/`periodTo` + `centrerFriseSur` si dans plage |
| Barre capacité | PDC + `focusDay` (ISO) |
| Insight jour | PDC + `focusDay` |
| Insight projet | PDC + `focusEl` |
| KPI À planifier &gt; 0 | PDC + scroll card Disponibles |
| KPI À planifier = 0 | Aucune nav |
| Autres KPIs | Aucune nav |
| Pill rôle/référent/chef/participant | Lignes/Projets + preset (inchangé) |
| Pill surcharge | Si taux&gt;100 ; → PDC période (deep-link) |
| Deep-link `from > to` / invalide | PDC semaine courante |
| Erreur `Grille_Lire` | Message, pas de crash |
| P1 zone projets | Liste j/%/participants ; isolé PDC / fiche Projets |

---

## Risks

| Risque | Mitigation |
|--------|------------|
| `TableauDeBord.yaml` / `PlanDeCharge.yaml` énormes | Commits fréquents ; builder après chaque task UI |
| Régressions sticky QFQ | Rejouer checklist visuelle semaine |
| Méthodes mortes après purge TDB | Grep refs avant suppression |
| Double drawer (ancien PDC + nouveau) | Supprimer modales PDC obsolètes en fin Chunk 2 |

---

## Chunk review notes

Chunks ≤1000 lines each. No BE tasks in P0. Execution: prefer **subagent-driven-development** one task at a time with human checkpoints after Chunk 2 (PDC usable) and Chunk 3 (TDB cockpit).
