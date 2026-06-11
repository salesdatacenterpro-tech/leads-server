import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, TrendingUp, TrendingDown, Minus, Package, Download, Search, Zap, AlertCircle, CheckCircle2, X, RefreshCw, Filter, BarChart3, Eye, Globe, ExternalLink } from 'lucide-react';

const CATEGORIES = [
  'Smartphones', 'Ordinateurs', 'Tablettes', 'TV / Audio', 'Consoles & Jeux',
  'Accessoires Telephonie', 'Accessoires Informatique', 'PEM (Petit Electromenager)',
  'GEM (Gros Electromenager)', 'Objets connectes', 'Photo / Video', 'Autre'
];

// Generateurs d'URLs de recherche. EAN prioritaire (plus precis), sinon reference texte.
// Chaque site a des tags pour le filtrage intelligent par categorie produit.
const SEARCH_URL = {
  // --- FR GENERALISTES ---
  'Amazon.fr':       { url: (q) => `https://www.amazon.fr/s?k=${q}`,                                  market: 'FR', tags: ['all'] },
  'Cdiscount':       { url: (q) => `https://www.cdiscount.com/search/10/${q}.html`,                   market: 'FR', tags: ['all'] },
  'Fnac':            { url: (q) => `https://www.fnac.com/SearchResult/ResultList.aspx?Search=${q}`,   market: 'FR', tags: ['tech', 'multimedia', 'gaming', 'photo'] },
  'Darty':           { url: (q) => `https://www.darty.com/nav/recherche?text=${q}`,                   market: 'FR', tags: ['tech', 'tv_audio', 'pem', 'gem', 'telephonie'] },
  'Boulanger':       { url: (q) => `https://www.boulanger.com/resultats?tr=${q}`,                     market: 'FR', tags: ['tech', 'tv_audio', 'pem', 'gem', 'telephonie', 'informatique'] },
  'Rue du Commerce': { url: (q) => `https://www.rueducommerce.fr/recherche/${q}`,                     market: 'FR', tags: ['tech', 'informatique'] },
  'Leclerc':         { url: (q) => `https://www.e.leclerc/recherche?q=${q}`,                          market: 'FR', tags: ['all'] },
  'Auchan':          { url: (q) => `https://www.auchan.fr/recherche?text=${q}`,                       market: 'FR', tags: ['all', 'pem', 'gem'] },
  'Carrefour':       { url: (q) => `https://www.carrefour.fr/s?q=${q}`,                               market: 'FR', tags: ['all', 'pem', 'gem'] },
  'Rakuten FR':      { url: (q) => `https://fr.shopping.rakuten.com/s/${q}`,                          market: 'FR', tags: ['all', 'marketplace'] },
  // --- FR SPECIALISTES ---
  'LDLC':            { url: (q) => `https://www.ldlc.com/recherche/${q}/`,                            market: 'FR', tags: ['informatique', 'tech', 'gaming'] },
  'Materiel.net':    { url: (q) => `https://www.materiel.net/recherche/?q=${q}`,                      market: 'FR', tags: ['informatique', 'gaming'] },
  'TopAchat':        { url: (q) => `https://www.topachat.com/pages/rechercher_produit.php?key=${q}`,  market: 'FR', tags: ['informatique', 'gaming'] },
  'GrosBill':        { url: (q) => `https://www.grosbill.com/recherche?search_query=${q}`,            market: 'FR', tags: ['informatique'] },
  'Micromania':      { url: (q) => `https://www.micromania.fr/on/demandware.store/Sites-MMFR-Site/fr_FR/Search-Show?q=${q}`, market: 'FR', tags: ['gaming'] },
  'Backmarket FR':   { url: (q) => `https://www.backmarket.fr/fr-fr/search?q=${q}`,                   market: 'FR', tags: ['telephonie', 'informatique', 'reconditionne'] },
  'ManoMano':        { url: (q) => `https://www.manomano.fr/recherche?q=${q}`,                        market: 'FR', tags: ['gem', 'pem', 'bricolage'] },
  'But':             { url: (q) => `https://www.but.fr/recherche/${q}.html`,                          market: 'FR', tags: ['gem', 'tv_audio'] },
  'Conforama':       { url: (q) => `https://www.conforama.fr/recherche?searchterm=${q}`,              market: 'FR', tags: ['gem', 'tv_audio'] },
  'Digit-Photo':     { url: (q) => `https://www.digit-photo.com/Recherche.php?searchIn=all&searchTerm=${q}`, market: 'FR', tags: ['photo'] },
  'Miss Numerique':  { url: (q) => `https://www.missnumerique.com/catalogsearch/result/?q=${q}`,      market: 'FR', tags: ['photo'] },
  // --- FR COMPARATEURS ---
  'Google Shopping FR': { url: (q) => `https://www.google.fr/search?tbm=shop&q=${q}`,                 market: 'FR', tags: ['all', 'comparator'] },
  'Idealo FR':       { url: (q) => `https://www.idealo.fr/cat/search.html?q=${q}`,                   market: 'FR', tags: ['all', 'comparator'] },
  'LeDenicheur':     { url: (q) => `https://www.ledenicheur.fr/search?search=${q}`,                   market: 'FR', tags: ['all', 'comparator'] },

  // --- EU ---
  'Amazon.de':   { url: (q) => `https://www.amazon.de/s?k=${q}`,                                      market: 'EU', tags: ['all'] },
  'Amazon.it':   { url: (q) => `https://www.amazon.it/s?k=${q}`,                                      market: 'EU', tags: ['all'] },
  'Amazon.es':   { url: (q) => `https://www.amazon.es/s?k=${q}`,                                      market: 'EU', tags: ['all'] },
  'Amazon.co.uk':{ url: (q) => `https://www.amazon.co.uk/s?k=${q}`,                                   market: 'EU', tags: ['all'] },
  'Amazon.nl':   { url: (q) => `https://www.amazon.nl/s?k=${q}`,                                      market: 'EU', tags: ['all'] },
  'MediaMarkt':  { url: (q) => `https://www.mediamarkt.de/de/search.html?query=${q}`,                 market: 'EU', tags: ['tech', 'pem', 'gem', 'telephonie'] },
  'Otto':        { url: (q) => `https://www.otto.de/suche/${q}/`,                                     market: 'EU', tags: ['all'] },
  'Saturn':      { url: (q) => `https://www.saturn.de/de/search.html?query=${q}`,                     market: 'EU', tags: ['tech', 'pem', 'gem'] },
  'Alternate':   { url: (q) => `https://www.alternate.de/listing.xhtml?q=${q}`,                       market: 'EU', tags: ['informatique', 'gaming'] },
  'Backmarket EU':{ url: (q) => `https://www.backmarket.de/de-de/search?q=${q}`,                      market: 'EU', tags: ['telephonie', 'reconditionne'] },
  'Currys UK':   { url: (q) => `https://www.currys.co.uk/search?q=${q}`,                              market: 'EU', tags: ['tech', 'pem', 'gem'] },
  'Argos UK':    { url: (q) => `https://www.argos.co.uk/search/${q}/`,                                market: 'EU', tags: ['all'] },
  'Idealo DE':   { url: (q) => `https://www.idealo.de/preisvergleich/MainSearchProductCategory.html?q=${q}`, market: 'EU', tags: ['all', 'comparator'] },
  'Google Shopping DE': { url: (q) => `https://www.google.de/search?tbm=shop&q=${q}`,                 market: 'EU', tags: ['all', 'comparator'] },

  // --- US ---
  'Amazon.com':  { url: (q) => `https://www.amazon.com/s?k=${q}`,                                     market: 'US', tags: ['all'] },
  'BestBuy':     { url: (q) => `https://www.bestbuy.com/site/searchpage.jsp?st=${q}`,                 market: 'US', tags: ['tech', 'tv_audio', 'gaming', 'telephonie'] },
  'Walmart':     { url: (q) => `https://www.walmart.com/search?q=${q}`,                               market: 'US', tags: ['all'] },
  'Target':      { url: (q) => `https://www.target.com/s?searchTerm=${q}`,                            market: 'US', tags: ['all'] },
  'Costco':      { url: (q) => `https://www.costco.com/CatalogSearch?keyword=${q}`,                   market: 'US', tags: ['all', 'gem'] },
  'B&H':         { url: (q) => `https://www.bhphotovideo.com/c/search?Ntt=${q}`,                      market: 'US', tags: ['photo', 'tech', 'informatique'] },
  'Newegg':      { url: (q) => `https://www.newegg.com/p/pl?d=${q}`,                                  market: 'US', tags: ['informatique', 'gaming'] },
  'Adorama':     { url: (q) => `https://www.adorama.com/l/?searchinfo=${q}`,                          market: 'US', tags: ['photo', 'tech'] },
  'GameStop':    { url: (q) => `https://www.gamestop.com/search/?q=${q}`,                             market: 'US', tags: ['gaming'] },
  'HomeDepot':   { url: (q) => `https://www.homedepot.com/s/${q}`,                                    market: 'US', tags: ['gem', 'pem'] },
  'Lowes':       { url: (q) => `https://www.lowes.com/search?searchTerm=${q}`,                        market: 'US', tags: ['gem', 'pem'] },
  'eBay US':     { url: (q) => `https://www.ebay.com/sch/i.html?_nkw=${q}`,                           market: 'US', tags: ['all', 'marketplace'] },
  'Google Shopping US': { url: (q) => `https://www.google.com/search?tbm=shop&q=${q}`,                market: 'US', tags: ['all', 'comparator'] },
};

// Mapping des categories produit vers les tags pour filtrer les sites pertinents.
const CATEGORY_TAGS = {
  'Smartphones':                ['telephonie', 'tech', 'all'],
  'Ordinateurs':                ['informatique', 'tech', 'all'],
  'Tablettes':                  ['informatique', 'tech', 'all'],
  'TV / Audio':                 ['tv_audio', 'tech', 'all'],
  'Consoles & Jeux':            ['gaming', 'tech', 'all'],
  'Accessoires Telephonie':     ['telephonie', 'tech', 'all'],
  'Accessoires Informatique':   ['informatique', 'tech', 'all'],
  'PEM (Petit Electromenager)': ['pem', 'all'],
  'GEM (Gros Electromenager)':  ['gem', 'all'],
  'Objets connectes':           ['tech', 'all'],
  'Photo / Video':              ['photo', 'tech', 'all'],
  'Autre':                      ['all'],
};

const MARKETS = {
  FR: { label: 'France', flag: '🇫🇷' },
  EU: { label: 'Europe', flag: '🇪🇺' },
  US: { label: 'USA',    flag: '🇺🇸' },
};

// Retourne les sites pertinents pour un marche donne + categorie + mode.
// mode: 'smart' = filtre par categorie. 'all' = tous les sites du marche.
function getSitesFor(market, category, mode = 'smart') {
  const catTags = CATEGORY_TAGS[category] || ['all'];
  return Object.entries(SEARCH_URL)
    .filter(([_, config]) => config.market === market)
    .filter(([_, config]) => mode === 'all' ? true : config.tags.some(t => catTags.includes(t)))
    .map(([name]) => name);
}

// Construit l'URL de recherche pour un site donne. Privilegie l'EAN si present.
function buildSearchUrl(site, offer) {
  const config = SEARCH_URL[site];
  if (!config) return null;
  const query = (offer.ean && offer.ean.trim()) ? offer.ean.trim() : offer.reference;
  return config.url(encodeURIComponent(query));
}

// Ouvre toutes les URLs des sites fournis dans des onglets.
function openSitesList(sites, offer) {
  sites.forEach((site, i) => {
    const url = buildSearchUrl(site, offer);
    if (url) {
      // Petit decalage pour eviter le blocage multi-popups
      setTimeout(() => window.open(url, '_blank', 'noopener,noreferrer'), i * 80);
    }
  });
}

// Ouvre les sites pertinents pour le marche de l'offre (mode smart par defaut).
function openAllSites(offer, market, mode = 'smart') {
  const targetMarket = market || offer.market;
  const sites = getSitesFor(targetMarket, offer.category, mode);
  openSitesList(sites, offer);
}

const STORAGE_KEY = 'supplier-offers-v1';

// ---------- Helpers ----------
const fmtEUR = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(n || 0);
const fmtPct = (n) => (n == null || isNaN(n)) ? '—' : `${n > 0 ? '+' : ''}${n.toFixed(1)}%`;
const uid = () => Math.random().toString(36).slice(2, 10);

const scoreColor = (s) => {
  if (s == null) return 'var(--muted)';
  if (s >= 75) return 'var(--signal)';
  if (s >= 50) return 'var(--watch)';
  if (s >= 25) return 'var(--warn)';
  return 'var(--alert)';
};

const scoreLabel = (s) => {
  if (s == null) return '—';
  if (s >= 75) return 'EXCELLENT';
  if (s >= 50) return 'BON';
  if (s >= 25) return 'MOYEN';
  return 'FAIBLE';
};

// ---------- Market Analysis via Claude API ----------
async function analyzeOffer(offer) {
  const prompt = `Tu es un expert en sourcing et revente de produits high-tech/electromenager pour le marche ${offer.market}.
Analyse cette offre fournisseur et estime les prix marche actuels.

OFFRE:
- Reference/Produit: ${offer.reference}
- EAN: ${offer.ean || 'non fourni'}
- Description: ${offer.description || 'non fournie'}
- Categorie: ${offer.category}
- Quantite proposee: ${offer.quantity} unites
- Prix unitaire d'achat (HT): ${offer.price} EUR
- Marche cible: ${offer.market}

MISSION:
En te basant sur ta connaissance des prix de marche pour ce type de produit sur le marche ${offer.market} (Amazon, Cdiscount, Fnac, Darty, Boulanger, MediaMarkt, BestBuy, etc.), estime:

Reponds UNIQUEMENT avec un JSON valide (pas de markdown, pas de texte hors JSON), structure:
{
  "marketPrice": { "min": number, "avg": number, "max": number },
  "topCompetitors": [ { "name": "Amazon.fr", "estimatedPrice": number, "availability": "En stock" | "Stock limite" | "Rupture" | "Inconnu" } ],
  "marginB2C": { "pct": number, "eur": number, "verdict": "Excellente" | "Bonne" | "Moyenne" | "Faible" | "Negative" },
  "marginB2B": { "pct": number, "eur": number, "verdict": "Excellente" | "Bonne" | "Moyenne" | "Faible" | "Negative" },
  "rotation": { "level": "Tres forte" | "Forte" | "Moyenne" | "Faible", "score": number, "comment": "courte phrase" },
  "demand": { "trend": "En hausse" | "Stable" | "En baisse", "score": number },
  "competitorStock": { "level": "Abondant" | "Normal" | "Tendu" | "Rupture", "score": number },
  "b2bPotential": { "score": number, "verdict": "string courte" },
  "b2cPotential": { "score": number, "verdict": "string courte" },
  "globalScore": number,
  "recommendation": "ACHETER" | "NEGOCIER" | "PASSER",
  "keyInsights": ["insight 1", "insight 2", "insight 3"],
  "risks": ["risque 1", "risque 2"],
  "confidence": "Haute" | "Moyenne" | "Basse"
}

Les scores sont sur 100. La marge B2C suppose revente prix marche moyen. La marge B2B suppose revente a -15 a -25% du prix marche. Sois realiste et precis, si le produit est inconnu ou la reference trop vague, mets confidence "Basse" et explique dans keyInsights.`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }],
    })
  });

  if (!response.ok) throw new Error(`API error: ${response.status}`);
  const data = await response.json();
  const text = data.content.filter(b => b.type === 'text').map(b => b.text).join('').trim();
  const clean = text.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/```\s*$/, '').trim();
  return JSON.parse(clean);
}

// ---------- Main App ----------
export default function App() {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [analyzing, setAnalyzing] = useState({});
  const [filterMarket, setFilterMarket] = useState('ALL');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [filterRecommendation, setFilterRecommendation] = useState('ALL');
  const [search, setSearch] = useState('');

  // Load from storage
  useEffect(() => {
    (async () => {
      try {
        const result = await window.storage.get(STORAGE_KEY);
        if (result?.value) setOffers(JSON.parse(result.value));
      } catch (e) { /* no data yet */ }
      setLoading(false);
    })();
  }, []);

  // Save to storage
  const persist = async (next) => {
    setOffers(next);
    try {
      await window.storage.set(STORAGE_KEY, JSON.stringify(next));
    } catch (e) { console.error('Save failed', e); }
  };

  const addOrUpdateOffer = async (data) => {
    if (editingId) {
      const next = offers.map(o => o.id === editingId ? { ...o, ...data, analysis: null } : o);
      await persist(next);
      setEditingId(null);
    } else {
      const offer = { id: uid(), createdAt: Date.now(), analysis: null, ...data };
      await persist([offer, ...offers]);
    }
    setShowForm(false);
  };

  const deleteOffer = async (id) => {
    await persist(offers.filter(o => o.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const runAnalysis = async (id) => {
    const offer = offers.find(o => o.id === id);
    if (!offer) return;
    setAnalyzing(prev => ({ ...prev, [id]: true }));
    try {
      const analysis = await analyzeOffer(offer);
      const next = offers.map(o => o.id === id ? { ...o, analysis, analyzedAt: Date.now() } : o);
      await persist(next);
    } catch (e) {
      alert(`Analyse impossible: ${e.message}`);
    } finally {
      setAnalyzing(prev => ({ ...prev, [id]: false }));
    }
  };

  const runAllAnalyses = async () => {
    const toAnalyze = offers.filter(o => !o.analysis).map(o => o.id);
    for (const id of toAnalyze) {
      await runAnalysis(id);
    }
  };

  const exportCSV = () => {
    const header = ['reference','ean','description','category','market','quantity','price_unit','total_cost','market_min','market_avg','market_max','margin_b2c_pct','margin_b2b_pct','global_score','recommendation'];
    const rows = offers.map(o => [
      o.reference, o.ean || '', o.description || '', o.category, o.market,
      o.quantity, o.price, (o.quantity * o.price).toFixed(2),
      o.analysis?.marketPrice?.min ?? '',
      o.analysis?.marketPrice?.avg ?? '',
      o.analysis?.marketPrice?.max ?? '',
      o.analysis?.marginB2C?.pct ?? '',
      o.analysis?.marginB2B?.pct ?? '',
      o.analysis?.globalScore ?? '',
      o.analysis?.recommendation ?? '',
    ]);
    const csv = [header, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `offres-${new Date().toISOString().slice(0,10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = useMemo(() => {
    return offers.filter(o => {
      if (filterMarket !== 'ALL' && o.market !== filterMarket) return false;
      if (filterCategory !== 'ALL' && o.category !== filterCategory) return false;
      if (filterRecommendation !== 'ALL' && o.analysis?.recommendation !== filterRecommendation) return false;
      if (search) {
        const s = search.toLowerCase();
        if (!o.reference.toLowerCase().includes(s) && !(o.ean||'').includes(s) && !(o.description||'').toLowerCase().includes(s)) return false;
      }
      return true;
    });
  }, [offers, filterMarket, filterCategory, filterRecommendation, search]);

  const kpis = useMemo(() => {
    const analyzed = offers.filter(o => o.analysis);
    const totalCost = offers.reduce((s,o) => s + o.quantity * o.price, 0);
    const potentialRevenueB2C = analyzed.reduce((s,o) => s + o.quantity * (o.analysis.marketPrice?.avg || 0), 0);
    const buyCount = analyzed.filter(o => o.analysis.recommendation === 'ACHETER').length;
    const avgScore = analyzed.length ? analyzed.reduce((s,o) => s + (o.analysis.globalScore || 0), 0) / analyzed.length : 0;
    return { total: offers.length, analyzed: analyzed.length, totalCost, potentialRevenueB2C, buyCount, avgScore };
  }, [offers]);

  const selected = offers.find(o => o.id === selectedId);

  if (loading) {
    return <div style={styles.loadingScreen}>Chargement...</div>;
  }

  return (
    <div style={styles.app}>
      <style>{globalCSS}</style>

      {/* ============ HEADER ============ */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.logo}>
            <div style={styles.logoMark}>◆</div>
            <div>
              <div style={styles.logoTitle}>SOURCING<span style={styles.logoTitleAccent}>.TERMINAL</span></div>
              <div style={styles.logoSubtitle}>Analyse d'offres fournisseurs · B2B / B2C</div>
            </div>
          </div>
        </div>
        <div style={styles.headerRight}>
          <div style={styles.statusDot}><span style={styles.pulse}></span>LIVE</div>
          <div style={styles.clock}>{new Date().toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short' }).toUpperCase()}</div>
        </div>
      </header>

      {/* ============ KPI BAR ============ */}
      <div style={styles.kpiBar}>
        <Kpi label="OFFRES" value={kpis.total} />
        <Kpi label="ANALYSÉES" value={`${kpis.analyzed} / ${kpis.total}`} />
        <Kpi label="COÛT TOTAL" value={fmtEUR(kpis.totalCost)} mono />
        <Kpi label="REV. POT. B2C" value={fmtEUR(kpis.potentialRevenueB2C)} mono accent />
        <Kpi label="À ACHETER" value={kpis.buyCount} accentSuccess />
        <Kpi label="SCORE MOY." value={kpis.avgScore ? kpis.avgScore.toFixed(0) : '—'} />
      </div>

      {/* ============ TOOLBAR ============ */}
      <div style={styles.toolbar}>
        <div style={styles.toolbarLeft}>
          <button style={styles.btnPrimary} onClick={() => { setEditingId(null); setShowForm(true); }}>
            <Plus size={14} /> Nouvelle offre
          </button>
          <button style={styles.btnGhost} onClick={runAllAnalyses} disabled={offers.filter(o => !o.analysis).length === 0}>
            <Zap size={14} /> Analyser tout ({offers.filter(o => !o.analysis).length})
          </button>
          <button style={styles.btnGhost} onClick={exportCSV} disabled={offers.length === 0}>
            <Download size={14} /> Export CSV
          </button>
        </div>
        <div style={styles.toolbarRight}>
          <div style={styles.searchBox}>
            <Search size={14} style={{ color: 'var(--muted)' }} />
            <input
              style={styles.searchInput}
              placeholder="Rechercher réf / EAN / description..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select style={styles.select} value={filterMarket} onChange={e => setFilterMarket(e.target.value)}>
            <option value="ALL">Tous marchés</option>
            {Object.keys(MARKETS).map(k => <option key={k} value={k}>{MARKETS[k].flag} {MARKETS[k].label}</option>)}
          </select>
          <select style={styles.select} value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
            <option value="ALL">Toutes catégories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select style={styles.select} value={filterRecommendation} onChange={e => setFilterRecommendation(e.target.value)}>
            <option value="ALL">Toutes reco.</option>
            <option value="ACHETER">✓ Acheter</option>
            <option value="NEGOCIER">~ Négocier</option>
            <option value="PASSER">✕ Passer</option>
          </select>
        </div>
      </div>

      {/* ============ MAIN TABLE ============ */}
      <div style={styles.main}>
        {filtered.length === 0 ? (
          <EmptyState onAdd={() => setShowForm(true)} hasOffers={offers.length > 0} />
        ) : (
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={{...styles.th, width: '14%'}}>Référence</th>
                  <th style={{...styles.th, width: '11%'}}>EAN</th>
                  <th style={{...styles.th, width: '11%'}}>Catégorie</th>
                  <th style={{...styles.th, width: '6%', textAlign: 'center'}}>Marché</th>
                  <th style={{...styles.th, width: '6%', textAlign: 'right'}}>Qté</th>
                  <th style={{...styles.th, width: '9%', textAlign: 'right'}}>PU HT</th>
                  <th style={{...styles.th, width: '11%', textAlign: 'right'}}>Prix marché (avg)</th>
                  <th style={{...styles.th, width: '8%', textAlign: 'right'}}>Marge B2C</th>
                  <th style={{...styles.th, width: '8%', textAlign: 'right'}}>Marge B2B</th>
                  <th style={{...styles.th, width: '7%', textAlign: 'center'}}>Score</th>
                  <th style={{...styles.th, width: '9%', textAlign: 'center'}}>Reco.</th>
                  <th style={{...styles.th, width: '0%'}}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(o => (
                  <OfferRow
                    key={o.id}
                    offer={o}
                    onSelect={() => setSelectedId(o.id)}
                    onAnalyze={() => runAnalysis(o.id)}
                    onEdit={() => { setEditingId(o.id); setShowForm(true); }}
                    onDelete={() => deleteOffer(o.id)}
                    analyzing={analyzing[o.id]}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ============ OFFER FORM MODAL ============ */}
      {showForm && (
        <OfferForm
          initial={editingId ? offers.find(o => o.id === editingId) : null}
          onSubmit={addOrUpdateOffer}
          onClose={() => { setShowForm(false); setEditingId(null); }}
        />
      )}

      {/* ============ DETAIL PANEL ============ */}
      {selected && (
        <DetailPanel
          offer={selected}
          onClose={() => setSelectedId(null)}
          onAnalyze={() => runAnalysis(selected.id)}
          analyzing={analyzing[selected.id]}
        />
      )}

      <footer style={styles.footer}>
        <span>Données stockées localement · {offers.length} offres · IA analyse par Claude</span>
        <span style={{ color: 'var(--muted)' }}>v1.0</span>
      </footer>
    </div>
  );
}

// ---------- KPI Component ----------
function Kpi({ label, value, mono, accent, accentSuccess }) {
  return (
    <div style={styles.kpi}>
      <div style={styles.kpiLabel}>{label}</div>
      <div style={{
        ...styles.kpiValue,
        fontFamily: mono ? 'var(--font-mono)' : undefined,
        color: accent ? 'var(--accent)' : accentSuccess ? 'var(--signal)' : undefined,
      }}>{value}</div>
    </div>
  );
}

// ---------- Offer Row ----------
function OfferRow({ offer, onSelect, onAnalyze, onEdit, onDelete, analyzing }) {
  const a = offer.analysis;
  const recoStyles = {
    ACHETER: { bg: 'rgba(76, 217, 100, 0.12)', fg: 'var(--signal)', icon: CheckCircle2 },
    NEGOCIER: { bg: 'rgba(255, 184, 0, 0.12)', fg: 'var(--watch)', icon: AlertCircle },
    PASSER: { bg: 'rgba(255, 69, 58, 0.12)', fg: 'var(--alert)', icon: X },
  };
  const reco = a ? recoStyles[a.recommendation] : null;
  const RecoIcon = reco?.icon;

  const marginB2C = a?.marginB2C?.pct;
  const marginB2B = a?.marginB2B?.pct;

  return (
    <tr style={styles.tr} onClick={onSelect}>
      <td style={styles.td}>
        <div style={{ fontWeight: 600, color: 'var(--fg)' }}>{offer.reference}</div>
        {offer.description && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{offer.description}</div>}
      </td>
      <td style={{...styles.td, fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--muted)'}}>{offer.ean || '—'}</td>
      <td style={{...styles.td, fontSize: 12}}>{offer.category}</td>
      <td style={{...styles.td, textAlign: 'center'}}>{MARKETS[offer.market]?.flag}</td>
      <td style={{...styles.td, textAlign: 'right', fontFamily: 'var(--font-mono)'}}>{offer.quantity}</td>
      <td style={{...styles.td, textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600}}>{fmtEUR(offer.price)}</td>
      <td style={{...styles.td, textAlign: 'right', fontFamily: 'var(--font-mono)'}}>
        {a ? (
          <div>
            <div style={{ fontWeight: 600 }}>{fmtEUR(a.marketPrice.avg)}</div>
            <div style={{ fontSize: 10, color: 'var(--muted)' }}>{fmtEUR(a.marketPrice.min)} — {fmtEUR(a.marketPrice.max)}</div>
          </div>
        ) : <span style={{ color: 'var(--muted)' }}>—</span>}
      </td>
      <td style={{...styles.td, textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600}}>
        {marginB2C != null ? (
          <span style={{ color: marginB2C > 20 ? 'var(--signal)' : marginB2C > 0 ? 'var(--watch)' : 'var(--alert)' }}>
            {fmtPct(marginB2C)}
          </span>
        ) : <span style={{ color: 'var(--muted)' }}>—</span>}
      </td>
      <td style={{...styles.td, textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600}}>
        {marginB2B != null ? (
          <span style={{ color: marginB2B > 10 ? 'var(--signal)' : marginB2B > 0 ? 'var(--watch)' : 'var(--alert)' }}>
            {fmtPct(marginB2B)}
          </span>
        ) : <span style={{ color: 'var(--muted)' }}>—</span>}
      </td>
      <td style={{...styles.td, textAlign: 'center'}}>
        {a ? (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              border: `2px solid ${scoreColor(a.globalScore)}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-mono)',
              color: scoreColor(a.globalScore),
            }}>{a.globalScore}</div>
          </div>
        ) : <span style={{ color: 'var(--muted)' }}>—</span>}
      </td>
      <td style={{...styles.td, textAlign: 'center'}}>
        {a && reco ? (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '3px 8px', borderRadius: 3,
            background: reco.bg, color: reco.fg,
            fontSize: 10, fontWeight: 700, letterSpacing: 0.5,
          }}>
            <RecoIcon size={11} /> {a.recommendation}
          </div>
        ) : (
          <button
            style={styles.btnMicro}
            onClick={(e) => { e.stopPropagation(); onAnalyze(); }}
            disabled={analyzing}
          >
            {analyzing ? <RefreshCw size={11} className="spin" /> : <Zap size={11} />}
            {analyzing ? 'Analyse...' : 'Analyser'}
          </button>
        )}
      </td>
      <td style={styles.td} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
          <button style={styles.iconBtn} onClick={() => openAllSites(offer)} title={`Ouvrir ${getSitesFor(offer.market, offer.category).length} sites (${offer.ean ? 'par EAN' : 'par reference'})`}>
            <ExternalLink size={12} />
          </button>
          <button style={styles.iconBtn} onClick={onEdit} title="Editer"><Eye size={12} /></button>
          <button style={styles.iconBtn} onClick={onDelete} title="Supprimer"><Trash2 size={12} /></button>
        </div>
      </td>
    </tr>
  );
}

// ---------- Offer Form ----------
function OfferForm({ initial, onSubmit, onClose }) {
  const [form, setForm] = useState(initial || {
    reference: '', ean: '', description: '', category: CATEGORIES[0],
    market: 'FR', quantity: 1, price: 0, supplier: '',
  });

  const submit = (e) => {
    e.preventDefault();
    if (!form.reference.trim()) return alert('Référence obligatoire');
    if (form.quantity < 1) return alert('Quantité >= 1');
    if (form.price <= 0) return alert('Prix > 0');
    onSubmit({
      ...form,
      quantity: Number(form.quantity),
      price: Number(form.price),
    });
  };

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <h2 style={styles.modalTitle}>{initial ? 'Modifier l\'offre' : 'Nouvelle offre fournisseur'}</h2>
          <button style={styles.iconBtn} onClick={onClose}><X size={16} /></button>
        </div>
        <form onSubmit={submit} style={styles.form}>
          <div style={styles.formGrid}>
            <Field label="Référence / Modèle *" span={2}>
              <input style={styles.input} value={form.reference} onChange={e => setForm({...form, reference: e.target.value})} placeholder="Ex: iPhone 15 Pro 256GB Titanium" required />
            </Field>
            <Field label="Code EAN / Code-barres">
              <input style={styles.input} value={form.ean} onChange={e => setForm({...form, ean: e.target.value})} placeholder="Optionnel" />
            </Field>
            <Field label="Fournisseur">
              <input style={styles.input} value={form.supplier} onChange={e => setForm({...form, supplier: e.target.value})} placeholder="Nom du fournisseur" />
            </Field>
            <Field label="Description / Spécifications" span={2}>
              <textarea style={{...styles.input, minHeight: 60, resize: 'vertical', fontFamily: 'inherit'}} value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Ex: Neuf, scellé, garantie FR 2 ans, boîte d'origine..." />
            </Field>
            <Field label="Catégorie">
              <select style={styles.input} value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Marché cible">
              <select style={styles.input} value={form.market} onChange={e => setForm({...form, market: e.target.value})}>
                {Object.entries(MARKETS).map(([k, v]) => <option key={k} value={k}>{v.flag} {v.label}</option>)}
              </select>
            </Field>
            <Field label="Quantité">
              <input type="number" min={1} step={1} style={styles.input} value={form.quantity} onChange={e => setForm({...form, quantity: e.target.value})} />
            </Field>
            <Field label="Prix unitaire HT (€) *">
              <input type="number" min={0} step={0.01} style={styles.input} value={form.price} onChange={e => setForm({...form, price: e.target.value})} required />
            </Field>
          </div>
          <div style={styles.formSummary}>
            <span style={{ color: 'var(--muted)' }}>Coût total:</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 16, color: 'var(--accent)' }}>
              {fmtEUR((Number(form.quantity) || 0) * (Number(form.price) || 0))}
            </span>
          </div>
          <div style={styles.formActions}>
            <button type="button" style={styles.btnGhost} onClick={onClose}>Annuler</button>
            <button type="submit" style={styles.btnPrimary}>{initial ? 'Enregistrer' : 'Ajouter l\'offre'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children, span }) {
  return (
    <div style={{ gridColumn: span === 2 ? '1 / -1' : 'auto' }}>
      <label style={styles.label}>{label}</label>
      {children}
    </div>
  );
}

// ---------- Detail Panel ----------
function DetailPanel({ offer, onClose, onAnalyze, analyzing }) {
  const a = offer.analysis;
  return (
    <div style={styles.panelOverlay} onClick={onClose}>
      <div style={styles.panel} onClick={e => e.stopPropagation()}>
        <div style={styles.panelHeader}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: 1 }}>DÉTAIL · {MARKETS[offer.market].flag} {MARKETS[offer.market].label.toUpperCase()}</div>
            <h2 style={styles.panelTitle}>{offer.reference}</h2>
            {offer.description && <div style={{ fontSize: 13, color: 'var(--muted-2)', marginTop: 4 }}>{offer.description}</div>}
          </div>
          <button style={styles.iconBtn} onClick={onClose}><X size={18} /></button>
        </div>

        <div style={styles.panelMeta}>
          <MetaChip label="Catégorie" value={offer.category} />
          {offer.ean && <MetaChip label="EAN" value={offer.ean} mono />}
          {offer.supplier && <MetaChip label="Fournisseur" value={offer.supplier} />}
          <MetaChip label="Quantité" value={offer.quantity} mono />
          <MetaChip label="Prix unitaire" value={fmtEUR(offer.price)} mono accent />
          <MetaChip label="Coût total" value={fmtEUR(offer.quantity * offer.price)} mono accent />
        </div>

        <ExternalCheckBar offer={offer} />

        {!a ? (
          <div style={styles.panelNoAnalysis}>
            <Package size={40} style={{ color: 'var(--muted)', marginBottom: 16 }} />
            <h3 style={{ margin: 0, fontSize: 18 }}>Analyse non effectuée</h3>
            <p style={{ color: 'var(--muted)', margin: '8px 0 20px', maxWidth: 380, textAlign: 'center' }}>
              Lance l'analyse IA pour obtenir les prix marché estimés, marges, et recommandations B2B/B2C.
            </p>
            <button style={styles.btnPrimary} onClick={onAnalyze} disabled={analyzing}>
              {analyzing ? <><RefreshCw size={14} className="spin" /> Analyse en cours...</> : <><Zap size={14} /> Lancer l'analyse</>}
            </button>
          </div>
        ) : (
          <div style={styles.panelContent}>
            {/* Recommendation banner */}
            <div style={{
              ...styles.recoBanner,
              background: a.recommendation === 'ACHETER' ? 'linear-gradient(135deg, rgba(76,217,100,0.18), rgba(76,217,100,0.04))' :
                          a.recommendation === 'NEGOCIER' ? 'linear-gradient(135deg, rgba(255,184,0,0.18), rgba(255,184,0,0.04))' :
                          'linear-gradient(135deg, rgba(255,69,58,0.18), rgba(255,69,58,0.04))',
              borderColor: a.recommendation === 'ACHETER' ? 'var(--signal)' : a.recommendation === 'NEGOCIER' ? 'var(--watch)' : 'var(--alert)',
            }}>
              <div>
                <div style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: 1.5 }}>RECOMMANDATION · CONFIANCE {a.confidence?.toUpperCase()}</div>
                <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: 2, marginTop: 4,
                  color: a.recommendation === 'ACHETER' ? 'var(--signal)' : a.recommendation === 'NEGOCIER' ? 'var(--watch)' : 'var(--alert)' }}>
                  {a.recommendation}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: 1.5 }}>SCORE GLOBAL</div>
                <div style={{ fontSize: 44, fontWeight: 800, fontFamily: 'var(--font-mono)', color: scoreColor(a.globalScore), lineHeight: 1 }}>{a.globalScore}</div>
                <div style={{ fontSize: 10, color: scoreColor(a.globalScore), letterSpacing: 1 }}>{scoreLabel(a.globalScore)}</div>
              </div>
            </div>

            {/* Market prices */}
            <Section icon={<BarChart3 size={14} />} title="Prix marché estimés">
              <div style={styles.priceGrid}>
                <PriceBox label="Min" value={a.marketPrice.min} />
                <PriceBox label="Moyen" value={a.marketPrice.avg} highlight />
                <PriceBox label="Max" value={a.marketPrice.max} />
              </div>
            </Section>

            {/* Competitors */}
            {a.topCompetitors?.length > 0 && (
              <Section icon={<Globe size={14} />} title="Concurrents principaux">
                <div style={styles.competitorList}>
                  {a.topCompetitors.map((c, i) => (
                    <div key={i} style={styles.competitorRow}>
                      <div style={{ flex: 1, fontWeight: 600 }}>{c.name}</div>
                      <div style={{
                        fontSize: 11, padding: '2px 8px', borderRadius: 2, letterSpacing: 0.5,
                        background: c.availability === 'En stock' ? 'rgba(76,217,100,0.15)' :
                                   c.availability === 'Stock limite' ? 'rgba(255,184,0,0.15)' :
                                   c.availability === 'Rupture' ? 'rgba(255,69,58,0.15)' : 'rgba(255,255,255,0.05)',
                        color: c.availability === 'En stock' ? 'var(--signal)' :
                               c.availability === 'Stock limite' ? 'var(--watch)' :
                               c.availability === 'Rupture' ? 'var(--alert)' : 'var(--muted)',
                      }}>{c.availability}</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, minWidth: 80, textAlign: 'right' }}>{fmtEUR(c.estimatedPrice)}</div>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Margins */}
            <Section icon={<TrendingUp size={14} />} title="Marges & potentiel">
              <div style={styles.marginGrid}>
                <MarginCard title="B2C (particulier)" data={a.marginB2C} potential={a.b2cPotential} qty={offer.quantity} />
                <MarginCard title="B2B (pro)" data={a.marginB2B} potential={a.b2bPotential} qty={offer.quantity} />
              </div>
            </Section>

            {/* Metrics grid */}
            <Section icon={<Filter size={14} />} title="Indicateurs de marché">
              <div style={styles.metricsGrid}>
                <MetricBar label="Rotation" level={a.rotation.level} score={a.rotation.score} comment={a.rotation.comment} />
                <MetricBar label="Demande" level={a.demand.trend} score={a.demand.score} icon={a.demand.trend.includes('hausse') ? <TrendingUp size={12}/> : a.demand.trend.includes('baisse') ? <TrendingDown size={12}/> : <Minus size={12}/>} />
                <MetricBar label="Stock concurrents" level={a.competitorStock.level} score={a.competitorStock.score} />
              </div>
            </Section>

            {/* Insights & risks */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {a.keyInsights?.length > 0 && (
                <Section icon={<CheckCircle2 size={14} />} title="Points clés">
                  <ul style={styles.insightList}>
                    {a.keyInsights.map((x, i) => <li key={i}>{x}</li>)}
                  </ul>
                </Section>
              )}
              {a.risks?.length > 0 && (
                <Section icon={<AlertCircle size={14} />} title="Risques">
                  <ul style={styles.insightList}>
                    {a.risks.map((x, i) => <li key={i} style={{ color: 'var(--alert-soft)' }}>{x}</li>)}
                  </ul>
                </Section>
              )}
            </div>

            <button style={{...styles.btnGhost, width: '100%', justifyContent: 'center'}} onClick={onAnalyze} disabled={analyzing}>
              {analyzing ? <><RefreshCw size={14} className="spin" /> Analyse en cours...</> : <><RefreshCw size={14} /> Relancer l'analyse</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ExternalCheckBar({ offer }) {
  const [expanded, setExpanded] = useState(false);
  const [activeMarket, setActiveMarket] = useState(offer.market);
  const [mode, setMode] = useState('smart'); // 'smart' = filtre categorie, 'all' = tous
  const usingEan = !!(offer.ean && offer.ean.trim());

  const smartSites = getSitesFor(activeMarket, offer.category, 'smart');
  const allSites = getSitesFor(activeMarket, offer.category, 'all');
  const sites = mode === 'smart' ? smartSites : allSites;

  return (
    <div style={styles.externalBar}>
      <div style={styles.externalBarHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
          <Globe size={14} style={{ color: 'var(--accent)', flexShrink: 0 }} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg)' }}>
              Vérifier en ligne
            </div>
            <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2, letterSpacing: 0.3 }}>
              Recherche par {usingEan ? <>EAN <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>{offer.ean}</span></> : <>référence (EAN manquant, moins précis)</>}
            </div>
          </div>
        </div>
        <button style={styles.btnPrimary} onClick={() => openSitesList(sites, offer)}>
          <ExternalLink size={12} /> Ouvrir {sites.length} sites
        </button>
      </div>

      {/* Tabs marches */}
      <div style={styles.marketTabs}>
        <div style={styles.marketTabsGroup}>
          {Object.entries(MARKETS).map(([key, m]) => {
            const isActive = activeMarket === key;
            const isNative = offer.market === key;
            const count = getSitesFor(key, offer.category, mode).length;
            return (
              <button
                key={key}
                style={{
                  ...styles.marketTab,
                  ...(isActive ? styles.marketTabActive : {}),
                }}
                onClick={() => setActiveMarket(key)}
              >
                <span>{m.flag}</span>
                <span>{m.label}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: isActive ? 'var(--accent)' : 'var(--muted)', marginLeft: 4 }}>{count}</span>
                {isNative && <span style={styles.nativeTag}>cible</span>}
              </button>
            );
          })}
        </div>
        <div style={styles.modeToggle}>
          <button
            style={{ ...styles.modeBtn, ...(mode === 'smart' ? styles.modeBtnActive : {}) }}
            onClick={() => setMode('smart')}
            title={`Sites pertinents pour ${offer.category}`}
          >Pertinents</button>
          <button
            style={{ ...styles.modeBtn, ...(mode === 'all' ? styles.modeBtnActive : {}) }}
            onClick={() => setMode('all')}
            title="Tous les sites du marche"
          >Tous</button>
          <button style={{ ...styles.modeBtn, marginLeft: 4 }} onClick={() => setExpanded(e => !e)}>
            {expanded ? 'Replier' : 'Détail'}
          </button>
        </div>
      </div>

      {expanded && (
        <div style={styles.externalSiteGrid}>
          {sites.map(site => {
            const url = buildSearchUrl(site, offer);
            const config = SEARCH_URL[site];
            const isSpecialist = config && !config.tags.includes('all');
            return (
              <a
                key={site}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                style={styles.externalSiteLink}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{site}</span>
                  {isSpecialist && <span style={styles.specialistDot} title="Specialiste categorie"></span>}
                </div>
                <ExternalLink size={11} style={{ color: 'var(--muted)', flexShrink: 0 }} />
              </a>
            );
          })}
          {sites.length === 0 && (
            <div style={{ gridColumn: '1 / -1', padding: 20, textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>
              Aucun site ne correspond à cette combinaison. Essaie "Tous".
            </div>
          )}
        </div>
      )}
    </div>
  );
}


function Section({ icon, title, children }) {
  return (
    <div style={styles.section}>
      <div style={styles.sectionHeader}>
        {icon}
        <span>{title}</span>
      </div>
      {children}
    </div>
  );
}

function PriceBox({ label, value, highlight }) {
  return (
    <div style={{...styles.priceBox, ...(highlight ? styles.priceBoxHighlight : {})}}>
      <div style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: 1 }}>{label.toUpperCase()}</div>
      <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-mono)', marginTop: 4, color: highlight ? 'var(--accent)' : 'var(--fg)' }}>{fmtEUR(value)}</div>
    </div>
  );
}

function MarginCard({ title, data, potential, qty }) {
  const color = data.pct > 20 ? 'var(--signal)' : data.pct > 0 ? 'var(--watch)' : 'var(--alert)';
  return (
    <div style={styles.marginCard}>
      <div style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: 1 }}>{title.toUpperCase()}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 6 }}>
        <div style={{ fontSize: 26, fontWeight: 800, fontFamily: 'var(--font-mono)', color }}>{fmtPct(data.pct)}</div>
        <div style={{ fontSize: 13, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>/ unité {fmtEUR(data.eur)}</div>
      </div>
      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>Sur lot complet: <span style={{ color: 'var(--fg)', fontWeight: 600 }}>{fmtEUR(data.eur * qty)}</span></div>
      <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px dashed var(--border)' }}>
        <div style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: 0.5 }}>POTENTIEL</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
          <div style={{
            fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-mono)',
            color: scoreColor(potential.score),
          }}>{potential.score}/100</div>
          <div style={{ fontSize: 11, color: 'var(--muted-2)' }}>{potential.verdict}</div>
        </div>
      </div>
    </div>
  );
}

function MetricBar({ label, level, score, comment, icon }) {
  return (
    <div style={styles.metricBar}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: 0.5, textTransform: 'uppercase' }}>{label}</div>
        <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: scoreColor(score), fontWeight: 700 }}>{score}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
        {icon}
        <div style={{ fontSize: 14, fontWeight: 600 }}>{level}</div>
      </div>
      <div style={styles.progressBar}>
        <div style={{ ...styles.progressFill, width: `${score}%`, background: scoreColor(score) }}></div>
      </div>
      {comment && <div style={{ fontSize: 11, color: 'var(--muted-2)', marginTop: 6, lineHeight: 1.4 }}>{comment}</div>}
    </div>
  );
}

function MetaChip({ label, value, mono, accent }) {
  return (
    <div style={styles.metaChip}>
      <div style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: 1 }}>{label.toUpperCase()}</div>
      <div style={{
        fontSize: 13, fontWeight: 600, marginTop: 2,
        fontFamily: mono ? 'var(--font-mono)' : undefined,
        color: accent ? 'var(--accent)' : 'var(--fg)',
      }}>{value}</div>
    </div>
  );
}

function EmptyState({ onAdd, hasOffers }) {
  return (
    <div style={styles.emptyState}>
      <div style={styles.emptyIcon}>◆</div>
      <h2 style={{ margin: '16px 0 8px', fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 28 }}>
        {hasOffers ? 'Aucun résultat' : 'Bienvenue sur Sourcing Terminal'}
      </h2>
      <p style={{ color: 'var(--muted)', maxWidth: 460, textAlign: 'center', lineHeight: 1.6 }}>
        {hasOffers
          ? 'Aucune offre ne correspond aux filtres actuels. Modifiez les filtres ou ajoutez une nouvelle offre.'
          : "Ajoute les offres que tes fournisseurs te soumettent. L'IA analyse les prix marché sur FR/EU/US et te dit si l'offre vaut le coup en B2B ou B2C."}
      </p>
      <button style={{...styles.btnPrimary, marginTop: 24}} onClick={onAdd}>
        <Plus size={14} /> Ajouter ma première offre
      </button>
    </div>
  );
}

// ---------- Styles ----------
const globalCSS = `
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Instrument+Serif:ital@0;1&family=Neue+Haas+Grotesk+Text:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500;600;700&display=swap');

  :root {
    --bg: #0a0b0d;
    --bg-2: #111316;
    --bg-3: #16181c;
    --surface: #1a1d22;
    --border: #24282f;
    --border-soft: #1c2026;
    --fg: #e8eaed;
    --muted: #6b7280;
    --muted-2: #9ca3af;
    --accent: #6ee7b7;
    --accent-dim: #34d399;
    --signal: #4cd964;
    --watch: #ffb800;
    --alert: #ff453a;
    --alert-soft: #ff8a80;
    --warn: #ff6b35;
    --font-sans: 'Geist', 'Neue Haas Grotesk Text', -apple-system, sans-serif;
    --font-display: 'Instrument Serif', 'Playfair Display', serif;
    --font-mono: 'Geist Mono', 'JetBrains Mono', 'SF Mono', monospace;
  }

  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--fg); font-family: var(--font-sans); -webkit-font-smoothing: antialiased; }

  ::-webkit-scrollbar { width: 8px; height: 8px; }
  ::-webkit-scrollbar-track { background: var(--bg); }
  ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }
  ::-webkit-scrollbar-thumb:hover { background: var(--muted); }

  @keyframes spin { to { transform: rotate(360deg); } }
  .spin { animation: spin 1s linear infinite; }

  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.4; transform: scale(1.4); }
  }

  @keyframes slideUp {
    from { transform: translateY(10px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }

  button:hover { filter: brightness(1.15); }
  button:disabled { opacity: 0.4; cursor: not-allowed; }
  button:disabled:hover { filter: none; }

  tr[role="row"]:hover, tbody tr:hover { background: var(--bg-3) !important; cursor: pointer; }

  a:hover { border-color: var(--accent) !important; background: var(--bg-3) !important; }

  input:focus, select:focus, textarea:focus { outline: 1px solid var(--accent); border-color: var(--accent); }
`;

const styles = {
  loadingScreen: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: 2 },

  app: { minHeight: '100vh', background: 'var(--bg)', color: 'var(--fg)', fontFamily: 'var(--font-sans)', display: 'flex', flexDirection: 'column' },

  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 24px', borderBottom: '1px solid var(--border)', background: 'var(--bg-2)' },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 20 },
  logo: { display: 'flex', alignItems: 'center', gap: 12 },
  logoMark: { fontSize: 22, color: 'var(--accent)', filter: 'drop-shadow(0 0 8px rgba(110,231,183,0.6))' },
  logoTitle: { fontSize: 14, fontWeight: 700, letterSpacing: 2, fontFamily: 'var(--font-mono)' },
  logoTitleAccent: { color: 'var(--accent)' },
  logoSubtitle: { fontSize: 10, color: 'var(--muted)', letterSpacing: 0.5, marginTop: 2 },

  headerRight: { display: 'flex', alignItems: 'center', gap: 16 },
  statusDot: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: 'var(--signal)', fontFamily: 'var(--font-mono)', fontWeight: 700, letterSpacing: 1 },
  pulse: { width: 6, height: 6, borderRadius: '50%', background: 'var(--signal)', boxShadow: '0 0 6px var(--signal)', animation: 'pulse 2s infinite' },
  clock: { fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-mono)', letterSpacing: 1 },

  kpiBar: { display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', borderBottom: '1px solid var(--border)', background: 'var(--bg-2)' },
  kpi: { padding: '14px 20px', borderRight: '1px solid var(--border-soft)' },
  kpiLabel: { fontSize: 9, color: 'var(--muted)', letterSpacing: 1.5, fontWeight: 700 },
  kpiValue: { fontSize: 20, fontWeight: 700, marginTop: 4, letterSpacing: -0.3 },

  toolbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 24px', gap: 12, borderBottom: '1px solid var(--border)', background: 'var(--bg)' },
  toolbarLeft: { display: 'flex', gap: 8 },
  toolbarRight: { display: 'flex', gap: 8, alignItems: 'center' },

  btnPrimary: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: 'var(--accent)', color: '#0a0b0d', border: 'none', borderRadius: 4, fontSize: 12, fontWeight: 700, letterSpacing: 0.3, cursor: 'pointer', fontFamily: 'var(--font-sans)' },
  btnGhost: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px', background: 'transparent', color: 'var(--fg)', border: '1px solid var(--border)', borderRadius: 4, fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-sans)' },
  btnMicro: { display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', background: 'rgba(110,231,183,0.1)', color: 'var(--accent)', border: '1px solid rgba(110,231,183,0.3)', borderRadius: 3, fontSize: 10, fontWeight: 600, letterSpacing: 0.3, cursor: 'pointer', fontFamily: 'var(--font-mono)' },
  iconBtn: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, background: 'transparent', color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 3, cursor: 'pointer' },

  searchBox: { display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 4, minWidth: 250 },
  searchInput: { background: 'transparent', border: 'none', color: 'var(--fg)', fontSize: 12, outline: 'none', width: '100%', fontFamily: 'var(--font-sans)' },
  select: { padding: '7px 10px', background: 'var(--bg-2)', color: 'var(--fg)', border: '1px solid var(--border)', borderRadius: 4, fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-sans)' },

  main: { flex: 1, overflow: 'auto' },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { padding: '12px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'var(--muted)', letterSpacing: 1, textTransform: 'uppercase', borderBottom: '1px solid var(--border)', background: 'var(--bg-2)', position: 'sticky', top: 0, zIndex: 1 },
  tr: { borderBottom: '1px solid var(--border-soft)', transition: 'background 0.1s' },
  td: { padding: '12px 14px', verticalAlign: 'middle' },

  emptyState: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 80, minHeight: 400 },
  emptyIcon: { fontSize: 56, color: 'var(--accent)', filter: 'drop-shadow(0 0 20px rgba(110,231,183,0.3))' },

  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20, animation: 'slideUp 0.2s' },
  modal: { background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 6, width: '100%', maxWidth: 720, maxHeight: '90vh', overflow: 'auto' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px', borderBottom: '1px solid var(--border)' },
  modalTitle: { margin: 0, fontSize: 18, fontFamily: 'var(--font-display)', fontWeight: 400, letterSpacing: 0.3 },

  form: { padding: 24 },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
  label: { display: 'block', fontSize: 10, color: 'var(--muted)', letterSpacing: 1, fontWeight: 700, marginBottom: 6, textTransform: 'uppercase' },
  input: { width: '100%', padding: '9px 12px', background: 'var(--bg)', color: 'var(--fg)', border: '1px solid var(--border)', borderRadius: 4, fontSize: 13, fontFamily: 'var(--font-sans)' },
  formSummary: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 4, marginTop: 20 },
  formActions: { display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 },

  panelOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'flex-end', zIndex: 90 },
  panel: { width: '100%', maxWidth: 720, height: '100%', background: 'var(--bg-2)', borderLeft: '1px solid var(--border)', overflow: 'auto', animation: 'slideUp 0.2s' },
  panelHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '20px 28px', borderBottom: '1px solid var(--border)' },
  panelTitle: { margin: '4px 0 0', fontSize: 22, fontFamily: 'var(--font-display)', fontWeight: 400, letterSpacing: 0.3, lineHeight: 1.2 },
  panelMeta: { display: 'flex', flexWrap: 'wrap', gap: 10, padding: '16px 28px', borderBottom: '1px solid var(--border)' },
  metaChip: { padding: '6px 10px', background: 'var(--bg)', border: '1px solid var(--border-soft)', borderRadius: 3, minWidth: 90 },

  externalBar: { padding: '14px 28px', borderBottom: '1px solid var(--border)', background: 'linear-gradient(to right, rgba(110,231,183,0.04), transparent)' },
  externalBarHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  externalSiteGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 6, marginTop: 12 },
  externalSiteLink: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: 'var(--bg)', border: '1px solid var(--border-soft)', borderRadius: 3, textDecoration: 'none', color: 'var(--fg)', transition: 'all 0.15s', cursor: 'pointer' },

  marketTabs: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginTop: 12, flexWrap: 'wrap' },
  marketTabsGroup: { display: 'flex', gap: 4, background: 'var(--bg)', padding: 3, borderRadius: 4, border: '1px solid var(--border-soft)' },
  marketTab: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 10px', background: 'transparent', color: 'var(--muted-2)', border: 'none', borderRadius: 3, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)', position: 'relative' },
  marketTabActive: { background: 'var(--bg-3)', color: 'var(--fg)', boxShadow: 'inset 0 0 0 1px var(--border)' },
  nativeTag: { fontSize: 8, fontWeight: 700, letterSpacing: 0.5, color: 'var(--accent)', marginLeft: 2, padding: '1px 4px', background: 'rgba(110,231,183,0.15)', borderRadius: 2, textTransform: 'uppercase' },

  modeToggle: { display: 'flex', gap: 3, alignItems: 'center' },
  modeBtn: { padding: '5px 10px', background: 'var(--bg)', color: 'var(--muted-2)', border: '1px solid var(--border-soft)', borderRadius: 3, fontSize: 10, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)', letterSpacing: 0.3 },
  modeBtnActive: { background: 'var(--bg-3)', color: 'var(--accent)', borderColor: 'var(--accent)' },

  specialistDot: { width: 5, height: 5, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0, boxShadow: '0 0 4px rgba(110,231,183,0.6)' },
  panelNoAnalysis: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 60 },
  panelContent: { padding: 24, display: 'flex', flexDirection: 'column', gap: 20 },
  footer: { padding: '10px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--muted-2)', letterSpacing: 0.5, background: 'var(--bg-2)' },

  recoBanner: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 20px', border: '1px solid', borderRadius: 4 },

  section: { },
  sectionHeader: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 700, color: 'var(--muted)', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10, paddingBottom: 6, borderBottom: '1px solid var(--border-soft)' },

  priceGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 },
  priceBox: { padding: 14, background: 'var(--bg)', border: '1px solid var(--border-soft)', borderRadius: 4 },
  priceBoxHighlight: { borderColor: 'var(--accent)', background: 'linear-gradient(135deg, rgba(110,231,183,0.08), transparent)' },

  competitorList: { display: 'flex', flexDirection: 'column', gap: 6 },
  competitorRow: { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: 'var(--bg)', border: '1px solid var(--border-soft)', borderRadius: 3, fontSize: 12 },

  marginGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
  marginCard: { padding: 14, background: 'var(--bg)', border: '1px solid var(--border-soft)', borderRadius: 4 },

  metricsGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 },
  metricBar: { padding: 12, background: 'var(--bg)', border: '1px solid var(--border-soft)', borderRadius: 4 },
  progressBar: { marginTop: 8, height: 3, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', transition: 'width 0.4s' },

  insightList: { margin: 0, padding: '0 0 0 16px', fontSize: 12, lineHeight: 1.6, color: 'var(--muted-2)' },
};
