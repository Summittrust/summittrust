// ============================================
// LOAN MODULE
// Depends on: db, currentUser, requestPin(),
//   createPendingAction(), formatCurrency(),
//   showToast(), loadDashboardData()
//
// Disbursement: always to USD available balance.
// ============================================

var LOAN_CONFIG = {
    personal: [
        { level: 1, amount: 10000,  term: 8,  label: 'Level 1' },
        { level: 2, amount: 40000,  term: 18, label: 'Level 2' },
        { level: 3, amount: 80000,  term: 24, label: 'Level 3' }
    ],
    joint: [
        { level: 1, amount: 20000,  term: 8,  label: 'Level 1' },
        { level: 2, amount: 70000,  term: 18, label: 'Level 2' },
        { level: 3, amount: 150000, term: 24, label: 'Level 3' }
    ],
    interestRate: 2.5
};

var LEVEL_BADGE = { 1: 'l1', 2: 'l2', 3: 'l3' };

var loanState = { selectedLevel: null, allLoans: [], levelStatus: {} };

function initLoanModal() {
    loanState.selectedLevel = null;
    document.getElementById('loanModal').classList.add('active');
    renderLoanStep1();
}
function hideLoanModal() { document.getElementById('loanModal').classList.remove('active'); }
function showLoanModal() { initLoanModal(); }

async function renderLoanStep1() {
    document.getElementById('loanModalTitle').textContent = 'Apply for Loan';
    var body = document.getElementById('loanModalBody');
    body.innerHTML = '<div style="text-align:center;padding:30px;"><i class="fas fa-spinner fa-spin" style="font-size:2rem;color:var(--accent-primary);"></i></div>';

    var config  = currentUser.account_type === 'joint' ? LOAN_CONFIG.joint : LOAN_CONFIG.personal;
    var history = await fetchLoanHistory();
    loanState.allLoans    = history;
    loanState.levelStatus = computeLevelStatus(history, config);

    var html = '<p style="color:var(--text-secondary);font-size:.875rem;margin-bottom:16px;">'
        + 'Select your loan level. Each level must be fully repaid before the next unlocks. '
        + 'Approved funds are added directly to your USD available balance.</p>'
        + '<div class="loan-levels">';

    for (var i = 0; i < config.length; i++) {
        var cfg       = config[i];
        var st        = loanState.levelStatus[cfg.level] || 'locked';
        var isAvail   = st === 'available';
        var isActive  = st === 'active';
        var isRepaid  = st === 'repaid';
        var isLocked  = st === 'locked';
        var cardClass = 'loan-level-card' + (isActive ? ' active-loan' : '') + (isRepaid ? ' repaid' : '') + (isLocked ? ' locked' : '');
        var tag = isActive  ? '<span class="loan-level-status-tag tag-active">Active</span>'
                : isRepaid  ? '<span class="loan-level-status-tag tag-repaid">Repaid \u2713</span>'
                : isLocked  ? '<span class="loan-level-status-tag tag-locked">Locked</span>'
                : '<span class="loan-level-status-tag tag-available">Available</span>';
        var onclick    = isAvail ? 'onclick="selectLoanLevel(' + cfg.level + ')"' : '';
        var interest   = cfg.amount * LOAN_CONFIG.interestRate / 100;
        var totalRepay = cfg.amount + interest;

        html += '<div class="' + cardClass + '" ' + onclick + '>'
            + tag
            + '<span class="loan-level-badge ' + LEVEL_BADGE[cfg.level] + '">' + cfg.label + '</span>'
            + '<div class="loan-level-amount">' + formatCurrency(cfg.amount) + '</div>'
            + '<div class="loan-level-meta">' + cfg.term + ' months &bull; ' + LOAN_CONFIG.interestRate + '% interest<br>Total repay: ' + formatCurrency(totalRepay) + '</div>'
            + '</div>';
    }

    html += '</div>';
    if (currentUser.account_type === 'joint') {
        html += '<div class="alert alert-info" style="margin-top:16px;"><i class="fas fa-users"></i><span>Joint account — both holders must approve before admin review.</span></div>';
    }
    html += '<button class="btn btn-outline btn-block" style="margin-top:16px;" onclick="hideLoanModal()">Cancel</button>';
    body.innerHTML = html;
}

function selectLoanLevel(level) {
    loanState.selectedLevel = level;
    renderLoanReview();
}

function renderLoanReview() {
    var config = currentUser.account_type === 'joint' ? LOAN_CONFIG.joint : LOAN_CONFIG.personal;
    var cfg    = config.find(function (c) { return c.level === loanState.selectedLevel; });
    if (!cfg) return;

    var interest   = cfg.amount * LOAN_CONFIG.interestRate / 100;
    var totalRepay = cfg.amount + interest;
    var monthly    = (totalRepay / cfg.term).toFixed(2);

    document.getElementById('loanModalTitle').textContent = 'Review Loan Application';
    document.getElementById('loanModalBody').innerHTML =
        loanBack('renderLoanStep1()')
        + '<div class="loan-summary-box">'
        + loanRow('Level',           'Level ' + cfg.level)
        + loanRow('Loan Amount',     formatCurrency(cfg.amount))
        + loanRow('Interest Rate',   LOAN_CONFIG.interestRate + '% flat')
        + loanRow('Interest',        formatCurrency(interest))
        + loanRow('Total Repayable', formatCurrency(totalRepay))
        + loanRow('Term',            cfg.term + ' months')
        + loanRow('Monthly Payment', formatCurrency(monthly))
        + loanRow('Disbursed To',    'USD Available Balance')
        + '</div>'
        + '<div class="alert alert-warning" style="margin-bottom:16px;"><i class="fas fa-info-circle"></i>'
        + '<span>Status shows as <strong>Processing</strong> until our team approves and disburses funds.</span></div>'
        + (currentUser.account_type === 'joint'
            ? '<div class="alert alert-info" style="margin-bottom:16px;"><i class="fas fa-users"></i><span>Both account holders must approve before admin review.</span></div>'
            : '')
        + '<button class="btn btn-primary btn-block" id="loanSubmitBtn" onclick="submitLoanApplication()">Submit Application</button>';
}

function loanRow(label, value) {
    return '<div class="loan-summary-row"><span>' + label + '</span><span>' + value + '</span></div>';
}

function loanBack(fn) {
    return '<button onclick="' + fn + '" style="background:none;border:none;cursor:pointer;color:var(--text-secondary);font-size:.875rem;margin-bottom:16px;padding:0;"><i class="fas fa-arrow-left"></i> Back</button>';
}

async function submitLoanApplication() {
    var confirmed = await requestPin('Enter your PIN to submit loan application.');
    if (!confirmed) return;

    var btn = document.getElementById('loanSubmitBtn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...'; }

    var config = currentUser.account_type === 'joint' ? LOAN_CONFIG.joint : LOAN_CONFIG.personal;
    var cfg    = config.find(function (c) { return c.level === loanState.selectedLevel; });
    if (!cfg) return;

    var interest   = cfg.amount * LOAN_CONFIG.interestRate / 100;
    var totalRepay = cfg.amount + interest;
    var monthly    = parseFloat((totalRepay / cfg.term).toFixed(2));
    var loanData   = { level: cfg.level, amount: cfg.amount, term_months: cfg.term, interest_rate: LOAN_CONFIG.interestRate, total_repayable: totalRepay, monthly_payment: monthly, purpose: 'Level ' + cfg.level + ' loan' };

    try {
        if (currentUser.account_type === 'joint' && currentUser.joint_account_id) {
            var pending = await createPendingAction('loan_application', loanData);
            if (pending) { renderLoanSuccess('joint_pending'); }
        } else {
            var insertErr = (await db.from('loan_applications').insert([{
                user_id: currentUser.id,
                application_reference: 'LOAN-' + Date.now().toString(36).toUpperCase(),
                loan_type: 'personal_loan',
                level: loanData.level, amount: loanData.amount,
                term_months: loanData.term_months, interest_rate: loanData.interest_rate,
                total_repayable: loanData.total_repayable, monthly_payment: loanData.monthly_payment,
                purpose: loanData.purpose, status: 'processing', created_at: new Date().toISOString()
            }])).error;
            if (insertErr) throw insertErr;
            await recordLoanTransaction(loanData, null);
            renderLoanSuccess('personal_pending');
        }
    } catch (err) {
        console.error('submitLoanApplication error:', err);
        showToast('Error: ' + err.message, 'error');
        if (btn) { btn.disabled = false; btn.innerHTML = 'Submit Application'; }
    }
}

async function recordLoanTransaction(loanData, jointAccountId) {
    var record = {
        transaction_type:  'loan_disbursement',
        amount:            loanData.amount,
        currency:          'USD',
        total_amount:      loanData.amount,
        description:       'Level ' + loanData.level + ' loan application — ' + formatCurrency(loanData.amount) + ' to USD balance',
        status:            'processing',
        requires_approval: false
    };
    if (jointAccountId) {
        record.joint_account_id = jointAccountId;
        record.user_id          = currentUser.id;
    } else {
        record.user_id      = currentUser.id;
        record.from_user_id = currentUser.id;
        record.from_email   = currentUser.email;
    }
    var txErr = (await db.from('transactions').insert([record])).error;
    if (txErr) console.warn('Loan transaction record error:', txErr);
}

function renderLoanSuccess(state) {
    var isJoint = state === 'joint_pending';
    var config  = currentUser.account_type === 'joint' ? LOAN_CONFIG.joint : LOAN_CONFIG.personal;
    var cfg     = config.find(function (c) { return c.level === loanState.selectedLevel; }) || {};
    var color   = isJoint ? 'var(--warning)' : 'var(--accent-primary)';
    var bg      = isJoint ? 'rgba(245,158,11,.15)' : 'rgba(37,99,235,.1)';
    var icon    = isJoint ? 'fa-hourglass-half' : 'fa-clock';
    var title   = isJoint ? 'Waiting for Co-holder' : 'Application Submitted';
    var msg     = isJoint
        ? 'Your co-holder must approve. Once both approve, the application goes to admin review.'
        : 'Under review. Funds will be added to your USD balance once approved.';

    document.getElementById('loanModalTitle').textContent = title;
    document.getElementById('loanModalBody').innerHTML =
        '<div style="text-align:center;padding:24px 0;">'
        + '<div style="width:64px;height:64px;border-radius:50%;background:' + bg + ';display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">'
        + '<i class="fas ' + icon + '" style="font-size:1.8rem;color:' + color + ';"></i></div>'
        + '<h4 style="margin:0 0 8px;">' + title + '</h4>'
        + '<p style="color:var(--text-secondary);margin:0 0 6px;">Level ' + (loanState.selectedLevel || '') + ' \u2014 ' + formatCurrency(cfg.amount || 0) + '</p>'
        + '<p style="color:var(--text-secondary);font-size:.875rem;margin:0 0 24px;">' + msg + '</p>'
        + '<button class="btn btn-primary btn-block" onclick="hideLoanModal();loadDashboardData();">View My Loans</button>'
        + '</div>';
}

async function fetchLoanHistory() {
    try {
        var q = db.from('loan_applications').select('*').order('created_at', { ascending: false });
        if (currentUser.account_type === 'joint' && currentUser.joint_account_id) {
            q = q.eq('joint_account_id', currentUser.joint_account_id);
        } else {
            q = q.eq('user_id', currentUser.id);
        }
        return (await q).data || [];
    } catch (e) { return []; }
}

function computeLevelStatus(loans, config) {
    var status = {};
    for (var i = 0; i < config.length; i++) status[config[i].level] = 'locked';
    status[1] = 'available';

    for (var j = 0; j < loans.length; j++) {
        var loan = loans[j], lvl = loan.level || 1, st = loan.status;
        if (st === 'processing' || st === 'approved' || st === 'disbursed') {
            status[lvl] = 'active';
        } else if (st === 'repaid') {
            status[lvl] = 'repaid';
            if (status[lvl + 1] !== undefined) status[lvl + 1] = 'available';
        } else if ((st === 'rejected' || st === 'cancelled') && status[lvl] !== 'repaid') {
            status[lvl] = 'available';
        }
    }

    for (var k = 1; k <= 3; k++) {
        if (status[k] === 'active') {
            for (var m = k + 1; m <= 3; m++) status[m] = 'locked';
            break;
        }
    }
    return status;
}

async function loadLoans() {
    var container = document.getElementById('loansList');
    if (!container) return;
    try {
        var q = db.from('loan_applications').select('*').order('created_at', { ascending: false });
        if (currentUser.account_type === 'joint' && currentUser.joint_account_id) {
            q = q.eq('joint_account_id', currentUser.joint_account_id);
        } else {
            q = q.eq('user_id', currentUser.id);
        }
        var loans = (await q).data || [];
        if (!loans.length) {
            container.innerHTML = '<div class="empty-state"><i class="fas fa-hand-holding-usd"></i><p>No loans yet. Click <strong>Apply for Loan</strong> to get started.</p></div>';
            return;
        }
        var html = '';
        for (var i = 0; i < loans.length; i++) html += renderLoanCard(loans[i]);
        container.innerHTML = html;
    } catch (err) { console.error('loadLoans error:', err); }
}

function renderLoanCard(loan) {
    var status   = loan.status || 'processing';
    var repaid   = parseFloat(loan.amount_repaid || 0);
    var total    = parseFloat(loan.total_repayable || loan.amount || 0);
    var pct      = total > 0 ? Math.min(100, Math.round(repaid / total * 100)) : 0;
    var isActive = status === 'disbursed' || status === 'approved';

    var progressHtml = isActive
        ? '<div class="loan-progress-bar-wrap"><div class="loan-progress-bar" style="width:' + pct + '%;"></div></div>'
          + '<div class="loan-progress-labels"><span>Repaid: ' + formatCurrency(repaid) + '</span><span>' + pct + '% of ' + formatCurrency(total) + '</span></div>'
          + '<div style="font-size:.8rem;color:var(--text-secondary);margin-top:6px;">Monthly payment: <strong>' + formatCurrency(loan.monthly_payment || 0) + '</strong> &bull; Disbursed to USD balance</div>'
        : '';

    var statusMsg = (status === 'processing')
        ? '<div style="font-size:.8rem;color:var(--text-secondary);margin-top:10px;"><i class="fas fa-clock" style="color:var(--warning);margin-right:4px;"></i>Under admin review. Funds added to USD balance once approved.</div>'
        : '';

    return '<div class="loan-progress-card">'
        + '<div class="loan-progress-header">'
        + '<div>'
        + '<span class="loan-level-badge ' + (LEVEL_BADGE[loan.level] || 'l1') + '">Level ' + (loan.level || 1) + '</span>'
        + '<div style="font-size:1.1rem;font-weight:700;margin-top:4px;">' + formatCurrency(loan.amount) + '</div>'
        + '<div style="font-size:.8rem;color:var(--text-secondary);margin-top:2px;">' + (loan.term || '—') + ' months &bull; ' + LOAN_CONFIG.interestRate + '% interest</div>'
        + '</div>'
        + '<span class="status-badge status-' + status + '">' + status + '</span>'
        + '</div>'
        + progressHtml + statusMsg
        + '<div style="display:flex;justify-content:space-between;font-size:.78rem;color:var(--text-secondary);margin-top:12px;">'
        + '<span>Applied: ' + new Date(loan.created_at).toLocaleDateString() + '</span>'
        + '<span>Total repayable: ' + formatCurrency(total) + '</span>'
        + '</div></div>';
}

async function executeLoanApproval(pendingAction) {
    var d = pendingAction.action_data;
    var insertErr = (await db.from('loan_applications').insert([{
        joint_account_id: currentUser.joint_account_id, pending_action_id: pendingAction.id,
        application_reference: 'LOAN-' + Date.now().toString(36).toUpperCase(),
        loan_type: 'personal_loan',
        level: d.level, amount: d.amount, term_months: d.term_months, interest_rate: d.interest_rate,
        total_repayable: d.total_repayable, monthly_payment: d.monthly_payment, purpose: d.purpose,
        status: 'processing', initiated_by_user_id: pendingAction.initiated_by_user_id,
        approved_by_user_id: currentUser.id, created_at: new Date().toISOString()
    }])).error;
    if (insertErr) throw insertErr;
    await recordLoanTransaction(d, currentUser.joint_account_id);
}

window._loadLoans            = loadLoans;
window.initLoanModal         = initLoanModal;
window.hideLoanModal         = hideLoanModal;
window.showLoanModal         = showLoanModal;
window.renderLoanStep1       = renderLoanStep1;
window.renderLoanReview      = renderLoanReview;
window.selectLoanLevel       = selectLoanLevel;
window.submitLoanApplication = submitLoanApplication;
window.executeLoanApproval   = executeLoanApproval;