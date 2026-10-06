/* Administration Portefeuille LCNC — shell, référentiel, tableau de bord.
   Chargé par PlanDeCharge. Ne remplace pas PlanningGridV2. */
(function () {
  var STATUTS = ["Non commencé", "En cours", "Envoyée à MOA", "Validée par MOA", "Terminé", "Non concerné"];
  var GROUPES = [
    { titre: "UX", codes: ["GRILLE_DROITS", "CADRAGE_UX", "VALIDATION_MAQUETTE", "TESTS_UX", "MAJ_MAQUETTE", "RG_MAQUETTE"] },
    { titre: "Réalisation", codes: ["SCENARIOS_TESTS", "DEV", "TESTS_MOE"] },
    { titre: "Environnements", codes: ["ENV_DEV", "ENV_VAL", "ENV_PREPROD", "ENV_PROD"] }
  ];

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function on(v) {
    var s = String(v == null ? "" : v).toLowerCase();
    return s === "true" || s === "t" || s === "1";
  }
  function num(v) { var n = parseFloat(String(v == null ? "0" : v).replace(",", ".")); return isNaN(n) ? 0 : n; }
  function st(page) {
    if (!page.pfaState) page.pfaState = {};
    return page.pfaState;
  }
  function lignes(page) { return page.lignes || []; }
  function ligne(page, cle) {
    var i, list = lignes(page);
    for (i = 0; i < list.length; i++) if (list[i].cle === cle) return list[i];
    return null;
  }
  function actifLignes(page) { return lignes(page).filter(function (l) { return on(l.actif); }); }
  function nom(page, cle) { var l = ligne(page, cle); return l ? (l.libelle || l.cle) : cle; }
  function elements(page) { return (page.elements || []).filter(function (e) { return on(e.actif); }); }
  function porteursOf(page, code) {
    return (page.porteurs || []).filter(function (p) { return p.codeElement === code; });
  }
  function alerts(page) {
    var els = elements(page);
    var lig = actifLignes(page);
    return {
      projetsSansPorteur: els.filter(function (e) { return !porteursOf(page, e.code).length; }).length,
      projetsSansChef: els.filter(function (e) { return !e.chefProjet; }).length,
      lignesSansReferent: lig.filter(function (l) { return !l.referent; }).length,
      lignesSansRole: lig.filter(function (l) { return !l.codeRole; }).length
    };
  }
  function coef(page, cle, code) {
    var i, list = page.coefficients || [];
    for (i = 0; i < list.length; i++) {
      if (list[i].cleLigne === cle && list[i].codeElement === code) return num(list[i].coefficient);
    }
    return 0;
  }
  function scoreOf(page, cle) {
    var t = 0;
    (page.coefficients || []).forEach(function (c) { if (c.cleLigne === cle) t += num(c.coefficient); });
    return Math.round(t * 100) / 100;
  }
  function repartition(page, code) {
    var t = 0;
    (page.coefficients || []).forEach(function (c) { if (c.codeElement === code) t += num(c.coefficient); });
    return Math.round(t * 100) / 100;
  }
  function devs(page) { return actifLignes(page).filter(function (l) { return l.codeProfil === "DEV"; }); }
  function suiviVal(page, codeEl, codeEt) {
    var i, list = page.suivi || [];
    for (i = 0; i < list.length; i++) {
      if (list[i].codeElement === codeEl && list[i].codeEtape === codeEt) return list[i].valeur || "";
    }
    return "";
  }

  function side(page) {
    var view = page.view || "grille";
    var collapsed = !!st(page).collapsed;
    function item(route, label, badge, admin) {
      if (admin && !page.canAdmin) return "";
      var b = badge ? "<span class=\"pfa-badge\">" + badge + "</span>" : "";
      return "<button type=\"button\" class=\"pfa-nav__item" + (view === route ? " is-on" : "") + "\" data-nav=\"" + route + "\">" +
        "<span>" + esc(label) + "</span>" + b + "</button>";
    }
    var user = "";
    try { user = page.nomActeur ? page.nomActeur() : ""; } catch (e) { user = page.cleActeur || ""; }
    return "<aside class=\"pfa-side" + (collapsed ? " is-collapsed" : "") + "\" id=\"pfa-side\">" +
      "<div class=\"pfa-side__brand\">" +
      "<img src=\"/convertigo/projects/PortefeuilleLCNC_fe/DisplayObjects/mobile/assets/img/logo-urssaf.svg\" alt=\"Urssaf\"/>" +
      "<div class=\"pfa-side__brandtxt\"><strong>Portefeuille LCNC</strong><span>Administration</span></div>" +
      "<button type=\"button\" class=\"pfa-side__collapse\" data-act=\"collapse\" aria-label=\"" + (collapsed ? "Ouvrir le menu" : "Fermer le menu") + "\">" + (collapsed ? "›" : "‹") + "</button>" +
      "</div>" +
      "<nav>" +
      "<div class=\"pfa-nav__sec\">Pilotage</div>" +
      item("grille", "Plan de charge", 0, false) +
      item("dashboard", "Tableau de bord", 0, false) +
      (page.canAdmin ? "<div class=\"pfa-nav__sec\">Référentiel</div>" : "") +
      item("projets", "Projets", (function () {
        var n = {};
        elements(page).forEach(function (e) { if (!e.chefProjet || !porteursOf(page, e.code).length) n[e.code] = 1; });
        var c = 0; for (var k in n) if (n.hasOwnProperty(k)) c++;
        return c;
      })(), true) +
      item("lignes", "Collaborateurs", (function () {
        var n = {};
        actifLignes(page).forEach(function (l) { if (!l.referent || !l.codeRole) n[l.cle] = 1; });
        var c = 0; for (var k in n) if (n.hasOwnProperty(k)) c++;
        return c;
      })(), true) +
      item("roles", "Rôles et droits", 0, true) +
      (page.canAdmin ? "<div class=\"pfa-nav__sec\">Pilotage projets</div>" : "") +
      item("suivi", "Suivi des projets", 0, true) +
      item("mvp", "MVP", 0, true) +
      (page.canAdmin ? "<button type=\"button\" class=\"pfa-nav__item\" data-act=\"feries\">Jours fériés</button>" : "") +
      "</nav>" +
      "<div class=\"pfa-side__user\"><strong>" + esc(user) + "</strong><span>" + (page.canAdmin ? "Gestionnaire" : "Contributeur") + "</span></div>" +
      "</aside>";
  }

  function toolbar(title, extra) {
    return "<div class=\"pfa-toolbar\"><h2>" + esc(title) + "</h2>" + (extra || "") + "</div>";
  }

  function drawer(title, body, saveAct) {
    return "<div class=\"pfa-drawer-back\" data-act=\"close-drawer\"></div>" +
      "<aside class=\"pfa-drawer\" role=\"dialog\" aria-label=\"" + esc(title) + "\">" +
      "<header><h3>" + esc(title) + "</h3><button type=\"button\" data-act=\"close-drawer\" aria-label=\"Fermer\">×</button></header>" +
      "<div class=\"pfa-drawer__body\">" + body + "</div>" +
      "<footer><button type=\"button\" class=\"pfa-btn\" data-act=\"close-drawer\">Annuler</button>" +
      "<button type=\"button\" class=\"pfa-btn pfa-btn--primary\" data-act=\"" + saveAct + "\">Enregistrer</button></footer></aside>";
  }

  function naturesOf(page) {
    return (page.types || []).filter(function (t) {
      return t.code !== "PROJET" && t.code !== "OFF" && !on(t.requiertElement);
    });
  }
  function natureTabs(page) {
    var s = st(page);
    if (!s.projetTab) s.projetTab = "projets";
    function tab(id, label, n) {
      return "<button type=\"button\" class=\"pfa-chip" + (s.projetTab === id ? " is-on" : "") + "\" data-act=\"tab-" + id + "\">" + label + " (" + n + ")</button>";
    }
    var actifs = naturesOf(page).filter(function (t) { return on(t.actif == null ? "true" : t.actif); }).length;
    return "<div style=\"display:flex;gap:8px;margin-bottom:12px\">" + tab("projets", "Projets", elements(page).length) + tab("natures", "Natures d'affectation", actifs) + "</div>";
  }
  function naturesVue(page) {
    var s = st(page);
    var rows = naturesOf(page).filter(function (t) { return s.natureInactifs || on(t.actif == null ? "true" : t.actif); });
    var html = natureTabs(page);
    html += "<p class=\"pfa-muted\">Ces natures se choisissent sur le plan de charge. Elles n'ont ni chef de projet, ni porteur, ni fiche catalogue.</p>";
    html += "<div style=\"display:flex;gap:8px;margin:8px 0\"><button type=\"button\" class=\"pfa-chip" + (s.natureInactifs ? " is-on" : "") + "\" data-act=\"nature-inactifs\">Afficher les désactivées</button>";
    html += "<button type=\"button\" class=\"pfa-btn pfa-btn--primary\" data-act=\"new-nature\">Nouvelle nature</button></div>";
    html += "<div class=\"pfa-table-wrap\"><table class=\"pfa-table\"><thead><tr><th>Nature</th><th>Aide</th><th>Couleur</th><th>État</th></tr></thead><tbody>";
    rows.forEach(function (t) {
      var actif = on(t.actif == null ? "true" : t.actif);
      html += "<tr data-act=\"open-nature\" data-code=\"" + esc(t.code) + "\"><td><strong>" + esc(t.libelle) + "</strong></td><td>" + esc(t.aide || "—") + "</td><td><span style=\"display:inline-block;width:14px;height:14px;border-radius:50%;background:" + esc(t.couleurFond || "#8B194D") + "\"></span></td><td>" + (actif ? "Active" : "Désactivée") + "</td></tr>";
    });
    html += "</tbody></table></div>";
    if (s.drawer && s.drawer.kind === "nature") html += natureDrawer(s.drawer);
    return html;
  }
  function natureDrawer(d) {
    var n = d.data || {};
    var body = "<label>Libellé<input data-form=\"libelle\" value=\"" + esc(n.libelle || "") + "\"/></label>" +
      "<label>Texte d'aide<input data-form=\"aide\" value=\"" + esc(n.aide || "") + "\"/></label>" +
      swatches(n.couleur || n.couleurFond || "#8B194D") +
      "<label>Disponibilité<select data-form=\"actif\"><option value=\"true\"" + (n.actif !== "false" && n.actif !== false ? " selected" : "") + ">Proposée à l'affectation</option><option value=\"false\"" + (n.actif === "false" || n.actif === false ? " selected" : "") + ">Désactivée</option></select></label>" +
      "<input type=\"hidden\" data-form=\"code\" value=\"" + esc(n.code || "") + "\"/>" +
      (n.code ? "<button type=\"button\" class=\"pfa-btn\" data-act=\"delete-nature\" data-code=\"" + esc(n.code) + "\">Supprimer</button>" : "");
    return drawer(n.code ? n.libelle : "Nouvelle nature", body, "save-nature");
  }
  function projets(page) {
    var s = st(page);
    if (s.projetTab === "natures") return naturesVue(page);
    var q = (s.q || "").toLowerCase();
    var rows = elements(page).filter(function (e) {
      if (q && (e.libelle || "").toLowerCase().indexOf(q) < 0 && (e.code || "").toLowerCase().indexOf(q) < 0) return false;
      if (s.manque === "chef" && e.chefProjet) return false;
      if (s.manque === "porteur" && porteursOf(page, e.code).length) return false;
      return true;
    });
    var html = natureTabs(page) + toolbar("Projets",
      "<input class=\"pfa-search\" data-field=\"q\" placeholder=\"Rechercher un projet\" value=\"" + esc(s.q || "") + "\"/>" +
      "<button type=\"button\" class=\"pfa-chip" + (s.manque === "chef" ? " is-on" : "") + "\" data-act=\"filtre-chef\">Sans chef</button>" +
      "<button type=\"button\" class=\"pfa-chip" + (s.manque === "porteur" ? " is-on" : "") + "\" data-act=\"filtre-porteur\">Sans porteur</button>" +
      "<button type=\"button\" class=\"pfa-btn pfa-btn--primary\" data-act=\"new-projet\">Nouveau</button>");
    html += "<div class=\"pfa-table-wrap\"><table class=\"pfa-table\"><thead><tr><th>Projet</th><th>LC/NC</th><th>Statut</th><th>Chef de projet</th><th>Porteurs</th><th>MVP</th></tr></thead><tbody>";
    rows.forEach(function (e) {
      var ports = porteursOf(page, e.code).map(function (p) { return p.libelle || p.codeAgent; }).filter(Boolean);
      var rep = repartition(page, e.code);
      html += "<tr data-act=\"open-projet\" data-code=\"" + esc(e.code) + "\">" +
        "<td><strong>" + esc(e.libelle) + "</strong></td>" +
        "<td>" + esc(e.lcNc || "—") + "</td><td>" + esc(e.statutCatalogue || "—") + "</td>" +
        "<td>" + (e.chefProjet ? esc(nom(page, e.chefProjet)) : "<span class=\"pfa-warn\">À définir</span>") + "</td>" +
        "<td>" + (ports.length ? esc(ports.join(", ")) : "<span class=\"pfa-warn\">À définir</span>") + "</td>" +
        "<td>" + String(rep).replace(".", ",") + " / 1</td></tr>";
    });
    html += "</tbody></table></div>";
    if (s.drawer && s.drawer.kind === "projet") html += projetDrawer(page, s.drawer);
    return html;
  }

  function optionsLignes(page, selected, allowVide, extra) {
    var html = allowVide ? "<option value=\"\">À définir</option>" : "";
    if (extra) html += extra;
    var list = actifLignes(page).slice().sort(function (a, b) {
      var ac = a.codeProfil === "CP" ? 0 : 1, bc = b.codeProfil === "CP" ? 0 : 1;
      return ac - bc || String(a.libelle).localeCompare(String(b.libelle));
    });
    list.forEach(function (l) {
      html += "<option value=\"" + esc(l.cle) + "\"" + (l.cle === selected ? " selected" : "") + ">" +
        esc((l.libelle || l.cle) + " — " + (l.profil || l.codeProfil || "")) + "</option>";
    });
    return html;
  }

  function swatches(current) {
    var palette = ["#1A428A", "#0F6E56", "#8A4B08", "#6B3FA0", "#1D6F8A", "#8B194D", "#006FB7", "#B23A48", "#3D6B2F", "#5A4FCF"];
    var cur = current || palette[0];
    var buttons = palette.map(function (hex) {
      var on = hex.toLowerCase() === String(cur).toLowerCase();
      return "<button type=\"button\" data-act=\"pick-color\" data-hex=\"" + hex + "\" aria-label=\"" + hex + "\" style=\"width:28px;height:28px;border-radius:50%;border:2px solid " + (on ? "#122F62" : "transparent") + ";background:" + hex + ";padding:0;cursor:pointer\"></button>";
    }).join("");
    return "<label>Couleur sur le plan de charge<input type=\"hidden\" data-form=\"couleur\" value=\"" + esc(cur) + "\"/>" +
      "<span style=\"display:flex;flex-wrap:wrap;gap:8px;margin-top:8px\">" + buttons + "</span></label>";
  }

  function projetDrawer(page, d) {
    var e = d.data;
    var ports = (e.porteurs || "");
    var body = (page.canAdmin ? "<label>Identifiant<input data-form=\"code\" value=\"" + esc(e.code || "") + "\"/></label>" : "") +
      "<label>Libellé<input data-form=\"libelle\" value=\"" + esc(e.libelle || "") + "\"/></label>" +
      "<label>LC / NC<input data-form=\"lcNc\" value=\"" + esc(e.lcNc || "") + "\"/></label>" +
      "<label>Statut catalogue<input data-form=\"statutCatalogue\" value=\"" + esc(e.statutCatalogue || "") + "\"/></label>" +
      swatches(e.couleur) +
      "<label>Actif<select data-form=\"actif\"><option value=\"true\"" + (e.actif !== "false" ? " selected" : "") + ">Oui</option><option value=\"false\"" + (e.actif === "false" ? " selected" : "") + ">Non</option></select></label>" +
      "<h4>Responsables</h4>" +
      "<label>Chef de projet<select data-form=\"chefProjet\">" + optionsLignes(page, e.chefProjet || "", true) + "</select></label>" +
      (!e.chefProjet ? "<p class=\"pfa-warn\">Chef de projet à définir.</p>" : "") +
      "<label>Porteurs<textarea data-form=\"porteurs\" rows=\"4\" placeholder=\"codeAgent|Nom;codeAgent|Nom\">" + esc(ports) + "</textarea></label>" +
      "<p class=\"pfa-muted\">Points MVP attribués : " + String(repartition(page, e.code || "")).replace(".", ",") + " / 1</p>";
    return drawer(d.edit ? "Projet" : "Nouveau projet", body, "save-projet");
  }

  function lignesVue(page) {
    var s = st(page);
    var q = (s.q || "").toLowerCase();
    var rows = lignes(page).filter(function (l) {
      if (q && ((l.libelle || "") + " " + l.cle).toLowerCase().indexOf(q) < 0) return false;
      if (s.sansReferent && l.referent) return false;
      if (s.sansRole && l.codeRole) return false;
      return true;
    });
    var html = toolbar("Collaborateurs",
      "<input class=\"pfa-search\" data-field=\"q\" placeholder=\"Rechercher\" value=\"" + esc(s.q || "") + "\"/>" +
      "<button type=\"button\" class=\"pfa-chip" + (s.sansReferent ? " is-on" : "") + "\" data-act=\"filtre-ref\">Sans référent</button>" +
      "<button type=\"button\" class=\"pfa-chip" + (s.sansRole ? " is-on" : "") + "\" data-act=\"filtre-role\">Sans rôle</button>");
    html += "<div class=\"pfa-table-wrap\"><table class=\"pfa-table\"><thead><tr><th>Nom</th><th>Profil</th><th>Référent</th><th>Rôle</th><th>Score MVP</th></tr></thead><tbody>";
    rows.forEach(function (l) {
      var ref = !l.referent ? "<span class=\"pfa-warn\">À définir</span>" : (l.referent === "PARTAGE" ? "<span class=\"pfa-chip is-on\">Partagé</span>" : esc(nom(page, l.referent)));
      var score = l.codeProfil === "DEV" ? String(scoreOf(page, l.cle)).replace(".", ",") : "—";
      html += "<tr data-act=\"open-ligne\" data-cle=\"" + esc(l.cle) + "\">" +
        "<td><strong>" + esc(l.libelle || l.cle) + "</strong>" + (on(l.actif) ? "" : " <span class=\"pfa-muted\">inactif</span>") + "</td>" +
        "<td>" + esc(l.profil || l.codeProfil || "—") + "</td><td>" + ref + "</td><td>" + esc(l.codeRole || "—") + "</td><td>" + score + "</td></tr>";
    });
    html += "</tbody></table></div>";
    if (s.drawer && s.drawer.kind === "ligne") html += ligneDrawer(page, s.drawer);
    return html;
  }

  function ligneDrawer(page, d) {
    var l = d.data;
    var refExtra = "<option value=\"PARTAGE\"" + (l.referent === "PARTAGE" ? " selected" : "") + ">Partagé (plusieurs personnes)</option>";
    var roles = (page.roles || []).map(function (r) {
      return "<option value=\"" + esc(r.code) + "\"" + (r.code === l.codeRole ? " selected" : "") + ">" + esc(r.libelle || r.code) + "</option>";
    }).join("");
    var profils = (page.profils || []).map(function (p) {
      return "<option value=\"" + esc(p.code) + "\"" + (p.code === l.codeProfil ? " selected" : "") + ">" + esc(p.libelle || p.code) + "</option>";
    }).join("");
    var body = "<label>Code agent (AD)<input data-form=\"cleExterne\" value=\"" + esc(l.cleExterne || "") + "\"/></label>" +
      "<label>Profil<select data-form=\"codeProfil\"><option value=\"\">—</option>" + profils + "</select></label>" +
      "<label>Couleur<input data-form=\"couleur\" value=\"" + esc(l.couleur || "") + "\"/></label>" +
      "<label>Ordre<input data-form=\"ordre\" value=\"" + esc(l.ordre || "0") + "\"/></label>" +
      "<label>Actif<select data-form=\"actif\"><option value=\"true\"" + (on(l.actif) ? " selected" : "") + ">Oui</option><option value=\"false\"" + (!on(l.actif) ? " selected" : "") + ">Non</option></select></label>" +
      "<h4>Profil, référent et rôle</h4>" +
      "<label>Référent<select data-form=\"referent\">" + optionsLignes(page, l.referent && l.referent !== "PARTAGE" ? l.referent : "", true, refExtra) + "</select></label>" +
      "<label>Rôle<select data-form=\"codeRole\"><option value=\"\">—</option>" + roles + "</select></label>";
    return drawer(l.libelle || l.cle, body, "save-ligne");
  }

  function rolesVue(page) {
    var s = st(page);
    var droits = ["MODIFIER_AFFECTATION", "COMMENTER_JOUR_SOI", "COMMENTER_JOUR_AUTRUI", "COMMENTER_PROJET", "GERER_REFERENTIEL"];
    var html = toolbar("Rôles et droits", "");
    html += "<div class=\"pfa-cards\">";
    (page.roles || []).forEach(function (r) {
      var ds = (page.roleDroits || []).filter(function (x) { return x.codeRole === r.code; }).map(function (x) { return x.codeDroit; });
      html += "<button type=\"button\" class=\"pfa-card\" data-act=\"open-role\" data-code=\"" + esc(r.code) + "\"><strong>" + esc(r.libelle || r.code) + "</strong><span>" + ds.length + " droit(s)</span></button>";
    });
    html += "</div><div class=\"pfa-table-wrap\"><table class=\"pfa-table\"><thead><tr><th>Droit</th>";
    (page.roles || []).forEach(function (r) { html += "<th>" + esc(r.code) + "</th>"; });
    html += "</tr></thead><tbody>";
    droits.forEach(function (droit) {
      html += "<tr><td>" + esc(droit) + "</td>";
      (page.roles || []).forEach(function (r) {
        var yes = (page.roleDroits || []).some(function (x) { return x.codeRole === r.code && x.codeDroit === droit; });
        html += "<td>" + (yes ? "●" : "·") + "</td>";
      });
      html += "</tr>";
    });
    html += "</tbody></table></div>";
    if (s.drawer && s.drawer.kind === "role") {
      var r = s.drawer.data;
      var body = "<label>Code<input data-form=\"code\" value=\"" + esc(r.code) + "\" readonly/></label>" +
        "<label>Libellé<input data-form=\"libelle\" value=\"" + esc(r.libelle || "") + "\"/></label><div class=\"pfa-checks\">";
      droits.forEach(function (droit) {
        var yes = (r.droits || "").split(",").indexOf(droit) >= 0;
        body += "<label><input type=\"checkbox\" data-droit=\"" + droit + "\"" + (yes ? " checked" : "") + "/> " + esc(droit) + "</label>";
      });
      body += "</div>";
      html += drawer("Rôle " + (r.libelle || r.code), body, "save-role");
    }
    return html;
  }

  function suiviVue(page) {
    var etapes = page.etapes || [];
    function etape(code) {
      var i;
      for (i = 0; i < etapes.length; i++) if (etapes[i].code === code) return etapes[i];
      return null;
    }
    var html = toolbar("Suivi des projets", "<span class=\"pfa-muted\">Cliquez une case pour faire avancer le statut, ou saisir un texte.</span>");
    html += "<div class=\"pfa-table-wrap\"><table class=\"pfa-matrix\"><thead><tr><th>Projet</th>";
    GROUPES.forEach(function (g) {
      g.codes.forEach(function (c) {
        var e = etape(c);
        if (e) html += "<th title=\"" + esc(g.titre) + "\">" + esc(e.libelle) + "</th>";
      });
    });
    html += "</tr></thead><tbody>";
    elements(page).forEach(function (el) {
      html += "<tr><th>" + esc(el.libelle) + "</th>";
      GROUPES.forEach(function (g) {
        g.codes.forEach(function (c) {
          var e = etape(c);
          if (!e) return;
          var v = suiviVal(page, el.code, c);
          html += "<td><button type=\"button\" class=\"pfa-cell\" data-act=\"suivi\" data-el=\"" + esc(el.code) + "\" data-et=\"" + esc(c) + "\" data-nature=\"" + esc(e.nature) + "\">" + esc(v || "—") + "</button></td>";
        });
      });
      html += "</tr>";
    });
    html += "</tbody></table></div>";
    return html;
  }

  function mvpVue(page) {
    var s = st(page);
    var vue = s.mvpVue || "classement";
    var people = devs(page);
    var html = toolbar("MVP Développement",
      "<button type=\"button\" class=\"pfa-chip" + (vue === "classement" ? " is-on" : "") + "\" data-act=\"mvp-classement\">Classement</button>" +
      "<button type=\"button\" class=\"pfa-chip" + (vue === "saisie" ? " is-on" : "") + "\" data-act=\"mvp-saisie\">Saisie des points</button>");
    if (vue === "classement") {
      var rows = people.map(function (l) {
        return { l: l, score: scoreOf(page, l.cle), n: (page.coefficients || []).filter(function (c) { return c.cleLigne === l.cle && num(c.coefficient) > 0; }).length };
      }).sort(function (a, b) { return b.score - a.score || b.n - a.n || String(a.l.libelle).localeCompare(String(b.l.libelle)); });
      var rank = 0, prev = null;
      html += "<ol class=\"pfa-rank\">";
      rows.forEach(function (r, i) {
        if (prev === null || r.score !== prev) rank = i + 1;
        prev = r.score;
        html += "<li><span class=\"pfa-rank__n\">" + rank + "</span><strong>" + esc(r.l.libelle || r.l.cle) + "</strong><span>" + String(r.score).replace(".", ",") + " · " + r.n + " projet(s)</span></li>";
      });
      html += "</ol>";
    } else {
      var els = elements(page).filter(function (e) { return e.code !== "FORMATION" && e.code !== "ABSENCEPREV"; });
      html += "<div class=\"pfa-table-wrap\"><table class=\"pfa-matrix\"><thead><tr><th>Développeur</th>";
      els.forEach(function (e) { html += "<th>" + esc(e.libelle) + "</th>"; });
      html += "<th>Score</th></tr></thead><tbody>";
      people.forEach(function (l) {
        html += "<tr><th>" + esc(l.libelle || l.cle) + "</th>";
        els.forEach(function (e) {
          var v = coef(page, l.cle, e.code);
          html += "<td><button type=\"button\" class=\"pfa-cell\" data-act=\"mvp\" data-cle=\"" + esc(l.cle) + "\" data-el=\"" + esc(e.code) + "\">" + (v ? String(v).replace(".", ",") : "·") + "</button></td>";
        });
        html += "<td>" + String(scoreOf(page, l.cle)).replace(".", ",") + "</td></tr>";
      });
      html += "</tbody><tfoot><tr><th>Total attribué</th>";
      els.forEach(function (e) {
        var t = repartition(page, e.code);
        var cls = !t ? "" : (Math.abs(t - 1) < 0.001 ? " is-ok" : " is-bad");
        html += "<td class=\"" + cls + "\">" + String(t).replace(".", ",") + "</td>";
      });
      html += "<td></td></tr></tfoot></table></div>";
      html += "<p class=\"pfa-muted\">Valeurs rapides : 0, 0,25, 0,5, 1, ou le reste pour atteindre 1. Une répartition complète vaut 1.</p>";
    }
    if (s.popover) html += s.popover;
    return html;
  }

  function viewHtml(page) {
    if (!page.canAdmin) return "<p class=\"pfa-muted\">Cette vue est réservée aux gestionnaires du référentiel.</p>";
    if (page.view === "projets") return projets(page);
    if (page.view === "lignes") return lignesVue(page);
    if (page.view === "roles") return rolesVue(page);
    if (page.view === "suivi") return suiviVue(page);
    if (page.view === "mvp") return mvpVue(page);
    return "";
  }

  function readForm(root) {
    var data = {};
    root.querySelectorAll("[data-form]").forEach(function (el) { data[el.getAttribute("data-form")] = el.value; });
    var droits = [];
    root.querySelectorAll("[data-droit]").forEach(function (el) { if (el.checked) droits.push(el.getAttribute("data-droit")); });
    if (droits.length || root.querySelector("[data-droit]")) data.droits = droits.join(",");
    return data;
  }

  function trustHtml(page, html) {
    var s = null;
    try {
      s = (page.router && page.router.sanitizer)
        || (page.routerProvider && page.routerProvider.sanitizer)
        || page.sanitizer;
    } catch (e) { s = null; }
    if (s && typeof s.bypassSecurityTrustHtml === "function") return s.bypassSecurityTrustHtml(html);
    return html;
  }

  function paint(page) {
    if (!page.view || page.view === "grille") {
      page.pfaHtml = trustHtml(page, "");
      return;
    }
    page.pfaHtml = trustHtml(page, "<div class=\"pfa-view\">" + (page.message ? "<p class=\"pfa-msg\">" + esc(page.message) + "</p>" : "") + viewHtml(page) + "</div>");
  }


  function nativeEvent(event) {
    if (!event) return event;
    if (event.root && event.root.out) return event.root.out;
    if (event.event && event.event.target) return event.event;
    return event;
  }

  function onClick(page, event) {
    event = nativeEvent(event);
    if (!event || event.__pfaHandled) return;
    var node = event.target;
    if (node && node.nodeType === 3) node = node.parentElement;
    if ((!node || !node.closest) && event.composedPath) {
      var path = event.composedPath();
      node = path && path[0];
      if (node && node.nodeType === 3) node = node.parentElement;
    }
    if (!node || !node.closest) return;
    var nav = node.closest("[data-nav]");
    if (nav) {
      event.__pfaHandled = true;
      var preset = nav.getAttribute("data-preset");
      var s0 = st(page);
      s0.manque = preset === "chef" ? "chef" : preset === "porteur" ? "porteur" : "";
      s0.sansReferent = preset === "ref";
      s0.sansRole = preset === "role";
      s0.drawer = null;
      page.ouvrir(nav.getAttribute("data-nav"));
      return;
    }
    var el = node.closest("[data-act]");
    if (!el) return;
    event.__pfaHandled = true;
    var act = el.getAttribute("data-act");
    var s = st(page);
    if (act === "collapse") { s.collapsed = !s.collapsed; paint(page); return; }
    if (act === "feries") { page.chargerFeries(); return; }
    if (act === "filtre-chef") { s.manque = s.manque === "chef" ? "" : "chef"; paint(page); return; }
    if (act === "filtre-porteur") { s.manque = s.manque === "porteur" ? "" : "porteur"; paint(page); return; }
    if (act === "filtre-ref") { s.sansReferent = !s.sansReferent; paint(page); return; }
    if (act === "filtre-role") { s.sansRole = !s.sansRole; paint(page); return; }
    if (act === "pick-color") {
      var hex = el.getAttribute("data-hex") || "";
      var input = document.querySelector("[data-form='couleur']");
      if (input) input.value = hex;
      if (s.drawer && s.drawer.data) s.drawer.data.couleur = hex;
      var host = el.parentElement;
      if (host) host.querySelectorAll("[data-act='pick-color']").forEach(function (b) {
        b.style.borderColor = b.getAttribute("data-hex") === hex ? "#122F62" : "transparent";
      });
      return;
    }
    if (act === "close-drawer") { s.drawer = null; s.popover = ""; paint(page); return; }
    if (act === "tab-projets") { s.projetTab = "projets"; paint(page); return; }
    if (act === "tab-natures") { s.projetTab = "natures"; paint(page); return; }
    if (act === "nature-inactifs") { s.natureInactifs = !s.natureInactifs; paint(page); return; }
    if (act === "new-nature") {
      s.projetTab = "natures";
      s.drawer = { kind: "nature", data: { code: "", libelle: "", aide: "", couleur: "#8B194D", actif: "true" } };
      paint(page); return;
    }
    if (act === "open-nature") {
      var nc = el.getAttribute("data-code");
      var foundN = naturesOf(page).filter(function (t) { return t.code === nc; })[0];
      if (!foundN) return;
      s.drawer = { kind: "nature", data: { code: foundN.code, libelle: foundN.libelle, aide: foundN.aide || "", couleur: foundN.couleurFond || "#8B194D", actif: on(foundN.actif == null ? "true" : foundN.actif) ? "true" : "false" } };
      paint(page); return;
    }
    if (act === "save-nature") {
      var nf = readForm(document.getElementById("pfa-view") || document.body);
      if (!nf.code) nf.code = "NATURE_" + Date.now().toString(36).toUpperCase();
      page.sauverNature(nf);
      s.drawer = null;
      return;
    }
    if (act === "delete-nature") {
      var delCode = el.getAttribute("data-code");
      if (!window.confirm("Supprimer cette nature ? Les journées déjà saisies l'empêchent d'être retirée.")) return;
      page.supprimerNature(delCode);
      s.drawer = null;
      return;
    }
    if (act === "new-projet") {
      s.drawer = { kind: "projet", edit: false, data: { code: "", libelle: "", lcNc: "LC", statutCatalogue: "", couleur: "", actif: "true", chefProjet: "", porteurs: "" } };
      paint(page); return;
    }
    if (act === "open-projet") {
      var code = el.getAttribute("data-code");
      var found = null, i;
      for (i = 0; i < (page.elements || []).length; i++) if (page.elements[i].code === code) found = page.elements[i];
      if (!found) return;
      var ports = porteursOf(page, code).map(function (p) { return (p.codeAgent || "") + "|" + (p.libelle || ""); }).join(";");
      s.drawer = { kind: "projet", edit: true, data: { code: found.code, libelle: found.libelle, lcNc: found.lcNc, statutCatalogue: found.statutCatalogue, couleur: found.couleur, actif: on(found.actif) ? "true" : "false", chefProjet: found.chefProjet || "", porteurs: ports } };
      paint(page); return;
    }
    if (act === "save-projet") {
      var form = readForm(document.getElementById("pfa-view") || document.body);
      page.boForm = form;
      page.sauverElement();
      page.sauverPorteurs();
      s.drawer = null;
      return;
    }
    if (act === "open-ligne") {
      var cle = el.getAttribute("data-cle");
      var l = ligne(page, cle);
      if (!l) return;
      s.drawer = { kind: "ligne", data: { cle: l.cle, cleExterne: l.cleExterne, codeProfil: l.codeProfil, couleur: l.couleur, ordre: l.ordre, actif: on(l.actif) ? "true" : "false", referent: l.referent || "", codeRole: l.codeRole || "", libelle: l.libelle } };
      paint(page); return;
    }
    if (act === "save-ligne") {
      var lf = readForm(document.getElementById("pfa-view") || document.body);
      if (!lf.cle) lf.cle = (s.drawer && s.drawer.data && s.drawer.data.cle) || lf.cleExterne || "";
      page.boForm = lf;
      page.boForm.cleLigne = lf.cle;
      page.sauverLigne();
      s.drawer = null;
      return;
    }
    if (act === "open-role") {
      var rc = el.getAttribute("data-code");
      var role = (page.roles || []).filter(function (r) { return r.code === rc; })[0];
      if (!role) return;
      var ds = (page.roleDroits || []).filter(function (x) { return x.codeRole === rc; }).map(function (x) { return x.codeDroit; });
      s.drawer = { kind: "role", data: { code: role.code, libelle: role.libelle, droits: ds.join(",") } };
      paint(page); return;
    }
    if (act === "save-role") {
      var rf = readForm(document.getElementById("pfa-view") || document.body);
      var mine = "";
      try {
        var selfLine = ligne(page, page.cleActeur);
        mine = selfLine ? selfLine.codeRole : "";
      } catch (e2) {}
      if (mine && mine === rf.code && rf.droits.indexOf("GERER_REFERENTIEL") < 0) {
        if (!window.confirm("Vous retirez GERER_REFERENTIEL de votre rôle. Continuer ?")) return;
      }
      page.boForm = rf;
      page.sauverRole();
      s.drawer = null;
      return;
    }
    if (act === "suivi") {
      var nature = el.getAttribute("data-nature");
      var cur = (el.textContent || "").trim();
      if (cur === "—") cur = "";
      var next = cur;
      if (nature === "texte") {
        next = window.prompt("Valeur", cur) || "";
      } else {
        var idx = STATUTS.indexOf(cur);
        next = STATUTS[(idx + 1) % STATUTS.length];
      }
      page.boForm = { codeElement: el.getAttribute("data-el"), codeEtape: el.getAttribute("data-et"), valeur: next };
      page.sauverSuivi();
      return;
    }
    if (act === "mvp-classement" || act === "mvp-saisie") { s.mvpVue = act === "mvp-saisie" ? "saisie" : "classement"; s.popover = ""; paint(page); return; }
    if (act === "mvp") {
      var cleM = el.getAttribute("data-cle"), elM = el.getAttribute("data-el");
      var current = coef(page, cleM, elM);
      var reste = Math.round((1 - (repartition(page, elM) - current)) * 100) / 100;
      if (reste < 0) reste = 0;
      s.popover = "<div class=\"pfa-pop\"><p>Coefficient</p>" +
        [0, 0.25, 0.5, 1].map(function (v) { return "<button type=\"button\" data-act=\"mvp-set\" data-cle=\"" + esc(cleM) + "\" data-el=\"" + esc(elM) + "\" data-v=\"" + v + "\">" + String(v).replace(".", ",") + "</button>"; }).join("") +
        "<button type=\"button\" data-act=\"mvp-set\" data-cle=\"" + esc(cleM) + "\" data-el=\"" + esc(elM) + "\" data-v=\"" + reste + "\">Reste " + String(reste).replace(".", ",") + "</button></div>";
      paint(page); return;
    }
    if (act === "mvp-set") {
      page.boForm = { cleLigne: el.getAttribute("data-cle"), codeElement: el.getAttribute("data-el"), coefficient: el.getAttribute("data-v") };
      s.popover = "";
      page.sauverMvp();
      return;
    }
  }


  function boot(page) {
    if (!document.getElementById("pfa-admin-css")) {
      var link = document.createElement("link");
      link.id = "pfa-admin-css";
      link.rel = "stylesheet";
      link.href = "http://localhost:18080/convertigo/projects/PortefeuilleLCNC_fe/DisplayObjects/mobile/assets/css/pfa-admin.css?v=admin2";
      document.head.appendChild(link);
    }
    if (page.__pfa) return;
    page.__pfa = true;
    document.addEventListener("click", function (ev) {
      var host = document.getElementById("pfa-view");
      if (host && ev.target && host.contains(ev.target)) onClick(page, ev);
    });
    document.addEventListener("input", function (event) {
      var t = event.target;
      if (!t || !t.getAttribute) return;
      if (t.getAttribute("data-field") !== "q" || !t.closest || !t.closest("#pfa-view")) return;
      st(page).q = t.value;
      clearTimeout(page.__pfaQ);
      page.__pfaQ = setTimeout(function () {
        var live = document.querySelector("#pfa-view [data-field=\"q\"]");
        var pos = live && live.selectionStart != null ? live.selectionStart : String(st(page).q || "").length;
        paint(page);
        try { if (page.ref) page.ref.detectChanges(); } catch (e) {}
        var i = document.querySelector("#pfa-view [data-field=\"q\"]");
        if (i) { i.focus(); try { i.setSelectionRange(pos, pos); } catch (e2) {} }
      }, 120);
    });
    document.addEventListener("keydown", function (event) {
      if (event.key !== "Escape") return;
      var s = st(page);
      if (s.drawer || s.popover) {
        s.drawer = null; s.popover = "";
        paint(page);
        try { if (page.ref) page.ref.detectChanges(); } catch (e) {}
      }
    });
    paint(page);
    try { if (page.ref) page.ref.detectChanges(); } catch (e) {}
  }

  var root = typeof window !== "undefined" ? window : globalThis;
  root.PfaAdmin = { boot: boot, paint: paint, click: onClick };
})();
