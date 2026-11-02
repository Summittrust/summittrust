// ============================================
// INVESTMENT CATALOGUE — single source of truth
// Loaded by dashboard.html and admin.html.
//
// Tiers are CUMULATIVE:
//   Starter = tier 1 assets            (20)
//   Premium = tier 1 + tier 2 assets   (40)
//   Elite   = tier 1 + tier 2 + tier 3 (61)
//
// Bumping INVEST_CATALOG_VERSION makes the app ignore any older
// asset list saved in bank_settings.investment_plans, so a stale
// admin save can never resurrect a retired catalogue.
// ============================================

window.INVEST_CATALOG_VERSION = 3;

window.INVEST_CATEGORIES = [
    { key: 'stocks',     label: 'Stocks',                 icon: 'fa-chart-line' },
    { key: 'etfs',       label: 'ETFs',                   icon: 'fa-layer-group' },
    { key: 'crypto',     label: 'Cryptocurrencies',       icon: 'fa-coins' },
    { key: 'commodities',label: 'Commodities',            icon: 'fa-cubes' },
    { key: 'fixed',      label: 'Bonds & Cash',           icon: 'fa-landmark' },
    { key: 'realestate', label: 'Real Estate',            icon: 'fa-building' },
    { key: 'funds',      label: 'Managed & Private Funds',icon: 'fa-briefcase' }
];

window.INVEST_TIER_RANK = { starter: 1, premium: 2, elite: 3 };

// Helper for the favicon-style logo of a public company / fund.
function investLogo(domain) {
    return 'https://www.google.com/s2/favicons?domain=' + domain + '&sz=128';
}
// Helper for a cryptocurrency mark (spothq icon set, served by jsDelivr).
function investCoin(sym) {
    return 'https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/128/color/' + sym + '.png';
}

window.INVEST_CATALOG = [
    // ── TIER 1 · STARTER ───────────────────────────────────────────────────
    { id: 'nvda',  name: 'NVIDIA',                 sym: 'NVDA',       cat: 'stocks',      tier: 1, icon: investLogo('nvidia.com') },
    { id: 'msft',  name: 'Microsoft',              sym: 'MSFT',       cat: 'stocks',      tier: 1, icon: investLogo('microsoft.com') },
    { id: 'aapl',  name: 'Apple',                  sym: 'AAPL',       cat: 'stocks',      tier: 1, icon: investLogo('apple.com') },
    { id: 'amzn',  name: 'Amazon',                 sym: 'AMZN',       cat: 'stocks',      tier: 1, icon: investLogo('amazon.com') },
    { id: 'googl', name: 'Alphabet (Google)',      sym: 'GOOGL',      cat: 'stocks',      tier: 1, icon: investLogo('google.com') },
    { id: 'meta',  name: 'Meta Platforms',         sym: 'META',       cat: 'stocks',      tier: 1, icon: investLogo('meta.com') },
    { id: 'pltr',  name: 'Palantir Technologies',  sym: 'PLTR',       cat: 'stocks',      tier: 1, icon: investLogo('palantir.com') },
    { id: 'avgo',  name: 'Broadcom',               sym: 'AVGO',       cat: 'stocks',      tier: 1, icon: investLogo('broadcom.com') },

    { id: 'voo',   name: 'Vanguard S&P 500 ETF',   sym: 'VOO',        cat: 'etfs',        tier: 1, icon: investLogo('vanguard.com') },
    { id: 'qqqm',  name: 'Invesco NASDAQ-100 ETF', sym: 'QQQM',       cat: 'etfs',        tier: 1, icon: investLogo('invesco.com') },
    { id: 'jepq',  name: 'JPMorgan Nasdaq Premium Income', sym: 'JEPQ', cat: 'etfs',      tier: 1, icon: investLogo('jpmorgan.com') },

    { id: 'btc',   name: 'Bitcoin',                sym: 'BTC',        cat: 'crypto',      tier: 1, icon: investCoin('btc') },
    { id: 'eth',   name: 'Ethereum',               sym: 'ETH',        cat: 'crypto',      tier: 1, icon: investCoin('eth') },
    { id: 'xrp',   name: 'XRP',                    sym: 'XRP',        cat: 'crypto',      tier: 1, icon: investCoin('xrp') },
    { id: 'sol',   name: 'Solana',                 sym: 'SOL',        cat: 'crypto',      tier: 1, icon: investCoin('sol') },

    { id: 'gold',  name: 'Physical Gold',          sym: 'GOLD',       cat: 'commodities', tier: 1, glyph: '\u{1F947}' },
    { id: 'silver',name: 'Physical Silver',        sym: 'SILVER',     cat: 'commodities', tier: 1, glyph: '\u{1F948}' },

    { id: 'tbills',   name: 'Treasury Bills',      sym: 'T-BILLS',    cat: 'fixed',       tier: 1, glyph: '\u{1F3DB}\u{FE0F}' },
    { id: 'govbonds', name: 'Government Bonds',    sym: 'GOV-BONDS',  cat: 'fixed',       tier: 1, glyph: '\u{1F4DC}' },
    { id: 'mmf',      name: 'Money Market Funds',  sym: 'MMF',        cat: 'fixed',       tier: 1, glyph: '\u{1F4B5}' },

    // ── TIER 2 · PREMIUM ───────────────────────────────────────────────────
    { id: 'tsla',  name: 'Tesla',                  sym: 'TSLA',       cat: 'stocks',      tier: 2, icon: investLogo('tesla.com') },
    { id: 'amd',   name: 'Advanced Micro Devices', sym: 'AMD',        cat: 'stocks',      tier: 2, icon: investLogo('amd.com') },
    { id: 'nflx',  name: 'Netflix',                sym: 'NFLX',       cat: 'stocks',      tier: 2, icon: investLogo('netflix.com') },
    { id: 'orcl',  name: 'Oracle',                 sym: 'ORCL',       cat: 'stocks',      tier: 2, icon: investLogo('oracle.com') },
    { id: 'mu',    name: 'Micron Technology',      sym: 'MU',         cat: 'stocks',      tier: 2, icon: investLogo('micron.com') },
    { id: 'tsm',   name: 'Taiwan Semiconductor',   sym: 'TSM',        cat: 'stocks',      tier: 2, icon: investLogo('tsmc.com') },
    { id: 'shop',  name: 'Shopify',                sym: 'SHOP',       cat: 'stocks',      tier: 2, icon: investLogo('shopify.com') },

    { id: 'smh',   name: 'VanEck Semiconductor ETF',      sym: 'SMH', cat: 'etfs',       tier: 2, icon: investLogo('vaneck.com') },
    { id: 'schd',  name: 'Schwab US Dividend Equity ETF', sym: 'SCHD', cat: 'etfs',      tier: 2, icon: investLogo('schwab.com') },
    { id: 'vti',   name: 'Vanguard Total Stock Market ETF', sym: 'VTI', cat: 'etfs',     tier: 2, icon: investLogo('vanguard.com') },

    { id: 'bnb',   name: 'BNB',                    sym: 'BNB',        cat: 'crypto',      tier: 2, icon: investCoin('bnb') },
    { id: 'link',  name: 'Chainlink',              sym: 'LINK',       cat: 'crypto',      tier: 2, icon: investCoin('link') },
    { id: 'avax',  name: 'Avalanche',              sym: 'AVAX',       cat: 'crypto',      tier: 2, icon: investCoin('avax') },
    { id: 'ada',   name: 'Cardano',                sym: 'ADA',        cat: 'crypto',      tier: 2, icon: investCoin('ada') },

    { id: 'platinum', name: 'Platinum',            sym: 'PLATINUM',   cat: 'commodities', tier: 2, glyph: '\u{26AA}' },
    { id: 'copper',   name: 'Copper',              sym: 'COPPER',     cat: 'commodities', tier: 2, glyph: '\u{1F9F1}' },

    { id: 'corpbonds', name: 'Corporate Bonds',    sym: 'CORP-BONDS', cat: 'fixed',       tier: 2, glyph: '\u{1F4C8}' },

    { id: 'pld',   name: 'Prologis — Logistics Real Estate', sym: 'PLD',  cat: 'realestate', tier: 2, icon: investLogo('prologis.com') },
    { id: 'o',     name: 'Realty Income — REIT',            sym: 'O',    cat: 'realestate', tier: 2, icon: investLogo('realtyincome.com') },
    { id: 'eqix',  name: 'Equinix — Data Centre Real Estate', sym: 'EQIX', cat: 'realestate', tier: 2, icon: investLogo('equinix.com') },

    // ── TIER 3 · ELITE ─────────────────────────────────────────────────────
    { id: 'asml',  name: 'ASML Holding',           sym: 'ASML',       cat: 'stocks',      tier: 3, icon: investLogo('asml.com') },
    { id: 'arm',   name: 'Arm Holding',           sym: 'ARM',        cat: 'stocks',      tier: 3, icon: investLogo('arm.com') },
    { id: 'crwd',  name: 'CrowdStrike',            sym: 'CRWD',       cat: 'stocks',      tier: 3, icon: investLogo('crowdstrike.com') },
    { id: 'anet',  name: 'Arista Networks',        sym: 'ANET',       cat: 'stocks',      tier: 3, icon: investLogo('arista.com') },
    { id: 'vrt',   name: 'Vertiv',                 sym: 'VRT',        cat: 'stocks',      tier: 3, icon: investLogo('vertiv.com') },
    { id: 'lly',   name: 'Eli Lilly',              sym: 'LLY',        cat: 'stocks',      tier: 3, icon: investLogo('lilly.com') },
    { id: 'meli',  name: 'MercadoLibre',           sym: 'MELI',       cat: 'stocks',      tier: 3, icon: investLogo('mercadolibre.com') },
    { id: 'spcx',  name: 'SpaceX',                 sym: 'SPCX',       cat: 'stocks',      tier: 3, icon: investLogo('spacex.com') },

    { id: 'botz',  name: 'Global X Robotics & AI ETF',  sym: 'BOTZ', cat: 'etfs',        tier: 3, icon: investLogo('globalxetfs.com') },
    { id: 'ibb',   name: 'iShares Biotechnology ETF',   sym: 'IBB',  cat: 'etfs',        tier: 3, icon: investLogo('ishares.com') },
    { id: 'vug',   name: 'Vanguard Growth ETF',         sym: 'VUG',  cat: 'etfs',        tier: 3, icon: investLogo('vanguard.com') },

    { id: 'sui',   name: 'Sui',                    sym: 'SUI',        cat: 'crypto',      tier: 3 },
    { id: 'render',name: 'Render',                 sym: 'RENDER',     cat: 'crypto',      tier: 3 },
    { id: 'aave',  name: 'Aave',                   sym: 'AAVE',       cat: 'crypto',      tier: 3 },
    { id: 'tao',   name: 'Bittensor',              sym: 'TAO',        cat: 'crypto',      tier: 3 },

    { id: 'film',          name: 'Film Revenue Investment Funds',      sym: 'FILM-FUNDS',        cat: 'funds', tier: 3, glyph: '\u{1F3AC}' },
    { id: 'privatecredit', name: 'Private Credit Funds',               sym: 'PRIVATE-CREDIT',    cat: 'funds', tier: 3, glyph: '\u{1F3E6}' },
    { id: 'invoice',       name: 'Invoice Financing Funds',            sym: 'INVOICE-FUNDS',     cat: 'funds', tier: 3, glyph: '\u{1F9FE}' },
    { id: 'renewable',     name: 'Renewable Energy Investment Funds',  sym: 'RENEWABLE-ENERGY',  cat: 'funds', tier: 3, glyph: '\u{1F331}' },
    { id: 'healthcare',    name: 'Healthcare & Pharmaceutical Funds',  sym: 'HEALTHCARE-FUNDS',  cat: 'funds', tier: 3, glyph: '\u{1FA7A}' },
    { id: 'infra',         name: 'Infrastructure Investment Funds',    sym: 'INFRASTRUCTURE-FUNDS', cat: 'funds', tier: 3, glyph: '\u{1F3D7}\u{FE0F}' }
];

// Assets included in a tier (cumulative: Starter ⊂ Premium ⊂ Elite).
window.getCatalogueForTier = function (tier) {
    var rank = window.INVEST_TIER_RANK[tier] || 0;
    if (!rank) return [];
    return window.INVEST_CATALOG.filter(function (a) { return a.tier <= rank; }).map(function (a) {
        return { id: a.id, name: a.name, sym: a.sym, cat: a.cat, icon: a.icon || '', glyph: a.glyph || '' };
    });
};

// Same list, grouped by category, in the display order above.
window.getCatalogueGroups = function (tier) {
    var assets = window.getCatalogueForTier(tier);
    return window.INVEST_CATEGORIES.map(function (c) {
        return {
            key: c.key,
            label: c.label,
            icon: c.icon,
            items: assets.filter(function (a) { return a.cat === c.key; })
        };
    }).filter(function (g) { return g.items.length > 0; });
};


