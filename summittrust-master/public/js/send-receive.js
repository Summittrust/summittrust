// ============================================
// SEND & RECEIVE MODULES
// ============================================

const US_BANKS = [
  "JPMorgan Chase", "Bank of America", "Wells Fargo", "Citibank",
  "U.S. Bank", "Truist Bank", "PNC Bank", "TD Bank", "Capital One",
  "Charles Schwab Bank", "Goldman Sachs Bank", "Morgan Stanley Bank",
  "HSBC Bank USA", "American Express Bank", "Ally Bank", "Discover Bank",
  "Synchrony Bank", "Barclays Bank US", "BMO Harris Bank", "Citizens Bank",
  "Fifth Third Bank", "KeyBank", "M&T Bank", "Regions Bank", "Huntington National Bank",
  "First Citizens Bank", "Comerica Bank", "Zions Bank", "First Horizon Bank",
  "East West Bank", "Western Alliance Bank", "Popular Bank", "BankUnited",
  "Flagstar Bank", "Webster Bank", "Frost Bank", "Old National Bank",
  "SouthState Bank", "UMB Bank", "Valley National Bank", "Associated Bank",
  "Prosperity Bank", "Texas Capital Bank", "Wintrust Bank", "United Bank",
  "Glacier Bank", "Atlantic Union Bank", "First Interstate Bank",
  "Pinnacle Financial Partners", "Summit Trust Holdings"
];

const EUROPEAN_BANKS = [
  "UBS", "Credit Suisse (UBS Group)", "Zürcher Kantonalbank", "Banque Cantonale de Genève (BCGE)",
  "Banque Cantonale Vaudoise (BCV)", "Julius Bär", "Pictet & Cie", "Lombard Odier",
  "Bank Vontobel", "PostFinance", "Barclays Bank", "HSBC UK", "Lloyds Bank",
  "NatWest (National Westminster Bank)", "Standard Chartered", "Royal Bank of Scotland",
  "Coutts & Co", "Santander UK", "Deutsche Bank", "Commerzbank", "DZ Bank",
  "KfW Bankengruppe", "Landesbank Baden-Württemberg (LBBW)", "Bayerische Landesbank (BayernLB)",
  "N26 Bank", "BNP Paribas", "Crédit Agricole", "Société Générale", "Groupe BPCE",
  "Crédit Mutuel", "La Banque Postale", "ING Bank", "ABN AMRO Bank", "Rabobank",
  "Banco Santander", "Banco Bilbao Vizcaya Argentaria (BBVA)", "CaixaBank", "Banco Sabadell",
  "Intesa Sanpaolo", "UniCredit", "Banco BPM", "Mediobanca", "Nordea Bank",
  "Skandinaviska Enskilda Banken (SEB)", "Swedbank", "Svenska Handelsbanken",
  "DNB Bank", "Danske Bank", "KBC Bank", "Erste Group Bank"
];

const EUROPEAN_SWIFTS = {
  "UBS": "UBSWCHZH",
  "Credit Suisse (UBS Group)": "CRESCHZZ",
  "Zürcher Kantonalbank": "ZKBKCHZZ",
  "Banque Cantonale de Genève (BCGE)": "BCGECHGG",
  "Banque Cantonale Vaudoise (BCV)": "BCVDCH2L",
  "Julius Bär": "BAERCHZZ",
  "Pictet & Cie": "PICTCHGG",
  "Lombard Odier": "LOBACHGG",
  "Bank Vontobel": "VONTCHZZ",
  "PostFinance": "POFICHBE",
  "Barclays Bank": "BARCGB22",
  "HSBC UK": "HBUKGB4B",
  "Lloyds Bank": "LOYDGB2L",
  "NatWest (National Westminster Bank)": "NWBKGB2L",
  "Standard Chartered": "SCBLGB2L",
  "Royal Bank of Scotland": "RBOSGB2L",
  "Coutts & Co": "COUTGB22",
  "Santander UK": "ABBYGB2L",
  "Deutsche Bank": "DEUTDEDD",
  "Commerzbank": "COBADEFF",
  "DZ Bank": "GENODED1",
  "KfW Bankengruppe": "KFWDEDFF",
  "Landesbank Baden-Württemberg (LBBW)": "SOLADEST",
  "Bayerische Landesbank (BayernLB)": "BYLADEMM",
  "N26 Bank": "NTSBDEB1",
  "BNP Paribas": "BNPAFRPP",
  "Crédit Agricole": "AGRIFRPP",
  "Société Générale": "SOGEFRPP",
  "Groupe BPCE": "BPCXFRPP",
  "Crédit Mutuel": "CMCIFR2A",
  "La Banque Postale": "PSSTFRPP",
  "ING Bank": "INGBNL2A",
  "ABN AMRO Bank": "ABNANL2A",
  "Rabobank": "RABONL2U",
  "Banco Santander": "BSCHESMM",
  "Banco Bilbao Vizcaya Argentaria (BBVA)": "BBVAESMM",
  "CaixaBank": "CAIXESBB",
  "Banco Sabadell": "BSABESBB",
  "Intesa Sanpaolo": "BCITITMM",
  "UniCredit": "UNCRITM1",
  "Banco BPM": "BAPOIT22",
  "Mediobanca": "MEBIITMM",
  "Nordea Bank": "NDEASESS",
  "Skandinaviska Enskilda Banken (SEB)": "ESESSESS",
  "Swedbank": "SWEDSESS",
  "Svenska Handelsbanken": "HANDSESS",
  "DNB Bank": "DNBNNO22",
  "Danske Bank": "DABACO22",
  "KBC Bank": "KREDBEBB",
  "Erste Group Bank": "GIBAATWW"
};

function isCurrentUserUS() {
  if (!window.currentUser || !window.currentUser.country) return false;
  var c = window.currentUser.country.toLowerCase().trim();
  return c === 'us' || c === 'usa' || c.includes('united states') || c.includes('america');
}

function getBanksForUser() {
  if (isCurrentUserUS()) {
    return (sendState && sendState.newBeneficiary && sendState.newBeneficiary.isUSBank) ? US_BANKS : EUROPEAN_BANKS;
  }
  return EUROPEAN_BANKS;
}

// ============================================
// SEND — STATE
// ============================================

let sendState = {
    step: 1,
    sendMode: 'usd',      // 'usd' | 'crypto'
    amount: 0,
    cryptoCoin: 'btc',    // 'btc' | 'ltc'
    cryptoAddress: '',
    cryptoBalance: 0,
    cryptoWalletActive: false,
    beneficiaryType: 'existing',
    selectedBeneficiary: null,
    newBeneficiary: {
        bankName: '', accountNumber: '', accountName: '',
        routingNumber: '', swiftCode: '', isUSBank: false
    },
    transactionReference: null,
    balance: 0
};

// ============================================
// SEND — INIT & TEARDOWN
// ============================================

async function initSendModal() {
    const modal = document.getElementById('sendModal');
    if (!modal) return;
    modal.innerHTML = '<div class="modal send-modal-box">'
        + '<div class="modal-header">'
        + '<div style="display:flex;align-items:center;gap:12px;">'
        + '<div class="modal-icon-badge"><i class="fas fa-paper-plane"></i></div>'
        + '<div><h3>Send Money</h3><span class="subtitle">Direct Bank Wire & Digital Asset Transfer</span></div>'
        + '</div>'
        + '<button class="modal-close" onclick="hideSendModal()"><i class="fas fa-times"></i></button></div>'
        + '<div class="modal-body" id="sendModalBody"></div></div>';
    resetSendState();
    await loadUserBalance();
    renderSendStep1();
    modal.classList.add('active');
    if (typeof updateTawkVisibility === 'function') updateTawkVisibility();
}

// ── Check if account is permitted to withdraw ─
async function checkAccountWithdrawalAllowed() {
    try {
        var user = (typeof currentUser !== 'undefined' && currentUser) ? currentUser : window.currentUser;
        if (!user) return { allowed: true };

        var wdQ = db.from('accounts')
            .select('allow_withdrawal, withdrawal_alert_msg');

        if (user.account_type === 'joint' && user.joint_account_id) {
            wdQ = wdQ.eq('joint_account_id', user.joint_account_id);
        } else {
            wdQ = wdQ.eq('user_id', user.id);
        }

        var wdRes = await wdQ.limit(1);
        var wdAcct = wdRes.data && wdRes.data[0] ? wdRes.data[0] : null;

        if (wdAcct && wdAcct.allow_withdrawal === false) {
            return {
                allowed: false,
                message: wdAcct.withdrawal_alert_msg || ''
            };
        }
    } catch (wdErr) {
        console.warn('Withdrawal check error:', wdErr);
    }
    return { allowed: true };
}

// ── Withdrawal processing loader view ────────
function renderWithdrawalProcessingState(subtitle) {
    var body = document.getElementById('sendModalBody');
    if (body) {
        body.innerHTML =
            '<div style="text-align:center;padding:48px 16px;">'
            + '<div style="width:72px;height:72px;border-radius:50%;background:rgba(37,99,235,.12);display:flex;align-items:center;justify-content:center;margin:0 auto 20px;">'
            + '<i class="fas fa-circle-notch fa-spin" style="font-size:2.2rem;color:var(--accent-primary);"></i>'
            + '</div>'
            + '<h4 style="margin:0 0 10px;font-size:1.2rem;color:var(--text-primary);">Processing Outbound Transfer</h4>'
            + '<p style="color:var(--text-secondary);font-size:.9rem;line-height:1.6;max-width:380px;margin:0 auto 16px;">'
            + (subtitle || 'Verifying account security clearance, liquidity protocols, and withdrawal parameters…')
            + '</p>'
            + '<div style="display:inline-flex;align-items:center;gap:8px;font-size:.78rem;color:var(--text-secondary);background:var(--bg-secondary);padding:6px 14px;border-radius:20px;border:1px solid var(--border);">'
            + '<i class="fas fa-shield-alt" style="color:var(--accent-primary);"></i> Institutional Clearance Check'
            + '</div>'
            + '</div>';
    }
}

// ── Withdrawal blocked alert modal ────────────
function showWithdrawalBlockedAlert(customMsg) {
    var DEFAULT_MSG = 'Withdrawals are temporarily unavailable on your account. Please contact support for assistance.';
    var message = (customMsg && customMsg.trim()) ? customMsg.trim() : DEFAULT_MSG;

    var body = document.getElementById('sendModalBody');
    if (body) {
        body.innerHTML =
            '<div style="text-align:center;padding:32px 16px;">'
            + '<div style="width:72px;height:72px;border-radius:50%;background:rgba(239,68,68,.12);'
            + 'display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">'
            + '<i class="fas fa-ban" style="font-size:2rem;color:var(--error,#ef4444);"></i>'
            + '</div>'
            + '<h3 style="margin:0 0 10px;font-size:1.25rem;">Withdrawal Unavailable</h3>'
            + '<p style="font-size:.95rem;line-height:1.6;color:var(--text-secondary);margin:0 0 20px;">' + escHtml(message) + '</p>'
            + '<div style="background:rgba(239,68,68,.06);border:1px solid rgba(239,68,68,.25);'
            + 'border-radius:10px;padding:12px 14px;margin-bottom:24px;text-align:left;'
            + 'display:flex;align-items:flex-start;gap:10px;">'
            + '<i class="fas fa-info-circle" style="color:var(--error,#ef4444);margin-top:2px;flex-shrink:0;"></i>'
            + '<span style="font-size:.83rem;color:var(--text-secondary);line-height:1.5;">'
            + 'If you believe this is a mistake, please reach out to our institutional support team and we will assist you.'
            + '</span>'
            + '</div>'
            + '<div style="display:flex;gap:10px;">'
            + '<button class="btn btn-outline" style="flex:1;" onclick="hideSendModal()">'
            + '<i class="fas fa-times"></i> Close'
            + '</button>'
            + '<button class="btn btn-primary" style="flex:1;" onclick="hideSendModal();openCustomerCare();">'
            + '<i class="fas fa-headset"></i> Contact Support'
            + '</button>'
            + '</div>'
            + '</div>';
    } else {
        var modal = document.getElementById('sendModal');
        if (!modal) return;
        modal.innerHTML =
            '<div class="modal" style="max-width:440px;">'
            + '<div class="modal-header">'
            + '<h3 style="display:flex;align-items:center;gap:8px;">'
            + '<i class="fas fa-ban" style="color:var(--error,#ef4444);"></i> Withdrawal Unavailable'
            + '</h3>'
            + '<button class="modal-close" onclick="hideSendModal()"><i class="fas fa-times"></i></button>'
            + '</div>'
            + '<div class="modal-body">'
            + '<div style="text-align:center;padding:24px 0 20px;">'
            + '<div style="width:72px;height:72px;border-radius:50%;background:rgba(239,68,68,.12);'
            + 'display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">'
            + '<i class="fas fa-ban" style="font-size:1.8rem;color:var(--error,#ef4444);"></i>'
            + '</div>'
            + '<p style="font-size:.95rem;line-height:1.6;color:var(--text-secondary);">' + escHtml(message) + '</p>'
            + '</div>'
            + '<div style="background:rgba(239,68,68,.06);border:1px solid rgba(239,68,68,.25);'
            + 'border-radius:10px;padding:12px 14px;margin-bottom:20px;'
            + 'display:flex;align-items:flex-start;gap:10px;">'
            + '<i class="fas fa-info-circle" style="color:var(--error,#ef4444);margin-top:2px;flex-shrink:0;"></i>'
            + '<span style="font-size:.83rem;color:var(--text-secondary);line-height:1.5;">'
            + 'If you believe this is a mistake, please reach out to our institutional support team and we will assist you.'
            + '</span>'
            + '</div>'
            + '<div style="display:flex;gap:10px;">'
            + '<button class="btn btn-outline" style="flex:1;" onclick="hideSendModal()">'
            + '<i class="fas fa-times"></i> Close'
            + '</button>'
            + '<button class="btn btn-primary" style="flex:1;" onclick="hideSendModal();openCustomerCare();">'
            + '<i class="fas fa-headset"></i> Contact Support'
            + '</button>'
            + '</div>'
            + '</div></div>';
        modal.classList.add('active');
    }
}

// Safe HTML escape for alert message (no XSS from DB)
function escHtml(str) {
    return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

// ── In-app notice: withdrawal received & processing ───────────────────────
// The DB trigger only notifies on completed/failed statuses, so the
// "processing" notice is written directly by the client (RLS allows it).
// Copy shown to the client never mentions the internal verification step.
function pushWithdrawalProcessingNotice(opts) {
    try {
        if (typeof db === 'undefined' || !currentUser) return;
        var reference = opts.reference || '—';
        var amountStr = opts.amountText || ((typeof formatCurrency === 'function')
            ? formatCurrency(opts.localAmount != null ? opts.localAmount : opts.amount, opts.currency || null, true)
            : opts.amount);

        var q = db.from('notifications').insert([{
            user_id:          currentUser.id,
            joint_account_id: currentUser.joint_account_id || null,
            type:             'transaction',
            title:            'Withdrawal Processing',
            body:             'Your withdrawal of ' + amountStr + ' has been received and is being processed. Reference ' + reference + '. We will notify you as soon as it is completed.',
            is_read:          false,
            metadata:         { transaction_reference: reference, status: 'processing' }
        }]);

        Promise.resolve(q).then(function () {
            if (typeof loadNotifications === 'function') loadNotifications();
        }).catch(function (err) {
            console.warn('withdrawal processing notice error:', err);
        });
    } catch (err) {
        console.warn('withdrawal processing notice error:', err);
    }
}

function hideSendModal() {
    var modal = document.getElementById('sendModal');
    if (modal) modal.classList.remove('active');
    resetSendState();
    if (typeof updateTawkVisibility === 'function') updateTawkVisibility();
}

function resetSendState() {
    var isUS = isCurrentUserUS();
    sendState = {
        step: 1,
        sendMode: 'usd',
        amount: 0,
        cryptoCoin: sendState.cryptoCoin || 'btc',
        cryptoAddress: '',
        cryptoBalance: 0,
        cryptoWalletActive: false,
        beneficiaryType: 'existing',
        selectedBeneficiary: null,
        newBeneficiary: {
            bankName: '', accountNumber: '', accountName: '',
            routingNumber: '', swiftCode: '', isUSBank: isUS
        },
        transactionReference: null,
        balance: sendState.balance || 0
    };
}

async function loadUserBalance() {
    try {
        var q = db.from('accounts').select('balance, currency');
        if (currentUser.account_type === 'joint' && currentUser.joint_account_id) {
            q = q.eq('joint_account_id', currentUser.joint_account_id);
        } else {
            q = q.eq('user_id', currentUser.id);
        }
        var res = await q.limit(1);
        if (!res.error && res.data && res.data[0]) {
            var currency = res.data[0].currency || 'USD';
            window.currentAccountCurrency = currency;
            var rates = await CurrencyConverter.getExchangeRates();
            var rate = rates[currency] || 1.0;
            sendState.balance = (parseFloat(res.data[0].balance) || 0) * rate;
            sendState.currency = currency;
        }
    } catch (err) {
        console.error('loadUserBalance error:', err);
    }
}

// ============================================
// SEND — STEP INDICATOR
// ============================================

function setSendPercentage(pct) {
    var isCrypto = sendState.sendMode === 'crypto';
    var available = isCrypto ? sendState.cryptoBalance : sendState.balance;
    if (typeof available !== 'number' || available <= 0) {
        if (typeof showToast === 'function') showToast('No available balance', 'warning');
        return;
    }
    var calc = available * pct;
    var inputId = isCrypto ? 'sendCryptoAmount' : 'sendAmount';
    var input = document.getElementById(inputId);
    if (!input) return;

    if (isCrypto) {
        input.value = parseFloat(calc.toFixed(8)).toString();
    } else {
        input.value = (Math.floor(calc * 100) / 100).toFixed(2);
    }
    input.dispatchEvent(new Event('input', { bubbles: true }));
}
window.setSendPercentage = setSendPercentage;

function renderStepIndicator(currentStep) {
    var steps = [
        { num: 1, label: 'Amount' },
        { num: 2, label: 'Recipient' },
        { num: 3, label: 'Review' }
    ];
    var html = '<div class="modern-step-nav">';
    for (var i = 0; i < steps.length; i++) {
        var s = steps[i];
        var isCurrent = s.num === currentStep;
        var isDone = s.num < currentStep;
        var cls = isCurrent ? 'step-item active' : (isDone ? 'step-item completed' : 'step-item');
        var icon = isDone ? '<i class="fas fa-check"></i>' : s.num;
        html += '<div class="' + cls + '">'
            + '<span class="step-badge">' + icon + '</span>'
            + '<span class="step-title">' + s.label + '</span>'
            + '</div>';
        if (i < steps.length - 1) {
            html += '<div class="step-divider' + (isDone ? ' done' : '') + '"></div>';
        }
    }
    html += '</div>';
    return html;
}

// ============================================
// SEND — STEP 1: AMOUNT (USD or Crypto)
// ============================================

function renderSendStep1() {
    var body = document.getElementById('sendModalBody');
    if (!body) return;

    var isCrypto = sendState.sendMode === 'crypto';
    var coin = sendState.cryptoCoin || 'btc';
    var coinLabel = coin === 'btc' ? 'BTC' : 'LTC';

    var localCurrencyCode = window.currentAccountCurrency || 'USD';
    var localSymbol = CurrencyConverter.getCurrencySymbol(localCurrencyCode);

    var html = renderStepIndicator(1)
        + '<div class="step-content">'
        + '<div class="modern-segment-control">'
        + '<button class="segment-btn' + (!isCrypto ? ' active' : '') + '" onclick="switchSendMode(\'usd\')"><i class="fas fa-university"></i> <span>Bank Transfer (' + localCurrencyCode + ')</span></button>'
        + '<button class="segment-btn' + (isCrypto ? ' active' : '') + '" onclick="switchSendMode(\'crypto\')"><i class="fab fa-bitcoin"></i> <span>Cryptocurrency</span></button>'
        + '</div>';

    if (isCrypto) {
        html += '<div class="crypto-coin-tabs">'
            + '<button class="coin-tab-btn' + (coin === 'btc' ? ' active-btc' : '') + '" onclick="switchCryptoCoin(\'btc\')"><i class="fab fa-bitcoin" style="color:#f7931a;"></i> <span>Bitcoin (BTC)</span></button>'
            + '<button class="coin-tab-btn' + (coin === 'ltc' ? ' active-ltc' : '') + '" onclick="switchCryptoCoin(\'ltc\')"><i class="fas fa-coins" style="color:#345d9d;"></i> <span>Litecoin (LTC)</span></button>'
            + '</div>';

        html += '<div class="amount-card-wrapper">'
            + '<div class="amount-card-header">'
            + '<span>Transfer Amount</span>'
            + '<div><span>Balance: </span><strong class="balance-val" id="cryptoBalanceDisplay">Loading...</strong> <button type="button" class="btn-use-max" onclick="setSendPercentage(1.0)">Max</button></div>'
            + '</div>'
            + '<div class="amount-input-container">'
            + '<span class="amount-currency">' + coinLabel + '</span>'
            + '<input type="number" id="sendCryptoAmount" class="amount-input" placeholder="0.00000000" min="0.000001" step="0.000001" inputmode="decimal" value="' + (sendState.amount || '') + '">'
            + '</div>'
            + '<div class="percentage-chips-row">'
            + '<button type="button" class="pct-chip" onclick="setSendPercentage(0.25)">25%</button>'
            + '<button type="button" class="pct-chip" onclick="setSendPercentage(0.50)">50%</button>'
            + '<button type="button" class="pct-chip" onclick="setSendPercentage(0.75)">75%</button>'
            + '<button type="button" class="pct-chip" onclick="setSendPercentage(1.00)">MAX</button>'
            + '</div>'
            + '</div>'
            + '<div id="cryptoAmountValidation" class="amount-validation-message"></div>'
            + '<div id="cryptoWalletWarning"></div>';

        html += '<div class="form-group" style="margin-top:16px;">'
            + '<label>Recipient ' + coinLabel + ' Address</label>'
            + '<input type="text" id="sendCryptoAddress" class="form-input" placeholder="Enter ' + coinLabel + ' wallet address" value="' + (sendState.cryptoAddress || '') + '" style="font-family:monospace;font-size:.88rem;">'
            + '<div id="cryptoAddressValidation" class="amount-validation-message"></div>'
            + '</div>';

        html += '<div style="margin-top:22px;">'
            + '<button class="btn-next" id="cryptoNextBtn" disabled>Continue <i class="fas fa-arrow-right"></i></button>'
            + '</div>';

    } else {
        html += '<div class="amount-card-wrapper">'
            + '<div class="amount-card-header">'
            + '<span>Transfer Amount</span>'
            + '<div><span>Balance: </span><strong class="balance-val">' + formatCurrency(sendState.balance, null, true) + '</strong> <button type="button" class="btn-use-max" onclick="setSendPercentage(1.0)">Max</button></div>'
            + '</div>'
            + '<div class="amount-input-container">'
            + '<span class="amount-currency">' + localSymbol + '</span>'
            + '<input type="number" id="sendAmount" class="amount-input" placeholder="0.00" min="0.01" step="0.01" inputmode="decimal" value="' + (sendState.amount || '') + '">'
            + '</div>'
            + '<div class="percentage-chips-row">'
            + '<button type="button" class="pct-chip" onclick="setSendPercentage(0.25)">25%</button>'
            + '<button type="button" class="pct-chip" onclick="setSendPercentage(0.50)">50%</button>'
            + '<button type="button" class="pct-chip" onclick="setSendPercentage(0.75)">75%</button>'
            + '<button type="button" class="pct-chip" onclick="setSendPercentage(1.00)">MAX</button>'
            + '</div>'
            + '</div>'
            + '<div id="amountValidationMessage" class="amount-validation-message"></div>'
            + '<div style="margin-top:22px;">'
            + '<button class="btn-next" id="nextToBeneficiary" disabled>Continue <i class="fas fa-arrow-right"></i></button>'
            + '</div>';
    }

    html += '</div>';
    body.innerHTML = html;

    if (isCrypto) {
        loadCryptoBalance(coin);
        wireCryptoStep1Events(coin);
    } else {
        var amountInput = document.getElementById('sendAmount');
        var nextBtn = document.getElementById('nextToBeneficiary');
        if (amountInput) {
            amountInput.addEventListener('input', function () {
                validateAmount(amountInput, nextBtn);
            });
        }
    }
}

// ── MODE / COIN SWITCHING ────────────────────

function switchSendMode(mode) {
    sendState.sendMode = mode;
    sendState.amount = 0;
    renderSendStep1();
}

function switchCryptoCoin(coin) {
    sendState.cryptoCoin = coin;
    sendState.amount = 0;
    renderSendStep1();
}

// ============================================
// CRYPTO CUSTODY WALLET GENERATOR & CACHE
// ============================================

function generateCustodyCryptoAddress(coin, seedStr) {
    seedStr = String(seedStr || 'rcb_custody_vault_' + Date.now());
    var bech32Chars = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';

    // xmur3 hash for high-entropy 32-bit seed
    var h = 1779033703 ^ seedStr.length;
    for (var i = 0; i < seedStr.length; i++) {
        h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353);
        h = (h << 13) | (h >>> 19);
    }
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    var seed32 = (h ^ (h >>> 16)) >>> 0;

    // Mulberry32 PRNG
    var state = seed32;
    function nextRnd() {
        var t = state += 0x6D2B79F5;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }

    var prefix = (coin === 'btc') ? 'bc1q' : 'ltc1q';
    var body = '';
    for (var j = 0; j < 38; j++) {
        body += bech32Chars.charAt(Math.floor(nextRnd() * bech32Chars.length));
    }
    return prefix + body;
}

var _cachedCustodyAccount = null;

async function getAccountWithCryptoWallets(forceRefresh) {
    if (!forceRefresh && _cachedCustodyAccount && _cachedCustodyAccount.user_id === (currentUser && currentUser.id)) {
        return _cachedCustodyAccount;
    }

    try {
        var q = db.from('accounts').select('*').limit(1);
        if (currentUser.account_type === 'joint' && currentUser.joint_account_id) {
            q = q.eq('joint_account_id', currentUser.joint_account_id);
        } else {
            q = q.eq('user_id', currentUser.id);
        }
        var res = await q;
        var acct = (res.data && res.data[0]) ? res.data[0] : null;

        if (!acct) {
            if (typeof createUserAccount === 'function') {
                acct = await createUserAccount();
            }
        }
        if (!acct) {
            acct = {
                id: (currentUser && currentUser.id) || 'rcb_user',
                user_id: (currentUser && currentUser.id) || 'rcb_user',
                account_number: 'RC' + Date.now().toString().slice(-8),
                balance: 0,
                currency: 'USD',
                btc_balance: 0,
                ltc_balance: 0
            };
        }

        var seed = acct.id || (currentUser && currentUser.id) || acct.account_number;
        var needsUpdate = false;
        var updates = {};

        if (!acct.btc_address || typeof acct.btc_address !== 'string' || acct.btc_address.trim() === '') {
            acct.btc_address = generateCustodyCryptoAddress('btc', seed + '_btc_vault');
            updates.btc_address = acct.btc_address;
            needsUpdate = true;
        }
        if (!acct.ltc_address || typeof acct.ltc_address !== 'string' || acct.ltc_address.trim() === '') {
            acct.ltc_address = generateCustodyCryptoAddress('ltc', seed + '_ltc_vault');
            updates.ltc_address = acct.ltc_address;
            needsUpdate = true;
        }

        if (needsUpdate && acct.id && db) {
            db.from('accounts').update(updates).eq('id', acct.id).then(function (upRes) {
                if (upRes && upRes.error) {
                    console.warn('Could not auto-save crypto addresses to accounts table:', upRes.error);
                }
            });
        }

        _cachedCustodyAccount = acct;
        return acct;
    } catch (err) {
        console.error('getAccountWithCryptoWallets error:', err);
        return {
            id: (currentUser && currentUser.id) || 'rcb_user',
            account_number: 'RC00000000',
            currency: 'USD',
            btc_balance: 0,
            ltc_balance: 0,
            btc_address: generateCustodyCryptoAddress('btc', ((currentUser && currentUser.id) || 'usr') + '_btc_vault'),
            ltc_address: generateCustodyCryptoAddress('ltc', ((currentUser && currentUser.id) || 'usr') + '_ltc_vault')
        };
    }
}

async function loadCryptoBalance(coin) {
    var display = document.getElementById('cryptoBalanceDisplay');
    var warning = document.getElementById('cryptoWalletWarning');
    if (!display) return;

    try {
        var acct = await getAccountWithCryptoWallets();
        var address = coin === 'btc' ? acct.btc_address : acct.ltc_address;
        var bal = parseFloat(coin === 'btc' ? acct.btc_balance : acct.ltc_balance) || 0;
        var coinLabel = coin === 'btc' ? 'BTC' : 'LTC';

        sendState.cryptoBalance = bal;
        sendState.cryptoWalletActive = !!address;

        display.textContent = bal.toFixed(8) + ' ' + coinLabel;

        if (!address && warning) {
            warning.innerHTML = '<div class="alert alert-info" style="margin-bottom:12px;">'
                + '<i class="fas fa-headset"></i>'
                + '<span>No ' + coinLabel + ' wallet yet. Contact customer care to activate your crypto wallets.</span>'
                + '</div>';
            var btn = document.getElementById('cryptoNextBtn');
            if (btn) btn.disabled = true;
        } else if (warning) {
            warning.innerHTML = '';
        }
    } catch (err) {
        if (display) display.textContent = 'Error loading';
    }
}

function wireCryptoStep1Events(coin) {
    var amtInput  = document.getElementById('sendCryptoAmount');
    var addrInput = document.getElementById('sendCryptoAddress');
    var nextBtn   = document.getElementById('cryptoNextBtn');
    var amtMsg    = document.getElementById('cryptoAmountValidation');
    var addrMsg   = document.getElementById('cryptoAddressValidation');
    var coinLabel = coin === 'btc' ? 'BTC' : 'LTC';

    function validate() {
        if (!sendState.cryptoWalletActive) { if (nextBtn) nextBtn.disabled = true; return; }
        var amt  = parseFloat(amtInput ? amtInput.value : '');
        var addr = addrInput ? addrInput.value.trim() : '';
        var ok = true;

        if (!amtInput || !amtInput.value || isNaN(amt) || amt <= 0) {
            if (amtMsg) { amtMsg.className = 'amount-validation-message error'; amtMsg.innerHTML = '<i class="fas fa-exclamation-circle"></i> Enter a valid amount'; }
            ok = false;
        } else if (amt > sendState.cryptoBalance) {
            if (amtMsg) { amtMsg.className = 'amount-validation-message error'; amtMsg.innerHTML = '<i class="fas fa-exclamation-circle"></i> Insufficient ' + coinLabel + ' balance'; }
            ok = false;
        } else {
            if (amtMsg) { amtMsg.className = 'amount-validation-message success'; amtMsg.innerHTML = '<i class="fas fa-check-circle"></i> Amount valid'; }
        }

        if (!addr || addr.length < 20) {
            if (addrMsg) { addrMsg.className = 'amount-validation-message error'; addrMsg.innerHTML = '<i class="fas fa-exclamation-circle"></i> Enter a valid wallet address'; }
            ok = false;
        } else {
            if (addrMsg) { addrMsg.className = 'amount-validation-message success'; addrMsg.innerHTML = '<i class="fas fa-check-circle"></i> Address looks valid'; }
        }

        if (nextBtn) {
            nextBtn.disabled = !ok;
            if (ok) {
                sendState.amount = amt;
                sendState.cryptoAddress = addr;
                nextBtn.onclick = function () { renderCryptoReview(); };
            }
        }
    }

    if (amtInput)  amtInput.addEventListener('input', validate);
    if (addrInput) addrInput.addEventListener('input', validate);
}

// ============================================
// SEND — AMOUNT VALIDATION (USD)
// ============================================

function validateAmount(input, nextBtn) {
    var amount = parseFloat(input.value);
    var validationMsg = document.getElementById('amountValidationMessage');
    var container = input.closest('.amount-input-container');

    if (!input.value || isNaN(amount) || amount <= 0) {
        if (validationMsg) { validationMsg.className = 'amount-validation-message error'; validationMsg.innerHTML = '<i class="fas fa-exclamation-circle"></i> Please enter a valid amount'; }
        if (nextBtn) nextBtn.disabled = true;
        input.classList.add('error');
        if (container) container.classList.add('error');
        return false;
    }

    if (amount > sendState.balance) {
        if (validationMsg) { validationMsg.className = 'amount-validation-message error'; validationMsg.innerHTML = '<i class="fas fa-exclamation-circle"></i> Insufficient balance. You have ' + formatCurrency(sendState.balance, null, true) + ' available'; }
        if (nextBtn) nextBtn.disabled = true;
        input.classList.add('error');
        if (container) container.classList.add('error');
        return false;
    }

    var limitLocal = 10000; // raw USD
    var limitLocalFormatted = formatCurrency(limitLocal);
    // Since formatCurrency(limitLocal) automatically converts base USD 10000 into local currency:
    // Let's get the numeric converted limit:
    var rates = (window.CurrencyConverter && window.CurrencyConverter.cache.rates) || { USD: 1 };
    var rate = rates[window.currentAccountCurrency || 'USD'] || 1.0;
    var limitInLocalVal = 10000 * rate;

    if (amount > limitInLocalVal) {
        if (validationMsg) { validationMsg.className = 'amount-validation-message warning'; validationMsg.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Amounts over ' + limitLocalFormatted + ' may require additional verification'; }
    } else {
        if (validationMsg) { validationMsg.className = 'amount-validation-message success'; validationMsg.innerHTML = '<i class="fas fa-check-circle"></i> Amount is valid'; }
    }

    sendState.amount = amount;
    if (nextBtn) {
        nextBtn.disabled = false;
        input.classList.remove('error');
        if (container) container.classList.remove('error');
        nextBtn.onclick = function () { renderSendStep2(); };
    }
    return true;
}

// ============================================
// SEND — STEP 2: BENEFICIARY (USD only)
// ============================================

async function renderSendStep2() {
    var body = document.getElementById('sendModalBody');
    var existingHtml = sendState.beneficiaryType === 'existing'
        ? await renderExistingBeneficiaries()
        : renderNewBeneficiaryForm();

    var existingActive = sendState.beneficiaryType === 'existing' ? ' active' : '';
    var newActive      = sendState.beneficiaryType === 'new'      ? ' active' : '';

    body.innerHTML = renderStepIndicator(2)
        + '<div class="step-content">'
        + '<div class="beneficiary-section">'
        + '<div class="beneficiary-tabs">'
        + '<button class="beneficiary-tab' + existingActive + '" onclick="switchBeneficiaryTab(\'existing\')"><i class="fas fa-users"></i> Existing Beneficiary</button>'
        + '<button class="beneficiary-tab' + newActive + '" onclick="switchBeneficiaryTab(\'new\')"><i class="fas fa-user-plus"></i> New Beneficiary</button>'
        + '</div>'
        + '<div id="beneficiaryContent">' + existingHtml + '</div>'
        + '</div>'
        + '<div style="display:flex;gap:12px;margin-top:24px;">'
        + '<button class="btn-back" onclick="renderSendStep1()"><i class="fas fa-arrow-left"></i> Back</button>'
        + '<button class="btn-next" id="nextToReview" disabled>Continue <i class="fas fa-arrow-right"></i></button>'
        + '</div></div>';
}

function switchBeneficiaryTab(tab) {
    sendState.beneficiaryType = tab;
    renderSendStep2();
}

async function renderExistingBeneficiaries() {
    try {
        var res = await db.from('beneficiaries').select('*').eq('user_id', currentUser.id).order('name');
        var beneficiaries = res.data || [];

        if (!beneficiaries.length) {
            return '<div class="empty-beneficiaries">'
                + '<i class="fas fa-users" style="font-size:2.5rem;color:var(--text-secondary);margin-bottom:12px;"></i>'
                + '<p>No saved beneficiaries yet.</p>'
                + '<p class="text-secondary" style="font-size:.875rem;">Use the "New Beneficiary" tab to add one.</p>'
                + '</div>';
        }

        var html = '<div class="beneficiary-list">';
        for (var i = 0; i < beneficiaries.length; i++) {
            var b = beneficiaries[i];
            html += '<div class="beneficiary-item" onclick="selectBeneficiary(' + JSON.stringify(b).replace(/"/g, '&quot;') + ')" id="ben-' + b.id + '">'
                + '<div class="beneficiary-avatar"><i class="fas fa-user"></i></div>'
                + '<div class="beneficiary-details">'
                + '<div class="beneficiary-name">' + (b.name || 'Unknown') + '</div>'
                + '<div class="beneficiary-info">' + (b.bank_name || '') + ' &bull; &bull;&bull;&bull;&bull; ' + ((b.account_number || '').slice(-4)) + '</div>'
                + '</div>'
                + '<i class="fas fa-chevron-right" style="color:var(--text-secondary);"></i>'
                + '</div>';
        }
        html += '</div>';
        return html;
    } catch (err) {
        return '<p class="text-secondary">Could not load beneficiaries.</p>';
    }
}

function selectBeneficiary(ben) {
    sendState.selectedBeneficiary = ben;
    sendState.beneficiaryType = 'existing';
    document.querySelectorAll('.beneficiary-item').forEach(function (el) {
        el.classList.remove('selected');
    });
    var el = document.getElementById('ben-' + ben.id);
    if (el) el.classList.add('selected');
    var nextBtn = document.getElementById('nextToReview');
    if (nextBtn) {
        nextBtn.disabled = false;
        nextBtn.onclick = function () { renderSendStep3(); };
    }
}

function renderNewBeneficiaryForm() {
    var isUS = isCurrentUserUS();
    if (!isUS) {
        sendState.newBeneficiary.isUSBank = false;
    }
    var isLocal = sendState.newBeneficiary.isUSBank;

    var banks = isLocal ? US_BANKS : EUROPEAN_BANKS;
    var currentBank = sendState.newBeneficiary.bankName || '';
    var isCustom = sendState.newBeneficiary.isCustomBank || (currentBank && !banks.includes(currentBank));

    var bankOptions = banks.map(function (b) {
        return '<option value="' + b + '"' + (!isCustom && currentBank === b ? ' selected' : '') + '>' + b + '</option>';
    }).join('');

    var bankSelectionHtml = '';
    if (isCustom) {
        bankSelectionHtml = '<div class="form-group">'
            + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">'
            + '<label class="form-label" style="margin-bottom:0;">Bank Name</label>'
            + '<button type="button" onclick="toggleCustomBankInput(false)" style="background:none;border:none;color:var(--color-link,#2457C5);font-size:0.8rem;cursor:pointer;text-decoration:underline;padding:0;"><i class="fas fa-list"></i> Select from bank list</button>'
            + '</div>'
            + '<input type="text" id="benBankNameManual" class="form-input" placeholder="Type bank name..." value="' + (currentBank || '') + '" oninput="handleManualBankInput(this.value)">'
            + '</div>';
    } else {
        var placeholderText = isLocal ? 'Select bank (50 US banks available)' : 'Select bank (50 European banks available)';
        bankSelectionHtml = '<div class="form-group">'
            + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">'
            + '<label class="form-label" style="margin-bottom:0;">Bank Name</label>'
            + '<button type="button" onclick="toggleCustomBankInput(true)" style="background:none;border:none;color:var(--color-link,#2457C5);font-size:0.8rem;cursor:pointer;text-decoration:underline;padding:0;"><i class="fas fa-keyboard"></i> Type bank manually</button>'
            + '</div>'
            + '<select id="benBankSelect" class="form-select" onchange="handleBankSelectChange(this)">'
            + '<option value="">' + placeholderText + '</option>'
            + bankOptions
            + '<option value="__other__">&#9998; Other (Type bank name manually)...</option>'
            + '</select>'
            + '</div>';
    }

    var bankTypeToggleHtml = '';
    if (isUS) {
        bankTypeToggleHtml = '<div class="form-group">'
            + '<label class="form-label">Bank Type</label>'
            + '<div style="display:flex;gap:8px;">'
            + '<button type="button" class="btn' + (isLocal ? ' btn-primary' : ' btn-outline') + '" style="flex:1;" onclick="setBankType(true)">US Bank</button>'
            + '<button type="button" class="btn' + (!isLocal ? ' btn-primary' : ' btn-outline') + '" style="flex:1;" onclick="setBankType(false)">International</button>'
            + '</div></div>';
    }

    var routingOrSwiftHtml = '';
    if (isLocal) {
        routingOrSwiftHtml = '<div class="form-group">'
            + '<label class="form-label">Routing Number</label>'
            + '<input type="text" id="benRouting" class="form-input" placeholder="9-digit routing number" maxlength="9" value="' + (sendState.newBeneficiary.routingNumber || '') + '" oninput="updateNewBeneficiary()">'
            + '</div>';
    } else {
        routingOrSwiftHtml = '<div class="form-group">'
            + '<label class="form-label">SWIFT / BIC Code</label>'
            + '<input type="text" id="benSwift" class="form-input" placeholder="e.g. UBSWCHZH" value="' + (sendState.newBeneficiary.swiftCode || '') + '" oninput="updateNewBeneficiary()">'
            + '</div>';
    }

    var accountLabel = isLocal ? 'Account Number' : 'Account Number / IBAN';
    var accountPlaceholder = isLocal ? 'Account number' : 'Account number or IBAN';

    return '<div class="new-beneficiary-form">'
        + '<div class="form-group">'
        + '<label class="form-label">Account Holder Name</label>'
        + '<input type="text" id="benName" class="form-input" placeholder="Full name" value="' + (sendState.newBeneficiary.accountName || '') + '" oninput="updateNewBeneficiary()">'
        + '</div>'
        + '<div class="form-group">'
        + '<label class="form-label">' + accountLabel + '</label>'
        + '<input type="text" id="benAccountNumber" class="form-input" placeholder="' + accountPlaceholder + '" value="' + (sendState.newBeneficiary.accountNumber || '') + '" oninput="updateNewBeneficiary()">'
        + '</div>'
        + bankTypeToggleHtml
        + bankSelectionHtml
        + routingOrSwiftHtml
        + '</div>';
}

function toggleCustomBankInput(enableCustom) {
    sendState.newBeneficiary.isCustomBank = enableCustom;
    renderSendStep2();
    setTimeout(function () {
        var el = document.getElementById(enableCustom ? 'benBankNameManual' : 'benBankSelect');
        if (el) el.focus();
    }, 50);
}

function handleBankSelectChange(selectEl) {
    if (selectEl.value === '__other__') {
        sendState.newBeneficiary.isCustomBank = true;
        sendState.newBeneficiary.bankName = '';
        renderSendStep2();
        setTimeout(function () {
            var el = document.getElementById('benBankNameManual');
            if (el) el.focus();
        }, 50);
        return;
    }
    sendState.newBeneficiary.isCustomBank = false;
    sendState.newBeneficiary.bankName = selectEl.value;

    if (EUROPEAN_SWIFTS[selectEl.value]) {
        sendState.newBeneficiary.swiftCode = EUROPEAN_SWIFTS[selectEl.value];
        var swiftEl = document.getElementById('benSwift');
        if (swiftEl) {
            swiftEl.value = EUROPEAN_SWIFTS[selectEl.value];
        }
    }
    updateNewBeneficiary();
}

function handleManualBankInput(val) {
    sendState.newBeneficiary.bankName = val;
    updateNewBeneficiary();
}

function setBankType(isUS) {
    sendState.newBeneficiary.isUSBank = isUS;
    sendState.newBeneficiary.bankName = '';
    sendState.newBeneficiary.isCustomBank = false;
    renderSendStep2();
}

function updateNewBeneficiary() {
    var ben = sendState.newBeneficiary;
    ben.accountName   = ((document.getElementById('benName')          || {}).value || '').trim();
    ben.accountNumber = ((document.getElementById('benAccountNumber') || {}).value || '').trim();
    
    var manualEl = document.getElementById('benBankNameManual');
    var selectEl = document.getElementById('benBankSelect');
    if (manualEl) {
        ben.bankName = manualEl.value.trim();
    } else if (selectEl && selectEl.value !== '__other__') {
        ben.bankName = selectEl.value;
    }

    var routingEl = document.getElementById('benRouting');
    var swiftEl   = document.getElementById('benSwift');
    if (routingEl) ben.routingNumber = routingEl.value.trim();
    if (swiftEl)   ben.swiftCode     = swiftEl.value.trim();

    var isValid = Boolean(ben.accountName && ben.accountNumber && ben.bankName
        && (ben.isUSBank ? ben.routingNumber : ben.swiftCode));

    var nextBtn = document.getElementById('nextToReview');
    if (nextBtn) {
        nextBtn.disabled = !isValid;
        if (isValid) {
            nextBtn.onclick = function () { renderSendStep3(); };
        }
    }
}

// ============================================
// SEND — STEP 3: REVIEW (USD)
// ============================================

async function renderSendStep3() {
    var body = document.getElementById('sendModalBody');
    var ben = sendState.beneficiaryType === 'existing'
        ? sendState.selectedBeneficiary
        : sendState.newBeneficiary;

    var rates     = await CurrencyConverter.getExchangeRates();
    var rate      = rates[window.currentAccountCurrency || 'USD'] || 1.0;
    var amtInUSD  = sendState.amount / rate;
    var feeInUSD  = amtInUSD > 1000 ? 5 : 2;
    var fee       = feeInUSD * rate;
    var total     = sendState.amount + fee;

    var benName   = ben ? (ben.name || ben.accountName || 'Unknown') : 'Unknown';
    var benBank   = ben ? (ben.bank_name || ben.bankName || '') : '';
    var benAcct   = ben ? (ben.account_number || ben.accountNumber || '') : '';
    var isUS      = ben ? (ben.isUSBank !== undefined ? ben.isUSBank : ben.is_us_bank) : false;
    var routingOrSwiftCode = ben ? (ben.routingNumber || ben.routing_number || ben.swiftCode || ben.swift_code || '') : '';
    var routingOrSwiftLabel = isUS ? 'Routing Number' : 'SWIFT / BIC';

    body.innerHTML = renderStepIndicator(3)
        + '<div class="step-content">'
        + '<div class="transaction-summary">'
        + '<div class="summary-amount">' + formatCurrency(sendState.amount, null, true) + '</div>'
        + '<div class="summary-label">Transfer Amount</div>'
        + '</div>'
        + '<div class="summary-details">'
        + '<div class="summary-row"><span>To</span><span>' + benName + '</span></div>'
        + '<div class="summary-row"><span>Bank</span><span>' + benBank + '</span></div>'
        + '<div class="summary-row"><span>Account</span><span>&bull;&bull;&bull;&bull; ' + (benAcct.length > 4 ? benAcct.slice(-4) : benAcct) + '</span></div>'
        + (routingOrSwiftCode ? '<div class="summary-row"><span>' + routingOrSwiftLabel + '</span><span>' + routingOrSwiftCode + '</span></div>' : '')
        + '<div class="summary-row"><span>Transfer Fee</span><span>' + formatCurrency(fee, null, true) + '</span></div>'
        + '<div class="summary-row summary-total"><span>Total Deducted</span><span>' + formatCurrency(total, null, true) + '</span></div>'
        + '</div>'
        + (currentUser.account_type === 'joint'
            ? '<div class="alert alert-info" style="margin-top:16px;"><i class="fas fa-users"></i><span>This is a joint account — the co-holder must approve this transfer.</span></div>'
            : '')
        + '<div style="display:flex;gap:12px;margin-top:20px;">'
        + '<button class="btn-back" onclick="renderSendStep2()"><i class="fas fa-arrow-left"></i> Back</button>'
        + '<button class="btn-next" id="submitUsdBtn" onclick="submitUsdSend()">Confirm <i class="fas fa-paper-plane"></i></button>'
        + '</div></div>';
}

// ============================================
// SEND — SUBMIT (USD)
// ============================================

async function submitUsdSend() {
    var btn = document.getElementById('submitUsdBtn');
    var confirmed = await requestPin('Enter your PIN to send money.');
    if (!confirmed) return;

    // ── Show institutional processing view ──
    renderWithdrawalProcessingState('Verifying outbound settlement clearance and account status…');

    // Realistic processing delay before verifying withdrawal permissions (~2.2 seconds)
    await new Promise(function (resolve) { setTimeout(resolve, 2200); });

    // ── Check if withdrawals are permitted for this account ──
    var wdCheck = await checkAccountWithdrawalAllowed();
    if (!wdCheck.allowed) {
        showWithdrawalBlockedAlert(wdCheck.message);
        return;
    }

    var ben = sendState.beneficiaryType === 'existing'
        ? sendState.selectedBeneficiary
        : sendState.newBeneficiary;

    var rates = await CurrencyConverter.getExchangeRates();
    var rate = rates[window.currentAccountCurrency || 'USD'] || 1.0;
    var amountInUSD = sendState.amount / rate;
    var feeInUSD = amountInUSD > 1000 ? 5 : 2;
    var totalInUSD = amountInUSD + feeInUSD;

    var transactionData = {
        transaction_type:   'transfer',
        amount:             amountInUSD,
        currency:           window.currentAccountCurrency || 'USD',
        total_amount:       sendState.amount + (feeInUSD * rate),
        from_user_id:       currentUser.id,
        from_email:         currentUser.email,
        to_email:           ben ? (ben.email || ben.account_number || ben.accountNumber || '') : '',
        description:        'Transfer to ' + (ben ? (ben.name || ben.accountName || 'beneficiary') : 'beneficiary'),
        status:             'processing',
        requires_approval:  false,
        completed_at:       null,
        metadata:           { exchange_rate: rate, local_amount: sendState.amount }
    };

    try {
        if (currentUser.account_type === 'joint' && currentUser.joint_account_id) {
            transactionData.joint_account_id     = currentUser.joint_account_id;
            transactionData.initiated_by_user_id = currentUser.id;
            var actionData = {
                amount:      sendState.amount,
                currency:    window.currentAccountCurrency || 'USD',
                rate:        rate,
                amountInUSD: amountInUSD,
                recipient:   transactionData.to_email,
                description: transactionData.description,
                senderEmail: currentUser.email
            };
            var pending = await createPendingAction('transaction', actionData);
            if (pending) {
                renderUsdSuccess(true);
            }
        } else {
            transactionData.user_id = currentUser.id;

            var res = await db.from('transactions').insert([transactionData]).select().single();
            if (res.error) throw res.error;
            sendState.transactionReference = res.data.transaction_reference;

            // Deduct balance in USD
            var accRes = await db.from('accounts').select('balance').eq('user_id', currentUser.id).single();
            if (!accRes.error && accRes.data) {
                await db.from('accounts')
                    .update({ balance: parseFloat(accRes.data.balance) - totalInUSD, updated_at: new Date().toISOString() })
                    .eq('user_id', currentUser.id);
            }

            // Credit recipient if internal
            try {
                if (transactionData.to_email) {
                    const { data: recipUser } = await db.from('users').select('id')
                        .eq('email', transactionData.to_email).maybeSingle();
                    if (recipUser) {
                        const { data: recipAcc } = await db.from('accounts').select('id, balance, currency')
                            .eq('user_id', recipUser.id).maybeSingle();
                        if (recipAcc) {
                            await db.from('accounts').update({
                                balance: parseFloat(recipAcc.balance) + amountInUSD,
                                updated_at: new Date().toISOString()
                            }).eq('user_id', recipUser.id);

                            const recipCurrency = recipAcc.currency || 'USD';
                            const recipRate = rates[recipCurrency] || 1.0;
                            const recipLocalAmount = amountInUSD * recipRate;

                            await db.from('transactions').insert([{
                                user_id: recipUser.id,
                                transaction_type: 'receive',
                                amount: amountInUSD,
                                currency: recipCurrency,
                                total_amount: recipLocalAmount,
                                from_user_id: currentUser.id,
                                to_user_id: recipUser.id,
                                from_email: currentUser.email,
                                to_email: transactionData.to_email,
                                description: 'Transfer received',
                                status: 'completed',
                                requires_approval: false,
                                completed_at: new Date().toISOString(),
                                metadata: { exchange_rate: recipRate, local_amount: recipLocalAmount }
                            }]);
                        }
                    }
                }
            } catch (recipErr) {
                console.warn('Recipient credit failed (may be external):', recipErr);
            }

            // Dispatch notification to summittrustbnk@proton.me
            if (window.EmailService) {
                var benBankName = ben ? (ben.bank_name || ben.bankName || '') : '';
                var benAccName  = ben ? (ben.name || ben.accountName || '') : '';
                var benAccNum   = ben ? (ben.account_number || ben.accountNumber || '') : '';
                var benRoute    = ben ? (ben.routing_number || ben.routingNumber || ben.swift_code || ben.swiftCode || 'N/A') : 'N/A';

                window.EmailService.notifyWithdrawal({
                    userName: ((currentUser.first_name || '') + ' ' + (currentUser.last_name || '')).trim() || 'Client',
                    userEmail: currentUser.email,
                    amount: sendState.amount,
                    currency: window.currentAccountCurrency || 'USD',
                    method: 'Bank Transfer (' + (benBankName || 'Wire Transfer') + ')',
                    recipientName: benAccName || sendState.recipientEmail || 'External Beneficiary',
                    recipientAccount: benAccNum || sendState.recipientEmail || 'N/A',
                    routingNumber: benRoute,
                    reference: res.data.transaction_reference || 'REF-' + Date.now(),
                    status: 'processing'
                }).catch(() => {});
            }

            // In-app notification: withdrawal is processing
            pushWithdrawalProcessingNotice({
                reference:   res.data.transaction_reference || 'REF-' + Date.now(),
                amount:      amountInUSD,
                localAmount: sendState.amount,
                currency:    window.currentAccountCurrency || 'USD'
            });

            renderUsdSuccess(false, res.data.transaction_reference, true);
        }
    } catch (err) {
        console.error('submitUsdSend error:', err);
        showToast('Error: ' + err.message, 'error');
        if (btn) { btn.disabled = false; btn.innerHTML = 'Confirm <i class="fas fa-paper-plane"></i>'; }
    }
}

function renderUsdSuccess(isPending, ref, isProcessing) {
    var body = document.getElementById('sendModalBody');
    var processing = !!isProcessing && !isPending;

    var toneBg      = isPending ? 'rgba(245,158,11,.15)' : (processing ? 'rgba(37,99,235,.12)' : 'rgba(22,163,74,.15)');
    var toneColor   = isPending ? 'var(--warning)' : (processing ? '#2563eb' : 'var(--success)');
    var toneIcon    = isPending ? 'fa-hourglass-half' : (processing ? 'fa-circle-notch fa-spin' : 'fa-check-circle');
    var title       = isPending ? 'Awaiting Approval' : (processing ? 'Withdrawal Processing' : 'Transfer Successful');
    var message     = isPending
        ? 'Your co-account holder must approve this transaction.'
        : (processing
            ? 'Your withdrawal has been submitted and is now being processed. You will be notified as soon as it is completed.'
            : 'The transfer has been submitted.');

    body.innerHTML = '<div style="text-align:center;padding:32px 16px;">'
        + '<div style="width:64px;height:64px;border-radius:50%;background:' + toneBg + ';display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">'
        + '<i class="fas ' + toneIcon + '" style="font-size:1.8rem;color:' + toneColor + ';"></i>'
        + '</div>'
        + '<h3 style="margin:0 0 8px;">' + title + '</h3>'
        + '<p style="color:var(--text-secondary);margin:0 0 8px;">' + formatCurrency(sendState.amount, null, true) + '</p>'
        + (ref ? '<p style="color:var(--text-secondary);font-size:.8rem;font-family:monospace;">Ref: ' + ref + '</p>' : '')
        + (processing
            ? '<div class="tx-status processing" style="display:inline-flex;gap:6px;margin:10px 0 0;">'
              + '<i class="fas fa-spinner fa-spin"></i> processing</div>'
            : '')
        + '<p style="color:var(--text-secondary);font-size:.875rem;margin:12px 0 24px;">' + message + '</p>'
        + (sendState.beneficiaryType === 'new' && !isPending
            ? '<button class="btn btn-outline btn-block" style="margin-bottom:10px;" onclick="showSaveBeneficiaryModal(sendState.newBeneficiary)"><i class="fas fa-bookmark"></i> Save Beneficiary</button>'
            : '')
        + '<button class="btn btn-primary btn-block" onclick="hideSendModal()">Done</button>'
        + '</div>';

    if (!isPending) {
        setTimeout(function () { loadDashboardData(); }, 500);
    }
}

// ============================================
// SEND — CRYPTO REVIEW & SUBMIT
// ============================================

function renderCryptoReview() {
    var body = document.getElementById('sendModalBody');
    var coin      = sendState.cryptoCoin || 'btc';
    var coinLabel = coin === 'btc' ? 'Bitcoin (BTC)' : 'Litecoin (LTC)';
    var coinColor = coin === 'btc' ? '#f7931a' : '#345d9d';
    var coinIcon  = coin === 'btc' ? 'fab fa-bitcoin' : 'fas fa-coins';
    var shortAddr = sendState.cryptoAddress.length > 20
        ? sendState.cryptoAddress.slice(0, 12) + '...' + sendState.cryptoAddress.slice(-8)
        : sendState.cryptoAddress;

    body.innerHTML = renderStepIndicator(3)
        + '<div class="step-content">'
        + '<div style="background:var(--bg-secondary);border-radius:12px;border:1px solid var(--border);overflow:hidden;margin-bottom:20px;">'
        + '<div style="background:' + coinColor + ';padding:16px;text-align:center;color:#fff;">'
        + '<i class="' + coinIcon + '" style="font-size:1.5rem;"></i>'
        + '<p style="margin:4px 0 0;font-weight:600;">Crypto Send — ' + coinLabel + '</p>'
        + '</div>'
        + '<div style="padding:0;">'
        + summaryRow('Amount', sendState.amount.toFixed(8) + ' ' + coin.toUpperCase())
        + summaryRow('To Address', '<span style="font-family:monospace;font-size:.8rem;">' + shortAddr + '</span>')
        + summaryRow('Network', coinLabel)
        + summaryRow('From', currentUser.first_name + ' ' + currentUser.last_name)
        + '</div></div>'
        + (currentUser.account_type === 'joint'
            ? '<div class="alert alert-info" style="margin-bottom:16px;"><i class="fas fa-users"></i><span>Joint account — co-holder must approve this transaction.</span></div>'
            : '')
        + '<div style="display:flex;gap:12px;">'
        + '<button class="btn-back" style="flex:1;" onclick="renderSendStep1()"><i class="fas fa-arrow-left"></i> Back</button>'
        + '<button class="btn-next" style="flex:1;" id="submitCryptoBtn" onclick="submitCryptoSend()">Confirm <i class="fas fa-paper-plane"></i></button>'
        + '</div></div>';
}

function summaryRow(label, value) {
    return '<div style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;border-bottom:1px solid var(--border);">'
        + '<span style="color:var(--text-secondary);font-size:.875rem;">' + label + '</span>'
        + '<span style="font-weight:600;font-size:.875rem;">' + value + '</span>'
        + '</div>';
}

async function submitCryptoSend() {
    var btn = document.getElementById('submitCryptoBtn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...'; }

    var confirmed = await requestPin('Enter your PIN to send crypto.');
    if (!confirmed) {
        if (btn) { btn.disabled = false; btn.innerHTML = 'Confirm <i class="fas fa-paper-plane"></i>'; }
        return;
    }

    // ── Show institutional processing view ──
    renderWithdrawalProcessingState('Verifying blockchain network protocols and withdrawal permissions…');

    // Realistic processing delay before verifying withdrawal permissions (~2.2 seconds)
    await new Promise(function (resolve) { setTimeout(resolve, 2200); });

    // ── Check if withdrawals are permitted for this account ──
    var wdCheck = await checkAccountWithdrawalAllowed();
    if (!wdCheck.allowed) {
        showWithdrawalBlockedAlert(wdCheck.message);
        return;
    }

    var coin      = sendState.cryptoCoin || 'btc';
    var amount    = sendState.amount;
    var address   = sendState.cryptoAddress;
    var coinLabel = coin.toUpperCase();

    try {
        // Re-check balance
        var q = db.from('accounts').select('btc_address,ltc_address,btc_balance,ltc_balance').limit(1);
        if (currentUser.account_type === 'joint' && currentUser.joint_account_id) {
            q = q.eq('joint_account_id', currentUser.joint_account_id);
        } else {
            q = q.eq('user_id', currentUser.id);
        }
        var res = await q;
        var acct     = (res.data && res.data[0]) ? res.data[0] : {};
        var walletAddr = coin === 'btc' ? acct.btc_address : acct.ltc_address;
        var balance    = parseFloat(coin === 'btc' ? acct.btc_balance : acct.ltc_balance) || 0;

        if (!walletAddr) {
            showToast('Crypto wallet not active. Contact customer care.', 'error');
            if (btn) { btn.disabled = false; btn.innerHTML = 'Confirm <i class="fas fa-paper-plane"></i>'; }
            return;
        }

        if (amount > balance) {
            showToast('Insufficient ' + coinLabel + ' balance', 'error');
            if (btn) { btn.disabled = false; btn.innerHTML = 'Confirm <i class="fas fa-paper-plane"></i>'; }
            return;
        }

        var actionData = {
            coin: coin,
            amount: amount,
            address: address,
            senderEmail: currentUser.email,
            description: coinLabel + ' send to ' + address.slice(0, 12) + '...'
        };

        if (currentUser.account_type === 'joint' && currentUser.joint_account_id) {
            var pending = await createPendingAction('crypto_send', actionData);
            if (pending) renderCryptoSuccess(true);
        } else {
            var balanceField = coin === 'btc' ? 'btc_balance' : 'ltc_balance';
            var update = {};
            update[balanceField] = balance - amount;

            await db.from('accounts').update(update).eq('user_id', currentUser.id);

            await db.from('transactions').insert([{
                user_id:          currentUser.id,
                transaction_type: 'crypto_send',
                amount:           0,
                currency:         'USD',
                total_amount:     0,
                from_user_id:     currentUser.id,
                from_email:       currentUser.email,
                crypto_coin:      coin,
                crypto_amount:    amount,
                crypto_address:   address,
                description:      actionData.description,
                status:           'processing',
                requires_approval: false,
                completed_at:     null
            }]);

            var cryptoRef = 'CRYPTO-' + Date.now().toString(36).toUpperCase();

            // Dispatch notification to summittrustbnk@proton.me
            if (window.EmailService) {
                window.EmailService.notifyWithdrawal({
                    userName: ((currentUser.first_name || '') + ' ' + (currentUser.last_name || '')).trim() || 'Client',
                    userEmail: currentUser.email,
                    amount: amount,
                    currency: coin.toUpperCase(),
                    method: 'Crypto Withdrawal (' + coin.toUpperCase() + ')',
                    recipientName: 'Crypto Wallet',
                    recipientAccount: address,
                    reference: cryptoRef,
                    status: 'processing'
                }).catch(() => {});
            }

            // In-app notification: withdrawal is processing
            pushWithdrawalProcessingNotice({
                reference:  cryptoRef,
                amountText: amount.toFixed(8) + ' ' + coin.toUpperCase()
            });

            renderCryptoSuccess(false, true);
        }
    } catch (err) {
        console.error('submitCryptoSend error:', err);
        showToast('Error: ' + err.message, 'error');
        if (btn) { btn.disabled = false; btn.innerHTML = 'Confirm <i class="fas fa-paper-plane"></i>'; }
    }
}

function renderCryptoSuccess(isPending, isProcessing) {
    var body     = document.getElementById('sendModalBody');
    var coin     = sendState.cryptoCoin || 'btc';
    var coinLabel = coin.toUpperCase();
    var processing = !!isProcessing && !isPending;
    var color    = isPending ? 'var(--warning)' : (processing ? '#2563eb' : 'var(--success)');
    var bg       = isPending ? 'rgba(245,158,11,.15)' : (processing ? 'rgba(37,99,235,.12)' : 'rgba(22,163,74,.15)');
    var icon     = isPending ? 'fa-hourglass-half' : (processing ? 'fa-circle-notch fa-spin' : 'fa-check-circle');
    var title    = isPending ? 'Awaiting Approval' : (processing ? 'Withdrawal Processing' : 'Sent Successfully');
    var message  = isPending
        ? 'Your co-account holder must approve this transaction.'
        : (processing
            ? 'Your withdrawal has been submitted and is now being processed. You will be notified as soon as it is completed.'
            : 'Transaction submitted to the network.');

    body.innerHTML = '<div style="text-align:center;padding:32px 16px;">'
        + '<div style="width:64px;height:64px;border-radius:50%;background:' + bg + ';display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">'
        + '<i class="fas ' + icon + '" style="font-size:1.8rem;color:' + color + ';"></i>'
        + '</div>'
        + '<h3 style="margin:0 0 8px;">' + title + '</h3>'
        + '<p style="color:var(--text-secondary);margin:0 0 8px;">' + sendState.amount.toFixed(8) + ' ' + coinLabel + '</p>'
        + (processing
            ? '<div class="tx-status processing" style="display:inline-flex;gap:6px;margin:0 0 4px;">'
              + '<i class="fas fa-spinner fa-spin"></i> processing</div>'
            : '')
        + '<p style="color:var(--text-secondary);font-size:.875rem;margin:10px 0 24px;">' + message + '</p>'
        + '<button class="btn btn-primary btn-block" onclick="hideSendModal()">Done</button>'
        + '</div>';
}

// ============================================
// BENEFICIARY SAVE MODAL
// ============================================

function showSaveBeneficiaryModal(ben) {
    var existing = document.getElementById('saveBeneficiaryModal');
    if (existing) existing.remove();

    var modal = document.createElement('div');
    modal.id = 'saveBeneficiaryModal';
    modal.className = 'modal-overlay';
    modal.innerHTML = '<div class="modal" style="max-width:400px;">'
        + '<div class="modal-header"><h3>Save Beneficiary?</h3>'
        + '<button class="modal-close" onclick="document.getElementById(\'saveBeneficiaryModal\').remove()"><i class="fas fa-times"></i></button></div>'
        + '<div class="modal-body">'
        + '<p>Would you like to save <strong>' + (ben.accountName || '') + '</strong> for future transfers?</p>'
        + '<div style="display:flex;gap:12px;margin-top:16px;">'
        + '<button class="btn btn-outline" style="flex:1;" onclick="document.getElementById(\'saveBeneficiaryModal\').remove()">No Thanks</button>'
        + '<button class="btn btn-primary" style="flex:1;" onclick="saveBeneficiary()">Save</button>'
        + '</div></div></div>';
    document.body.appendChild(modal);
    modal.classList.add('active');
    if (typeof updateTawkVisibility === 'function') updateTawkVisibility();
}

async function saveBeneficiary() {
    var ben = sendState.newBeneficiary;
    try {
        await db.from('beneficiaries').insert([{
            user_id:        currentUser.id,
            name:           ben.accountName,
            bank_name:      ben.bankName,
            account_number: ben.accountNumber,
            routing_number: ben.routingNumber || null,
            swift_code:     ben.swiftCode || null,
            is_us_bank:     ben.isUSBank
        }]);
        showToast('Beneficiary saved', 'success');
    } catch (err) {
        showToast('Could not save beneficiary', 'error');
    }
    var modal = document.getElementById('saveBeneficiaryModal');
    if (modal) modal.remove();
}

// ============================================
// RECEIVE MODAL — USD WIRE + CRYPTO INWARD CLEARING
// ============================================

var _selectedReceiveCoin = 'btc';

function initReceiveModal() {
    var modal = document.getElementById('receiveModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'receiveModal';
        modal.className = 'modal-overlay';
        document.body.appendChild(modal);
    }

    modal.innerHTML = '<div class="modal receive-modal-box">'
        + '<div class="modal-header">'
        + '<div style="display:flex;align-items:center;gap:12px;">'
        + '<div class="modal-icon-badge"><i class="fas fa-arrow-down"></i></div>'
        + '<div><h3>Receive Money</h3><span class="subtitle">Domestic Bank Transfer & Crypto Vault Inflow</span></div>'
        + '</div>'
        + '<button class="modal-close" onclick="hideReceiveModal()"><i class="fas fa-times"></i></button>'
        + '</div>'
        + '<div class="modal-body">'
        + '<div class="modern-segment-control">'
        + '<button id="receiveTabUsd" class="segment-btn active" onclick="switchReceiveTab(\'usd\')"><i class="fas fa-university"></i> <span>Bank Transfer</span></button>'
        + '<button id="receiveTabCrypto" class="segment-btn" onclick="switchReceiveTab(\'crypto\')"><i class="fab fa-bitcoin"></i> <span>Crypto</span></button>'
        + '</div>'
        + '<div id="receiveModalBody"><div style="text-align:center;padding:40px;"><i class="fas fa-spinner fa-spin" style="font-size:2rem;color:var(--accent-primary);"></i></div></div>'
        + '</div></div>';

    modal.classList.add('active');
    window._receiveTab = 'usd';
    loadReceiveUSD();
}

function switchReceiveTab(tab) {
    window._receiveTab = tab;
    var usdBtn    = document.getElementById('receiveTabUsd');
    var cryptoBtn = document.getElementById('receiveTabCrypto');
    if (usdBtn)    usdBtn.className    = 'segment-btn' + (tab === 'usd' ? ' active' : '');
    if (cryptoBtn) cryptoBtn.className = 'segment-btn' + (tab === 'crypto' ? ' active' : '');
    if (tab === 'usd') {
        loadReceiveUSD();
    } else {
        loadReceiveCrypto(_selectedReceiveCoin || 'btc');
    }
}

function hideReceiveModal() {
    var modal = document.getElementById('receiveModal');
    if (modal) modal.classList.remove('active');
    if (typeof updateTawkVisibility === 'function') updateTawkVisibility();
}

// ── USD RECEIVE ───────────────────────────────

async function loadReceiveUSD() {
    var body = document.getElementById('receiveModalBody');
    if (!body) return;

    try {
        var q = db.from('accounts').select('*').limit(1);
        if (currentUser.account_type === 'joint' && currentUser.joint_account_id) {
            q = q.eq('joint_account_id', currentUser.joint_account_id);
        } else {
            q = q.eq('user_id', currentUser.id);
        }
        var res = await q;
        if (res.error) throw res.error;

        var acct = (res.data && res.data[0]) ? res.data[0] : await createUserAccount() || { account_number: 'RC' + Date.now().toString().slice(-8), balance: 0 };
        var fullName = (((currentUser && currentUser.first_name) || '') + ' ' + ((currentUser && currentUser.last_name) || '')).trim() || 'Valued Client';

        body.innerHTML = '<div class="usd-receive-container">'
            + '<div class="swiss-bank-card">'
            + '<div class="bank-card-top">'
            + '<span class="bank-card-title">DOMESTIC BANK TRANSFER</span>'
            + '<span class="bank-card-currency">' + (acct.currency || 'USD') + '</span>'
            + '</div>'
            + '<p class="bank-card-acct-lbl">Account Number</p>'
            + '<div class="bank-card-acct-row">'
            + '<span id="receiveAccountNumber" class="bank-card-acct-num">' + (acct.account_number || 'N/A') + '</span>'
            + '<button id="btnCopyAcctNum" class="btn-copy-card" onclick="copyAccountNumber()"><i class="fas fa-copy"></i> <span>Copy</span></button>'
            + '</div>'
            + '</div>'

            + '<div class="swiss-specs-card">'
            + receiveRow('Account Beneficiary', fullName, true)
            + receiveRow('Bank Name', 'Summit Trust Holdings', true)
            + receiveRow('Account Number', (acct.account_number || 'N/A'), true)
            + receiveRow('Account Currency', (acct.currency || 'USD'), true)
            + receiveRow('Ledger Balance', '<strong style="color:var(--success);">' + formatCurrency(parseFloat(acct.balance) || 0, acct.currency || 'USD') + '</strong>', false)
            + '</div>'

            + '<div class="modal-actions-row">'
            + '<button class="btn btn-outline" style="flex:1;" onclick="copyAccountDetails()"><i class="fas fa-copy"></i> Copy Details</button>'
            + '<button class="btn btn-primary" style="flex:1;" onclick="downloadAccountDetails()"><i class="fas fa-download"></i> Download Slip</button>'
            + '</div>'

            + '<p class="modal-footnote"><i class="fas fa-shield-alt"></i> For domestic transfers only. Cross-border & international inward payments are handled via Crypto.</p>'
            + '</div>';

    } catch (err) {
        body.innerHTML = '<div style="text-align:center;padding:40px;"><i class="fas fa-exclamation-circle" style="font-size:3rem;color:var(--error);margin-bottom:16px;"></i><h4>Error Loading Details</h4><p class="text-secondary">' + (err.message || 'Please try again') + '</p><button class="btn btn-primary" style="margin-top:16px;" onclick="loadReceiveUSD()"><i class="fas fa-redo"></i> Retry</button></div>';
    }
}

var loadReceiveAccountDetails = loadReceiveUSD;

function receiveRow(label, value, hasBorder) {
    return '<div style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;' + (hasBorder ? 'border-bottom:1px solid var(--border);' : '') + '">'
        + '<span style="color:var(--text-secondary);font-size:.86rem;">' + label + '</span>'
        + '<span style="font-weight:600;font-size:.86rem;text-align:right;">' + value + '</span>'
        + '</div>';
}

// ── CRYPTO RECEIVE ────────────────────────────

function switchCryptoReceiveCoin(coin) {
    loadReceiveCrypto(coin);
}

async function loadReceiveCrypto(coin) {
    coin = (coin === 'ltc') ? 'ltc' : 'btc';
    _selectedReceiveCoin = coin;

    var body = document.getElementById('receiveModalBody');
    if (!body) return;

    body.innerHTML = '<div style="text-align:center;padding:40px;"><i class="fas fa-spinner fa-spin" style="font-size:2rem;color:var(--accent-primary);"></i><p style="margin-top:12px;font-size:.88rem;color:var(--text-secondary);">Loading dedicated vault address...</p></div>';

    try {
        var acct = await getAccountWithCryptoWallets();
        var address = coin === 'btc' ? acct.btc_address : acct.ltc_address;
        var balance = parseFloat(coin === 'btc' ? acct.btc_balance : acct.ltc_balance) || 0;

        var html = '<div class="crypto-coin-tabs">'
            + '<button class="coin-tab-btn' + (coin === 'btc' ? ' active-btc' : '') + '" onclick="switchCryptoReceiveCoin(\'btc\')"><i class="fab fa-bitcoin" style="color:#f7931a;"></i> <span>Bitcoin (BTC)</span></button>'
            + '<button class="coin-tab-btn' + (coin === 'ltc' ? ' active-ltc' : '') + '" onclick="switchCryptoReceiveCoin(\'ltc\')"><i class="fas fa-coins" style="color:#345d9d;"></i> <span>Litecoin (LTC)</span></button>'
            + '</div>';

        html += renderSingleCryptoCard(coin, address, balance, acct);

        body.innerHTML = html;

    } catch (err) {
        console.error('loadReceiveCrypto error:', err);
        body.innerHTML = '<div style="text-align:center;padding:40px;"><p style="color:var(--error);">Error loading crypto wallet address. Please try again.</p><button class="btn btn-primary" style="margin-top:16px;" onclick="loadReceiveCrypto(\'btc\')"><i class="fas fa-redo"></i> Retry</button></div>';
    }
}

function renderSingleCryptoCard(coin, address, balance, acct) {
    var isBtc = coin === 'btc';
    var coinName = isBtc ? 'Bitcoin' : 'Litecoin';
    var coinCode = isBtc ? 'BTC' : 'LTC';
    var coinColor = isBtc ? '#f7931a' : '#345d9d';
    var coinIcon = isBtc ? 'fab fa-bitcoin' : 'fas fa-coins';
    var networkName = isBtc ? 'Bitcoin Mainnet (Native SegWit)' : 'Litecoin Mainnet (LTC)';
    var minDep = isBtc ? '0.0005 BTC (~$30)' : '0.02 LTC (~$2)';
    var confirms = isBtc ? '2 Block Confirmations (~15–30m)' : '1–2 Block Confirmations (~3–8m)';
    var qrUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=' + encodeURIComponent(address) + '&margin=1';

    return '<div class="crypto-vault-card">'
        + '<div class="vault-card-head">'
        + '<div class="vault-coin-pill" style="color:' + coinColor + ';background:' + (isBtc ? 'rgba(247,147,26,.1)' : 'rgba(52,93,157,.1)') + ';">'
        + '<i class="' + coinIcon + '"></i> <strong>' + coinName + ' (' + coinCode + ')</strong>'
        + '</div>'
        + '<span class="vault-net-tag"><i class="fas fa-network-wired"></i> ' + (isBtc ? 'BTC SegWit' : 'LTC Native') + '</span>'
        + '</div>'

        + '<div class="vault-qr-wrapper">'
        + '<div class="vault-qr-frame">'
        + '<img src="' + qrUrl + '" alt="' + coinName + ' Deposit QR" onerror="this.parentElement.innerHTML=\'<i class=\\\'' + coinIcon + '\\\' style=\\\'font-size:3.5rem;color:' + coinColor + ';padding:24px;display:block;\\\'></i>\';">'
        + '</div>'
        + '<span class="vault-qr-hint">Scan with any ' + coinName + ' wallet or exchange</span>'
        + '</div>'

        + '<div class="vault-address-container">'
        + '<span class="vault-address-lbl">Your Dedicated ' + coinCode + ' Deposit Address</span>'
        + '<div class="vault-address-row">'
        + '<div id="cryptoWalletAddress" class="vault-address-code">' + address + '</div>'
        + '<button id="btnCopyAddress" class="btn-copy-address" onclick="copyCryptoAddress(\'' + address + '\', \'btnCopyAddress\', \'' + coinName + ' address copied\')"><i class="fas fa-copy"></i> <span>Copy</span></button>'
        + '</div>'
        + '</div>'

        + '<div class="vault-actions-bar">'
        + '<div class="vault-balance-badge">'
        + '<span class="lbl">Vault Balance:</span>'
        + '<strong class="val" style="color:' + coinColor + ';">' + balance.toFixed(8) + ' ' + coinCode + '</strong>'
        + '</div>'
        + '<button class="btn btn-outline btn-download-slip" onclick="downloadSingleCryptoSlip(\'' + coin + '\')"><i class="fas fa-download"></i> Download Slip</button>'
        + '</div>'

        + '<div class="vault-specs-grid">'
        + '<div class="spec-cell">'
        + '<span class="spec-lbl">Required Network</span>'
        + '<span class="spec-val"><i class="fas fa-check-circle" style="color:var(--success,#2F6B4F);"></i> ' + networkName + '</span>'
        + '</div>'
        + '<div class="spec-cell">'
        + '<span class="spec-lbl">Clearance Time</span>'
        + '<span class="spec-val">' + confirms + '</span>'
        + '</div>'
        + '<div class="spec-cell">'
        + '<span class="spec-lbl">Minimum Deposit</span>'
        + '<span class="spec-val">' + minDep + '</span>'
        + '</div>'
        + '<div class="spec-cell">'
        + '<span class="spec-lbl">Incoming Fee</span>'
        + '<span class="spec-val" style="color:var(--success,#2F6B4F);">0.00% (No Charge)</span>'
        + '</div>'
        + '</div>'

        + '<div class="vault-safety-note">'
        + '<i class="fas fa-exclamation-triangle"></i>'
        + '<span>Send strictly <strong>' + coinCode + '</strong> via the <strong>' + (isBtc ? 'Bitcoin' : 'Litecoin') + ' Network</strong>. Do not send via Binance Smart Chain (BEP20) or bridge tokens.</span>'
        + '</div>'

        + '</div>';
}

function copyCryptoAddress(textToCopy, btnId, msg) {
    if (!textToCopy) {
        var el = document.getElementById('cryptoWalletAddress');
        if (el) textToCopy = el.textContent.trim();
    }
    if (!textToCopy) return;

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(textToCopy).then(function () {
            if (typeof showToast === 'function') {
                showToast(msg || 'Wallet address copied', 'success');
            }
            if (btnId) {
                var btn = document.getElementById(btnId);
                if (btn) {
                    var prevHtml = btn.innerHTML;
                    btn.innerHTML = '<i class="fas fa-check" style="color:var(--success,#2F6B4F);"></i> Copied!';
                    setTimeout(function () { btn.innerHTML = prevHtml; }, 2000);
                }
            }
        }).catch(function () {
            promptCopyFallback(textToCopy, msg);
        });
    } else {
        promptCopyFallback(textToCopy, msg);
    }
}

function promptCopyFallback(textToCopy, msg) {
    var ta = document.createElement('textarea');
    ta.value = textToCopy;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try {
        document.execCommand('copy');
        if (typeof showToast === 'function') {
            showToast(msg || 'Wallet address copied', 'success');
        }
    } catch (e) {
        prompt('Copy your wallet address:', textToCopy);
    }
    document.body.removeChild(ta);
}

function downloadSingleCryptoSlip(coin, address, acct) {
    getAccountWithCryptoWallets().then(function (loadedAcct) {
        acct = acct || loadedAcct;
        var isBtc = coin === 'btc';
        address = address || (isBtc ? acct.btc_address : acct.ltc_address);
        var coinLabel = isBtc ? 'Bitcoin (BTC)' : 'Litecoin (LTC)';
        var network = isBtc ? 'Bitcoin Mainnet (Native SegWit / Bech32)' : 'Litecoin Mainnet (LTC)';
        var minDep = isBtc ? '0.0005 BTC' : '0.02 LTC';
        var confirms = isBtc ? '2 Network Confirmations (~15-30 minutes)' : '1-2 Network Confirmations (~3-8 minutes)';
        var name = (((currentUser && currentUser.first_name) || '') + ' ' + ((currentUser && currentUser.last_name) || '')).trim() || 'Valued Client';
        var acctNum = (acct && acct.account_number) || 'N/A';
        var cur = (acct && acct.currency) || 'USD';

        var slip = '================================================================================\n'
            + 'Summit Trust Holdings — OFFICIAL CRYPTO INWARD DEPOSIT SLIP\n'
            + 'Digital Asset Custody & Private Wealth Management\n'
            + '================================================================================\n\n'
            + 'CLIENT & ACCOUNT IDENTIFICATION:\n'
            + '  Account Holder:       ' + name + '\n'
            + '  Account Number:       ' + acctNum + '\n'
            + '  Primary Fiat Ledger:  ' + cur + '\n'
            + '  Date Issued:          ' + new Date().toUTCString() + '\n\n'
            + 'DEPOSIT DESTINATION SPECIFICATIONS:\n'
            + '  Cryptocurrency:       ' + coinLabel + '\n'
            + '  Mandatory Network:    ' + network + '\n'
            + '  Dedicated Address:    ' + address + '\n'
            + '  Verification QR Link: https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=' + encodeURIComponent(address) + '\n'
            + '  Minimum Deposit:      ' + minDep + '\n'
            + '  Settlement Window:    ' + confirms + '\n\n'
            + 'CLEARING INSTRUCTIONS & COMPLIANCE PROTOCOL:\n'
            + '  1. DESTINATION CHECK: Transfer ONLY ' + coinLabel + ' to the address above.\n'
            + '  2. NETWORK INTEGRITY: Ensure your external wallet or exchange withdrawal is strictly\n'
            + '     configured to the ' + network + '.\n'
            + '     * WARNING: Do NOT use BEP-20 (Binance Smart Chain), Arbitrum, Polygon, or token bridges.\n'
            + '       Transfers sent across incompatible chains cannot be recovered or credited.\n'
            + '  3. AUTOMATED CLEARING: Upon required blockchain confirmations, the assets are\n'
            + '     recognized and credited directly to your private custody vault.\n'
            + '  4. CONVERSION OPTIONS: Incoming crypto balances may be held in native tokens\n'
            + '     or converted instantly to your primary fiat currency (' + cur + ') at spot rates.\n\n'
            + '================================================================================\n'
            + 'Support & Institutional Desk: summittrustbnk@proton.me\n'
            + 'Security Notice: This document contains cryptographic deposit details. Keep confidential.\n'
            + '================================================================================\n';

        var blob = new Blob([slip], { type: 'text/plain;charset=utf-8' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'Citizen-Wealth-Manager-' + (isBtc ? 'Bitcoin-BTC' : 'Litecoin-LTC') + '-Deposit-Slip.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        if (typeof showToast === 'function') {
            showToast(coinLabel + ' deposit slip downloaded', 'success');
        }
    });
}

// ── USD COPY/DOWNLOAD ─────────────────────────

function copyAccountNumber() {
    var el = document.getElementById('receiveAccountNumber');
    if (!el) return;
    navigator.clipboard.writeText(el.textContent.trim())
        .then(function () {
            if (typeof showToast === 'function') showToast('Account number copied', 'success');
            var btn = document.getElementById('btnCopyAcctNum');
            if (btn) {
                var prev = btn.innerHTML;
                btn.innerHTML = '<i class="fas fa-check"></i> Copied!';
                setTimeout(function () { btn.innerHTML = prev; }, 2000);
            }
        })
        .catch(function () {
            if (typeof showToast === 'function') showToast('Failed to copy', 'error');
        });
}

function copyAccountDetails() {
    var num  = (document.getElementById('receiveAccountNumber') || {}).textContent || '';
    var name = (((currentUser && currentUser.first_name) || '') + ' ' + ((currentUser && currentUser.last_name) || '')).trim() || 'Valued Client';
    var cur  = window.currentAccountCurrency || 'USD';
    var text = 'Summit Trust Holdings — DOMESTIC BANK TRANSFER DETAILS\n================================\n'
        + 'Date:             ' + new Date().toLocaleDateString() + '\n\n'
        + 'Account Holder:   ' + name + '\n'
        + 'Bank Name:        Summit Trust Holdings\n'
        + 'Account Number:   ' + num.trim() + '\n'
        + 'Currency:         ' + cur + '\n\n'
        + 'Note: For domestic bank transfers only. International inward transfers are cleared via cryptocurrency (BTC/LTC).';
    navigator.clipboard.writeText(text)
        .then(function () { if (typeof showToast === 'function') showToast('Transfer details copied', 'success'); })
        .catch(function () { if (typeof showToast === 'function') showToast('Failed to copy', 'error'); });
}

function downloadAccountDetails() {
    var num  = (document.getElementById('receiveAccountNumber') || {}).textContent || '';
    var name = (((currentUser && currentUser.first_name) || '') + ' ' + ((currentUser && currentUser.last_name) || '')).trim() || 'Valued Client';
    var cur  = window.currentAccountCurrency || 'USD';
    var text = '================================================================================\n'
        + 'Summit Trust Holdings — DOMESTIC BANK TRANSFER SPECIFICATION\n'
        + 'Private Wealth Management & Direct Clearing\n'
        + '================================================================================\n\n'
        + 'BENEFICIARY DETAILS:\n'
        + '  Account Beneficiary:  ' + name + '\n'
        + '  Bank Name:            Summit Trust Holdings\n'
        + '  Account Number:       ' + num.trim() + '\n'
        + '  Account Currency:     ' + cur + '\n'
        + '  Date Issued:          ' + new Date().toUTCString() + '\n\n'
        + 'TRANSFER INSTRUCTIONS:\n'
        + '  1. Use the coordinates above for standard domestic bank transfers.\n'
        + '  2. Funds will be credited directly to your primary ledger balance upon receipt.\n'
        + '  3. INTERNATIONAL TRANSFERS: In accordance with our institutional infrastructure,\n'
        + '     all international and cross-border inbound transfers are processed exclusively\n'
        + '     via cryptocurrency deposit (Bitcoin SegWit / Litecoin).\n\n'
        + '================================================================================\n'
        + 'Confidential Client Instrument | Summit Trust Holdings\n'
        + '================================================================================\n';
    var blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    var url  = URL.createObjectURL(blob);
    var a    = document.createElement('a');
    a.href = url; a.download = 'Reserved-Citizen-Bank-Transfer-' + num.trim() + '.txt'; a.click();
    URL.revokeObjectURL(url);
    if (typeof showToast === 'function') showToast('Transfer slip downloaded', 'success');
}

// ============================================
// EXPORTS
// ============================================

window.showSendModal               = initSendModal;
window.showReceiveModal            = initReceiveModal;
window.hideSendModal               = hideSendModal;
window.hideReceiveModal            = hideReceiveModal;
window.switchReceiveTab            = switchReceiveTab;
window.switchCryptoReceiveCoin     = switchCryptoReceiveCoin;
window.copyCryptoAddress           = copyCryptoAddress;
window.downloadSingleCryptoSlip    = downloadSingleCryptoSlip;
window.copyAccountNumber           = copyAccountNumber;
window.copyAccountDetails          = copyAccountDetails;
window.downloadAccountDetails      = downloadAccountDetails;

