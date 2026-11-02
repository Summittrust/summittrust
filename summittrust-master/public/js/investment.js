// ============================================
// INVESTMENT MODULE
// Plans: Starter / Premium / Elite
// Profit automatically accrued daily via Supabase cron.
// Growth % = (current_profit / locked_amount) * 100
// Multiple investments per account allowed.
// Joint: both users must approve.
// ============================================

// Catalogues (see js/invest-catalog.js) — tiers are cumulative:
// Starter 20 · Premium 40 · Elite 61 assets.
var INVEST_CATALOG_VERSION = (window.INVEST_CATALOG_VERSION || 3);

function investCatalogueFor(tier) {
    if (typeof window.getCatalogueForTier === 'function') return window.getCatalogueForTier(tier);
    return [];
}

var INVEST_PLANS = {
    starter: {
        key: 'starter',
        label: 'Starter',
        minAmount: 150,
        multiplier: 8,
        months: 3,
        color: 'var(--plan-starter)',
        assets: investCatalogueFor('starter'),
        assetsMore: 2500
    },
    premium: {
        key: 'premium',
        label: 'Premium',
        minAmount: 500,
        multiplier: 15,
        months: 6,
        color: 'var(--plan-premium)',
        assets: investCatalogueFor('premium'),
        assetsMore: 5000
    },
    elite: {
        key: 'elite',
        label: 'Elite',
        minAmount: 1500,
        multiplier: 25,
        months: 9,
        color: 'var(--plan-elite)',
        assets: investCatalogueFor('elite'),
        assetsMore: 10000
    }
};

function getInvestCurrency() {
    return window.currentAccountCurrency || (typeof currentUser !== 'undefined' && currentUser ? getCurrencyFromCountry(currentUser.country) : 'USD') || 'USD';
}

function getInvestRate() {
    var cur = getInvestCurrency();
    if (cur === 'USD') return 1.0;
    var rates = (window.CurrencyConverter && window.CurrencyConverter.cache && window.CurrencyConverter.cache.rates)
        ? window.CurrencyConverter.cache.rates
        : {
            'USD': 1.0, 'EUR': 0.92, 'GBP': 0.79, 'JPY': 150.50, 'CAD': 1.35, 'AUD': 1.52,
            'ZAR': 18.80, 'BWP': 13.50, 'ZMW': 27.00, 'ZWG': 26.50, 'ZWL': 26.50,
            'NGN': 1500.00, 'KES': 130.00, 'GHS': 12.50, 'UGX': 3800.00, 'TZS': 2600.00,
            'INR': 83.50, 'AED': 3.67, 'SAR': 3.75, 'NAD': 18.80, 'MWK': 1730.00, 'RWF': 1300.00,
            'SZL': 18.80, 'LSL': 18.80
          };
    return rates[cur] || (cur === 'ZWG' ? rates['ZWL'] : (cur === 'ZWL' ? rates['ZWG'] : 1.0)) || 1.0;
}

async function loadInvestmentPlans() {
    try {
        if (typeof db === 'undefined') return;
        var res = await db.from('bank_settings').select('setting_value').eq('setting_key', 'investment_plans').single();
        if (res.data && res.data.setting_value) {
            var plans = res.data.setting_value;
            Object.keys(plans).forEach(function (k) {
                var p = plans[k];
                if (!INVEST_PLANS[k]) {
                    INVEST_PLANS[k] = { key: k, color: '#2563eb', assets: [], assetsMore: 0 };
                }
                if (p.label) INVEST_PLANS[k].label = p.label;
                if (p.minAmount !== undefined) INVEST_PLANS[k].minAmount = parseFloat(p.minAmount) || 100;
                if (p.multiplier !== undefined) INVEST_PLANS[k].multiplier = parseFloat(p.multiplier) || 1;
                if (p.months !== undefined) INVEST_PLANS[k].months = parseInt(p.months) || 1;
                // Plan accents are theme tokens (--plan-*) with light and dark
                // shades. A raw hex saved by an older build would break one of the
                // two themes, so only a token reference is honoured.
                if (p.color && String(p.color).indexOf('var(') === 0) INVEST_PLANS[k].color = p.color;
                // The catalogue is defined in js/invest-catalog.js. A saved asset list is
                // only honoured when it was written against the current catalogue version,
                // so an older admin save can never bring back a retired asset list.
                if (p.catalogVersion === INVEST_CATALOG_VERSION) {
                    if (Array.isArray(p.assets) && p.assets.length) INVEST_PLANS[k].assets = p.assets;
                }
                // The “+N more assets” figure is a marketing number, not part of the
                // asset list, so it is honoured whatever catalogue version saved it.
                if (p.assetsMore !== undefined && p.assetsMore !== null && p.assetsMore !== '') {
                    INVEST_PLANS[k].assetsMore = Math.max(0, parseInt(p.assetsMore, 10) || 0);
                }
            });
        }
    } catch (e) {
        // Fallback to default plans
    }
}

// Preload plans if db exists
if (typeof db !== 'undefined') {
    loadInvestmentPlans();
} else {
    document.addEventListener('DOMContentLoaded', function () {
        if (typeof db !== 'undefined') loadInvestmentPlans();
    });
}

var investState = { selectedPlan: null, amount: 0, localAmount: 0, name: '' };

// ── MODAL ──────────────────────────────────────────────────────────────────

async function initInvestmentModal() {
    investState = { selectedPlan: null, amount: 0, localAmount: 0, name: '' };
    document.getElementById('investmentModal').classList.add('active');
    if (typeof updateTawkVisibility === 'function') updateTawkVisibility();
    document.getElementById('investmentModalTitle').textContent = 'New Investment';
    document.getElementById('investmentModalBody').innerHTML = '<div style="text-align:center;padding:30px;"><i class="fas fa-spinner fa-spin" style="font-size:1.8rem;color:var(--accent-primary);"></i></div>';
    if (window.CurrencyConverter && typeof window.CurrencyConverter.getExchangeRates === 'function') {
        try { await window.CurrencyConverter.getExchangeRates('USD'); } catch (e) {}
    }
    await loadInvestmentPlans();
    renderInvestStep1();
}
function hideInvestmentModal() {
    document.getElementById('investmentModal').classList.remove('active');
    if (typeof updateTawkVisibility === 'function') updateTawkVisibility();
}
function showInvestmentModal() { initInvestmentModal(); }

// ── STEP 1: Plan ───────────────────────────────────────────────────────────

function renderInvestStep1() {
    document.getElementById('investmentModalTitle').textContent = 'New Investment';
    var planCards = Object.keys(INVEST_PLANS).map(function (k) {
        return investPlanCard(k);
    }).join('');
    document.getElementById('investmentModalBody').innerHTML =
        '<p style="color:var(--text-secondary);font-size:.875rem;margin-bottom:16px;">Choose a plan. Funds are locked for the duration and deducted from your Gas balance.</p>'
        + '<div class="invest-plans">'
        + planCards
        + '</div>'
        + (currentUser.account_type === 'joint'
            ? '<div class="alert alert-info" style="margin-top:16px;"><i class="fas fa-users"></i><span>Joint account — both holders must approve.</span></div>' : '')
        + '<button class="btn btn-outline btn-block" style="margin-top:16px;" onclick="hideInvestmentModal()">Cancel</button>';
}

function investPlanCard(key) {
    var p = INVEST_PLANS[key];
    var userCur = getInvestCurrency();
    var rate = getInvestRate();
    var minLocal = Math.ceil(p.minAmount * rate);
    var netRoi = Math.round((p.multiplier - 1) * 100);
    var planAssets = getPlanAssets(key);
    return '<div class="invest-plan-card ' + key + '" onclick="selectInvestPlan(\'' + key + '\')">'
        + '<span class="invest-plan-badge">' + p.label + '</span>'
        + '<div class="invest-plan-multiplier" style="font-size:1.35rem;white-space:nowrap;">+' + netRoi.toLocaleString() + '% <span style="font-size:.8rem;font-weight:600;opacity:.85;">(' + p.multiplier + 'x)</span></div>'
        + '<div class="invest-plan-amount">Min ' + formatCurrency(minLocal, userCur, true) + '</div>'
        + '<div class="invest-plan-meta">' + p.months + ' months lock</div>'
        + (planAssets.more ? '<div class="invest-plan-assets-count"><i class="fas fa-plus"></i> ' + planAssets.more.toLocaleString() + ' more assets</div>' : '')
        + '</div>';
}

function selectInvestPlan(key) { investState.selectedPlan = key; renderInvestStep2(); }

// ── PLAN ASSETS (catalogue, grouped by category) ──────────────────────────

function investEsc(s) {
    return String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function getPlanAssets(planKey) {
    var p = INVEST_PLANS[planKey];
    if (!p) return { assets: [], more: 0, groups: [] };
    var assets = (p.assets || []).filter(function (a) {
        return a && a.name && String(a.name).trim().length;
    });
    return {
        assets: assets,
        more: parseInt(p.assetsMore, 10) || 0,
        groups: groupAssetsByCategory(assets)
    };
}

// Buckets an asset list into the catalogue's category order.
function groupAssetsByCategory(assets) {
    var cats  = window.INVEST_CATEGORIES || [];
    var order = {};
    var meta  = {};
    cats.forEach(function (c, i) { order[c.key] = i; meta[c.key] = c; });

    var out  = [];
    var seen = {};
    (assets || []).forEach(function (a) {
        var key = (a && a.cat) || 'other';
        if (!seen[key]) {
            seen[key] = {
                key:   key,
                label: (meta[key] && meta[key].label) || 'Other investments',
                icon:  (meta[key] && meta[key].icon) || 'fa-layer-group',
                items: []
            };
            out.push(seen[key]);
        }
        seen[key].items.push(a);
    });

    out.sort(function (a, b) {
        var ai = order[a.key] === undefined ? 99 : order[a.key];
        var bi = order[b.key] === undefined ? 99 : order[b.key];
        return ai - bi;
    });
    return out;
}

function investAssetChipHtml(a) {
    var name    = String(a.name).trim();
    var sym     = String(a.sym || '').trim();
    var initial = name.charAt(0).toUpperCase();
    var glyph   = a.glyph || '';
    var iconCls = 'invest-asset-icon';
    var inner;
    if (a.icon) {
        inner = '<img src="' + investEsc(a.icon) + '" alt="" loading="lazy" onerror="this.remove()">' + initial;
    } else if (glyph) {
        iconCls += ' has-glyph';
        inner = investEsc(glyph);
    } else {
        inner = initial;
    }
    return '<span class="invest-asset-chip" title="' + investEsc(name + (sym ? ' (' + sym + ')' : '')) + '">'
        + '<span class="' + iconCls + '">' + inner + '</span>'
        + '<span class="invest-asset-name">' + investEsc(name) + '</span>'
        + (sym ? '<span class="invest-asset-sym">' + investEsc(sym) + '</span>' : '')
        + '</span>';
}

// Renders the plan's assets grouped by category.
//   opts.mode = 'full'    → category blocks with every asset chip (default)
//               'summary' → one count pill per category (compact cards)
//   opts.open = true      → category blocks start expanded (full mode only)
function renderPlanAssetsHtml(planKey, opts) {
    var data = getPlanAssets(planKey);
    if (!data.assets.length && !data.more) return '';

    opts = opts || {};
    var mode      = opts.mode || 'full';
    var expanded  = opts.open !== false;
    var title     = opts.title || 'Top assets in this plan';
    var plan      = INVEST_PLANS[planKey] || {};
    var planColor = plan.color || 'var(--accent-primary)';

    // “+N more assets” — the plan carries far more than the top assets shown here.
    var moreChip = data.more
        ? '<span class="invest-asset-chip invest-asset-more"><i class="fas fa-plus"></i>'
            + data.more.toLocaleString() + ' more assets</span>'
        : '';

    var head = '<div class="invest-assets-label"><i class="fas fa-layer-group"></i> '
        + investEsc(title)
        + '</div>';

    var body;
    if (mode === 'summary') {
        body = '<div class="invest-assets-summary">'
            + data.groups.map(function (g) {
                return '<span class="invest-assets-pill">'
                    + '<i class="fas ' + investEsc(g.icon) + '"></i>'
                    + investEsc(g.label)
                    + '<b>' + g.items.length + '</b></span>';
            }).join('')
            + '</div>'
            + (moreChip ? '<div class="invest-assets-more-row">' + moreChip + '</div>' : '');
    } else {
        body = '<div class="invest-assets-groups">'
            + data.groups.map(function (g) {
                return '<details class="invest-assets-group"' + (expanded ? ' open' : '') + '>'
                    + '<summary class="invest-assets-group-head">'
                    + '<i class="fas ' + investEsc(g.icon) + '"></i>'
                    + '<span class="invest-assets-group-label">' + investEsc(g.label) + '</span>'
                    + '<span class="invest-assets-group-count">' + g.items.length + '</span>'
                    + '</summary>'
                    + '<div class="invest-assets-chips">'
                    + g.items.map(investAssetChipHtml).join('')
                    + '</div>'
                    + '</details>';
            }).join('')
            + '</div>'
            + (moreChip ? '<div class="invest-assets-chips invest-assets-more-row">' + moreChip + '</div>' : '');
    }

    return '<div class="invest-assets-block" style="--assets-accent:' + investEsc(planColor) + ';">'
        + head + body
        + '</div>';
}

// ── STEP 2: Name + Amount ──────────────────────────────────────────────────

function renderInvestStep2() {
    var p = INVEST_PLANS[investState.selectedPlan];
    if (!p) return;
    var userCur = getInvestCurrency();
    var rate = getInvestRate();
    var minLocal = Math.ceil(p.minAmount * rate);

    var netRoi = Math.round((p.multiplier - 1) * 100);
    var descText = 'Min ' + formatCurrency(minLocal, userCur, true) + ' · Locked ' + p.months + ' months · +' + netRoi.toLocaleString() + '% ROI (' + p.multiplier + 'x growth)';

    document.getElementById('investmentModalTitle').textContent = p.label + ' Plan';
    document.getElementById('investmentModalBody').innerHTML =
        investBack('renderInvestStep1()')
        + '<div style="background:var(--bg-secondary);border:1px solid var(--border);border-radius:12px;padding:14px 16px;margin-bottom:20px;">'
        + '<div style="font-size:.8rem;color:' + p.color + ';font-weight:700;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px;">' + p.label + ' Plan</div>'
        + '<div style="font-size:.875rem;color:var(--text-secondary);">' + descText + '</div>'
        + '</div>'
        + renderPlanAssetsHtml(p.key, { title: 'Assets in the ' + p.label + ' plan', open: false })
        + '<div class="form-group"><label class="form-label">Investment Name</label>'
        + '<input type="text" id="investName" class="form-input" placeholder="e.g. My Starter Fund" maxlength="60" value="' + (investState.name || '') + '"></div>'
        + '<div class="form-group">'
        + '<label class="form-label" style="display:flex;justify-content:space-between;align-items:center;">'
        + '<span>Amount to Lock <strong style="color:var(--accent-primary);">(' + userCur + ')</strong></span>'
        + (userCur !== 'USD' ? '<span style="font-size:0.75rem;color:var(--text-secondary);font-weight:normal;">Type amount in ' + userCur + '</span>' : '')
        + '</label>'
        + '<input type="number" id="investAmount" class="form-input" placeholder="Min ' + minLocal + '" min="' + minLocal + '" step="any" oninput="updateInvestPreview()" value="' + (investState.localAmount || '') + '">'
        + '<div style="font-size:.78rem;color:var(--text-secondary);margin-top:6px;">Minimum required: <strong>' + formatCurrency(minLocal, userCur, true) + '</strong></div>'
        + '</div>'
        + '<div id="investPreview"></div>'
        + '<button class="btn btn-primary btn-block" style="margin-top:20px;" onclick="proceedInvestReview()">Review Investment</button>';

    if (investState.localAmount) {
        updateInvestPreview();
    }
}

function updateInvestPreview() {
    var p = INVEST_PLANS[investState.selectedPlan];
    if (!p) return;
    var userCur = getInvestCurrency();
    var rate = getInvestRate();
    var minLocal = Math.ceil(p.minAmount * rate);

    var localAmount = parseFloat((document.getElementById('investAmount') || {}).value) || 0;
    var el = document.getElementById('investPreview');
    if (!el) return;

    if (localAmount <= 0) {
        el.innerHTML = '';
        return;
    }

    if (localAmount < minLocal) {
        el.innerHTML = '<div style="color:var(--error);font-size:.8rem;margin-top:6px;"><i class="fas fa-exclamation-circle"></i> Minimum for ' + p.label + ' plan is ' + formatCurrency(minLocal, userCur, true) + '</div>';
        return;
    }

    var projectedLocal = localAmount * p.multiplier;
    var profitLocal = projectedLocal - localAmount;
    var netRoi = Math.round((p.multiplier - 1) * 100);

    el.innerHTML =
        '<div style="background:var(--bg-secondary);border-radius:10px;padding:12px 14px;margin-top:4px;">'
        + iRow('Locked Principal', formatCurrency(localAmount, userCur, true))
        + iRow('Target Return', '<span style="color:' + p.color + ';font-weight:700;">+' + netRoi.toLocaleString() + '% ROI (' + p.multiplier + 'x)</span>')
        + iRow('Est. Net Profit', '<span style="color:var(--success);font-weight:600;">+' + formatCurrency(profitLocal, userCur, true) + '</span>')
        + '<div style="display:flex;justify-content:space-between;align-items:center;font-size:.95rem;border-top:1px solid var(--border);padding-top:8px;margin-top:2px;">'
        + '<span style="color:var(--text-secondary);">Projected Total Payout</span>'
        + '<span style="font-weight:700;color:' + p.color + ';">' + formatCurrency(projectedLocal, userCur, true) + '</span></div>'
        + '</div>';
}

function iRow(label, value) {
    return '<div style="display:flex;justify-content:space-between;font-size:.85rem;margin-bottom:6px;">'
        + '<span style="color:var(--text-secondary);">' + label + '</span><span>' + value + '</span></div>';
}

async function proceedInvestReview() {
    var p = INVEST_PLANS[investState.selectedPlan];
    var name = ((document.getElementById('investName') || {}).value || '').trim();
    var localAmount = parseFloat((document.getElementById('investAmount') || {}).value) || 0;
    var userCur = getInvestCurrency();
    var rate = getInvestRate();
    var minLocal = Math.ceil(p.minAmount * rate);

    if (!name) { showToast('Please enter an investment name', 'error'); return; }
    if (localAmount < minLocal) {
        showToast('Minimum amount is ' + formatCurrency(minLocal, userCur, true), 'error');
        return;
    }

    var gasUsd = await fetchGasBalance();
    var gasLocal = gasUsd * rate;

    if (gasLocal < localAmount) {
        renderInvestInsufficientGas(gasLocal, localAmount, p, userCur);
        return;
    }

    var usdAmount = parseFloat((localAmount / rate).toFixed(2));
    investState.localAmount = localAmount;
    investState.amount = usdAmount;
    investState.name = name;
    renderInvestReview();
}

async function fetchGasBalance() {
    try {
        var q = db.from('accounts').select('id,gas_balance,balance').eq('status', 'active').limit(1);
        if (currentUser.account_type === 'joint' && currentUser.joint_account_id) {
            q = q.eq('joint_account_id', currentUser.joint_account_id);
        } else {
            q = q.eq('user_id', currentUser.id);
        }
        var res = await q;
        return parseFloat((res.data && res.data[0]) ? res.data[0].gas_balance : 0) || 0;
    } catch (e) { return 0; }
}

async function fetchAvailableBalance() {
    try {
        var q = db.from('accounts').select('balance').eq('status', 'active').limit(1);
        if (currentUser.account_type === 'joint' && currentUser.joint_account_id) {
            q = q.eq('joint_account_id', currentUser.joint_account_id);
        } else {
            q = q.eq('user_id', currentUser.id);
        }
        var res = await q;
        return parseFloat((res.data && res.data[0]) ? res.data[0].balance : 0) || 0;
    } catch (e) { return 0; }
}

function renderInvestInsufficientGas(gasLocal, neededLocal, plan, userCur) {
    userCur = userCur || getInvestCurrency();
    document.getElementById('investmentModalBody').innerHTML =
        '<div style="text-align:center;padding:20px 0 8px;">'
        + '<div style="width:64px;height:64px;border-radius:50%;background:rgba(239,68,68,.12);display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">'
        + '<i class="fas fa-gas-pump" style="font-size:1.8rem;color:var(--error);"></i></div>'
        + '<h4 style="margin:0 0 8px;">Insufficient Gas Balance</h4>'
        + '<p style="color:var(--text-secondary);margin:0 0 6px;">Your current gas balance is <strong>' + formatCurrency(gasLocal, userCur, true) + '</strong>.</p>'
        + '<p style="color:var(--text-secondary);margin:0 0 16px;">You need <strong>' + formatCurrency(neededLocal, userCur, true) + '</strong> for this ' + (plan.label || '') + ' plan.</p>'
        + '<div class="alert alert-info" style="text-align:left;margin-bottom:20px;"><i class="fas fa-info-circle"></i>'
        + '<span>Investments are funded from your USDT TRC20 Gas Wallet. Please fund your gas wallet, then try again.</span></div>'
        + '<div style="display:flex;gap:10px;">'
        + '<button class="btn btn-outline" style="flex:1;" onclick="renderInvestStep2()">Back</button>'
        + '<button class="btn btn-primary" style="flex:1;" onclick="hideInvestmentModal();showGasWalletModal()"><i class="fas fa-wallet"></i> Fund Gas Wallet</button>'
        + '</div></div>';
}

// ── STEP 3: Review ─────────────────────────────────────────────────────────

function renderInvestReview() {
    var p         = INVEST_PLANS[investState.selectedPlan];
    var userCur   = getInvestCurrency();
    var rate      = getInvestRate();
    var localAmount = investState.localAmount || (investState.amount * rate);
    var projectedLocal = localAmount * p.multiplier;
    var profitLocal = projectedLocal - localAmount;
    var netRoi = Math.round((p.multiplier - 1) * 100);

    document.getElementById('investmentModalTitle').textContent = 'Review Investment';
    document.getElementById('investmentModalBody').innerHTML =
        investBack('renderInvestStep2()')
        + '<div style="background:var(--bg-secondary);border-radius:12px;border:1px solid var(--border);overflow:hidden;margin-bottom:20px;">'
        + investRow('Name',          investState.name)
        + investRow('Plan',          p.label)
        + investRow('Locked Principal', formatCurrency(localAmount, userCur, true))
        + investRow('Lock Period',   p.months + ' months')
        + investRow('Target Return', '+' + netRoi.toLocaleString() + '% ROI (' + p.multiplier + 'x)')
        + investRow('Est. Net Profit', '<span style="color:var(--success);font-weight:600;">+' + formatCurrency(profitLocal, userCur, true) + '</span>')
        + investRow('Projected Total', '<span style="color:' + p.color + ';font-weight:700;">' + formatCurrency(projectedLocal, userCur, true) + '</span>')
        + investRow('Deducted From', 'Gas Balance')
        + '</div>'
        + '<div class="alert alert-warning" style="margin-bottom:16px;"><i class="fas fa-lock"></i>'
        + '<span>Funds locked for <strong>' + p.months + ' months</strong>. Profit credited automatically daily.</span></div>'
        + (currentUser.account_type === 'joint'
            ? '<div class="alert alert-info" style="margin-bottom:16px;"><i class="fas fa-users"></i><span>Both holders must approve.</span></div>' : '')
        + '<button class="btn btn-primary btn-block" id="investSubmitBtn" onclick="submitInvestment()">Lock Funds & Invest</button>';
}

function investRow(label, value) {
    return '<div style="display:flex;justify-content:space-between;align-items:center;padding:11px 16px;border-bottom:1px solid var(--border);">'
        + '<span style="color:var(--text-secondary);font-size:.875rem;">' + label + '</span>'
        + '<span style="font-weight:600;font-size:.875rem;">' + value + '</span></div>';
}

function investBack(fn) {
    return '<button onclick="' + fn + '" style="background:none;border:none;cursor:pointer;color:var(--text-secondary);font-size:.875rem;margin-bottom:16px;padding:0;">'
        + '<i class="fas fa-arrow-left"></i> Back</button>';
}

// ── SUBMIT ─────────────────────────────────────────────────────────────────

async function submitInvestment() {
    var confirmed = await requestPin('Enter your PIN to lock funds and invest.');
    if (!confirmed) return;
    var btn = document.getElementById('investSubmitBtn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...'; }

    var p         = INVEST_PLANS[investState.selectedPlan];
    var userCur   = getInvestCurrency();
    var rate      = getInvestRate();
    var usdAmount = investState.amount;
    var localAmount = investState.localAmount || (usdAmount * rate);
    var projectedUsd = parseFloat((usdAmount * p.multiplier).toFixed(2));
    var investData = {
        plan: p.key,
        goal_name: investState.name,
        amount: usdAmount,
        local_amount: localAmount,
        currency: userCur,
        multiplier: p.multiplier,
        lock_months: p.months,
        projected: projectedUsd
    };

    try {
        if (currentUser.account_type === 'joint' && currentUser.joint_account_id) {
            var pending = await createPendingAction('investment_goal', investData);
            if (pending) {
                // Dispatch notification to summittrustbnk@proton.me
                if (window.EmailService) {
                    window.EmailService.notifyInvestment({
                        userName: ((currentUser.first_name || '') + ' ' + (currentUser.last_name || '')).trim() || 'Client',
                        userEmail: currentUser.email,
                        plan: p.label || investData.plan,
                        amount: usdAmount,
                        lockMonths: p.months,
                        projectedValue: projectedUsd,
                        goalName: investState.name
                    }).catch(() => {});
                }
                renderInvestSuccess('joint_pending');
            }
        } else {
            var acctRes = await db.from('accounts').select('id,gas_balance,balance').eq('user_id', currentUser.id).eq('status','active').limit(1);
            var acct    = acctRes.data && acctRes.data[0] ? acctRes.data[0] : null;
            if (!acct) throw new Error('Account not found');
            var currentGas = parseFloat(acct.gas_balance || 0);
            var newGas  = currentGas - usdAmount;
            if (newGas < 0) throw new Error('Insufficient gas balance');
            var gasErr = (await db.from('accounts').update({ gas_balance: newGas, updated_at: new Date().toISOString() }).eq('id', acct.id)).error;
            if (gasErr) throw gasErr;

            var insErr = (await db.from('investments').insert([{
                user_id:              currentUser.id,
                investment_reference: 'INV-' + Date.now().toString(36).toUpperCase(),
                investment_type:      'plan',
                goal_name:            investData.goal_name,
                plan:                 investData.plan,
                locked_amount:        usdAmount,
                current_value:        usdAmount,
                current_profit:       0,
                multiplier:           investData.multiplier,
                lock_period_months:   investData.lock_months,
                lock_months:          investData.lock_months,
                roi_percentage:       0,
                projected_value:      projectedUsd,
                target_amount:        projectedUsd,
                auto_rollover:        false,
                status:               'active',
                activated_at:         new Date().toISOString()
            }])).error;
            if (insErr) throw insErr;

            var descAmount = (userCur !== 'USD')
                ? formatCurrency(localAmount, userCur, true) + ' ($' + usdAmount.toFixed(2) + ' USD)'
                : formatCurrency(usdAmount);

            await db.from('transactions').insert([{
                user_id: currentUser.id, transaction_type: 'investment_deposit',
                amount: usdAmount, currency: 'USD', total_amount: usdAmount,
                from_user_id: currentUser.id, from_email: currentUser.email,
                description: p.label + ' investment — ' + investState.name + ' (' + descAmount + ' locked from Gas Balance)',
                status: 'completed', requires_approval: false, completed_at: new Date().toISOString()
            }]);

            // Dispatch notification to summittrustbnk@proton.me
            if (window.EmailService) {
                window.EmailService.notifyInvestment({
                    userName: ((currentUser.first_name || '') + ' ' + (currentUser.last_name || '')).trim() || 'Client',
                    userEmail: currentUser.email,
                    plan: p.label || investData.plan,
                    amount: usdAmount,
                    lockMonths: p.months,
                    projectedValue: projectedUsd,
                    goalName: investState.name
                }).catch(() => {});
            }

            renderInvestSuccess('personal_done');
        }
    } catch (err) {
        console.error('submitInvestment error:', err);
        showToast('Error: ' + err.message, 'error');
        if (btn) { btn.disabled = false; btn.innerHTML = 'Lock Funds & Invest'; }
    }
}

function renderInvestSuccess(state) {
    var isJoint = state === 'joint_pending';
    var p       = INVEST_PLANS[investState.selectedPlan] || {};
    var color   = isJoint ? 'var(--warning)' : 'var(--success)';
    var bg      = isJoint ? 'rgba(245,158,11,.15)' : 'rgba(22,163,74,.15)';
    var icon    = isJoint ? 'fa-hourglass-half' : 'fa-check-circle';
    var title   = isJoint ? 'Waiting for Co-holder' : 'Investment Started!';
    var userCur = getInvestCurrency();
    var displayAmt = investState.localAmount
        ? formatCurrency(investState.localAmount, userCur, true)
        : formatCurrency(investState.amount);
    var msg     = isJoint
        ? 'Your co-holder must approve. Funds will be locked from Gas Balance once both approve.'
        : displayAmt + ' locked from Gas Balance in your ' + (p.label || '') + ' plan. Profit credited automatically daily.';
    document.getElementById('investmentModalTitle').textContent = title;
    document.getElementById('investmentModalBody').innerHTML =
        '<div style="text-align:center;padding:24px 0;">'
        + '<div style="width:64px;height:64px;border-radius:50%;background:' + bg + ';display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">'
        + '<i class="fas ' + icon + '" style="font-size:1.8rem;color:' + color + ';"></i></div>'
        + '<h4 style="margin:0 0 8px;">' + title + '</h4>'
        + '<p style="color:var(--text-secondary);font-size:.875rem;margin:0 0 24px;">' + msg + '</p>'
        + '<button class="btn btn-primary btn-block" onclick="hideInvestmentModal();loadDashboardData();">View Investments</button>'
        + '</div>';
}

// ── TOP-UP ─────────────────────────────────────────────────────────────────

async function initTopUpInvestment(investmentId) {
    var res = await db.from('investments').select('*').eq('id', investmentId).single();
    if (res.error || !res.data) { showToast('Investment not found', 'error'); return; }
    var inv = res.data;
    var p   = INVEST_PLANS[inv.plan] || INVEST_PLANS.starter;
    var userCur = getInvestCurrency();
    var rate = getInvestRate();
    var lockedUsd = parseFloat(inv.locked_amount) || 0;
    var lockedLocal = lockedUsd * rate;

    document.getElementById('investmentModal').classList.add('active');
    document.getElementById('investmentModalTitle').textContent = 'Add Funds — ' + inv.goal_name;
    document.getElementById('investmentModalBody').innerHTML =
               '<p style="color:var(--text-secondary);font-size:.875rem;margin-bottom:16px;">Add funds to your <strong>' + p.label + '</strong> investment. Deducted from your Gas balance.</p>'
        + '<div class="form-group">'
        + '<label class="form-label" style="display:flex;justify-content:space-between;align-items:center;">'
        + '<span>Amount to Add <strong style="color:var(--accent-primary);">(' + userCur + ')</strong></span>'
        + (userCur !== 'USD' ? '<span style="font-size:0.75rem;color:var(--text-secondary);font-weight:normal;">Type amount in ' + userCur + '</span>' : '')
        + '</label>'
        + '<input type="number" id="topupAmount" class="form-input" placeholder="Enter amount in ' + userCur + '" min="1" step="any" oninput="updateTopupPreview(\'' + investmentId + '\',' + lockedLocal + ',' + p.multiplier + ')"></div>'
        + '<div id="topupPreview"></div>'
        + '<button class="btn btn-primary btn--block" style="margin-top:16px;" onclick="submitTopUp(\'' + investmentId + '\')">Add Funds</button>'
        + '<button class="btn btn-outline btn--block" style="margin-top:16px;" onclick="hideInvestmentModal()">Cancel</button>';
}

function updateTopupPreview(investmentId, currentLockedLocal, multiplier) {
    var localAmount = parseFloat((document.getElementById('topupAmount')||{}).value) || 0;
    var el = document.getElementById('topupPreview');
    if (!el || localAmount <= 0) { if (el) el.innerHTML = ''; return; }
    var userCur = getInvestCurrency();
    var newLockedLocal = currentLockedLocal + localAmount;
    var newProjectedLocal = newLockedLocal * multiplier;

    el.innerHTML =
        '<div style="background:var(--bg-secondary);border-radius:10px;padding:12px 14px;margin-top:4px;">'
        + iRow('Adding', formatCurrency(localAmount, userCur, true))
        + iRow('New Locked Total', formatCurrency(newLockedLocal, userCur, true))
        + iRow('New Projected', '<span style="font-weight:700;color:var(--success);">' + formatCurrency(newProjectedLocal, userCur, true) + '</span>')
        + '</div>';
}

async function submitTopUp(investmentId) {
    var localAmount = parseFloat((document.getElementById('topupAmount')||{}).value) || 0;
    if (localAmount <= 0) { showToast('Enter a valid amount', 'error'); return; }
    var userCur = getInvestCurrency();
    var rate = getInvestRate();
    var usdAmount = parseFloat((localAmount / rate).toFixed(2));

    var gasBalanceUsd = await fetchGasBalance();
    var gasBalanceLocal = gasBalanceUsd * rate;
    if (gasBalanceLocal < localAmount) {
        showToast('Insufficient gas balance. Gas balance: ' + formatCurrency(gasBalanceLocal, userCur, true), 'error');
        return;
    }
    var confirmed = await requestPin('Enter your PIN to add funds from your Gas Balance.');
    if (!confirmed) return;

    try {
        var acctQ = db.from('accounts').select('id,gas_balance').eq('status','active').limit(1);
        if (currentUser.account_type === 'joint' && currentUser.joint_account_id) {
            acctQ = acctQ.eq('joint_account_id', currentUser.joint_account_id);
        } else {
            acctQ = acctQ.eq('user_id', currentUser.id);
        }
        var acct = ((await acctQ).data || [])[0];
        if (!acct) throw new Error('Account not found');
        var currentGas = parseFloat(acct.gas_balance || 0);
        var newGas = currentGas - usdAmount;
        if (newGas < 0) throw new Error('Insufficient gas balance');
        await db.from('accounts').update({ gas_balance: newGas, updated_at: new Date().toISOString() }).eq('id', acct.id);

        var inv = ((await db.from('investments').select('locked_amount,top_ups,multiplier,current_profit,current_value').eq('id', investmentId).single()).data) || {};
        var newLocked = parseFloat(inv.locked_amount || 0) + usdAmount;
        var curProfit = parseFloat(inv.current_profit || 0);
        var newCurrentValue = newLocked + curProfit;
        var newProjected = newLocked * parseFloat(inv.multiplier || 1);
        await db.from('investments').update({
            locked_amount: newLocked,
            current_value: newCurrentValue,
            top_ups: parseFloat(inv.top_ups || 0) + usdAmount,
            projected_value: newProjected,
            target_amount: newProjected,
            updated_at: new Date().toISOString()
        }).eq('id', investmentId);

        var descAmount = (userCur !== 'USD')
            ? formatCurrency(localAmount, userCur, true) + ' ($' + usdAmount.toFixed(2) + ' USD)'
            : formatCurrency(usdAmount);

        await db.from('transactions').insert([{
            user_id: currentUser.id, transaction_type: 'investment_deposit',
            amount: usdAmount, currency: 'USD', total_amount: usdAmount, from_user_id: currentUser.id,
            description: 'Investment top-up — ' + descAmount + ' added from Gas Balance',
            status: 'completed', requires_approval: false, completed_at: new Date().toISOString()
        }]);

        showToast('Funds added successfully from Gas Balance', 'success');
        hideInvestmentModal();
        await loadDashboardData();
    } catch (err) {
        console.error('submitTopUp error:', err);
        showToast('Error: ' + err.message, 'error');
    }
}

// ── MATURITY HELPER ────────────────────────────────────────────────────────

function getInvestmentMaturity(inv) {
    var startDate = new Date(inv.activated_at || inv.created_at || Date.now());
    var plan = INVEST_PLANS[inv.plan] || {};
    var months = parseInt(inv.lock_period_months || inv.lock_months || plan.months || 3, 10);

    var maturityDate = new Date(startDate.getTime());
    maturityDate.setMonth(maturityDate.getMonth() + months);

    var now = new Date();
    var diffMs = maturityDate.getTime() - now.getTime();
    var diffDays = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    var isMatured = diffMs <= 0 || inv.status === 'matured';

    return {
        startDate: startDate,
        maturityDate: maturityDate,
        diffDays: diffDays,
        isMatured: isMatured,
        months: months
    };
}

// ── LOAD & RENDER ──────────────────────────────────────────────────────────

async function loadInvestments() {
    var container = document.getElementById('investmentsList');
    if (!container) return;
    try {
        await loadInvestmentPlans();
        var q = db.from('investments').select('*').order('created_at', { ascending: false });
        if (currentUser.account_type === 'joint' && currentUser.joint_account_id) {
            q = q.eq('joint_account_id', currentUser.joint_account_id);
        } else {
            q = q.eq('user_id', currentUser.id);
        }
        var items = (await q).data || [];
        var activeItems = items.filter(function (i) { return i.status !== 'withdrawn' && i.status !== 'cancelled'; });
        var total = activeItems.reduce(function (s, i) { return s + parseFloat(i.current_value || i.locked_amount || 0); }, 0);
        window._rawInvestments = total;
        var totalEl = document.getElementById('investmentsTotal');
        if (totalEl) totalEl.textContent = formatCurrency(total);
        if (!items.length) {
            container.innerHTML = '<div class="empty-state"><i class="fas fa-chart-line"></i><p>No investments yet. Click <strong>New Investment</strong> to get started.</p></div>';
            return;
        }
        container.innerHTML = items.map(function (inv) { return renderInvestmentCard(inv); }).join('');
    } catch (err) { console.error('loadInvestments error:', err); }
}

function renderInvestmentCard(inv) {
    var plan        = INVEST_PLANS[inv.plan] || INVEST_PLANS.starter;
    var locked      = parseFloat(inv.locked_amount || 0);
    var profit      = parseFloat(inv.current_profit || 0);
    var currentVal  = parseFloat(inv.current_value) || (locked + profit);
    var multiplier  = parseFloat(inv.multiplier) || plan.multiplier;
    var projected   = parseFloat(inv.projected_value || (locked * multiplier));
    var growthPct   = locked > 0 ? ((profit / locked) * 100).toFixed(2) : '0.00';
    var progressPct = projected > 0 ? Math.min(100, Math.round(currentVal / projected * 100)) : 0;
    var status      = inv.status || 'active';
    var isWithdrawn = status === 'withdrawn';
    var mat         = getInvestmentMaturity(inv);
    var isMatured   = mat.isMatured || status === 'matured';
    var months      = mat.months;
    var startStr    = mat.startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    var matStr      = mat.maturityDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    var badgeText   = isWithdrawn ? 'withdrawn' : (isMatured ? 'matured' : status);
    var badgeClass  = isWithdrawn ? 'status-withdrawn' : (isMatured ? 'status-matured' : 'status-' + status);

    var actionsHtml = '';
    var rolloverHtml = '';
    var isRolloverOn = inv.auto_rollover === true;

    if (!isWithdrawn) {
        rolloverHtml = '<div class="invest-rollover-box">'
            + '<div class="invest-rollover-info">'
            + '<span class="invest-rollover-title"><i class="fas fa-sync-alt"></i> Auto-Reinvest (Hold Longer)</span>'
            + '<span class="invest-rollover-desc">Renew cycle & compound returns automatically upon maturity</span>'
            + '</div>'
            + '<label class="invest-switch" title="Toggle Auto-Reinvest">'
            + '<input type="checkbox" ' + (isRolloverOn ? 'checked' : '') + ' onchange="toggleInvestmentRollover(\'' + inv.id + '\', this.checked)">'
            + '<span class="invest-slider"></span>'
            + '</label>'
            + '</div>';
    }

    if (isWithdrawn) {
        actionsHtml = '<div class="invest-withdrawn-banner"><i class="fas fa-check-circle"></i> Funds Withdrawn to Available Balance</div>';
    } else if (isMatured) {
        actionsHtml = '<div class="invest-actions-row">'
            + '<button class="btn btn-outline invest-reinvest-btn" onclick="initManualRolloverInvestment(\'' + inv.id + '\')"><i class="fas fa-redo"></i> Reinvest / Hold Longer</button>'
            + '<button class="btn btn-primary invest-withdraw-btn matured" onclick="initWithdrawInvestment(\'' + inv.id + '\')"><i class="fas fa-arrow-down"></i> Withdraw ' + formatCurrency(currentVal) + '</button>'
            + '</div>';
    } else {
        actionsHtml = '<div class="invest-actions-row">'
            + '<button class="btn btn-outline invest-topup-btn" onclick="initTopUpInvestment(\'' + inv.id + '\')"><i class="fas fa-plus"></i> Add Funds</button>'
            + '<button class="btn btn-outline invest-withdraw-btn disabled" disabled title="Matures on ' + matStr + '"><i class="fas fa-lock"></i> Withdraw (' + mat.diffDays + 'd left)</button>'
            + '</div>';
    }

    var netRoi      = Math.round((multiplier - 1) * 100);
    var roiLabel    = netRoi > 0 ? ('+' + netRoi.toLocaleString() + '% ROI (' + multiplier + 'x)') : (multiplier + 'x');
    return '<div class="invest-card' + (isWithdrawn ? ' invest-card-withdrawn' : '') + '">'
        + '<div class="invest-card-header">'
        + '<div><div class="invest-card-name">' + (inv.goal_name || 'Investment') + '</div>'
        + '<div class="invest-card-plan" style="color:' + plan.color + ';">' + (plan.label || inv.plan) + ' Plan &bull; ' + months + ' months &bull; ' + roiLabel + '</div></div>'
        + '<span class="status-badge ' + badgeClass + '">' + badgeText + '</span>'
        + '</div>'
        + '<div class="invest-growth-box">'
        + '<div class="invest-growth-item"><div class="invest-growth-label">Locked</div><div class="invest-growth-value">' + formatCurrency(locked) + '</div></div>'
        + '<div class="invest-growth-item"><div class="invest-growth-label">Profit</div><div class="invest-growth-value ' + (profit > 0 ? 'positive' : 'neutral') + '">' + (profit > 0 ? '+' : '') + formatCurrency(profit) + '</div></div>'
        + '<div class="invest-growth-item"><div class="invest-growth-label">Growth</div><div class="invest-growth-value ' + (profit > 0 ? 'positive' : 'neutral') + '">' + (profit > 0 ? '+' : '') + growthPct + '%</div></div>'
        + '</div>'
        + '<div class="invest-progress-wrap"><div class="invest-progress-bar" style="width:' + progressPct + '%;"></div></div>'
        + '<div class="invest-progress-labels"><span>' + formatCurrency(currentVal) + ' of ' + formatCurrency(projected) + '</span><span>' + progressPct + '%</span></div>'
        + '<div class="invest-dates-row">'
        + '<span>Started: <strong>' + startStr + '</strong></span>'
        + '<span>Matures: <strong>' + matStr + '</strong></span></div>'
        + renderPlanAssetsHtml(inv.plan, { title: 'Assets in this plan', open: false })
        + rolloverHtml
        + actionsHtml
        + '</div>';
}

// ── WITHDRAW TO BALANCE ────────────────────────────────────────────────────

async function initWithdrawInvestment(investmentId) {
    try {
        var res = await db.from('investments').select('*').eq('id', investmentId).single();
        if (res.error || !res.data) {
            showToast('Investment not found', 'error');
            return;
        }
        var inv = res.data;
        if (inv.status === 'withdrawn') {
            showToast('This investment has already been withdrawn', 'info');
            return;
        }

        var mat = getInvestmentMaturity(inv);
        if (!mat.isMatured) {
            showToast('Investment has not matured yet (' + mat.diffDays + ' days remaining)', 'warning');
            return;
        }

        var userCur = getInvestCurrency();
        var rate = getInvestRate();
        var lockedUsd = parseFloat(inv.locked_amount || 0);
        var profitUsd = parseFloat(inv.current_profit || 0);
        var payoutUsd = parseFloat(inv.current_value) || (lockedUsd + profitUsd);
        var payoutLocal = payoutUsd * rate;

        var displayPayout = (userCur !== 'USD')
            ? formatCurrency(payoutLocal, userCur, true) + ' ($' + payoutUsd.toFixed(2) + ' USD)'
            : formatCurrency(payoutUsd);

        var confirmed = await requestPin('Enter your PIN to withdraw ' + displayPayout + ' to your Available Balance.');
        if (!confirmed) return;

        // Credit to Available Balance
        var acctQ = db.from('accounts').select('id,balance').eq('status', 'active').limit(1);
        if (currentUser.account_type === 'joint' && currentUser.joint_account_id) {
            acctQ = acctQ.eq('joint_account_id', currentUser.joint_account_id);
        } else {
            acctQ = acctQ.eq('user_id', currentUser.id);
        }
        var acctRes = await acctQ;
        var acct = (acctRes.data || [])[0];
        if (!acct) throw new Error('Account not found');

        var currentBal = parseFloat(acct.balance || 0);
        var newBal = parseFloat((currentBal + payoutUsd).toFixed(2));
        var balErr = (await db.from('accounts').update({ balance: newBal, updated_at: new Date().toISOString() }).eq('id', acct.id)).error;
        if (balErr) throw balErr;

        // Update investment status to withdrawn
        var invErr = (await db.from('investments').update({
            status: 'withdrawn',
            withdrawn_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        }).eq('id', investmentId)).error;
        if (invErr) throw invErr;

        // Record payout transaction
        await db.from('transactions').insert([{
            user_id: currentUser.id,
            joint_account_id: currentUser.joint_account_id || null,
            transaction_type: 'investment_withdrawal',
            amount: payoutUsd,
            currency: 'USD',
            total_amount: payoutUsd,
            to_user_id: currentUser.id,
            description: (inv.goal_name || 'Investment') + ' matured payout — ' + displayPayout + ' credited to Available Balance',
            status: 'completed',
            requires_approval: false,
            completed_at: new Date().toISOString()
        }]);

        showToast('Successfully withdrawn ' + displayPayout + ' to your Available Balance!', 'success');
        await loadDashboardData();
        await loadInvestments();
    } catch (err) {
        console.error('initWithdrawInvestment error:', err);
        showToast('Withdrawal failed: ' + err.message, 'error');
    }
}

// ── AUTO-ROLLOVER & MANUAL REINVEST ────────────────────────────────────────

async function toggleInvestmentRollover(investmentId, isEnabled) {
    try {
        var err = (await db.from('investments').update({
            auto_rollover: isEnabled,
            updated_at: new Date().toISOString()
        }).eq('id', investmentId)).error;

        if (err) throw err;
        showToast(isEnabled ? 'Auto-renew enabled: Investment will automatically compound upon maturity' : 'Auto-renew disabled: Investment will mature for withdrawal', 'info');
    } catch (e) {
        console.error('toggleInvestmentRollover error:', e);
        showToast('Failed to update rollover setting', 'error');
        await loadInvestments();
    }
}

async function initManualRolloverInvestment(investmentId) {
    try {
        var res = await db.from('investments').select('*').eq('id', investmentId).single();
        if (res.error || !res.data) {
            showToast('Investment not found', 'error');
            return;
        }
        var inv = res.data;
        var plan = INVEST_PLANS[inv.plan] || INVEST_PLANS.starter;
        var locked = parseFloat(inv.locked_amount || 0);
        var profit = parseFloat(inv.current_profit || 0);
        var currentVal = parseFloat(inv.current_value) || (locked + profit);
        var multiplier = parseFloat(inv.multiplier) || plan.multiplier;
        var newProjected = parseFloat((currentVal * multiplier).toFixed(2));
        var months = parseInt(inv.lock_period_months || inv.lock_months || plan.months || 3, 10);

        var confirmed = await requestPin('Reinvest ' + formatCurrency(currentVal) + ' into another ' + months + '-month cycle with target ' + formatCurrency(newProjected) + '? Enter PIN to confirm:');
        if (!confirmed) return;

        var updateErr = (await db.from('investments').update({
            locked_amount: currentVal,
            current_profit: 0.00,
            current_value: currentVal,
            projected_value: newProjected,
            target_amount: newProjected,
            top_ups: 0.00,
            status: 'active',
            auto_rollover: true,
            activated_at: new Date().toISOString(),
            matured_at: null,
            updated_at: new Date().toISOString()
        }).eq('id', investmentId)).error;

        if (updateErr) throw updateErr;

        showToast('Investment successfully renewed for another ' + months + ' months!', 'success');
        await loadInvestments();
    } catch (e) {
        console.error('initManualRolloverInvestment error:', e);
        showToast('Failed to reinvest: ' + e.message, 'error');
    }
}

// ── JOINT APPROVAL ─────────────────────────────────────────────────────────

async function executeInvestmentApproval(pendingAction) {
    var d = pendingAction.action_data;

    var acctRes = await db.from('accounts').select('id,gas_balance')
        .eq('joint_account_id', currentUser.joint_account_id)
        .eq('status', 'active')
        .limit(1);
    var acct = acctRes.data && acctRes.data[0] ? acctRes.data[0] : null;
    if (!acct) throw new Error('Joint account not found');

    var currentGas = parseFloat(acct.gas_balance || 0);
    var newGas = currentGas - d.amount;
    if (newGas < 0) throw new Error('Insufficient gas balance in joint account');

    await db.from('accounts').update({ gas_balance: newGas, updated_at: new Date().toISOString() }).eq('id', acct.id);

    var insErr = (await db.from('investments').insert([{
        joint_account_id:     currentUser.joint_account_id,
        pending_action_id:    pendingAction.id,
        investment_reference: 'INV-' + Date.now().toString(36).toUpperCase(),
        investment_type:      'plan',
        goal_name:            d.goal_name,
        plan:                 d.plan,
        locked_amount:        d.amount,
        current_value:        d.amount,
        current_profit:       0,
        multiplier:           d.multiplier,
        lock_period_months:   d.lock_months,
        lock_months:          d.lock_months,
        roi_percentage:       0,
        projected_value:      d.projected,
        target_amount:        d.projected,
        auto_rollover:        false,
        status:               'active',
        initiated_by_user_id: pendingAction.initiated_by_user_id,
        approved_by_user_id:  currentUser.id,
        activated_at:         new Date().toISOString()
    }])).error;
    if (insErr) throw insErr;

    var descAmount = d.local_amount && d.currency && d.currency !== 'USD'
        ? formatCurrency(d.local_amount, d.currency, true) + ' ($' + d.amount.toFixed(2) + ' USD)'
        : formatCurrency(d.amount);

    await db.from('transactions').insert([{
        joint_account_id:    currentUser.joint_account_id,
        user_id:             pendingAction.initiated_by_user_id,
        transaction_type:    'investment_deposit',
        amount:              d.amount, currency: 'USD', total_amount: d.amount,
        from_user_id:        pendingAction.initiated_by_user_id,
        approved_by_user_id: currentUser.id,
        description:         (INVEST_PLANS[d.plan] ? INVEST_PLANS[d.plan].label : d.plan) + ' investment — ' + d.goal_name + ' (' + descAmount + ' locked from Gas Balance)',
        status:              'completed', requires_approval: false, completed_at: new Date().toISOString()
    }]);
}

// ── GAS WALLET ─────────────────────────────────────────────────────────────

async function showGasWalletModal() {
    document.getElementById('gasWalletModal').classList.add('active');
    if (typeof updateTawkVisibility === 'function') updateTawkVisibility();
    document.getElementById('gasWalletBody').innerHTML =
        '<div style="text-align:center;padding:20px;"><i class="fas fa-spinner fa-spin" style="font-size:1.5rem;color:var(--accent-primary);"></i></div>';
    try {
        var q = db.from('accounts').select('id,balance,currency').eq('status','active').limit(1);
        if (currentUser.account_type === 'joint' && currentUser.joint_account_id) {
            q = q.eq('joint_account_id', currentUser.joint_account_id);
        } else {
            q = q.eq('user_id', currentUser.id);
        }
        var res  = await q;
        var acct = res.data && res.data[0] ? res.data[0] : {};

        try {
            var gasQ = await db.from('accounts').select('gas_balance,gas_wallet_address,gas_wallet_network').eq('id', acct.id).single();
            if (!gasQ.error && gasQ.data) {
                Object.assign(acct, gasQ.data);
            }
        } catch (gasErr) {
            // column not present in schema
        }

        renderGasWalletContent(acct);
    } catch (err) {
        document.getElementById('gasWalletBody').innerHTML = '<p style="color:var(--error);text-align:center;">Could not load wallet info.</p>';
    }
}

function renderGasWalletContent(acct) {
    var balance = parseFloat(acct.gas_balance || 0);
    var address = acct.gas_wallet_address || null;
    var network = acct.gas_wallet_network || 'TRC20';
    var activeCurr = window.currentAccountCurrency || acct.currency || (typeof getCurrencyFromCountry === 'function' && currentUser ? getCurrencyFromCountry(currentUser.country) : 'USD');

    if (!address) {
        document.getElementById('gasWalletBody').innerHTML =
            '<div class="gas-not-setup"><i class="fas fa-wallet"></i>'
            + '<h4 style="margin:0 0 8px;">Gas Wallet Not Set Up</h4>'
            + '<p style="color:var(--text-secondary);font-size:.875rem;margin:0 0 20px;">Your USDT TRC20 gas wallet has not been configured yet.</p>'
            + '<div class="alert alert-info"><i class="fas fa-headset"></i>'
            + '<span>Contact customer care to set up your gas wallet.</span></div></div>';
        return;
    }

    document.getElementById('gasWalletBody').innerHTML =
        '<div class="gas-wallet-box">'
        + '<span class="gas-wallet-network-badge">' + network + ' &bull; USDT</span>'
        + '<div class="gas-balance-display">' + formatCurrency(balance, activeCurr, true) + '</div>'
        + '<div style="font-size:.8rem;opacity:.7;margin-bottom:8px;">Gas Balance</div>'
        + '<div class="gas-wallet-address">' + address + '</div>'
        + '<button class="btn btn-outline gas-copy-btn" onclick="copyGasAddress(\'' + address + '\')">'
        + '<i class="fas fa-copy"></i> Copy Address</button></div>'
        + '<div class="alert alert-info" style="margin-top:16px;"><i class="fas fa-info-circle"></i>'
        + '<span>Send USDT via <strong>' + network + '</strong> only. Other networks = permanent loss.</span></div>'
        + '<div style="background:var(--bg-secondary);border-radius:10px;padding:14px;margin-top:12px;">'
        + '<div style="font-size:.8rem;color:var(--text-secondary);margin-bottom:4px;">Full Address</div>'
        + '<div style="font-size:.875rem;font-weight:600;word-break:break-all;">' + address + '</div></div>';
}

function copyGasAddress(address) {
    navigator.clipboard.writeText(address)
        .then(function () { showToast('Wallet address copied', 'success'); })
        .catch(function () { showToast('Failed to copy', 'error'); });
}

function hideGasWalletModal() {
    document.getElementById('gasWalletModal').classList.remove('active');
    if (typeof updateTawkVisibility === 'function') updateTawkVisibility();
}

// ── WIRE UP ────────────────────────────────────────────────────────────────

window._loadInvestments          = loadInvestments;
window.initInvestmentModal       = initInvestmentModal;
window.showInvestmentModal       = showInvestmentModal;
window.hideInvestmentModal       = hideInvestmentModal;
window.renderInvestStep1         = renderInvestStep1;
window.renderInvestStep2         = renderInvestStep2;
window.renderInvestReview        = renderInvestReview;
window.selectInvestPlan          = selectInvestPlan;
window.updateInvestPreview       = updateInvestPreview;
window.proceedInvestReview       = proceedInvestReview;
window.submitInvestment          = submitInvestment;
window.initTopUpInvestment       = initTopUpInvestment;
window.updateTopupPreview        = updateTopupPreview;
window.submitTopUp               = submitTopUp;
window.executeInvestmentApproval = executeInvestmentApproval;
window.initWithdrawInvestment    = initWithdrawInvestment;
window.getInvestmentMaturity     = getInvestmentMaturity;
window.showGasWalletModal        = showGasWalletModal;
window.hideGasWalletModal        = hideGasWalletModal;
window.copyGasAddress            = copyGasAddress;
window.loadInvestmentPlans       = loadInvestmentPlans;
window.INVEST_PLANS              = INVEST_PLANS;

