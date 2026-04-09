// ============================================
// Summit Trust ADMIN PANEL
// ============================================

var SUPABASE_URL     = 'https://jotfmjdmorjweoumdvuq.supabase.co';
var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpvdGZtamRtb3Jqd2VvdW1kdnVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3Mzk2OTksImV4cCI6MjA5MTMxNTY5OX0.bTkJKZtHEz_cBBHsYwWiWMotLpCpKU68_ROE-mKWm4s';

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
}

// ── TABS ──────────────────────────────────────

function switchTab(name, btn) {
    document.querySelectorAll('.tab-content').forEach(function (el) { el.classList.remove('active'); });
    document.querySelectorAll('.tab-btn').forEach(function (el) { el.classList.remove('active'); });
    document.getElementById('tab-' + name).classList.add('active');
    btn.classList.add('active');
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
    var { data } = await db.from('accounts')
        .select('id,user_id,joint_account_id,balance,btc_balance,ltc_balance,btc_address,ltc_address,gas_balance,gas_wallet_address,gas_wallet_network,status,account_number,allow_withdrawal,withdrawal_alert_msg,created_at')
        .order('created_at', { ascending: false });
    adminState.accounts = data || [];
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
            + '<button class="btn btn-ghost btn-sm" onclick="openEditAccount(\'' + acctId + '\',\'' + item.type + '\',\'' + (item.joint ? item.joint.id : '') + '\')"><i class="fas fa-user-edit"></i> Edit User</button>'
            + '<button class="btn btn-ghost btn-sm" onclick="openEditBalance(\'' + acctId + '\')"><i class="fas fa-dollar-sign"></i> Balance</button>'
            + '<button class="btn btn-ghost btn-sm" onclick="openEditWallets(\'' + acctId + '\')"><i class="fas fa-wallet"></i> Wallets</button>'
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
            + '<button class="btn btn-primary" style="flex:1;" data-uid="' + u1Id + '" data-sfx="1" onclick="saveUserInfo(this.dataset.uid,this.dataset.sfx)"><i class="fas fa-save"></i> Save ' + u1Label + '</button>'
            + '</div></div>';

        var panel2 =
            '<div id="ea_panel2" style="display:none;">'
            + userEditFields('2', u2)
            + '<div style="display:flex;gap:10px;margin-top:8px;">'
            + '<button class="btn btn-ghost" style="flex:1;" data-close="editAccountModal" onclick="closeModal(this.dataset.close)">Cancel</button>'
            + '<button class="btn btn-primary" style="flex:1;" data-uid="' + u2Id + '" data-sfx="2" onclick="saveUserInfo(this.dataset.uid,this.dataset.sfx)"><i class="fas fa-save"></i> Save ' + u2Label + '</button>'
            + '</div></div>';

        body.innerHTML = tabBar + panel1 + panel2;
    } else {
        // Personal account
        var user = getUserById(acct.user_id) || {};
        var uid  = user.id || '';
        body.innerHTML =
            userEditFields('', user)
            + '<div style="display:flex;gap:10px;margin-top:8px;">'
            + '<button class="btn btn-ghost" style="flex:1;" data-close="editAccountModal" onclick="closeModal(this.dataset.close)">Cancel</button>'
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

// ── EDIT BALANCE ──────────────────────────────

function openEditBalance(acctId) {
    var acct = adminState.accounts.find(function (a) { return a.id === acctId; }) || {};
    var allowWithdrawal = acct.allow_withdrawal !== false; // default true
    var alertMsg        = esc(acct.withdrawal_alert_msg || '');

    document.getElementById('editBalanceBody').innerHTML =
        // ── Balances ──────────────────────────────
        '<h4 style="margin-bottom:14px;font-size:.82rem;color:var(--text-secondary);text-transform:uppercase;letter-spacing:.06em;">Balances</h4>'
        + '<div class="form-group"><label class="form-label">Available Balance (USD)</label>'
        + '<input type="number" id="eb_balance" class="form-input" step="0.01" value="' + (acct.balance || 0) + '"></div>'
        + '<div class="form-group"><label class="form-label">Gas Balance (USD)</label>'
        + '<input type="number" id="eb_gas" class="form-input" step="0.01" value="' + (acct.gas_balance || 0) + '"></div>'
        + '<div class="form-group"><label class="form-label">BTC Balance</label>'
        + '<input type="number" id="eb_btc" class="form-input" step="0.00000001" value="' + (acct.btc_balance || 0) + '"></div>'
        + '<div class="form-group"><label class="form-label">LTC Balance</label>'
        + '<input type="number" id="eb_ltc" class="form-input" step="0.00000001" value="' + (acct.ltc_balance || 0) + '"></div>'

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
    var balance = parseFloat(document.getElementById('eb_balance').value) || 0;
    var gas     = parseFloat(document.getElementById('eb_gas').value)     || 0;
    var btc     = parseFloat(document.getElementById('eb_btc').value)     || 0;
    var ltc     = parseFloat(document.getElementById('eb_ltc').value)     || 0;

    var allowWdEl  = document.getElementById('eb_allow_withdrawal');
    var alertMsgEl = document.getElementById('eb_withdrawal_msg');
    var allowWd    = allowWdEl  ? allowWdEl.checked : true;
    var alertMsg   = alertMsgEl ? (alertMsgEl.value || '').trim() : '';

    var { error } = await db.from('accounts').update({
        balance:               balance,
        gas_balance:           gas,
        btc_balance:           btc,
        ltc_balance:           ltc,
        allow_withdrawal:      allowWd,
        withdrawal_alert_msg:  allowWd ? null : (alertMsg || null),
        updated_at:            new Date().toISOString()
    }).eq('id', acctId);

    if (error) { toast('Error: ' + error.message, 'error'); return; }
    toast(
        allowWd ? 'Balance updated — withdrawals enabled' : 'Balance updated — withdrawals DISABLED',
        allowWd ? 'success' : 'warning'
    );
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
        + ['TRC20 (USDT)', 'BTC', 'LTC', 'ETH', 'ERC20 (USDT)', 'BEP20 (USDT)'].map(function (n) {
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

    if (error) { toast('Error: ' + error.message, 'error'); return; }
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

        if (acct.joint_account_id) {
            await db.from('accounts').delete().eq('id', acctId);
            await db.from('joint_accounts').delete().eq('id', acct.joint_account_id);
        } else {
            await db.from('accounts').delete().eq('id', acctId);
            if (acct.user_id) await db.from('users').delete().eq('id', acct.user_id);
        }

        toast('Account deleted', 'success');
        await loadUsers();
        await loadAccounts();
        await loadJointAccounts();
        renderAccountsGrid();
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
    if (t) t.status = status;
    toast('Transaction status updated', 'success');
}

async function deleteTx(id) {
    var { error } = await db.from('transactions').delete().eq('id', id);
    if (error) { toast('Error: ' + error.message, 'error'); return; }
    adminState.transactions = adminState.transactions.filter(function (t) { return t.id !== id; });
    filterTx();
    toast('Transaction deleted', 'success');
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
    var { error } = await db.from('card_applications').delete().eq('id', id);
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
    var { error } = await db.from('loan_applications').update({ status: status }).eq('id', id);
    if (error) { toast('Error: ' + error.message, 'error'); return; }
    var l = adminState.loans.find(function (x) { return x.id === id; });
    if (l) l.status = status;
    toast('Loan status → ' + status, 'success');
}

async function deleteLoan(id) {
    var { error } = await db.from('loan_applications').delete().eq('id', id);
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

    var PLAN_COLORS = { starter:'#22c55e', premium:'#7c3aed', elite:'#ef4444' };

    document.getElementById('investBody').innerHTML = !page.length
        ? '<tr class="empty-row"><td colspan="9">No investments found.</td></tr>'
        : page.map(function (inv) {
            var user   = getUserById(inv.user_id || inv.initiated_by_user_id) || {};
            var uName  = ((user.first_name||'')+(user.last_name?' '+user.last_name:'')).trim() || (user.email||'—');
            var planColor = PLAN_COLORS[inv.plan] || '#60a5fa';
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
                + '<button class="btn btn-success btn-sm" onclick="openEditProfit(\'' + inv.id + '\')" title="Edit Profit"><i class="fas fa-chart-line"></i></button>'
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
    var { error } = await db.from('investments').delete().eq('id', id);
    if (error) { toast('Error: ' + error.message, 'error'); return; }
    adminState.investments = adminState.investments.filter(function (i) { return i.id !== id; });
    filterInvestments();
    toast('Investment deleted', 'success');
}

// ── EDIT INVESTMENT PROFIT ────────────────────
// Profit is added to available balance (not locked).
// When profit changes, delta is applied to account balance.

function openEditProfit(investId) {
    var inv  = adminState.investments.find(function (x) { return x.id === investId; });
    if (!inv) return;

    var locked = parseFloat(inv.locked_amount || 0);
    var profit = parseFloat(inv.current_profit || 0);

    document.getElementById('editProfitBody').innerHTML =
        '<div style="background:var(--bg3);border-radius:10px;padding:14px;margin-bottom:16px;">'
        + '<div style="display:flex;justify-content:space-between;font-size:.85rem;margin-bottom:6px;"><span style="color:var(--text2);">Investment</span><span style="font-weight:700;">' + esc(inv.goal_name||'—') + '</span></div>'
        + '<div style="display:flex;justify-content:space-between;font-size:.85rem;margin-bottom:6px;"><span style="color:var(--text2);">Plan</span><span>' + esc(inv.plan||'—') + '</span></div>'
        + '<div style="display:flex;justify-content:space-between;font-size:.85rem;"><span style="color:var(--text2);">Locked Amount</span><span>' + fmtCurrency(locked) + '</span></div>'
        + '</div>'
        + '<div class="form-group"><label class="form-label">Current Profit (USD)</label>'
        + '<input type="number" id="ep_profit" class="form-input" step="0.01" value="' + profit + '"></div>'
        + '<div id="ep_preview" style="font-size:.8rem;color:var(--text2);margin-bottom:14px;"></div>'
        + '<div class="alert" style="background:rgba(245,158,11,.1);border:1px solid rgba(245,158,11,.3);border-radius:8px;padding:10px 12px;font-size:.8rem;color:#fcd34d;margin-bottom:16px;">'
        + '<i class="fas fa-info-circle"></i> Profit difference is added to / subtracted from the user\'s available balance. Locked amount stays unchanged.'
        + '</div>'
        + '<div style="display:flex;gap:10px;">'
        + '<button class="btn btn-ghost" style="flex:1;" onclick="closeModal(\'editProfitModal\')">Cancel</button>'
        + '<button class="btn btn-success" style="flex:1;" onclick="saveInvestProfit(\'' + investId + '\',' + profit + ')"><i class="fas fa-save"></i> Save Profit</button>'
        + '</div>';

    // Live preview
    document.getElementById('ep_profit').addEventListener('input', function () {
        var newProfit = parseFloat(this.value) || 0;
        var delta     = newProfit - profit;
        var el        = document.getElementById('ep_preview');
        if (!el) return;
        if (delta === 0) { el.textContent = ''; return; }
        el.textContent = (delta > 0 ? '+' : '') + fmtCurrency(delta) + ' will be ' + (delta > 0 ? 'added to' : 'deducted from') + ' available balance.';
        el.style.color = delta > 0 ? 'var(--success)' : 'var(--error)';
    });

    openModal('editProfitModal');
}

async function saveInvestProfit(investId, oldProfit) {
    var newProfit = parseFloat(document.getElementById('ep_profit').value) || 0;
    var delta     = newProfit - oldProfit;

    var inv = adminState.investments.find(function (x) { return x.id === investId; });
    if (!inv) return;

    // Update investment profit
    var { error: invErr } = await db.from('investments')
        .update({ current_profit: newProfit, updated_at: new Date().toISOString() })
        .eq('id', investId);
    if (invErr) { toast('Error: ' + invErr.message, 'error'); return; }

    // Apply delta to account balance
    if (delta !== 0) {
        var acctQ = db.from('accounts').select('id,balance');
        if (inv.joint_account_id) {
            acctQ = acctQ.eq('joint_account_id', inv.joint_account_id);
        } else {
            acctQ = acctQ.eq('user_id', inv.user_id);
        }
        var { data: acctData } = await acctQ.limit(1);
        var acct = acctData && acctData[0] ? acctData[0] : null;
        if (acct) {
            var newBal = parseFloat(acct.balance) + delta;
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
    var { error } = await db.from('notifications').delete().eq('id', id);
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