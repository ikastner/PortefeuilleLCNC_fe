# Design : Plan de charge = Qui fait quoi · TDB = cockpit mixte

**Date :** 2026-10-08  
**Statut :** validé produit (canvas `pdc-qfq-proposition`)  
**Projets :** `PortefeuilleLCNC_fe` (principal) · `PortefeuilleLCNC_be` **inchangé en P0** (deep-links = `sessionStorage` only)  
**Références :** maquette `maquette_admin_lcnc` (`#/dashboard` QFQ, `#/plan` renvoi), pages Convertigo `PlanDeCharge`, `TableauDeBord`

---

## 1. Problème

Le **Plan de charge** actuel s’appuie sur `PlanningGridV2` (trimestres, événements continus). Le **Tableau de bord** porte déjà le **Qui fait quoi** (période libre, demi-journées, effort/dispos, affectation). Les deux modèles ne sont pas alignés ; la maquette place le QFQ sur le dashboard et ne fait du `#/plan` qu’un renvoi.

## 2. Décisions

| Décision | Choix |
|----------|--------|
| Page d’édition des affectations | **Plan de charge** = écran Qui fait quoi (ex-corps TDB) |
| Grille trimestrielle `PlanningGridV2` sur PDC | **Abandonnée** sur cette page |
| Tableau de bord | **Cockpit mixte** : synthèse + alertes + projets — **sans** grille d’édition |
| Une seule grille d’édition | Oui, dans le Plan de charge |

## 3. Objectifs / non-objectifs

### Objectifs

- Une navigation claire : **Plan de charge** = gérer qui fait quoi ; **Tableau de bord** = piloter / alerter / voir le portefeuille.
- Réutiliser la logique et l’UX QFQ déjà stabilisées sur le TDB (5 j visibles, sticky frise/dates dans la card, drawer affectation, commentaires bornés).
- Deep-links TDB → PDC (jour, projet, dispos).

### Non-objectifs

- Ne pas refondre Suivi / MVP / Rôles / Projets / Lignes (pages dédiées inchangées).
- Ne pas garder deux grilles d’affectation parallèles.
- Ne pas exiger de nouveaux endpoints BE en P0 si `Grille_Lire` + analyse front suffisent (comme aujourd’hui sur le TDB).

## 4. Architecture cible

```
Sidebar
├── Tableau de bord     → cockpit (synthèse | alertes | projets)
├── Plan de charge      → QFQ éditable (grille + aside + commentaires)
├── Projets / Lignes / … → inchangé
```

### Unités

| Unité | Responsabilité | Interface | Dépendances |
|-------|----------------|-----------|-------------|
| **Page PlanDeCharge** | Shell (sidebar, topbar) + **hôte** du QFQ éditable | Lit `pfc:qfq:*` au `ionViewWillEnter` ; expose navigation vers TDB | `Grille_Lire`, `Jour_*`, `Commentaire_*`, `pfc:canAdmin` |
| **Page TableauDeBord** | Cockpit A/B/C ; **aucune** grille cellule | Écrit `pfc:qfq:*` puis `navController` → PlanDeCharge ; lit sa propre période locale | `Grille_Lire` (+ feriés), analyse front existante ; pas d’écriture `Jour_*` |
| **Module QFQ (P0 = déplacé dans PDC)** | Période, filtres, grille, aside, commentaires, drawer, CSS `dash-*` | **Deep-link** (storage) : période + focusDay/focusEl/scroll seulement. **Filtres** `profil` / `q` = état local PDC, jamais via `pfc:qfq:*`. | Contenu aujourd’hui dans `TableauDeBord.yaml` ; P0 **déplacé** vers `PlanDeCharge` (pas de composant partagé obligatoire) |
| **Module cockpit (reste dans TDB)** | KPIs, capacité, pills/insights, ranking projets | Entrée : même shape d’analyse que `analyser()` actuel · Sortie : deep-links | Réutilise helpers d’analyse ; **ne** réutilise **pas** le DOM grille |

**Frontière :** toute mutation d’affectation / commentaire de créneau se fait **uniquement** depuis le Plan de charge.

**P0 migration :** déplacer le module QFQ dans PDC (une seule copie). Factorisation composant partagé = suivi, pas bloquant.

## 5. Plan de charge — écran Qui fait quoi

### Composition (haut → bas)

1. **Topbar** — fil d’Ariane Pilotage › Plan de charge ; sous-titre type « Qui fait quoi sur la période » ; lien vers Tableau de bord.
2. **Card Qui fait quoi**
   - Toolbar : recherche personne ; chips profil = **ceux déjà produits sur le TDB** (`profilChips` : `Tous` + libellés/codes issus du référentiel chargé, pas une liste figée hardcodée hors données).
   - Frise / nav période (5 j ouvrés visibles, presets, Du/Au) — sticky avec la toolbar dans la card (modèle maquette : hors scroll grille).
   - Grille : collaborateurs groupés, colonnes jours, colonne Affectation % ; cellules AM/PM.
   - Sticky ligne des dates dans le scroll de la grille.
3. **Aside** — Effort par projet ; Disponibles ; Absences/Formations.
4. **Commentaires** — liste période, `max-height` + scroll interne.
5. **Drawer affectation** — create/view (PROJET / OFF / ABSENCE / FORMATION), commentaires de créneau.

### Comportements clés (P0)

- Fenêtre visible **≤ 5 jours ouvrés** (comme TDB actuel).
- Droits : lecture seule si non admin ; édition sinon (`pfc:canAdmin` / session).
- Filtres profil + recherche ; focus projet / jour (depuis deep-link TDB).
- Retrait du sélecteur multi-trimestres et de `PlanningGridV2` sur cette page.

### Hors scope PDC (P0)

- Vues `pfaHtml` Suivi/MVP embarquées si déjà accessibles via pages dédiées — ne pas les réintroduire dans le corps QFQ.

## 6. Tableau de bord — cockpit mixte

### Périodes TDB vs PDC

- **Indépendantes par défaut** : chaque page garde sa propre période en mémoire de page.
- **Passage explicite seulement** via deep-link (`pfc:qfq:periodFrom` / `periodTo`) quand l’utilisateur clique CTA / alerte / capacité / projet depuis le TDB.
- Pas de sync live bi-onglets ; pas d’écriture continue de la période TDB dans le storage hors navigation volontaire.

### Zone A — Synthèse (P0)

- Navigation de période (défaut = cette semaine ; mêmes presets que l’ex-TDB).
- Hero capacité (barres Projet / Libre / Absence / Formation sur les jours visibles).
- Quatre KPIs avec delta vs période précédente (taux d’affectation, effort projet, à planifier, absences/formations).
- CTA principal : **Ouvrir le plan de charge**.

**Clics (toute nav PDC écrit toujours `periodFrom` + `periodTo`) :**

| Contrôle | Deep-link |
|----------|-----------|
| CTA « Ouvrir le plan de charge » | période seule |
| Jour / barre capacité | + `focusDay` (ISO) |
| KPI **À planifier** si valeur &gt; 0 | + `scroll=dispos` — **émetteur P0 de la clé scroll** |
| KPI **À planifier** si valeur = 0 | no-op (pas de navigation) |
| Autres KPIs | no-op en P0 (pas de deep-link) |

### Zone B — Alertes / à traiter (P0)

Deux familles :

#### B1 — Pills référentiel (réutilise l’existant)

| Alerte | Règle | Cible |
|--------|-------|--------|
| Sans rôle | Compteur existant | `aller("lignes")` + `pfc:preset=role` |
| Sans référent | Compteur existant | `lignes` + preset `ref` |
| Projets sans chef | Compteur existant | `projets` + preset `chef` |
| Projets sans participant | Compteur existant TDB (`preset: participant`) | `projets` + preset `participant` |

#### B2 — Insights période (réutilise l’existant, **clics re-routés**)

Les insights hero actuels qui faisaient `focus` jour/projet **sur la grille TDB** doivent, après retrait de la grille :

| Insight (comportement actuel) | Clic P0 |
|-------------------------------|---------|
| `act: "jour"` (index jour dans insight) | TDB convertit l’index → **ISO** puis PDC + `focusDay` |
| `act: "projet"` (`key` = code élément) | PDC + période + `focusEl=key` (**P0** pour insights ; ranking zone C reste P1) |
| `clickable: false` | aucun navigation |

#### B3 — Ajout P0 (nouveau, pas un reuse)

| Alerte | Règle | UI | Cible |
|--------|-------|-----|--------|
| Surcharge | ≥ 1 collab avec taux période **&gt; 100 %** (même calcul que colonne Affectation) | **Pill** dans la file alertes (à côté des pills référentiel), visible seulement si compteur &gt; 0 | PDC + période TDB (pas de focus personne en P0) |

**Hors P0 :** commentaires récents.

**Aside Dispos sur mobile :** si `scroll=dispos` et aside empilé sous la grille, PDC scroll jusqu’à la card Dispos (même comportement que `scrollIntoView` ciblé).

### Zone C — Portefeuille projets (P1)

- Classement effort sur la période (jours, %, participants) — même source que l’aside Effort actuel.
- Lien fiche Projet ; isolation PDC via `focusEl` = code projet.
- Résumé jalons Suivi/MVP : **P2** (hors plan P0/P1 minimal).

### Interdit sur le TDB

- Grille collaborateurs demi-journées.
- Drawer d’affectation depuis une cellule.
- Frise sticky QFQ (réservée au PDC).

## 7. Flux de données

```
Période locale de la page
    → Grille_Lire (+ feriés)
    → analyser() (helpers existants)
        → PDC : grille + aside + commentaires + drawer
        → TDB : KPIs + capacité + alertes + ranking projets (P1)
```

Écritures : `Jour_Enregistrer` / commentaires créneau **uniquement** depuis le PDC (drawer).

### Contrat deep-link TDB → PDC (P0)

Transport : **`sessionStorage`** (déjà utilisé : `pfc:preset`, `pfc:canAdmin`, …). Pas de query string Convertigo en P0.

| Clé | Type | Écrit par | Lu / consommé par |
|-----|------|-----------|-------------------|
| `pfc:qfq:periodFrom` | ISO date `YYYY-MM-DD` | TDB (avant nav) | PDC au `ionViewWillEnter` → `setPeriode` |
| `pfc:qfq:periodTo` | ISO date | TDB | PDC idem |
| `pfc:qfq:focusDay` | ISO date ou absent | TDB (capacité / insight `act:jour`) | PDC → focus jour puis clear |
| `pfc:qfq:focusEl` | code projet ou absent | TDB (insight `act:projet` **P0** ; ranking zone C en P1) | PDC → `focusEl` puis clear |
| `pfc:qfq:scroll` | `dispos` \| absent | TDB (**KPI À planifier**) | PDC `scrollIntoView` card Dispos puis clear |
| `pfc:preset` | inchangé | TDB alertes référentiel | Pages Lignes/Projets (existant) |

**Règles :**

1. TDB écrit les clés puis navigue vers `PlanDeCharge`.
2. PDC lit, applique, **supprime** les clés `pfc:qfq:*` après application (one-shot).
3. Clés absentes / dates invalides / `from > to` → ignorer le deep-link, garder défaut PDC (cette semaine) ; pas d’erreur bloquante.
4. Si seule la période est fournie sans focus : ouvrir PDC sur cette période, `gridStart` centré sur aujourd’hui si dans la plage (comportement TDB actuel).

### Erreurs & états vides (réutiliser handlers TDB)

| Cas | Comportement |
|-----|----------------|
| Échec `Grille_Lire` | Message d’erreur page existant / retry ; pas de crash ; skeleton retiré |
| Période sans jour ouvré | Fenêtre vide + message court ; nav période reste utilisable |
| Aucun collaborateur après filtres | État vide grille (comme TDB) |
| Deep-link invalide | Ignoré (voir ci-dessus) |
| Non-admin | Grille en lecture seule ; drawer consultation selon règles actuelles |

## 8. Navigation & libellés

| Entrée sidebar | Rôle |
|----------------|------|
| Tableau de bord | Cockpit synthèse / alertes / projets |
| Plan de charge | Qui fait quoi (édition) |

Mettre à jour sous-titres topbar et CTA croisés (TDB ↔ PDC). Supprimer les CTA du type « Ouvrir le plan de charge » qui partent d’un QFQ encore sur le TDB.

## 9. Migration technique (principes)

1. **Déplacer** le corps QFQ du `TableauDeBord` vers `PlanDeCharge` (préférer déplacement clair à une double maintenance longue).
2. **Retirer** `PlanningGridV2` + UI trimestres du PDC.
3. **Reconstruire** le TDB autour des zones A/B/C en réutilisant `analyser` / KPIs / insights existants.
4. Factoriser ensuite (composant partagé / CSS `dash-*`) si le déplacement crée de la duplication — possible en suivi, pas bloquant P0.

Risque principal : taille de `TableauDeBord.yaml` — le plan d’implémentation devra découper en étapes testables (PDC d’abord utilisable, puis TDB allégé).

## 10. Critères d’acceptation

### P0

- [ ] Sur **Plan de charge**, Qui fait quoi (≤5 j, filtres `profilChips` dynamiques, aside, commentaires) ; affectation drawer si admin.
- [ ] `PlanningGridV2` et sélecteur trimestres absents du PDC.
- [ ] Sur **Tableau de bord** : zones **synthèse + alertes** ; **aucune** grille d’édition.
- [ ] Deep-link : CTA période → PDC ; capacité/insight jour → `focusDay` ; insight projet → `focusEl` ; KPI À planifier (&gt;0) → `scroll=dispos`.
- [ ] Pills référentiel (rôle / référent / chef [/ participant]) → Lignes/Projets comme aujourd’hui.
- [ ] **Nouvelle** pill Surcharge (&gt;100 %) si cas présent ; clic → PDC période.
- [ ] Sidebar / sous-titres reflètent les rôles.
- [ ] Readonly non-admin et login inchangés fonctionnellement.

### P1

- [ ] Zone **portefeuille projets** sur le TDB (classement effort + lien Projet / `focusEl` PDC).

## 11. Hors scope / plus tard

- Refonte BE dédiée « cockpit ».
- Matrix Suivi/MVP dans le TDB au-delà d’un résumé léger.
- Fusion des routes TDB et PDC en une seule URL.

## 12. Prochaine étape

Rédiger le **plan d’implémentation** (`writing-plans`) après relecture humaine de cette spec.
