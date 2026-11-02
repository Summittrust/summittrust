// ============================================
// DASHBOARD
// ============================================

const db = window.db;
let currentUser = null;
let currentSession = null;

// ============================================
// BALANCE VISIBILITY CONTROLLER (Eye Toggle)
// ============================================
try {
    window.isBalanceHidden = localStorage.getItem('rcb_balance_hidden') === 'true';
} catch(e) {
    window.isBalanceHidden = false;
}

window.updateBalanceText = function(formatted) {
    window._lastFormattedBalance = formatted;
    const bEl = document.getElementById('balance');
    if (bEl) {
        bEl.setAttribute('data-actual-balance', formatted);
        if (window.isBalanceHidden) {
            bEl.textContent = '••••••••';
            bEl.classList.add('balance-masked');
        } else {
            bEl.textContent = formatted;
            bEl.classList.remove('balance-masked');
        }
    }
};

window.toggleBalanceVisibility = function(e) {
    if (e && e.preventDefault) e.preventDefault();
    window.isBalanceHidden = !window.isBalanceHidden;
    try {
        localStorage.setItem('rcb_balance_hidden', window.isBalanceHidden ? 'true' : 'false');
    } catch(err) {}

    const eyeIcon = document.getElementById('balanceEyeIcon');
    if (eyeIcon) {
        eyeIcon.className = window.isBalanceHidden ? 'fas fa-eye-slash' : 'fas fa-eye';
    }
    const btn = document.getElementById('toggleBalanceVisibilityBtn');
    if (btn) {
        btn.setAttribute('title', window.isBalanceHidden ? 'Reveal balance' : 'Hide balance');
    }

    const bEl = document.getElementById('balance');
    if (bEl) {
        if (window.isBalanceHidden) {
            bEl.textContent = '••••••••';
            bEl.classList.add('balance-masked');
        } else {
            const actual = window._lastFormattedBalance || bEl.getAttribute('data-actual-balance') || '--';
            bEl.textContent = actual;
            bEl.classList.remove('balance-masked');
        }
    }
};

window.initBalanceVisibility = function() {
    const eyeIcon = document.getElementById('balanceEyeIcon');
    const btn = document.getElementById('toggleBalanceVisibilityBtn');
    if (eyeIcon) {
        eyeIcon.className = window.isBalanceHidden ? 'fas fa-eye-slash' : 'fas fa-eye';
    }
    if (btn) {
        btn.setAttribute('title', window.isBalanceHidden ? 'Reveal balance' : 'Hide balance');
    }
    const bEl = document.getElementById('balance');
    if (bEl && window.isBalanceHidden) {
        if (bEl.textContent && bEl.textContent !== '--') {
            bEl.setAttribute('data-actual-balance', bEl.textContent);
            window._lastFormattedBalance = bEl.textContent;
            bEl.textContent = '••••••••';
            bEl.classList.add('balance-masked');
        }
    }
};

document.addEventListener('DOMContentLoaded', async () => {
    window.initBalanceVisibility();
    if (typeof initTawkVisibilityManager === 'function') initTawkVisibilityManager();
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
            window.location.href = '/auth';
            return;
        }

        currentUser = currentSession.users;
        window.currentUser = currentUser;

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

        // Initialize user currency & zero placeholders immediately to avoid $ default
        const initialCurrency = getCurrencyFromCountry(currentUser ? currentUser.country : null);
        window.currentAccountCurrency = initialCurrency;
        const initialZero = formatCurrency(0, initialCurrency, true);
        window.updateBalanceText(initialZero);
        const gEl = document.getElementById('gasBalance');
        if (gEl) gEl.textContent = initialZero;
        const invEl = document.getElementById('investmentsTotal');
        if (invEl) invEl.textContent = initialZero;

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
        setupVisibleCurrencies();
        initCurrencyConverter();

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
    setupVisibleCurrencies();
}

async function loadBalance() {
    try {
        let query = db.from('accounts')
            .select('id, balance, account_number, status, currency')
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

        let account = data?.[0];
        if (account) {
            const userCurrency = getCurrencyFromCountry(currentUser ? currentUser.country : null);
            if (account.currency !== userCurrency) {
                await db.from('accounts').update({ currency: userCurrency }).eq('id', account.id);
                account.currency = userCurrency;
            }
            window.currentAccountCurrency = account.currency || userCurrency || 'USD';
            
            // Safely retrieve gas_balance if present in DB schema
            let gasBalance = 0;
            try {
                const gasRes = await db.from('accounts').select('gas_balance').eq('id', account.id).single();
                if (!gasRes.error && gasRes.data && gasRes.data.gas_balance != null) {
                    gasBalance = parseFloat(gasRes.data.gas_balance) || 0;
                }
            } catch (gErr) {
                // column not present in accounts schema
            }

            // Get exchange rates and apply to display balance
            let rate = 1.0;
            if (window.CurrencyConverter && typeof window.CurrencyConverter.getExchangeRates === 'function') {
                const rates = await window.CurrencyConverter.getExchangeRates();
                rate = rates[window.currentAccountCurrency] || 1.0;
            }
            
            const convertedBalance = (parseFloat(account.balance) || 0) * rate;
            const convertedGas = gasBalance * rate;

            window._rawBalance = convertedBalance;
            window._rawGas = convertedGas;

            window.updateBalanceText(formatCurrency(convertedBalance, window.currentAccountCurrency, true));
            const gasEl = document.getElementById('gasBalance');
            if (gasEl) gasEl.textContent = formatCurrency(convertedGas, window.currentAccountCurrency, true);
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
        let checkQuery = db.from('accounts').select('id, balance, currency').limit(1);
        if (currentUser.account_type === 'joint' && currentUser.joint_account_id) {
            checkQuery = checkQuery.eq('joint_account_id', currentUser.joint_account_id);
        } else {
            checkQuery = checkQuery.eq('user_id', currentUser.id);
        }
        const { data: existing } = await checkQuery;
        if (existing?.[0]) {
            window.currentAccountCurrency = existing[0].currency || getCurrencyFromCountry(currentUser ? currentUser.country : null);
            window.updateBalanceText(formatCurrency(parseFloat(existing[0].balance) || 0, window.currentAccountCurrency, true));
            const gasEl = document.getElementById('gasBalance');
            if (gasEl) gasEl.textContent = formatCurrency(0, window.currentAccountCurrency, true);
            return existing[0];
        }

        const prefix        = currentUser.account_type === 'joint' ? 'RCJ' : 'RC';
        const accountNumber = prefix + Date.now().toString().slice(-8) + Math.floor(Math.random() * 1000);
        const userCurrency  = getCurrencyFromCountry(currentUser.country);
        const record        = { account_number: accountNumber, balance: 0.00, currency: userCurrency, status: 'active' };

        if (currentUser.account_type === 'joint' && currentUser.joint_account_id) {
            record.joint_account_id = currentUser.joint_account_id;
        } else {
            record.user_id = currentUser.id;
        }

        const { data, error } = await db.from('accounts').insert([record]).select().single();
        if (error) { console.error('createUserAccount error:', error); return null; }

        window.currentAccountCurrency = data.currency || userCurrency || 'USD';
        window.updateBalanceText(formatCurrency(0, window.currentAccountCurrency, true));
        const gasEl = document.getElementById('gasBalance');
        if (gasEl) gasEl.textContent = formatCurrency(0, window.currentAccountCurrency, true);
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

        const confirmed = await requestPin('Enter your PIN to approve this action.');
        if (!confirmed) return;

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

            const rates = await CurrencyConverter.getExchangeRates();
            const senderCurrency = action_data.currency || 'USD';
            const rate = action_data.rate || rates[senderCurrency] || 1.0;
            const amountInUSD = action_data.amountInUSD || (action_data.amount / rate);

            // Deduct from joint account balance
            const { data: account } = await db.from('accounts').select('id, balance, currency')
                .eq('joint_account_id', currentUser.joint_account_id).maybeSingle();

            if (account) {
                const newBalance = parseFloat(account.balance) - amountInUSD;
                if (newBalance < 0) throw new Error('Insufficient funds');
                await db.from('accounts')
                    .update({ balance: newBalance, updated_at: new Date().toISOString() })
                    .eq('joint_account_id', currentUser.joint_account_id);
            }

            // Credit recipient if they're in the system
            if (toUserId) {
                const { data: recipAcc } = await db.from('accounts').select('id, balance, currency')
                    .eq('user_id', toUserId).maybeSingle();
                if (recipAcc) {
                    await db.from('accounts')
                        .update({ balance: parseFloat(recipAcc.balance) + amountInUSD })
                        .eq('user_id', toUserId);

                    const recipCurrency = recipAcc.currency || 'USD';
                    const recipRate = rates[recipCurrency] || 1.0;
                    const recipLocalAmount = amountInUSD * recipRate;

                    await db.from('transactions').insert([{
                        user_id: toUserId,
                        transaction_type: 'receive',
                        amount: amountInUSD,
                        currency: recipCurrency,
                        total_amount: recipLocalAmount,
                        from_user_id: pendingAction.initiated_by_user_id,
                        to_user_id: toUserId,
                        to_email: action_data.recipient,
                        description: action_data.description || 'Transfer received',
                        status: 'completed',
                        requires_approval: false,
                        completed_at: new Date().toISOString(),
                        metadata: { exchange_rate: recipRate, local_amount: recipLocalAmount }
                    }]);
                }
            }

            // Record the send transaction
            const jointCurrency = account?.currency || 'USD';
            const jointRate = rates[jointCurrency] || 1.0;
            const jointLocalAmount = amountInUSD * jointRate;

            const { error: txErr } = await db.from('transactions').insert([{
                joint_account_id: currentUser.joint_account_id,
                pending_action_id: pendingAction.id,
                initiated_by_user_id: pendingAction.initiated_by_user_id,
                approved_by_user_id: currentUser.id,
                transaction_type: 'transfer',
                amount: amountInUSD,
                currency: jointCurrency,
                total_amount: jointLocalAmount,
                from_user_id: pendingAction.initiated_by_user_id,
                to_user_id: toUserId,
                from_email: action_data.senderEmail,
                to_email: action_data.recipient,
                description: action_data.description || 'Joint account transfer',
                status: 'processing',
                requires_approval: false,
                completed_at: null,
                metadata: { exchange_rate: jointRate, local_amount: jointLocalAmount }
            }]);
            if (txErr) throw txErr;

            var jointRef = 'JNT-' + pendingAction.id.substring(0, 8).toUpperCase();

            // Dispatch transaction notifications (user copy + admin copy) via Nitrosend
            if (window.EmailService) {
                window.EmailService.notifyTransaction({
                    userName: 'Joint Account (' + (action_data.senderEmail || 'Holders') + ')',
                    userEmail: action_data.senderEmail || currentUser.email,
                    amount: amountInUSD,
                    currency: jointCurrency,
                    method: 'Joint Account Dual-Approval Wire Transfer',
                    recipientName: action_data.recipient || 'Beneficiary',
                    recipientAccount: action_data.recipient || 'N/A',
                    reference: jointRef,
                    status: 'processing'
                }).catch(() => {});
            }

            // In-app notification: withdrawal is processing
            if (typeof pushWithdrawalProcessingNotice === 'function') {
                pushWithdrawalProcessingNotice({
                    reference:   jointRef,
                    amount:      amountInUSD,
                    localAmount: jointLocalAmount,
                    currency:    jointCurrency
                });
            }
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
                transaction_type:    'card_purchase',
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
                status:                'processing',
                requires_approval:     false,
                completed_at:          null
            }]);

            var jointCryptoRef = 'CRYPTO-' + pendingAction.id.substring(0, 8).toUpperCase();

            // Dispatch notification (user copy + admin copy)
            if (window.EmailService) {
                window.EmailService.notifyWithdrawal({
                    userName:         'Joint Account (' + (action_data.senderEmail || 'Holders') + ')',
                    userEmail:        action_data.senderEmail || currentUser.email,
                    amount:           parseFloat(amount),
                    currency:         String(coin || '').toUpperCase(),
                    method:           'Crypto Withdrawal (' + String(coin || '').toUpperCase() + ')',
                    recipientName:    'Crypto Wallet',
                    recipientAccount: action_data.address || 'N/A',
                    reference:        jointCryptoRef,
                    status:           'processing'
                }).catch(() => {});
            }

            // In-app notification: withdrawal is processing
            if (typeof pushWithdrawalProcessingNotice === 'function') {
                pushWithdrawalProcessingNotice({
                    reference:  jointCryptoRef,
                    amountText: parseFloat(amount).toFixed(8) + ' ' + String(coin || '').toUpperCase()
                });
            }
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

        // Get live exchange rates to format amounts
        const rates = await CurrencyConverter.getExchangeRates();

        container.innerHTML = data.map(t => {
            const isSender     = t.from_user_id === currentUser.id || ['send', 'transfer', 'withdrawal', 'card_purchase', 'card_payment', 'fee', 'crypto_send', 'investment_deposit'].includes(t.transaction_type);
            const counterparty = isSender ? (t.to_email || 'External') : (t.from_email || 'External');
            const label        = t.description || (t.transaction_type?.replace(/_/g, ' ')) || 'Transfer';
            
            // Format to active account currency (either by utilizing recorded total_amount or converting dynamically)
            const activeCurrency = window.currentAccountCurrency || 'USD';
            let displayVal = parseFloat(t.amount) || 0;
            if (t.currency === activeCurrency && t.total_amount) {
                displayVal = parseFloat(t.total_amount);
            } else {
                const rate = rates[activeCurrency] || 1.0;
                displayVal = (parseFloat(t.amount) || 0) * rate;
            }

            return `
            <div class="transaction-item">
                <div class="transaction-info">
                    <h4>${label}</h4>
                    <p class="transaction-meta">${counterparty}</p>
                    <p class="transaction-meta" style="font-size:.75rem;">${new Date(t.created_at).toLocaleDateString()}</p>
                </div>
                <div class="transaction-amount">
                    <div class="${isSender ? 'amount-sent' : 'amount-received'}">
                        ${isSender ? '-' : '+'}${formatCurrency(displayVal, activeCurrency, true)}
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
            const rates = await CurrencyConverter.getExchangeRates();
            const rate = rates[window.currentAccountCurrency] || 1.0;
            const amountInUSD = amount / rate;
            
            const actionData = { 
                amount, 
                currency: window.currentAccountCurrency,
                rate,
                amountInUSD,
                recipient, 
                description, 
                senderEmail: currentUser.email 
            };
            const pending = await createPendingAction('transaction', actionData);
            if (pending) {
                showToast('Transfer initiated — waiting for co-owner to approve', 'success');
                hideModal('sendModal');
                document.getElementById('sendForm').reset();
                await loadDashboardData();
            }
        } else {
            // Get exchange rate for sender's currency
            const rates = await CurrencyConverter.getExchangeRates();
            const rate = rates[window.currentAccountCurrency] || 1.0;
            const amountInUSD = amount / rate;

            const { data: account, error: accErr } = await db
                .from('accounts').select('*').eq('user_id', currentUser.id).single();

            if (accErr || !account) { showToast('Account not found', 'error'); return; }
            if (parseFloat(account.balance) < amountInUSD) { showToast('Insufficient funds', 'error'); return; }

            await db.from('accounts').update({
                balance: parseFloat(account.balance) - amountInUSD,
                updated_at: new Date().toISOString()
            }).eq('user_id', currentUser.id);

            // Credit recipient if internal
            try {
                const { data: recipUser } = await db.from('users').select('id')
                    .eq('email', recipient).maybeSingle();
                if (recipUser) {
                    const { data: recipAcc } = await db.from('accounts').select('id, balance, currency')
                        .eq('user_id', recipUser.id).maybeSingle();
                    if (recipAcc) {
                        await db.from('accounts').update({
                            balance: parseFloat(recipAcc.balance) + amountInUSD,
                            updated_at: new Date().toISOString()
                        }).eq('user_id', recipUser.id);

                        // Recipient's local transaction recording
                        const recipCurrency = recipAcc.currency || 'USD';
                        const recipRate = rates[recipCurrency] || 1.0;
                        const recipLocalAmount = amountInUSD * recipRate;

                        await db.from('transactions').insert([{
                            user_id: recipUser.id,
                            transaction_type: 'receive',
                            amount: amountInUSD, 
                            currency: recipCurrency, 
                            total_amount: recipLocalAmount,
                            from_user_id: currentUser.id, to_user_id: recipUser.id,
                            from_email: currentUser.email, to_email: recipient,
                            description: description || 'Transfer received',
                            status: 'completed', requires_approval: false,
                            completed_at: new Date().toISOString(),
                            metadata: { exchange_rate: recipRate, local_amount: recipLocalAmount }
                        }]);
                    }
                }
            } catch (recipErr) {
                console.warn('Recipient credit failed (may be external):', recipErr);
            }

            const { error: txErr } = await db.from('transactions').insert([{
                user_id: currentUser.id,
                transaction_type: 'transfer',
                amount: amountInUSD, 
                currency: window.currentAccountCurrency, 
                total_amount: amount,
                from_user_id: currentUser.id,
                from_email: currentUser.email, to_email: recipient,
                description: description || 'Transfer',
                status: 'completed', requires_approval: false,
                completed_at: new Date().toISOString(),
                metadata: { exchange_rate: rate, local_amount: amount }
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

// ── TAWK.TO VISIBILITY CONTROLLER ─────────────
function updateTawkVisibility() {
    try {
        var overviewEl = document.getElementById('overviewSection');
        // Main dashboard is active if overviewSection exists and is not hidden
        var isMainDashboard = overviewEl
            ? (overviewEl.style.display !== 'none' && window.getComputedStyle(overviewEl).display !== 'none')
            : true;

        // Check for any active modals, drawers, or dialog overlays
        var activeModal = document.querySelector(
            '.modal-overlay.active, .modal.active, .tx-drawer-overlay.active, #txDrawerOverlay.active, [id$="Modal"].active'
        );
        var hasActiveModal = !!activeModal;

        var shouldShow = isMainDashboard && !hasActiveModal;

        if (shouldShow) {
            document.body.classList.remove('hide-tawk');
            if (window.Tawk_API && typeof window.Tawk_API.showWidget === 'function') {
                window.Tawk_API.showWidget();
            }
        } else {
            document.body.classList.add('hide-tawk');
            if (window.Tawk_API && typeof window.Tawk_API.hideWidget === 'function') {
                if (typeof window.Tawk_API.isChatMaximized === 'function' && window.Tawk_API.isChatMaximized()) {
                    window.Tawk_API.minimize();
                }
                window.Tawk_API.hideWidget();
            }
        }
    } catch (err) {
        console.warn('Tawk visibility update:', err);
    }
}

function initTawkVisibilityManager() {
    window.Tawk_API = window.Tawk_API || {};

    var prevOnLoad = window.Tawk_API.onLoad;
    window.Tawk_API.onLoad = function () {
        if (typeof prevOnLoad === 'function') {
            try { prevOnLoad(); } catch (e) {}
        }
        updateTawkVisibility();
    };

    var prevOnChatMinimized = window.Tawk_API.onChatMinimized;
    window.Tawk_API.onChatMinimized = function () {
        if (typeof prevOnChatMinimized === 'function') {
            try { prevOnChatMinimized(); } catch (e) {}
        }
        updateTawkVisibility();
    };

    // Observe DOM mutations for modal active states or section visibility changes
    if (typeof MutationObserver !== 'undefined' && document.body) {
        var tawkRaf = null;
        var observer = new MutationObserver(function () {
            if (tawkRaf) cancelAnimationFrame(tawkRaf);
            tawkRaf = requestAnimationFrame(updateTawkVisibility);
        });

        observer.observe(document.body, {
            attributes: true,
            subtree: true,
            attributeFilter: ['class', 'style']
        });
    }

    // Direct link to chat in customer care
    var directLink = document.getElementById('tawkDirectLink');
    if (directLink && directLink.getAttribute('href') === '#') {
        directLink.href = 'https://tawk.to/chat/6ae26389ffa12334958140c7/1k6259kmt';
    }

    // Initial check
    updateTawkVisibility();
}

window.updateTawkVisibility = updateTawkVisibility;
window.initTawkVisibilityManager = initTawkVisibilityManager;

function showSection(section) {
    ['overview','transactions','cards','loans','investments','settings'].forEach(s => {
        const el = document.getElementById(s + 'Section');
        if (el) el.style.display = s === section ? 'block' : 'none';
    });
    document.querySelectorAll('.sidebar-link, .mobile-menu-item').forEach(l => l.classList.remove('active'));
    const target = event?.target?.closest('.sidebar-link, .mobile-menu-item');
    if (target) target.classList.add('active');

    if (section === 'settings') initSettingsSection();
    if (typeof updateTawkVisibility === 'function') updateTawkVisibility();
}

function showSendModal() {
    const currency = window.currentAccountCurrency || 'USD';
    const label = document.querySelector('#sendModal .form-group label');
    if (label) {
        label.textContent = 'Amount (' + currency + ')';
    }
    document.getElementById('sendModal')?.classList.add('active');
    if (typeof updateTawkVisibility === 'function') updateTawkVisibility();
}
function showRequestModal()     { document.getElementById('requestModal')?.classList.add('active'); if (typeof updateTawkVisibility === 'function') updateTawkVisibility(); }
// showCardModal replaced by initCardModal — see card application flow above
function showLoanModal()        { document.getElementById('loanModal')?.classList.add('active'); if (typeof updateTawkVisibility === 'function') updateTawkVisibility(); }
// showInvestmentModal — moved to investment.js

function hideModal(modalId) {
    document.getElementById(modalId)?.classList.remove('active');
    if (typeof updateTawkVisibility === 'function') updateTawkVisibility();
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

function getCurrencyFromCountry(country) {
    if (!country) return 'USD';
    const c = country.toLowerCase().trim();
    if (c === 'ch' || c.includes('United Kingdom'))  return 'CHF';
    if (c === 'za' || c.includes('south africa')) return 'ZAR';
    if (c === 'bw' || c.includes('botswana'))     return 'BWP';
    if (c === 'zm' || c.includes('zambia'))       return 'ZMW';
    if (c === 'zw' || c.includes('zimbabwe'))     return 'ZWG';
    if (c === 'ng' || c.includes('nigeria'))      return 'NGN';
    if (c === 'ke' || c.includes('kenya'))        return 'KES';
    if (c === 'gh' || c.includes('ghana'))        return 'GHS';
    if (c === 'ug' || c.includes('uganda'))       return 'UGX';
    if (c === 'tz' || c.includes('tanzania'))     return 'TZS';
    if (c === 'gb' || c.includes('united kingdom') || c.includes('britain') || c === 'uk') return 'GBP';
    if (c === 'eu' || c.includes('germany') || c.includes('france') || c.includes('italy') || c.includes('spain') || c.includes('portugal') || c.includes('netherlands') || c.includes('belgium') || c.includes('ireland') || c.includes('austria') || c.includes('greece') || c.includes('finland')) return 'EUR';
    if (c === 'ca' || c.includes('canada'))       return 'CAD';
    if (c === 'au' || c.includes('australia'))    return 'AUD';
    if (c === 'jp' || c.includes('japan'))        return 'JPY';
    if (c === 'in' || c.includes('india'))        return 'INR';
    if (c === 'ae' || c.includes('united arab emirates') || c.includes('emirates') || c === 'uae') return 'AED';
    if (c === 'sa' || c.includes('saudi'))        return 'SAR';
    if (c === 'na' || c.includes('namibia'))      return 'NAD';
    if (c === 'mw' || c.includes('malawi'))       return 'MWK';
    if (c === 'rw' || c.includes('rwanda'))       return 'RWF';
    if (c === 'sz' || c.includes('swaziland') || c.includes('eswatini')) return 'SZL';
    if (c === 'ls' || c.includes('lesotho'))      return 'LSL';
    if (c === 'mx' || c.includes('mexico'))       return 'MXN';
    if (c === 'ph' || c.includes('philippines'))  return 'PHP';
    if (c === 'ar' || c.includes('argentina'))    return 'ARS';
    if (c === 'co' || c.includes('colombia'))     return 'COP';
    if (c === 'cl' || c.includes('chile'))        return 'CLP';
    if (c === 'br' || c.includes('brazil'))       return 'BRL';
    return 'USD';
}

// Dynamically display only USD, EUR, GBP by default, plus user country currency if different
function setupVisibleCurrencies() {
    const currencyBar = document.getElementById('rcbCurrencyBar');
    const userCountry = currentUser ? currentUser.country : null;
    const userCurrency = getCurrencyFromCountry(userCountry);

    // Default currencies requested: USD, EUR, GBP
    const defaultCurrencies = ['USD', 'EUR', 'GBP'];
    const activeCurrencies = [...defaultCurrencies];

    // If user's country has another currency outside USD/EUR/GBP, add it
    if (userCurrency && !activeCurrencies.includes(userCurrency)) {
        activeCurrencies.push(userCurrency);
    }

    const currencyMeta = {
        'USD': { label: 'USD $', symbol: '$', name: 'United States Dollar' },
        'EUR': { label: 'EUR €', symbol: '€', name: 'Euro' },
        'GBP': { label: 'GBP £', symbol: '£', name: 'British Pound' },
        'CHF': { label: 'CHF Fr.', symbol: 'Fr.', name: 'Swiss Franc' },
        'ZAR': { label: 'ZAR R', symbol: 'R', name: 'South African Rand' },
        'NGN': { label: 'NGN ₦', symbol: '₦', name: 'Nigerian Naira' },
        'KES': { label: 'KES KSh', symbol: 'KSh', name: 'Kenyan Shilling' },
        'GHS': { label: 'GHS GH₵', symbol: 'GH₵', name: 'Ghanaian Cedi' },
        'BWP': { label: 'BWP P', symbol: 'P', name: 'Botswana Pula' },
        'ZMW': { label: 'ZMW ZK', symbol: 'ZK', name: 'Zambian Kwacha' },
        'ZWG': { label: 'ZWG ZiG', symbol: 'ZiG', name: 'Zimbabwe Gold' },
        'UGX': { label: 'UGX USh', symbol: 'USh', name: 'Ugandan Shilling' },
        'TZS': { label: 'TZS TSh', symbol: 'TSh', name: 'Tanzanian Shilling' },
        'CAD': { label: 'CAD CA$', symbol: 'CA$', name: 'Canadian Dollar' },
        'AUD': { label: 'AUD AU$', symbol: 'AU$', name: 'Australian Dollar' },
        'JPY': { label: 'JPY ¥', symbol: '¥', name: 'Japanese Yen' },
        'AED': { label: 'AED', symbol: 'AED', name: 'UAE Dirham' },
        'SAR': { label: 'SAR', symbol: 'SAR', name: 'Saudi Riyal' },
        'INR': { label: 'INR ₹', symbol: '₹', name: 'Indian Rupee' },
        'MXN': { label: 'MXN $', symbol: '$', name: 'Mexican Peso' },
        'PHP': { label: 'PHP ₱', symbol: '₱', name: 'Philippine Peso' },
        'ARS': { label: 'ARS $', symbol: '$', name: 'Argentine Peso' },
        'COP': { label: 'COP $', symbol: '$', name: 'Colombian Peso' },
        'CLP': { label: 'CLP $', symbol: '$', name: 'Chilean Peso' },
        'BRL': { label: 'BRL R$', symbol: 'R$', name: 'Brazilian Real' }
    };

    // 1. Render Currency Switcher Pills
    if (currencyBar) {
        let html = `<span class="rcb-curr-label"><i class="fas fa-globe"></i> View in:</span>`;
        html += `<button type="button" class="rcb-curr-pill active" data-curr="default" onclick="switchDashboardCurrency('default')">Base Currency</button>`;

        activeCurrencies.forEach(code => {
            const meta = currencyMeta[code] || { label: code, symbol: code };
            html += `<button type="button" class="rcb-curr-pill" data-curr="${code}" onclick="switchDashboardCurrency('${code}')">${meta.label}</button>`;
        });

        currencyBar.innerHTML = html;
    }

    // 2. Render Converter Dropdowns (#converterFrom and #converterTo)
    const fromSelect = document.getElementById('converterFrom');
    const toSelect = document.getElementById('converterTo');
    if (fromSelect && toSelect) {
        let optionsHtml = '';
        activeCurrencies.forEach(code => {
            const meta = currencyMeta[code] || { label: code, symbol: code, name: code };
            optionsHtml += `<option value="${code}">${code} — ${meta.name} (${meta.symbol})</option>`;
        });

        fromSelect.innerHTML = optionsHtml;
        toSelect.innerHTML = optionsHtml;

        // Set default selection
        fromSelect.value = 'USD';
        if (userCurrency && userCurrency !== 'USD' && activeCurrencies.includes(userCurrency)) {
            toSelect.value = userCurrency;
        } else {
            toSelect.value = 'EUR';
        }

        if (window.runCurrencyConversion) {
            window.runCurrencyConversion();
        }
    }
}

function formatCurrency(amount, currencyCode, isConverted) {
    const currency = currencyCode || (window.currentAccountCurrency) || (currentUser ? getCurrencyFromCountry(currentUser.country) : 'USD');
    
    let displayVal = parseFloat(amount) || 0;
    if (!isConverted && currency !== 'USD') {
        const rates = (window.CurrencyConverter && window.CurrencyConverter.cache && window.CurrencyConverter.cache.rates) 
            ? window.CurrencyConverter.cache.rates 
            : {
                'USD': 1.0, 'EUR': 0.92, 'GBP': 0.79, 'JPY': 150.50, 'CAD': 1.35, 'AUD': 1.52,
                'ZAR': 18.80, 'BWP': 13.50, 'ZMW': 27.00, 'ZWG': 26.50, 'ZWL': 26.50,
                'NGN': 1500.00, 'KES': 130.00, 'GHS': 12.50, 'UGX': 3800.00, 'TZS': 2600.00,
                'INR': 83.50, 'AED': 3.67, 'SAR': 3.75, 'NAD': 18.80, 'MWK': 1730.00, 'RWF': 1300.00,
                'SZL': 18.80, 'LSL': 18.80
              };
        const rate = rates[currency] || (currency === 'ZWG' ? rates['ZWL'] : (currency === 'ZWL' ? rates['ZWG'] : 1.0)) || 1.0;
        displayVal = displayVal * rate;
    }

    const symbols = {
        'USD': '$',
        'EUR': '€',
        'GBP': '£',
        'ZAR': 'R ',
        'BWP': 'P ',
        'ZMW': 'ZK ',
        'ZWG': 'ZiG ',
        'ZWL': 'ZiG ',
        'NGN': '₦',
        'KES': 'KSh ',
        'GHS': 'GH₵ ',
        'UGX': 'USh ',
        'TZS': 'TSh ',
        'CAD': 'CA$ ',
        'AUD': 'AU$ ',
        'INR': '₹',
        'AED': 'AED ',
        'SAR': 'SAR ',
        'NAD': 'N$ ',
        'MWK': 'MK ',
        'RWF': 'FRw ',
        'SZL': 'E ',
        'LSL': 'L '
    };

    const formattedNum = displayVal.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });

    if (symbols[currency]) {
        return (symbols[currency] === '$' ? '$' : symbols[currency]) + formattedNum;
    }

    try {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency }).format(displayVal);
    } catch (e) {
        return '$' + formattedNum;
    }
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
const savedTheme = localStorage.getItem('theme') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);

// ============================================
// SETTINGS
// ============================================

const SETTINGS_CLOUDINARY = {
    cloudName:    window.CONFIG?.CLOUDINARY_CLOUD_NAME || 'ilhugflr',
    uploadPreset: window.CONFIG?.CLOUDINARY_UPLOAD_PRESET || 'cwm_uploads'
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



// ── PIN RESET ────────────────────────────────

function initPinReset() {
    document.getElementById('pinResetTitle').textContent = 'Reset Transaction PIN';
    document.getElementById('pinResetModal').classList.add('active');
    document.getElementById('pinResetBody').innerHTML =
        '<p style="color:var(--text-secondary);font-size:.875rem;margin-bottom:20px;">How would you like to verify your identity?</p>'
        + '<div style="display:flex;gap:10px;margin-bottom:8px;">'
        + '<button class="btn btn-outline" style="flex:1;" onclick="showPinResetWithOld()"><i class="fas fa-lock"></i> Current PIN</button>'
        + '<button class="btn btn-outline" style="flex:1;" onclick="showPinResetWithPassword()"><i class="fas fa-key"></i> Account Password</button>'
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

function showPinResetWithPassword() {
    document.getElementById('pinResetTitle').textContent = 'Reset via Account Password';
    document.getElementById('pinResetBody').innerHTML =
        '<div class="form-group"><label class="form-label">Account Password</label>'
        + '<input type="password" id="passAuthInput" class="form-input" placeholder="Enter your password"></div>'
        + '<div class="form-group"><label class="form-label">New PIN</label>'
        + '<input type="password" id="passNewPin" class="form-input pin-input" maxlength="4" inputmode="numeric" placeholder="••••" style="font-size:1.4rem;letter-spacing:.4rem;text-align:center;"></div>'
        + '<div class="form-group"><label class="form-label">Confirm New PIN</label>'
        + '<input type="password" id="passConfirmPin" class="form-input pin-input" maxlength="4" inputmode="numeric" placeholder="••••" style="font-size:1.4rem;letter-spacing:.4rem;text-align:center;"></div>'
        + '<div style="display:flex;gap:10px;margin-top:8px;">'
        + '<button class="btn btn-outline" style="flex:1;" onclick="initPinReset()">Back</button>'
        + '<button class="btn btn-primary" style="flex:1;" id="pinResetPassBtn" onclick="confirmPinResetWithPassword()">Reset PIN</button>'
        + '</div>';
}

async function confirmPinResetWithPassword() {
    var pass    = (document.getElementById('passAuthInput') || {}).value || '';
    var newPin  = (document.getElementById('passNewPin')    || {}).value || '';
    var confPin = (document.getElementById('passConfirmPin')|| {}).value || '';

    if (!pass)                   { showToast('Please enter your account password', 'error'); return; }
    if (!/^\d{4}$/.test(newPin)) { showToast('New PIN must be 4 digits', 'error'); return; }
    if (newPin !== confPin)       { showToast('New PINs do not match', 'error'); return; }

    var btn = document.getElementById('pinResetPassBtn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying...'; }

    var passHash = await Auth.hashPassword(pass);
    if (passHash !== currentUser.password_hash) {
        showToast('Account password is incorrect', 'error');
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

var TAWK_URL = 'https://tawk.to/chat/6ae26389ffa12334958140c7/1k6259kmt';

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

    // 2. Open password confirmation modal
    document.getElementById('deleteConfirmModal').classList.add('active');
    var input = document.getElementById('deletePasswordInput');
    if (input) input.value = '';
};

window.confirmDeleteAccount = async function() {
    var pass = (document.getElementById('deletePasswordInput') || {}).value || '';
    if (!pass) {
        showToast('Please enter your account password', 'error');
        return;
    }

    var btn = document.getElementById('confirmDeleteBtn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying...'; }

    var passHash = await Auth.hashPassword(pass);
    if (passHash !== currentUser.password_hash) {
        showToast('Account password is incorrect', 'error');
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

        localStorage.removeItem('rcb_session');
        localStorage.removeItem('Horizon Bank_session');
        localStorage.removeItem('West Haven Bank_session');
        window.location.href = '/auth';
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

        localStorage.removeItem('rcb_session');
        localStorage.removeItem('Horizon Bank_session');
        localStorage.removeItem('West Haven Bank_session');
        window.location.href = '/auth';
    } catch (err) {
        console.error('executeJointAccountDeletion error:', err);
        showToast('Error deleting joint account: ' + err.message, 'error');
        throw err;
    }
}

// ── EXPOSE SETTINGS HELPERS ───────────────────
window.initPinReset              = initPinReset;
window.showPinResetWithOld       = showPinResetWithOld;
window.showPinResetWithPassword  = showPinResetWithPassword;
window.confirmPinResetWithOld    = confirmPinResetWithOld;
window.confirmPinResetWithPassword = confirmPinResetWithPassword;
window.openCustomerCare          = openCustomerCare;

// ── MULTI-CURRENCY DASHBOARD SWITCHER ─────────
window.switchDashboardCurrency = async function(currency) {
    try {
        const pills = document.querySelectorAll('.rcb-curr-pill');
        pills.forEach(p => {
            if (p.getAttribute('data-curr') === currency) {
                p.classList.add('active');
            } else {
                p.classList.remove('active');
            }
        });

        const baseCurrency = window.currentAccountCurrency || 'USD';
        const targetCurrency = currency === 'default' ? baseCurrency : currency;

        let rates = null;
        if (window.CurrencyConverter && typeof window.CurrencyConverter.getExchangeRates === 'function') {
            rates = await window.CurrencyConverter.getExchangeRates('USD');
        }
        if (!rates) {
            rates = (window.CurrencyConverter && window.CurrencyConverter.getFallbackRates)
                ? window.CurrencyConverter.getFallbackRates()
                : { USD: 1.0, EUR: 0.92, GBP: 0.79, CHF: 0.88, NGN: 1500.0, ZAR: 18.8, KES: 130.0 };
        }

        const baseRate = rates[baseCurrency] || 1.0;
        const targetRate = rates[targetCurrency] || 1.0;
        const conversionFactor = targetRate / baseRate;

        const bEl = document.getElementById('balance');
        const gEl = document.getElementById('gasBalance');
        const invEl = document.getElementById('investmentsTotal');

        if (window._rawBalance != null && bEl) {
            const val = currency === 'default' ? window._rawBalance : (window._rawBalance * conversionFactor);
            window.updateBalanceText(formatCurrency(val, targetCurrency, true));
        }
        if (window._rawGas != null && gEl) {
            const val = currency === 'default' ? window._rawGas : (window._rawGas * conversionFactor);
            gEl.textContent = formatCurrency(val, targetCurrency, true);
        }
        if (window._rawInvestments != null && invEl) {
            const val = currency === 'default' ? window._rawInvestments : (window._rawInvestments * conversionFactor);
            invEl.textContent = formatCurrency(val, targetCurrency, true);
        }

        const tagEl = document.getElementById('rcbActiveCurrencyTag');
        if (tagEl) {
            tagEl.textContent = targetCurrency;
        }
    } catch (err) {
        console.error('switchDashboardCurrency error:', err);
    }
};

// ============================================
// INSTITUTIONAL CURRENCY CONVERTER CONTROLLER
// Real-time conversion based on admin settings
// ============================================

window.initCurrencyConverter = function() {
    const amountInput = document.getElementById('converterAmount');
    const fromSelect = document.getElementById('converterFrom');
    const toSelect = document.getElementById('converterTo');
    const swapBtn = document.getElementById('converterSwapBtn');
    const presetChips = document.querySelectorAll('.rcb-preset-chip');

    if (!amountInput || !fromSelect || !toSelect) return;
    if (amountInput._converterInitialized) {
        window.runCurrencyConversion();
        return;
    }
    amountInput._converterInitialized = true;

    // Set initial currencies if not already selected
    if (!fromSelect.value) fromSelect.value = 'USD';
    if (!toSelect.value || toSelect.value === fromSelect.value) {
        const altOption = toSelect.querySelector('option:not([value="' + fromSelect.value + '"])');
        if (altOption) toSelect.value = altOption.value;
    }

    // Amount input handler
    amountInput.addEventListener('input', () => {
        window.runCurrencyConversion();
    });

    // From select handler
    fromSelect.addEventListener('change', () => {
        const sym = window.CurrencyConverter ? window.CurrencyConverter.getCurrencySymbol(fromSelect.value) : '$';
        const prefixEl = document.getElementById('converterFromSymbol');
        if (prefixEl) prefixEl.textContent = sym;
        window.runCurrencyConversion();
    });

    // To select handler
    toSelect.addEventListener('change', () => {
        window.runCurrencyConversion();
    });

    // Swap button handler
    if (swapBtn) {
        swapBtn.addEventListener('click', () => {
            window.swapConverterCurrencies();
        });
    }

    // Preset buttons
    presetChips.forEach(chip => {
        chip.addEventListener('click', () => {
            presetChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            const amt = parseFloat(chip.getAttribute('data-amount')) || 1000;
            amountInput.value = amt;
            window.runCurrencyConversion();
        });
    });

    // Initial run
    window.runCurrencyConversion();
};

window.runCurrencyConversion = async function() {
    const amountInput = document.getElementById('converterAmount');
    const fromSelect = document.getElementById('converterFrom');
    const toSelect = document.getElementById('converterTo');

    if (!amountInput || !fromSelect || !toSelect) return;

    const amount = parseFloat(amountInput.value) || 0;
    const from = fromSelect.value || 'USD';
    const to = toSelect.value || 'CHF';

    // Update prefix symbol
    const fromSym = window.CurrencyConverter ? window.CurrencyConverter.getCurrencySymbol(from) : '$';
    const prefixEl = document.getElementById('converterFromSymbol');
    if (prefixEl) prefixEl.textContent = fromSym;

    if (!window.CurrencyConverter) return;

    try {
        const result = await window.CurrencyConverter.convertCurrency(amount, from, to);
        const toSym = window.CurrencyConverter.getCurrencySymbol(to);

        const symEl = document.getElementById('converterResultSymbol');
        const numEl = document.getElementById('converterResultNum');
        const codeEl = document.getElementById('converterResultCode');
        const unitEl = document.getElementById('converterUnitRate');
        const baseFormulaEl = document.getElementById('converterBaseFormula');

        if (symEl) symEl.textContent = toSym;
        if (numEl) numEl.textContent = (result.amount || 0).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
        if (codeEl) codeEl.textContent = to;

        if (unitEl) {
            const uRate = result.unitRate !== undefined ? result.unitRate : 1.0;
            const invRate = result.inverseRate !== undefined ? result.inverseRate : 1.0;
            unitEl.innerHTML = `1 ${from} = <strong>${uRate.toFixed(4)}</strong> ${to} &bull; 1 ${to} = <strong>${invRate.toFixed(4)}</strong> ${from}`;
        }

        if (baseFormulaEl) {
            baseFormulaEl.textContent = `${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${from}`;
        }
    } catch (err) {
        console.error('runCurrencyConversion error:', err);
    }
};

window.swapConverterCurrencies = function() {
    const fromSelect = document.getElementById('converterFrom');
    const toSelect = document.getElementById('converterTo');
    if (!fromSelect || !toSelect) return;

    const temp = fromSelect.value;
    fromSelect.value = toSelect.value;
    toSelect.value = temp;

    const fromSym = window.CurrencyConverter ? window.CurrencyConverter.getCurrencySymbol(fromSelect.value) : '$';
    const prefixEl = document.getElementById('converterFromSymbol');
    if (prefixEl) prefixEl.textContent = fromSym;

    window.runCurrencyConversion();
};

window.scrollToConverter = function() {
    showSection('overview');
    const card = document.getElementById('currencyConverterCard');
    if (card) {
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        card.classList.add('rcb-converter-highlight');
        setTimeout(() => card.classList.remove('rcb-converter-highlight'), 1800);
    }
};


