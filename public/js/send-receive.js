// ============================================
// SEND & RECEIVE MODULES
// ============================================

const US_BANKS = [
  "JPMorgan Chase","Bank of America","Wells Fargo","Citibank",
  "U.S. Bank","Truist Bank","PNC Bank","TD Bank","Capital One",
  "Charles Schwab Bank","Goldman Sachs Bank","Morgan Stanley Bank",
  "HSBC Bank USA","American Express Bank","Ally Bank","Discover Bank",
  "Synchrony Bank","Barclays Bank US","BMO Harris Bank","Citizens Bank",
  "Fifth Third Bank","KeyBank","M&T Bank","Regions Bank","Huntington Bank",

  "First Republic Bank","Silicon Valley Bank","Signature Bank",
  "Comerica Bank","Zions Bank","First Horizon Bank","East West Bank",
  "Western Alliance Bank","Popular Bank","BankUnited","New York Community Bank",
  "First Citizens Bank","Webster Bank","Frost Bank","Old National Bank",
  "South State Bank","UMB Bank","Valley National Bank","Associated Bank",
  "Prosperity Bank","Texas Capital Bank","Wintrust Bank","United Bank",
  "Glacier Bank","Atlantic Union Bank","First Interstate Bank",
  "Pinnacle Bank","FirstBank","Banner Bank","Pacific Premier Bank",
  "Customers Bank","Cathay Bank","Hanmi Bank","Hope Bank",
  "Lakeland Bank","Sterling National Bank","Bank OZK",
  "Arvest Bank","BancorpSouth Bank","MidFirst Bank",
  "Commerce Bank","First Financial Bank","United Community Bank",
  "Trustmark Bank","Simmons Bank","Renasant Bank",
  "Independent Bank","ServisFirst Bank","First Midwest Bank",
  "Great Western Bank","Central Bank","TowneBank",
  "NBH Bank","Origin Bank","Heritage Bank",
  "Columbia Bank","Fulton Bank","WSFS Bank",
  "Seacoast Bank","Ameris Bank","Berkshire Bank",
  "Old Second Bank","Park National Bank","Stock Yards Bank",
  "First Merchants Bank","Horizon Bank","Peoples Bank",
  "United Bankshares","Farmers National Bank","City National Bank",
  "Bank of Hawaii","First Hawaiian Bank","Central Pacific Bank",
  "Bank of the West","MUFG Union Bank","Rabobank NA",
  "First National Bank of America","First National Bank Texas",
  "First National Bank Alaska","First National Bank of Omaha",
  "First National Bank","City Bank","Flagstar Bank",
  "Axos Bank","Live Oak Bank","Quontic Bank",
  "Cross River Bank","Green Dot Bank","Varo Bank",
  "Current Bank","Chime Bank"
];

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
        routingNumber: '', swiftCode: '', isUSBank: true
    },
    transactionReference: null,
    balance: 0
};

// ============================================
// SEND — INIT & TEARDOWN
// ============================================

async function initSendModal() {
    // ── Withdrawal control check ─────────────────
    // Fetch allow_withdrawal and alert message for this account before opening
    try {
        var wdQ = db.from('accounts')
            .select('allow_withdrawal, withdrawal_alert_msg')
            .eq('status', 'active')
            .limit(1);

        if (typeof currentUser !== 'undefined' && currentUser) {
            if (currentUser.account_type === 'joint' && currentUser.joint_account_id) {
                wdQ = wdQ.eq('joint_account_id', currentUser.joint_account_id);
            } else {
                wdQ = wdQ.eq('user_id', currentUser.id);
            }
        }

        var wdRes = await wdQ;
        var wdAcct = wdRes.data && wdRes.data[0] ? wdRes.data[0] : null;

        if (wdAcct && wdAcct.allow_withdrawal === false) {
            // Show the withdrawal blocked alert instead of the send modal
            showWithdrawalBlockedAlert(wdAcct.withdrawal_alert_msg);
            return;
        }
    } catch (wdErr) {
        console.warn('Withdrawal check error:', wdErr);
        // Non-fatal — allow modal to open if check fails
    }
    // ── Normal send modal ────────────────────────
    const modal = document.getElementById('sendModal');
    if (!modal) return;
    modal.innerHTML = '<div class="modal" style="max-width:600px;">'
        + '<div class="modal-header"><h3>Send Money</h3>'
        + '<button class="modal-close" onclick="hideSendModal()"><i class="fas fa-times"></i></button></div>'
        + '<div class="modal-body" id="sendModalBody"></div></div>';
    resetSendState();
    loadUserBalance();
    renderSendStep1();
    modal.classList.add('active');
}

// ── Withdrawal blocked alert modal ────────────
function showWithdrawalBlockedAlert(customMsg) {
    var DEFAULT_MSG = 'Withdrawals are temporarily unavailable on your account. Please contact support for assistance.';
    var message = (customMsg && customMsg.trim()) ? customMsg.trim() : DEFAULT_MSG;

    // Reuse sendModal element so we don't need a new DOM element
    var modal = document.getElementById('sendModal');
    if (!modal) return;

    modal.innerHTML =
        '<div class="modal" style="max-width:440px;">'
        + '<div class="modal-header">'
        + '<h3 style="display:flex;align-items:center;gap:8px;">'
        + '<i class="fas fa-ban" style="color:var(--error,#ef4444);"></i> Oops!'
        + '</h3>'
        + '<button class="modal-close" onclick="hideSendModal()"><i class="fas fa-times"></i></button>'
        + '</div>'
        + '<div class="modal-body">'

        // Icon banner
        + '<div style="text-align:center;padding:24px 0 20px;">'
        + '<div style="width:72px;height:72px;border-radius:50%;background:rgba(239,68,68,.1);'
        + 'display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">'
        + '<i class="fas fa-lock" style="font-size:1.8rem;color:var(--error,#ef4444);"></i>'
        + '</div>'
        + '<p style="font-size:.95rem;line-height:1.6;color:var(--text-secondary);">' + escHtml(message) + '</p>'
        + '</div>'

        // Contact support hint
        + '<div style="background:rgba(239,68,68,.06);border:1px solid rgba(239,68,68,.25);'
        + 'border-radius:10px;padding:12px 14px;margin-bottom:20px;'
        + 'display:flex;align-items:flex-start;gap:10px;">'
        + '<i class="fas fa-info-circle" style="color:var(--error,#ef4444);margin-top:2px;flex-shrink:0;"></i>'
        + '<span style="font-size:.83rem;color:var(--text-secondary);line-height:1.5;">'
        + 'If you believe this is a mistake, please reach out to our support team and we\'ll help you right away.'
        + '</span>'
        + '</div>'

        // Buttons
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

// Safe HTML escape for alert message (no XSS from DB)
function escHtml(str) {
    return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function hideSendModal() {
    var modal = document.getElementById('sendModal');
    if (modal) modal.classList.remove('active');
    resetSendState();
}

function resetSendState() {
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
            routingNumber: '', swiftCode: '', isUSBank: true
        },
        transactionReference: null,
        balance: sendState.balance || 0
    };
}

async function loadUserBalance() {
    try {
        var q = db.from('accounts').select('balance');
        if (currentUser.account_type === 'joint' && currentUser.joint_account_id) {
            q = q.eq('joint_account_id', currentUser.joint_account_id);
        } else {
            q = q.eq('user_id', currentUser.id);
        }
        var res = await q.limit(1);
        if (!res.error && res.data && res.data[0]) {
            sendState.balance = parseFloat(res.data[0].balance) || 0;
        }
    } catch (err) {
        console.error('loadUserBalance error:', err);
    }
}

// ============================================
// SEND — STEP INDICATOR
// ============================================

function renderStepIndicator(currentStep) {
    var steps = [
        { number: 1, label: 'Amount' },
        { number: 2, label: 'Beneficiary' },
        { number: 3, label: 'Review' }
    ];
    var html = '<div class="step-indicator">';
    for (var i = 0; i < steps.length; i++) {
        var s = steps[i];
        var circleClass = 'step-circle'
            + (s.number === currentStep ? ' active' : '')
            + (s.number < currentStep ? ' completed' : '');
        var inner = s.number < currentStep
            ? '<i class="fas fa-check"></i>'
            : String(s.number);
        html += '<div class="step-item">'
            + '<div class="' + circleClass + '">' + inner + '</div>'
            + (i < steps.length - 1
                ? '<div class="step-line' + (s.number < currentStep ? ' completed' : '') + '"></div>'
                : '')
            + '</div>';
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
    var coinColor = coin === 'btc' ? '#ab6209;' : '#345d9d';

    // Mode tab styles
    var usdTabStyle = 'flex:1;padding:9px 0;border:none;cursor:pointer;font-weight:600;font-size:.875rem;'
        + (!isCrypto ? 'background:var(--accent-primary);color:#fff;' : 'background:var(--bg-secondary);color:var(--text-secondary);');
    var cryptoTabStyle = 'flex:1;padding:9px 0;border:none;cursor:pointer;font-weight:600;font-size:.875rem;'
        + (isCrypto ? 'background:var(--accent-primary);color:#fff;' : 'background:var(--bg-secondary);color:var(--text-secondary);');

    var html = renderStepIndicator(1)
        + '<div class="step-content">'
        + '<div style="display:flex;gap:0;border:1px solid var(--border);border-radius:10px;overflow:hidden;margin-bottom:20px;">'
        + '<button onclick="switchSendMode(\'usd\')" style="' + usdTabStyle + '"><i class="fas fa-dollar-sign"></i> USD</button>'
        + '<button onclick="switchSendMode(\'crypto\')" style="' + cryptoTabStyle + '"><i class="fab fa-bitcoin"></i> Crypto</button>'
        + '</div>';

    if (isCrypto) {
        // Coin selector
        var btcBorder = coin === 'btc' ? '#ab6209;' : 'var(--border)';
        var ltcBorder = coin === 'ltc' ? '#345d9d' : 'var(--border)';
        var btcBg = coin === 'btc' ? 'rgba(247,147,26,.1)' : 'var(--bg-secondary)';
        var ltcBg = coin === 'ltc' ? 'rgba(52,93,157,.1)' : 'var(--bg-secondary)';
        var btcColor = coin === 'btc' ? '#ab6209;' : 'var(--text-secondary)';
        var ltcColor = coin === 'ltc' ? '#345d9d' : 'var(--text-secondary)';

        html += '<div style="display:flex;gap:8px;margin-bottom:20px;">'
            + '<button onclick="switchCryptoCoin(\'btc\')" style="flex:1;padding:10px;border-radius:8px;cursor:pointer;font-weight:600;font-size:.875rem;border:2px solid ' + btcBorder + ';background:' + btcBg + ';color:' + btcColor + ';"><i class="fab fa-bitcoin"></i> Bitcoin</button>'
            + '<button onclick="switchCryptoCoin(\'ltc\')" style="flex:1;padding:10px;border-radius:8px;cursor:pointer;font-weight:600;font-size:.875rem;border:2px solid ' + ltcBorder + ';background:' + ltcBg + ';color:' + ltcColor + ';"><i class="fas fa-coins"></i> Litecoin</button>'
            + '</div>';

        html += '<div class="available-balance" style="border-color:' + coinColor + ';">'
            + '<span class="balance-label">' + coinLabel + ' Balance</span>'
            + '<span class="balance-value" id="cryptoBalanceDisplay" style="color:' + coinColor + ';">Loading...</span>'
            + '</div>';

        html += '<div id="cryptoWalletWarning"></div>';

        html += '<div class="amount-input-container" style="margin-top:16px;">'
            + '<span class="amount-currency" style="font-size:.9rem;">' + coinLabel + '</span>'
            + '<input type="number" id="sendCryptoAmount" class="amount-input" placeholder="0.00000000" min="0.000001" step="0.000001" value="' + (sendState.amount || '') + '">'
            + '</div>'
            + '<div id="cryptoAmountValidation" class="amount-validation-message"></div>';

        html += '<div style="margin-top:16px;">'
            + '<label style="font-size:.875rem;color:var(--text-secondary);display:block;margin-bottom:6px;">Recipient ' + coinLabel + ' Address</label>'
            + '<input type="text" id="sendCryptoAddress" class="form-input" placeholder="Enter ' + coinLabel + ' wallet address" value="' + (sendState.cryptoAddress || '') + '" style="font-family:monospace;font-size:.85rem;">'
            + '<div id="cryptoAddressValidation" class="amount-validation-message"></div>'
            + '</div>';

        html += '<div style="margin-top:20px;">'
            + '<button class="btn-next" id="cryptoNextBtn" disabled>Continue <i class="fas fa-arrow-right"></i></button>'
            + '</div>';

    } else {
        // USD amount input
        html += '<div class="available-balance">'
            + '<span class="balance-label">Available Balance</span>'
            + '<span class="balance-value">' + formatCurrency(sendState.balance) + '</span>'
            + '</div>'
            + '<div class="amount-input-container">'
            + '<span class="amount-currency">$</span>'
            + '<input type="number" id="sendAmount" class="amount-input" placeholder="0.00" min="0.01" step="0.01" value="' + (sendState.amount || '') + '">'
            + '</div>'
            + '<div id="amountValidationMessage" class="amount-validation-message"></div>'
            + '<div style="margin-top:24px;">'
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

async function loadCryptoBalance(coin) {
    var display = document.getElementById('cryptoBalanceDisplay');
    var warning = document.getElementById('cryptoWalletWarning');
    if (!display) return;

    try {
        var q = db.from('accounts').select('btc_address,ltc_address,btc_balance,ltc_balance').limit(1);
        if (currentUser.account_type === 'joint' && currentUser.joint_account_id) {
            q = q.eq('joint_account_id', currentUser.joint_account_id);
        } else {
            q = q.eq('user_id', currentUser.id);
        }
        var res = await q;
        var acct = (res.data && res.data[0]) ? res.data[0] : {};
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

    if (!input.value || isNaN(amount) || amount <= 0) {
        if (validationMsg) { validationMsg.className = 'amount-validation-message error'; validationMsg.innerHTML = '<i class="fas fa-exclamation-circle"></i> Please enter a valid amount'; }
        if (nextBtn) nextBtn.disabled = true;
        input.classList.add('error');
        return false;
    }

    if (amount > sendState.balance) {
        if (validationMsg) { validationMsg.className = 'amount-validation-message error'; validationMsg.innerHTML = '<i class="fas fa-exclamation-circle"></i> Insufficient balance. You have ' + formatCurrency(sendState.balance) + ' available'; }
        if (nextBtn) nextBtn.disabled = true;
        input.classList.add('error');
        return false;
    }

    if (amount > 10000) {
        if (validationMsg) { validationMsg.className = 'amount-validation-message warning'; validationMsg.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Amounts over $10,000 may require additional verification'; }
    } else {
        if (validationMsg) { validationMsg.className = 'amount-validation-message success'; validationMsg.innerHTML = '<i class="fas fa-check-circle"></i> Amount is valid'; }
    }

    sendState.amount = amount;
    if (nextBtn) {
        nextBtn.disabled = false;
        input.classList.remove('error');
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
    var isUS = sendState.newBeneficiary.isUSBank;
    var bankOptions = US_BANKS.map(function (b) {
        return '<option value="' + b + '"' + (sendState.newBeneficiary.bankName === b ? ' selected' : '') + '>' + b + '</option>';
    }).join('');

    return '<div class="new-beneficiary-form">'
        + '<div class="form-group">'
        + '<label class="form-label">Account Holder Name</label>'
        + '<input type="text" id="benName" class="form-input" placeholder="Full name" value="' + (sendState.newBeneficiary.accountName || '') + '" oninput="updateNewBeneficiary()">'
        + '</div>'
        + '<div class="form-group">'
        + '<label class="form-label">Account Number</label>'
        + '<input type="text" id="benAccountNumber" class="form-input" placeholder="Account number" value="' + (sendState.newBeneficiary.accountNumber || '') + '" oninput="updateNewBeneficiary()">'
        + '</div>'
        + '<div class="form-group">'
        + '<label class="form-label">Bank Type</label>'
        + '<div style="display:flex;gap:8px;">'
        + '<button class="btn' + (isUS ? ' btn-primary' : ' btn-outline') + '" style="flex:1;" onclick="setBankType(true)">US Bank</button>'
        + '<button class="btn' + (!isUS ? ' btn-primary' : ' btn-outline') + '" style="flex:1;" onclick="setBankType(false)">International</button>'
        + '</div></div>'
        + (isUS
            ? '<div class="form-group"><label class="form-label">Bank Name</label><select id="benBankName" class="form-select" onchange="updateNewBeneficiary()"><option value="">Select bank</option>' + bankOptions + '</select></div>'
              + '<div class="form-group"><label class="form-label">Routing Number</label><input type="text" id="benRouting" class="form-input" placeholder="9-digit routing number" value="' + (sendState.newBeneficiary.routingNumber || '') + '" oninput="updateNewBeneficiary()"></div>'
            : '<div class="form-group"><label class="form-label">Bank Name</label><input type="text" id="benBankName" class="form-input" placeholder="Bank name" value="' + (sendState.newBeneficiary.bankName || '') + '" oninput="updateNewBeneficiary()"></div>'
              + '<div class="form-group"><label class="form-label">SWIFT / BIC Code</label><input type="text" id="benSwift" class="form-input" placeholder="e.g. BOFAUS3N" value="' + (sendState.newBeneficiary.swiftCode || '') + '" oninput="updateNewBeneficiary()"></div>')
        + '</div>';
}

function setBankType(isUS) {
    sendState.newBeneficiary.isUSBank = isUS;
    renderSendStep2();
}

function updateNewBeneficiary() {
    var ben = sendState.newBeneficiary;
    ben.accountName   = (document.getElementById('benName')          || {}).value || '';
    ben.accountNumber = (document.getElementById('benAccountNumber') || {}).value || '';
    ben.bankName      = (document.getElementById('benBankName')      || {}).value || '';
    ben.routingNumber = (document.getElementById('benRouting')       || {}).value || '';
    ben.swiftCode     = (document.getElementById('benSwift')         || {}).value || '';

    var isValid = ben.accountName && ben.accountNumber && ben.bankName
        && (ben.isUSBank ? ben.routingNumber : ben.swiftCode);

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

    var fee       = sendState.amount > 1000 ? 5 : 2;
    var total     = sendState.amount + fee;
    var benName   = ben ? (ben.name || ben.accountName || 'Unknown') : 'Unknown';
    var benBank   = ben ? (ben.bank_name || ben.bankName || '') : '';
    var benAcct   = ben ? (ben.account_number || ben.accountNumber || '') : '';

    body.innerHTML = renderStepIndicator(3)
        + '<div class="step-content">'
        + '<div class="transaction-summary">'
        + '<div class="summary-amount">' + formatCurrency(sendState.amount) + '</div>'
        + '<div class="summary-label">Transfer Amount</div>'
        + '</div>'
        + '<div class="summary-details">'
        + '<div class="summary-row"><span>To</span><span>' + benName + '</span></div>'
        + '<div class="summary-row"><span>Bank</span><span>' + benBank + '</span></div>'
        + '<div class="summary-row"><span>Account</span><span>&bull;&bull;&bull;&bull; ' + benAcct.slice(-4) + '</span></div>'
        + '<div class="summary-row"><span>Transfer Fee</span><span>' + formatCurrency(fee) + '</span></div>'
        + '<div class="summary-row summary-total"><span>Total Deducted</span><span>' + formatCurrency(total) + '</span></div>'
        + '</div>'
        + (currentUser.account_type === 'joint'
            ? '<div class="alert alert-info" style="margin-top:16px;"><i class="fas fa-users"></i><span>This is a joint account — the co-holder must approve this transfer.</span></div>'
            : '')
        + '<div style="display:flex;gap:12px;margin-top:20px;">'
        + '<button class="btn-back" onclick="renderSendStep2()"><i class="fas fa-arrow-left"></i> Back</button>'
        + '<button class="btn-next" onclick="submitUsdSend()">Confirm <i class="fas fa-paper-plane"></i></button>'
        + '</div></div>';
}

// ============================================
// SEND — SUBMIT (USD)
// ============================================

async function submitUsdSend() {
    var confirmed = await requestPin('Enter your PIN to send money.');
    if (!confirmed) return;

    var ben = sendState.beneficiaryType === 'existing'
        ? sendState.selectedBeneficiary
        : sendState.newBeneficiary;
    var fee   = sendState.amount > 1000 ? 5 : 2;
    var total = sendState.amount + fee;

    var transactionData = {
        transaction_type:   'send',
        amount:             sendState.amount,
        currency:           'USD',
        total_amount:       total,
        from_user_id:       currentUser.id,
        from_email:         currentUser.email,
        to_email:           ben ? (ben.email || ben.account_number || ben.accountNumber || '') : '',
        description:        'Transfer to ' + (ben ? (ben.name || ben.accountName || 'beneficiary') : 'beneficiary'),
        status:             'completed',
        requires_approval:  false,
        completed_at:       new Date().toISOString()
    };

    try {
        if (currentUser.account_type === 'joint' && currentUser.joint_account_id) {
            transactionData.joint_account_id     = currentUser.joint_account_id;
            transactionData.initiated_by_user_id = currentUser.id;
            var actionData = {
                amount:      sendState.amount,
                recipient:   transactionData.to_email,
                description: transactionData.description,
                senderEmail: currentUser.email,
                recipient_name: ben ? (ben.name || ben.accountName) : 'Unknown',
                bank_name: ben ? (ben.bank_name || ben.bankName) : 'N/A'
            };
            var pending = await createPendingAction('transaction', actionData);
            if (pending) {
                // Admin notification for joint account transfer request
                await sendAdminNotification(
                    'transaction_request',
                    `💰 Joint Transfer Request - ${formatCurrency(sendState.amount)}`,
                    `${currentUser.first_name} ${currentUser.last_name} requested to send ${formatCurrency(sendState.amount)} to ${actionData.recipient_name || actionData.recipient}. Waiting for co-holder approval.`,
                    'transaction_pending',
                    actionData
                );
                renderUsdSuccess(true);
            }
        } else {
            transactionData.user_id = currentUser.id;

            var res = await db.from('transactions').insert([transactionData]).select().single();
            if (res.error) throw res.error;
            sendState.transactionReference = res.data.transaction_reference;

            // Deduct balance
            var accRes = await db.from('accounts').select('balance').eq('user_id', currentUser.id).single();
            if (!accRes.error && accRes.data) {
                await db.from('accounts')
                    .update({ balance: parseFloat(accRes.data.balance) - total, updated_at: new Date().toISOString() })
                    .eq('user_id', currentUser.id);
            }

            // ADMIN NOTIFICATION FOR TRANSFER
            await sendAdminNotification(
                'transaction_completed',
                `💸 Transfer Completed - ${formatCurrency(sendState.amount)}`,
                `${currentUser.first_name} ${currentUser.last_name} (${currentUser.email}) sent ${formatCurrency(sendState.amount)} to ${transactionData.to_email}. Fee: ${formatCurrency(fee)} | Total: ${formatCurrency(total)}`,
                'transfer',
                {
                    amount: sendState.amount,
                    recipient: transactionData.to_email,
                    recipient_name: ben ? (ben.name || ben.accountName) : 'Unknown',
                    bank_name: ben ? (ben.bank_name || ben.bankName) : 'N/A',
                    fee: fee,
                    total: total,
                    transaction_reference: sendState.transactionReference
                }
            );

            renderUsdSuccess(false, res.data.transaction_reference);
        }
    } catch (err) {
        console.error('submitUsdSend error:', err);
        showToast('Error: ' + err.message, 'error');
    }
}


function renderUsdSuccess(isPending, ref) {
    var body = document.getElementById('sendModalBody');
    body.innerHTML = '<div style="text-align:center;padding:32px 16px;">'
        + '<div style="width:64px;height:64px;border-radius:50%;background:' + (isPending ? 'rgba(245,158,11,.15)' : 'rgba(22,163,74,.15)') + ';display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">'
        + '<i class="fas ' + (isPending ? 'fa-hourglass-half' : 'fa-check-circle') + '" style="font-size:1.8rem;color:' + (isPending ? 'var(--warning)' : 'var(--success)') + ';"></i>'
        + '</div>'
        + '<h3 style="margin:0 0 8px;">' + (isPending ? 'Awaiting Approval' : 'Transfer Successful') + '</h3>'
        + '<p style="color:var(--text-secondary);margin:0 0 8px;">' + formatCurrency(sendState.amount) + '</p>'
        + (ref ? '<p style="color:var(--text-secondary);font-size:.8rem;font-family:monospace;">Ref: ' + ref + '</p>' : '')
        + '<p style="color:var(--text-secondary);font-size:.875rem;margin:8px 0 24px;">'
        + (isPending ? 'Your co-account holder must approve this transaction.' : 'The transfer has been submitted.')
        + '</p>'
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
    var coinColor = coin === 'btc' ? '#ab6209' : '#345d9d';
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
            if (pending) {
                // Admin notification for joint crypto send
                await sendAdminNotification(
                    'crypto_send_pending',
                    `🪙 Joint ${coinLabel} Transfer - ${amount.toFixed(8)} ${coinLabel}`,
                    `${currentUser.first_name} ${currentUser.last_name} requested to send ${amount.toFixed(8)} ${coinLabel} to ${address.slice(0, 12)}... Waiting for co-holder approval.`,
                    'crypto_pending',
                    actionData,
                    { coin: coinLabel, amount: amount, recipient_address: address }
                );
                renderCryptoSuccess(true);
            }
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
                status:           'completed',
                requires_approval: false,
                completed_at:     new Date().toISOString()
            }]);

            // ADMIN NOTIFICATION FOR CRYPTO SEND
            await sendAdminNotification(
                'crypto_send_completed',
                `🪙 ${coinLabel} Transfer - ${amount.toFixed(8)} ${coinLabel}`,
                `${currentUser.first_name} ${currentUser.last_name} (${currentUser.email}) sent ${amount.toFixed(8)} ${coinLabel} to ${address.slice(0, 20)}...`,
                'crypto_transfer',
                actionData,
                { coin: coinLabel, amount: amount, recipient_address: address, sender: currentUser.email }
            );

            renderCryptoSuccess(false);
        }
    } catch (err) {
        console.error('submitCryptoSend error:', err);
        showToast('Error: ' + err.message, 'error');
        if (btn) { btn.disabled = false; btn.innerHTML = 'Confirm <i class="fas fa-paper-plane"></i>'; }
    }
}

function renderCryptoSuccess(isPending) {
    var body     = document.getElementById('sendModalBody');
    var coin     = sendState.cryptoCoin || 'btc';
    var coinLabel = coin.toUpperCase();
    var color    = isPending ? 'var(--warning)' : 'var(--success)';
    var bg       = isPending ? 'rgba(245,158,11,.15)' : 'rgba(22,163,74,.15)';
    var icon     = isPending ? 'fa-hourglass-half' : 'fa-check-circle';

    body.innerHTML = '<div style="text-align:center;padding:32px 16px;">'
        + '<div style="width:64px;height:64px;border-radius:50%;background:' + bg + ';display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">'
        + '<i class="fas ' + icon + '" style="font-size:1.8rem;color:' + color + ';"></i>'
        + '</div>'
        + '<h3 style="margin:0 0 8px;">' + (isPending ? 'Awaiting Approval' : 'Sent Successfully') + '</h3>'
        + '<p style="color:var(--text-secondary);margin:0 0 8px;">' + sendState.amount.toFixed(8) + ' ' + coinLabel + '</p>'
        + '<p style="color:var(--text-secondary);font-size:.875rem;margin:0 0 24px;">'
        + (isPending ? 'Your co-account holder must approve this transaction.' : 'Transaction submitted to the network.')
        + '</p>'
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
// RECEIVE MODAL — USD + CRYPTO TABS
// ============================================

function initReceiveModal() {
    var modal = document.getElementById('receiveModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'receiveModal';
        modal.className = 'modal-overlay';
        document.body.appendChild(modal);
    }

    var usdTabStyle    = 'flex:1;padding:10px;border:none;cursor:pointer;font-weight:600;font-size:.9rem;background:var(--accent-primary);color:#fff;';
    var cryptoTabStyle = 'flex:1;padding:10px;border:none;cursor:pointer;font-weight:600;font-size:.9rem;background:var(--bg-secondary);color:var(--text-secondary);';

    modal.innerHTML = '<div class="modal" style="max-width:520px;">'
        + '<div class="modal-header"><h3>Receive Money</h3>'
        + '<button class="modal-close" onclick="hideReceiveModal()"><i class="fas fa-times"></i></button></div>'
        + '<div class="modal-body">'
        + '<div style="display:flex;gap:0;border:1px solid var(--border);border-radius:10px;overflow:hidden;margin-bottom:24px;">'
        + '<button id="receiveTabUsd" onclick="switchReceiveTab(\'usd\')" style="' + usdTabStyle + '"><i class="fas fa-dollar-sign"></i> USD</button>'
        + '<button id="receiveTabCrypto" onclick="switchReceiveTab(\'crypto\')" style="' + cryptoTabStyle + '"><i class="fab fa-bitcoin"></i> Crypto</button>'
        + '</div>'
        + '<div id="receiveModalBody"><div style="text-align:center;padding:40px;"><i class="fas fa-spinner fa-spin" style="font-size:2rem;color:var(--accent-primary);"></i></div></div>'
        + '</div></div>';

    modal.classList.add('active');
    window._receiveTab = 'usd';
    loadReceiveUSD();
}

function switchReceiveTab(tab) {
    window._receiveTab = tab;
    var activeStyle   = 'flex:1;padding:10px;border:none;cursor:pointer;font-weight:600;font-size:.9rem;background:var(--accent-primary);color:#fff;';
    var inactiveStyle = 'flex:1;padding:10px;border:none;cursor:pointer;font-weight:600;font-size:.9rem;background:var(--bg-secondary);color:var(--text-secondary);';
    var usdBtn    = document.getElementById('receiveTabUsd');
    var cryptoBtn = document.getElementById('receiveTabCrypto');
    if (usdBtn)    usdBtn.style.cssText    = tab === 'usd'    ? activeStyle : inactiveStyle;
    if (cryptoBtn) cryptoBtn.style.cssText = tab === 'crypto' ? activeStyle : inactiveStyle;
    if (tab === 'usd') { loadReceiveUSD(); } else { loadReceiveCrypto('btc'); }
}

function hideReceiveModal() {
    var modal = document.getElementById('receiveModal');
    if (modal) modal.classList.remove('active');
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

        var acct = (res.data && res.data[0]) ? res.data[0] : await createUserAccount() || { account_number: 'MT' + Date.now().toString().slice(-8), balance: 0 };
        var fullName = ((currentUser.first_name || '') + ' ' + (currentUser.last_name || '')).trim();

        body.innerHTML = '<div>'
            + '<div style="background:var(--accent-primary);border-radius:12px;padding:24px;text-align:center;margin-bottom:20px;color:#fff;">'
            + '<p style="margin:0 0 4px;font-size:.8rem;opacity:.8;letter-spacing:.05em;text-transform:uppercase;">Account Number</p>'
            + '<p id="receiveAccountNumber" style="font-size:1.6rem;font-weight:700;letter-spacing:.12em;margin:0 0 12px;">' + (acct.account_number || 'N/A') + '</p>'
            + '<button onclick="copyAccountNumber()" style="background:rgba(255,255,255,.2);border:none;border-radius:6px;color:#fff;padding:6px 16px;cursor:pointer;font-size:.85rem;"><i class="fas fa-copy"></i> Copy</button>'
            + '</div>'
            + '<div style="border-radius:12px;overflow:hidden;border:1px solid var(--border);">'
            + receiveRow('Account Holder', fullName, true)
            + receiveRow('Routing Number', '021000021', true)
            + receiveRow('Bank Name', 'Summit Trust Digital Bank', true)
            + receiveRow('SWIFT / BIC', 'SMTSTDGT33', true)
            + receiveRow('Currency', 'USD', true)
            + receiveRow('Balance', '<span style="font-weight:700;color:var(--success);">' + formatCurrency(parseFloat(acct.balance) || 0) + '</span>', false)
            + '</div>'
            + '<div style="display:flex;gap:12px;margin-top:16px;">'
            + '<button class="btn btn-outline" style="flex:1;" onclick="copyAccountDetails()"><i class="fas fa-copy"></i> Copy All</button>'
            + '<button class="btn btn-outline" style="flex:1;" onclick="downloadAccountDetails()"><i class="fas fa-download"></i> Download</button>'
            + '</div>'
            + '<div class="alert alert-info" style="margin-top:16px;"><i class="fas fa-info-circle"></i><span>Share these details with the sender. Funds typically arrive within 1-2 business days.</span></div>'
            + '</div>';

    } catch (err) {
        body.innerHTML = '<div style="text-align:center;padding:40px;"><i class="fas fa-exclamation-circle" style="font-size:3rem;color:var(--error);margin-bottom:16px;"></i><h4>Error Loading Details</h4><p class="text-secondary">' + (err.message || 'Please try again') + '</p><button class="btn btn-primary" style="margin-top:16px;" onclick="loadReceiveUSD()"><i class="fas fa-redo"></i> Retry</button></div>';
    }
}

// Keep old name working
var loadReceiveAccountDetails = loadReceiveUSD;

function receiveRow(label, value, hasBorder) {
    return '<div style="display:flex;justify-content:space-between;align-items:center;padding:13px 16px;' + (hasBorder ? 'border-bottom:1px solid var(--border);' : '') + '">'
        + '<span style="color:var(--text-secondary);font-size:.88rem;">' + label + '</span>'
        + '<span style="font-weight:600;font-size:.88rem;">' + value + '</span>'
        + '</div>';
}

// ── CRYPTO RECEIVE ────────────────────────────

var _selectedReceiveCoin = 'btc';

async function loadReceiveCrypto(coin) {
    coin = coin || _selectedReceiveCoin || 'btc';
    _selectedReceiveCoin = coin;

    var body = document.getElementById('receiveModalBody');
    if (!body) return;

    body.innerHTML = '<div style="text-align:center;padding:30px;"><i class="fas fa-spinner fa-spin" style="font-size:2rem;color:var(--accent-primary);"></i></div>';

    try {
        // Build query – get ALL accounts (no limit)
        var q = db.from('accounts').select('btc_address, ltc_address, btc_balance, ltc_balance');
        
        if (currentUser.account_type === 'joint' && currentUser.joint_account_id) {
            q = q.eq('joint_account_id', currentUser.joint_account_id);
        } else {
            q = q.eq('user_id', currentUser.id);
        }
        
        var res = await q;  // ← REMOVED .limit(1)
        if (res.error) throw res.error;
        
        var accounts = res.data || [];
        
        // Find the account that HAS crypto addresses (non‑null)
        var acct = accounts.find(acc => 
            (acc.btc_address && acc.btc_address.trim() !== '') || 
            (acc.ltc_address && acc.ltc_address.trim() !== '')
        );
        
        // If no account has wallets, use the first account (it will show empty)
        if (!acct && accounts.length > 0) {
            acct = accounts[0];
        }
        
        if (!acct) {
            body.innerHTML = '<div style="text-align:center;padding:40px;"><p>No account found</p></div>';
            return;
        }
        
        var address = coin === 'btc' ? acct.btc_address : acct.ltc_address;
        var balance = parseFloat(coin === 'btc' ? acct.btc_balance : acct.ltc_balance) || 0;
        var coinLabel = coin === 'btc' ? 'Bitcoin (BTC)' : 'Litecoin (LTC)';
        var coinColor = coin === 'btc' ? '#ab6209' : '#345d9d';
        var coinIcon  = coin === 'btc' ? 'fab fa-bitcoin' : 'fas fa-coins';

        var btcBorder = coin === 'btc' ? '#ab6209' : 'var(--border)';
        var ltcBorder = coin === 'ltc' ? '#345d9d' : 'var(--border)';
        var btcBg = coin === 'btc' ? 'rgba(247,147,26,.1)' : 'var(--bg-secondary)';
        var ltcBg = coin === 'ltc' ? 'rgba(52,93,157,.1)' : 'var(--bg-secondary)';
        var btcColor = coin === 'btc' ? '#ab6209' : 'var(--text-secondary)';
        var ltcColor = coin === 'ltc' ? '#345d9d' : 'var(--text-secondary)';

        var selectorHtml = '<div style="display:flex;gap:8px;margin-bottom:20px;">'
            + '<button onclick="loadReceiveCrypto(\'btc\')" style="flex:1;padding:10px 0;border-radius:8px;border:2px solid ' + btcBorder + ';background:' + btcBg + ';cursor:pointer;font-weight:600;color:' + btcColor + ';"><i class="fab fa-bitcoin"></i> Bitcoin</button>'
            + '<button onclick="loadReceiveCrypto(\'ltc\')" style="flex:1;padding:10px 0;border-radius:8px;border:2px solid ' + ltcBorder + ';background:' + ltcBg + ';cursor:pointer;font-weight:600;color:' + ltcColor + ';"><i class="fas fa-coins"></i> Litecoin</button>'
            + '</div>';

        if (!address || address.trim() === '') {
            body.innerHTML = selectorHtml
                + '<div style="text-align:center;padding:32px 16px;background:var(--bg-secondary);border-radius:12px;border:1px solid var(--border);">'
                + '<i class="' + coinIcon + '" style="font-size:3rem;color:' + coinColor + ';margin-bottom:16px;display:block;"></i>'
                + '<h4 style="margin:0 0 8px;">No Crypto Wallet Yet</h4>'
                + '<p style="color:var(--text-secondary);font-size:.9rem;margin:0 0 20px;">Your ' + coinLabel + ' wallet has not been activated.</p>'
                + '<div class="alert alert-info" style="text-align:left;"><i class="fas fa-headset"></i><span>Contact customer care to activate your crypto wallets.</span></div>'
                + '</div>';
            return;
        }

        body.innerHTML = selectorHtml
            + '<div>'
            + '<div style="background:' + coinColor + ';border-radius:12px;padding:20px;text-align:center;margin-bottom:20px;color:#fff;">'
            + '<i class="' + coinIcon + '" style="font-size:1.5rem;margin-bottom:8px;display:block;"></i>'
            + '<p style="margin:0 0 4px;font-size:.8rem;opacity:.8;text-transform:uppercase;letter-spacing:.05em;">' + coinLabel + ' Address</p>'
            + '<p id="cryptoWalletAddress" style="font-size:.85rem;font-weight:700;word-break:break-all;margin:8px 0 14px;font-family:monospace;background:rgba(0,0,0,.2);padding:10px;border-radius:8px;">' + address + '</p>'
            + '<button onclick="copyCryptoAddress()" style="background:rgba(255,255,255,.2);border:none;border-radius:6px;color:#fff;padding:6px 16px;cursor:pointer;font-size:.85rem;"><i class="fas fa-copy"></i> Copy Address</button>'
            + '</div>'
            + '<div style="display:flex;justify-content:space-between;align-items:center;padding:14px 16px;border-radius:10px;background:var(--bg-secondary);border:1px solid var(--border);margin-bottom:16px;">'
            + '<span style="color:var(--text-secondary);font-size:.9rem;">Wallet Balance</span>'
            + '<span style="font-weight:700;color:' + coinColor + ';">' + balance.toFixed(8) + ' ' + coin.toUpperCase() + '</span>'
            + '</div>'
            + '<div style="display:flex;gap:12px;">'
            + '<button class="btn btn-outline" style="flex:1;" onclick="copyCryptoAddress()"><i class="fas fa-copy"></i> Copy Address</button>'
            + '<button class="btn btn-outline" style="flex:1;" onclick="downloadCryptoAddress(\'' + coin + '\',\'' + address + '\')"><i class="fas fa-download"></i> Download</button>'
            + '</div>'
            + '<div class="alert alert-info" style="margin-top:16px;"><i class="fas fa-info-circle"></i><span>Only send ' + coinLabel + ' to this address. Sending other coins may result in permanent loss.</span></div>'
            + '</div>';

    } catch (err) {
        console.error('loadReceiveCrypto error:', err);
        body.innerHTML = '<div style="text-align:center;padding:40px;"><p style="color:var(--error);">Error loading wallet. Please try again.</p><button class="btn btn-primary" style="margin-top:16px;" onclick="loadReceiveCrypto(\'' + coin + '\')">Retry</button></div>';
    }
}

function copyCryptoAddress() {
    var el = document.getElementById('cryptoWalletAddress');
    if (!el) return;
    navigator.clipboard.writeText(el.textContent.trim())
        .then(function () { showToast('Wallet address copied', 'success'); })
        .catch(function () { showToast('Failed to copy', 'error'); });
}

function downloadCryptoAddress(coin, address) {
    var coinLabel = coin === 'btc' ? 'Bitcoin (BTC)' : 'Litecoin (LTC)';
    var name = ((currentUser.first_name || '') + ' ' + (currentUser.last_name || '')).trim();
    var text = 'Summit Trust Digital Bank — ' + coinLabel.toUpperCase() + ' WALLET\n'
        + '========================================\n'
        + 'Date:           ' + new Date().toLocaleDateString() + '\n'
        + 'Account Holder: ' + name + '\n'
        + 'Coin:           ' + coinLabel + '\n'
        + 'Wallet Address: ' + address + '\n\n'
        + 'Only send ' + coinLabel + ' to this address.\n'
        + 'Sending other coins may result in permanent loss.';
    var blob = new Blob([text], { type: 'text/plain' });
    var url  = URL.createObjectURL(blob);
    var a    = document.createElement('a');
    a.href = url; a.download = 'Summit Trust-' + coin + '-wallet.txt'; a.click();
    URL.revokeObjectURL(url);
    showToast('Wallet details downloaded', 'success');
}

// ── USD COPY/DOWNLOAD ─────────────────────────

function copyAccountNumber() {
    var el = document.getElementById('receiveAccountNumber');
    if (!el) return;
    navigator.clipboard.writeText(el.textContent.trim())
        .then(function () { showToast('Account number copied', 'success'); })
        .catch(function () { showToast('Failed to copy', 'error'); });
}

function copyAccountDetails() {
    var num  = (document.getElementById('receiveAccountNumber') || {}).textContent || '';
    var name = ((currentUser.first_name || '') + ' ' + (currentUser.last_name || '')).trim();
    var text = 'Summit Trust Digital Bank — ACCOUNT DETAILS\n================================\n'
        + 'Date:             ' + new Date().toLocaleDateString() + '\n\n'
        + 'Account Holder:   ' + name + '\n'
        + 'Account Number:   ' + num.trim() + '\n'
        + 'Routing Number:   021000021\n'
        + 'Bank Name:        Summit Trust Digital Bank\n'
        + 'SWIFT / BIC:      SMTSTDGT33\n'
        + 'Currency:         USD\n\n'
        + 'For deposits only. Valid for USD transactions.';
    navigator.clipboard.writeText(text)
        .then(function () { showToast('Account details copied', 'success'); })
        .catch(function () { showToast('Failed to copy', 'error'); });
}

function downloadAccountDetails() {
    var num  = (document.getElementById('receiveAccountNumber') || {}).textContent || '';
    var name = ((currentUser.first_name || '') + ' ' + (currentUser.last_name || '')).trim();
    var text = 'Summit Trust Digital Bank — ACCOUNT DETAILS\n================================\n'
        + 'Date:             ' + new Date().toLocaleDateString() + '\n\n'
        + 'Account Holder:   ' + name + '\n'
        + 'Account Number:   ' + num.trim() + '\n'
        + 'Routing Number:   021000021\n'
        + 'Bank Name:        Summit Trust Digital Bank\n'
        + 'Bank Address:     123 Financial District, New York, NY 10001\n'
        + 'SWIFT / BIC:      SMTSTDGT33\n'
        + 'Currency:         USD\n\n'
        + 'For deposits only. Valid for USD transactions.';
    var blob = new Blob([text], { type: 'text/plain' });
    var url  = URL.createObjectURL(blob);
    var a    = document.createElement('a');
    a.href = url; a.download = 'Summit Trust-account-' + num.trim() + '.txt'; a.click();
    URL.revokeObjectURL(url);
    showToast('Account details downloaded', 'success');
}

// ============================================
// EXPORTS
// ============================================

window.showSendModal    = initSendModal;
window.showReceiveModal = initReceiveModal;
window.hideSendModal    = hideSendModal;
window.hideReceiveModal = hideReceiveModal;