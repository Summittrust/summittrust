// ============================================
// SUMMIT TRUST ADMIN PANEL - COMPLETE
// ============================================

const SUPABASE_URL = 'https://jotfmjdmorjweoumdvuq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpvdGZtamRtb3Jqd2VvdW1kdnVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3Mzk2OTksImV4cCI6MjA5MTMxNTY5OX0.bTkJKZtHEz_cBBHsYwWiWMotLpCpKU68_ROE-mKWm4s';

const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpvdGZtamRtb3Jqd2VvdW1kdnVxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTczOTY5OSwiZXhwIjoyMDkxMzE1Njk5fQ.GZb5P6DW4brXF9GitH3eU3-z9o3FaGoPtZ9hoWCUa-8';

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const adminDb = window.supabase.createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// STATE
let adminState = {
    users: [],
    accounts: [],
    jointAccounts: [],
    transactions: [],
    cards: [],
    loans: [],
    investments: [],
    notifications: [],
    adminNotifications: [],
    kycLevels: [],
    supportTickets: [],
    txPage: 1, txSort: 'created_at', txDir: 'desc',
    cardPage: 1,
    loanPage: 1,
    investPage: 1,
    PAGE_SIZE: 20
};

let notificationRefreshInterval = null;

// ============================================
// AUTH
// ============================================

async function adminLogin() {
    const email = document.getElementById('adminEmail').value.trim();
    const password = document.getElementById('adminPassword').value;
    const btn = document.getElementById('loginBtn');
    const errEl = document.getElementById('loginError');

    errEl.style.display = 'none';
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Signing in...';

    await db.auth.signOut();

    const { data, error } = await db.auth.signInWithPassword({ email, password });

    if (error) {
        errEl.textContent = error.message;
        errEl.style.display = 'block';
        btn.disabled = false;
        btn.innerHTML = 'Sign In';
        return;
    }
    
    localStorage.setItem('summit_trust_admin', JSON.stringify({ 
        email: email, 
        userId: data.user.id, 
        isAdmin: true 
    }));
    
    document.getElementById('adminEmailDisplay').textContent = email;
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('adminShell').style.display = 'block';
    initAdmin();
}

function adminLogout() {
    localStorage.removeItem('summit_trust_admin');
    location.reload();
}

document.addEventListener('DOMContentLoaded', () => {
    const savedAdmin = localStorage.getItem('summit_trust_admin');
    if (savedAdmin) {
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('adminShell').style.display = 'block';
        initAdmin();
    }
});

// ============================================
// INIT
// ============================================

async function initAdmin() {
    await loadKYCSettings();
    await Promise.all([loadUsers(), loadAccounts(), loadJointAccounts(), loadAdminNotifications()]);
    renderAccountsGrid();
    loadTransactions();
    loadCards();
    loadLoans();
    loadInvestments();
    buildNotifTargetOptions();
    loadAllNotifications();
    
    if (notificationRefreshInterval) clearInterval(notificationRefreshInterval);
    notificationRefreshInterval = setInterval(() => {
        if (document.getElementById('adminShell') && document.getElementById('adminShell').style.display === 'block') {
            loadAdminNotifications();
        }
    }, 30000);
}

// ============================================
// TABS
// ============================================

function switchTab(name, btn) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    document.getElementById('tab-' + name).classList.add('active');
    if (btn) btn.classList.add('active');
}

// ============================================
// TOAST
// ============================================

let toastTimer;
function toast(msg, type) {
    const el = document.getElementById('adminToast');
    if (!el) return;
    el.className = 'show t-' + (type || 'info');
    el.innerHTML = '<i class="fas ' + (type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-times-circle' : 'fa-info-circle') + '"></i> ' + msg;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.className = ''; }, 3500);
}

// ============================================
// MODAL
// ============================================

function openModal(id) { const modal = document.getElementById(id); if (modal) modal.classList.add('open'); }
function closeModal(id) { const modal = document.getElementById(id); if (modal) modal.classList.remove('open'); }

function confirmDelete(message, onConfirm) {
    const body = document.getElementById('confirmDeleteBody');
    if (body) body.innerHTML = '<p style="color:var(--text2);">' + message + '</p>';
    const btn = document.getElementById('confirmDeleteBtn');
    if (btn) { btn.onclick = () => { closeModal('confirmDeleteModal'); onConfirm(); }; }
    openModal('confirmDeleteModal');
}

// ============================================
// FORMAT HELPERS
// ============================================

function fmtCurrency(n) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);
}

function fmtDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function escapeHtml(s) {
    if (s === null || s === undefined) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ============================================
// DATA LOADERS
// ============================================

async function loadUsers() {
    // Add 'password' to the select statement
    const { data, error } = await db.from('users').select('id,first_name,last_name,email,profile_picture_url,created_at,phone_number,account_type,joint_account_id,kyc_level,kyc_upgrade_status,kyc_upgrade_requested_to,password');
    
    if (error) {
        console.error('Error loading users:', error);
        toast('Error loading users: ' + error.message, 'error');
        return;
    }
    
    adminState.users = data || [];
    
    // Debug: Log the users to see what's loaded
    console.log('Users loaded:', adminState.users.length);
    if (adminState.users.length > 0) {
        console.log('First user:', adminState.users[0].email, 'Password exists?', !!adminState.users[0].password);
    }
    
    // After loading users, refresh the accounts grid
    renderAccountsGrid();
}

async function loadAccounts() {
    const { data } = await db.from('accounts')
        .select('id,user_id,joint_account_id,balance,btc_balance,ltc_balance,btc_address,ltc_address,gas_balance,gas_wallet_address,gas_wallet_network,status,account_number,allow_withdrawal,withdrawal_alert_msg,created_at')
        .order('created_at', { ascending: false });
    adminState.accounts = data || [];
}

async function loadJointAccounts() {
    const { data } = await db.from('joint_accounts')
        .select('id,primary_user_id,secondary_user_id,account_name,status,created_at,secondary_user_email,secondary_user_phone,kyc_level,kyc_upgrade_status,kyc_upgrade_requested_to')
        .order('created_at', { ascending: false });
    adminState.jointAccounts = data || [];
}

async function loadKYCSettings() {
    const { data } = await db.from('kyc_levels').select('*').order('id', { ascending: true });
    adminState.kycLevels = data || [];
    renderKYCTable();
}

async function loadAdminNotifications() {
    const { data } = await db.from('admin_notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
    adminState.adminNotifications = data || [];
    renderNotificationsDropdown();
    updateNotificationBadge();
}



async function loadAllNotifications() {
    const { data } = await db.from('notifications').select('*').order('created_at', { ascending: false }).limit(100);
    adminState.notifications = data || [];
    renderNotifAdminTable();
}

// ============================================
// NOTIFICATION SYSTEM
// ============================================

function updateNotificationBadge() {
    const unreadCount = adminState.adminNotifications.filter(n => !n.is_read).length;
    const badge = document.getElementById('notificationBadge');
    if (badge) {
        if (unreadCount > 0) {
            badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
            badge.style.display = 'inline-flex';
        } else {
            badge.style.display = 'none';
        }
    }
}

function renderNotificationsDropdown() {
    const container = document.getElementById('notificationsDropdownList');
    if (!container) return;
    
    if (!adminState.adminNotifications.length) {
        container.innerHTML = '<div class="empty-notifications"><i class="fas fa-bell-slash"></i><p>No notifications</p></div>';
        return;
    }
    
    let html = '';
    for (const notif of adminState.adminNotifications.slice(0, 20)) {
        const unreadClass = !notif.is_read ? 'unread' : '';
        let actionButton = '';
        
        if (notif.action_type === 'review_kyc' && notif.action_data) {
            actionButton = `<div class="notification-actions">
                <button class="btn btn-success btn-sm" onclick="event.stopPropagation(); approveKYCUpgradeFromNotif('${notif.id}')">Approve</button>
                <button class="btn btn-danger btn-sm" onclick="event.stopPropagation(); rejectKYCUpgradeFromNotif('${notif.id}')">Reject</button>
            </div>`;
        } else if (notif.action_type === 'review_loan') {
            actionButton = `<div class="notification-actions">
                <button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); switchTab('loans', document.querySelector('.tab-btn[onclick*=\"loans\"]')); toggleAdminNotifications();">Review Loan</button>
            </div>`;
        } else if (notif.action_type === 'review_card') {
            actionButton = `<div class="notification-actions">
                <button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); switchTab('cards', document.querySelector('.tab-btn[onclick*=\"cards\"]')); toggleAdminNotifications();">Review Card</button>
            </div>`;
        } else if (notif.action_type === 'view_transaction') {
            actionButton = `<div class="notification-actions">
                <button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); switchTab('transactions', document.querySelector('.tab-btn[onclick*=\"transactions\"]')); toggleAdminNotifications();">View</button>
            </div>`;
        }
        
        html += `<div class="notification-item ${unreadClass}" onclick="markNotificationRead('${notif.id}')">
            <div class="notification-title">${escapeHtml(notif.title)}</div>
            <div class="notification-message">${escapeHtml(notif.message)}</div>
            <div class="notification-time">${fmtDate(notif.created_at)}</div>
            ${actionButton}
        </div>`;
    }
    
    if (adminState.adminNotifications.length > 20) {
        html += `<div class="notification-item" style="text-align:center;">
            <small>${adminState.adminNotifications.length - 20} more notifications...</small>
        </div>`;
    }
    
    container.innerHTML = html;
}

function toggleAdminNotifications() {
    const dropdown = document.getElementById('adminNotificationsDropdown');
    if (!dropdown) return;
    
    if (dropdown.style.display === 'none' || dropdown.style.display === '') {
        dropdown.style.display = 'block';
        renderNotificationsDropdown();
        setTimeout(() => {
            document.addEventListener('click', function closeDropdown(e) {
                const bell = document.querySelector('.notifications-bell');
                if (bell && !bell.contains(e.target) && !dropdown.contains(e.target)) {
                    dropdown.style.display = 'none';
                    document.removeEventListener('click', closeDropdown);
                }
            });
        }, 100);
    } else {
        dropdown.style.display = 'none';
    }
}

async function markNotificationRead(id) {
    try {
        const { error } = await db.from('admin_notifications').update({ is_read: true }).eq('id', id);
        if (error) throw error;
        await loadAdminNotifications();
        toast('Notification marked as read', 'success');
    } catch (err) {
        toast('Error: ' + err.message, 'error');
    }
}

async function markAllNotificationsRead() {
    try {
        const { error } = await db.from('admin_notifications')
            .update({ is_read: true })
            .eq('is_read', false);
        if (error) throw error;
        await loadAdminNotifications();
        toast('All notifications marked as read', 'success');
    } catch (err) {
        toast('Error: ' + err.message, 'error');
    }
}

async function deleteNotification(id) {
    confirmDelete('Delete this notification?', async () => {
        try {
            const { error } = await db.from('admin_notifications').delete().eq('id', id);
            if (error) throw error;
            await loadAdminNotifications();
            toast('Notification deleted', 'success');
        } catch (err) {
            toast('Error: ' + err.message, 'error');
        }
    });
}

async function deleteAllNotifications() {
    confirmDelete('Delete ALL notifications? This action cannot be undone.', async () => {
        try {
            const { error } = await db.from('admin_notifications').delete().neq('id', '00000000-0000-0000-0000-000000000000');
            if (error) throw error;
            await loadAdminNotifications();
            toast('All notifications deleted', 'success');
        } catch (err) {
            toast('Error: ' + err.message, 'error');
        }
    });
}

async function approveKYCUpgradeFromNotif(notificationId) {
    const notif = adminState.adminNotifications.find(n => n.id === notificationId);
    if (!notif || !notif.action_data) return;
    
    try {
        const data = notif.action_data;
        if (data.is_joint) {
            await db.from('joint_accounts').update({
                kyc_level: data.new_level,
                kyc_upgrade_status: null,
                kyc_upgrade_requested_to: null,
                updated_at: new Date().toISOString()
            }).eq('id', data.joint_id);
        } else {
            await db.from('users').update({
                kyc_level: data.new_level,
                kyc_upgrade_status: null,
                kyc_upgrade_requested_to: null,
                updated_at: new Date().toISOString()
            }).eq('id', data.user_id);
        }
        
        await db.from('admin_notifications').update({ is_read: true }).eq('id', notificationId);
        
        toast('KYC upgrade approved successfully', 'success');
        await loadUsers();
        await loadJointAccounts();
        await loadAdminNotifications();
        renderAccountsGrid();
        renderNotificationsDropdown();
    } catch (err) {
        toast('Error: ' + err.message, 'error');
    }
}

async function rejectKYCUpgradeFromNotif(notificationId) {
    try {
        await db.from('admin_notifications').update({ is_read: true }).eq('id', notificationId);
        await loadAdminNotifications();
        toast('KYC upgrade rejected', 'warning');
        renderNotificationsDropdown();
    } catch (err) {
        toast('Error: ' + err.message, 'error');
    }
}

// ============================================
// ACCOUNTS GRID
// ============================================

function filterAccounts() { renderAccountsGrid(); }

function getUserById(id) {
    return adminState.users.find(u => u.id === id) || {};
}

function getKYCLevelName(levelId) {
    const level = adminState.kycLevels.find(l => l.id === levelId);
    return level ? level.level_name : 'Level ' + levelId;
}

function renderAccountsGrid() {
    const search = (document.getElementById('acctSearch')?.value || '').toLowerCase();
    const typeF = document.getElementById('acctTypeFilter')?.value;
    const sortF = document.getElementById('acctSortFilter')?.value;

    let items = [];

    adminState.accounts.forEach(acct => {
        if (acct.joint_account_id) return;
        const user = getUserById(acct.user_id);
        if (!user.id) return;
        const name = ((user.first_name || '') + ' ' + (user.last_name || '')).trim() || '—';
        
        const unreadCount = adminState.adminNotifications.filter(n => n.user_id === user.id && !n.is_read).length;
        
        items.push({ 
            type: 'personal', 
            name, 
            email: user.email || '', 
            acct, 
            user, 
            user2: null,
            balance: parseFloat(acct.balance || 0), 
            gasBalance: parseFloat(acct.gas_balance || 0),
            created: acct.created_at,
            unreadNotifs: unreadCount,
            userId: user.id,
            jointId: null
        });
    });

    adminState.jointAccounts.forEach(ja => {
        const accounts = adminState.accounts.filter(a => a.joint_account_id === ja.id);
        const acct = accounts[0] || {};
        const u1 = getUserById(ja.primary_user_id);
        const u2 = getUserById(ja.secondary_user_id);
        
        const firstName1 = u1.first_name || '';
        const firstName2 = u2.first_name || '';
        
        let name;
        if (firstName1 && firstName2) {
            name = firstName1 + ' & ' + firstName2;
        } else if (firstName1) {
            name = firstName1 + ' (Joint)';
        } else {
            name = 'Joint Account';
        }
        
        let totalBalance = 0;
        let totalGasBalance = 0;
        accounts.forEach(a => {
            totalBalance += parseFloat(a.balance || 0);
            totalGasBalance += parseFloat(a.gas_balance || 0);
        });
        
        let btcAddr = '', ltcAddr = '', gasAddr = '', gasNet = '';
        accounts.forEach(a => {
            if (!btcAddr && a.btc_address) btcAddr = a.btc_address;
            if (!ltcAddr && a.ltc_address) ltcAddr = a.ltc_address;
            if (!gasAddr && a.gas_wallet_address) { 
                gasAddr = a.gas_wallet_address; 
                gasNet = a.gas_wallet_network; 
            }
        });
        
        const unreadCount = adminState.adminNotifications.filter(n => n.joint_account_id === ja.id && !n.is_read).length;
        
        items.push({ 
            type: 'joint', 
            name, 
            email: '',
            acct: acct || {}, 
            joint: ja, 
            user: u1, 
            user2: u2, 
            balance: totalBalance,
            gasBalance: totalGasBalance,
            created: ja.created_at,
            unreadNotifs: unreadCount,
            userId: u1.id,
            jointId: ja.id,
            btcAddress: btcAddr,
            ltcAddress: ltcAddr,
            gasAddress: gasAddr,
            gasNetwork: gasNet
        });
    });

    if (search) {
        items = items.filter(i => i.name.toLowerCase().includes(search) || i.email.toLowerCase().includes(search));
    }
    if (typeF) {
        items = items.filter(i => i.type === typeF);
    }

    items.sort((a, b) => {
        if (sortF === 'name_asc') return a.name.localeCompare(b.name);
        if (sortF === 'name_desc') return b.name.localeCompare(a.name);
        if (sortF === 'balance_desc') return b.balance - a.balance;
        if (sortF === 'balance_asc') return a.balance - b.balance;
        if (sortF === 'created_asc') return new Date(a.created) - new Date(b.created);
        return new Date(b.created) - new Date(a.created);
    });

    const grid = document.getElementById('accountsGrid');
    if (!grid) return;
    
    if (!items.length) {
        grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text2);">No accounts found.</div>';
        return;
    }

    grid.innerHTML = items.map(item => {
        const acct = item.acct;
        const acctId = acct.id || '';
        const avatar = item.user.profile_picture_url
            ? '<img src="' + escapeHtml(item.user.profile_picture_url) + '" class="avatar">'
            : '<div class="avatar">' + escapeHtml((item.name[0] || '?').toUpperCase()) + '</div>';

        let kycLevel = 1;
        let kycStatus = '';
        if (item.type === 'joint' && item.joint) {
            kycLevel = item.joint.kyc_level || 1;
            kycStatus = item.joint.kyc_upgrade_status;
        } else if (item.user) {
            kycLevel = item.user.kyc_level || 1;
            kycStatus = item.user.kyc_upgrade_status;
        }
        
        const kycBadge = kycStatus === 'pending' 
            ? '<span class="badge badge-warning" style="margin-left:8px;">Upgrade Pending</span>'
            : '';

        let notifBadge = '';
        if (item.unreadNotifs > 0) {
            notifBadge = `<div class="user-notif-badge" onclick="event.stopPropagation();showUserNotifications('${item.userId}', '${item.jointId || ''}')" title="${item.unreadNotifs} unread notification${item.unreadNotifs > 1 ? 's' : ''}">
                ${item.unreadNotifs}
            </div>`;
        }

        let wallets = '';
        const btcAddr = item.btcAddress || acct.btc_address;
        const ltcAddr = item.ltcAddress || acct.ltc_address;
        const gasAddr = item.gasAddress || acct.gas_wallet_address;
        const gasNet = item.gasNetwork || acct.gas_wallet_network;
        
        if (btcAddr) wallets += '<div class="account-wallet-row"><i class="fab fa-bitcoin"></i> ' + escapeHtml(btcAddr.slice(0, 10)) + '...</div>';
        if (ltcAddr) wallets += '<div class="account-wallet-row"><i class="fas fa-coins"></i> ' + escapeHtml(ltcAddr.slice(0, 10)) + '...</div>';
        if (gasAddr) {
            wallets += '<div class="account-wallet-row"><i class="fas fa-wallet"></i> ' + escapeHtml(gasAddr.slice(0, 10)) + '... (' + escapeHtml(gasNet || 'TRC20') + ')</div>';
        }

        const wdLocked = acct.allow_withdrawal === false;
        const wdBadge = wdLocked
            ? '<div class="withdrawal-disabled-badge"><i class="fas fa-ban"></i><span>Withdrawals DISABLED</span></div>'
            : '';

        const userId1 = item.user ? item.user.id : '';
        const userId2 = item.user2 ? item.user2.id : '';
        const jointId = item.joint ? item.joint.id : '';

        return `<div class="account-card">
            <div class="account-card-header">
                <div class="account-card-user">
                    ${avatar}
                    <div>
                        <div class="account-card-name">${escapeHtml(item.name)}</div>
                        ${item.type === 'personal' ? `<div class="account-card-email">${escapeHtml(item.email)}</div>` : ''}
                    </div>
                </div>
                <div class="account-card-badges">
                    ${notifBadge}
                    <span class="badge badge-${item.type}">${item.type}</span>
                    <span class="badge badge-info">KYC: ${getKYCLevelName(kycLevel)}</span>
                    ${kycBadge}
                </div>
            </div>
            <div class="account-balance">${fmtCurrency(item.balance)}</div>
            <div class="account-balance-label">Available Balance</div>
            ${item.gasBalance ? `<div class="account-gas-balance">Gas: ${fmtCurrency(item.gasBalance)}</div>` : ''}
            ${wallets}
            ${wdBadge}
            <div class="account-card-actions">
                <button class="btn btn-ghost btn-sm" onclick="openEditAccount('${acctId}','${item.type}','${jointId}','${userId1}','${userId2}')"><i class="fas fa-user-edit"></i> Edit User</button>
                <button class="btn btn-ghost btn-sm" onclick="openEditBalance('${acctId}')"><i class="fas fa-dollar-sign"></i> Balance</button>
                <button class="btn btn-ghost btn-sm" onclick="openEditWallets('${acctId}')"><i class="fas fa-wallet"></i> Wallets</button>
                <button class="btn btn-primary btn-sm" onclick="showKYCUpgradeModal('${userId1}','${item.type}','${jointId}')"><i class="fas fa-id-card"></i> Upgrade KYC</button>
                <button class="btn btn-danger btn-sm" onclick="deleteAccountForce('${acctId}','${escapeHtml(item.name)}','${jointId}','${userId1}','${userId2}')"><i class="fas fa-trash"></i> Delete</button>
            </div>
        </div>`;
    }).join('');
}

function showUserNotifications(userId, jointId) {
    const userNotifs = adminState.adminNotifications.filter(n => {
        if (userId && n.user_id === userId && !n.is_read) return true;
        if (jointId && n.joint_account_id === jointId && !n.is_read) return true;
        return false;
    });
    
    let html = '<div style="max-height:400px;overflow-y:auto;">';
    if (!userNotifs.length) {
        html += '<p style="text-align:center;padding:20px;color:var(--text-secondary);">No unread notifications</p>';
    } else {
        userNotifs.forEach(notif => {
            html += `<div class="notification-item unread" style="cursor:pointer;" onclick="markNotificationRead('${notif.id}');closeModal('userNotifModal');loadAccounts();renderAccountsGrid();">
                <div class="notification-title">${escapeHtml(notif.title)}</div>
                <div class="notification-message">${escapeHtml(notif.message)}</div>
                <div class="notification-time">${fmtDate(notif.created_at)}</div>
            </div>`;
        });
    }
    html += '</div>';
    
    let modal = document.getElementById('userNotifModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'userNotifModal';
        modal.className = 'modal-overlay';
        modal.innerHTML = `<div class="modal-box" style="max-width:450px;">
            <div class="modal-header">
                <span class="modal-title"><i class="fas fa-bell"></i> Notifications</span>
                <button class="modal-close" onclick="closeModal('userNotifModal')"><i class="fas fa-times"></i></button>
            </div>
            <div class="modal-body" id="userNotifBody"></div>
        </div>`;
        document.body.appendChild(modal);
    }
    
    const body = document.getElementById('userNotifBody');
    if (body) body.innerHTML = html;
    openModal('userNotifModal');
}

// ============================================
// KYC MANAGEMENT
// ============================================

function renderKYCTable() {
    const container = document.getElementById('kycLevelsList');
    if (!container) return;
    
    if (!adminState.kycLevels.length) {
        container.innerHTML = '<div style="text-align:center;padding:40px;">No KYC levels found. Click "Add KYC Level" to create one.</div>';
        return;
    }
    
    let html = '<table class="data-table"><thead><tr><th>Level</th><th>Name</th><th>Fee</th><th>Daily Limit</th><th>Monthly Limit</th><th>Invest</th><th>Loan</th><th>Card</th><th>Actions</th></tr></thead><tbody>';
    for (const level of adminState.kycLevels) {
        html += `<tr>
            <td><strong>Level ${level.id}</strong></td>
            <td>${escapeHtml(level.level_name)}</td>
            <td>${fmtCurrency(level.fee_amount)}</td>
            <td>${fmtCurrency(level.daily_transfer_limit)}</td>
            <td>${fmtCurrency(level.monthly_transfer_limit)}</td>
            <td>${level.can_invest ? '<span class="badge badge-success">✓</span>' : '<span class="badge badge-muted">✗</span>'}</td>
            <td>${level.can_apply_loan ? '<span class="badge badge-success">✓</span>' : '<span class="badge badge-muted">✗</span>'}</td>
            <td>${level.can_apply_card ? '<span class="badge badge-success">✓</span>' : '<span class="badge badge-muted">✗</span>'}</td>
            <td><button class="btn btn-sm btn-primary" onclick="editKYCMode(${level.id})">Edit</button></td>
        </tr>`;
    }
    html += '</tbody></table>';
    container.innerHTML = html;
}

function showKYCUpgradeModal(userId, accountType, jointId) {
    const isJoint = accountType === 'joint';
    let currentLevel = 1;
    
    if (isJoint) {
        const joint = adminState.jointAccounts.find(j => j.id === jointId);
        currentLevel = joint?.kyc_level || 1;
    } else {
        const user = getUserById(userId);
        currentLevel = user?.kyc_level || 1;
    }
    
    let upgradeOptions = '';
    for (const level of adminState.kycLevels) {
        if (level.id > currentLevel) {
            upgradeOptions += `<option value="${level.id}">${escapeHtml(level.level_name)} - ${fmtCurrency(level.fee_amount)}</option>`;
        }
    }
    
    const body = document.getElementById('kycModalBody');
    if (!body) return;
    
    body.innerHTML = `<div style="margin-bottom:20px;">
        <p><strong>Current KYC Level:</strong> ${getKYCLevelName(currentLevel)}</p>
        <p><strong>Account Type:</strong> ${isJoint ? 'Joint Account' : 'Personal Account'}</p>
    </div>
    <div class="form-group">
        <label class="form-label">Upgrade to Level</label>
        <select id="kycLevelSelect" class="form-select">${upgradeOptions}</select>
    </div>
    <div class="alert alert-info">
        <i class="fas fa-info-circle"></i>
        <span>The fee will be deducted from the user's gas balance.</span>
    </div>
    <div style="display:flex;gap:10px;margin-top:20px;">
        <button class="btn btn-ghost" style="flex:1;" onclick="closeModal('kycModal')">Cancel</button>
        <button class="btn btn-primary" style="flex:1;" id="kycConfirmBtn" onclick="confirmKYCUpgrade('${userId}', ${isJoint}, '${jointId}')">Confirm Upgrade</button>
    </div>`;
    openModal('kycModal');
}

async function confirmKYCUpgrade(userId, isJoint, jointId) {
    const newLevel = parseInt(document.getElementById('kycLevelSelect').value);
    const btn = document.getElementById('kycConfirmBtn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Processing...'; }
    
    try {
        if (isJoint) {
            await db.from('joint_accounts').update({
                kyc_level: newLevel,
                kyc_upgrade_status: null,
                kyc_upgrade_requested_to: null
            }).eq('id', jointId);
        } else {
            await db.from('users').update({
                kyc_level: newLevel,
                kyc_upgrade_status: null,
                kyc_upgrade_requested_to: null
            }).eq('id', userId);
        }
        
        toast('KYC upgraded successfully', 'success');
        closeModal('kycModal');
        await loadUsers();
        await loadJointAccounts();
        renderAccountsGrid();
    } catch (err) {
        toast('Error: ' + err.message, 'error');
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = 'Confirm Upgrade'; }
    }
}

function editKYCMode(levelId) {
    const level = adminState.kycLevels.find(l => l.id === levelId);
    if (!level) return;
    
    const body = document.getElementById('editKYCModeBody');
    if (!body) return;
    
    body.innerHTML = `<div class="form-group">
        <label class="form-label">Level Name</label>
        <input type="text" id="editLevelName" class="form-input" value="${escapeHtml(level.level_name)}">
    </div>
    <div class="form-group">
        <label class="form-label">Fee Amount (USD)</label>
        <input type="number" id="editFeeAmount" class="form-input" step="0.01" value="${level.fee_amount}">
    </div>
    <div class="form-group">
        <label class="form-label">Daily Transfer Limit</label>
        <input type="number" id="editDailyLimit" class="form-input" step="0.01" value="${level.daily_transfer_limit}">
    </div>
    <div class="form-group">
        <label class="form-label">Monthly Transfer Limit</label>
        <input type="number" id="editMonthlyLimit" class="form-input" step="0.01" value="${level.monthly_transfer_limit}">
    </div>
    <div class="form-group">
        <label class="form-checkbox">
            <input type="checkbox" id="editCanInvest" ${level.can_invest ? 'checked' : ''}>
            <span>Can Invest</span>
        </label>
    </div>
    <div class="form-group">
        <label class="form-checkbox">
            <input type="checkbox" id="editCanApplyLoan" ${level.can_apply_loan ? 'checked' : ''}>
            <span>Can Apply for Loan</span>
        </label>
    </div>
    <div class="form-group">
        <label class="form-checkbox">
            <input type="checkbox" id="editCanApplyCard" ${level.can_apply_card ? 'checked' : ''}>
            <span>Can Apply for Card</span>
        </label>
    </div>
    <div style="display:flex;gap:10px;margin-top:20px;">
        <button class="btn btn-ghost" style="flex:1;" onclick="closeModal('editKYCModeModal')">Cancel</button>
        <button class="btn btn-primary" style="flex:1;" onclick="saveKYCMode(${level.id})">Save Changes</button>
    </div>`;
    openModal('editKYCModeModal');
}

async function saveKYCMode(levelId) {
    const levelName = document.getElementById('editLevelName').value;
    const feeAmount = parseFloat(document.getElementById('editFeeAmount').value);
    const dailyLimit = parseFloat(document.getElementById('editDailyLimit').value);
    const monthlyLimit = parseFloat(document.getElementById('editMonthlyLimit').value);
    const canInvest = document.getElementById('editCanInvest').checked;
    const canApplyLoan = document.getElementById('editCanApplyLoan').checked;
    const canApplyCard = document.getElementById('editCanApplyCard').checked;
    
    const { error } = await db.from('kyc_levels').update({
        level_name: levelName,
        fee_amount: feeAmount,
        daily_transfer_limit: dailyLimit,
        monthly_transfer_limit: monthlyLimit,
        can_invest: canInvest,
        can_apply_loan: canApplyLoan,
        can_apply_card: canApplyCard
    }).eq('id', levelId);
    
    if (error) { toast('Error: ' + error.message, 'error'); return; }
    toast('KYC level updated successfully', 'success');
    closeModal('editKYCModeModal');
    await loadKYCSettings();
}

function showAddKYCModal() {
    const body = document.getElementById('addKYCModeBody');
    if (!body) return;
    
    body.innerHTML = `<div class="form-group">
        <label class="form-label">Level Number</label>
        <input type="number" id="newLevelId" class="form-input" placeholder="4">
    </div>
    <div class="form-group">
        <label class="form-label">Level Name</label>
        <input type="text" id="newLevelName" class="form-input" placeholder="Premium">
    </div>
    <div class="form-group">
        <label class="form-label">Fee Amount (USD)</label>
        <input type="number" id="newFeeAmount" class="form-input" step="0.01" placeholder="500">
    </div>
    <div class="form-group">
        <label class="form-label">Daily Transfer Limit</label>
        <input type="number" id="newDailyLimit" class="form-input" step="0.01" placeholder="100000">
    </div>
    <div class="form-group">
        <label class="form-label">Monthly Transfer Limit</label>
        <input type="number" id="newMonthlyLimit" class="form-input" step="0.01" placeholder="1000000">
    </div>
    <div class="form-group">
        <label class="form-checkbox">
            <input type="checkbox" id="newCanInvest">
            <span>Can Invest</span>
        </label>
    </div>
    <div class="form-group">
        <label class="form-checkbox">
            <input type="checkbox" id="newCanApplyLoan">
            <span>Can Apply for Loan</span>
        </label>
    </div>
    <div class="form-group">
        <label class="form-checkbox">
            <input type="checkbox" id="newCanApplyCard">
            <span>Can Apply for Card</span>
        </label>
    </div>
    <div style="display:flex;gap:10px;margin-top:20px;">
        <button class="btn btn-ghost" style="flex:1;" onclick="closeModal('addKYCModeModal')">Cancel</button>
        <button class="btn btn-primary" style="flex:1;" onclick="addKYCMode()">Add KYC Level</button>
    </div>`;
    openModal('addKYCModeModal');
}

async function addKYCMode() {
    const levelId = parseInt(document.getElementById('newLevelId').value);
    const levelName = document.getElementById('newLevelName').value;
    const feeAmount = parseFloat(document.getElementById('newFeeAmount').value);
    const dailyLimit = parseFloat(document.getElementById('newDailyLimit').value);
    const monthlyLimit = parseFloat(document.getElementById('newMonthlyLimit').value);
    const canInvest = document.getElementById('newCanInvest').checked;
    const canApplyLoan = document.getElementById('newCanApplyLoan').checked;
    const canApplyCard = document.getElementById('newCanApplyCard').checked;
    
    const { error } = await db.from('kyc_levels').insert([{
        id: levelId,
        level_name: levelName,
        fee_amount: feeAmount,
        daily_transfer_limit: dailyLimit,
        monthly_transfer_limit: monthlyLimit,
        can_invest: canInvest,
        can_apply_loan: canApplyLoan,
        can_apply_card: canApplyCard
    }]);
    
    if (error) { toast('Error: ' + error.message, 'error'); return; }
    toast('KYC level added successfully', 'success');
    closeModal('addKYCModeModal');
    await loadKYCSettings();
}

// ============================================
// SUPPORT TICKETS
// ============================================

function renderSupportTickets() {
    const container = document.getElementById('supportTicketsList');
    if (!container) return;
    
    if (!adminState.supportTickets.length) {
        container.innerHTML = '<div style="text-align:center;padding:40px;">No support tickets</div>';
        return;
    }
    
    let html = '<table class="data-table"><thead><tr><th>Ticket #</th><th>User</th><th>Subject</th><th>Category</th><th>Priority</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead><tbody>';
    for (const ticket of adminState.supportTickets) {
        const user = ticket.users || {};
        html += `<tr>
            <td>${escapeHtml(ticket.ticket_number)}</td>
            <td>${escapeHtml((user.first_name || '') + ' ' + (user.last_name || ''))}</td>
            <td>${escapeHtml(ticket.subject)}</td>
            <td><span class="badge">${escapeHtml(ticket.category)}</span></td>
            <td><span class="badge badge-${ticket.priority}">${escapeHtml(ticket.priority)}</span></td>
            <td><span class="badge badge-${ticket.status}">${escapeHtml(ticket.status)}</span></td>
            <td>${fmtDate(ticket.created_at)}</td>
            <td><button class="btn btn-sm btn-primary" onclick="viewSupportTicket('${ticket.id}')">View & Respond</button></td>
        </tr>`;
    }
    html += '</tbody></table>';
    container.innerHTML = html;
}

function viewSupportTicket(ticketId) {
    const ticket = adminState.supportTickets.find(t => t.id === ticketId);
    if (!ticket) return;
    const user = ticket.users || {};
    
    const body = document.getElementById('supportTicketModalBody');
    if (!body) return;
    
    body.innerHTML = `<div class="ticket-details">
        <div class="ticket-info">
            <p><strong>Ticket #:</strong> ${escapeHtml(ticket.ticket_number)}</p>
            <p><strong>From:</strong> ${escapeHtml((user.first_name || '') + ' ' + (user.last_name || ''))}</p>
            <p><strong>Subject:</strong> ${escapeHtml(ticket.subject)}</p>
            <p><strong>Category:</strong> ${escapeHtml(ticket.category)}</p>
            <p><strong>Priority:</strong> ${escapeHtml(ticket.priority)}</p>
            <p><strong>Status:</strong> ${escapeHtml(ticket.status)}</p>
            <p><strong>Date:</strong> ${fmtDate(ticket.created_at)}</p>
        </div>
        <div class="ticket-message">
            <strong>Message:</strong>
            <p>${escapeHtml(ticket.message)}</p>
        </div>
        ${ticket.admin_response ? `<div class="ticket-response">
            <strong>Admin Response:</strong>
            <p>${escapeHtml(ticket.admin_response)}</p>
            <small>Responded: ${fmtDate(ticket.responded_at)}</small>
        </div>` : ''}
        <div class="form-group">
            <label class="form-label">Response</label>
            <textarea id="ticketResponse" class="form-input" rows="4" placeholder="Type your response here..."></textarea>
        </div>
        <div class="ticket-actions">
            <select id="ticketStatus" class="form-select">
                <option value="open" ${ticket.status === 'open' ? 'selected' : ''}>Open</option>
                <option value="in_progress" ${ticket.status === 'in_progress' ? 'selected' : ''}>In Progress</option>
                <option value="resolved" ${ticket.status === 'resolved' ? 'selected' : ''}>Resolved</option>
                <option value="closed" ${ticket.status === 'closed' ? 'selected' : ''}>Closed</option>
            </select>
            <button class="btn btn-primary" onclick="submitTicketResponse('${ticket.id}')">Send Response</button>
        </div>
    </div>`;
    openModal('supportTicketModal');
}

async function submitTicketResponse(ticketId) {
    const response = document.getElementById('ticketResponse')?.value.trim();
    const status = document.getElementById('ticketStatus')?.value;
    
    if (!response) { toast('Please enter a response', 'error'); return; }
    
    const { error } = await db.from('support_tickets').update({
        admin_response: response,
        status: status,
        responded_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    }).eq('id', ticketId);
    
    if (error) { toast('Error: ' + error.message, 'error'); return; }
    toast('Response sent successfully', 'success');
    closeModal('supportTicketModal');
    await loadSupportTickets();
}

// ============================================
// EDIT USER INFO, BALANCE, WALLETS
// ============================================

function openEditAccount(acctId, type, jointId, userId1, userId2) {
    const body = document.getElementById('editAccountBody');
    if (!body) return;
    
    if ((userId1 && userId1 !== 'null') || (jointId && jointId !== 'null')) {
        let u1 = userId1 && userId1 !== 'null' ? getUserById(userId1) : {};
        let u2 = userId2 && userId2 !== 'null' ? getUserById(userId2) : {};
        
        if (jointId && jointId !== 'null' && (!u1.id || !u2.id)) {
            const ja = adminState.jointAccounts.find(j => j.id === jointId) || {};
            if (ja.primary_user_id && !u1.id) u1 = getUserById(ja.primary_user_id);
            if (ja.secondary_user_id && !u2.id) u2 = getUserById(ja.secondary_user_id);
        }
        
        const u1Label = escapeHtml(((u1.first_name || '') + ' ' + (u1.last_name || '')).trim()) || 'User 1';
        const u2Label = escapeHtml(((u2.first_name || '') + ' ' + (u2.last_name || '')).trim()) || (u2.id ? 'User 2' : 'Pending User');
        const u1Id = u1.id || '';
        const u2Id = u2.id || '';
        
        const tabBar = `<div class="edit-user-tabs">
            <button id="ea_tab1" onclick="switchEditUserTab(1)" class="active"><i class="fas fa-user"></i> ${u1Label}</button>
            <button id="ea_tab2" onclick="switchEditUserTab(2)"><i class="fas fa-user"></i> ${u2Label}</button>
        </div>`;
        
        const panel1 = `<div id="ea_panel1">
            ${userEditFields('1', u1)}
            <div class="edit-actions">
                <button class="btn btn-ghost" onclick="closeModal('editAccountModal')">Cancel</button>
                <button class="btn btn-primary" data-uid="${u1Id}" data-sfx="1" onclick="saveUserInfo(this.dataset.uid,this.dataset.sfx)"><i class="fas fa-save"></i> Save ${u1Label}</button>
            </div>
        </div>`;
        
        const panel2 = `<div id="ea_panel2" style="display:none;">
            ${userEditFields('2', u2)}
            <div class="edit-actions">
                <button class="btn btn-ghost" onclick="closeModal('editAccountModal')">Cancel</button>
                <button class="btn btn-primary" data-uid="${u2Id}" data-sfx="2" onclick="saveUserInfo(this.dataset.uid,this.dataset.sfx)"><i class="fas fa-save"></i> Save ${u2Label}</button>
            </div>
        </div>`;
        
        body.innerHTML = tabBar + panel1 + panel2;
    } else if (acctId && acctId !== 'null') {
        const acct = adminState.accounts.find(a => a.id === acctId) || {};
        const user = getUserById(acct.user_id) || {};
        const uid = user.id || '';
        body.innerHTML = userEditFields('', user) + `
            <div class="edit-actions">
                <button class="btn btn-ghost" onclick="closeModal('editAccountModal')">Cancel</button>
                <button class="btn btn-primary" data-uid="${uid}" data-sfx="" onclick="saveUserInfo(this.dataset.uid,this.dataset.sfx)"><i class="fas fa-save"></i> Save</button>
            </div>`;
    } else {
        body.innerHTML = '<p style="color:var(--error);">No user data available to edit.</p>';
    }
    
    openModal('editAccountModal');
}

function userEditFields(suffix, user) {
    const s = suffix ? '_' + suffix : '';
    const avatar = user.profile_picture_url
        ? `<img src="${escapeHtml(user.profile_picture_url)}" class="edit-avatar">`
        : `<div class="edit-avatar-placeholder"><i class="fas fa-user"></i></div>`;
    
    // This gets the plain text password from the user object
    const passwordValue = user.password || '';
    const maskedPassword = passwordValue ? '•'.repeat(Math.min(passwordValue.length, 12)) : 'Not set';
    
    return avatar + `
        <div class="form-group"><label class="form-label">First Name</label>
        <input type="text" id="ea_first${s}" class="form-input" value="${escapeHtml(user.first_name || '')}"></div>
        <div class="form-group"><label class="form-label">Last Name</label>
        <input type="text" id="ea_last${s}" class="form-input" value="${escapeHtml(user.last_name || '')}"></div>
        <div class="form-group"><label class="form-label">Email</label>
        <input type="email" id="ea_email${s}" class="form-input" value="${escapeHtml(user.email || '')}"></div>
        <div class="form-group"><label class="form-label">Phone Number</label>
        <input type="tel" id="ea_phone${s}" class="form-input" value="${escapeHtml(user.phone_number || '')}"></div>
        <div class="form-group"><label class="form-label">Profile Photo URL</label>
        <input type="text" id="ea_photo${s}" class="form-input" value="${escapeHtml(user.profile_picture_url || '')}" placeholder="https://..."></div>
        <div class="form-group"><label class="form-label">Password (Read Only)</label>
        <div style="position:relative;">
            <input type="password" id="ea_password${s}" class="form-input" value="${escapeHtml(passwordValue)}" readonly disabled 
                   style="background:var(--bg-tertiary); color:var(--text-secondary); cursor:not-allowed; font-family:monospace;">
            <button type="button" class="toggle-password-btn" onclick="togglePasswordVisibility('ea_password${s}')" 
                    style="position:absolute; right:10px; top:50%; transform:translateY(-50%); background:none; border:none; cursor:pointer; color:var(--text-secondary);">
                <i class="fas fa-eye"></i>
            </button>
        </div>
        <small style="color:var(--text-secondary); font-size:.7rem;">Password cannot be edited here. Users must use "Forgot Password" to change it.</small>
        </div>`;
}

function switchEditUserTab(n) {
    const p1 = document.getElementById('ea_panel1');
    const p2 = document.getElementById('ea_panel2');
    const t1 = document.getElementById('ea_tab1');
    const t2 = document.getElementById('ea_tab2');
    if (!p1 || !p2) return;
    
    p1.style.display = n === 1 ? 'block' : 'none';
    p2.style.display = n === 2 ? 'block' : 'none';
    
    if (t1) t1.classList.toggle('active', n === 1);
    if (t2) t2.classList.toggle('active', n === 2);
}


window.togglePasswordVisibility = function(inputId) {
    const input = document.getElementById(inputId);
    const btn = input?.parentElement?.querySelector('.toggle-password-btn i');
    if (input) {
        if (input.type === 'password') {
            input.type = 'text';
            if (btn) btn.className = 'fas fa-eye-slash';
        } else {
            input.type = 'password';
            if (btn) btn.className = 'fas fa-eye';
        }
    }
};


async function saveUserInfo(userId, suffix) {
    if (!userId) { toast('User ID missing', 'error'); return; }
    const s = suffix ? '_' + suffix : '';
    const first = document.getElementById('ea_first' + s)?.value || '';
    const last = document.getElementById('ea_last' + s)?.value || '';
    const email = document.getElementById('ea_email' + s)?.value || '';
    const phone = document.getElementById('ea_phone' + s)?.value || '';
    const photo = document.getElementById('ea_photo' + s)?.value || '';
    // Password is NOT included in the update
    
    const { error } = await db.from('users').update({
        first_name: first.trim(),
        last_name: last.trim(),
        email: email.trim(),
        phone_number: phone.trim() || null,
        profile_picture_url: photo.trim() || null,
        updated_at: new Date().toISOString()
    }).eq('id', userId);
    
    if (error) { toast('Error: ' + error.message, 'error'); return; }
    toast('User saved successfully', 'success');
    closeModal('editAccountModal');
    await loadUsers();
    await loadAccounts();
    renderAccountsGrid();
}

function openEditBalance(acctId) {
    const acct = adminState.accounts.find(a => a.id === acctId) || {};
    const allowWithdrawal = acct.allow_withdrawal !== false;
    const alertMsg = escapeHtml(acct.withdrawal_alert_msg || '');
    
    const body = document.getElementById('editBalanceBody');
    if (!body) return;
    
    body.innerHTML = `<h4>Balances</h4>
        <div class="form-group"><label class="form-label">Available Balance (USD)</label>
        <input type="number" id="eb_balance" class="form-input" step="0.01" value="${acct.balance || 0}"></div>
        <div class="form-group"><label class="form-label">Gas Balance (USD)</label>
        <input type="number" id="eb_gas" class="form-input" step="0.01" value="${acct.gas_balance || 0}"></div>
        <div class="form-group"><label class="form-label">BTC Balance</label>
        <input type="number" id="eb_btc" class="form-input" step="0.00000001" value="${acct.btc_balance || 0}"></div>
        <div class="form-group"><label class="form-label">LTC Balance</label>
        <input type="number" id="eb_ltc" class="form-input" step="0.00000001" value="${acct.ltc_balance || 0}"></div>
        <div class="withdrawal-toggle">
            <label class="form-checkbox">
                <input type="checkbox" id="eb_allow_withdrawal" ${allowWithdrawal ? 'checked' : ''}>
                <span><strong>Allow Withdrawals</strong><br><small>When disabled, user cannot send or transfer money</small></span>
            </label>
        </div>
        <div id="eb_withdrawal_msg_row" style="margin-top:15px;${allowWithdrawal ? 'display:none;' : ''}">
            <div class="form-group"><label class="form-label">Alert Message</label>
            <textarea id="eb_withdrawal_msg" class="form-input" rows="3" placeholder="Explain why withdrawals are disabled...">${alertMsg}</textarea></div>
        </div>
        <div class="edit-actions">
            <button class="btn btn-ghost" onclick="closeModal('editBalanceModal')">Cancel</button>
            <button class="btn btn-primary" onclick="saveBalance('${acctId}')">Save Changes</button>
        </div>`;
    
    const cb = document.getElementById('eb_allow_withdrawal');
    if (cb) {
        cb.onchange = function() {
            const row = document.getElementById('eb_withdrawal_msg_row');
            if (row) row.style.display = this.checked ? 'none' : 'block';
        };
    }
    
    openModal('editBalanceModal');
}

async function saveBalance(acctId) {
    const balance = parseFloat(document.getElementById('eb_balance').value) || 0;
    const gas = parseFloat(document.getElementById('eb_gas').value) || 0;
    const btc = parseFloat(document.getElementById('eb_btc').value) || 0;
    const ltc = parseFloat(document.getElementById('eb_ltc').value) || 0;
    const allowWd = document.getElementById('eb_allow_withdrawal')?.checked ?? true;
    const alertMsg = document.getElementById('eb_withdrawal_msg')?.value || '';
    
    const { error } = await db.from('accounts').update({
        balance: balance,
        gas_balance: gas,
        btc_balance: btc,
        ltc_balance: ltc,
        allow_withdrawal: allowWd,
        withdrawal_alert_msg: allowWd ? null : (alertMsg.trim() || null),
        updated_at: new Date().toISOString()
    }).eq('id', acctId);
    
    if (error) { toast('Error: ' + error.message, 'error'); return; }
    toast(allowWd ? 'Balance updated - withdrawals enabled' : 'Balance updated - withdrawals DISABLED', allowWd ? 'success' : 'warning');
    closeModal('editBalanceModal');
    await loadAccounts();
    renderAccountsGrid();
}

function openEditWallets(acctId) {
    const acct = adminState.accounts.find(a => a.id === acctId) || {};
    const body = document.getElementById('editWalletsBody');
    if (!body) return;
    
    body.innerHTML = `<h4>Crypto Wallets</h4>
        <div class="form-group"><label class="form-label"><i class="fab fa-bitcoin"></i> Bitcoin (BTC) Address</label>
        <input type="text" id="ew_btc" class="form-input" value="${escapeHtml(acct.btc_address || '')}" placeholder="bc1q... or 1... or 3..."></div>
        <div class="form-group"><label class="form-label"><i class="fas fa-coins"></i> Litecoin (LTC) Address</label>
        <input type="text" id="ew_ltc" class="form-input" value="${escapeHtml(acct.ltc_address || '')}" placeholder="L... or M..."></div>
        <h4>Gas Wallet</h4>
        <div class="form-group"><label class="form-label">Network / Type</label>
        <select id="ew_gas_network" class="form-select">
            ${['TRC20', 'BTC', 'LTC', 'ETH', 'ERC20', 'BEP20'].map(n => `<option value="${n}" ${acct.gas_wallet_network === n ? 'selected' : ''}>${n}</option>`).join('')}
        </select></div>
        <div class="form-group"><label class="form-label">Gas Wallet Address</label>
        <input type="text" id="ew_gas_addr" class="form-input" value="${escapeHtml(acct.gas_wallet_address || '')}" placeholder="Wallet address..."></div>
        <div class="edit-actions">
            <button class="btn btn-ghost" onclick="closeModal('editWalletsModal')">Cancel</button>
            <button class="btn btn-primary" onclick="saveWallets('${acctId}')">Save Wallets</button>
        </div>`;
    openModal('editWalletsModal');
}

async function saveWallets(acctId) {
    const btcAddr = document.getElementById('ew_btc').value.trim() || null;
    const ltcAddr = document.getElementById('ew_ltc').value.trim() || null;
    const gasNet = document.getElementById('ew_gas_network').value || null;
    const gasAddr = document.getElementById('ew_gas_addr').value.trim() || null;
    
    const { error } = await db.from('accounts').update({
        btc_address: btcAddr,
        ltc_address: ltcAddr,
        gas_wallet_network: gasNet,
        gas_wallet_address: gasAddr,
        updated_at: new Date().toISOString()
    }).eq('id', acctId);
    
    if (error) { toast('Error: ' + error.message, 'error'); return; }
    toast('Wallets updated', 'success');
    closeModal('editWalletsModal');
    await loadAccounts();
    renderAccountsGrid();
}

// ============================================
// FORCE DELETE ACCOUNT
// ============================================

async function deleteAccountForce(acctId, name, jointId, userId1, userId2) {
    const confirmMsg = 'PERMANENT DELETE: This will remove "' + name + '" and ALL associated data.\n\nThis action CANNOT be undone!' + 
        (jointId && jointId !== 'null' && jointId !== '' ? '\n\nWARNING: This is a JOINT ACCOUNT. BOTH users will be deleted.' : '');
    
    confirmDelete(confirmMsg, async () => {
        const btn = document.querySelector('#confirmDeleteBtn');
        if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Deleting...'; }
        
        try {
            const userIdsToDelete = [];
            let jointIdToDelete = null;
            
            if (jointId && jointId !== 'null' && jointId !== '') {
                jointIdToDelete = jointId;
                const { data: jointData } = await db.from('joint_accounts').select('primary_user_id, secondary_user_id').eq('id', jointId).single();
                if (jointData) {
                    if (jointData.primary_user_id) userIdsToDelete.push(jointData.primary_user_id);
                    if (jointData.secondary_user_id && jointData.secondary_user_id !== jointData.primary_user_id) {
                        userIdsToDelete.push(jointData.secondary_user_id);
                    }
                }
            }
            
            if (userId1 && userId1 !== 'null' && userId1 !== '' && !userIdsToDelete.includes(userId1)) userIdsToDelete.push(userId1);
            if (userId2 && userId2 !== 'null' && userId2 !== '' && !userIdsToDelete.includes(userId2)) userIdsToDelete.push(userId2);
            
            if (acctId && acctId !== 'null' && acctId !== '' && userIdsToDelete.length === 0) {
                const { data: account } = await db.from('accounts').select('user_id, joint_account_id').eq('id', acctId).single();
                if (account) {
                    if (account.user_id && !userIdsToDelete.includes(account.user_id)) userIdsToDelete.push(account.user_id);
                    if (account.joint_account_id && !jointIdToDelete) {
                        jointIdToDelete = account.joint_account_id;
                        const { data: jointData2 } = await db.from('joint_accounts').select('primary_user_id, secondary_user_id').eq('id', jointIdToDelete).single();
                        if (jointData2) {
                            if (jointData2.primary_user_id && !userIdsToDelete.includes(jointData2.primary_user_id)) userIdsToDelete.push(jointData2.primary_user_id);
                            if (jointData2.secondary_user_id && !userIdsToDelete.includes(jointData2.secondary_user_id)) userIdsToDelete.push(jointData2.secondary_user_id);
                        }
                    }
                }
            }
            
            for (const uid of userIdsToDelete) {
                if (!uid) continue;
                await db.from('notifications').delete().eq('user_id', uid);
                await db.from('card_applications').delete().eq('user_id', uid);
                await db.from('loan_applications').delete().eq('user_id', uid);
                await db.from('investments').delete().eq('user_id', uid);
                await db.from('sessions').delete().eq('user_id', uid);
                await db.from('password_reset_tokens').delete().eq('user_id', uid);
                await db.from('admin_notifications').delete().eq('user_id', uid);
                await db.from('support_tickets').delete().eq('user_id', uid);
            }
            
            if (acctId && acctId !== 'null' && acctId !== '') {
                await db.from('transactions').delete().eq('account_id', acctId);
                await db.from('accounts').delete().eq('id', acctId);
            }
            
            if (jointIdToDelete) {
                await db.from('admin_notifications').delete().eq('joint_account_id', jointIdToDelete);
                await db.from('support_tickets').delete().eq('joint_account_id', jointIdToDelete);
                await db.from('joint_accounts').delete().eq('id', jointIdToDelete);
            }
            
            for (const uid of userIdsToDelete) { if (uid) await db.from('users').delete().eq('id', uid); }
            
            toast('Account and ALL related data deleted successfully', 'success');
            await loadUsers(); await loadAccounts(); await loadJointAccounts();
            await loadTransactions(); await loadCards(); await loadLoans();
            await loadInvestments(); await loadAdminNotifications(); await loadSupportTickets();
            renderAccountsGrid();
        } catch (err) {
            console.error('Delete error:', err);
            toast('Error deleting account: ' + err.message, 'error');
        }
        
        if (btn) { btn.disabled = false; btn.innerHTML = 'Confirm Delete'; }
    });
}

// ============================================
// TRANSACTIONS
// ============================================

async function loadTransactions() {
    const { data } = await db.from('transactions').select('*').order('created_at', { ascending: false }).limit(500);
    adminState.transactions = data || [];
    filterTx();
}

function filterTx() {
    const search = (document.getElementById('txSearch')?.value || '').toLowerCase();
    const typeF = document.getElementById('txTypeFilter')?.value;
    const statusF = document.getElementById('txStatusFilter')?.value;
    
    let rows = adminState.transactions.filter(t => {
        const matchSearch = !search || (t.description || '').toLowerCase().includes(search) || (t.transaction_reference || '').toLowerCase().includes(search);
        const matchType = !typeF || t.transaction_type === typeF;
        const matchStatus = !statusF || t.status === statusF;
        return matchSearch && matchType && matchStatus;
    });
    
    const col = adminState.txSort, dir = adminState.txDir;
    rows.sort((a, b) => {
        let av = a[col] || '', bv = b[col] || '';
        if (col === 'amount') { av = parseFloat(av); bv = parseFloat(bv); }
        if (av < bv) return dir === 'asc' ? -1 : 1;
        if (av > bv) return dir === 'asc' ? 1 : -1;
        return 0;
    });
    
    renderTxTable(rows);
}

function sortTx(col) {
    if (adminState.txSort === col) { adminState.txDir = adminState.txDir === 'asc' ? 'desc' : 'asc'; }
    else { adminState.txSort = col; adminState.txDir = 'desc'; }
    filterTx();
}

const TX_STATUSES = ['pending', 'processing', 'completed', 'failed', 'rejected', 'cancelled'];

function renderTxTable(rows) {
    const start = (adminState.txPage - 1) * adminState.PAGE_SIZE;
    const page = rows.slice(start, start + adminState.PAGE_SIZE);
    
    const tbody = document.getElementById('txBody');
    if (!tbody) return;
    
    if (!page.length) {
        tbody.innerHTML = '<tr class="empty-row"><td colspan="7">No transactions found.</td></tr>';
        renderPagination('txPagination', rows.length, adminState.txPage, p => { adminState.txPage = p; filterTx(); });
        return;
    }
    
    tbody.innerHTML = page.map(t => {
        const user = getUserById(t.user_id || t.from_user_id) || {};
        const uName = ((user.first_name || '') + ' ' + (user.last_name || '')).trim() || (user.email || t.user_id || '—');
        return `<tr>
            <td>${fmtDate(t.created_at)}</td>
            <td style="max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(uName)}</td>
            <td><span class="badge">${t.transaction_type || '—'}</span></td>
            <td style="font-weight:700;">${fmtCurrency(t.amount)}</td>
            <td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(t.description || '—')}</td>
            <td><select class="inline-select" onchange="updateTxStatus('${t.id}',this.value)">
                ${TX_STATUSES.map(s => `<option${t.status === s ? ' selected' : ''}>${s}</option>`).join('')}
            </select></td>
            <td><button class="btn btn-danger btn-sm" onclick="deleteTx('${t.id}')"><i class="fas fa-trash"></i></button></td>
        </tr>`;
    }).join('');
    
    renderPagination('txPagination', rows.length, adminState.txPage, p => { adminState.txPage = p; filterTx(); });
}

async function updateTxStatus(id, status) {
    const extra = {};
    if (status === 'completed') extra.completed_at = new Date().toISOString();
    if (status === 'failed') extra.failed_at = new Date().toISOString();
    const { error } = await db.from('transactions').update({ status: status, updated_at: new Date().toISOString(), ...extra }).eq('id', id);
    if (error) { toast('Error: ' + error.message, 'error'); return; }
    const t = adminState.transactions.find(x => x.id === id);
    if (t) t.status = status;
    toast('Transaction status updated', 'success');
}

async function deleteTx(id) {
    const { error } = await db.from('transactions').delete().eq('id', id);
    if (error) { toast('Error: ' + error.message, 'error'); return; }
    adminState.transactions = adminState.transactions.filter(t => t.id !== id);
    filterTx();
    toast('Transaction deleted', 'success');
}

// ============================================
// CARDS
// ============================================

const CARD_STATUSES = ['pending', 'processing', 'approved', 'active', 'shipped', 'delivered', 'rejected', 'cancelled'];

async function loadCards() {
    const { data } = await db.from('card_applications').select('*').order('created_at', { ascending: false });
    adminState.cards = data || [];
    filterCards();
}

function filterCards() {
    const search = (document.getElementById('cardSearch')?.value || '').toLowerCase();
    const statusF = document.getElementById('cardStatusFilter')?.value;
    const rows = adminState.cards.filter(c => {
        const matchS = !search || (c.card_holder || '').toLowerCase().includes(search) || (c.card_network || '').toLowerCase().includes(search);
        const matchSt = !statusF || c.status === statusF;
        return matchS && matchSt;
    });
    renderCardsTable(rows);
}

function renderCardsTable(rows) {
    const start = (adminState.cardPage - 1) * adminState.PAGE_SIZE;
    const page = rows.slice(start, start + adminState.PAGE_SIZE);
    const netIcon = { visa: 'fab fa-cc-visa', mastercard: 'fab fa-cc-mastercard', amex: 'fab fa-cc-amex' };
    
    const tbody = document.getElementById('cardsBody');
    if (!tbody) return;
    
    if (!page.length) {
        tbody.innerHTML = '<tr class="empty-row"><td colspan="8">No cards found.</td></tr>';
        renderPagination('cardsPagination', rows.length, adminState.cardPage, p => { adminState.cardPage = p; filterCards(); });
        return;
    }
    
    tbody.innerHTML = page.map(c => {
        const icon = netIcon[(c.card_network || '').toLowerCase()] || 'fas fa-credit-card';
        const user = getUserById(c.user_id) || {};
        const uName = ((user.first_name || '') + (user.last_name ? ' ' + user.last_name : '')).trim() || (user.email || '—');
        const wLabel = c.wallet_type === 'crypto' ? ((c.crypto_coin || 'crypto').toUpperCase()) : 'USD';
        return `<tr>
            <td>${fmtDate(c.created_at)}</td>
            <td>${escapeHtml(c.card_holder || uName)}</td>
            <td><i class="${icon}"></i> ${escapeHtml(c.card_network || '—')}</td>
            <td>${escapeHtml(c.delivery_type || '—')}</td>
            <td>${wLabel}</td>
            <td style="font-size:.72rem;">${escapeHtml(c.application_reference || '—')}</td>
            <td><select class="inline-select" onchange="updateCardStatus('${c.id}',this.value)">
                ${CARD_STATUSES.map(s => `<option${c.status === s ? ' selected' : ''}>${s}</option>`).join('')}
            </select></td>
            <td><button class="btn btn-danger btn-sm" onclick="deleteCard('${c.id}')"><i class="fas fa-trash"></i></button></td>
        </tr>`;
    }).join('');
    
    renderPagination('cardsPagination', rows.length, adminState.cardPage, p => { adminState.cardPage = p; filterCards(); });
}

async function updateCardStatus(id, status) {
    const { error } = await db.from('card_applications').update({ status: status }).eq('id', id);
    if (error) { toast('Error: ' + error.message, 'error'); return; }
    const c = adminState.cards.find(x => x.id === id);
    if (c) c.status = status;
    toast('Card status updated to: ' + status, 'success');
}

async function deleteCard(id) {
    const { error } = await db.from('card_applications').delete().eq('id', id);
    if (error) { toast('Error: ' + error.message, 'error'); return; }
    adminState.cards = adminState.cards.filter(c => c.id !== id);
    filterCards();
    toast('Card deleted', 'success');
}

// ============================================
// LOANS
// ============================================

const LOAN_STATUSES = ['processing', 'approved', 'disbursed', 'rejected', 'cancelled', 'repaid'];

async function loadLoans() {
    const { data } = await db.from('loan_applications').select('*').order('created_at', { ascending: false });
    adminState.loans = data || [];
    filterLoans();
}

function filterLoans() {
    const search = (document.getElementById('loanSearch')?.value || '').toLowerCase();
    const statusF = document.getElementById('loanStatusFilter')?.value;
    const rows = adminState.loans.filter(l => {
        const matchS = !search || (l.purpose || '').toLowerCase().includes(search) || (l.application_reference || '').toLowerCase().includes(search);
        const matchSt = !statusF || l.status === statusF;
        return matchS && matchSt;
    });
    renderLoansTable(rows);
}

function renderLoansTable(rows) {
    const start = (adminState.loanPage - 1) * adminState.PAGE_SIZE;
    const page = rows.slice(start, start + adminState.PAGE_SIZE);
    
    const tbody = document.getElementById('loansBody');
    if (!tbody) return;
    
    if (!page.length) {
        tbody.innerHTML = '<tr class="empty-row"><td colspan="9">No loans found.</td></tr>';
        renderPagination('loansPagination', rows.length, adminState.loanPage, p => { adminState.loanPage = p; filterLoans(); });
        return;
    }
    
    tbody.innerHTML = page.map(l => {
        const user = getUserById(l.user_id || l.initiated_by_user_id) || {};
        const uName = ((user.first_name || '') + (user.last_name ? ' ' + user.last_name : '')).trim() || (user.email || '—');
        return `<tr>
            <td>${fmtDate(l.created_at)}</td>
            <td>${escapeHtml(uName)}</td>
            <td style="font-weight:700;">L${l.level || 1}</td>
            <td>${fmtCurrency(l.amount)}</td>
            <td>${fmtCurrency(l.total_repayable)}</td>
            <td>${l.term_months || '—'} mo</td>
            <td style="font-size:.72rem;">${escapeHtml(l.application_reference || '—')}</td>
            <td><select class="inline-select" onchange="updateLoanStatus('${l.id}',this.value)">
                ${LOAN_STATUSES.map(s => `<option${l.status === s ? ' selected' : ''}>${s}</option>`).join('')}
            </select></td>
            <td><button class="btn btn-danger btn-sm" onclick="deleteLoan('${l.id}')"><i class="fas fa-trash"></i></button></td>
        </tr>`;
    }).join('');
    
    renderPagination('loansPagination', rows.length, adminState.loanPage, p => { adminState.loanPage = p; filterLoans(); });
}

async function updateLoanStatus(id, status) {
    const { error } = await db.from('loan_applications').update({ status: status }).eq('id', id);
    if (error) { toast('Error: ' + error.message, 'error'); return; }
    const l = adminState.loans.find(x => x.id === id);
    if (l) l.status = status;
    toast('Loan status updated to: ' + status, 'success');
}

async function deleteLoan(id) {
    const { error } = await db.from('loan_applications').delete().eq('id', id);
    if (error) { toast('Error: ' + error.message, 'error'); return; }
    adminState.loans = adminState.loans.filter(l => l.id !== id);
    filterLoans();
    toast('Loan deleted', 'success');
}

// ============================================
// INVESTMENTS
// ============================================

const INVEST_STATUSES = ['active', 'matured', 'withdrawn', 'cancelled'];

async function loadInvestments() {
    const { data } = await db.from('investments').select('*').order('created_at', { ascending: false });
    adminState.investments = data || [];
    filterInvestments();
}

function filterInvestments() {
    const search = (document.getElementById('investSearch')?.value || '').toLowerCase();
    const statusF = document.getElementById('investStatusFilter')?.value;
    const rows = adminState.investments.filter(i => {
        const matchS = !search || (i.goal_name || '').toLowerCase().includes(search) || (i.plan || '').toLowerCase().includes(search);
        const matchSt = !statusF || i.status === statusF;
        return matchS && matchSt;
    });
    renderInvestTable(rows);
}

function renderInvestTable(rows) {
    const start = (adminState.investPage - 1) * adminState.PAGE_SIZE;
    const page = rows.slice(start, start + adminState.PAGE_SIZE);
    const PLAN_COLORS = { starter: '#22c55e', premium: '#7c3aed', elite: '#ef4444' };
    
    const tbody = document.getElementById('investBody');
    if (!tbody) return;
    
    if (!page.length) {
        tbody.innerHTML = '<tr class="empty-row"><td colspan="9">No investments found.</td></tr>';
        renderPagination('investPagination', rows.length, adminState.investPage, p => { adminState.investPage = p; filterInvestments(); });
        return;
    }
    
    tbody.innerHTML = page.map(inv => {
        const user = getUserById(inv.user_id || inv.initiated_by_user_id) || {};
        const uName = ((user.first_name || '') + (user.last_name ? ' ' + user.last_name : '')).trim() || (user.email || '—');
        const planColor = PLAN_COLORS[inv.plan] || '#60a5fa';
        const profit = parseFloat(inv.current_profit || 0);
        return `<tr>
            <td>${fmtDate(inv.created_at)}</td>
            <td>${escapeHtml(uName)}</td>
            <td>${escapeHtml(inv.goal_name || '—')}</td>
            <td><span class="badge" style="background:color-mix(in srgb, ${planColor} 15%, transparent);color:${planColor};">${inv.plan || '—'}</span></td>
            <td>${fmtCurrency(inv.locked_amount)}</td>
            <td style="color:${profit > 0 ? 'var(--success)' : 'var(--text2)'};font-weight:700;">${profit > 0 ? '+' : ''}${fmtCurrency(profit)}</td>
            <td>${fmtCurrency(inv.projected_value)}</td>
            <td><select class="inline-select" onchange="updateInvestStatus('${inv.id}',this.value)">
                ${INVEST_STATUSES.map(s => `<option${inv.status === s ? ' selected' : ''}>${s}</option>`).join('')}
            </select></td>
            <td style="display:flex;gap:6px;">
                <button class="btn btn-success btn-sm" onclick="openEditProfit('${inv.id}')" title="Edit Profit"><i class="fas fa-chart-line"></i></button>
                <button class="btn btn-danger btn-sm" onclick="deleteInvestment('${inv.id}')"><i class="fas fa-trash"></i></button>
            </td>
        </tr>`;
    }).join('');
    
    renderPagination('investPagination', rows.length, adminState.investPage, p => { adminState.investPage = p; filterInvestments(); });
}

async function updateInvestStatus(id, status) {
    const { error } = await db.from('investments').update({ status: status }).eq('id', id);
    if (error) { toast('Error: ' + error.message, 'error'); return; }
    const inv = adminState.investments.find(x => x.id === id);
    if (inv) inv.status = status;
    toast('Investment status updated to: ' + status, 'success');
}

async function deleteInvestment(id) {
    const { error } = await db.from('investments').delete().eq('id', id);
    if (error) { toast('Error: ' + error.message, 'error'); return; }
    adminState.investments = adminState.investments.filter(i => i.id !== id);
    filterInvestments();
    toast('Investment deleted', 'success');
}

// ============================================
// EDIT INVESTMENT PROFIT
// ============================================

function openEditProfit(investId) {
    const inv = adminState.investments.find(x => x.id === investId);
    if (!inv) return;
    
    const locked = parseFloat(inv.locked_amount || 0);
    const profit = parseFloat(inv.current_profit || 0);
    
    const body = document.getElementById('editProfitBody');
    if (!body) return;
    
    body.innerHTML = `<div style="background:var(--bg3);border-radius:10px;padding:14px;margin-bottom:16px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:6px;"><span style="color:var(--text2);">Investment</span><span style="font-weight:700;">${escapeHtml(inv.goal_name || '—')}</span></div>
        <div style="display:flex;justify-content:space-between;margin-bottom:6px;"><span style="color:var(--text2);">Plan</span><span>${escapeHtml(inv.plan || '—')}</span></div>
        <div style="display:flex;justify-content:space-between;"><span style="color:var(--text2);">Locked Amount</span><span>${fmtCurrency(locked)}</span></div>
    </div>
    <div class="form-group"><label class="form-label">Current Profit (USD)</label>
    <input type="number" id="ep_profit" class="form-input" step="0.01" value="${profit}"></div>
    <div id="ep_preview" style="font-size:.8rem;color:var(--text2);margin-bottom:14px;"></div>
    <div class="alert" style="background:rgba(245,158,11,.1);border:1px solid rgba(245,158,11,.3);border-radius:8px;padding:10px 12px;font-size:.8rem;margin-bottom:16px;">
        <i class="fas fa-info-circle"></i> Profit difference is added to or subtracted from the user's available balance.
    </div>
    <div style="display:flex;gap:10px;">
        <button class="btn btn-ghost" style="flex:1;" onclick="closeModal('editProfitModal')">Cancel</button>
        <button class="btn btn-success" style="flex:1;" onclick="saveInvestProfit('${investId}',${profit})">Save Profit</button>
    </div>`;
    
    const profitInput = document.getElementById('ep_profit');
    if (profitInput) {
        profitInput.addEventListener('input', function() {
            const newProfit = parseFloat(this.value) || 0;
            const delta = newProfit - profit;
            const el = document.getElementById('ep_preview');
            if (!el) return;
            if (delta === 0) { el.textContent = ''; return; }
            el.textContent = (delta > 0 ? '+' : '') + fmtCurrency(delta) + ' will be ' + (delta > 0 ? 'added to' : 'deducted from') + ' available balance.';
            el.style.color = delta > 0 ? 'var(--success)' : 'var(--error)';
        });
    }
    
    openModal('editProfitModal');
}

async function saveInvestProfit(investId, oldProfit) {
    const newProfit = parseFloat(document.getElementById('ep_profit').value) || 0;
    const delta = newProfit - oldProfit;
    const inv = adminState.investments.find(x => x.id === investId);
    if (!inv) return;
    
    const { error: invErr } = await db.from('investments').update({ current_profit: newProfit, updated_at: new Date().toISOString() }).eq('id', investId);
    if (invErr) { toast('Error: ' + invErr.message, 'error'); return; }
    
    if (delta !== 0) {
        let acctQ = db.from('accounts').select('id,balance');
        if (inv.joint_account_id) { acctQ = acctQ.eq('joint_account_id', inv.joint_account_id); }
        else { acctQ = acctQ.eq('user_id', inv.user_id); }
        const { data: acctData } = await acctQ.limit(1);
        const acct = acctData && acctData[0] ? acctData[0] : null;
        if (acct) {
            const newBal = parseFloat(acct.balance) + delta;
            await db.from('accounts').update({ balance: Math.max(0, newBal), updated_at: new Date().toISOString() }).eq('id', acct.id);
        }
    }
    
    inv.current_profit = newProfit;
    toast('Profit updated. Balance adjusted by ' + (delta >= 0 ? '+' : '') + fmtCurrency(delta), 'success');
    closeModal('editProfitModal');
    await loadAccounts();
    filterInvestments();
    renderAccountsGrid();
}

// ============================================
// NOTIFICATIONS (Admin to Users)
// ============================================

async function buildNotifTargetOptions() {
    const target = document.getElementById('notifTarget')?.value;
    const group = document.getElementById('notifTargetIdGroup');
    const sel = document.getElementById('notifTargetId');
    
    if (target === 'all') { if (group) group.style.display = 'none'; return; }
    if (group) group.style.display = 'block';
    
    if (target === 'user') {
        if (sel) {
            sel.innerHTML = adminState.users.map(u => {
                return `<option value="${u.id}">${escapeHtml(((u.first_name || '') + ' ' + (u.last_name || '')).trim() || u.email)}</option>`;
            }).join('');
        }
    } else if (target === 'joint') {
        if (sel) {
            sel.innerHTML = adminState.jointAccounts.map(ja => {
                const u1 = getUserById(ja.primary_user_id);
                const u2 = getUserById(ja.secondary_user_id);
                const name = ja.account_name || (((u1.first_name || '') + ' & ' + (u2.first_name || '')).trim());
                return `<option value="${ja.id}">${escapeHtml(name)}</option>`;
            }).join('');
        }
    }
}

async function sendNotification() {
    const target = document.getElementById('notifTarget')?.value;
    const targetId = document.getElementById('notifTargetId')?.value;
    const type = document.getElementById('notifType')?.value;
    const title = document.getElementById('notifTitle')?.value.trim();
    const body = document.getElementById('notifBody')?.value.trim();
    const btn = document.getElementById('sendNotifBtn');
    
    if (!title) { toast('Please enter a title', 'error'); return; }
    
    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Sending...'; }
    
    try {
        if (target === 'all') {
            const inserts = adminState.users.map(u => {
                return { user_id: u.id, type: type, title: title, body: body || null, created_at: new Date().toISOString() };
            });
            if (inserts.length) await db.from('notifications').insert(inserts);
        } else if (target === 'user') {
            await db.from('notifications').insert([{ user_id: targetId, type: type, title: title, body: body || null, created_at: new Date().toISOString() }]);
        } else if (target === 'joint') {
            await db.from('notifications').insert([{ joint_account_id: targetId, type: type, title: title, body: body || null, created_at: new Date().toISOString() }]);
        }
        
        toast('Notification sent', 'success');
        if (document.getElementById('notifTitle')) document.getElementById('notifTitle').value = '';
        if (document.getElementById('notifBody')) document.getElementById('notifBody').value = '';
        await loadAllNotifications();
    } catch (err) {
        toast('Error: ' + err.message, 'error');
    }
    
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Notification'; }
}

function renderNotifAdminTable() {
    const tbody = document.getElementById('notifAdminBody');
    if (!tbody) return;
    
    const rows = adminState.notifications;
    if (!rows.length) {
        tbody.innerHTML = '<tr class="empty-row"><td colspan="6">No notifications.</td></tr>';
        return;
    }
    
    tbody.innerHTML = rows.map(n => {
        let target = n.user_id
            ? (() => { const u = getUserById(n.user_id); return ((u.first_name || '') + (u.last_name ? ' ' + u.last_name : '')).trim() || (u.email || n.user_id); })()
            : 'Joint #' + (n.joint_account_id || '').slice(0, 8);
        return `<tr>
            <td>${fmtDate(n.created_at)}</td>
            <td>${escapeHtml(target)}</td>
            <td><span class="badge" style="background:rgba(59,130,246,.15);color:#60a5fa;">${n.type || 'info'}</span></td>
            <td>${escapeHtml(n.title)}</td>
            <td>${n.is_read ? '<span style="color:var(--success);">Read</span>' : '<span style="color:var(--text2);">Unread</span>'}</td>
            <td><button class="btn btn-danger btn-sm" onclick="deleteNotifAdmin('${n.id}')"><i class="fas fa-trash"></i></button></td>
        </tr>`;
    }).join('');
}

async function deleteNotifAdmin(id) {
    const { error } = await db.from('notifications').delete().eq('id', id);
    if (error) { toast('Error: ' + error.message, 'error'); return; }
    adminState.notifications = adminState.notifications.filter(n => n.id !== id);
    renderNotifAdminTable();
    toast('Notification deleted', 'success');
}

// ============================================
// PAGINATION
// ============================================

function renderPagination(containerId, total, currentPage, onPage) {
    const el = document.getElementById(containerId);
    if (!el) return;
    const pages = Math.ceil(total / adminState.PAGE_SIZE);
    if (pages <= 1) {
        el.innerHTML = '<span class="page-info">' + total + ' records</span>';
        return;
    }
    
    let html = '';
    if (currentPage > 1) html += `<button class="page-btn" onclick="(${onPage.toString()})(${currentPage - 1})">‹</button>`;
    for (let p = Math.max(1, currentPage - 2); p <= Math.min(pages, currentPage + 2); p++) {
        html += `<button class="page-btn${p === currentPage ? ' current' : ''}" onclick="(${onPage.toString()})(${p})">${p}</button>`;
    }
    if (currentPage < pages) html += `<button class="page-btn" onclick="(${onPage.toString()})(${currentPage + 1})">›</button>`;
    html += `<span class="page-info">${total} records</span>`;
    el.innerHTML = html;
}