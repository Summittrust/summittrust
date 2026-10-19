// ============================================
// CARDS MODULE
// Depends on: db, currentUser, requestPin(),
//   createPendingAction(), formatCurrency(),
//   showToast(), loadDashboardData()
// ============================================

// ── STATE ─────────────────────────────────────

var cardState = {
    walletType:   null,   // 'usd' | 'crypto'
    deliveryType: null,   // 'digital' | 'physical'
    network:      null,   // 'visa' | 'mastercard' | 'amex'
    cryptoCoin:   null,   // 'btc' | 'ltc'
    shipping:     {}
};

// ── MODAL OPEN / CLOSE ────────────────────────

async function initCardModal() {
    cardState = { walletType: null, deliveryType: null, network: null, cryptoCoin: null, shipping: {} };
    document.getElementById('cardModal').classList.add('active');
    document.getElementById('cardModalTitle').textContent = 'Apply for Card';
    document.getElementById('cardModalBody').innerHTML =
        '<div style="text-align:center;padding:30px;">'
        + '<i class="fas fa-spinner fa-spin" style="font-size:2rem;color:var(--accent-primary);"></i>'
        + '</div>';

    // Load existing cards to check which slots are taken
    var existing = await fetchExistingCards();
    var slots    = computeCardSlots(existing);
    cardState.slots = slots;

    // All 4 slots taken — block application
    var allTaken = slots['usd-digital'] && slots['usd-physical']
                && slots['crypto-digital'] && slots['crypto-physical'];
    if (allTaken) {
        document.getElementById('cardModalTitle').textContent = 'Card Limit Reached';
        document.getElementById('cardModalBody').innerHTML =
            '<div style="text-align:center;padding:24px 0;">'
            + '<i class="fas fa-ban" style="font-size:3rem;color:var(--error);margin-bottom:16px;display:block;"></i>'
            + '<h4 style="margin:0 0 8px;">Maximum Cards Reached</h4>'
            + '<p style="color:var(--text-secondary);margin:0 0 24px;">You already have all four card types: USD Digital, USD Physical, Crypto Digital, and Crypto Physical.</p>'
            + '<button class="btn btn-primary btn-block" onclick="hideCardModal()">Close</button>'
            + '</div>';
        return;
    }

    renderCardStep1();
}

function hideCardModal() {
    document.getElementById('cardModal').classList.remove('active');
}

// Legacy alias used in some onclick attributes
function showCardModal() { initCardModal(); }

// ── HELPERS ───────────────────────────────────

function cardTile(onclickFn, iconClass, iconColor, label, sub) {
    return '<div onclick="' + onclickFn + '" '
         + 'style="flex:1;padding:24px 12px;border:2px solid var(--border);border-radius:12px;'
         + 'text-align:center;cursor:pointer;transition:border-color .2s;"'
         + ' onmouseover="this.style.borderColor=\'' + iconColor + '\'"'
         + ' onmouseout="this.style.borderColor=\'var(--border)\'">'
         + '<i class="' + iconClass + '" style="font-size:2rem;color:' + iconColor + ';margin-bottom:12px;display:block;"></i>'
         + '<strong>' + label + '</strong>'
         + (sub ? '<p style="color:var(--text-secondary);font-size:.8rem;margin:4px 0 0;">' + sub + '</p>' : '')
         + '</div>';
}

function cardBack(fn) {
    return '<button onclick="' + fn + '" '
         + 'style="background:none;border:none;cursor:pointer;color:var(--text-secondary);'
         + 'font-size:.875rem;margin-bottom:16px;padding:0;">'
         + '<i class="fas fa-arrow-left"></i> Back</button>';
}

// ── TAKEN TILE (greyed out, no onclick) ──────
function takenTile(iconClass, iconColor, label, sub) {
    return '<div style="flex:1;padding:24px 12px;border:2px solid var(--border);border-radius:12px;'
         + 'text-align:center;opacity:.45;cursor:not-allowed;">'
         + '<i class="' + iconClass + '" style="font-size:2rem;color:' + iconColor + ';margin-bottom:12px;display:block;"></i>'
         + '<strong>' + label + '</strong>'
         + (sub ? '<p style="color:var(--text-secondary);font-size:.8rem;margin:4px 0 0;">' + sub + '</p>' : '')
         + '</div>';
}

// ── FETCH EXISTING CARDS ──────────────────────
async function fetchExistingCards() {
    try {
        var q = db.from('card_applications')
            .select('wallet_type,delivery_type,status')
            .not('status', 'eq', 'rejected')
            .not('status', 'eq', 'cancelled');
        if (currentUser.account_type === 'joint' && currentUser.joint_account_id) {
            q = q.eq('joint_account_id', currentUser.joint_account_id);
        } else {
            q = q.eq('user_id', currentUser.id);
        }
        var res = await q;
        return res.data || [];
    } catch (e) { return []; }
}

// ── COMPUTE WHICH SLOTS ARE TAKEN ─────────────
// Slots: 'usd-digital', 'usd-physical', 'crypto-digital', 'crypto-physical'
// A slot is taken if a non-declined application exists
function computeCardSlots(cards) {
    var slots = {
        'usd-digital':    false,
        'usd-physical':   false,
        'crypto-digital': false,
        'crypto-physical': false
    };
    for (var i = 0; i < cards.length; i++) {
        var c   = cards[i];
        var wt  = c.wallet_type  === 'crypto' ? 'crypto' : 'usd';
        var dt  = c.delivery_type === 'physical' ? 'physical' : 'digital';
        slots[wt + '-' + dt] = true;
    }
    return slots;
}

function reviewRow(label, value) {
    return '<div style="display:flex;justify-content:space-between;align-items:flex-start;'
         + 'padding:12px 16px;border-bottom:1px solid var(--border);">'
         + '<span style="color:var(--text-secondary);font-size:.875rem;flex-shrink:0;margin-right:12px;">' + label + '</span>'
         + '<span style="font-weight:600;font-size:.875rem;text-align:right;">' + value + '</span>'
         + '</div>';
}

function formGroup(label, id, type, placeholder, value) {
    return '<div class="form-group">'
         + '<label class="form-label">' + label + '</label>'
         + '<input type="' + type + '" id="' + id + '" class="form-input" placeholder="' + placeholder + '" value="' + (value || '') + '">'
         + '</div>';
}

// ── STEP 1: USD or Crypto ─────────────────────

function renderCardStep1() {
    document.getElementById('cardModalTitle').textContent = 'Apply for Card';
    var slots    = cardState.slots || {};
    var usdDone  = slots['usd-digital']    && slots['usd-physical'];
    var cryptoDone = slots['crypto-digital'] && slots['crypto-physical'];

    var usdTile    = usdDone
        ? takenTile('fas fa-dollar-sign', 'var(--text-secondary)', 'USD Card', 'All USD cards applied')
        : cardTile('selectCardWallet(\'usd\')',    'fas fa-dollar-sign', 'var(--accent-primary)', 'USD Card', 'Linked to your USD balance');
    var cryptoTile = cryptoDone
        ? takenTile('fab fa-bitcoin', 'var(--text-secondary)', 'Crypto Card', 'All crypto cards applied')
        : cardTile('selectCardWallet(\'crypto\')', 'fab fa-bitcoin', '#f7931a', 'Crypto Card', 'Linked to BTC or LTC wallet');

    document.getElementById('cardModalBody').innerHTML =
        '<p style="color:var(--text-secondary);font-size:.9rem;margin-bottom:20px;">'
        + 'Choose which wallet this card will draw from.</p>'
        + '<div style="display:flex;gap:12px;">'
        + usdTile + cryptoTile
        + '</div>';
}

function selectCardWallet(type) {
    cardState.walletType = type;
    if (type === 'crypto') { renderCardCryptoCoins(); } else { renderCardStep2(); }
}

// ── STEP 1b: Coin (crypto only) ───────────────

function renderCardCryptoCoins() {
    document.getElementById('cardModalBody').innerHTML =
        cardBack('renderCardStep1()')
        + '<p style="color:var(--text-secondary);font-size:.9rem;margin-bottom:20px;">'
        + 'Which crypto wallet should this card draw from?</p>'
        + '<div style="display:flex;gap:12px;">'
        + cardTile('selectCryptoCoin(\'btc\')', 'fab fa-bitcoin', '#f7931a', 'Bitcoin (BTC)',  '')
        + cardTile('selectCryptoCoin(\'ltc\')', 'fas fa-coins',   '#345d9d', 'Litecoin (LTC)', '')
        + '</div>';
}

function selectCryptoCoin(coin) {
    cardState.cryptoCoin = coin;
    renderCardStep2();
}

// ── STEP 2: Digital or Physical ───────────────

function renderCardStep2() {
    document.getElementById('cardModalTitle').textContent = 'Card Delivery';
    var backFn  = cardState.walletType === 'crypto' ? 'renderCardCryptoCoins()' : 'renderCardStep1()';
    var slots   = cardState.slots || {};
    var wt      = cardState.walletType === 'crypto' ? 'crypto' : 'usd';
    var digTaken = slots[wt + '-digital'];
    var phyTaken = slots[wt + '-physical'];

    var digTile = digTaken
        ? takenTile('fas fa-mobile-alt',  'var(--text-secondary)', 'Digital Card',  'Already applied')
        : cardTile('selectDelivery(\'digital\')',  'fas fa-mobile-alt',  'var(--accent-primary)', 'Digital Card',  'Instant. Fee: $100');
    var phyTile = phyTaken
        ? takenTile('fas fa-credit-card', 'var(--text-secondary)', 'Physical Card', 'Already applied')
        : cardTile('selectDelivery(\'physical\')', 'fas fa-credit-card', 'var(--success)',         'Physical Card', 'Ships 5-7 days. Fee: $300');

    document.getElementById('cardModalBody').innerHTML =
        cardBack(backFn)
        + '<p style="color:var(--text-secondary);font-size:.9rem;margin-bottom:20px;">'
        + 'How would you like to receive your card?</p>'
        + '<div style="display:flex;gap:12px;">'
        + digTile + phyTile
        + '</div>';
}

async function selectDelivery(type) {
    cardState.deliveryType = type;
    var minBalance = type === 'physical' ? 300 : 100;
    var balance    = await getCardBalance();  // This now returns summed balance

    if (balance < minBalance) {
        var walletName = cardState.walletType === 'crypto'
            ? (cardState.cryptoCoin || 'crypto').toUpperCase() + ' wallet'
            : 'USD balance';
        document.getElementById('cardModalBody').innerHTML =
            '<div style="text-align:center;padding:24px 0;">'
            + '<i class="fas fa-exclamation-circle" style="font-size:3rem;color:var(--error);margin-bottom:16px;display:block;"></i>'
            + '<h4 style="margin:0 0 8px;">Insufficient Balance</h4>'
            + '<p style="color:var(--text-secondary);margin:0 0 6px;">Your ' + walletName
            + ' balance is <strong>' + formatCardBalance(balance) + '</strong>.</p>'
            + '<p style="color:var(--text-secondary);margin:0 0 20px;">You need at least '
            + '<strong>' + formatCurrency(minBalance) + '</strong> to apply for a ' + type + ' card.</p>'
            + '<div class="alert alert-info" style="text-align:left;">'
            + '<i class="fas fa-info-circle"></i>'
            + '<span>Please add funds to your ' + walletName + ' first, then try again.</span>'
            + '</div>'
            + '<div style="display:flex;gap:12px;margin-top:20px;">'
            + '<button class="btn btn-outline" style="flex:1;" onclick="hideCardModal()">Close</button>'
            + '<button class="btn btn-primary" style="flex:1;" onclick="hideCardModal();showReceiveModal()">Add Funds</button>'
            + '</div></div>';
        return;
    }
    renderCardStep3();
}


async function getCardBalance() {
    try {
        let q = db.from('accounts').select('balance');
        
        if (currentUser.account_type === 'joint' && currentUser.joint_account_id) {
            q = q.eq('joint_account_id', currentUser.joint_account_id);
        } else {
            q = q.eq('user_id', currentUser.id);
        }
        
        const { data, error } = await q;  // REMOVED .limit(1)
        
        if (error) throw error;
        
        if (!data || data.length === 0) return 0;
        
        // SUM all balances for joint accounts
        let totalBalance = 0;
        data.forEach(account => {
            totalBalance += parseFloat(account.balance || 0);
        });
        
        return totalBalance;
    } catch (e) { 
        console.error('getCardBalance error:', e);
        return 0; 
    }
}

function formatCardBalance(amount) {
    return formatCurrency(amount);
}

// ── STEP 3: Network ───────────────────────────

function renderCardStep3() {
    document.getElementById('cardModalTitle').textContent = 'Card Network';
    document.getElementById('cardModalBody').innerHTML =
        cardBack('renderCardStep2()')
        + '<p style="color:var(--text-secondary);font-size:.9rem;margin-bottom:20px;">'
        + 'Choose your card network.</p>'
        + '<div style="display:flex;gap:12px;flex-wrap:wrap;">'
        + cardTile('selectNetwork(\'visa\')',       'fab fa-cc-visa',       '#1a1f71', 'Visa',       '')
        + cardTile('selectNetwork(\'mastercard\')', 'fab fa-cc-mastercard', '#eb001b', 'Mastercard', '')
        + cardTile('selectNetwork(\'amex\')',       'fab fa-cc-amex',       '#007bc1', 'Amex',       '')
        + '</div>';
}

function selectNetwork(network) {
    cardState.network = network;
    if (cardState.deliveryType === 'physical') { renderCardShipping(); } else { renderCardReview(); }
}

// ── STEP 4 (physical): Shipping ───────────────

function renderCardShipping() {
    document.getElementById('cardModalTitle').textContent = 'Shipping Address';
    var defaultName    = ((currentUser.first_name || '') + ' ' + (currentUser.last_name || '')).trim();
    var defaultCountry = currentUser.country || '';
    document.getElementById('cardModalBody').innerHTML =
        cardBack('renderCardStep3()')
        + '<p style="color:var(--text-secondary);font-size:.9rem;margin-bottom:16px;">'
        + 'Where should we ship your card?</p>'
        + formGroup('Full Name',                'shipName',    'text', 'As it should appear on card', defaultName)
        + formGroup('Address Line 1',            'shipAddr1',   'text', 'Street address',              '')
        + formGroup('Address Line 2 (optional)', 'shipAddr2',   'text', 'Apt, suite, etc.',            '')
        + '<div class="form-row">'
        + formGroup('City',           'shipCity',    'text', 'City',    '')
        + formGroup('State / Region', 'shipState',   'text', 'State',   '')
        + '</div>'
        + '<div class="form-row">'
        + formGroup('ZIP / Postal Code', 'shipZip',     'text', 'ZIP',     '')
        + formGroup('Country',           'shipCountry', 'text', 'Country', defaultCountry)
        + '</div>'
        + '<button class="btn btn-primary btn-block" style="margin-top:8px;" '
        + 'onclick="saveShippingAndReview()">Continue to Review</button>';
}

function saveShippingAndReview() {
    var get = function (id) { return ((document.getElementById(id) || {}).value || '').trim(); };
    var name = get('shipName'), addr1 = get('shipAddr1'), city = get('shipCity'),
        state = get('shipState'), zip = get('shipZip'), country = get('shipCountry');

    if (!name || !addr1 || !city || !state || !zip || !country) {
        showToast('Please fill in all required shipping fields', 'error');
        return;
    }
    cardState.shipping = { name: name, addr1: addr1, addr2: get('shipAddr2'), city: city, state: state, zip: zip, country: country };
    renderCardReview();
}

// ── STEP 5: Review ────────────────────────────

function renderCardReview() {
    document.getElementById('cardModalTitle').textContent = 'Review Application';

    var walletLabel  = cardState.walletType === 'crypto'
        ? (cardState.cryptoCoin || '').toUpperCase() + ' Crypto'
        : 'USD';
    var delivLabel   = cardState.deliveryType === 'physical' ? 'Physical (ships 5-7 days)' : 'Digital (instant)';
    var netLabels    = { visa: 'Visa', mastercard: 'Mastercard', amex: 'American Express' };
    var netLabel     = netLabels[cardState.network] || cardState.network || '';
    var backFn       = cardState.deliveryType === 'physical' ? 'renderCardShipping()' : 'renderCardStep3()';

    var shippingRow = '';
    if (cardState.deliveryType === 'physical' && cardState.shipping.addr1) {
        var s = cardState.shipping;
        var fullAddr = s.name + ', ' + s.addr1 + (s.addr2 ? ', ' + s.addr2 : '')
            + ', ' + s.city + ', ' + s.state + ' ' + s.zip + ', ' + s.country;
        shippingRow = reviewRow('Ship To', fullAddr);
    }

    var jointNotice = (currentUser.account_type === 'joint')
        ? '<div class="alert alert-info" style="margin-bottom:16px;">'
          + '<i class="fas fa-users"></i>'
          + '<span>Joint account — <strong>both</strong> holders must approve before the card is generated.</span>'
          + '</div>'
        : '';

    document.getElementById('cardModalBody').innerHTML =
        cardBack(backFn)
        + '<div style="background:var(--bg-secondary);border-radius:12px;border:1px solid var(--border);overflow:hidden;margin-bottom:20px;">'
        + reviewRow('Wallet',   walletLabel)
        + reviewRow('Delivery', delivLabel)
        + reviewRow('Network',  netLabel)
        + shippingRow
        + '</div>'
        + jointNotice
        + '<button class="btn btn-primary btn-block" id="cardApplyBtn" onclick="submitCardApplication()">Apply Now</button>';
}

// ── CARD NUMBER / EXPIRY GENERATORS ───────────

function generateCardNumber() {
    var num = '';
    for (var i = 0; i < 16; i++) num += Math.floor(Math.random() * 10);
    return num;
}

function generateExpiry() {
    var d = new Date();
    d.setFullYear(d.getFullYear() + 4);
    return ('0' + (d.getMonth() + 1)).slice(-2) + '/' + String(d.getFullYear()).slice(-2);
}

// ── SUBMIT ────────────────────────────────────

async function submitCardApplication() {
    var confirmed = await requestPin('Enter your PIN to submit card application.');
    if (!confirmed) return;

    var btn = document.getElementById('cardApplyBtn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...'; }

    var s        = cardState.shipping;
    var shipAddr = (s && s.addr1)
        ? s.addr1 + (s.addr2 ? ', ' + s.addr2 : '') + ', ' + s.city + ', ' + s.state + ' ' + s.zip + ', ' + s.country
        : null;

    var cardData = {
        wallet_type:   cardState.walletType,
        crypto_coin:   cardState.cryptoCoin || null,
        delivery_type: cardState.deliveryType,
        card_network:  cardState.network,
        card_type:     cardState.deliveryType || 'digital',
        shipping:      cardState.deliveryType === 'physical' ? cardState.shipping : null
    };

    var cardFee = cardState.deliveryType === 'physical' ? 300 : 100;

    try {
        if (currentUser.account_type === 'joint' && currentUser.joint_account_id) {
            cardData.fee = cardFee;
            var pending = await createPendingAction('card_application', cardData);
            if (pending) {
                // Admin notification for joint card application
                await sendAdminNotification(
                    'card_application_pending',
                    `💳 Joint Card Application - ${cardState.network?.toUpperCase()} ${cardState.deliveryType} Card`,
                    `${currentUser.first_name} ${currentUser.last_name} applied for a ${cardState.network?.toUpperCase()} ${cardState.deliveryType} card (${cardState.walletType === 'crypto' ? cardState.cryptoCoin?.toUpperCase() : 'USD'}). Fee: ${formatCurrency(cardFee)}. Waiting for co-holder approval.`,
                    'card_pending',
                    cardData
                );
                renderCardSuccess('joint_pending');
            }
        } else {
            var balRes = await db.from('accounts').select('id,balance')
                .eq('user_id', currentUser.id).limit(1);
            var acct = balRes.data && balRes.data[0] ? balRes.data[0] : null;
            if (!acct) { showToast('Account not found', 'error'); if (btn) { btn.disabled = false; btn.innerHTML = 'Apply Now'; } return; }

            var currentBal = parseFloat(acct.balance) || 0;
            if (currentBal < cardFee) {
                showToast('Insufficient balance to cover the ' + formatCurrency(cardFee) + ' card fee', 'error');
                if (btn) { btn.disabled = false; btn.innerHTML = 'Apply Now'; }
                return;
            }

            await db.from('accounts')
                .update({ balance: currentBal - cardFee, updated_at: new Date().toISOString() })
                .eq('id', acct.id);

            var cardNumber = generateCardNumber();
            var expiry     = generateExpiry();
            var holderName = ((currentUser.first_name || '') + ' ' + (currentUser.last_name || '')).trim().toUpperCase();

            var insertRes = await db.from('card_applications').insert([{
                user_id:               currentUser.id,
                application_reference: 'CARD-' + Date.now().toString(36).toUpperCase(),
                card_type:             cardData.card_type,
                card_network:          cardData.card_network,
                wallet_type:           cardData.wallet_type,
                crypto_coin:           cardData.crypto_coin,
                delivery_type:         cardData.delivery_type,
                shipping_name:         s ? s.name : null,
                shipping_address:      shipAddr,
                card_number:           cardNumber,
                card_expiry:           expiry,
                card_holder:           holderName,
                status:                'pending',
                amount:                cardFee,
                created_at:            new Date().toISOString()
            }]);
            if (insertRes.error) throw insertRes.error;

            var networkLabel = (cardData.card_network || '').charAt(0).toUpperCase() + (cardData.card_network || '').slice(1);
            var txDesc = (cardData.delivery_type === 'physical' ? 'Physical' : 'Digital')
                + ' ' + networkLabel + ' card application fee'
                + ' (' + (cardData.wallet_type === 'crypto' ? (cardData.crypto_coin || 'crypto').toUpperCase() : 'USD') + ')';

            await db.from('transactions').insert([{
                user_id:           currentUser.id,
                transaction_type:  'card_payment',
                amount:            cardFee,
                currency:          'USD',
                total_amount:      cardFee,
                fee:               cardFee,
                from_user_id:      currentUser.id,
                from_email:        currentUser.email,
                description:       txDesc,
                status:            'processing',
                requires_approval: false,
                completed_at:      new Date().toISOString()
            }]);

            // ADMIN NOTIFICATION FOR CARD APPLICATION
            await sendAdminNotification(
                'card_application_submitted',
                `💳 New Card Application - ${cardState.network?.toUpperCase()} ${cardState.deliveryType} Card`,
                `${currentUser.first_name} ${currentUser.last_name} (${currentUser.email}) applied for a ${cardState.network?.toUpperCase()} ${cardState.deliveryType} card. Fee paid: ${formatCurrency(cardFee)} | Wallet: ${cardState.walletType === 'crypto' ? cardState.cryptoCoin?.toUpperCase() : 'USD'}`,
                'card_review',
                cardData
            );

            renderCardSuccess('personal_pending');
        }
    } catch (err) {
        console.error('submitCardApplication error:', err);
        showToast('Error: ' + err.message, 'error');
        if (btn) { btn.disabled = false; btn.innerHTML = 'Apply Now'; }
    }
}

// ── SUCCESS SCREEN ────────────────────────────

function renderCardSuccess(state) {
    var isJoint   = state === 'joint_pending';
    var color     = isJoint ? 'var(--warning)' : 'var(--accent-primary)';
    var bg        = isJoint ? 'rgba(245,158,11,.15)' : 'rgba(37,99,235,.1)';
    var icon      = isJoint ? 'fa-hourglass-half' : 'fa-clock';
    var netLabels = { visa: 'Visa', mastercard: 'Mastercard', amex: 'American Express' };
    var nLabel    = netLabels[cardState.network] || '';
    var dLabel    = cardState.deliveryType === 'physical' ? 'Physical' : 'Digital';
    var title, msg;

    if (isJoint) {
        title = 'Waiting for Co-holder';
        msg   = 'Your co-account holder must also approve. Once both approve, a pending card will be generated and appear in your cards list.';
    } else {
        title = 'Card Generated \u2014 Pending Activation';
        msg   = 'Your card has been generated and is pending admin activation. '
              + (cardState.deliveryType === 'physical'
                  ? 'It will ship within 5-7 business days once activated.'
                  : 'You will be able to copy and use the details once our team activates it.');
    }

    document.getElementById('cardModalTitle').textContent = title;
    document.getElementById('cardModalBody').innerHTML =
        '<div style="text-align:center;padding:24px 0;">'
        + '<div style="width:64px;height:64px;border-radius:50%;background:' + bg
        + ';display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">'
        + '<i class="fas ' + icon + '" style="font-size:1.8rem;color:' + color + ';"></i>'
        + '</div>'
        + '<h4 style="margin:0 0 8px;">' + title + '</h4>'
        + '<p style="color:var(--text-secondary);margin:0 0 6px;">' + nLabel + ' ' + dLabel + ' Card</p>'
        + '<p style="color:var(--text-secondary);font-size:.875rem;margin:0 0 24px;">' + msg + '</p>'
        + '<button class="btn btn-primary btn-block" onclick="hideCardModal();loadDashboardData();">View My Cards</button>'
        + '</div>';
}

// ── LOAD & RENDER CARDS LIST ──────────────────

async function loadCards() {
    var container = document.getElementById('cardsList');
    if (!container) return;

    try {
        var appQuery = db.from('card_applications')
            .select('*').order('created_at', { ascending: false });
        if (currentUser.account_type === 'joint' && currentUser.joint_account_id) {
            appQuery = appQuery.eq('joint_account_id', currentUser.joint_account_id);
        } else {
            appQuery = appQuery.eq('user_id', currentUser.id);
        }

        var results = await Promise.all([
            db.from('cards').select('*').eq('user_id', currentUser.id),
            appQuery
        ]);
        var activeCards = results[0].data || [];
        var appCards    = results[1].data || [];
        var total       = activeCards.length + appCards.length;

        var countEl = document.getElementById('cardsCount');
        if (countEl) countEl.textContent = total;

        if (!total) {
            container.innerHTML = '<div class="cards-empty">'
                + '<i class="fas fa-credit-card"></i>'
                + '<p>No cards yet. Click <strong>Apply for Card</strong> to get started.</p>'
                + '</div>';
            return;
        }

        var html = '';

        // Active cards from cards table (already approved + issued)
        for (var i = 0; i < activeCards.length; i++) {
            html += renderCardWidget(activeCards[i]);
        }

        // Applications (pending admin review or pending joint approval)
        for (var j = 0; j < appCards.length; j++) {
            html += renderCardWidget(appCards[j]);
        }

        container.innerHTML = html;

    } catch (err) {
        console.error('loadCards error:', err);
        container.innerHTML = '<div class="cards-empty"><p style="color:var(--error);">Could not load cards.</p></div>';
    }
}

// ── RENDER A SINGLE CARD WIDGET ───────────────

function renderCardWidget(card) {
    var network     = (card.card_network || card.network || 'default').toLowerCase();
    var status      = card.status || 'pending';
    var isActive    = status === 'active';
    var isPhysical  = card.delivery_type === 'physical';
    var isJointWait = status === 'pending' && !card.card_number;

    var dLabel  = isPhysical ? 'Physical' : 'Digital';
    var wLabel  = card.wallet_type === 'crypto' ? ((card.crypto_coin || 'crypto').toUpperCase()) : 'USD';
    var dateStr = card.created_at ? new Date(card.created_at).toLocaleDateString() : '';
    var netIconMap = { visa: 'fab fa-cc-visa', mastercard: 'fab fa-cc-mastercard', amex: 'fab fa-cc-amex' };
    var netIcon = netIconMap[network] || 'fas fa-credit-card';

    // ── PHYSICAL CARD: show status timeline only, never show card details ──
    if (isPhysical) {
        var statusSteps  = ['pending', 'processing', 'approved', 'shipped', 'delivered'];
        var statusLabels = { pending: 'Pending', processing: 'Under Review', approved: 'Approved', shipped: 'Shipped', delivered: 'Delivered', active: 'Delivered', rejected: 'Rejected', cancelled: 'Cancelled' };
        var statusIcons  = { pending: 'fa-clock', processing: 'fa-search', approved: 'fa-check-circle', shipped: 'fa-shipping-fast', delivered: 'fa-home', active: 'fa-home', rejected: 'fa-times-circle', cancelled: 'fa-ban' };
        var currentStep  = (status === 'active') ? 'delivered' : status;
        var stepIdx      = statusSteps.indexOf(currentStep);
        var isRejected   = status === 'rejected' || status === 'cancelled';

        var timelineHtml = '<div style="display:flex;align-items:center;justify-content:space-between;margin:16px 0 8px;">';
        for (var si = 0; si < statusSteps.length; si++) {
            var stp    = statusSteps[si];
            var done   = si <= stepIdx && !isRejected;
            var curr   = si === stepIdx;
            var color  = isRejected ? 'var(--error)' : (done ? 'var(--success)' : 'var(--border)');
            var txtCol = isRejected ? 'var(--error)' : (done ? (curr ? 'var(--accent-primary)' : 'var(--success)') : 'var(--text-secondary)');
            if (curr && !isRejected) color = 'var(--accent-primary)';
            timelineHtml += '<div style="text-align:center;flex:1;">'
                + '<i class="fas ' + (statusIcons[stp] || 'fa-circle') + '" style="font-size:1.1rem;color:' + color + ';display:block;margin-bottom:4px;"></i>'
                + '<span style="font-size:.62rem;color:' + txtCol + ';font-weight:' + (curr ? '700' : '400') + ';">' + stp.charAt(0).toUpperCase() + stp.slice(1) + '</span>'
                + '</div>';
            if (si < statusSteps.length - 1) {
                timelineHtml += '<div style="flex:0 0 8px;height:2px;background:' + (si < stepIdx && !isRejected ? 'var(--success)' : 'var(--border)') + ';margin-bottom:18px;"></div>';
            }
        }
        timelineHtml += '</div>';

        var shipHtml = card.shipping_address
            ? '<div style="font-size:.78rem;color:var(--text-secondary);margin-top:6px;">'
              + '<i class="fas fa-map-marker-alt" style="margin-right:4px;"></i>' + card.shipping_address + '</div>'
            : '';

        var canCancelPhysical = (status === 'delivered' || status === 'active');
        var cancelPhysHtml = canCancelPhysical
            ? '<button class="btn btn-error btn-small" style="width:100%;margin-top:12px;" onclick="initCancelCard(\'' + card.id + '\')">'
              + '<i class="fas fa-ban"></i> Cancel Card</button>'
            : '';

        return '<div class="card-list-item">'
            + '<div style="display:flex;align-items:center;gap:12px;">'
            + '<i class="' + netIcon + '" style="font-size:2rem;color:var(--text-secondary);"></i>'
            + '<div style="flex:1;">'
            + '<div style="font-weight:700;">' + (card.card_network || '') + ' Physical Card (' + wLabel + ')</div>'
            + '<div style="font-size:.78rem;color:var(--text-secondary);">Applied ' + dateStr + '</div>'
            + '</div>'
            + '<span class="status-badge status-' + status + '">' + (statusLabels[status] || status) + '</span>'
            + '</div>'
            + timelineHtml + shipHtml + cancelPhysHtml
            + '</div>';
    }

    // ── DIGITAL CARD: full visual widget, details shown only when active ──
    var cssClass = 'card-widget ';
    if (card.wallet_type === 'crypto') {
        cssClass += card.crypto_coin === 'ltc' ? 'crypto-ltc' : 'crypto-btc';
    } else {
        cssClass += (network === 'visa' || network === 'mastercard' || network === 'amex') ? network : 'default';
    }
    if (!isActive) cssClass += ' disabled';

    var cardNumDisplay = (isActive && card.card_number)
        ? card.card_number.slice(0,4) + ' ' + card.card_number.slice(4,8) + ' ' + card.card_number.slice(8,12) + ' ' + card.card_number.slice(12,16)
        : '•••• •••• •••• ••••';

    var holderName = card.card_holder || ((currentUser.first_name || '') + ' ' + (currentUser.last_name || '')).trim().toUpperCase();
    var expiry     = (isActive && card.card_expiry) ? card.card_expiry : '--/--';

    var widgetHtml =
        '<div class="' + cssClass + '">'
        + '<div class="card-top"><div class="card-chip"></div><i class="' + netIcon + ' card-network-icon"></i></div>'
        + '<div class="card-number">' + cardNumDisplay + '</div>'
        + '<div class="card-bottom">'
        + '<div><div class="card-label">Card Holder</div><div class="card-holder-name">' + holderName + '</div></div>'
        + '<div style="text-align:right;"><div class="card-label">Expires</div><div class="card-expiry">' + expiry + '</div></div>'
        + '</div></div>';

    var noticeHtml = '';
    if (isJointWait) {
        noticeHtml = '<div class="card-joint-notice"><i class="fas fa-hourglass-half"></i>'
            + '<span>Waiting for co-holder approval.</span></div>';
    } else if (!isActive) {
        noticeHtml = '<div class="card-pending-notice"><i class="fas fa-clock"></i>'
            + '<span>Pending admin activation. Card details will appear once activated.</span></div>';
    }

    var metaHtml = '<div class="card-meta">'
        + '<div class="card-meta-info">' + dLabel + ' · ' + wLabel + (dateStr ? ' · Applied ' + dateStr : '') + '</div>'
        + '<span class="status-badge status-' + status + '">' + status + '</span>'
        + '</div>';

    var actionsHtml = '';
    if (isActive && card.card_number) {
        var cid = card.id;
        actionsHtml = '<div class="card-actions">'
            + '<button class="btn btn-outline" onclick="copyCardDetails(\'' + cid + '\')"><i class="fas fa-copy"></i> Copy Details</button>'
            + '<button class="btn btn-outline" onclick="downloadCardDetails(\'' + cid + '\')"><i class="fas fa-download"></i> Download</button>'
            + '</div>'
            + '<button class="btn btn-error btn-small" style="width:100%;margin-top:8px;" onclick="initCancelCard(\'' + cid + '\')">'
            + '<i class="fas fa-ban"></i> Cancel Card</button>';
    }

    return '<div class="card-list-item">' + widgetHtml + noticeHtml + metaHtml + actionsHtml + '</div>';
}

// ── COPY / DOWNLOAD (active cards only) ───────

// Cache for card lookups so we don't re-query
var _cardCache = {};

async function _getCardById(id) {
    if (_cardCache[id]) return _cardCache[id];
    var res = await db.from('card_applications').select('*').eq('id', id).single();
    if (!res.error && res.data) { _cardCache[id] = res.data; return res.data; }
    return null;
}

async function copyCardDetails(id) {
    var card = await _getCardById(id);
    if (!card || !card.card_number) { showToast('Card details not available', 'error'); return; }
    var n    = card.card_number;
    var text = 'Summit Trust Digital Bank — CARD DETAILS\n'
             + '==============================\n'
             + 'Card Number: ' + n.slice(0,4) + ' ' + n.slice(4,8) + ' ' + n.slice(8,12) + ' ' + n.slice(12,16) + '\n'
             + 'Expiry:      ' + (card.card_expiry  || 'N/A') + '\n'
             + 'Holder:      ' + (card.card_holder  || 'N/A') + '\n'
             + 'Network:     ' + (card.card_network || 'N/A').toUpperCase() + '\n'
             + 'Type:        ' + (card.delivery_type === 'physical' ? 'Physical' : 'Digital') + '\n'
             + 'Wallet:      ' + (card.wallet_type === 'crypto' ? (card.crypto_coin || 'crypto').toUpperCase() : 'USD');
    navigator.clipboard.writeText(text)
        .then(function () { showToast('Card details copied', 'success'); })
        .catch(function () { showToast('Failed to copy', 'error'); });
}

async function downloadCardDetails(id) {
    var card = await _getCardById(id);
    if (!card || !card.card_number) { showToast('Card details not available', 'error'); return; }
    var n    = card.card_number;
    var text = 'Summit Trust Digital Bank — CARD DETAILS\n'
             + '==============================\n'
             + 'Date:        ' + new Date().toLocaleDateString() + '\n'
             + 'Card Number: ' + n.slice(0,4) + ' ' + n.slice(4,8) + ' ' + n.slice(8,12) + ' ' + n.slice(12,16) + '\n'
             + 'Expiry:      ' + (card.card_expiry  || 'N/A') + '\n'
             + 'Holder:      ' + (card.card_holder  || 'N/A') + '\n'
             + 'Network:     ' + (card.card_network || 'N/A').toUpperCase() + '\n'
             + 'Type:        ' + (card.delivery_type === 'physical' ? 'Physical' : 'Digital') + '\n'
             + 'Wallet:      ' + (card.wallet_type === 'crypto' ? (card.crypto_coin || 'crypto').toUpperCase() : 'USD') + '\n\n'
             + 'Keep this information secure and do not share with anyone.';
    var blob = new Blob([text], { type: 'text/plain' });
    var url  = URL.createObjectURL(blob);
    var a    = document.createElement('a');
    a.href   = url;
    a.download = 'Summit Trust-card-' + n.slice(-4) + '.txt';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Card details downloaded', 'success');
}

// ── CANCEL CARD FLOW ──────────────────────────

async function initCancelCard(cardId) {
    var card = await _getCardById(cardId);
    if (!card) { showToast('Card not found', 'error'); return; }

    var netLabels = { visa: 'Visa', mastercard: 'Mastercard', amex: 'American Express' };
    var nLabel = netLabels[card.card_network] || card.card_network || '';
    var dLabel = card.delivery_type === 'physical' ? 'Physical' : 'Digital';
    var wLabel = card.wallet_type === 'crypto' ? (card.crypto_coin || 'crypto').toUpperCase() : 'USD';

    document.getElementById('cardModal').classList.add('active');
    document.getElementById('cardModalTitle').textContent = 'Cancel Card';
    document.getElementById('cardModalBody').innerHTML =
        '<div style="text-align:center;padding:16px 0 8px;">'
        + '<div style="width:64px;height:64px;border-radius:50%;background:rgba(220,38,38,.1);'
        + 'display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">'
        + '<i class="fas fa-exclamation-triangle" style="font-size:1.8rem;color:var(--error);"></i>'
        + '</div>'
        + '<h4 style="margin:0 0 8px;color:var(--error);">Cancel This Card?</h4>'
        + '<p style="color:var(--text-secondary);margin:0 0 6px;">' + nLabel + ' ' + dLabel + ' Card (' + wLabel + ')</p>'
        + '<p style="color:var(--text-secondary);font-size:.875rem;margin:0 0 20px;">'
        + 'This is <strong>permanent</strong>. The card will be deactivated. You can apply for a new one.</p>'
        + (currentUser.account_type === 'joint'
            ? '<div class="alert alert-info" style="text-align:left;margin-bottom:16px;">'
              + '<i class="fas fa-users"></i>'
              + '<span>Joint account — your co-holder must also approve this cancellation.</span></div>'
            : '')
        + '<div style="display:flex;gap:10px;">'
        + '<button class="btn btn-outline" style="flex:1;" onclick="hideCardModal()">Keep Card</button>'
        + '<button class="btn btn-error" style="flex:1;" id="cancelCardConfirmBtn" onclick="confirmCancelCard(\'' + cardId + '\')">'
        + '<i class="fas fa-ban"></i> Yes, Cancel</button>'
        + '</div></div>';
}

async function confirmCancelCard(cardId) {
    var confirmed = await requestPin('Enter your PIN to cancel this card.');
    if (!confirmed) return;

    var btn = document.getElementById('cancelCardConfirmBtn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...'; }

    try {
        if (currentUser.account_type === 'joint' && currentUser.joint_account_id) {
            var pending = await createPendingAction('card_cancellation', { card_id: cardId });
            if (pending) {
                document.getElementById('cardModalTitle').textContent = 'Awaiting Co-holder';
                document.getElementById('cardModalBody').innerHTML =
                    '<div style="text-align:center;padding:24px 0;">'
                    + '<div style="width:64px;height:64px;border-radius:50%;background:rgba(245,158,11,.15);'
                    + 'display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">'
                    + '<i class="fas fa-hourglass-half" style="font-size:1.8rem;color:var(--warning);"></i>'
                    + '</div>'
                    + '<h4 style="margin:0 0 8px;">Waiting for Co-holder</h4>'
                    + '<p style="color:var(--text-secondary);font-size:.875rem;margin:0 0 24px;">'
                    + 'Your co-account holder must approve the card cancellation.</p>'
                    + '<button class="btn btn-primary btn-block" onclick="hideCardModal();loadDashboardData();">Done</button>'
                    + '</div>';
            }
        } else {
            await executeCancelCard(cardId);
            hideCardModal();
            showToast('Card cancelled successfully', 'success');
            await loadDashboardData();
        }
    } catch (err) {
        console.error('confirmCancelCard error:', err);
        showToast('Error: ' + err.message, 'error');
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-ban"></i> Yes, Cancel'; }
    }
}

async function executeCancelCard(cardId) {
    var err = (await db.from('card_applications')
        .update({ status: 'cancelled' })
        .eq('id', cardId)).error;
    if (err) throw err;
}

// ── WIRE UP TO DASHBOARD ──────────────────────
// dashboard.js calls window._loadCards() via its loadCards() stub

window._loadCards       = loadCards;
window.initCardModal    = initCardModal;
window.hideCardModal    = hideCardModal;
window.showCardModal    = showCardModal;

// Step navigation (called from inline onclick in rendered HTML)
window.renderCardStep1      = renderCardStep1;
window.renderCardStep2      = renderCardStep2;
window.renderCardStep3      = renderCardStep3;
window.renderCardCryptoCoins = renderCardCryptoCoins;
window.renderCardShipping   = renderCardShipping;
window.renderCardReview     = renderCardReview;
window.selectCardWallet     = selectCardWallet;
window.selectCryptoCoin     = selectCryptoCoin;
window.selectDelivery       = selectDelivery;
window.selectNetwork        = selectNetwork;
window.saveShippingAndReview = saveShippingAndReview;
window.submitCardApplication = submitCardApplication;
window.copyCardDetails      = copyCardDetails;
window.downloadCardDetails  = downloadCardDetails;

window.initCancelCard       = initCancelCard;
window.confirmCancelCard    = confirmCancelCard;
window.executeCancelCard    = executeCancelCard;
window.generateCardNumber   = generateCardNumber;
window.generateExpiry       = generateExpiry;