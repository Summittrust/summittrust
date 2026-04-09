// ============================================
// INVESTMENT MODULE
// Plans: Starter / Premium / Elite
// Profit manually updated by admin in DB.
// Growth % = (current_profit / locked_amount) * 100
// Multiple investments per account allowed.
// Joint: both users must approve.
// ============================================

var INVEST_PLANS = {
    starter: { key:'starter', label:'Starter', minAmount:150,  multiplier:20, months:3, color:'#16a34a', desc:'Min $150 · Locked 3 months · 20x growth' },
    premium: { key:'premium', label:'Premium', minAmount:500,  multiplier:35, months:6, color:'#7c3aed', desc:'Min $500 · Locked 6 months · 35x growth' },
    elite:   { key:'elite',   label:'Elite',   minAmount:1500, multiplier:50, months:9, color:'#dc2626', desc:'Min $1,500 · Locked 9 months · 50x growth' }
};

var investState = { selectedPlan: null, amount: 0, name: '' };

// ── MODAL ──────────────────────────────────────────────────────────────────

function initInvestmentModal() {
    investState = { selectedPlan: null, amount: 0, name: '' };
    document.getElementById('investmentModal').classList.add('active');
    renderInvestStep1();
}
function hideInvestmentModal() { document.getElementById('investmentModal').classList.remove('active'); }
function showInvestmentModal() { initInvestmentModal(); }

// ── STEP 1: Plan ───────────────────────────────────────────────────────────

function renderInvestStep1() {
    document.getElementById('investmentModalTitle').textContent = 'New Investment';
    document.getElementById('investmentModalBody').innerHTML =
        '<p style="color:var(--text-secondary);font-size:.875rem;margin-bottom:16px;">Choose a plan. Funds are locked for the duration and deducted from your USD balance.</p>'
        + '<div class="invest-plans">'
        + investPlanCard('starter') + investPlanCard('premium') + investPlanCard('elite')
        + '</div>'
        + (currentUser.account_type === 'joint'
            ? '<div class="alert alert-info" style="margin-top:16px;"><i class="fas fa-users"></i><span>Joint account — both holders must approve.</span></div>' : '')
        + '<button class="btn btn-outline btn-block" style="margin-top:16px;" onclick="hideInvestmentModal()">Cancel</button>';
}

function investPlanCard(key) {
    var p = INVEST_PLANS[key];
    return '<div class="invest-plan-card ' + key + '" onclick="selectInvestPlan(\'' + key + '\')">'
        + '<span class="invest-plan-badge">' + p.label + '</span>'
        + '<div class="invest-plan-multiplier">' + p.multiplier + 'x</div>'
        + '<div class="invest-plan-amount">Min ' + formatCurrency(p.minAmount) + '</div>'
        + '<div class="invest-plan-meta">' + p.months + ' months lock</div>'
        + '</div>';
}

function selectInvestPlan(key) { investState.selectedPlan = key; renderInvestStep2(); }

// ── STEP 2: Name + Amount ──────────────────────────────────────────────────

function renderInvestStep2() {
    var p = INVEST_PLANS[investState.selectedPlan];
    if (!p) return;
    document.getElementById('investmentModalTitle').textContent = p.label + ' Plan';
    document.getElementById('investmentModalBody').innerHTML =
        investBack('renderInvestStep1()')
        + '<div style="background:var(--bg-secondary);border:1px solid var(--border);border-radius:12px;padding:14px 16px;margin-bottom:20px;">'
        + '<div style="font-size:.8rem;color:' + p.color + ';font-weight:700;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px;">' + p.label + ' Plan</div>'
        + '<div style="font-size:.875rem;color:var(--text-secondary);">' + p.desc + '</div>'
        + '</div>'
        + '<div class="form-group"><label class="form-label">Investment Name</label>'
        + '<input type="text" id="investName" class="form-input" placeholder="e.g. My Starter Fund" maxlength="60"></div>'
        + '<div class="form-group"><label class="form-label">Amount to Lock</label>'
        + '<input type="number" id="investAmount" class="form-input" placeholder="Min ' + formatCurrency(p.minAmount) + '" min="' + p.minAmount + '" step="1" oninput="updateInvestPreview()"></div>'
        + '<div id="investPreview"></div>'
        + '<button class="btn btn-primary btn-block" style="margin-top:20px;" onclick="proceedInvestReview()">Review Investment</button>';
}

function updateInvestPreview() {
    var p = INVEST_PLANS[investState.selectedPlan];
    var amount = parseFloat((document.getElementById('investAmount') || {}).value) || 0;
    var el = document.getElementById('investPreview');
    if (!el) return;
    if (amount < p.minAmount) { el.innerHTML = ''; return; }
    var projected = amount * p.multiplier;
    el.innerHTML =
        '<div style="background:var(--bg-secondary);border-radius:10px;padding:12px 14px;margin-top:4px;">'
        + iRow('Locked Amount', formatCurrency(amount))
        + iRow('Multiplier', '<span style="color:' + p.color + ';font-weight:700;">' + p.multiplier + 'x</span>')
        + '<div style="display:flex;justify-content:space-between;font-size:.95rem;border-top:1px solid var(--border);padding-top:8px;margin-top:2px;">'
        + '<span style="color:var(--text-secondary);">Projected Value</span>'
        + '<span style="font-weight:700;color:' + p.color + ';">' + formatCurrency(projected) + '</span></div>'
        + '</div>';
}

function iRow(label, value) {
    return '<div style="display:flex;justify-content:space-between;font-size:.85rem;margin-bottom:6px;">'
        + '<span style="color:var(--text-secondary);">' + label + '</span><span>' + value + '</span></div>';
}

async function proceedInvestReview() {
    var p      = INVEST_PLANS[investState.selectedPlan];
    var name   = ((document.getElementById('investName') || {}).value || '').trim();
    var amount = parseFloat((document.getElementById('investAmount') || {}).value) || 0;
    if (!name)             { showToast('Please enter an investment name', 'error'); return; }
    if (amount < p.minAmount) { showToast('Minimum amount is ' + formatCurrency(p.minAmount), 'error'); return; }
    var balance = await fetchAvailableBalance();
    if (balance < amount) { renderInvestInsufficientFunds(balance, amount, p); return; }
    investState.amount = amount;
    investState.name   = name;
    renderInvestReview();
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

function renderInvestInsufficientFunds(balance, needed, plan) {
    document.getElementById('investmentModalBody').innerHTML =
        '<div style="text-align:center;padding:20px 0 8px;">'
        + '<i class="fas fa-exclamation-circle" style="font-size:3rem;color:var(--error);margin-bottom:16px;display:block;"></i>'
        + '<h4 style="margin:0 0 8px;">Insufficient Balance</h4>'
        + '<p style="color:var(--text-secondary);margin:0 0 6px;">Your available balance is <strong>' + formatCurrency(balance) + '</strong>.</p>'
        + '<p style="color:var(--text-secondary);margin:0 0 20px;">You need <strong>' + formatCurrency(needed) + '</strong> for this plan.</p>'
        + '<div class="alert alert-info" style="text-align:left;margin-bottom:20px;"><i class="fas fa-info-circle"></i>'
        + '<span>Add funds to your USD balance first, then try again.</span></div>'
        + '<div style="display:flex;gap:10px;">'
        + '<button class="btn btn-outline" style="flex:1;" onclick="renderInvestStep2()">Back</button>'
        + '<button class="btn btn-primary" style="flex:1;" onclick="hideInvestmentModal();showReceiveModal()">Add Funds</button>'
        + '</div></div>';
}

// ── STEP 3: Review ─────────────────────────────────────────────────────────

function renderInvestReview() {
    var p         = INVEST_PLANS[investState.selectedPlan];
    var projected = investState.amount * p.multiplier;
    document.getElementById('investmentModalTitle').textContent = 'Review Investment';
    document.getElementById('investmentModalBody').innerHTML =
        investBack('renderInvestStep2()')
        + '<div style="background:var(--bg-secondary);border-radius:12px;border:1px solid var(--border);overflow:hidden;margin-bottom:20px;">'
        + investRow('Name',          investState.name)
        + investRow('Plan',          p.label)
        + investRow('Amount',        formatCurrency(investState.amount))
        + investRow('Lock Period',   p.months + ' months')
        + investRow('Multiplier',    p.multiplier + 'x')
        + investRow('Projected',     formatCurrency(projected))
        + investRow('Deducted From', 'USD Available Balance')
        + '</div>'
        + '<div class="alert alert-warning" style="margin-bottom:16px;"><i class="fas fa-lock"></i>'
        + '<span>Funds locked for <strong>' + p.months + ' months</strong>. Profit credited manually by our team.</span></div>'
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
    var projected = investState.amount * p.multiplier;
    var investData = { plan: p.key, goal_name: investState.name, amount: investState.amount, multiplier: p.multiplier, lock_months: p.months, projected: projected };

    try {
        if (currentUser.account_type === 'joint' && currentUser.joint_account_id) {
            var pending = await createPendingAction('investment_goal', investData);
            if (pending) { renderInvestSuccess('joint_pending'); }
        } else {
            var acctRes = await db.from('accounts').select('id,balance').eq('user_id', currentUser.id).eq('status','active').limit(1);
            var acct    = acctRes.data && acctRes.data[0] ? acctRes.data[0] : null;
            if (!acct) throw new Error('Account not found');
            var newBal  = parseFloat(acct.balance) - investState.amount;
            if (newBal < 0) throw new Error('Insufficient balance');
            var balErr = (await db.from('accounts').update({ balance: newBal, updated_at: new Date().toISOString() }).eq('id', acct.id)).error;
            if (balErr) throw balErr;

            var insErr = (await db.from('investments').insert([{
                user_id:              currentUser.id,
                investment_reference: 'INV-' + Date.now().toString(36).toUpperCase(),
                investment_type:      'plan',
                goal_name:            investData.goal_name,
                plan:                 investData.plan,
                locked_amount:        investData.amount,
                current_value:        investData.amount,
                current_profit:       0,
                multiplier:           investData.multiplier,
                lock_period_months:   investData.lock_months,
                lock_months:          investData.lock_months,
                roi_percentage:       0,
                projected_value:      investData.projected,
                target_amount:        investData.projected,
                status:               'active',
                activated_at:         new Date().toISOString()
            }])).error;
            if (insErr) throw insErr;

            await db.from('transactions').insert([{
                user_id: currentUser.id, transaction_type: 'investment_deposit',
                amount: investState.amount, currency: 'USD', total_amount: investState.amount,
                from_user_id: currentUser.id, from_email: currentUser.email,
                description: p.label + ' investment — ' + investState.name + ' (' + formatCurrency(investState.amount) + ' locked)',
                status: 'completed', requires_approval: false, completed_at: new Date().toISOString()
            }]);

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
    var msg     = isJoint
        ? 'Your co-holder must approve. Funds will be locked once both approve.'
        : formatCurrency(investState.amount) + ' locked in your ' + (p.label || '') + ' plan. Profit credited by our team.';
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
    document.getElementById('investmentModal').classList.add('active');
    document.getElementById('investmentModalTitle').textContent = 'Add Funds — ' + inv.goal_name;
    document.getElementById('investmentModalBody').innerHTML =
        '<p style="color:var(--text-secondary);font-size:.875rem;margin-bottom:16px;">Add funds to your <strong>' + p.label + '</strong> investment. Deducted from your USD balance.</p>'
        + '<div class="form-group"><label class="form-label">Amount to Add</label>'
        + '<input type="number" id="topupAmount" class="form-input" placeholder="Enter amount" min="1" step="1" oninput="updateTopupPreview(\'' + investmentId + '\',' + (parseFloat(inv.locked_amount)||0) + ',' + p.multiplier + ')"></div>'
        + '<div id="topupPreview"></div>'
        + '<button class="btn btn-primary btn-block" style="margin-top:16px;" onclick="submitTopUp(\'' + investmentId + '\')">Add Funds</button>'
        + '<button class="btn btn-outline btn-block" style="margin-top:8px;" onclick="hideInvestmentModal()">Cancel</button>';
}

function updateTopupPreview(investmentId, currentLocked, multiplier) {
    var amount = parseFloat((document.getElementById('topupAmount')||{}).value) || 0;
    var el = document.getElementById('topupPreview');
    if (!el || amount <= 0) { if (el) el.innerHTML = ''; return; }
    var newLocked    = currentLocked + amount;
    var newProjected = newLocked * multiplier;
    el.innerHTML =
        '<div style="background:var(--bg-secondary);border-radius:10px;padding:12px 14px;margin-top:4px;">'
        + iRow('New Locked Total', formatCurrency(newLocked))
        + iRow('New Projected', '<span style="font-weight:700;color:var(--success);">' + formatCurrency(newProjected) + '</span>')
        + '</div>';
}

async function submitTopUp(investmentId) {
    var amount = parseFloat((document.getElementById('topupAmount')||{}).value) || 0;
    if (amount <= 0) { showToast('Enter a valid amount', 'error'); return; }
    var balance = await fetchAvailableBalance();
    if (balance < amount) { showToast('Insufficient balance. Available: ' + formatCurrency(balance), 'error'); return; }
    var confirmed = await requestPin('Enter your PIN to add funds.');
    if (!confirmed) return;

    try {
        var acctQ = db.from('accounts').select('id,balance').eq('status','active').limit(1);
        if (currentUser.account_type === 'joint' && currentUser.joint_account_id) {
            acctQ = acctQ.eq('joint_account_id', currentUser.joint_account_id);
        } else {
            acctQ = acctQ.eq('user_id', currentUser.id);
        }
        var acct = ((await acctQ).data || [])[0];
        if (!acct) throw new Error('Account not found');
        await db.from('accounts').update({ balance: parseFloat(acct.balance) - amount, updated_at: new Date().toISOString() }).eq('id', acct.id);

        var inv = ((await db.from('investments').select('locked_amount,top_ups,multiplier').eq('id', investmentId).single()).data) || {};
        var newLocked    = parseFloat(inv.locked_amount || 0) + amount;
        var newProjected = newLocked * parseFloat(inv.multiplier || 1);
        await db.from('investments').update({ locked_amount: newLocked, current_value: newLocked, top_ups: parseFloat(inv.top_ups||0)+amount, projected_value: newProjected, target_amount: newProjected, updated_at: new Date().toISOString() }).eq('id', investmentId);

        await db.from('transactions').insert([{
            user_id: currentUser.id, transaction_type: 'investment_deposit',
            amount: amount, currency: 'USD', total_amount: amount, from_user_id: currentUser.id,
            description: 'Investment top-up — ' + formatCurrency(amount) + ' added',
            status: 'completed', requires_approval: false, completed_at: new Date().toISOString()
        }]);

        showToast('Funds added successfully', 'success');
        hideInvestmentModal();
        await loadDashboardData();
    } catch (err) {
        console.error('submitTopUp error:', err);
        showToast('Error: ' + err.message, 'error');
    }
}

// ── LOAD & RENDER ──────────────────────────────────────────────────────────

async function loadInvestments() {
    var container = document.getElementById('investmentsList');
    if (!container) return;
    try {
        var q = db.from('investments').select('*').order('created_at', { ascending: false });
        if (currentUser.account_type === 'joint' && currentUser.joint_account_id) {
            q = q.eq('joint_account_id', currentUser.joint_account_id);
        } else {
            q = q.eq('user_id', currentUser.id);
        }
        var items = (await q).data || [];
        var total = items.reduce(function (s, i) { return s + parseFloat(i.locked_amount || i.current_value || 0); }, 0);
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
    var locked      = parseFloat(inv.locked_amount || inv.current_value || 0);
    var profit      = parseFloat(inv.current_profit || 0);
    var projected   = parseFloat(inv.projected_value || locked * plan.multiplier);
    var growthPct   = locked > 0 ? ((profit / locked) * 100).toFixed(2) : '0.00';
    var progressPct = projected > 0 ? Math.min(100, Math.round((locked + profit) / projected * 100)) : 0;
    var status      = inv.status || 'active';
    var isActive    = status === 'active';
    var months      = inv.lock_period_months || inv.lock_months || plan.months;

    return '<div class="invest-card">'
        + '<div class="invest-card-header">'
        + '<div><div class="invest-card-name">' + (inv.goal_name || 'Investment') + '</div>'
        + '<div class="invest-card-plan" style="color:' + plan.color + ';">' + plan.label + ' Plan &bull; ' + months + ' months &bull; ' + plan.multiplier + 'x</div></div>'
        + '<span class="status-badge status-' + status + '">' + status + '</span>'
        + '</div>'
        + '<div class="invest-growth-box">'
        + '<div class="invest-growth-item"><div class="invest-growth-label">Locked</div><div class="invest-growth-value">' + formatCurrency(locked) + '</div></div>'
        + '<div class="invest-growth-item"><div class="invest-growth-label">Profit</div><div class="invest-growth-value ' + (profit > 0 ? 'positive' : 'neutral') + '">' + (profit > 0 ? '+' : '') + formatCurrency(profit) + '</div></div>'
        + '<div class="invest-growth-item"><div class="invest-growth-label">Growth</div><div class="invest-growth-value ' + (profit > 0 ? 'positive' : 'neutral') + '">' + (profit > 0 ? '+' : '') + growthPct + '%</div></div>'
        + '</div>'
        + '<div class="invest-progress-wrap"><div class="invest-progress-bar" style="width:' + progressPct + '%;"></div></div>'
        + '<div class="invest-progress-labels"><span>' + formatCurrency(locked + profit) + ' of ' + formatCurrency(projected) + '</span><span>' + progressPct + '%</span></div>'
        + '<div style="display:flex;justify-content:space-between;font-size:.75rem;color:var(--text-secondary);margin-top:10px;">'
        + '<span>Started: ' + new Date(inv.activated_at || inv.created_at).toLocaleDateString() + '</span>'
        + '<span>Projected: ' + formatCurrency(projected) + '</span></div>'
        + (isActive ? '<button class="btn btn-outline invest-topup-btn" onclick="initTopUpInvestment(\'' + inv.id + '\')"><i class="fas fa-plus"></i> Add Funds</button>' : '')
        + '</div>';
}

// ── JOINT APPROVAL ─────────────────────────────────────────────────────────

async function executeInvestmentApproval(pendingAction) {
    var d = pendingAction.action_data;

    var acctRes = await db.from('accounts').select('id,balance')
        .eq('joint_account_id', currentUser.joint_account_id)
        .eq('status', 'active')
        .limit(1);
    var acct = acctRes.data && acctRes.data[0] ? acctRes.data[0] : null;
    if (!acct) throw new Error('Joint account not found');

    var newBal = parseFloat(acct.balance) - d.amount;
    if (newBal < 0) throw new Error('Insufficient balance');

    await db.from('accounts').update({ balance: newBal, updated_at: new Date().toISOString() }).eq('id', acct.id);

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
        status:               'active',
        initiated_by_user_id: pendingAction.initiated_by_user_id,
        approved_by_user_id:  currentUser.id,
        activated_at:         new Date().toISOString()
    }])).error;
    if (insErr) throw insErr;

    await db.from('transactions').insert([{
        joint_account_id:    currentUser.joint_account_id,
        user_id:             pendingAction.initiated_by_user_id,
        transaction_type:    'investment_deposit',
        amount:              d.amount, currency: 'USD', total_amount: d.amount,
        from_user_id:        pendingAction.initiated_by_user_id,
        approved_by_user_id: currentUser.id,
        description:         (INVEST_PLANS[d.plan] ? INVEST_PLANS[d.plan].label : d.plan) + ' investment — ' + d.goal_name + ' (' + formatCurrency(d.amount) + ' locked)',
        status:              'completed', requires_approval: false, completed_at: new Date().toISOString()
    }]);
}

// ── GAS WALLET ─────────────────────────────────────────────────────────────

async function showGasWalletModal() {
    document.getElementById('gasWalletModal').classList.add('active');
    document.getElementById('gasWalletBody').innerHTML =
        '<div style="text-align:center;padding:20px;"><i class="fas fa-spinner fa-spin" style="font-size:1.5rem;color:var(--accent-primary);"></i></div>';
    try {
        var q = db.from('accounts').select('gas_balance,gas_wallet_address,gas_wallet_network').eq('status','active').limit(1);
        if (currentUser.account_type === 'joint' && currentUser.joint_account_id) {
            q = q.eq('joint_account_id', currentUser.joint_account_id);
        } else {
            q = q.eq('user_id', currentUser.id);
        }
        var res  = await q;
        var acct = res.data && res.data[0] ? res.data[0] : {};
        renderGasWalletContent(acct);
    } catch (err) {
        document.getElementById('gasWalletBody').innerHTML = '<p style="color:var(--error);text-align:center;">Could not load wallet info.</p>';
    }
}

function renderGasWalletContent(acct) {
    var balance = parseFloat(acct.gas_balance || 0);
    var address = acct.gas_wallet_address || null;
    var network = acct.gas_wallet_network || 'TRC20';

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
        + '<div class="gas-balance-display">' + formatCurrency(balance) + '</div>'
        + '<div style="font-size:.8rem;opacity:.7;margin-bottom:8px;">Gas Balance</div>'
        + '<div class="gas-wallet-address">' + address + '</div>'
        + '<button class="btn btn-outline" style="color:#fff;border-color:rgba(255,255,255,.3);font-size:.8rem;padding:6px 14px;" onclick="copyGasAddress(\'' + address + '\')">'
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

function hideGasWalletModal() { document.getElementById('gasWalletModal').classList.remove('active'); }

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
window.showGasWalletModal        = showGasWalletModal;
window.hideGasWalletModal        = hideGasWalletModal;
window.copyGasAddress            = copyGasAddress;