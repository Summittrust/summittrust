// Home Page JavaScript
class HomePage {
    constructor() {
        this.init();
    }

    init() {
        this.initializeAnimations();
        this.checkUserSession();
        this.initializeCounters();
        this.loadHomeWealthData();
    }

    async loadHomeWealthData() {
        // Asset lists come from the shared catalogue (js/invest-catalog.js),
        // whose tiers are cumulative: Starter 20 · Premium 40 · Elite 61.
        const CATALOG_VERSION = window.INVEST_CATALOG_VERSION || 3;
        const catalogueFor = (tier) => (typeof window.getCatalogueForTier === 'function' ? window.getCatalogueForTier(tier) : []);

        // A saved plan is only trusted when it was written against the current
        // catalogue version; otherwise the catalogue list wins.
        const planAssetsFor = (p, tier) => {
            const current = p && p.catalogVersion === CATALOG_VERSION;
            return (current && Array.isArray(p.assets) && p.assets.length) ? p.assets : catalogueFor(tier);
        };

        // The visible assets are the top assets only — assetsMore is the “+N more
        // assets” figure an admin sets in Plan Settings.
        const DEFAULT_ASSETS_MORE = { starter: 2500, premium: 5000, elite: 10000 };
        const planMoreFor = (p, tier) => {
            const saved = p ? parseInt(p.assetsMore, 10) : NaN;
            return (saved > 0) ? saved : (DEFAULT_ASSETS_MORE[tier] || 0);
        };

        const DEFAULT_HOME_INVEST = {
            starter: { label: 'Starter', minAmount: 150,  months: 3, multiplier: 8,  assets: catalogueFor('starter'), assetsMore: 2500 },
            premium: { label: 'Premium', minAmount: 500,  months: 6, multiplier: 15, assets: catalogueFor('premium'), assetsMore: 5000 },
            elite:   { label: 'Elite',   minAmount: 1500, months: 9, multiplier: 25, assets: catalogueFor('elite'),   assetsMore: 10000 }
        };

        const DEFAULT_HOME_LOANS = {
            tier1_amount: 10000,
            tier1_joint_amount: 20000,
            tier1_gas: 500,
            tier2_amount: 40000,
            tier2_joint_amount: 70000,
            tier2_gas: 2000,
            tier3_amount: 80000,
            tier3_joint_amount: 150000,
            tier3_gas: 5000
        };

        let plans = DEFAULT_HOME_INVEST;
        let loans = DEFAULT_HOME_LOANS;

        // Query Supabase if available
        if (window.db && typeof window.db.from === 'function') {
            try {
                const { data } = await window.db
                    .from('bank_settings')
                    .select('setting_key, setting_value')
                    .in('setting_key', ['investment_plans', 'loan_settings']);

                if (Array.isArray(data)) {
                    const invRow = data.find(r => r.setting_key === 'investment_plans');
                    if (invRow && invRow.setting_value) {
                        plans = Object.assign({}, DEFAULT_HOME_INVEST, invRow.setting_value);
                    }
                    const loanRow = data.find(r => r.setting_key === 'loan_settings');
                    if (loanRow && loanRow.setting_value) {
                        loans = Object.assign({}, DEFAULT_HOME_LOANS, loanRow.setting_value);
                    }
                }
            } catch (err) {
                console.warn('Home dynamic data notice:', err);
            }
        }

        // Render Investment Plans on Home Page
        ['starter', 'premium', 'elite'].forEach(tier => {
            const p = plans[tier] || DEFAULT_HOME_INVEST[tier];
            if (!p) return;

            const months = p.months || (tier === 'starter' ? 3 : tier === 'premium' ? 6 : 9);
            const mult = p.multiplier !== undefined ? p.multiplier : (tier === 'starter' ? 8 : tier === 'premium' ? 15 : 25);
            const min = p.minAmount || (tier === 'starter' ? 150 : tier === 'premium' ? 500 : 1500);

            const monthsEl = document.getElementById(`inv-home-${tier}-months`);
            if (monthsEl) monthsEl.textContent = `${months} Months`;

            const multEl = document.getElementById(`inv-home-${tier}-mult`);
            if (multEl) {
                const netRoi = Math.round((mult - 1) * 100);
                multEl.textContent = netRoi > 0 ? `+${netRoi.toLocaleString()}% ROI (${mult}x)` : `${mult}x Return`;
            }

            const minEl = document.getElementById(`inv-home-${tier}-min`);
            if (minEl) minEl.textContent = `$${Number(min).toLocaleString()}`;

            // Render Assets — grouped by category from the shared catalogue
            const assetsContainer = document.getElementById(`inv-home-${tier}-assets`);
            if (assetsContainer) {
                const assetsList = planAssetsFor(p, tier);
                const cats = window.INVEST_CATEGORIES || [];
                const groups = cats
                    .map(c => ({ key: c.key, label: c.label, icon: c.icon, items: assetsList.filter(a => a.cat === c.key) }))
                    .filter(g => g.items.length > 0);

                const chipHtml = (a) => {
                    const name = String(a.name || '').trim();
                    const initial = name.charAt(0).toUpperCase() || '?';
                    const iconHtml = a.icon
                        ? `<img src="${a.icon}" alt="" loading="lazy" onerror="this.remove()">`
                        : `<span class="asset-glyph">${a.glyph || initial}</span>`;
                    const sym = a.sym ? `<em>${a.sym}</em>` : '';
                    return `<span class="asset-chip" title="${name}${a.sym ? ' (' + a.sym + ')' : ''}">${iconHtml}<span>${name}</span>${sym}</span>`;
                };

                assetsContainer.classList.add('plan-assets-groups');
                assetsContainer.innerHTML = groups.map(g => [
                    '<details class="plan-assets-group">',
                    `<summary class="pag-head"><i class="fas ${g.icon}"></i><span class="pag-label">${g.label}</span><span class="pag-count">${g.items.length}</span></summary>`,
                    '<div class="plan-assets-chips">' + g.items.map(chipHtml).join('') + '</div>',
                    '</details>'
                ].join('')).join('') + (() => {
                    const more = planMoreFor(p, tier);
                    if (!more) return '';
                    return '<div class="plan-assets-chips plan-assets-more-row">'
                        + `<span class="asset-chip-more"><i class="fas fa-plus"></i> ${more.toLocaleString()} more assets</span>`
                        + '</div>';
                })();
            }
        });

        // Render Liquidity / Loan Tiers on Home Page
        const t1Amt = document.getElementById('loan-home-tier1-amt');
        if (t1Amt) t1Amt.textContent = `$${Number(loans.tier1_amount || 10000).toLocaleString()}`;
        const t1Joint = document.getElementById('loan-home-tier1-joint');
        if (t1Joint) t1Joint.textContent = `$${Number(loans.tier1_joint_amount || 20000).toLocaleString()}`;

        const t2Amt = document.getElementById('loan-home-tier2-amt');
        if (t2Amt) t2Amt.textContent = `$${Number(loans.tier2_amount || 40000).toLocaleString()}`;
        const t2Joint = document.getElementById('loan-home-tier2-joint');
        if (t2Joint) t2Joint.textContent = `$${Number(loans.tier2_joint_amount || 70000).toLocaleString()}`;

        const t3Amt = document.getElementById('loan-home-tier3-amt');
        if (t3Amt) t3Amt.textContent = `$${Number(loans.tier3_amount || 80000).toLocaleString()}`;
        const t3Joint = document.getElementById('loan-home-tier3-joint');
        if (t3Joint) t3Joint.textContent = `$${Number(loans.tier3_joint_amount || 150000).toLocaleString()}`;
    }

    initializeAnimations() {
        // Add scroll animation to feature cards
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }
            });
        }, observerOptions);

        // Observe feature cards
        document.querySelectorAll('.feature-card, .account-card').forEach(el => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(30px)';
            el.style.transition = 'all 0.6s ease-out';
            observer.observe(el);
        });
    }

    checkUserSession() {
        // Check if Session exists
        if (typeof Session !== 'undefined' && Session) {
            try {
                const session = Session.getCurrentSession();
                if (session && session.userId) {
                    this.updateNavbarForLoggedInUser();
                }
            } catch (error) {
                console.error('Error checking session:', error);
            }
        } else {
            console.log('Session not available yet');
        }
    }

    updateNavbarForLoggedInUser() {
        const authButtons = document.querySelector('.auth-buttons');
        if (authButtons) {
            authButtons.innerHTML = `
                <a href="/dashboard" class="btn btn-outline">
                    <i class="fas fa-tachometer-alt"></i>
                    Dashboard
                </a>
                <button class="btn btn-outline" id="logoutBtn">
                    <i class="fas fa-sign-out-alt"></i>
                    Logout
                </button>
            `;

            // Add logout handler
            const logoutBtn = document.getElementById('logoutBtn');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    if (typeof Session !== 'undefined' && Session) {
                        Session.clearSession();
                        window.location.reload();
                    }
                });
            }
        }
    }

    initializeCounters() {
        // Animate statistics counters
        const stats = document.querySelectorAll('.stat-number');
        stats.forEach(stat => {
            const value = stat.textContent;
            if (value.includes('K')) {
                // Handle K values (500K)
                const num = parseInt(value) * 1000;
                this.animateCounter(stat, num, 'K');
            } else if (value.includes('B')) {
                // Handle B values ($2B)
                const num = parseFloat(value.replace('$', '')) * 1000000000;
                this.animateCounter(stat, num, 'B', true);
            } else if (value.includes('%')) {
                // Handle percentages (99.9%)
                const num = parseFloat(value);
                this.animateCounter(stat, num, '%');
            }
        });
    }

    animateCounter(element, target, suffix, isCurrency = false) {
        let current = 0;
        const increment = target / 100;
        const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
                current = target;
                clearInterval(timer);
            }
            
            if (isCurrency) {
                element.textContent = `$${(current / 1000000000).toFixed(1)}B`;
            } else if (suffix === '%') {
                element.textContent = current.toFixed(1) + '%';
            } else if (suffix === 'K') {
                element.textContent = (current / 1000).toFixed(0) + 'K+';
            }
        }, 20);
    }
}

// Initialize home page when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Small delay to ensure all scripts are loaded
    setTimeout(() => {
        new HomePage();
    }, 100);
});

