// ============================================
// Summit Trust Holding ADMIN PANEL
// ============================================

var SUPABASE_URL     = (window.CONFIG && window.CONFIG.SUPABASE_URL) || 'https://jotfmjdmorjweoumdvuq.supabase.co';
var SUPABASE_ANON_KEY = (window.CONFIG && window.CONFIG.SUPABASE_ANON_KEY) || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpvdGZtamRtb3Jqd2VvdW1kdnVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3Mzk2OTksImV4cCI6MjA5MTMxNTY5OX0.bTkJKZtHEz_cBBHsYwWiWMotLpCpKU68_ROE-mKWm4s';

var db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── STATE ─────────────────────────────────────

var adminState = {
    users:        [],
    accounts:     [],
    jointAccounts:[],
    transactions: [],
    cards:        [],
    loans:        [],
    investments:  [],
    notifications:[],
    planAssets:   {},

    txPage: 1, txSort: 'created_at', txDir: 'desc',
    cardPage: 1,
    loanPage: 1,
    investPage: 1,
    PAGE_SIZE: 20
};

// ── AUTH ──────────────────────────────────────

async function adminLogin() {
    var email    = document.getElementById('adminEmail').value.trim();
    var password = document.getElementById('adminPassword').value;
    var btn      = document.getElementById('loginBtn');
    var errEl    = document.getElementById('loginError');

    errEl.style.display = 'none';
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Signing in…';

    var { data, error } = await db.auth.signInWithPassword({ email, password });

    if (error) {
        errEl.textContent = error.message;
        errEl.style.display = 'block';
        btn.disabled = false;
        btn.innerHTML = 'Sign In';
        return;
    }

    document.getElementById('adminEmailDisplay').textContent = email;
    document.getElementById('loginScreen').style.display     = 'none';
    document.getElementById('adminShell').style.display      = 'block';
    initAdmin();
}

async function adminLogout() {
    await db.auth.signOut();
    location.reload();
}

document.addEventListener('DOMContentLoaded', async function () {
    try {
        var res = await db.auth.getSession();
        if (res?.data?.session?.user) {
            document.getElementById('adminEmailDisplay').textContent = res.data.session.user.email || 'Admin';
            document.getElementById('loginScreen').style.display     = 'none';
            document.getElementById('adminShell').style.display      = 'block';
            await initAdmin();
        }
    } catch (e) {
        console.warn('Session restore check:', e);
    }
});

// ── INIT ──────────────────────────────────────

async function initAdmin() {
    await Promise.all([loadUsers(), loadAccounts(), loadJointAccounts()]);
    renderAccountsGrid();
    loadTransactions();
    loadCards();
    loadLoans();
    loadInvestments();
    loadAllNotifications();
    buildNotifTargetOptions();
    loadSettingsRates();
    loadInvestmentPlansSettings();
    loadLoanSettings();
}

// ── TABS ──────────────────────────────────────

function switchTab(name, btn) {
    document.querySelectorAll('.tab-content').forEach(function (el) { el.classList.remove('active'); });
    document.querySelectorAll('.tab-btn').forEach(function (el) { el.classList.remove('active'); });
    document.getElementById('tab-' + name).classList.add('active');
    if (btn) btn.classList.add('active');
    if (name === 'settings') {
        loadSettingsRates();
        loadInvestmentPlansSettings();
        loadLoanSettings();
    }
}

function goToPlanSettings() {
    var tabs = document.querySelectorAll('.tab-btn');
    var settingsBtn = Array.from(tabs).find(function (b) { return (b.textContent || '').includes('Settings'); });
    if (settingsBtn) {
        switchTab('settings', settingsBtn);
    }
    setTimeout(function () {
        var el = document.getElementById('panel-investment-plans');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
    }, 50);
}

// ── TOAST ─────────────────────────────────────

var _toastTimer;
function toast(msg, type) {
    var el = document.getElementById('adminToast');
    el.className = 'show t-' + (type || 'info');
    el.innerHTML = '<i class="fas ' + (type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-times-circle' : 'fa-info-circle') + '"></i> ' + msg;
    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(function () { el.className = ''; }, 3500);
}

// ── MODAL ─────────────────────────────────────

function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

function confirmDelete(message, onConfirm) {
    document.getElementById('confirmDeleteBody').innerHTML = '<p style="color:var(--text2);">' + message + '</p>';
    var btn = document.getElementById('confirmDeleteBtn');
    btn.onclick = function () { closeModal('confirmDeleteModal'); onConfirm(); };
    openModal('confirmDeleteModal');
}

// ── FORMAT HELPERS ─────────────────────────────

function fmtCurrency(n) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);
}
function fmtDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function badge(status) {
    return '<span class="badge badge-' + (status || 'pending') + '">' + (status || '—') + '</span>';
}
function esc(s) {
    return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── DATA LOADERS ──────────────────────────────

async function loadUsers() {
    var { data } = await db.from('users').select('id,first_name,last_name,email,profile_picture_url,created_at');
    adminState.users = data || [];
}

async function loadAccounts() {
    var { data, error } = await db.from('accounts')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('loadAccounts error:', error);
    }

    adminState.accounts = (data || []).map(function (a) {
        return Object.assign({
            btc_balance: 0,
            ltc_balance: 0,
            btc_address: null,
            ltc_address: null,
            gas_balance: 0,
            gas_wallet_address: null,
            gas_wallet_network: 'TRC20',
            allow_withdrawal: true,
            withdrawal_alert_msg: null
        }, a);
    });
}

async function loadJointAccounts() {
    var { data } = await db.from('joint_accounts')
        .select('id,primary_user_id,secondary_user_id,account_name,status,created_at')
        .order('created_at', { ascending: false });
    adminState.jointAccounts = data || [];
}

// ── ACCOUNTS ──────────────────────────────────

function filterAccounts() { renderAccountsGrid(); }

function getUserById(id) {
    return adminState.users.find(function (u) { return u.id === id; }) || {};
}

function getAccountForUser(userId) {
    return adminState.accounts.find(function (a) { return a.user_id === userId && !a.joint_account_id; });
}

function getAccountForJoint(jointId) {
    return adminState.accounts.find(function (a) { return a.joint_account_id === jointId; });
}

function renderAccountsGrid() {
    var search  = (document.getElementById('acctSearch').value || '').toLowerCase();
    var typeF   = document.getElementById('acctTypeFilter').value;
    var sortF   = document.getElementById('acctSortFilter').value;

    // Build unified list: personal + joint
    var items = [];

    // Personal accounts
    adminState.accounts.filter(function (a) { return !a.joint_account_id; }).forEach(function (acct) {
        var user = getUserById(acct.user_id);
        var name = ((user.first_name || '') + ' ' + (user.last_name || '')).trim() || '—';
        items.push({ type: 'personal', name: name, email: user.email || '', acct: acct, user: user, balance: parseFloat(acct.balance || 0), created: acct.created_at });
    });

    // Joint accounts
    adminState.jointAccounts.forEach(function (ja) {
        var acct  = getAccountForJoint(ja.id);
        var u1    = getUserById(ja.primary_user_id);
        var u2    = getUserById(ja.secondary_user_id);
        var name  = ja.account_name || (((u1.first_name || '') + ' & ' + (u2.first_name || '')).trim());
        var email = (u1.email || '') + (u2.email ? ', ' + u2.email : '');
        items.push({ type: 'joint', name: name, email: email, acct: acct || {}, joint: ja, user: u1, user2: u2, balance: parseFloat((acct || {}).balance || 0), created: ja.created_at });
    });

    // Filter
    if (search) {
        items = items.filter(function (i) {
            return i.name.toLowerCase().includes(search) || i.email.toLowerCase().includes(search);
        });
    }
    if (typeF) {
        items = items.filter(function (i) { return i.type === typeF; });
    }

    // Sort
    items.sort(function (a, b) {
        if (sortF === 'name_asc')      return a.name.localeCompare(b.name);
        if (sortF === 'name_desc')     return b.name.localeCompare(a.name);
        if (sortF === 'balance_desc')  return b.balance - a.balance;
        if (sortF === 'balance_asc')   return a.balance - b.balance;
        if (sortF === 'created_asc')   return new Date(a.created) - new Date(b.created);
        return new Date(b.created) - new Date(a.created);
    });

    var grid = document.getElementById('accountsGrid');
    if (!items.length) {
        grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text2);">No accounts found.</div>';
        return;
    }

    grid.innerHTML = items.map(function (item) {
        var acct    = item.acct;
        var acctId  = acct.id || '';
        var avatar  = item.user.profile_picture_url
            ? '<img src="' + esc(item.user.profile_picture_url) + '" class="avatar">'
            : '<div class="avatar">' + esc((item.name[0] || '?').toUpperCase()) + '</div>';

        var wallets = '';
        if (acct.btc_address) wallets += '<div class="account-wallet-row"><i class="fab fa-bitcoin wallet-icon-btc"></i> ' + acct.btc_address.slice(0,10) + '…</div>';
        if (acct.ltc_address) wallets += '<div class="account-wallet-row"><i class="fas fa-coins wallet-icon-ltc"></i> ' + acct.ltc_address.slice(0,10) + '…</div>';
        if (acct.gas_wallet_address) {
            var gwIcon = gasWalletIcon(acct.gas_wallet_network);
            wallets += '<div class="account-wallet-row">' + gwIcon + ' ' + acct.gas_wallet_address.slice(0,10) + '… (' + (acct.gas_wallet_network || 'TRC20') + ')</div>';
        }

        var jointInfo = '';
        if (item.type === 'joint' && item.user2) {
            jointInfo = '<div style="font-size:.72rem;color:var(--text2);margin-top:4px;">with ' + esc((item.user2.first_name || '') + ' ' + (item.user2.last_name || '')) + '</div>';
        }

        var wdLocked = acct.allow_withdrawal === false;
        var wdBadge  = wdLocked
            ? '<div style="display:flex;align-items:center;gap:6px;margin-top:8px;padding:6px 10px;'
              + 'background:rgba(239,68,68,.1);border:1px solid #ef4444;border-radius:8px;">'
              + '<i class="fas fa-ban" style="color:#ef4444;font-size:.78rem;"></i>'
              + '<span style="font-size:.75rem;font-weight:700;color:#ef4444;">Withdrawals DISABLED</span>'
              + '</div>'
            : '';

        return '<div class="account-card">'
            + '<div class="account-card-header">'
            + '<div style="display:flex;align-items:center;gap:10px;">'
            + avatar
            + '<div>'
            + '<div class="account-card-name">' + esc(item.name) + '</div>'
            + '<div class="account-card-email">' + esc(item.email) + '</div>'
            + jointInfo
            + '</div></div>'
            + '<span class="badge badge-' + item.type + '">' + item.type + '</span>'
            + '</div>'
            + '<div class="account-balance">' + fmtCurrency(item.balance) + '</div>'
            + '<div style="font-size:.72rem;color:var(--text2);">Available Balance</div>'
            + (acct.gas_balance ? '<div style="font-size:.72rem;color:var(--text2);margin-top:2px;">Gas: ' + fmtCurrency(acct.gas_balance) + '</div>' : '')
            + wallets
            + wdBadge
            + '<div class="account-card-actions">'
            + '<button class="btn btn-primary btn-sm" onclick="openAddTransactionModal(\'' + acctId + '\')"><i class="fas fa-plus"></i> Tx</button>'
            + '<button class="btn btn-ghost btn-sm" onclick="openEditAccount(\'' + acctId + '\',\'' + item.type + '\',\'' + (item.joint ? item.joint.id : '') + '\')"><i class="fas fa-user-edit"></i> Edit User</button>'
            + '<button class="btn btn-ghost btn-sm" onclick="openEditBalance(\'' + acctId + '\')"><i class="fas fa-dollar-sign"></i> Balance</button>'
            + '<button class="btn btn-ghost btn-sm" onclick="openEditWallets(\'' + acctId + '\')"><i class="fas fa-wallet"></i> Wallets</button>'
            + '<button class="btn btn-ghost btn-sm" onclick="openSendEmailModal(\'' + esc(item.email) + '\',\'' + esc(item.name) + '\')"><i class="fas fa-paper-plane"></i> Email</button>'
            + '<button class="btn btn-danger btn-sm" onclick="deleteAccount(\'' + acctId + '\',\'' + esc(item.name) + '\')"><i class="fas fa-trash"></i></button>'
            + '</div>'
            + '</div>';
    }).join('');
}

function gasWalletIcon(network) {
    if (!network) return '<i class="fas fa-wallet wallet-icon-usdt"></i>';
    var n = network.toUpperCase();
    if (n.includes('TRC') || n.includes('USDT') || n.includes('TRX'))  return '<i class="fas fa-coins wallet-icon-usdt"></i>';
    if (n.includes('BTC'))  return '<i class="fab fa-bitcoin wallet-icon-btc"></i>';
    if (n.includes('LTC'))  return '<i class="fas fa-coins wallet-icon-ltc"></i>';
    if (n.includes('ETH'))  return '<i class="fab fa-ethereum wallet-icon-eth"></i>';
    return '<i class="fas fa-wallet wallet-icon-usdt"></i>';
}

// ── EDIT USER INFO ─────────────────────────────

function openEditAccount(acctId, type, jointId) {
    var acct = adminState.accounts.find(function (a) { return a.id === acctId; }) || {};
    var body = document.getElementById('editAccountBody');

    if (type === 'joint' && jointId) {
        // Joint: show tabs for both users
        var ja  = adminState.jointAccounts.find(function (j) { return j.id === jointId; }) || {};
        var u1  = getUserById(ja.primary_user_id)   || {};
        var u2  = getUserById(ja.secondary_user_id) || {};

        var u1Label = esc(((u1.first_name || '') + ' ' + (u1.last_name || '')).trim()) || 'User 1';
        var u2Label = esc(((u2.first_name || '') + ' ' + (u2.last_name || '')).trim()) || 'User 2';
        var u1Id    = u1.id || '';
        var u2Id    = u2.id || '';

        var tabBar =
            '<div style="display:flex;gap:0;margin-bottom:20px;border-bottom:1px solid var(--border);">'
            + '<button id="ea_tab1" onclick="switchEditUserTab(1)" style="flex:1;padding:10px;background:none;border:none;border-bottom:2px solid var(--accent-primary);color:var(--accent-primary);font-weight:700;cursor:pointer;font-size:.85rem;">'
            + '<i class="fas fa-user"></i> ' + u1Label
            + '</button>'
            + '<button id="ea_tab2" onclick="switchEditUserTab(2)" style="flex:1;padding:10px;background:none;border:none;border-bottom:2px solid transparent;color:var(--text-secondary);cursor:pointer;font-size:.85rem;">'
            + '<i class="fas fa-user"></i> ' + u2Label
            + '</button>'
            + '</div>';

        var panel1 =
            '<div id="ea_panel1">'
            + userEditFields('1', u1)
            + '<div style="display:flex;gap:10px;margin-top:8px;">'
            + '<button class="btn btn-ghost" style="flex:1;" data-close="editAccountModal" onclick="closeModal(this.dataset.close)">Cancel</button>'
            + '<button class="btn btn-ghost" style="flex:1;" onclick="openSendEmailModal(\'' + esc(u1.email || '') + '\',\'' + u1Label + '\')"><i class="fas fa-paper-plane"></i> Email</button>'
            + '<button class="btn btn-primary" style="flex:1;" data-uid="' + u1Id + '" data-sfx="1" onclick="saveUserInfo(this.dataset.uid,this.dataset.sfx)"><i class="fas fa-save"></i> Save ' + u1Label + '</button>'
            + '</div></div>';

        var panel2 =
            '<div id="ea_panel2" style="display:none;">'
            + userEditFields('2', u2)
            + '<div style="display:flex;gap:10px;margin-top:8px;">'
            + '<button class="btn btn-ghost" style="flex:1;" data-close="editAccountModal" onclick="closeModal(this.dataset.close)">Cancel</button>'
            + '<button class="btn btn-ghost" style="flex:1;" onclick="openSendEmailModal(\'' + esc(u2.email || '') + '\',\'' + u2Label + '\')"><i class="fas fa-paper-plane"></i> Email</button>'
            + '<button class="btn btn-primary" style="flex:1;" data-uid="' + u2Id + '" data-sfx="2" onclick="saveUserInfo(this.dataset.uid,this.dataset.sfx)"><i class="fas fa-save"></i> Save ' + u2Label + '</button>'
            + '</div></div>';

        body.innerHTML = tabBar + panel1 + panel2;
    } else {
        // Personal account
        var user = getUserById(acct.user_id) || {};
        var uid  = user.id || '';
        var uName = ((user.first_name || '') + ' ' + (user.last_name || '')).trim() || 'Client';
        body.innerHTML =
            userEditFields('', user)
            + '<div style="display:flex;gap:10px;margin-top:8px;">'
            + '<button class="btn btn-ghost" style="flex:1;" data-close="editAccountModal" onclick="closeModal(this.dataset.close)">Cancel</button>'
            + '<button class="btn btn-ghost" style="flex:1;" onclick="openSendEmailModal(\'' + esc(user.email || '') + '\',\'' + esc(uName) + '\')"><i class="fas fa-paper-plane"></i> Email</button>'
            + '<button class="btn btn-primary" style="flex:1;" data-uid="' + uid + '" data-sfx="" onclick="saveUserInfo(this.dataset.uid,this.dataset.sfx)"><i class="fas fa-save"></i> Save</button>'
            + '</div>';
    }

    openModal('editAccountModal');
}

function userEditFields(suffix, user) {
    var s = suffix ? '_' + suffix : '';
    var avatar = user.profile_picture_url
        ? '<img src="' + esc(user.profile_picture_url) + '" style="width:52px;height:52px;border-radius:50%;object-fit:cover;margin-bottom:14px;display:block;">'
        : '';
    return avatar
        + '<div class="form-group"><label class="form-label">First Name</label>'
        + '<input type="text" id="ea_first' + s + '" class="form-input" value="' + esc(user.first_name || '') + '"></div>'
        + '<div class="form-group"><label class="form-label">Last Name</label>'
        + '<input type="text" id="ea_last' + s + '" class="form-input" value="' + esc(user.last_name || '') + '"></div>'
        + '<div class="form-group"><label class="form-label">Email</label>'
        + '<input type="email" id="ea_email' + s + '" class="form-input" value="' + esc(user.email || '') + '"></div>'
        + '<div class="form-group"><label class="form-label">Profile Photo URL</label>'
        + '<input type="text" id="ea_photo' + s + '" class="form-input" value="' + esc(user.profile_picture_url || '') + '" placeholder="https://…"></div>';
}

function switchEditUserTab(n) {
    var p1 = document.getElementById('ea_panel1');
    var p2 = document.getElementById('ea_panel2');
    var t1 = document.getElementById('ea_tab1');
    var t2 = document.getElementById('ea_tab2');
    if (!p1 || !p2) return;

    p1.style.display = n === 1 ? 'block' : 'none';
    p2.style.display = n === 2 ? 'block' : 'none';

    t1.style.borderBottomColor = n === 1 ? 'var(--accent-primary)' : 'transparent';
    t1.style.color             = n === 1 ? 'var(--accent-primary)' : 'var(--text-secondary)';
    t1.style.fontWeight        = n === 1 ? '700' : '400';

    t2.style.borderBottomColor = n === 2 ? 'var(--accent-primary)' : 'transparent';
    t2.style.color             = n === 2 ? 'var(--accent-primary)' : 'var(--text-secondary)';
    t2.style.fontWeight        = n === 2 ? '700' : '400';
}

async function saveUserInfo(userId, suffix) {
    if (!userId) { toast('User ID missing', 'error'); return; }
    var s     = suffix ? '_' + suffix : '';
    var first = (document.getElementById('ea_first' + s) || {}).value || '';
    var last  = (document.getElementById('ea_last'  + s) || {}).value || '';
    var email = (document.getElementById('ea_email' + s) || {}).value || '';
    var photo = (document.getElementById('ea_photo' + s) || {}).value || '';

    var { error } = await db.from('users').update({
        first_name: first.trim(), last_name: last.trim(),
        email: email.trim(),
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

// ── ADMIN SEND EMAIL ───────────────────────────

function openSendEmailModal(email, name) {
    if (!email) {
        toast('No email address registered for this account', 'error');
        return;
    }
    var nameInput = document.getElementById('se_name');
    var emailInput = document.getElementById('se_email');
    var subjectInput = document.getElementById('se_subject');
    var messageInput = document.getElementById('se_message');

    if (nameInput) nameInput.value = name || 'Valued Client';
    if (emailInput) emailInput.value = email || '';
    if (subjectInput) subjectInput.value = '';
    if (messageInput) messageInput.value = '';

    openModal('sendEmailModal');
}

async function executeAdminSendEmail() {
    var email = (document.getElementById('se_email') || {}).value || '';
    var name = (document.getElementById('se_name') || {}).value || 'Valued Client';
    var subject = ((document.getElementById('se_subject') || {}).value || '').trim();
    var message = ((document.getElementById('se_message') || {}).value || '').trim();
    var btn = document.getElementById('btnAdminSendEmail');

    if (!email) {
        toast('Recipient email is missing', 'error');
        return;
    }
    if (!subject) {
        toast('Please enter an email subject', 'error');
        return;
    }
    if (!message) {
        toast('Please enter an email message', 'error');
        return;
    }

    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending via Gmail SMTP…';
    }

    try {
        var res;
        if (window.EmailService && typeof window.EmailService.sendAdminCustomEmail === 'function') {
            res = await window.EmailService.sendAdminCustomEmail(email, name, subject, message);
        } else {
            // Direct fallback to Supabase Edge function
            var paragraphs = message
                .split(/\n+/)
                .map(function(p) { return p.trim(); })
                .filter(Boolean)
                .map(function(p) { return '<p style="margin: 0 0 16px; color: #334155; font-size: 14.5px; line-height: 1.65;">' + p + '</p>'; })
                .join('');

            var contentHtml = '<!DOCTYPE html><html><body style="margin:0;padding:0;background-color:#F5F2EB;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,sans-serif;color:#1E293B;">'
                + '<table width="100%" cellspacing="0" cellpadding="0" style="background-color:#F5F2EB;padding:32px 12px;"><tr><td align="center">'
                + '<table width="100%" style="max-width:580px;background-color:#FFFFFF;border-radius:12px;overflow:hidden;box-shadow:0 10px 25px rgba(15,42,36,0.06);border:1px solid #E5E0D8;">'
                + '<tr><td style="background-color:#1B0F4A;padding:30px 32px;text-align:left;border-bottom:2px solid #6C3FF0;">'
                + '<div style="font-size:21px;font-weight:700;color:#FAF8F5;letter-spacing:0.5px;font-family:Georgia,serif;">Summit Trust Holding</div>'
                + '<div style="color:#6C3FF0;font-size:11px;margin-top:4px;letter-spacing:1px;text-transform:uppercase;font-weight:600;">Banking, held in trust • London, United Kingdom</div>'
                + '</td></tr>'
                + '<tr><td style="padding:32px 32px 24px;">'
                + '<h2 style="margin:0 0 12px;color:#1B0F4A;font-size:20px;font-weight:700;font-family:Georgia,serif;">' + subject + '</h2>'
                + '<p style="margin:0 0 18px;color:#475569;font-size:14px;font-weight:500;">Dear ' + name + ',</p>'
                + '<div style="background-color:#FAF8F5;border:1px solid #EBE4D8;border-left:4px solid #6C3FF0;border-radius:8px;padding:20px 24px;margin-bottom:24px;">' + paragraphs + '</div>'
                + '<p style="margin:0;color:#64748B;font-size:13px;line-height:1.6;">Should you require any further assistance, our client service desk remains at your disposal.</p>'
                + '</td></tr>'
                + '<tr><td style="background-color:#FAF8F5;padding:20px 32px;border-top:1px solid #E5E0D8;text-align:center;">'
                + '<p style="margin:0;color:#64748B;font-size:12px;line-height:1.5;">© ' + new Date().getFullYear() + ' Summit Trust Holding. All rights reserved.<br>Hochschulstrasse 6, 3012 London, United Kingdom • 256-bit AES encrypted transmission</p>'
                + '</td></tr></table></td></tr></table></body></html>';

            var response = await fetch(SUPABASE_URL + '/functions/v1/send-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': 'Bearer ' + SUPABASE_ANON_KEY
                },
                body: JSON.stringify({
                    type: 'custom',
                    to: email,
                    subject: '[Summit Trust Holding] ' + subject,
                    html: contentHtml,
                    text: 'Dear ' + name + ',\n\n' + message + '\n\n---\nSummit Trust Holding'
                }),
                keepalive: true
            });
            res = { success: response.ok };
        }

        if (res && res.success) {
            toast('Email successfully sent to ' + email + ' via Gmail SMTP', 'success');
            closeModal('sendEmailModal');
        } else {
            var errMsg = (res && res.error) ? res.error : 'Please ensure GMAIL_USER and GMAIL_APP_PASSWORD are set in Supabase project secrets.';
            toast('Failed to send email: ' + errMsg, 'error');
        }
    } catch (err) {
        console.error('executeAdminSendEmail error:', err);
        toast('Error sending email: ' + (err.message || 'Network error'), 'error');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Email';
        }
    }
}

// ── EDIT BALANCE ──────────────────────────────

function openEditBalance(acctId) {
    var acct = adminState.accounts.find(function (a) { return a.id === acctId; }) || {};
    var allowWithdrawal = acct.allow_withdrawal !== false; // default true
    var alertMsg        = esc(acct.withdrawal_alert_msg || '');

    document.getElementById('editBalanceBody').innerHTML =
        // ── Balances ──────────────────────────────
        '<h4 style="margin-bottom:14px;font-size:.82rem;color:var(--text-secondary);text-transform:uppercase;letter-spacing:.06em;">Balances & Currency</h4>'
        + '<div class="form-group"><label class="form-label">Available Balance</label>'
        + '<input type="number" id="eb_balance" class="form-input" step="0.01" value="' + (acct.balance || 0) + '"></div>'
        + '<div class="form-group"><label class="form-label">Gas Balance</label>'
        + '<input type="number" id="eb_gas" class="form-input" step="0.01" value="' + (acct.gas_balance || 0) + '"></div>'
        + '<div class="form-group"><label class="form-label">BTC Balance</label>'
        + '<input type="number" id="eb_btc" class="form-input" step="0.00000001" value="' + (acct.btc_balance || 0) + '"></div>'
        + '<div class="form-group"><label class="form-label">LTC Balance</label>'
        + '<input type="number" id="eb_ltc" class="form-input" step="0.00000001" value="' + (acct.ltc_balance || 0) + '"></div>'
        + '<div class="form-group"><label class="form-label">Account Currency</label>'
        + '<select id="eb_currency" class="form-input" style="background:var(--bg-secondary);color:var(--text-primary);border:1px solid var(--border);border-radius:6px;padding:8px 12px;width:100%;">'
        + '<option value="USD"' + (acct.currency === 'USD' ? ' selected' : '') + '>USD ($)</option>'
        + '<option value="ZAR"' + (acct.currency === 'ZAR' ? ' selected' : '') + '>ZAR (R)</option>'
        + '<option value="BWP"' + (acct.currency === 'BWP' ? ' selected' : '') + '>BWP (P)</option>'
        + '<option value="MXN"' + (acct.currency === 'MXN' ? ' selected' : '') + '>MXN ($)</option>'
        + '<option value="PHP"' + (acct.currency === 'PHP' ? ' selected' : '') + '>PHP (₱)</option>'
        + '<option value="ARS"' + (acct.currency === 'ARS' ? ' selected' : '') + '>ARS ($)</option>'
        + '<option value="COP"' + (acct.currency === 'COP' ? ' selected' : '') + '>COP ($)</option>'
        + '<option value="CLP"' + (acct.currency === 'CLP' ? ' selected' : '') + '>CLP ($)</option>'
        + '</select></div>'

        // ── Withdrawal Control ─────────────────────
        + '<div style="margin:20px 0 14px;padding-top:18px;border-top:1px solid var(--border);">'
        + '<h4 style="margin-bottom:14px;font-size:.82rem;color:var(--text-secondary);text-transform:uppercase;letter-spacing:.06em;display:flex;align-items:center;gap:6px;">'
        + '<i class="fas fa-ban" style="color:var(--error);"></i> Withdrawal Control'
        + '</h4>'

        // Toggle switch row
        + '<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px;background:var(--bg-secondary);border:1px solid var(--border);border-radius:10px;margin-bottom:14px;">'
        + '<div>'
        + '<div style="font-weight:600;font-size:.9rem;color:var(--text-primary);">Allow Withdrawals</div>'
        + '<div style="font-size:.78rem;color:var(--text-secondary);margin-top:2px;">When OFF, the user cannot send or transfer money</div>'
        + '</div>'
        + '<label style="position:relative;display:inline-block;width:48px;height:26px;flex-shrink:0;">'
        + '<input type="checkbox" id="eb_allow_withdrawal" style="opacity:0;width:0;height:0;"'
        + (allowWithdrawal ? ' checked' : '')
        + ' onchange="document.getElementById(\'eb_withdrawal_msg_row\').style.display=this.checked?\'none\':\'block\'">'
        + '<span style="position:absolute;cursor:pointer;inset:0;background:' + (allowWithdrawal ? 'var(--accent-primary)' : 'var(--error)') + ';border-radius:26px;transition:.3s;"'
        + ' id="eb_toggle_track"></span>'
        + '<span style="position:absolute;content:\'\';height:20px;width:20px;left:' + (allowWithdrawal ? '24px' : '3px') + ';bottom:3px;background:#fff;border-radius:50%;transition:.3s;"'
        + ' id="eb_toggle_knob"></span>'
        + '</label>'
        + '</div>'

        // Alert message textarea (hidden when allowed)
        + '<div id="eb_withdrawal_msg_row" style="display:' + (allowWithdrawal ? 'none' : 'block') + ';">'
        + '<div class="form-group" style="margin-bottom:0;">'
        + '<label class="form-label" style="display:flex;align-items:center;gap:6px;">'
        + '<i class="fas fa-comment-alt" style="color:var(--warning);"></i> Alert Message shown to user'
        + '</label>'
        + '<textarea id="eb_withdrawal_msg" class="form-input" rows="3" placeholder="e.g. Your account withdrawals are temporarily suspended. Please contact support for assistance." style="resize:vertical;min-height:80px;">'
        + alertMsg
        + '</textarea>'
        + '<div style="font-size:.75rem;color:var(--text-secondary);margin-top:6px;"><i class="fas fa-info-circle"></i> This message appears as an alert when the user tries to Send Money.</div>'
        + '</div>'
        + '</div>'
        + '</div>'

        // ── Actions ────────────────────────────────
        + '<div style="display:flex;gap:10px;margin-top:8px;">'
        + '<button class="btn btn-ghost" style="flex:1;" onclick="closeModal(\'editBalanceModal\')">Cancel</button>'
        + '<button class="btn btn-primary" style="flex:1;" onclick="saveBalance(\'' + acctId + '\')"><i class="fas fa-save"></i> Save</button>'
        + '</div>';

    // Wire the toggle visual after render
    requestAnimationFrame(function () {
        var cb    = document.getElementById('eb_allow_withdrawal');
        var track = document.getElementById('eb_toggle_track');
        var knob  = document.getElementById('eb_toggle_knob');
        if (!cb || !track || !knob) return;
        cb.addEventListener('change', function () {
            track.style.background = cb.checked ? 'var(--accent-primary)' : 'var(--error)';
            knob.style.left        = cb.checked ? '24px' : '3px';
        });
    });

    openModal('editBalanceModal');
}

async function saveBalance(acctId) {
    var balance    = parseFloat(document.getElementById('eb_balance').value) || 0;
    var gas        = parseFloat(document.getElementById('eb_gas').value)     || 0;
    var btc        = parseFloat(document.getElementById('eb_btc').value)     || 0;
    var ltc        = parseFloat(document.getElementById('eb_ltc').value)     || 0;
    var currencyEl = document.getElementById('eb_currency');
    var currency   = currencyEl ? currencyEl.value : 'USD';

    var allowWdEl  = document.getElementById('eb_allow_withdrawal');
    var alertMsgEl = document.getElementById('eb_withdrawal_msg');
    var allowWd    = allowWdEl  ? allowWdEl.checked : true;
    var alertMsg   = alertMsgEl ? (alertMsgEl.value || '').trim() : '';

    var basePayload = {
        balance:    balance,
        currency:   currency,
        updated_at: new Date().toISOString()
    };

    var fullPayload = Object.assign({}, basePayload, {
        gas_balance:          gas,
        btc_balance:          btc,
        ltc_balance:          ltc,
        allow_withdrawal:     allowWd,
        withdrawal_alert_msg: allowWd ? null : (alertMsg || null)
    });

    var res = await db.from('accounts').update(fullPayload).eq('id', acctId);
    if (res.error) {
        console.warn('Full update failed, trying base balance/currency update:', res.error);
        var baseRes = await db.from('accounts').update(basePayload).eq('id', acctId);
        if (baseRes.error) {
            toast('Error: ' + baseRes.error.message, 'error');
            return;
        }
        toast('Balance and currency updated (run SQL migration to save crypto & gas fields)', 'info');
    } else {
        toast(
            allowWd ? 'Balance and currency updated — withdrawals enabled' : 'Balance and currency updated — withdrawals DISABLED',
            allowWd ? 'success' : 'warning'
        );
    }

    closeModal('editBalanceModal');
    await loadAccounts();
    renderAccountsGrid();
}

// ── EDIT WALLETS ──────────────────────────────

function openEditWallets(acctId) {
    var acct = adminState.accounts.find(function (a) { return a.id === acctId; }) || {};
    document.getElementById('editWalletsBody').innerHTML =
        '<h4 style="margin-bottom:14px;font-size:.85rem;color:var(--text2);text-transform:uppercase;letter-spacing:.06em;">Crypto Wallets</h4>'
        + '<div class="form-group"><label class="form-label"><i class="fab fa-bitcoin wallet-icon-btc"></i> Bitcoin (BTC) Address</label>'
        + '<input type="text" id="ew_btc" class="form-input" value="' + esc(acct.btc_address || '') + '" placeholder="bc1q… or 1… or 3…"></div>'
        + '<div class="form-group"><label class="form-label"><i class="fas fa-coins wallet-icon-ltc"></i> Litecoin (LTC) Address</label>'
        + '<input type="text" id="ew_ltc" class="form-input" value="' + esc(acct.ltc_address || '') + '" placeholder="L… or M…"></div>'
        + '<h4 style="margin:18px 0 14px;font-size:.85rem;color:var(--text2);text-transform:uppercase;letter-spacing:.06em;">Gas Wallet</h4>'
        + '<div class="form-group"><label class="form-label">Network / Type</label>'
        + '<select id="ew_gas_network" class="form-select">'
        + ['TRC20 (USDT)','ERC20 (USDT)'].map(function (n) {
            var val = n.split(' ')[0];
            return '<option value="' + val + '"' + (acct.gas_wallet_network === val ? ' selected' : '') + '>' + n + '</option>';
          }).join('')
        + '</select></div>'
        + '<div class="form-group"><label class="form-label">Gas Wallet Address</label>'
        + '<input type="text" id="ew_gas_addr" class="form-input" value="' + esc(acct.gas_wallet_address || '') + '" placeholder="Wallet address…"></div>'
        + '<div style="display:flex;gap:10px;margin-top:8px;">'
        + '<button class="btn btn-ghost" style="flex:1;" onclick="closeModal(\'editWalletsModal\')">Cancel</button>'
        + '<button class="btn btn-primary" style="flex:1;" onclick="saveWallets(\'' + acctId + '\')"><i class="fas fa-save"></i> Save</button>'
        + '</div>';
    openModal('editWalletsModal');
}

async function saveWallets(acctId) {
    var btcAddr  = document.getElementById('ew_btc').value.trim()       || null;
    var ltcAddr  = document.getElementById('ew_ltc').value.trim()       || null;
    var gasNet   = document.getElementById('ew_gas_network').value      || null;
    var gasAddr  = document.getElementById('ew_gas_addr').value.trim()  || null;

    var { error } = await db.from('accounts').update({
        btc_address:        btcAddr,
        ltc_address:        ltcAddr,
        gas_wallet_network: gasNet,
        gas_wallet_address: gasAddr,
        updated_at:         new Date().toISOString()
    }).eq('id', acctId);

    if (error) {
        toast('Error: ' + error.message + ' (run SQL migration to add wallet columns to accounts table)', 'error');
        return;
    }
    toast('Wallets updated', 'success');
    closeModal('editWalletsModal');
    await loadAccounts();
    renderAccountsGrid();
}

// ── DELETE ACCOUNT ────────────────────────────

function deleteAccount(acctId, name) {
    confirmDelete('Permanently delete account for <strong>' + esc(name) + '</strong>? This cannot be undone.', async function () {
        var acct = adminState.accounts.find(function (a) { return a.id === acctId; });
        if (!acct) return;

        try {
            if (acct.joint_account_id) {
                var r1 = await db.rpc('admin_delete_record', { target_table: 'accounts', target_id: acctId });
                if (r1.error) throw r1.error;
                var r2 = await db.rpc('admin_delete_record', { target_table: 'joint_accounts', target_id: acct.joint_account_id });
                if (r2.error) throw r2.error;
            } else {
                var r1 = await db.rpc('admin_delete_record', { target_table: 'accounts', target_id: acctId });
                if (r1.error) throw r1.error;
                if (acct.user_id) {
                    var r2 = await db.rpc('admin_delete_record', { target_table: 'users', target_id: acct.user_id });
                    if (r2.error) throw r2.error;
                }
            }

            toast('Account deleted', 'success');
            await loadUsers();
            await loadAccounts();
            await loadJointAccounts();
            renderAccountsGrid();
        } catch (err) {
            toast('Error deleting: ' + err.message, 'error');
        }
    });
}

// ── TRANSACTIONS ──────────────────────────────

async function loadTransactions() {
    var { data } = await db.from('transactions').select('*').order('created_at', { ascending: false }).limit(500);
    adminState.transactions = data || [];
    filterTx();
}

function filterTx() {
    var search  = (document.getElementById('txSearch').value  || '').toLowerCase();
    var typeF   = document.getElementById('txTypeFilter').value;
    var statusF = document.getElementById('txStatusFilter').value;

    var rows = adminState.transactions.filter(function (t) {
        var matchSearch = !search || (t.description || '').toLowerCase().includes(search) || (t.transaction_reference || '').toLowerCase().includes(search);
        var matchType   = !typeF   || t.transaction_type === typeF;
        var matchStatus = !statusF || t.status === statusF;
        return matchSearch && matchType && matchStatus;
    });

    // Sort
    var col = adminState.txSort, dir = adminState.txDir;
    rows.sort(function (a, b) {
        var av = a[col] || '', bv = b[col] || '';
        if (col === 'amount') { av = parseFloat(av); bv = parseFloat(bv); }
        if (av < bv) return dir === 'asc' ? -1 : 1;
        if (av > bv) return dir === 'asc' ? 1  : -1;
        return 0;
    });

    renderTxTable(rows);
}

function sortTx(col) {
    if (adminState.txSort === col) {
        adminState.txDir = adminState.txDir === 'asc' ? 'desc' : 'asc';
    } else {
        adminState.txSort = col;
        adminState.txDir  = 'desc';
    }
    filterTx();
}

var TX_STATUSES = ['pending','processing','completed','failed','rejected','cancelled'];

function renderTxTable(rows) {
    var start = (adminState.txPage - 1) * adminState.PAGE_SIZE;
    var page  = rows.slice(start, start + adminState.PAGE_SIZE);

    var tbody = document.getElementById('txBody');
    if (!page.length) {
        tbody.innerHTML = '<tr class="empty-row"><td colspan="7">No transactions found.</td></tr>';
        renderPagination('txPagination', rows.length, adminState.txPage, function (p) { adminState.txPage = p; filterTx(); });
        return;
    }

    tbody.innerHTML = page.map(function (t) {
        var user  = getUserById(t.user_id || t.from_user_id) || {};
        var uName = ((user.first_name || '') + ' ' + (user.last_name || '')).trim() || (user.email || t.user_id || '—');
        return '<tr>'
            + '<td>' + fmtDate(t.created_at) + '</td>'
            + '<td style="max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + esc(uName) + '</td>'
            + '<td><span class="badge" style="background:rgba(99,102,241,.15);color:#a5b4fc;">' + (t.transaction_type || '—') + '</span></td>'
            + '<td style="font-weight:700;">' + fmtCurrency(t.amount) + '</td>'
            + '<td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text2);">' + esc(t.description || '—') + '</td>'
            + '<td>'
            + '<select class="inline-select" onchange="updateTxStatus(\'' + t.id + '\',this.value)">'
            + TX_STATUSES.map(function (s) { return '<option' + (t.status === s ? ' selected' : '') + '>' + s + '</option>'; }).join('')
            + '</select></td>'
            + '<td><button class="btn btn-danger btn-sm" onclick="deleteTx(\'' + t.id + '\')"><i class="fas fa-trash"></i></button></td>'
            + '</tr>';
    }).join('');

    renderPagination('txPagination', rows.length, adminState.txPage, function (p) { adminState.txPage = p; filterTx(); });
}

async function updateTxStatus(id, status) {
    var extra = {};
    if (status === 'completed') extra.completed_at = new Date().toISOString();
    if (status === 'failed')    extra.failed_at     = new Date().toISOString();
    var { error } = await db.from('transactions').update(Object.assign({ status: status, updated_at: new Date().toISOString() }, extra)).eq('id', id);
    if (error) { toast('Error: ' + error.message, 'error'); return; }
    var t = adminState.transactions.find(function (x) { return x.id === id; });
    var prevStatus = t ? t.status : null;
    if (t) t.status = status;
    toast('Transaction status updated', 'success');

    // ── Verification completed → email the client.
    // The matching in-app notification is created by the DB trigger on status change.
    if (status === 'completed' && prevStatus !== 'completed') {
        sendTxCompletionEmail(t);
    }
}

// Dispatch the "withdrawal completed" email to the client after verification.
function sendTxCompletionEmail(t) {
    try {
        if (!t || !window.EmailService) return;

        var user  = getUserById(t.user_id || t.from_user_id) || {};
        var acct  = adminState.accounts.find(function (a) {
            return (t.from_account_id && a.id === t.from_account_id)
                || (t.user_id && a.user_id === t.user_id)
                || (t.from_user_id && a.user_id === t.from_user_id);
        }) || {};
        var userName  = (((user.first_name || '') + ' ' + (user.last_name || '')).trim()) || 'Valued Client';
        var userEmail = user.email || t.from_email || null;
        if (!userEmail) return;

        var type    = t.transaction_type || 'transfer';
        var isDebit = ['transfer', 'withdrawal', 'send', 'card_purchase', 'card_payment', 'fee', 'investment_deposit'].includes(type);
        var currency = (t.currency || 'USD').toUpperCase();
        var rates    = (window.CurrencyConverter && window.CurrencyConverter.cache && window.CurrencyConverter.cache.rates) || { USD: 1.0 };
        var rate     = rates[currency] || 1.0;
        var localAmt = parseFloat(t.total_amount) || parseFloat(t.amount) || 0;
        var usdAmt   = parseFloat(t.amount) || (rate ? localAmt / rate : localAmt);
        var counter  = isDebit ? (t.to_email || 'External Beneficiary') : (t.from_email || 'Institutional Direct Clearing');

        EmailService.notifyTransaction({
            userName:         userName,
            userEmail:        userEmail,
            amount:           usdAmt,
            currency:         currency,
            type:             type,
            isDebit:          isDebit,
            method:           isDebit ? 'Bank Transfer / Wire' : 'Institutional Direct Credit',
            counterparty:     counter,
            senderName:       isDebit ? userName : counter,
            recipientName:    isDebit ? counter : userName,
            recipientAccount: isDebit ? (counter || 'Beneficiary Account') : (acct.account_number || 'Private Wealth Account'),
            accountNumber:    acct.account_number || 'N/A',
            reference:        t.transaction_reference || 'REF-' + Date.now().toString(36).toUpperCase(),
            status:           'completed'
        }).catch(function (err) {
            console.warn('Completion email error:', err);
        });
    } catch (err) {
        console.warn('Completion email error:', err);
    }
}

async function deleteTx(id) {
    var { error } = await db.rpc('admin_delete_record', { target_table: 'transactions', target_id: id });
    if (error) { toast('Error: ' + error.message, 'error'); return; }
    adminState.transactions = adminState.transactions.filter(function (t) { return t.id !== id; });
    filterTx();
    toast('Transaction deleted', 'success');
}

// ── ADD TEST TRANSACTION (ADMIN) ─────────────

var TX_DESC_TEMPLATES = [
    'Federal Reserve Wire Clearing',
    'Direct Deposit — Private Wealth Management',
    'Swiss Sovereign Yield Distribution',
    'Commercial Wire Transfer Credit',
    'Account Opening Credit Allocation',
    'Offshore Investment Return',
    'Treasury Capital Settlement',
    'Consulting Retainer Settlement',
    'Institutional Account Maintenance Fee',
    'Executive Asset Liquidation'
];
var _txDescTplIdx = 0;

function openAddTransactionModal(preselectedAcctId) {
    var select = document.getElementById('atx_account');
    if (!select) return;

    // Populate accounts dropdown: Personal & Joint
    select.innerHTML = adminState.accounts.map(function (acct) {
        var label = '';
        var acctNum = acct.account_number || 'No Account #';
        var balStr = fmtCurrency(acct.balance || 0);

        if (acct.joint_account_id) {
            var ja = adminState.jointAccounts.find(function (j) { return j.id === acct.joint_account_id; }) || {};
            var u1 = getUserById(ja.primary_user_id) || {};
            var u2 = getUserById(ja.secondary_user_id) || {};
            var names = [((u1.first_name || '') + ' ' + (u1.last_name || '')).trim(), ((u2.first_name || '') + ' ' + (u2.last_name || '')).trim()].filter(Boolean).join(' & ');
            label = (names || 'Joint Account') + ' [Joint] • ' + acctNum + ' • Bal: ' + balStr;
        } else {
            var u = getUserById(acct.user_id) || {};
            var uName = ((u.first_name || '') + ' ' + (u.last_name || '')).trim() || u.email || 'Personal Account';
            label = uName + ' [Personal] • ' + acctNum + ' • Bal: ' + balStr;
        }

        var isSelected = (preselectedAcctId && preselectedAcctId === acct.id) ? ' selected' : '';
        return '<option value="' + esc(acct.id) + '"' + isSelected + '>' + esc(label) + '</option>';
    }).join('');

    // Preselect account if given, or keep first
    if (preselectedAcctId) {
        select.value = preselectedAcctId;
    }

    // Default datetime to now (local timezone YYYY-MM-DDTHH:mm)
    var now = new Date();
    var tzOffsetMs = now.getTimezoneOffset() * 60000;
    var localISOTime = (new Date(now.getTime() - tzOffsetMs)).toISOString().slice(0, 16);
    var dtInput = document.getElementById('atx_datetime');
    if (dtInput) dtInput.value = localISOTime;

    // Reset inputs
    var amtInput = document.getElementById('atx_amount');
    if (amtInput) amtInput.value = '';
    var descInput = document.getElementById('atx_description');
    if (descInput) descInput.value = 'Federal Reserve Wire Clearing';
    var refInput = document.getElementById('atx_reference');
    if (refInput) refInput.value = '';
    var cpInput = document.getElementById('atx_counterparty');
    if (cpInput) cpInput.value = 'UBS Zurich Clearing';

    var statusSel = document.getElementById('atx_status');
    if (statusSel) statusSel.value = 'completed';
    var typeSel = document.getElementById('atx_type');
    if (typeSel) typeSel.value = 'receive';

    onTxAccountChange();
    onTxTypeChange();

    openModal('addTxModal');
}

function onTxAccountChange() {
    var acctId = document.getElementById('atx_account')?.value;
    var acct = adminState.accounts.find(function (a) { return a.id === acctId; });
    var currSel = document.getElementById('atx_currency');
    if (acct && currSel) {
        currSel.value = acct.currency || 'USD';
    }
    updateTxBalancePreview();
}

function onTxTypeChange() {
    var type = document.getElementById('atx_type')?.value || 'receive';
    var isDebit = ['transfer', 'withdrawal', 'send', 'card_purchase', 'card_payment', 'fee', 'investment_deposit'].includes(type);
    var cpLabel = document.getElementById('atx_counterparty_label');
    var cpInput = document.getElementById('atx_counterparty');
    var descInput = document.getElementById('atx_description');

    if (cpLabel) {
        cpLabel.textContent = isDebit ? 'Recipient / Payee (To)' : 'Sender / Clearing Source (From)';
    }

    if (cpInput && descInput) {
        if (isDebit) {
            if (!cpInput.value || cpInput.value === 'UBS Zurich Clearing') cpInput.value = 'International Beneficiary / Wire';
            if (!descInput.value || descInput.value === 'Federal Reserve Wire Clearing') descInput.value = 'Outward Wire Transfer';
        } else {
            if (!cpInput.value || cpInput.value === 'International Beneficiary / Wire') cpInput.value = 'UBS Zurich Clearing';
            if (!descInput.value || descInput.value === 'Outward Wire Transfer') descInput.value = 'Federal Reserve Wire Clearing';
        }
    }

    updateTxBalancePreview();
}

function updateTxBalancePreview() {
    var syncEl = document.getElementById('atx_sync_balance');
    var preview = document.getElementById('atx_balance_impact_preview');
    var type = document.getElementById('atx_type')?.value || 'receive';
    if (!preview) return;

    if (!syncEl || !syncEl.checked) {
        preview.textContent = 'Balance will NOT change (history only)';
        preview.style.color = 'var(--text-secondary)';
        return;
    }

    var isDebit = ['transfer', 'withdrawal', 'send', 'card_purchase', 'card_payment', 'fee', 'investment_deposit'].includes(type);
    if (isDebit) {
        preview.textContent = '- Will debit account balance';
        preview.style.color = 'var(--error, #ef4444)';
    } else {
        preview.textContent = '+ Will credit account balance';
        preview.style.color = 'var(--success, #22c55e)';
    }
}

function cycleTxDescriptionTemplate() {
    var input = document.getElementById('atx_description');
    if (!input) return;
    input.value = TX_DESC_TEMPLATES[_txDescTplIdx % TX_DESC_TEMPLATES.length];
    _txDescTplIdx++;
}

async function submitAdminAddTransaction() {
    var btn = document.getElementById('btnSubmitAddTx');
    var acctId = document.getElementById('atx_account')?.value;
    var type = document.getElementById('atx_type')?.value || 'receive';
    var status = document.getElementById('atx_status')?.value || 'completed';
    var rawAmount = parseFloat(document.getElementById('atx_amount')?.value || '0');
    var currency = document.getElementById('atx_currency')?.value || 'USD';
    var description = (document.getElementById('atx_description')?.value || '').trim() || 'Transaction';
    var counterparty = (document.getElementById('atx_counterparty')?.value || '').trim();
    var datetimeVal = document.getElementById('atx_datetime')?.value;
    var userRef = (document.getElementById('atx_reference')?.value || '').trim();
    var syncBalance = document.getElementById('atx_sync_balance')?.checked;
    var sendEmail = document.getElementById('atx_send_email')?.checked;

    if (!acctId) { toast('Please select a target account', 'error'); return; }
    if (isNaN(rawAmount) || rawAmount <= 0) { toast('Please enter a valid amount greater than 0', 'error'); return; }

    var acct = adminState.accounts.find(function (a) { return a.id === acctId; });
    if (!acct) { toast('Selected account not found', 'error'); return; }

    // Resolve user info
    var primaryUser = null;
    var jointAccount = null;
    if (acct.joint_account_id) {
        jointAccount = adminState.jointAccounts.find(function (j) { return j.id === acct.joint_account_id; });
        if (jointAccount) primaryUser = getUserById(jointAccount.primary_user_id);
    } else {
        primaryUser = getUserById(acct.user_id);
    }

    var userEmail = (primaryUser && primaryUser.email) ? primaryUser.email : (acct.account_number + '@client.rcb');
    var userName = primaryUser ? (((primaryUser.first_name || '') + ' ' + (primaryUser.last_name || '')).trim() || primaryUser.email) : 'Valued Client';

    // Get exchange rate for currency to USD
    var rates = (window.CurrencyConverter && window.CurrencyConverter.cache && window.CurrencyConverter.cache.rates) || { USD: 1.0 };
    var rate = rates[currency] || 1.0;
    var amountInUSD = parseFloat((rawAmount / rate).toFixed(2));
    var totalAmount = rawAmount;

    // Generate reference: custom or RC-TX-XXXX
    var ref = userRef || ('RC-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase());

    // Timestamp
    var dateIso = datetimeVal ? new Date(datetimeVal).toISOString() : new Date().toISOString();

    var isDebit = ['transfer', 'withdrawal', 'send', 'card_purchase', 'card_payment', 'fee', 'investment_deposit'].includes(type);

    var fromEmail = isDebit ? userEmail : (counterparty || 'Federal Reserve Clearing');
    var toEmail = isDebit ? (counterparty || 'External Beneficiary') : userEmail;

    var txRecord = {
        transaction_reference: ref,
        user_id: primaryUser ? primaryUser.id : acct.user_id,
        transaction_type: type,
        amount: amountInUSD,
        fee: 0.00,
        total_amount: totalAmount,
        currency: currency,
        description: description,
        status: status,
        requires_approval: false,
        from_email: fromEmail,
        to_email: toEmail,
        created_at: dateIso,
        completed_at: status === 'completed' ? dateIso : null,
        metadata: {
            exchange_rate: rate,
            local_amount: totalAmount,
            counterparty: counterparty,
            admin_created: true
        }
    };

    if (acct.joint_account_id) {
        txRecord.joint_account_id = acct.joint_account_id;
        txRecord.initiated_by_user_id = primaryUser ? primaryUser.id : null;
    }

    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    }

    try {
        // 1. Insert Transaction into Supabase
        var txRes = await db.from('transactions').insert([txRecord]).select().single();
        if (txRes.error) throw txRes.error;

        // 2. Adjust Balance if requested
        if (syncBalance) {
            var curBal = parseFloat(acct.balance || 0);
            var deltaUSD = isDebit ? -amountInUSD : +amountInUSD;
            var newBal = Math.max(0, curBal + deltaUSD);

            var acctUpdate = await db.from('accounts').update({
                balance: newBal,
                updated_at: new Date().toISOString()
            }).eq('id', acct.id);

            if (acctUpdate.error) {
                console.warn('Balance adjustment error:', acctUpdate.error);
                toast('Transaction saved, but balance update failed: ' + acctUpdate.error.message, 'error');
            } else {
                acct.balance = newBal;
            }
        }

        // 3. Dispatch Email Alert if requested
        if (sendEmail && primaryUser && primaryUser.email && window.EmailService) {
            try {
                await EmailService.notifyTransaction({
                    userEmail: primaryUser.email,
                    userName: userName,
                    amount: totalAmount,
                    currency: currency,
                    type: type,
                    isDebit: isDebit,
                    method: isDebit ? 'Institutional Wire Debit' : 'Institutional Direct Credit',
                    counterparty: counterparty,
                    senderName: isDebit ? userName : (counterparty || 'Institutional Direct Clearing'),
                    senderAccount: isDebit ? acct.account_number : (counterparty || 'Federal Reserve Clearing'),
                    recipientName: isDebit ? (counterparty || 'External Beneficiary') : userName,
                    recipientAccount: isDebit ? (counterparty || 'Beneficiary Account') : acct.account_number,
                    accountNumber: acct.account_number,
                    routingNumber: '021000021',
                    reference: ref,
                    status: status
                });
            } catch (emailErr) {
                console.warn('Transaction email alert error:', emailErr);
            }
        }

        toast('Transaction ' + ref + ' created successfully!' + (syncBalance ? ' Balance updated.' : ''), 'success');
        closeModal('addTxModal');

        // Refresh UI tables
        await Promise.all([loadAccounts(), loadTransactions()]);
        renderAccountsGrid();

    } catch (err) {
        console.error('Failed to create transaction:', err);
        toast('Error creating transaction: ' + (err.message || err), 'error');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-check-circle"></i> Add Transaction';
        }
    }
}

// ── CARDS ─────────────────────────────────────

var CARD_STATUSES = ['pending','processing','approved','active','shipped','delivered','rejected','cancelled'];

async function loadCards() {
    var { data } = await db.from('card_applications').select('*').order('created_at', { ascending: false });
    adminState.cards = data || [];
    filterCards();
}

function filterCards() {
    var search  = (document.getElementById('cardSearch').value || '').toLowerCase();
    var statusF = document.getElementById('cardStatusFilter').value;
    var rows = adminState.cards.filter(function (c) {
        var matchS = !search || (c.card_holder || '').toLowerCase().includes(search) || (c.card_network || '').toLowerCase().includes(search);
        var matchSt = !statusF || c.status === statusF;
        return matchS && matchSt;
    });
    renderCardsTable(rows);
}

function renderCardsTable(rows) {
    var start = (adminState.cardPage - 1) * adminState.PAGE_SIZE;
    var page  = rows.slice(start, start + adminState.PAGE_SIZE);

    var netIcon = { visa:'fab fa-cc-visa', mastercard:'fab fa-cc-mastercard', amex:'fab fa-cc-amex' };

    document.getElementById('cardsBody').innerHTML = !page.length
        ? '<tr class="empty-row"><td colspan="8">No cards found.</td></tr>'
        : page.map(function (c) {
            var icon = netIcon[(c.card_network || '').toLowerCase()] || 'fas fa-credit-card';
            var user = getUserById(c.user_id) || {};
            var uName = ((user.first_name||'')+(user.last_name?' '+user.last_name:'')).trim() || (user.email||'—');
            var wLabel = c.wallet_type === 'crypto' ? ((c.crypto_coin||'crypto').toUpperCase()) : 'USD';
            return '<tr>'
                + '<td>' + fmtDate(c.created_at) + '</td>'
                + '<td>' + esc(c.card_holder || uName) + '</td>'
                + '<td><i class="' + icon + '"></i> ' + esc(c.card_network || '—') + '</td>'
                + '<td>' + esc(c.delivery_type || '—') + '</td>'
                + '<td>' + wLabel + '</td>'
                + '<td style="font-size:.72rem;color:var(--text2);">' + esc(c.application_reference || '—') + '</td>'
                + '<td><select class="inline-select" onchange="updateCardStatus(\'' + c.id + '\',this.value)">'
                + CARD_STATUSES.map(function (s) { return '<option' + (c.status === s ? ' selected':'') + '>' + s + '</option>'; }).join('')
                + '</select></td>'
                + '<td><button class="btn btn-danger btn-sm" onclick="deleteCard(\'' + c.id + '\')"><i class="fas fa-trash"></i></button></td>'
                + '</tr>';
        }).join('');

    renderPagination('cardsPagination', rows.length, adminState.cardPage, function (p) { adminState.cardPage = p; filterCards(); });
}

async function updateCardStatus(id, status) {
    var { error } = await db.from('card_applications').update({ status: status }).eq('id', id);
    if (error) { toast('Error: ' + error.message, 'error'); return; }
    var c = adminState.cards.find(function (x) { return x.id === id; });
    if (c) c.status = status;
    toast('Card status → ' + status, 'success');
}

async function deleteCard(id) {
    var { error } = await db.rpc('admin_delete_record', { target_table: 'card_applications', target_id: id });
    if (error) { toast('Error: ' + error.message, 'error'); return; }
    adminState.cards = adminState.cards.filter(function (c) { return c.id !== id; });
    filterCards();
    toast('Card deleted', 'success');
}

// ── LOANS ─────────────────────────────────────

var LOAN_STATUSES = ['processing','approved','disbursed','rejected','cancelled','repaid'];

async function loadLoans() {
    var { data } = await db.from('loan_applications').select('*').order('created_at', { ascending: false });
    adminState.loans = data || [];
    filterLoans();
}

function filterLoans() {
    var search  = (document.getElementById('loanSearch').value || '').toLowerCase();
    var statusF = document.getElementById('loanStatusFilter').value;
    var rows = adminState.loans.filter(function (l) {
        var matchS  = !search || (l.purpose || '').toLowerCase().includes(search) || (l.application_reference || '').toLowerCase().includes(search);
        var matchSt = !statusF || l.status === statusF;
        return matchS && matchSt;
    });
    renderLoansTable(rows);
}

function renderLoansTable(rows) {
    var start = (adminState.loanPage - 1) * adminState.PAGE_SIZE;
    var page  = rows.slice(start, start + adminState.PAGE_SIZE);

    document.getElementById('loansBody').innerHTML = !page.length
        ? '<tr class="empty-row"><td colspan="9">No loans found.</td></tr>'
        : page.map(function (l) {
            var user  = getUserById(l.user_id || l.initiated_by_user_id) || {};
            var uName = ((user.first_name||'')+(user.last_name?' '+user.last_name:'')).trim() || (user.email||'—');
            return '<tr>'
                + '<td>' + fmtDate(l.created_at) + '</td>'
                + '<td>' + esc(uName) + '</td>'
                + '<td style="font-weight:700;">L' + (l.level||1) + '</td>'
                + '<td>' + fmtCurrency(l.amount) + '</td>'
                + '<td>' + fmtCurrency(l.total_repayable) + '</td>'
                + '<td>' + (l.term_months||'—') + ' mo</td>'
                + '<td style="font-size:.72rem;color:var(--text2);">' + esc(l.application_reference||'—') + '</td>'
                + '<td><select class="inline-select" onchange="updateLoanStatus(\'' + l.id + '\',this.value)">'
                + LOAN_STATUSES.map(function (s) { return '<option'+(l.status===s?' selected':'')+'>'+s+'</option>'; }).join('')
                + '</select></td>'
                + '<td><button class="btn btn-danger btn-sm" onclick="deleteLoan(\'' + l.id + '\')"><i class="fas fa-trash"></i></button></td>'
                + '</tr>';
        }).join('');

    renderPagination('loansPagination', rows.length, adminState.loanPage, function (p) { adminState.loanPage = p; filterLoans(); });
}

async function updateLoanStatus(id, status) {
    var l = adminState.loans.find(function (x) { return x.id === id; });
    var updatePayload = { status: status };
    var nowIso = new Date().toISOString();

    // Check if this action is an approval or disbursal
    var isApproving = status === 'approved' || status === 'disbursed';

    if (isApproving) {
        // Prevent duplicate crediting if already approved or disbursed
        if (l && (l.disbursed_at || l.status === 'approved' || l.status === 'disbursed')) {
            toast('This loan application has already been approved and credited.', 'info');
            return;
        }
        updatePayload.approved_at = nowIso;
        updatePayload.disbursed_at = nowIso;
    }

    var { error } = await db.from('loan_applications').update(updatePayload).eq('id', id);
    if (error) { toast('Error: ' + error.message, 'error'); return; }

    if (l) {
        l.status = status;
        if (isApproving) {
            l.approved_at = nowIso;
            l.disbursed_at = nowIso;
        }
    }

    if (isApproving && l) {
        var loanAmount = parseFloat(l.amount) || 0;
        var loanLevel = l.level || 1;

        // 1. Credit User Available Balance in accounts
        try {
            var acctQ = db.from('accounts').select('*');
            if (l.joint_account_id) {
                acctQ = acctQ.eq('joint_account_id', l.joint_account_id);
            } else if (l.user_id) {
                acctQ = acctQ.eq('user_id', l.user_id);
            }
            var acctRes = await acctQ.limit(1);
            var acct = (acctRes.data && acctRes.data[0]) ? acctRes.data[0] : null;

            if (acct) {
                var currentBal = parseFloat(acct.balance) || 0;
                var newBal = currentBal + loanAmount;
                await db.from('accounts').update({ balance: newBal }).eq('id', acct.id);

                // Update in admin memory if present
                var memAcct = adminState.accounts.find(function (a) { return a.id === acct.id; });
                if (memAcct) memAcct.balance = newBal;
                renderAccountsTable(adminState.accounts);
            }

            // 2. Update existing 'processing' transaction or insert completed transaction
            var txQ = db.from('transactions').select('*').eq('transaction_type', 'loan_disbursement');
            if (l.user_id) txQ = txQ.eq('user_id', l.user_id);
            var txRes = await txQ.eq('status', 'processing').order('created_at', { ascending: false }).limit(1);
            var existingTxs = txRes.data;

            if (existingTxs && existingTxs.length > 0) {
                await db.from('transactions').update({
                    status: 'completed',
                    completed_at: nowIso,
                    description: 'Level ' + loanLevel + ' Loan Approved — ' + fmtCurrency(loanAmount) + ' added to Available Balance'
                }).eq('id', existingTxs[0].id);
            } else {
                await db.from('transactions').insert([{
                    user_id: l.user_id,
                    joint_account_id: l.joint_account_id || null,
                    transaction_type: 'loan_disbursement',
                    amount: loanAmount,
                    currency: acct ? acct.currency : 'USD',
                    total_amount: loanAmount,
                    description: 'Level ' + loanLevel + ' Loan Approved — ' + fmtCurrency(loanAmount) + ' added to Available Balance',
                    status: 'completed',
                    completed_at: nowIso,
                    requires_approval: false
                }]);
            }

            // 3. User In-App Notification
            if (l.user_id) {
                await db.from('notifications').insert([{
                    user_id: l.user_id,
                    title: 'Loan Approved & Credited',
                    message: 'Your Level ' + loanLevel + ' loan of ' + fmtCurrency(loanAmount) + ' has been approved and credited to your Available Balance.',
                    type: 'loan',
                    read: false,
                    created_at: nowIso
                }]);
            }

            toast('Loan approved & ' + fmtCurrency(loanAmount) + ' credited to Available Balance!', 'success');
            loadLoans();
            return;
        } catch (allocErr) {
            console.error('Loan allocation error:', allocErr);
            toast('Status updated but error allocating balance: ' + allocErr.message, 'error');
            return;
        }
    }

    toast('Loan status → ' + status, 'success');
}

async function deleteLoan(id) {
    var { error } = await db.rpc('admin_delete_record', { target_table: 'loan_applications', target_id: id });
    if (error) { toast('Error: ' + error.message, 'error'); return; }
    adminState.loans = adminState.loans.filter(function (l) { return l.id !== id; });
    filterLoans();
    toast('Loan deleted', 'success');
}

// ── INVESTMENTS ───────────────────────────────

var INVEST_STATUSES = ['active','matured','withdrawn','cancelled'];

async function loadInvestments() {
    var { data } = await db.from('investments').select('*').order('created_at', { ascending: false });
    adminState.investments = data || [];
    filterInvestments();
}

function filterInvestments() {
    var search  = (document.getElementById('investSearch').value || '').toLowerCase();
    var statusF = document.getElementById('investStatusFilter').value;
    var rows = adminState.investments.filter(function (i) {
        var matchS  = !search || (i.goal_name || '').toLowerCase().includes(search) || (i.plan || '').toLowerCase().includes(search);
        var matchSt = !statusF || i.status === statusF;
        return matchS && matchSt;
    });
    renderInvestTable(rows);
}

function renderInvestTable(rows) {
    var start = (adminState.investPage - 1) * adminState.PAGE_SIZE;
    var page  = rows.slice(start, start + adminState.PAGE_SIZE);

    // Theme tokens, so these read correctly on both light and dark admin themes.
    var PLAN_COLORS = { starter:'var(--plan-starter)', premium:'var(--plan-premium)', elite:'var(--plan-elite)' };

    document.getElementById('investBody').innerHTML = !page.length
        ? '<tr class="empty-row"><td colspan="9">No investments found.</td></tr>'
        : page.map(function (inv) {
            var user   = getUserById(inv.user_id || inv.initiated_by_user_id) || {};
            var uName  = ((user.first_name||'')+(user.last_name?' '+user.last_name:'')).trim() || (user.email||'—');
            var planColor = PLAN_COLORS[inv.plan] || 'var(--accent-primary)';
            var profit = parseFloat(inv.current_profit || 0);
            return '<tr>'
                + '<td>' + fmtDate(inv.created_at) + '</td>'
                + '<td>' + esc(uName) + '</td>'
                + '<td>' + esc(inv.goal_name || '—') + '</td>'
                + '<td><span class="badge" style="background:color-mix(in srgb,' + planColor + ' 15%,transparent);color:' + planColor + ';">' + (inv.plan||'—') + '</span></td>'
                + '<td>' + fmtCurrency(inv.locked_amount) + '</td>'
                + '<td style="color:' + (profit > 0 ? 'var(--success)' : 'var(--text2)') + ';font-weight:700;">' + (profit > 0 ? '+' : '') + fmtCurrency(profit) + '</td>'
                + '<td>' + fmtCurrency(inv.projected_value) + '</td>'
                + '<td><select class="inline-select" onchange="updateInvestStatus(\'' + inv.id + '\',this.value)">'
                + INVEST_STATUSES.map(function (s) { return '<option'+(inv.status===s?' selected':'')+'>'+s+'</option>'; }).join('')
                + '</select></td>'
                + '<td style="display:flex;gap:6px;">'
                + '<button class="btn btn-primary btn-sm" onclick="openEditInvestment(\'' + inv.id + '\')" title="Edit Investment"><i class="fas fa-edit"></i> Edit</button>'
                + '<button class="btn btn-danger btn-sm" onclick="deleteInvestment(\'' + inv.id + '\')"><i class="fas fa-trash"></i></button>'
                + '</td>'
                + '</tr>';
        }).join('');

    renderPagination('investPagination', rows.length, adminState.investPage, function (p) { adminState.investPage = p; filterInvestments(); });
}

async function updateInvestStatus(id, status) {
    var { error } = await db.from('investments').update({ status: status }).eq('id', id);
    if (error) { toast('Error: ' + error.message, 'error'); return; }
    var inv = adminState.investments.find(function (x) { return x.id === id; });
    if (inv) inv.status = status;
    toast('Investment status → ' + status, 'success');
}

async function deleteInvestment(id) {
    var { error } = await db.rpc('admin_delete_record', { target_table: 'investments', target_id: id });
    if (error) { toast('Error: ' + error.message, 'error'); return; }
    adminState.investments = adminState.investments.filter(function (i) { return i.id !== id; });
    filterInvestments();
    toast('Investment deleted', 'success');
}

// ── EDIT INVESTMENT ───────────────────────────
// Admin can update goal name, plan, locked amount, multiplier, duration, profit, projected value, and status.
// Profit difference can be applied to user's available balance.

function openEditInvestment(investId) {
    var inv = adminState.investments.find(function (x) { return x.id === investId; });
    if (!inv) return;

    var user = getUserById(inv.user_id || inv.initiated_by_user_id) || {};
    var uName = ((user.first_name || '') + ' ' + (user.last_name || '')).trim() || (user.email || '—');
    var locked = parseFloat(inv.locked_amount || 0);
    var profit = parseFloat(inv.current_profit || 0);
    var mult = parseFloat(inv.multiplier || (adminState.investmentPlans && adminState.investmentPlans[inv.plan] ? adminState.investmentPlans[inv.plan].multiplier : 20));
    var months = parseInt(inv.lock_period_months || inv.lock_months || (adminState.investmentPlans && adminState.investmentPlans[inv.plan] ? adminState.investmentPlans[inv.plan].months : 3));
    var projected = parseFloat(inv.projected_value || (locked * mult));
    var planKey = (inv.plan || 'starter').toLowerCase();
    var status = inv.status || 'active';

    var bodyEl = document.getElementById('editInvestmentBody');
    if (!bodyEl) return;

    bodyEl.innerHTML =
        '<div style="background:var(--bg3);border:1px solid var(--border);border-radius:10px;padding:12px 14px;margin-bottom:16px;">'
        + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">'
        + '<div><strong style="font-size:.9rem;">' + esc(uName) + '</strong><span style="font-size:.78rem;color:var(--text2);margin-left:8px;">(' + esc(user.email || '—') + ')</span></div>'
        + '<span class="badge" style="background:rgba(59,130,246,.15);color:#60a5fa;">' + esc(inv.investment_reference || ('INV-' + inv.id.slice(0,8).toUpperCase())) + '</span>'
        + '</div>'
        + '<div style="display:flex;justify-content:space-between;font-size:.78rem;color:var(--text2);">'
        + '<span>Started: ' + fmtDate(inv.activated_at || inv.created_at) + '</span>'
        + '<span>Account: ' + (inv.joint_account_id ? 'Joint' : 'Personal') + '</span>'
        + '</div>'
        + '</div>'

        + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">'
        + '<div class="form-group">'
        + '<label class="form-label">Investment Name</label>'
        + '<input type="text" id="ei_goal_name" class="form-input" value="' + esc(inv.goal_name || '') + '">'
        + '</div>'
        + '<div class="form-group">'
        + '<label class="form-label">Plan Tier</label>'
        + '<select id="ei_plan" class="form-select" onchange="onEditPlanChange()">'
        + '<option value="starter"' + (planKey === 'starter' ? ' selected' : '') + '>Starter</option>'
        + '<option value="premium"' + (planKey === 'premium' ? ' selected' : '') + '>Premium</option>'
        + '<option value="elite"' + (planKey === 'elite' ? ' selected' : '') + '>Elite</option>'
        + (!['starter','premium','elite'].includes(planKey) ? '<option value="' + esc(planKey) + '" selected>' + esc(planKey) + '</option>' : '')
        + '</select>'
        + '</div>'
        + '</div>'

        + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">'
        + '<div class="form-group">'
        + '<label class="form-label">Status</label>'
        + '<select id="ei_status" class="form-select">'
        + INVEST_STATUSES.map(function(s) { return '<option value="' + s + '"' + (status === s ? ' selected' : '') + '>' + s.charAt(0).toUpperCase() + s.slice(1) + '</option>'; }).join('')
        + '</select>'
        + '</div>'
        + '<div class="form-group">'
        + '<label class="form-label">Duration (Months)</label>'
        + '<input type="number" id="ei_months" class="form-input" min="1" step="1" value="' + months + '">'
        + '</div>'
        + '</div>'

        + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">'
        + '<div class="form-group">'
        + '<label class="form-label">Locked Principal ($ USD)</label>'
        + '<input type="number" id="ei_locked" class="form-input" step="0.01" value="' + locked + '" oninput="recalcEditProjected()">'
        + '</div>'
        + '<div class="form-group">'
        + '<label class="form-label">Return Multiplier (e.g. 8x / +700% ROI)</label>'
        + '<input type="number" id="ei_mult" class="form-input" step="0.1" value="' + mult + '" oninput="recalcEditProjected()">'
        + '<div id="ei_mult_roi_preview" style="font-size:0.75rem;color:var(--text2);margin-top:4px;"></div>'
        + '</div>'
        + '</div>'

        + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">'
        + '<div class="form-group">'
        + '<label class="form-label">Current Profit ($ USD)</label>'
        + '<input type="number" id="ei_profit" class="form-input" step="0.01" value="' + profit + '" oninput="recalcEditProfitDelta(' + profit + ')">'
        + '</div>'
        + '<div class="form-group">'
        + '<label class="form-label">Projected Value ($ USD)</label>'
        + '<div style="display:flex;gap:6px;">'
        + '<input type="number" id="ei_projected" class="form-input" step="0.01" value="' + projected + '">'
        + '<button type="button" class="btn btn-ghost btn-sm" onclick="autoCalcEditProjected()" title="Recalculate Locked × Multiplier" style="white-space:nowrap;padding:0 8px;font-size:.78rem;">Auto</button>'
        + '</div>'
        + '</div>'
        + '</div>'

        + '<div id="ei_profit_preview" style="font-size:.82rem;margin-bottom:12px;min-height:18px;"></div>'

        + '<div style="background:var(--card-bg, #1a1a2e);border:1px solid var(--border);border-radius:8px;padding:10px 12px;margin-bottom:16px;">'
        + '<div style="font-size:.78rem;color:var(--text2);">'
        + '<i class="fas fa-info-circle"></i> Profit stays inside the investment record. Matured capital and profits are withdrawn by the client to their available balance upon maturity.'
        + '</div>'
        + '</div>'

        + '<div style="display:flex;gap:10px;justify-content:flex-end;">'
        + '<button class="btn btn-ghost" onclick="closeModal(\'editInvestmentModal\')">Cancel</button>'
        + '<button class="btn btn-primary" onclick="saveInvestment(\'' + investId + '\',' + profit + ')"><i class="fas fa-save"></i> Save Changes</button>'
        + '</div>';

    openModal('editInvestmentModal');
    recalcEditProjected();
}

function recalcEditProjected() {
    var l = parseFloat((document.getElementById('ei_locked') || {}).value) || 0;
    var m = parseFloat((document.getElementById('ei_mult') || {}).value) || 0;
    var pInput = document.getElementById('ei_projected');
    if (pInput && l >= 0 && m >= 0) {
        pInput.value = (l * m).toFixed(2);
    }
    var roiEl = document.getElementById('ei_mult_roi_preview');
    if (roiEl && m > 0) {
        var netRoi = Math.round((m - 1) * 100);
        roiEl.innerHTML = '+' + netRoi.toLocaleString() + '% Net ROI (' + m + 'x · ' + Math.round(m * 100).toLocaleString() + '% Total)';
    }
}

function autoCalcEditProjected() {
    recalcEditProjected();
    toast('Projected value recalculated', 'info');
}

function recalcEditProfitDelta(oldProfit) {
    var newProfit = parseFloat((document.getElementById('ei_profit') || {}).value) || 0;
    var delta = newProfit - oldProfit;
    var el = document.getElementById('ei_profit_preview');
    if (!el) return;
    if (delta === 0) {
        el.innerHTML = '<span style="color:var(--text2);"><i class="fas fa-check"></i> Profit unchanged (' + fmtCurrency(oldProfit) + ')</span>';
    } else if (delta > 0) {
        el.innerHTML = '<span style="color:var(--success);"><i class="fas fa-arrow-up"></i> Profit increased by +' + fmtCurrency(delta) + ' (will be credited to user balance)</span>';
    } else {
        el.innerHTML = '<span style="color:var(--error);"><i class="fas fa-arrow-down"></i> Profit reduced by ' + fmtCurrency(delta) + ' (will be deducted from user balance)</span>';
    }
}

function onEditPlanChange() {
    var plan = (document.getElementById('ei_plan') || {}).value;
    if (adminState.investmentPlans && adminState.investmentPlans[plan]) {
        var p = adminState.investmentPlans[plan];
        if (p.multiplier && document.getElementById('ei_mult')) {
            document.getElementById('ei_mult').value = p.multiplier;
        }
        if (p.months && document.getElementById('ei_months')) {
            document.getElementById('ei_months').value = p.months;
        }
        recalcEditProjected();
    }
}

async function saveInvestment(investId, oldProfit) {
    var inv = adminState.investments.find(function (x) { return x.id === investId; });
    if (!inv) return;

    var goalName   = ((document.getElementById('ei_goal_name') || {}).value || '').trim();
    var plan       = (document.getElementById('ei_plan') || {}).value || inv.plan;
    var status     = (document.getElementById('ei_status') || {}).value || inv.status;
    var locked     = parseFloat((document.getElementById('ei_locked') || {}).value) || 0;
    var mult       = parseFloat((document.getElementById('ei_mult') || {}).value) || 1;
    var months     = parseInt((document.getElementById('ei_months') || {}).value) || 1;
    var newProfit  = parseFloat((document.getElementById('ei_profit') || {}).value) || 0;
    var projected  = parseFloat((document.getElementById('ei_projected') || {}).value) || (locked * mult);
    var roi = locked > 0 ? ((newProfit / locked) * 100) : 0;

    var updatePayload = {
        goal_name: goalName || inv.goal_name || 'Investment',
        plan: plan,
        status: status,
        locked_amount: locked,
        current_profit: newProfit,
        current_value: locked + newProfit,
        multiplier: mult,
        lock_period_months: months,
        lock_months: months,
        projected_value: projected,
        target_amount: projected,
        roi_percentage: parseFloat(roi.toFixed(2)),
        updated_at: new Date().toISOString()
    };

    var { error: invErr } = await db.from('investments').update(updatePayload).eq('id', investId);
    if (invErr) { toast('Error updating investment: ' + invErr.message, 'error'); return; }

    // Update local object
    Object.assign(inv, updatePayload);

    toast('Investment updated successfully', 'success');
    closeModal('editInvestmentModal');
    await loadAccounts();
    filterInvestments();
    renderAccountsGrid();
}

function openEditProfit(investId) {
    openEditInvestment(investId);
}

function saveInvestProfit(investId, oldProfit) {
    return saveInvestment(investId, oldProfit);
}

// ── NOTIFICATIONS ─────────────────────────────

async function loadAllNotifications() {
    var { data } = await db.from('notifications').select('*').order('created_at', { ascending: false }).limit(100);
    adminState.notifications = data || [];
    renderNotifAdminTable();
}

function renderNotifAdminTable() {
    var tbody = document.getElementById('notifAdminBody');
    var rows  = adminState.notifications;
    if (!rows.length) {
        tbody.innerHTML = '<tr class="empty-row"><td colspan="6">No notifications.</td></tr>';
        return;
    }
    tbody.innerHTML = rows.map(function (n) {
        var target = n.user_id
            ? (function () { var u = getUserById(n.user_id); return ((u.first_name||'')+(u.last_name?' '+u.last_name:'')).trim() || (u.email||n.user_id); })()
            : 'Joint #' + (n.joint_account_id || '').slice(0,8);
        return '<tr>'
            + '<td>' + fmtDate(n.created_at) + '</td>'
            + '<td>' + esc(target) + '</td>'
            + '<td><span class="badge" style="background:rgba(59,130,246,.15);color:#60a5fa;">' + (n.type||'info') + '</span></td>'
            + '<td>' + esc(n.title) + '</td>'
            + '<td>' + (n.is_read ? '<span style="color:var(--success);">✓ Read</span>' : '<span style="color:var(--text2);">Unread</span>') + '</td>'
            + '<td><button class="btn btn-danger btn-sm" onclick="deleteNotifAdmin(\'' + n.id + '\')"><i class="fas fa-trash"></i></button></td>'
            + '</tr>';
    }).join('');
}

async function deleteNotifAdmin(id) {
    var { error } = await db.rpc('admin_delete_record', { target_table: 'notifications', target_id: id });
    if (error) { toast('Error: ' + error.message, 'error'); return; }
    adminState.notifications = adminState.notifications.filter(function (n) { return n.id !== id; });
    renderNotifAdminTable();
    toast('Notification deleted', 'success');
}

async function buildNotifTargetOptions() {
    var target = document.getElementById('notifTarget').value;
    var group  = document.getElementById('notifTargetIdGroup');
    var sel    = document.getElementById('notifTargetId');

    if (target === 'all') { group.style.display = 'none'; return; }
    group.style.display = 'block';

    if (target === 'user') {
        sel.innerHTML = adminState.users.map(function (u) {
            return '<option value="' + u.id + '">' + esc(((u.first_name||'')+' '+(u.last_name||'')).trim() || u.email) + '</option>';
        }).join('');
    } else {
        sel.innerHTML = adminState.jointAccounts.map(function (ja) {
            var u1 = getUserById(ja.primary_user_id);
            var u2 = getUserById(ja.secondary_user_id);
            var name = ja.account_name || (((u1.first_name||'')+'&'+(u2.first_name||'')).trim());
            return '<option value="' + ja.id + '">' + esc(name) + '</option>';
        }).join('');
    }
}

async function sendNotification() {
    var target  = document.getElementById('notifTarget').value;
    var targetId = (document.getElementById('notifTargetId') || {}).value;
    var type    = document.getElementById('notifType').value;
    var title   = document.getElementById('notifTitle').value.trim();
    var body    = document.getElementById('notifBody').value.trim();
    var btn     = document.getElementById('sendNotifBtn');

    if (!title) { toast('Please enter a title', 'error'); return; }

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Sending…';

    try {
        if (target === 'all') {
            var inserts = adminState.users.map(function (u) {
                return { user_id: u.id, type: type, title: title, body: body || null };
            });
            if (inserts.length) await db.from('notifications').insert(inserts);
        } else if (target === 'user') {
            await db.from('notifications').insert([{ user_id: targetId, type: type, title: title, body: body || null }]);
        } else {
            await db.from('notifications').insert([{ joint_account_id: targetId, type: type, title: title, body: body || null }]);
        }

        toast('Notification sent', 'success');
        document.getElementById('notifTitle').value = '';
        document.getElementById('notifBody').value  = '';
        await loadAllNotifications();
    } catch (err) {
        toast('Error: ' + err.message, 'error');
    }

    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Notification';
}

// ── PAGINATION ────────────────────────────────

function renderPagination(containerId, total, currentPage, onPage) {
    var el       = document.getElementById(containerId);
    if (!el) return;
    var pages    = Math.ceil(total / adminState.PAGE_SIZE);
    if (pages <= 1) { el.innerHTML = '<span class="page-info">' + total + ' records</span>'; return; }

    var html = '';
    if (currentPage > 1) html += '<button class="page-btn" onclick="(' + onPage.toString() + ')(' + (currentPage-1) + ')">‹</button>';
    for (var p = Math.max(1, currentPage-2); p <= Math.min(pages, currentPage+2); p++) {
        html += '<button class="page-btn' + (p === currentPage ? ' current' : '') + '" onclick="(' + onPage.toString() + ')(' + p + ')">' + p + '</button>';
    }
    if (currentPage < pages) html += '<button class="page-btn" onclick="(' + onPage.toString() + ')(' + (currentPage+1) + ')">›</button>';
    html += '<span class="page-info">' + total + ' records</span>';
    el.innerHTML = html;
}

// ── SETTINGS RATES ────────────────────────────

async function loadSettingsRates() {
    try {
        var res = await db.from('bank_settings').select('setting_value').eq('setting_key', 'exchange_rates').single();
        if (res.error) {
            console.warn('Bank settings not found or error loading:', res.error);
            return;
        }
        if (res.data && res.data.setting_value) {
            var rates = res.data.setting_value;
            Object.keys(rates).forEach(function(currency) {
                var input = document.getElementById('rate-' + currency);
                if (input) input.value = rates[currency];
            });
            if (rates.ZWG && document.getElementById('rate-ZWG')) {
                document.getElementById('rate-ZWG').value = rates.ZWG;
            } else if (rates.ZWL && document.getElementById('rate-ZWG')) {
                document.getElementById('rate-ZWG').value = rates.ZWL;
            }
        }
    } catch (err) {
        console.error('loadSettingsRates error:', err);
    }
}

async function saveSettingsRates() {
    try {
        function getVal(id, fallback) {
            var el = document.getElementById(id);
            if (!el) return fallback;
            var v = parseFloat(el.value);
            return isNaN(v) ? fallback : v;
        }

        var rates = {
            CHF: getVal('rate-CHF', 0.8800),
            EUR: getVal('rate-EUR', 0.9200),
            GBP: getVal('rate-GBP', 0.7900),
            CAD: getVal('rate-CAD', 1.3500),
            AUD: getVal('rate-AUD', 1.5200),
            JPY: getVal('rate-JPY', 150.50),
            ZAR: getVal('rate-ZAR', 18.80),
            NGN: getVal('rate-NGN', 1500.00),
            KES: getVal('rate-KES', 130.00),
            GHS: getVal('rate-GHS', 12.50),
            BWP: getVal('rate-BWP', 13.50),
            ZMW: getVal('rate-ZMW', 27.00),
            ZWG: getVal('rate-ZWG', 26.50),
            ZWL: getVal('rate-ZWG', 26.50),
            UGX: getVal('rate-UGX', 3800.00),
            MXN: getVal('rate-MXN', 17.00),
            PHP: getVal('rate-PHP', 56.00),
            ARS: getVal('rate-ARS', 850.00),
            COP: getVal('rate-COP', 3900.00),
            CLP: getVal('rate-CLP', 950.00),
            AED: getVal('rate-AED', 3.6700),
            SAR: getVal('rate-SAR', 3.7500),
            INR: getVal('rate-INR', 83.50)
        };

        var res = await db.from('bank_settings').upsert({
            setting_key: 'exchange_rates',
            setting_value: rates,
            updated_at: new Date().toISOString()
        });

        if (res.error) {
            toast('Error saving rates: ' + res.error.message, 'error');
        } else {
            toast('Conversion rates saved successfully', 'success');
        }
    } catch (err) {
        toast('Error saving rates: ' + err.message, 'error');
    }
}

// ── SETTINGS INVESTMENT PLANS ──────────

var PLAN_TIERS      = ['starter', 'premium', 'elite'];
var MAX_PLAN_ASSETS = 63;
var CLOUDINARY_CLOUD  = (window.CONFIG && window.CONFIG.CLOUDINARY_CLOUD_NAME)   || 'ilhugflr';
var CLOUDINARY_PRESET = (window.CONFIG && window.CONFIG.CLOUDINARY_UPLOAD_PRESET) || 'cwm_uploads';

// ── PLAN ASSET EDITOR (pick pre-saved assets + "plus N more" count) ─────

// Asset library — built from the shared catalogue in js/invest-catalog.js so
// that the admin picker and the client-facing plans can never drift apart.
var ADMIN_CATALOG_VERSION = window.INVEST_CATALOG_VERSION || 3;

var ASSET_LIBRARY = (typeof window.getCatalogueGroups === 'function')
    ? window.getCatalogueGroups('elite').map(function (g) {
        return { group: g.label, items: g.items };
    })
    : [];

function planAssetList(tier) {
    if (!adminState.planAssets) adminState.planAssets = {};
    if (!Array.isArray(adminState.planAssets[tier])) adminState.planAssets[tier] = [];
    return adminState.planAssets[tier];
}

// Keeps the catalogue fields (cat / sym) so saved plans still group by category.
function planAssetFields(a) {
    var item = findCatalogItem((a && a.id) || '') || {};
    return {
        id:    (a && a.id)    || item.id    || '',
        name:  ((a && a.name) || item.name  || '').trim(),
        sym:   (a && a.sym)   || item.sym   || '',
        cat:   (a && a.cat)   || item.cat   || '',
        icon:  (a && a.icon)  || item.icon  || '',
        glyph: (a && a.glyph) || item.glyph || ''
    };
}

function cleanPlanAssets(tier) {
    return planAssetList(tier)
        .map(planAssetFields)
        .filter(function (a) { return a.name.length > 0; })
        .slice(0, MAX_PLAN_ASSETS);
}

function readPlanAssetsMore(tier) {
    var el = document.getElementById('inv-' + tier + '-assets-more');
    return Math.max(0, parseInt((el || {}).value, 10) || 0);
}

function findCatalogItem(id) {
    for (var g = 0; g < ASSET_LIBRARY.length; g++) {
        var items = ASSET_LIBRARY[g].items;
        for (var i = 0; i < items.length; i++) {
            if (items[i].id === id) return items[i];
        }
    }
    return null;
}

// Small icon badge: preset image (letter fallback) or preset glyph.
function assetBadgeHtml(a, cls) {
    var initial = ((((a && a.name) || '?').trim().charAt(0)) || '?').toUpperCase();
    var glyph   = a && a.glyph;
    var inner   = a && a.icon
        ? '<img src="' + esc(a.icon) + '" alt="" onerror="this.remove()">' + initial
        : (glyph ? glyph : initial);
    var clsName = cls + (glyph && !(a && a.icon) ? ' glyph' : '');
    return '<span class="' + clsName + '">' + inner + '</span>';
}

function renderPlanAssetsEditor(tier) {
    var list    = planAssetList(tier);
    var host    = document.getElementById('inv-' + tier + '-assets');
    var catalog = document.getElementById('inv-' + tier + '-catalog');
    var note    = document.getElementById('inv-' + tier + '-assets-note');

    if (host) {
        host.innerHTML = list.length
            ? '<div class="assets-selected">' + list.map(function (a, i) {
                return '<span class="assets-selected-chip">'
                    + assetBadgeHtml(a, 'asset-icon-preview')
                    + '<span class="assets-selected-name">' + esc(a.name) + '</span>'
                    + '<button type="button" class="assets-selected-remove" title="Remove"'
                    + ' onclick="removePlanAsset(\'' + tier + '\',' + i + ')">'
                    + '<i class="fas fa-times"></i></button>'
                    + '</span>';
            }).join('') + '</div>'
            : '<div class="assets-empty"><i class="fas fa-hand-pointer"></i>'
              + ' Nothing selected yet — click an asset below to add it to this plan.</div>';
    }

    if (note) {
        note.innerHTML = '<strong>' + list.length + '</strong> of ' + MAX_PLAN_ASSETS + ' selected'
            + (list.length >= MAX_PLAN_ASSETS ? ' <span class="assets-max">max reached</span>' : '');
    }

    if (catalog) {
        catalog.innerHTML = ASSET_LIBRARY.map(function (grp) {
            return '<div class="assets-catalog-group">'
                + '<div class="assets-catalog-title">' + esc(grp.group) + '</div>'
                + '<div class="assets-catalog-grid">' + grp.items.map(function (item) {
                    var isOn = list.some(function (a) { return a.id && a.id === item.id; });
                    return '<button type="button" class="catalog-item' + (isOn ? ' selected' : '') + '"'
                        + ' onclick="togglePlanAsset(\'' + tier + '\',\'' + item.id + '\')"'
                        + ' title="' + esc(item.name) + '">'
                        + assetBadgeHtml(item, 'catalog-icon')
                        + '<span class="catalog-name">' + esc(item.name) + '</span>'
                        + (isOn ? '<i class="fas fa-check catalog-check"></i>' : '')
                        + '</button>';
                }).join('') + '</div></div>';
        }).join('');
    }
}

function togglePlanAsset(tier, id) {
    var list = planAssetList(tier);
    var idx  = -1;
    for (var i = 0; i < list.length; i++) {
        if (list[i].id === id) { idx = i; break; }
    }
    if (idx >= 0) {
        list.splice(idx, 1);
        renderPlanAssetsEditor(tier);
        return;
    }
    if (list.length >= MAX_PLAN_ASSETS) {
        toast('A plan can carry up to ' + MAX_PLAN_ASSETS + ' assets — remove one first', 'error');
        return;
    }
    var item = findCatalogItem(id);
    if (!item) return;
    list.push({ id: item.id, name: item.name, icon: item.icon || '', glyph: item.glyph || '' });
    renderPlanAssetsEditor(tier);
}

function removePlanAsset(tier, idx) {
    planAssetList(tier).splice(idx, 1);
    renderPlanAssetsEditor(tier);
}

// Default plan settings. Assets come from the shared catalogue, whose tiers are
// cumulative: Starter 20 · Premium 40 · Elite 61.
function adminDefaultPlan(tier, label, minAmount, months, multiplier, color, assetsMore) {
    return {
        key: tier,
        label: label,
        minAmount: minAmount,
        months: months,
        multiplier: multiplier,
        color: color,
        catalogVersion: ADMIN_CATALOG_VERSION,
        assets: (typeof window.getCatalogueForTier === 'function') ? window.getCatalogueForTier(tier) : [],
        // Visible assets are the “top assets”; this is the advertised “+N more” figure.
        assetsMore: Math.max(0, parseInt(assetsMore, 10) || 0)
    };
}

var DEFAULT_INVESTMENT_PLANS = {
    starter: adminDefaultPlan('starter', 'Starter', 150,  3,  8, 'var(--plan-starter)', 2500),
    premium: adminDefaultPlan('premium', 'Premium', 500,  6, 15, 'var(--plan-premium)', 5000),
    elite:   adminDefaultPlan('elite',   'Elite',  1500,  9, 25, 'var(--plan-elite)', 10000)
};

async function loadInvestmentPlansSettings() {
    try {
        var res = await db.from('bank_settings').select('setting_value').eq('setting_key', 'investment_plans').single();
        var plans = (res.data && res.data.setting_value) ? res.data.setting_value : DEFAULT_INVESTMENT_PLANS;
        // A settings row written before the catalogue was reorganised keeps its
        // pricing but takes the new tier asset lists.
        PLAN_TIERS.forEach(function (tier) {
            if (plans[tier] && plans[tier].catalogVersion !== ADMIN_CATALOG_VERSION) {
                // The asset list is catalogue-owned; the “+N more” figure is a
                // marketing number an admin owns, so it is left untouched.
                plans[tier].assets = (DEFAULT_INVESTMENT_PLANS[tier] || {}).assets || [];
            }
        });
        adminState.investmentPlans = plans;

        PLAN_TIERS.forEach(function(tier) {
            var p = plans[tier] || DEFAULT_INVESTMENT_PLANS[tier];
            if (!p) return;
            var lblEl = document.getElementById('inv-' + tier + '-label');
            var minEl = document.getElementById('inv-' + tier + '-min');
            var mthEl = document.getElementById('inv-' + tier + '-months');
            var mltEl = document.getElementById('inv-' + tier + '-mult');

            if (lblEl && p.label) lblEl.value = p.label;
            if (minEl && p.minAmount !== undefined) minEl.value = p.minAmount;
            if (mthEl && p.months !== undefined) mthEl.value = p.months;
            if (mltEl && p.multiplier !== undefined) {
                mltEl.value = p.multiplier;
                updateAdminRoiPreview(tier);
            }

            // ── Assets for this plan ──
            // Only trust a saved list written against the current catalogue version;
            // anything older falls back to the catalogue defaults for that tier.
            var defaultPlan = DEFAULT_INVESTMENT_PLANS[tier] || {};
            var isCurrent   = (p.catalogVersion === ADMIN_CATALOG_VERSION)
                && Array.isArray(p.assets) && p.assets.length > 0;
            var rawAssets = isCurrent
                ? p.assets
                : (Array.isArray(defaultPlan.assets) ? defaultPlan.assets : []);

            adminState.planAssets[tier] = rawAssets.slice(0, MAX_PLAN_ASSETS).map(planAssetFields);
            var moreEl = document.getElementById('inv-' + tier + '-assets-more');
            if (moreEl) {
                var savedMore = (p.assetsMore === undefined || p.assetsMore === null || p.assetsMore === '') ? null : p.assetsMore;
                moreEl.value = savedMore === null
                    ? ((DEFAULT_INVESTMENT_PLANS[tier] && DEFAULT_INVESTMENT_PLANS[tier].assetsMore) || 0)
                    : Math.max(0, parseInt(savedMore, 10) || 0);
            }
            renderPlanAssetsEditor(tier);
        });
    } catch (err) {
        console.warn('loadInvestmentPlansSettings notice:', err);
        PLAN_TIERS.forEach(function (tier) { renderPlanAssetsEditor(tier); });
    }
}

function updateAdminRoiPreview(tier) {
    var input = document.getElementById('inv-' + tier + '-mult');
    var preview = document.getElementById('inv-' + tier + '-roi-preview');
    if (!input || !preview) return;
    var mult = parseFloat(input.value) || 1;
    var netRoi = Math.round((mult - 1) * 100);
    var totalRet = Math.round(mult * 100);
    var exampleFinal = Math.round(1000 * mult);
    preview.innerHTML = '+' + netRoi.toLocaleString() + '% Net ROI (' + mult + 'x &bull; ' + totalRet.toLocaleString() + '% Total &bull; $1,000 becomes $' + exampleFinal.toLocaleString() + ')';
}

async function saveInvestmentPlansSettings() {
    try {
        var plans = {
            starter: {
                key: 'starter',
                label: (document.getElementById('inv-starter-label') || {}).value || 'Starter',
                minAmount: parseFloat((document.getElementById('inv-starter-min') || {}).value) || 150,
                months: parseInt((document.getElementById('inv-starter-months') || {}).value) || 3,
                multiplier: parseFloat((document.getElementById('inv-starter-mult') || {}).value) || 8,
                color: 'var(--plan-starter)',
                catalogVersion: ADMIN_CATALOG_VERSION,
                assets: cleanPlanAssets('starter'),
                assetsMore: readPlanAssetsMore('starter')
            },
            premium: {
                key: 'premium',
                label: (document.getElementById('inv-premium-label') || {}).value || 'Premium',
                minAmount: parseFloat((document.getElementById('inv-premium-min') || {}).value) || 500,
                months: parseInt((document.getElementById('inv-premium-months') || {}).value) || 6,
                multiplier: parseFloat((document.getElementById('inv-premium-mult') || {}).value) || 15,
                color: 'var(--plan-premium)',
                catalogVersion: ADMIN_CATALOG_VERSION,
                assets: cleanPlanAssets('premium'),
                assetsMore: readPlanAssetsMore('premium')
            },
            elite: {
                key: 'elite',
                label: (document.getElementById('inv-elite-label') || {}).value || 'Elite',
                minAmount: parseFloat((document.getElementById('inv-elite-min') || {}).value) || 1500,
                months: parseInt((document.getElementById('inv-elite-months') || {}).value) || 9,
                multiplier: parseFloat((document.getElementById('inv-elite-mult') || {}).value) || 25,
                color: 'var(--plan-elite)',
                catalogVersion: ADMIN_CATALOG_VERSION,
                assets: cleanPlanAssets('elite'),
                assetsMore: readPlanAssetsMore('elite')
            }
        };

        var res = await db.from('bank_settings').upsert({
            setting_key: 'investment_plans',
            setting_value: plans,
            updated_at: new Date().toISOString()
        });

        if (res.error) {
            toast('Error saving investment plans: ' + res.error.message, 'error');
        } else {
            adminState.investmentPlans = plans;
            toast('Investment plans & return rates saved successfully', 'success');
        }
    } catch (err) {
        toast('Error saving investment plans: ' + err.message, 'error');
    }
}

// ── LOAN TIER LIMITS & GAS RESTRICTIONS SETTINGS ────

var DEFAULT_LOAN_SETTINGS = {
    tier1_amount: 10000,
    tier1_joint_amount: 20000,
    tier1_gas: 500,

    tier2_amount: 40000,
    tier2_joint_amount: 70000,
    tier2_gas: 2000,

    tier3_amount: 80000,
    tier3_joint_amount: 150000,
    tier3_gas: 5000,

    alert_message: "Sorry, you're not eligible. You need to have made transactions up to {amount} on your gas wallet. Kindly fund your gas wallet and try again."
};

function updateTierBadge(lvl) {
    var amtEl = document.getElementById('loan-tier' + lvl + '-amount');
    var badge = document.getElementById('badge-tier' + lvl + '-amt');
    if (amtEl && badge) {
        var val = parseFloat(amtEl.value) || 0;
        badge.textContent = '$' + val.toLocaleString() + ' Loan';
    }
}

async function loadLoanSettings() {
    try {
        var res = await db.from('bank_settings').select('setting_value').eq('setting_key', 'loan_settings').single();
        var s = (res.data && res.data.setting_value) ? res.data.setting_value : DEFAULT_LOAN_SETTINGS;

        var a1 = document.getElementById('loan-tier1-amount');
        var j1 = document.getElementById('loan-tier1-joint-amount');
        var t1 = document.getElementById('loan-tier1-gas');

        var a2 = document.getElementById('loan-tier2-amount');
        var j2 = document.getElementById('loan-tier2-joint-amount');
        var t2 = document.getElementById('loan-tier2-gas');

        var a3 = document.getElementById('loan-tier3-amount');
        var j3 = document.getElementById('loan-tier3-joint-amount');
        var t3 = document.getElementById('loan-tier3-gas');

        var msg = document.getElementById('loan-alert-msg');

        if (a1) a1.value = s.tier1_amount !== undefined ? s.tier1_amount : DEFAULT_LOAN_SETTINGS.tier1_amount;
        if (j1) j1.value = s.tier1_joint_amount !== undefined ? s.tier1_joint_amount : DEFAULT_LOAN_SETTINGS.tier1_joint_amount;
        if (t1) t1.value = s.tier1_gas !== undefined ? s.tier1_gas : DEFAULT_LOAN_SETTINGS.tier1_gas;

        if (a2) a2.value = s.tier2_amount !== undefined ? s.tier2_amount : DEFAULT_LOAN_SETTINGS.tier2_amount;
        if (j2) j2.value = s.tier2_joint_amount !== undefined ? s.tier2_joint_amount : DEFAULT_LOAN_SETTINGS.tier2_joint_amount;
        if (t2) t2.value = s.tier2_gas !== undefined ? s.tier2_gas : DEFAULT_LOAN_SETTINGS.tier2_gas;

        if (a3) a3.value = s.tier3_amount !== undefined ? s.tier3_amount : DEFAULT_LOAN_SETTINGS.tier3_amount;
        if (j3) j3.value = s.tier3_joint_amount !== undefined ? s.tier3_joint_amount : DEFAULT_LOAN_SETTINGS.tier3_joint_amount;
        if (t3) t3.value = s.tier3_gas !== undefined ? s.tier3_gas : DEFAULT_LOAN_SETTINGS.tier3_gas;

        if (msg) msg.value = s.alert_message || DEFAULT_LOAN_SETTINGS.alert_message;

        updateTierBadge(1);
        updateTierBadge(2);
        updateTierBadge(3);
    } catch (e) {
        console.warn('loadLoanSettings notice:', e);
    }
}

async function saveLoanSettings() {
    var a1 = parseFloat((document.getElementById('loan-tier1-amount') || {}).value);
    var j1 = parseFloat((document.getElementById('loan-tier1-joint-amount') || {}).value);
    var t1 = parseFloat((document.getElementById('loan-tier1-gas') || {}).value);

    var a2 = parseFloat((document.getElementById('loan-tier2-amount') || {}).value);
    var j2 = parseFloat((document.getElementById('loan-tier2-joint-amount') || {}).value);
    var t2 = parseFloat((document.getElementById('loan-tier2-gas') || {}).value);

    var a3 = parseFloat((document.getElementById('loan-tier3-amount') || {}).value);
    var j3 = parseFloat((document.getElementById('loan-tier3-joint-amount') || {}).value);
    var t3 = parseFloat((document.getElementById('loan-tier3-gas') || {}).value);

    var msg = (document.getElementById('loan-alert-msg') || {}).value || DEFAULT_LOAN_SETTINGS.alert_message;

    var payload = {
        tier1_amount: isNaN(a1) ? DEFAULT_LOAN_SETTINGS.tier1_amount : a1,
        tier1_joint_amount: isNaN(j1) ? DEFAULT_LOAN_SETTINGS.tier1_joint_amount : j1,
        tier1_gas: isNaN(t1) ? DEFAULT_LOAN_SETTINGS.tier1_gas : t1,

        tier2_amount: isNaN(a2) ? DEFAULT_LOAN_SETTINGS.tier2_amount : a2,
        tier2_joint_amount: isNaN(j2) ? DEFAULT_LOAN_SETTINGS.tier2_joint_amount : j2,
        tier2_gas: isNaN(t2) ? DEFAULT_LOAN_SETTINGS.tier2_gas : t2,

        tier3_amount: isNaN(a3) ? DEFAULT_LOAN_SETTINGS.tier3_amount : a3,
        tier3_joint_amount: isNaN(j3) ? DEFAULT_LOAN_SETTINGS.tier3_joint_amount : j3,
        tier3_gas: isNaN(t3) ? DEFAULT_LOAN_SETTINGS.tier3_gas : t3,

        alert_message: msg.trim()
    };

    try {
        var res = await db.from('bank_settings').upsert({
            setting_key: 'loan_settings',
            setting_value: payload,
            description: 'Loan tier amounts, gas balance requirements, and restriction alert message',
            updated_at: new Date().toISOString()
        });
        if (res.error) throw res.error;
        toast('Loan Tier Limits & Gas Requirements saved successfully', 'success');
    } catch (err) {
        toast('Failed to save loan settings: ' + err.message, 'error');
    }
}



