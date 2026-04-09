// ============================================
// DASHBOARD
// ============================================

const db = window.db;
let currentUser = null;
let currentSession = null;

document.addEventListener('DOMContentLoaded', async () => {
    await initDashboard();
    setupMobileMenu();
});

// ============================================
// INIT
// ============================================

async function initDashboard() {
    try {
        currentSession = await Auth.validateSession();
        if (!currentSession) {
            window.location.href = '/auth.html';
            return;
        }

        currentUser = currentSession.users;

        // Populate header
        document.getElementById('displayName').textContent = currentUser.first_name;
        document.getElementById('userName').textContent    = currentUser.first_name;
        document.getElementById('accountTypeDisplay').textContent =
            currentUser.account_type === 'joint' ? 'Joint Account' : 'Personal Account';

        // Populate navbar avatar
        const avatarEl = document.getElementById('navAvatar');
        if (avatarEl) {
            if (currentUser.profile_picture_url) {
                avatarEl.innerHTML = `<img src="${currentUser.profile_picture_url}"
                    alt="${currentUser.first_name}"
                    style="width:28px;height:28px;border-radius:50%;object-fit:cover;display:block;">`;
            } else {
                const initials = `${currentUser.first_name?.[0] || ''}${currentUser.last_name?.[0] || ''}`.toUpperCase();
                avatarEl.innerHTML = `<span style="
                    width:28px;height:28px;border-radius:50%;
                    background:var(--accent-primary,#2563eb);color:#fff;
                    font-size:.75rem;font-weight:700;
                    display:flex;align-items:center;justify-content:center;">${initials}</span>`;
            }
        }

        const dropName  = document.getElementById('dropUserName');
        const dropEmail = document.getElementById('dropUserEmail');
        if (dropName)  dropName.textContent  = `${currentUser.first_name} ${currentUser.last_name}`;
        if (dropEmail) dropEmail.textContent = currentUser.email;

        document.body.setAttribute('data-account-type', currentUser.account_type);
        handleAccountSpecificUI();

        // Always start on overview
        ['overview','transactions','cards','loans','investments','settings'].forEach(s => {
            const el = document.getElementById(s + 'Section');
            if (el) el.style.display = s === 'overview' ? 'block' : 'none';
        });
        const overviewLink = document.querySelector('.sidebar-link[onclick*="overview"]');
        if (overviewLink) overviewLink.classList.add('active');

        // Gate: must set PIN before anything else
        if (!currentUser.transaction_pin_hash) {
            showPinSetupModal();
        } else {
            await loadDashboardData();
        }

        setupEventListeners();

        // Init notifications bell
        if (typeof window.initNotifications === 'function') {
            window.initNotifications();
        }

    } catch (err) {
        console.error('Dashboard init error:', err);
        showToast('Error loading dashboard', 'error');
    }
}

function handleAccountSpecificUI() {
    const pendingCard = document.getElementById('pendingActionsCard');
    if (pendingCard) {
        pendingCard.style.display = currentUser.account_type === 'individual' ? 'none' : 'block';
    }
}

// ============================================
// EVENT LISTENERS
// ============================================

function setupEventListeners() {
    document.getElementById('logoutBtn')?.addEventListener('click', async (e) => {
        e.preventDefault();
        await Auth.logout();
    });

    document.getElementById('themeToggle')?.addEventListener('click', toggleTheme);

    document.getElementById('userMenuBtn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        document.getElementById('userMenu')?.classList.toggle('active');
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.dropdown')) {
            document.getElementById('userMenu')?.classList.remove('active');
        }
    });

    document.getElementById('pinSetupForm')?.addEventListener('submit', handlePinSetupSubmit);
    document.getElementById('sendForm')?.addEventListener('submit', handleSendSubmit);
    document.getElementById('requestForm')?.addEventListener('submit', handleRequestSubmit);

}

// ============================================
// MOBILE MENU
// ============================================

function setupMobileMenu() {
    const toggle  = document.getElementById('mobileMenuToggle');
    const overlay = document.getElementById('mobileMenuOverlay');
    const close   = document.getElementById('mobileMenuClose');

    toggle?.addEventListener('click', () => {
        overlay?.classList.add('active');
        document.body.style.overflow = 'hidden';
    });
    close?.addEventListener('click', closeMobileMenu);
    overlay?.addEventListener('click', (e) => { if (e.target === overlay) closeMobileMenu(); });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && overlay?.classList.contains('active')) closeMobileMenu();
    });
}

function closeMobileMenu() {
    document.getElementById('mobileMenuOverlay')?.classList.remove('active');
    document.body.style.overflow = '';
}

function showMobileSection(section) {
    showSection(section);
    closeMobileMenu();
    document.querySelectorAll('.mobile-menu-item').forEach(i => i.classList.remove('active'));
    event?.target?.closest('.mobile-menu-item')?.classList.add('active');
}

// ============================================
// PIN SETUP MODAL (first login gate)
// ============================================

function showPinSetupModal() {
    document.getElementById('pinModal')?.classList.add('active');
}

async function handlePinSetupSubmit(e) {
    e.preventDefault();

    const pin     = document.getElementById('pin').value;
    const confirm = document.getElementById('pinConfirm').value;

    if (!/^\d{4}$/.test(pin))  { showToast('PIN must be 4 digits', 'error'); return; }
    if (pin !== confirm)        { showToast('PINs do not match', 'error'); return; }

    const result = await Auth.setTransactionPin(currentUser.id, pin);

    if (result.success) {
        currentUser.transaction_pin_hash = await Auth.hashPassword(pin);
        document.getElementById('pinModal')?.classList.remove('active');
        showToast('PIN set successfully!', 'success');
        await loadDashboardData();
    } else {
        showToast(result.error, 'error');
    }
}

// ============================================
// PIN VERIFICATION HELPER (returns promise)
// Shows a modal asking for PIN, resolves true/false
// ============================================

function requestPin(promptMessage) {
    return new Promise((resolve) => {
        // Build or reuse the pin-verify modal
        let modal = document.getElementById('pinVerifyModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'pinVerifyModal';
            modal.className = 'modal-overlay';
            modal.innerHTML = `
                <div class="modal" style="max-width:380px;">
                    <div class="modal-header">
                        <h3>Enter Transaction PIN</h3>
                        <button class="modal-close" id="pinVerifyClose">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <p class="text-secondary" id="pinVerifyMsg" style="margin-bottom:16px;font-size:.9rem;"></p>
                        <div class="form-group">
                            <label class="form-label">4-digit PIN</label>
                            <input type="password" id="pinVerifyInput" class="form-input pin-input"
                                maxlength="4" pattern="\\d{4}" inputmode="numeric"
                                style="font-size:1.5rem;letter-spacing:.5rem;text-align:center;" autocomplete="off">
                        </div>
                        <div id="pinVerifyError" style="color:var(--error,#dc2626);font-size:.85rem;min-height:20px;margin-top:4px;"></div>
                        <button class="btn btn-primary btn-block" id="pinVerifyBtn" style="margin-top:16px;">
                            Confirm
                        </button>
                    </div>
                </div>`;
            document.body.appendChild(modal);
        }

        const msgEl   = document.getElementById('pinVerifyMsg');
        const input   = document.getElementById('pinVerifyInput');
        const btn     = document.getElementById('pinVerifyBtn');
        const errEl   = document.getElementById('pinVerifyError');
        const closeBtn = document.getElementById('pinVerifyClose');

        msgEl.textContent  = promptMessage || 'Enter your transaction PIN to continue.';
        input.value        = '';
        errEl.textContent  = '';
        modal.classList.add('active');
        setTimeout(() => input.focus(), 100);

        const cleanup = () => {
            modal.classList.remove('active');
            btn.replaceWith(btn.cloneNode(true));       // remove old listener
            closeBtn.replaceWith(closeBtn.cloneNode(true));
        };

        document.getElementById('pinVerifyBtn').addEventListener('click', async () => {
            const pin = document.getElementById('pinVerifyInput').value;
            if (!/^\d{4}$/.test(pin)) {
                document.getElementById('pinVerifyError').textContent = 'Please enter a 4-digit PIN';
                return;
            }
            const ok = await Auth.verifyPin(pin, currentUser.transaction_pin_hash);
            if (ok) {
                cleanup();
                resolve(true);
            } else {
                document.getElementById('pinVerifyError').textContent = 'Incorrect PIN. Try again.';
                document.getElementById('pinVerifyInput').value = '';
                document.getElementById('pinVerifyInput').focus();
            }
        });

        document.getElementById('pinVerifyClose').addEventListener('click', () => {
            cleanup();
            resolve(false);
        });
    });
}

// ============================================
// DATA LOADING
// ============================================

async function loadDashboardData() {
    await Promise.allSettled([
        loadBalance(),
        loadPendingActions(),
        loadRecentTransactions(),
        loadCards(),
        loadLoans(),
        loadInvestments()
    ]);
    // Keep transactions tab fresh if TxPage is initialized
    if (window.TxPage && typeof window.TxPage.load === 'function') {
        window.TxPage.load();
    }
}

async function loadBalance() {
    try {
        let query = db.from('accounts')
            .select('balance, gas_balance, account_number, status')
            .eq('status', 'active')
            .order('created_at', { ascending: true })
            .limit(1);

        if (currentUser.account_type === 'joint' && currentUser.joint_account_id) {
            query = query.eq('joint_account_id', currentUser.joint_account_id);
        } else {
            query = query.eq('user_id', currentUser.id);
        }

        const { data, error } = await query;
        if (error) { console.error('Balance query error:', error); return; }

        const account = data?.[0];
        if (account) {
            const el = document.getElementById('balance');
            if (el) el.textContent = formatCurrency(parseFloat(account.balance) || 0);
            const gasEl = document.getElementById('gasBalance');
            if (gasEl) gasEl.textContent = formatCurrency(parseFloat(account.gas_balance) || 0);
        } else {
            await createUserAccount();
        }
    } catch (err) {
        console.error('loadBalance error:', err);
    }
}

async function createUserAccount() {
    try {
        // Guard: check if account already exists before inserting
        let checkQuery = db.from('accounts').select('id, balance').limit(1);
        if (currentUser.account_type === 'joint' && currentUser.joint_account_id) {
            checkQuery = checkQuery.eq('joint_account_id', currentUser.joint_account_id);
        } else {
            checkQuery = checkQuery.eq('user_id', currentUser.id);
        }
        const { data: existing } = await checkQuery;
        if (existing?.[0]) {
            const el = document.getElementById('balance');
            if (el) el.textContent = formatCurrency(parseFloat(existing[0].balance) || 0);
            return existing[0];
        }

        const prefix        = currentUser.account_type === 'joint' ? 'MTJ' : 'MT';
        const accountNumber = prefix + Date.now().toString().slice(-8) + Math.floor(Math.random() * 1000);
        const record        = { account_number: accountNumber, balance: 0.00, currency: 'USD', status: 'active' };

        if (currentUser.account_type === 'joint' && currentUser.joint_account_id) {
            record.joint_account_id = currentUser.joint_account_id;
        } else {
            record.user_id = currentUser.id;
        }

        const { data, error } = await db.from('accounts').insert([record]).select().single();
        if (error) { console.error('createUserAccount error:', error); return null; }

        const el = document.getElementById('balance');
        if (el) el.textContent = formatCurrency(0);
        return data;
    } catch (err) {
        console.error('createUserAccount error:', err);
        return null;
    }
}

// ============================================
// PENDING ACTIONS
// ============================================

async function loadPendingActions() {
    try {
        const pendingItems = [];

        if (currentUser.account_type === 'individual') {
            await loadIndividualPendingItems(pendingItems);
        } else if (currentUser.account_type === 'joint' && currentUser.joint_account_id) {
            await loadJointPendingActions(pendingItems);
        }

        const countEl = document.getElementById('pendingCount');
        if (countEl) countEl.textContent = pendingItems.length;
        renderPendingList(pendingItems);
    } catch (err) {
        console.error('loadPendingActions error:', err);
    }
}

async function loadIndividualPendingItems(pendingItems) {
    const tables = [
        { table: 'card_applications', type: 'card',       title: 'Card Application', icon: 'fa-credit-card',
          desc: r => `${r.card_type} ${r.card_network} Card` },
        { table: 'loan_applications', type: 'loan',       title: 'Loan Application', icon: 'fa-hand-holding-usd',
          desc: r => `${formatCurrency(r.amount)} — ${r.purpose}` },
        { table: 'investments',       type: 'investment', title: 'Investment Goal',  icon: 'fa-chart-line',
          desc: r => r.goal_name }
    ];

    for (const t of tables) {
        const { data, error } = await db.from(t.table).select('*')
            .eq('user_id', currentUser.id).eq('status', 'pending');
        if (!error && data?.length) {
            pendingItems.push(...data.map(row => ({
                id: row.id, action_type: t.type, title: t.title,
                description: t.desc(row), status: 'pending',
                created_at: row.created_at, icon: t.icon
            })));
        }
    }
}

async function loadJointPendingActions(pendingItems) {
    const { data: actions, error } = await db
        .from('pending_actions')
        .select('*, initiated_by_user:initiated_by_user_id(first_name, last_name, email)')
        .eq('joint_account_id', currentUser.joint_account_id)
        .eq('status', 'pending');

    if (error) { console.error('loadJointPendingActions error:', error); return; }

    (actions || []).forEach(action => {
        const isInitiator = action.initiated_by_user_id === currentUser.id;
        const base = {
            id: action.id,
            action_type: action.action_type,
            title: getActionTitle(action.action_type),
            description: getActionDescription(action),
            action_data: action.action_data,
            created_at: action.initiated_at,
            icon: getActionIcon(action.action_type)
        };

        if (isInitiator) {
            pendingItems.push({
                ...base,
                status: 'waiting',
                message: 'Waiting for the other account holder to approve'
            });
        } else {
            pendingItems.push({
                ...base,
                status: 'needs_approval',
                message: `Initiated by ${action.initiated_by_user.first_name} ${action.initiated_by_user.last_name}`,
                pending_action_id: action.id
            });
        }
    });
}

function renderPendingList(items) {
    const container = document.getElementById('pendingList');
    if (!container) return;

    if (!items.length) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-check-circle"></i><p>No pending actions</p></div>';
        return;
    }

    items.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    container.innerHTML = items.map(item => {
        if (item.status === 'pending') {
            return `
                <div class="pending-item">
                    <div style="display:flex;align-items:center;gap:12px;">
                        <div class="stat-icon" style="width:40px;height:40px;font-size:1rem;">
                            <i class="fas ${item.icon || 'fa-clock'}"></i>
                        </div>
                        <div class="transaction-info">
                            <h4>${item.title}</h4>
                            <p class="transaction-meta">${item.description}</p>
                            <p class="transaction-meta" style="font-size:.75rem;">
                                Submitted ${new Date(item.created_at).toLocaleDateString()}
                            </p>
                        </div>
                    </div>
                    <span class="status-badge status-pending">Under Review</span>
                </div>`;
        }

        if (item.status === 'waiting') {
            return `
                <div class="pending-item">
                    <div style="display:flex;align-items:center;gap:12px;width:100%;">
                        <div class="stat-icon" style="width:40px;height:40px;font-size:1rem;background:var(--warning,#f59e0b);">
                            <i class="fas fa-hourglass-half"></i>
                        </div>
                        <div class="transaction-info" style="flex:1;">
                            <h4>${item.title}</h4>
                            <p class="transaction-meta">${item.description}</p>
                            <div class="alert alert-info" style="margin-top:8px;padding:6px 10px;font-size:.85rem;">
                                <i class="fas fa-hourglass-half"></i>
                                <span style="margin-left:6px;">${item.message}</span>
                            </div>
                        </div>
                    </div>
                </div>`;
        }

        if (item.status === 'needs_approval') {
            return `
                <div class="pending-item" style="flex-direction:column;align-items:stretch;">
                    <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
                        <div class="stat-icon" style="width:40px;height:40px;font-size:1rem;background:var(--accent-primary,#2563eb);">
                            <i class="fas ${item.icon || 'fa-bell'}"></i>
                        </div>
                        <div class="transaction-info">
                            <h4>${item.title} — Needs Your Approval</h4>
                            <p class="transaction-meta">${item.description}</p>
                            <p class="transaction-meta" style="color:var(--accent-primary);margin-top:4px;">
                                <i class="fas fa-user"></i> ${item.message}
                            </p>
                        </div>
                    </div>
                    <div style="display:flex;gap:8px;justify-content:flex-end;">
                        <button class="btn btn-success btn-small"
                            onclick="handleApproveAction('${item.pending_action_id}')">
                            <i class="fas fa-check"></i> Approve
                        </button>
                        <button class="btn btn-error btn-small"
                            onclick="handleDeclineAction('${item.pending_action_id}')">
                            <i class="fas fa-times"></i> Decline
                        </button>
                    </div>
                </div>`;
        }

        return `
            <div class="pending-item">
                <div><strong>${item.title}</strong>
                <p class="transaction-meta">${item.description}</p></div>
                <span class="status-badge status-pending">Pending</span>
            </div>`;
    }).join('');
}

// ============================================
// APPROVE / DECLINE JOINT ACTIONS
// ============================================

async function handleApproveAction(pendingActionId) {
    try {
        // Fetch the pending action first so we know the type
        const { data: pendingAction, error: fetchErr } = await db
            .from('pending_actions').select('*').eq('id', pendingActionId).single();
        if (fetchErr) throw fetchErr;

        // account_deletion requires recovery phrase from approving user
        if (pendingAction.action_type === 'account_deletion') {
            const phraseOk = await requestPhraseForDeletion();
            if (!phraseOk) return;
        } else {
            const confirmed = await requestPin('Enter your PIN to approve this action.');
            if (!confirmed) return;
        }

        await executeApprovedAction(pendingAction);

        // Mark pending action as approved
        await db.from('pending_actions').update({
            status: 'approved',
            approved_by_user_id: currentUser.id,
            completed_at: new Date().toISOString()
        }).eq('id', pendingActionId);

        showToast('Action approved successfully', 'success');
        await loadDashboardData();
    } catch (err) {
        console.error('handleApproveAction error:', err);
        showToast('Error approving action: ' + err.message, 'error');
    }
}

// Shows a phrase-grid modal for deletion approval, resolves true/false
async function requestPhraseForDeletion() {
    return new Promise(function (resolve) {
        // Build a temp modal body in the approvalPinModal
        var modal = document.getElementById('approvalPinModal');
        var body  = modal ? modal.querySelector('.modal-body') : null;
        if (!body) { resolve(false); return; }

        var origHtml  = body.innerHTML;
        var origTitle = modal.querySelector('h3') ? modal.querySelector('h3').textContent : '';

        if (modal.querySelector('h3')) modal.querySelector('h3').textContent = 'Confirm Account Deletion';

        body.innerHTML =
            '<div class="alert alert-warning" style="margin-bottom:16px;">'
            + '<i class="fas fa-exclamation-triangle"></i>'
            + '<span>You are approving <strong>permanent deletion</strong> of this joint account. Enter your 12-word recovery phrase to confirm.</span>'
            + '</div>'
            + '<div id="approvalPhraseGrid" class="phrase-grid" style="margin-bottom:16px;"></div>'
            + '<div style="display:flex;gap:10px;">'
            + '<button class="btn btn-outline" style="flex:1;" id="approvalPhraseCancel">Cancel</button>'
            + '<button class="btn btn-error" style="flex:1;" id="approvalPhraseConfirm">Confirm Deletion</button>'
            + '</div>';

        modal.classList.add('active');
        buildPhraseGrid('approvalPhraseGrid');

        document.getElementById('approvalPhraseCancel').onclick = function () {
            modal.classList.remove('active');
            body.innerHTML = origHtml;
            if (modal.querySelector('h3')) modal.querySelector('h3').textContent = origTitle;
            resolve(false);
        };

        document.getElementById('approvalPhraseConfirm').onclick = async function () {
            var words = getPhraseFromGrid('approvalPhraseGrid');
            if (words.some(function (w) { return !w; })) {
                showToast('Please fill in all 12 words', 'error');
                return;
            }
            var phrase     = words.join(' ');
            var phraseHash = await Auth.hashPassword(phrase);
            if (phraseHash !== currentUser.recovery_phrase_hash) {
                showToast('Recovery phrase is incorrect', 'error');
                return;
            }
            modal.classList.remove('active');
            body.innerHTML = origHtml;
            if (modal.querySelector('h3')) modal.querySelector('h3').textContent = origTitle;
            resolve(true);
        };
    });
}

async function handleDeclineAction(pendingActionId) {
    // Show decline reason modal
    const reason = await promptDeclineReason();
    if (reason === null) return; // user cancelled

    try {
        await db.from('pending_actions').update({
            status: 'rejected',
            rejected_by_user_id: currentUser.id,
            rejection_reason: reason || null,
            completed_at: new Date().toISOString()
        }).eq('id', pendingActionId);

        // Also reject any linked pending transaction
        await db.from('transactions')
            .update({
                status: 'rejected',
                failed_at: new Date().toISOString(),
                failure_reason: reason || 'Declined by co-account holder'
            })
            .eq('pending_action_id', pendingActionId)
            .eq('status', 'pending');

        showToast('Action declined', 'success');
        await loadDashboardData();
    } catch (err) {
        console.error('handleDeclineAction error:', err);
        showToast('Error declining action', 'error');
    }
}

function promptDeclineReason() {
    return new Promise((resolve) => {
        let modal = document.getElementById('declineReasonModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'declineReasonModal';
            modal.className = 'modal-overlay';
            modal.innerHTML = `
                <div class="modal" style="max-width:400px;">
                    <div class="modal-header">
                        <h3>Decline Action</h3>
                        <button class="modal-close" id="declineModalClose">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <label class="form-label">Reason for declining (optional)</label>
                            <textarea id="declineReasonInput" class="form-input" rows="3"
                                placeholder="Enter reason..."></textarea>
                        </div>
                        <button class="btn btn-error btn-block" id="declineConfirmBtn">
                            Decline Action
                        </button>
                    </div>
                </div>`;
            document.body.appendChild(modal);
        }

        const input    = document.getElementById('declineReasonInput');
        const confirmBtn = document.getElementById('declineConfirmBtn');
        const closeBtn   = document.getElementById('declineModalClose');

        input.value = '';
        modal.classList.add('active');

        const cleanup = () => {
            modal.classList.remove('active');
            confirmBtn.replaceWith(confirmBtn.cloneNode(true));
            closeBtn.replaceWith(closeBtn.cloneNode(true));
        };

        document.getElementById('declineConfirmBtn').addEventListener('click', () => {
            const reason = document.getElementById('declineReasonInput').value.trim();
            cleanup();
            resolve(reason);
        });

        document.getElementById('declineModalClose').addEventListener('click', () => {
            cleanup();
            resolve(null);
        });
    });
}

async function executeApprovedAction(pendingAction) {
    const { action_type, action_data } = pendingAction;

    switch (action_type) {
        case 'transaction': {
            let toUserId = null;
            if (action_data.recipient) {
                const { data: recipUser } = await db.from('users').select('id')
                    .eq('email', action_data.recipient).maybeSingle();
                toUserId = recipUser?.id || null;
            }

            // Deduct from joint account balance
            const { data: account } = await db.from('accounts').select('balance')
                .eq('joint_account_id', currentUser.joint_account_id).maybeSingle();

            if (account) {
                const newBalance = parseFloat(account.balance) - action_data.amount;
                if (newBalance < 0) throw new Error('Insufficient funds');
                await db.from('accounts')
                    .update({ balance: newBalance, updated_at: new Date().toISOString() })
                    .eq('joint_account_id', currentUser.joint_account_id);
            }

            // Credit recipient if they're in the system
            if (toUserId) {
                const { data: recipAcc } = await db.from('accounts').select('balance')
                    .eq('user_id', toUserId).maybeSingle();
                if (recipAcc) {
                    await db.from('accounts')
                        .update({ balance: parseFloat(recipAcc.balance) + action_data.amount })
                        .eq('user_id', toUserId);

                    await db.from('transactions').insert([{
                        user_id: toUserId,
                        transaction_type: 'receive',
                        amount: action_data.amount,
                        currency: 'USD',
                        total_amount: action_data.amount,
                        from_user_id: pendingAction.initiated_by_user_id,
                        to_user_id: toUserId,
                        to_email: action_data.recipient,
                        description: action_data.description || 'Transfer received',
                        status: 'completed',
                        requires_approval: false,
                        completed_at: new Date().toISOString()
                    }]);
                }
            }

            // Record the send transaction
            const { error: txErr } = await db.from('transactions').insert([{
                joint_account_id: currentUser.joint_account_id,
                pending_action_id: pendingAction.id,
                initiated_by_user_id: pendingAction.initiated_by_user_id,
                approved_by_user_id: currentUser.id,
                transaction_type: 'send',
                amount: action_data.amount,
                currency: 'USD',
                total_amount: action_data.amount,
                from_user_id: pendingAction.initiated_by_user_id,
                to_user_id: toUserId,
                from_email: action_data.senderEmail,
                to_email: action_data.recipient,
                description: action_data.description || 'Joint account transfer',
                status: 'completed',
                requires_approval: false,
                completed_at: new Date().toISOString()
            }]);
            if (txErr) throw txErr;
            break;
        }

        case 'card_application': {
            // Both joint users have now approved — generate the card
            var jShipping = action_data.shipping;
            var jShipAddr = jShipping
                ? jShipping.addr1 + (jShipping.addr2 ? ', ' + jShipping.addr2 : '')
                  + ', ' + jShipping.city + ', ' + jShipping.state
                  + ' ' + jShipping.zip + ', ' + jShipping.country
                : null;

            // Generate card credentials now that both parties have approved
            var jCardNum    = generateCardNumber();
            var jExpiry     = generateExpiry();
            // Get the initiating user name for holder
            var { data: initiator } = await db.from('users')
                .select('first_name,last_name')
                .eq('id', pendingAction.initiated_by_user_id)
                .single();
            var jHolder = initiator
                ? ((initiator.first_name || '') + ' ' + (initiator.last_name || '')).trim().toUpperCase()
                : 'CARDHOLDER';

            var { error: jcaErr } = await db.from('card_applications').insert([{
                joint_account_id:     currentUser.joint_account_id,
                pending_action_id:    pendingAction.id,
                application_reference: 'CARD-' + Date.now().toString(36).toUpperCase(),
                card_type:            action_data.card_type || action_data.delivery_type || 'digital',
                card_network:         action_data.card_network,
                wallet_type:          action_data.wallet_type || 'usd',
                crypto_coin:          action_data.crypto_coin || null,
                delivery_type:        action_data.delivery_type || 'digital',
                shipping_name:        jShipping ? jShipping.name : null,
                shipping_address:     jShipAddr,
                card_number:          jCardNum,
                card_expiry:          jExpiry,
                card_holder:          jHolder,
                status:               'pending',
                initiated_by_user_id: pendingAction.initiated_by_user_id,
                approved_by_user_id:  currentUser.id
            }]);
            if (jcaErr) throw jcaErr;

            // Deduct card fee from joint account balance
            var cardFee = action_data.fee || (action_data.delivery_type === 'physical' ? 300 : 100);
            var feeAcctRes = await db.from('accounts').select('id,balance')
                .eq('joint_account_id', currentUser.joint_account_id).limit(1);
            var feeAcct = feeAcctRes.data && feeAcctRes.data[0] ? feeAcctRes.data[0] : null;
            if (feeAcct) {
                await db.from('accounts')
                    .update({ balance: parseFloat(feeAcct.balance) - cardFee, updated_at: new Date().toISOString() })
                    .eq('id', feeAcct.id);
            }

            // Transaction history — visible to both joint account holders
            var jTxDesc = (action_data.delivery_type === 'physical' ? 'Physical' : 'Digital')
                + ' ' + (action_data.card_network || '').charAt(0).toUpperCase()
                + (action_data.card_network || '').slice(1)
                + ' card application fee ('
                + (action_data.wallet_type === 'crypto' ? (action_data.crypto_coin || 'crypto').toUpperCase() : 'USD')
                + ')';
            await db.from('transactions').insert([{
                joint_account_id:    currentUser.joint_account_id,
                user_id:             pendingAction.initiated_by_user_id,
                pending_action_id:   pendingAction.id,
                transaction_type:    'card_payment',
                amount:              cardFee,
                currency:            'USD',
                total_amount:        cardFee,
                fee:                 cardFee,
                from_user_id:        pendingAction.initiated_by_user_id,
                approved_by_user_id: currentUser.id,
                description:         jTxDesc,
                status:              'processing',
                requires_approval:   false
            }]);
            break;
        }

        case 'loan_application': {
            // Delegated to loan.js — handles full insert + transaction record
            if (typeof window.executeLoanApproval === 'function') {
                await window.executeLoanApproval(pendingAction);
            }
            break;
        }

        case 'investment_goal': {
            if (typeof window.executeInvestmentApproval === 'function') {
                await window.executeInvestmentApproval(pendingAction);
            }
            break;
        }

        case 'account_deletion': {
            await executeJointAccountDeletion(pendingAction);
            return;
        }

        case 'card_cancellation': {
            if (typeof window.executeCancelCard === 'function') {
                await window.executeCancelCard(action_data.card_id);
            }
            break;
        }

        case 'notification_delete': {
            if (typeof window.executeDeleteNotification === 'function') {
                await window.executeDeleteNotification(action_data.notification_id);
            }
            break;
        }

        case 'notification_clear_all': {
            if (typeof window.executeClearAllNotifications === 'function') {
                await window.executeClearAllNotifications();
            }
            break;
        }

        case 'crypto_send': {
            const coin         = action_data.coin;
            const amount       = action_data.amount;
            const balanceField = coin === 'btc' ? 'btc_balance' : 'ltc_balance';

            // Fetch current balance
            const { data: accts } = await db.from('accounts')
                .select(`id,${balanceField}`)
                .eq('joint_account_id', currentUser.joint_account_id)
                .limit(1);

            const acct      = accts?.[0];
            const curBalance = parseFloat(acct?.[balanceField] || 0);

            if (amount > curBalance) throw new Error(`Insufficient ${coin.toUpperCase()} balance`);

            await db.from('accounts')
                .update({ [balanceField]: curBalance - amount })
                .eq('joint_account_id', currentUser.joint_account_id);

            await db.from('transactions').insert([{
                joint_account_id:      currentUser.joint_account_id,
                pending_action_id:     pendingAction.id,
                initiated_by_user_id:  pendingAction.initiated_by_user_id,
                approved_by_user_id:   currentUser.id,
                transaction_type:      'crypto_send',
                amount:                0,
                currency:              'USD',
                total_amount:          0,
                from_user_id:          pendingAction.initiated_by_user_id,
                from_email:            action_data.senderEmail,
                crypto_coin:           coin,
                crypto_amount:         amount,
                crypto_address:        action_data.address,
                description:           action_data.description || `${coin.toUpperCase()} send`,
                status:                'completed',
                requires_approval:     false,
                completed_at:          new Date().toISOString()
            }]);
            break;
        }
    }
}

// ============================================
// JOINT: CREATE PENDING ACTION AFTER PIN VERIFIED
// ============================================

async function createPendingAction(actionType, actionData) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const { data, error } = await db.from('pending_actions').insert([{
        joint_account_id: currentUser.joint_account_id,
        initiated_by_user_id: currentUser.id,
        action_type: actionType,
        action_data: actionData,
        expires_at: expiresAt.toISOString()
    }]).select().single();

    if (error) {
        console.error('createPendingAction error:', error);
        showToast('Error creating pending action', 'error');
        return null;
    }
    return data;
}

// ============================================
// RECENT TRANSACTIONS
// ============================================

async function loadRecentTransactions() {
    try {
        const { data, error } = await db
            .from('transactions')
            .select('*')
            .or(`from_user_id.eq.${currentUser.id},to_user_id.eq.${currentUser.id},user_id.eq.${currentUser.id},initiated_by_user_id.eq.${currentUser.id},approved_by_user_id.eq.${currentUser.id}${currentUser.joint_account_id ? ',joint_account_id.eq.' + currentUser.joint_account_id : ''}`)
            .order('created_at', { ascending: false })
            .limit(10);

        const container = document.getElementById('recentTransactions');
        if (!container) return;

        if (error || !data?.length) {
            container.innerHTML = '<div class="empty-state"><i class="fas fa-exchange-alt"></i><p>No transactions yet</p></div>';
            return;
        }

        container.innerHTML = data.map(t => {
            const isSender     = t.from_user_id === currentUser.id || t.transaction_type === 'send';
            const counterparty = isSender ? (t.to_email || 'External') : (t.from_email || 'External');
            const label        = t.description || (t.transaction_type?.replace(/_/g, ' ')) || 'Transfer';
            return `
            <div class="transaction-item">
                <div class="transaction-info">
                    <h4>${label}</h4>
                    <p class="transaction-meta">${counterparty}</p>
                    <p class="transaction-meta" style="font-size:.75rem;">${new Date(t.created_at).toLocaleDateString()}</p>
                </div>
                <div class="transaction-amount">
                    <div class="${isSender ? 'amount-sent' : 'amount-received'}">
                        ${isSender ? '-' : '+'}${formatCurrency(t.amount)}
                    </div>
                    <span class="status-badge status-${t.status}">${t.status}</span>
                </div>
            </div>`;
        }).join('');
    } catch (err) {
        console.error('loadRecentTransactions error:', err);
    }
}

// ============================================
// CARDS / LOANS / INVESTMENTS
// ============================================

// loadCards() — delegated to cards.js
async function loadCards() {
    if (typeof window._loadCards === 'function') {
        await window._loadCards();
    }
}

// loadLoans() — delegated to loan.js
async function loadLoans() {
    if (typeof window._loadLoans === 'function') {
        await window._loadLoans();
    }
}

// loadInvestments() — delegated to investment.js
async function loadInvestments() {
    if (typeof window._loadInvestments === 'function') {
        await window._loadInvestments();
    }
}

// ============================================
// FORM HANDLERS — all require PIN first
// Personal: PIN → execute immediately
// Joint: PIN → create pending_action → wait for User B
// ============================================

async function handleSendSubmit(e) {
    e.preventDefault();

    const amount      = parseFloat(document.getElementById('sendAmount').value);
    const recipient   = document.getElementById('recipientEmail').value.trim();
    const description = document.getElementById('sendDesc').value.trim();

    if (!amount || amount <= 0) { showToast('Enter a valid amount', 'error'); return; }
    if (!recipient)             { showToast('Enter recipient email', 'error'); return; }

    // Require PIN from initiating user
    const confirmed = await requestPin('Enter your PIN to send money.');
    if (!confirmed) return;

    try {
        if (currentUser.account_type === 'joint' && currentUser.joint_account_id) {
            // Joint: create pending action, User B must approve
            const actionData = { amount, recipient, description, senderEmail: currentUser.email };
            const pending = await createPendingAction('transaction', actionData);
            if (pending) {
                showToast('Transfer initiated — waiting for co-owner to approve', 'success');
                hideModal('sendModal');
                document.getElementById('sendForm').reset();
                await loadDashboardData();
            }
        } else {
            // Personal: execute immediately
            const { data: account, error: accErr } = await db
                .from('accounts').select('*').eq('user_id', currentUser.id).single();

            if (accErr || !account) { showToast('Account not found', 'error'); return; }
            if (parseFloat(account.balance) < amount) { showToast('Insufficient funds', 'error'); return; }

            await db.from('accounts').update({
                balance: parseFloat(account.balance) - amount,
                updated_at: new Date().toISOString()
            }).eq('user_id', currentUser.id);

            // Credit recipient if internal
            try {
                const { data: recipUser } = await db.from('users').select('id')
                    .eq('email', recipient).maybeSingle();
                if (recipUser) {
                    const { data: recipAcc } = await db.from('accounts').select('balance')
                        .eq('user_id', recipUser.id).maybeSingle();
                    if (recipAcc) {
                        await db.from('accounts').update({
                            balance: parseFloat(recipAcc.balance) + amount,
                            updated_at: new Date().toISOString()
                        }).eq('user_id', recipUser.id);

                        await db.from('transactions').insert([{
                            user_id: recipUser.id,
                            transaction_type: 'receive',
                            amount, currency: 'USD', total_amount: amount,
                            from_user_id: currentUser.id, to_user_id: recipUser.id,
                            from_email: currentUser.email, to_email: recipient,
                            description: description || 'Transfer received',
                            status: 'completed', requires_approval: false,
                            completed_at: new Date().toISOString()
                        }]);
                    }
                }
            } catch (recipErr) {
                console.warn('Recipient credit failed (may be external):', recipErr);
            }

            const { error: txErr } = await db.from('transactions').insert([{
                user_id: currentUser.id,
                transaction_type: 'send',
                amount, currency: 'USD', total_amount: amount,
                from_user_id: currentUser.id,
                from_email: currentUser.email, to_email: recipient,
                description: description || 'Transfer',
                status: 'completed', requires_approval: false,
                completed_at: new Date().toISOString()
            }]);
            if (txErr) throw txErr;

            showToast('Transfer completed', 'success');
            hideModal('sendModal');
            document.getElementById('sendForm').reset();
            await loadDashboardData();
        }
    } catch (err) {
        console.error('handleSendSubmit error:', err);
        showToast('Error: ' + err.message, 'error');
    }
}

async function handleRequestSubmit(e) {
    e.preventDefault();

    const amount    = parseFloat(document.getElementById('requestAmount').value);
    const fromEmail = document.getElementById('requestFrom').value.trim();
    const desc      = document.getElementById('requestDesc').value.trim();

    if (!amount || amount <= 0) { showToast('Enter a valid amount', 'error'); return; }
    if (!fromEmail)             { showToast('Enter the email to request from', 'error'); return; }

    try {
        const { error } = await db.from('money_requests').insert([{
            user_id: currentUser.id, amount,
            requester_email: fromEmail,
            description: desc || 'Payment request',
            status: 'pending'
        }]);
        if (error) throw error;
        showToast(`Request for ${formatCurrency(amount)} sent to ${fromEmail}`, 'success');
        hideModal('requestModal');
        document.getElementById('requestForm').reset();
    } catch (err) {
        showToast('Error: ' + err.message, 'error');
    }
}

// ============================================

// handleLoanSubmit removed — loan flow now handled by loan.js

// handleInvestmentSubmit — moved to investment.js

// ============================================
// HELPERS
// ============================================

function getActionTitle(type) {
    return {
        transaction:             'Transfer',
        card_application:        'Card Application',
        card_cancellation:       'Card Cancellation',
        loan_application:        'Loan Application',
        investment_goal:         'Investment',
        account_deletion:        'Account Deletion Request',
        notification_delete:     'Delete Notification',
        notification_clear_all:  'Clear All Notifications'
    }[type] || 'Action';
}

function getActionDescription(action) {
    const d = action.action_data;
    switch (action.action_type) {
        case 'transaction':        return `${formatCurrency(d.amount)} to ${d.recipient}`;
        case 'card_application':   return (d.delivery_type === 'physical' ? 'Physical' : 'Digital') + ' ' + (d.card_network || '') + ' card (' + (d.wallet_type === 'crypto' ? (d.crypto_coin || 'crypto').toUpperCase() : 'USD') + ')';
        case 'card_cancellation':       return 'Cancel card — requires co-holder approval';
        case 'notification_delete':     return 'Delete a notification';
        case 'notification_clear_all':  return 'Clear all notifications';
        case 'loan_application':        return `${formatCurrency(d.amount)} — ${d.purpose}`;
        case 'investment_goal':         return (d.plan ? d.plan.charAt(0).toUpperCase() + d.plan.slice(1) + ' plan — ' : '') + (d.goal_name || '') + ' (' + formatCurrency(d.amount) + ')';
        case 'account_deletion':        return 'Requested by account holder — approve to permanently close account';
        default:                        return 'Pending approval';
    }
}

function getActionIcon(type) {
    return {
        transaction:            'fa-exchange-alt',
        card_application:       'fa-credit-card',
        card_cancellation:      'fa-ban',
        notification_delete:    'fa-bell-slash',
        notification_clear_all: 'fa-trash',
        loan_application:       'fa-hand-holding-usd',
        investment_goal:        'fa-chart-line',
        account_deletion:       'fa-trash-alt'
    }[type] || 'fa-clock';
}

// ============================================
// UI UTILITIES
// ============================================

function showSection(section) {
    ['overview','transactions','cards','loans','investments','settings'].forEach(s => {
        const el = document.getElementById(s + 'Section');
        if (el) el.style.display = s === section ? 'block' : 'none';
    });
    document.querySelectorAll('.sidebar-link, .mobile-menu-item').forEach(l => l.classList.remove('active'));
    const target = event?.target?.closest('.sidebar-link, .mobile-menu-item');
    if (target) target.classList.add('active');

    if (section === 'settings') initSettingsSection();
}

function showSendModal()        { document.getElementById('sendModal')?.classList.add('active'); }
function showRequestModal()     { document.getElementById('requestModal')?.classList.add('active'); }
// showCardModal replaced by initCardModal — see card application flow above
function showLoanModal()        { document.getElementById('loanModal')?.classList.add('active'); }
// showInvestmentModal — moved to investment.js

function hideModal(modalId) {
    document.getElementById(modalId)?.classList.remove('active');
}

// updateROI — moved to investment.js

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.className   = `toast-notification toast-${type}`;
    toast.style.display = 'block';
    setTimeout(() => { toast.style.display = 'none'; }, 3500);
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);
}

function toggleTheme() {
    const html = document.documentElement;
    const next = html.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    html.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    const icon = document.querySelector('#themeToggle i');
    if (icon) icon.className = next === 'light' ? 'fas fa-moon' : 'fas fa-sun';
}

// Language switching handled by /js/components/languageSwitcher.js

// Apply saved theme immediately
const savedTheme = localStorage.getItem('theme') || 'light';
document.documentElement.setAttribute('data-theme', savedTheme);

// ============================================
// SETTINGS
// ============================================

const SETTINGS_CLOUDINARY = {
    cloudName:    'dmbgczlom',
    uploadPreset: 'summit-trust-uploads'
};

function initSettingsSection() {
    // Populate current avatar
    const preview = document.getElementById('settingsAvatarPreview');
    if (preview) {
        if (currentUser.profile_picture_url) {
            preview.innerHTML = `<img src="${currentUser.profile_picture_url}"
                style="width:100%;height:100%;object-fit:cover;">`;
        } else {
            const initials = `${currentUser.first_name?.[0]||''}${currentUser.last_name?.[0]||''}`.toUpperCase();
            preview.innerHTML = `<span style="font-size:1.4rem;font-weight:700;
                color:var(--accent-primary)">${initials}</span>`;
        }
    }

    // Update delete account description for joint accounts
    const desc = document.getElementById('deleteAccountDesc');
    if (desc && currentUser.account_type === 'joint') {
        desc.textContent = 'Permanently delete this joint account. Both account holders must approve. ' +
            'Your co-holder will see this as a pending request and must confirm with their PIN.';
    }

    // Bind file input
    const fi = document.getElementById('settingsPicFile');
    if (fi && !fi.dataset.bound) {
        fi.dataset.bound = '1';
        fi.addEventListener('change', (e) => {
            if (e.target.files.length) handleSettingsPicFile(e.target.files[0]);
        });
    }

    // Pre-fill email
    const newEmailEl = document.getElementById('newEmail');
    if (newEmailEl && !newEmailEl.value) newEmailEl.value = currentUser.email || '';
}

// ── PROFILE PICTURE ──────────────────────────

window.triggerSettingsUpload = function() {
    document.getElementById('settingsPicFile')?.click();
};

function handleSettingsPicFile(file) {
    if (!['image/jpeg','image/jpg','image/png'].includes(file.type)) {
        showToast('Please upload a JPG or PNG', 'error'); return;
    }
    if (file.size > 2097152) {
        showToast('Image must be under 2MB', 'error'); return;
    }

    const textEl = document.getElementById('settingsPicText');
    if (textEl) textEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading…';

    // Show local preview immediately
    const reader = new FileReader();
    reader.onload = (e) => {
        const preview = document.getElementById('settingsAvatarPreview');
        if (preview) preview.innerHTML = `<img src="${e.target.result}"
            style="width:100%;height:100%;object-fit:cover;">`;
    };
    reader.readAsDataURL(file);

    // Upload to Cloudinary
    const fd = new FormData();
    fd.append('file', file);
    fd.append('upload_preset', SETTINGS_CLOUDINARY.uploadPreset);
    fd.append('cloud_name',    SETTINGS_CLOUDINARY.cloudName);

    const xhr = new XMLHttpRequest();
    xhr.onload = () => {
        if (xhr.status === 200) {
            const url = JSON.parse(xhr.responseText).secure_url;
            document.getElementById('settingsPicUrl').value = url;
            if (textEl) textEl.innerHTML = '<i class="fas fa-check-circle" style="color:var(--success)"></i> Ready to save';
        } else {
            showToast('Upload failed', 'error');
            if (textEl) textEl.textContent = 'Click to try again';
        }
    };
    xhr.onerror = () => {
        showToast('Network error during upload', 'error');
        if (textEl) textEl.textContent = 'Click to try again';
    };
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${SETTINGS_CLOUDINARY.cloudName}/auto/upload`);
    xhr.send(fd);
}

window.saveProfilePicture = async function() {
    const url = document.getElementById('settingsPicUrl').value;
    if (!url) { showToast('Please upload a photo first', 'error'); return; }

    const btn = document.getElementById('saveProfilePicBtn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving…'; }

    const { error } = await db.from('users')
        .update({ profile_picture_url: url, updated_at: new Date().toISOString() })
        .eq('id', currentUser.id);

    if (error) {
        showToast('Failed to save: ' + error.message, 'error');
    } else {
        currentUser.profile_picture_url = url;
        // Update navbar avatar
        const avatarEl = document.getElementById('navAvatar');
        if (avatarEl) avatarEl.innerHTML = `<img src="${url}" alt="${currentUser.first_name}"
            style="width:28px;height:28px;border-radius:50%;object-fit:cover;display:block;">`;
        showToast('Profile picture updated', 'success');
        document.getElementById('settingsPicUrl').value = '';
    }

    if (btn) { btn.disabled = false; btn.innerHTML = 'Save Profile Picture'; }
};

// ── EMAIL ────────────────────────────────────

window.saveEmail = async function() {
    const newEmail  = document.getElementById('newEmail').value.trim().toLowerCase();
    const password  = document.getElementById('emailCurrentPassword').value;

    if (!newEmail || !newEmail.includes('@')) { showToast('Enter a valid email', 'error'); return; }
    if (!password)  { showToast('Enter your current password to confirm', 'error'); return; }
    if (newEmail === currentUser.email) { showToast('That is already your email', 'error'); return; }

    const btn = document.getElementById('saveEmailBtn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving…'; }

    // Verify password
    const passwordHash = await Auth.hashPassword(password);
    if (passwordHash !== currentUser.password_hash) {
        showToast('Incorrect password', 'error');
        if (btn) { btn.disabled = false; btn.innerHTML = 'Update Email'; }
        return;
    }

    // Check email not already taken
    const { data: existing } = await db.from('users').select('id').eq('email', newEmail).maybeSingle();
    if (existing) {
        showToast('That email is already in use', 'error');
        if (btn) { btn.disabled = false; btn.innerHTML = 'Update Email'; }
        return;
    }

    const { error } = await db.from('users')
        .update({ email: newEmail, updated_at: new Date().toISOString() })
        .eq('id', currentUser.id);

    if (error) {
        showToast('Failed to update email: ' + error.message, 'error');
    } else {
        currentUser.email = newEmail;
        const dropEmail = document.getElementById('dropUserEmail');
        if (dropEmail) dropEmail.textContent = newEmail;
        document.getElementById('emailCurrentPassword').value = '';
        showToast('Email updated successfully', 'success');
    }

    if (btn) { btn.disabled = false; btn.innerHTML = 'Update Email'; }
};

// ── PASSWORD ─────────────────────────────────

window.savePassword = async function() {
    const current  = document.getElementById('currentPassword').value;
    const newPw    = document.getElementById('settingsNewPassword').value;
    const confirm  = document.getElementById('settingsConfirmPassword').value;

    if (!current)          { showToast('Enter your current password', 'error'); return; }
    if (!newPw)            { showToast('Enter a new password', 'error'); return; }
    if (newPw.length < 8)  { showToast('Password must be at least 8 characters', 'error'); return; }
    if (newPw !== confirm)  { showToast('New passwords do not match', 'error'); return; }

    const btn = document.getElementById('savePasswordBtn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving…'; }

    const currentHash = await Auth.hashPassword(current);
    if (currentHash !== currentUser.password_hash) {
        showToast('Current password is incorrect', 'error');
        if (btn) { btn.disabled = false; btn.innerHTML = 'Update Password'; }
        return;
    }

    const newHash = await Auth.hashPassword(newPw);
    const { error } = await db.from('users')
        .update({ password_hash: newHash, updated_at: new Date().toISOString() })
        .eq('id', currentUser.id);

    if (error) {
        showToast('Failed to update password: ' + error.message, 'error');
    } else {
        currentUser.password_hash = newHash;
        document.getElementById('currentPassword').value        = '';
        document.getElementById('settingsNewPassword').value    = '';
        document.getElementById('settingsConfirmPassword').value = '';
        showToast('Password updated successfully', 'success');
    }

    if (btn) { btn.disabled = false; btn.innerHTML = 'Update Password'; }
};

// ── PHRASE GRID HELPER ───────────────────────

function buildPhraseGrid(containerId) {
    var container = document.getElementById(containerId);
    if (!container) return;
    var html = "";
    for (var i = 1; i <= 12; i++) {
        var nav = "phraseKeyNav(event," + JSON.stringify(containerId) + "," + i + ")";
        html += '<div class="phrase-cell">';
        html += '<span class="phrase-num">' + i + '</span>';
        html += '<input type="text" id="phrase_' + containerId + '_' + i + '" autocomplete="off" spellcheck="false" autocorrect="off" autocapitalize="off" placeholder="word" onkeydown="' + nav + '">';
        html += '</div>';
    }
    container.innerHTML = html;
    var first = document.getElementById("phrase_" + containerId + "_1");
    if (first) setTimeout(function () { first.focus(); }, 100);
}

function phraseKeyNav(e, gridId, idx) {
    if (e.key === ' ' || e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        var next = document.getElementById('phrase_' + gridId + '_' + (idx + 1));
        if (next) next.focus();
    }
}

function getPhraseFromGrid(containerId) {
    var words = [];
    for (var i = 1; i <= 12; i++) {
        var el = document.getElementById('phrase_' + containerId + '_' + i);
        words.push(el ? el.value.trim().toLowerCase() : '');
    }
    return words;
}

function phraseGridComplete(containerId) {
    var words = getPhraseFromGrid(containerId);
    return words.every(function (w) { return w.length > 0; });
}

// ── PIN RESET ────────────────────────────────

function initPinReset() {
    document.getElementById('pinResetTitle').textContent = 'Reset Transaction PIN';
    document.getElementById('pinResetModal').classList.add('active');
    document.getElementById('pinResetBody').innerHTML =
        '<p style="color:var(--text-secondary);font-size:.875rem;margin-bottom:20px;">How would you like to verify your identity?</p>'
        + '<div style="display:flex;gap:10px;margin-bottom:8px;">'
        + '<button class="btn btn-outline" style="flex:1;" onclick="showPinResetWithOld()"><i class="fas fa-lock"></i> Use Current PIN</button>'
        + '<button class="btn btn-outline" style="flex:1;" onclick="showPinResetWithPhrase()"><i class="fas fa-shield-alt"></i> Use Recovery Phrase</button>'
        + '</div>';
}

function showPinResetWithOld() {
    document.getElementById('pinResetTitle').textContent = 'Reset via Current PIN';
    document.getElementById('pinResetBody').innerHTML =
        '<div class="form-group"><label class="form-label">Current PIN</label>'
        + '<input type="password" id="oldPinInput" class="form-input pin-input" maxlength="4" inputmode="numeric" placeholder="••••" style="font-size:1.4rem;letter-spacing:.4rem;text-align:center;"></div>'
        + '<div class="form-group"><label class="form-label">New PIN</label>'
        + '<input type="password" id="newPinInput" class="form-input pin-input" maxlength="4" inputmode="numeric" placeholder="••••" style="font-size:1.4rem;letter-spacing:.4rem;text-align:center;"></div>'
        + '<div class="form-group"><label class="form-label">Confirm New PIN</label>'
        + '<input type="password" id="confirmPinInput" class="form-input pin-input" maxlength="4" inputmode="numeric" placeholder="••••" style="font-size:1.4rem;letter-spacing:.4rem;text-align:center;"></div>'
        + '<div style="display:flex;gap:10px;margin-top:8px;">'
        + '<button class="btn btn-outline" style="flex:1;" onclick="initPinReset()">Back</button>'
        + '<button class="btn btn-primary" style="flex:1;" id="pinResetConfirmBtn" onclick="confirmPinResetWithOld()">Reset PIN</button>'
        + '</div>';
}

async function confirmPinResetWithOld() {
    var oldPin  = (document.getElementById('oldPinInput')  || {}).value || '';
    var newPin  = (document.getElementById('newPinInput')  || {}).value || '';
    var confPin = (document.getElementById('confirmPinInput') || {}).value || '';

    if (!/^\d{4}$/.test(oldPin))  { showToast('Enter your current 4-digit PIN', 'error'); return; }
    if (!/^\d{4}$/.test(newPin))  { showToast('New PIN must be 4 digits', 'error'); return; }
    if (newPin !== confPin)        { showToast('New PINs do not match', 'error'); return; }

    var btn = document.getElementById('pinResetConfirmBtn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying...'; }

    var oldOk = await Auth.verifyPin(oldPin, currentUser.transaction_pin_hash);
    if (!oldOk) {
        showToast('Current PIN is incorrect', 'error');
        if (btn) { btn.disabled = false; btn.innerHTML = 'Reset PIN'; }
        return;
    }

    await savePinReset(newPin, btn);
}

function showPinResetWithPhrase() {
    document.getElementById('pinResetTitle').textContent = 'Reset via Recovery Phrase';
    document.getElementById('pinResetBody').innerHTML =
        '<p style="color:var(--text-secondary);font-size:.875rem;margin-bottom:12px;">Enter your 12-word recovery phrase.</p>'
        + '<div id="pinResetPhraseGrid" class="phrase-grid" style="margin-bottom:16px;"></div>'
        + '<div class="form-group"><label class="form-label">New PIN</label>'
        + '<input type="password" id="phraseNewPin" class="form-input pin-input" maxlength="4" inputmode="numeric" placeholder="••••" style="font-size:1.4rem;letter-spacing:.4rem;text-align:center;"></div>'
        + '<div class="form-group"><label class="form-label">Confirm New PIN</label>'
        + '<input type="password" id="phraseConfirmPin" class="form-input pin-input" maxlength="4" inputmode="numeric" placeholder="••••" style="font-size:1.4rem;letter-spacing:.4rem;text-align:center;"></div>'
        + '<div style="display:flex;gap:10px;margin-top:8px;">'
        + '<button class="btn btn-outline" style="flex:1;" onclick="initPinReset()">Back</button>'
        + '<button class="btn btn-primary" style="flex:1;" id="pinResetPhraseBtn" onclick="confirmPinResetWithPhrase()">Reset PIN</button>'
        + '</div>';
    buildPhraseGrid('pinResetPhraseGrid');
}

async function confirmPinResetWithPhrase() {
    var words   = getPhraseFromGrid('pinResetPhraseGrid');
    var newPin  = (document.getElementById('phraseNewPin')     || {}).value || '';
    var confPin = (document.getElementById('phraseConfirmPin') || {}).value || '';

    if (words.some(function (w) { return !w; })) { showToast('Please fill in all 12 words', 'error'); return; }
    if (!/^\d{4}$/.test(newPin)) { showToast('New PIN must be 4 digits', 'error'); return; }
    if (newPin !== confPin)       { showToast('New PINs do not match', 'error'); return; }

    var btn = document.getElementById('pinResetPhraseBtn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying...'; }

    var phrase     = words.join(' ');
    var phraseHash = await Auth.hashPassword(phrase);
    if (phraseHash !== currentUser.recovery_phrase_hash) {
        showToast('Recovery phrase is incorrect', 'error');
        if (btn) { btn.disabled = false; btn.innerHTML = 'Reset PIN'; }
        return;
    }

    await savePinReset(newPin, btn);
}

async function savePinReset(newPin, btn) {
    try {
        var newHash  = await Auth.hashPassword(newPin);
        var { error } = await db.from('users')
            .update({ transaction_pin_hash: newHash, updated_at: new Date().toISOString() })
            .eq('id', currentUser.id);
        if (error) throw error;
        currentUser.transaction_pin_hash = newHash;
        hideModal('pinResetModal');
        showToast('Transaction PIN updated successfully', 'success');
    } catch (err) {
        showToast('Error updating PIN: ' + err.message, 'error');
        if (btn) { btn.disabled = false; btn.innerHTML = 'Reset PIN'; }
    }
}

// ── CUSTOMER CARE ────────────────────────────

var TAWK_URL = 'https://tawk.to/chat/69bd820f1f2eee1c3a8ff028/1jk6483t0';

function openCustomerCare() {
    document.getElementById('tawkDirectLink').href = TAWK_URL;
    document.getElementById('customerCareModal').classList.add('active');
    // Also try to open Tawk.to widget if loaded
    if (typeof Tawk_API !== 'undefined' && Tawk_API.toggle) {
        Tawk_API.toggle();
    }
}

// ── DELETE ACCOUNT ────────────────────────────

window.initiateDeleteAccount = async function() {
    // 1. Check balance — cannot delete if funds remain
    var balQ = db.from('accounts').select('balance').eq('status','active').limit(1);
    if (currentUser.account_type === 'joint' && currentUser.joint_account_id) {
        balQ = balQ.eq('joint_account_id', currentUser.joint_account_id);
    } else {
        balQ = balQ.eq('user_id', currentUser.id);
    }
    var balRes = await balQ;
    var balance = parseFloat((balRes.data && balRes.data[0]) ? balRes.data[0].balance : 0) || 0;

    if (balance > 0) {
        showToast('You have ' + formatCurrency(balance) + ' remaining. Please withdraw all funds before deleting your account.', 'error');
        var desc = document.getElementById('deleteAccountDesc');
        if (desc) {
            desc.innerHTML = '<span style="color:var(--error)"><i class="fas fa-exclamation-circle"></i> You still have <strong>' + formatCurrency(balance) + '</strong>. Please withdraw all funds first.</span>';
        }
        return;
    }

    // 2. Open phrase-grid confirmation modal
    document.getElementById('deleteConfirmModal').classList.add('active');
    buildPhraseGrid('deletePhraseGrid');
};

window.confirmDeleteAccount = async function() {
    var words = getPhraseFromGrid('deletePhraseGrid');
    if (words.some(function (w) { return !w; })) {
        showToast('Please fill in all 12 recovery phrase words', 'error');
        return;
    }

    var btn = document.getElementById('confirmDeleteBtn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying...'; }

    var phrase     = words.join(' ');
    var phraseHash = await Auth.hashPassword(phrase);
    if (phraseHash !== currentUser.recovery_phrase_hash) {
        showToast('Recovery phrase is incorrect', 'error');
        if (btn) { btn.disabled = false; btn.innerHTML = 'Delete Forever'; }
        return;
    }

    if (currentUser.account_type === 'joint' && currentUser.joint_account_id) {
        await createJointDeletionRequest();
    } else {
        await executeAccountDeletion();
    }

    if (btn) { btn.disabled = false; btn.innerHTML = 'Delete Forever'; }
};

async function createJointDeletionRequest() {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const { error } = await db.from('pending_actions').insert([{
        joint_account_id:      currentUser.joint_account_id,
        initiated_by_user_id:  currentUser.id,
        action_type:           'account_deletion',
        action_data:           { requested_by: currentUser.id, requested_at: new Date().toISOString() },
        expires_at:            expiresAt.toISOString()
    }]);

    if (error) {
        // If account_deletion isn't in CHECK constraint, show migration needed
        if (error.code === '23514') {
            showToast('Database needs updating — run the settings migration SQL first', 'error');
        } else {
            showToast('Error creating deletion request: ' + error.message, 'error');
        }
        hideModal('deleteConfirmModal');
        return;
    }

    hideModal('deleteConfirmModal');
    document.getElementById('deletePendingModal').classList.add('active');
    await loadDashboardData(); // refresh pending actions list
}

async function executeAccountDeletion() {
    try {
        const userId = currentUser.id;

        // Delete in order: sessions → transactions → accounts → user
        await db.from('sessions').delete().eq('user_id', userId);
        await db.from('transactions').delete().or(`from_user_id.eq.${userId},to_user_id.eq.${userId},user_id.eq.${userId}`);
        await db.from('accounts').delete().eq('user_id', userId);
        await db.from('users').delete().eq('id', userId);

        localStorage.removeItem('Summit Trust_session');
        window.location.href = '/auth.html';
    } catch (err) {
        console.error('executeAccountDeletion error:', err);
        showToast('Error deleting account: ' + err.message, 'error');
    }
}

// Called from handleApproveAction when action_type === 'account_deletion'
async function executeJointAccountDeletion(pendingAction) {
    try {
        const jointId = currentUser.joint_account_id;

        // Get both user IDs
        const { data: jointAccount } = await db
            .from('joint_accounts').select('primary_user_id, secondary_user_id').eq('id', jointId).single();

        const userIds = [jointAccount.primary_user_id, jointAccount.secondary_user_id].filter(Boolean);

        // Delete everything
        for (const uid of userIds) {
            await db.from('sessions').delete().eq('user_id', uid);
            await db.from('transactions').delete()
                .or(`from_user_id.eq.${uid},to_user_id.eq.${uid},user_id.eq.${uid}`);
        }
        await db.from('transactions').delete().eq('joint_account_id', jointId);
        await db.from('pending_actions').delete().eq('joint_account_id', jointId);
        await db.from('accounts').delete().eq('joint_account_id', jointId);
        for (const uid of userIds) {
            await db.from('users').delete().eq('id', uid);
        }
        await db.from('joint_accounts').delete().eq('id', jointId);

        localStorage.removeItem('Summit Trust_session');
        window.location.href = '/auth.html';
    } catch (err) {
        console.error('executeJointAccountDeletion error:', err);
        showToast('Error deleting joint account: ' + err.message, 'error');
        throw err;
    }
}

// ── EXPOSE SETTINGS HELPERS ───────────────────
window.initPinReset           = initPinReset;
window.showPinResetWithOld    = showPinResetWithOld;
window.showPinResetWithPhrase = showPinResetWithPhrase;
window.confirmPinResetWithOld = confirmPinResetWithOld;
window.confirmPinResetWithPhrase = confirmPinResetWithPhrase;
window.openCustomerCare       = openCustomerCare;
window.buildPhraseGrid        = buildPhraseGrid;
window.getPhraseFromGrid      = getPhraseFromGrid;
window.phraseKeyNav           = phraseKeyNav;