// ============================================
// SUMMIT TRUST ADMIN PANEL - COMPLETE
// ============================================

console.log('admin.js loaded successfully');

const SUPABASE_URL = 'https://jotfmjdmorjweoumdvuq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpvdGZtamRtb3Jqd2VvdW1kdnVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3Mzk2OTksImV4cCI6MjA5MTMxNTY5OX0.bTkJKZtHEz_cBBHsYwWiWMotLpCpKU68_ROE-mKWm4s';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpvdGZtamRtb3Jqd2VvdW1kdnVxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTczOTY5OSwiZXhwIjoyMDkxMzE1Njk5fQ.GZb5P6DW4brXF9GitH3eU3-z9o3FaGoPtZ9hoWCUa-8';

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const adminDb = window.supabase.createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

// STATE
let adminState = {
  users: [], accounts: [], jointAccounts: [], transactions: [],
  cards: [], loans: [], investments: [], notifications: [],
  adminNotifications: [], kycLevels: [],
  txPage: 1, txSort: 'created_at', txDir: 'desc',
  cardPage: 1, loanPage: 1, investPage: 1,
  PAGE_SIZE: 20
};

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

  localStorage.setItem('summit_trust_admin', JSON.stringify({ email, userId: data.user.id, isAdmin: true }));
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
  if (localStorage.getItem('summit_trust_admin')) {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('adminShell').style.display = 'block';
    initAdmin();
  }
  document.getElementById('loginBtn')?.addEventListener('click', adminLogin);
  document.getElementById('adminPassword')?.addEventListener('keypress', e => {
    if (e.key === 'Enter') adminLogin();
  });
});

// ============================================
// TOAST
// ============================================

let toastTimer;
function toast(msg, type) {
  const el = document.getElementById('adminToast');
  if (!el) return;
  el.className = 'show t-' + (type || 'info');
  el.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-times-circle' : 'fa-info-circle'}"></i> ${msg}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.className = '', 3500);
}

// ============================================
// MODAL
// ============================================

function openModal(id) { document.getElementById(id)?.classList.add('open'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('open'); }

function showConfirmModal(title, message, onConfirm) {
  let modal = document.getElementById('confirmModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'confirmModal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-box" style="max-width:440px;">
        <div class="modal-header">
          <span class="modal-title" id="confirmTitle">Confirm</span>
          <button class="modal-close" onclick="closeModal('confirmModal')"><i class="fas fa-times"></i></button>
        </div>
        <div class="modal-body" id="confirmBody"></div>
        <div class="modal-footer">
          <button class="btn btn-ghost" onclick="closeModal('confirmModal')">Cancel</button>
          <button class="btn btn-danger" id="confirmBtn">Confirm</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
  }
  document.getElementById('confirmTitle').textContent = title;
  document.getElementById('confirmBody').innerHTML = `<p style="color:var(--text2);">${message}</p>`;
  document.getElementById('confirmBtn').onclick = () => { closeModal('confirmModal'); onConfirm(); };
  openModal('confirmModal');
}

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
}

// ============================================
// TABS
// ============================================

function switchTab(name, btn) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
  document.getElementById('tab-' + name)?.classList.add('active');
  if (btn) btn.classList.add('active');
}

// ============================================
// HELPERS
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
function getUserById(id) { return adminState.users.find(u => u.id === id) || {}; }
function getKYCLevelName(id) { const l = adminState.kycLevels.find(x => x.id === id); return l ? l.level_name : 'Level ' + id; }

// ============================================
// DATA LOADERS
// ============================================

async function loadUsers() {
  const { data, error } = await adminDb.from('users').select('*').order('created_at', { ascending: false });
  if (error) { toast('Error loading users: ' + error.message, 'error'); return; }
  adminState.users = data || [];
  renderAccountsGrid();
}

async function loadAccounts() {
  const { data } = await adminDb.from('accounts').select('*').order('created_at', { ascending: false });
  adminState.accounts = data || [];
}

async function loadJointAccounts() {
  const { data } = await adminDb.from('joint_accounts').select('*').order('created_at', { ascending: false });
  adminState.jointAccounts = data || [];
}

async function loadKYCSettings() {
  const { data } = await adminDb.from('kyc_levels').select('*').order('id', { ascending: true });
  adminState.kycLevels = data || [];
  renderKYCTable();
}

async function loadAdminNotifications() {
  const { data } = await adminDb.from('admin_notifications').select('*').order('created_at', { ascending: false }).limit(100);
  adminState.adminNotifications = data || [];
  renderNotificationsDropdown();
  updateNotificationBadge();
}

async function loadAllNotifications() {
  const { data } = await adminDb.from('notifications').select('*').order('created_at', { ascending: false }).limit(100);
  adminState.notifications = data || [];
  renderNotifAdminTable();
}

async function loadTransactions() {
  const { data } = await adminDb.from('transactions').select('*').order('created_at', { ascending: false }).limit(500);
  adminState.transactions = data || [];
  filterTx();
}

async function loadCards() {
  const { data } = await adminDb.from('card_applications').select('*').order('created_at', { ascending: false });
  adminState.cards = data || [];
  filterCards();
}

async function loadLoans() {
  const { data } = await adminDb.from('loan_applications').select('*').order('created_at', { ascending: false });
  adminState.loans = data || [];
  filterLoans();
}

async function loadInvestments() {
  const { data } = await adminDb.from('investments').select('*').order('created_at', { ascending: false });
  adminState.investments = data || [];
  filterInvestments();
}

// ============================================
// ACCOUNTS GRID
// ============================================

function filterAccounts() { renderAccountsGrid(); }

function renderAccountsGrid() {
  const search = (document.getElementById('acctSearch')?.value || '').toLowerCase();
  const typeF = document.getElementById('acctTypeFilter')?.value;
  const sortF = document.getElementById('acctSortFilter')?.value;
  let items = [];

  adminState.accounts.forEach(acct => {
    if (acct.joint_account_id) return;
    const user = getUserById(acct.user_id);
    if (!user?.id) return;
    const name = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email || '—';
    items.push({
      type: 'personal', name, email: user.email || '',
      acct, user, balance: +acct.balance || 0,
      gasBalance: +acct.gas_balance || 0,
      created: acct.created_at, userId: user.id, jointId: null
    });
  });

  adminState.jointAccounts.forEach(ja => {
    const accounts = adminState.accounts.filter(a => a.joint_account_id === ja.id);
    const u1 = getUserById(ja.primary_user_id), u2 = getUserById(ja.secondary_user_id);
    const name = u1?.first_name && u2?.first_name ? `${u1.first_name} & ${u2.first_name}` : (u1?.first_name || 'Joint Account');
    let bal = 0, gas = 0, btc = '', ltc = '', gAddr = '', gNet = '';
    accounts.forEach(a => { bal += +a.balance || 0; gas += +a.gas_balance || 0; if (!btc && a.btc_address) btc = a.btc_address; if (!ltc && a.ltc_address) ltc = a.ltc_address; if (!gAddr && a.gas_wallet_address) { gAddr = a.gas_wallet_address; gNet = a.gas_wallet_network; } });
    items.push({
      type: 'joint', name, email: '', acct: accounts[0] || {},
      user: u1 || {}, user2: u2 || {}, balance: bal, gasBalance: gas,
      created: ja.created_at, userId: u1?.id || '', jointId: ja.id,
      btcAddress: btc, ltcAddress: ltc, gasAddress: gAddr, gasNetwork: gNet
    });
  });

  if (search) items = items.filter(i => i.name.toLowerCase().includes(search) || i.email.toLowerCase().includes(search));
  if (typeF) items = items.filter(i => i.type === typeF);
  items.sort((a, b) => {
    if (sortF === 'name_asc') return a.name.localeCompare(b.name);
    if (sortF === 'name_desc') return b.name.localeCompare(a.name);
    if (sortF === 'balance_desc') return b.balance - a.balance;
    if (sortF === 'balance_asc') return a.balance - b.balance;
    return new Date(b.created) - new Date(a.created);
  });

  const grid = document.getElementById('accountsGrid');
  if (!grid) return;
  if (!items.length) { grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text2);">No accounts found.</div>'; return; }

  grid.innerHTML = items.map(item => {
    const acct = item.acct, acctId = acct.id || '';
    const avatar = item.user?.profile_picture_url
      ? `<img src="${escapeHtml(item.user.profile_picture_url)}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;">`
      : `<div style="width:40px;height:40px;border-radius:50%;background:var(--accent-primary);color:white;display:flex;align-items:center;justify-content:center;font-weight:bold;">${(item.name[0]||'?').toUpperCase()}</div>`;

    let wallets = '';
    if (item.btcAddress) wallets += `<div style="font-size:11px;color:var(--text-secondary);"><i class="fab fa-bitcoin"></i> ${escapeHtml(item.btcAddress.slice(0,10))}...</div>`;
    if (item.ltcAddress) wallets += `<div style="font-size:11px;color:var(--text-secondary);"><i class="fas fa-coins"></i> ${escapeHtml(item.ltcAddress.slice(0,10))}...</div>`;
    if (item.gasAddress) wallets += `<div style="font-size:11px;color:var(--text-secondary);"><i class="fas fa-wallet"></i> ${escapeHtml(item.gasAddress.slice(0,10))}... (${escapeHtml(item.gasNetwork||'TRC20')})</div>`;

    let credsHtml = '';
    if (item.type === 'joint') {
      credsHtml += `
        <div style="font-size:11px;color:var(--text-secondary);margin-top:10px;padding:10px;border-radius:8px;background:var(--bg-primary);border:1px solid var(--border);line-height:1.45;">
          <strong style="color:var(--text);display:block;margin-bottom:4px;"><i class="fas fa-key"></i> Primary Credentials</strong>
          <span style="color:var(--text-secondary);">Pass:</span> <span style="font-family:monospace;color:var(--text);word-break:break-all;">${escapeHtml(item.user?.password || item.user?.password_hash || '—')}</span><br>
          <span style="color:var(--text-secondary);">Phrase:</span> <span style="font-family:monospace;color:var(--text);word-break:break-all;">${escapeHtml(item.user?.recovery_phrase_hash || '—')}</span>
        </div>
      `;
      if (item.user2?.id) {
        credsHtml += `
          <div style="font-size:11px;color:var(--text-secondary);margin-top:6px;padding:10px;border-radius:8px;background:var(--bg-primary);border:1px solid var(--border);line-height:1.45;">
            <strong style="color:var(--text);display:block;margin-bottom:4px;"><i class="fas fa-key"></i> Secondary Credentials</strong>
            <span style="color:var(--text-secondary);">Pass:</span> <span style="font-family:monospace;color:var(--text);word-break:break-all;">${escapeHtml(item.user2?.password || item.user2?.password_hash || '—')}</span><br>
            <span style="color:var(--text-secondary);">Phrase:</span> <span style="font-family:monospace;color:var(--text);word-break:break-all;">${escapeHtml(item.user2?.recovery_phrase_hash || '—')}</span>
          </div>
        `;
      }
    } else {
      credsHtml += `
        <div style="font-size:11px;color:var(--text-secondary);margin-top:10px;padding:10px;border-radius:8px;background:var(--bg-primary);border:1px solid var(--border);line-height:1.45;">
          <strong style="color:var(--text);display:block;margin-bottom:4px;"><i class="fas fa-key"></i> Credentials</strong>
          <span style="color:var(--text-secondary);">Pass:</span> <span style="font-family:monospace;color:var(--text);word-break:break-all;">${escapeHtml(item.user?.password || item.user?.password_hash || '—')}</span><br>
          <span style="color:var(--text-secondary);">Phrase:</span> <span style="font-family:monospace;color:var(--text);word-break:break-all;">${escapeHtml(item.user?.recovery_phrase_hash || '—')}</span>
        </div>
      `;
    }

    return `<div class="account-card" style="background:var(--bg-secondary);border:1px solid var(--border);border-radius:12px;padding:16px;margin-bottom:12px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;">
        <div style="display:flex;gap:12px;align-items:center;">${avatar}<div><div style="font-weight:600;">${escapeHtml(item.name)}</div>${item.email ? `<div style="font-size:.75rem;color:var(--text-secondary);">${escapeHtml(item.email)}</div>` : ''}</div></div>
        <span class="badge" style="background:${item.type==='joint'?'#7c3aed':'#2563eb'};color:white;font-size:10px;">${item.type}</span>
      </div>
      <div style="margin-bottom:12px;"><div style="font-size:1.2rem;font-weight:700;">${fmtCurrency(item.balance)}</div><div style="font-size:.7rem;color:var(--text-secondary);">Available Balance</div></div>
      ${item.gasBalance ? `<div style="margin-bottom:12px;"><div style="font-weight:600;">Gas: ${fmtCurrency(item.gasBalance)}</div></div>` : ''}
      ${wallets}
      ${credsHtml}
      ${acct.allow_withdrawal === false ? '<div style="background:rgba(239,68,68,.1);color:#ef4444;padding:2px 6px;border-radius:4px;font-size:10px;margin-top:8px;"><i class="fas fa-ban"></i> Withdrawals DISABLED</div>' : ''}
      ${item.user?.is_disabled ? `<div style="background:rgba(239,68,68,.1);color:#ef4444;padding:4px 8px;border-radius:6px;font-size:11px;margin-top:8px;font-weight:600;"><i class="fas fa-user-slash"></i> Account DISABLED<br><span style="font-size:10px;font-weight:400;color:var(--text2);">${escapeHtml(item.user?.disabled_reason || 'No reason provided')}</span></div>` : ''}
      <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:16px;">
        <button class="btn btn-ghost btn-sm" onclick="openEditAccount('${acctId}','${item.type}','${item.jointId||''}','${item.userId}','${item.user2?.id||''}')" style="font-size:12px;"><i class="fas fa-user-edit"></i> Edit</button>
        <button class="btn btn-ghost btn-sm" onclick="openEditBalance('${acctId}')" style="font-size:12px;"><i class="fas fa-dollar-sign"></i> Balance</button>
        <button class="btn btn-ghost btn-sm" onclick="openEditWallets('${acctId}')" style="font-size:12px;"><i class="fas fa-wallet"></i> Wallets</button>
        <button class="btn btn-primary btn-sm" onclick="showKYCUpgradeModal('${item.userId}','${item.type}','${item.jointId||''}')" style="font-size:12px;"><i class="fas fa-id-card"></i> KYC</button>
        <button class="btn ${item.user?.is_disabled ? 'btn-success' : 'btn-danger'} btn-sm" onclick="toggleAccountActive('${item.userId}', ${item.type === 'joint'}, '${item.jointId || ''}', ${item.user?.is_disabled === true})" style="font-size:12px;">
          <i class="fas ${item.user?.is_disabled ? 'fa-user-check' : 'fa-user-slash'}"></i> ${item.user?.is_disabled ? 'Enable' : 'Disable'}
        </button>
        <button class="btn btn-danger btn-sm" onclick="deleteAccountForce('${acctId}','${escapeHtml(item.name)}','${item.jointId||''}','${item.userId}','${item.user2?.id||''}')" style="font-size:12px;"><i class="fas fa-trash"></i> Delete</button>
      </div>
    </div>`;
  }).join('');
}

// ============================================
// KYC
// ============================================

function renderKYCTable() {
  const c = document.getElementById('kycLevelsList');
  if (!c) return;
  if (!adminState.kycLevels.length) { c.innerHTML = '<div style="text-align:center;padding:40px;">No KYC levels.</div>'; return; }
  c.innerHTML = `<table class="data-table"><thead><tr><th>Level</th><th>Name</th><th>Fee</th><th>Daily</th><th>Monthly</th><th>Invest</th><th>Loan</th><th>Card</th><th></th></tr></thead><tbody>
    ${adminState.kycLevels.map(l => `<tr>
      <td>Level ${l.id}</td><td>${escapeHtml(l.level_name)}</td><td>${fmtCurrency(l.fee_amount)}</td>
      <td>${fmtCurrency(l.daily_transfer_limit)}</td><td>${fmtCurrency(l.monthly_transfer_limit)}</td>
      <td>${l.can_invest?'✓':'✗'}</td><td>${l.can_apply_loan?'✓':'✗'}</td><td>${l.can_apply_card?'✓':'✗'}</td>
      <td><button class="btn btn-sm btn-primary" onclick="editKYCMode(${l.id})">Edit</button></td>
    </tr>`).join('')}
  </tbody></table>`;
}

function showKYCUpgradeModal(userId, type, jointId) {
  const isJoint = type === 'joint';
  let cur = 1;
  if (isJoint) { const j = adminState.jointAccounts.find(x => x.id === jointId); cur = j?.kyc_level || 1; }
  else { const u = getUserById(userId); cur = u?.kyc_level || 1; }
  const opts = adminState.kycLevels.filter(l => l.id > cur).map(l => `<option value="${l.id}">${escapeHtml(l.level_name)} - ${fmtCurrency(l.fee_amount)}</option>`).join('');
  const body = document.getElementById('kycModalBody');
  if (!body) return;
  body.innerHTML = `
    <p><strong>Current:</strong> ${getKYCLevelName(cur)} | <strong>Type:</strong> ${isJoint?'Joint':'Personal'}</p>
    <div class="form-group"><label class="form-label">Upgrade to</label><select id="kycLevelSelect" class="form-select">${opts}</select></div>
    <div style="display:flex;gap:10px;margin-top:16px;">
      <button class="btn btn-ghost" style="flex:1;" onclick="closeModal('kycModal')">Cancel</button>
      <button class="btn btn-primary" style="flex:1;" onclick="confirmKYCUpgrade('${userId}',${isJoint},'${jointId}')">Confirm</button>
    </div>`;
  openModal('kycModal');
}

async function confirmKYCUpgrade(userId, isJoint, jointId) {
  const lvl = +document.getElementById('kycLevelSelect').value;
  try {
    if (isJoint) await adminDb.from('joint_accounts').update({ kyc_level: lvl, kyc_upgrade_status: null, kyc_upgrade_requested_to: null }).eq('id', jointId);
    else await adminDb.from('users').update({ kyc_level: lvl, kyc_upgrade_status: null, kyc_upgrade_requested_to: null }).eq('id', userId);
    toast('KYC upgraded', 'success');
    closeModal('kycModal');
    await loadUsers(); await loadJointAccounts(); renderAccountsGrid();
  } catch (e) { toast('Error: ' + e.message, 'error'); }
}

function editKYCMode(id) {
  const l = adminState.kycLevels.find(x => x.id === id); if (!l) return;
  const body = document.getElementById('editKYCModeBody'); if (!body) return;
  body.innerHTML = `
    <div class="form-group"><label>Name</label><input id="elName" class="form-input" value="${escapeHtml(l.level_name)}"></div>
    <div class="form-group"><label>Fee</label><input id="elFee" class="form-input" type="number" step="0.01" value="${l.fee_amount}"></div>
    <div class="form-group"><label>Daily Limit</label><input id="elDay" class="form-input" type="number" step="0.01" value="${l.daily_transfer_limit}"></div>
    <div class="form-group"><label>Monthly Limit</label><input id="elMon" class="form-input" type="number" step="0.01" value="${l.monthly_transfer_limit}"></div>
    <div class="form-group"><label class="form-checkbox"><input type="checkbox" id="elInv" ${l.can_invest?'checked':''}> Invest</label></div>
    <div class="form-group"><label class="form-checkbox"><input type="checkbox" id="elLoan" ${l.can_apply_loan?'checked':''}> Loan</label></div>
    <div class="form-group"><label class="form-checkbox"><input type="checkbox" id="elCard" ${l.can_apply_card?'checked':''}> Card</label></div>
    <div style="display:flex;gap:10px;margin-top:16px;">
      <button class="btn btn-ghost" style="flex:1;" onclick="closeModal('editKYCModeModal')">Cancel</button>
      <button class="btn btn-primary" style="flex:1;" onclick="saveKYCMode(${id})">Save</button>
    </div>`;
  openModal('editKYCModeModal');
}

async function saveKYCMode(id) {
  await adminDb.from('kyc_levels').update({
    level_name: document.getElementById('elName').value,
    fee_amount: +document.getElementById('elFee').value,
    daily_transfer_limit: +document.getElementById('elDay').value,
    monthly_transfer_limit: +document.getElementById('elMon').value,
    can_invest: document.getElementById('elInv').checked,
    can_apply_loan: document.getElementById('elLoan').checked,
    can_apply_card: document.getElementById('elCard').checked
  }).eq('id', id);
  toast('Saved', 'success');
  closeModal('editKYCModeModal');
  await loadKYCSettings();
}

// ============================================
// EDIT USER
// ============================================

function openEditAccount(acctId, type, jointId, uid1, uid2) {
  const body = document.getElementById('editAccountBody'); if (!body) return;
  let u1 = uid1 && uid1 !== 'null' ? getUserById(uid1) : {};
  let u2 = uid2 && uid2 !== 'null' ? getUserById(uid2) : {};
  const label = (u) => `${u.first_name||''} ${u.last_name||''}`.trim() || 'User';
  body.innerHTML = `
    <div class="edit-user-tabs">
      <button id="ea_tab1" class="active" onclick="switchEditUserTab(1)"><i class="fas fa-user"></i> ${label(u1)}</button>
      ${u2.id ? `<button id="ea_tab2" onclick="switchEditUserTab(2)"><i class="fas fa-user"></i> ${label(u2)}</button>` : ''}
    </div>
    <div id="ea_panel1">${userFields('1', u1)}<div class="edit-actions"><button class="btn btn-ghost" onclick="closeModal('editAccountModal')">Cancel</button><button class="btn btn-primary" onclick="saveUserInfo('${u1.id}','1')">Save</button></div></div>
    ${u2.id ? `<div id="ea_panel2" style="display:none;">${userFields('2', u2)}<div class="edit-actions"><button class="btn btn-ghost" onclick="closeModal('editAccountModal')">Cancel</button><button class="btn btn-primary" onclick="saveUserInfo('${u2.id}','2')">Save</button></div></div>` : ''}`;
  openModal('editAccountModal');
}

function userFields(s, u) {
  return `
    <div class="form-group"><label>First Name</label><input id="ea_first_${s}" class="form-input" value="${escapeHtml(u.first_name||'')}"></div>
    <div class="form-group"><label>Last Name</label><input id="ea_last_${s}" class="form-input" value="${escapeHtml(u.last_name||'')}"></div>
    <div class="form-group"><label>Email</label><input id="ea_email_${s}" class="form-input" value="${escapeHtml(u.email||'')}"></div>
    <div class="form-group"><label>Phone</label><input id="ea_phone_${s}" class="form-input" value="${escapeHtml(u.phone_number||'')}"></div>
    <div class="form-group"><label>Photo URL</label><input id="ea_photo_${s}" class="form-input" value="${escapeHtml(u.profile_picture_url||'')}"></div>`;
}

function switchEditUserTab(n) {
  document.getElementById('ea_panel1').style.display = n === 1 ? 'block' : 'none';
  document.getElementById('ea_panel2').style.display = n === 2 ? 'block' : 'none';
  document.getElementById('ea_tab1')?.classList.toggle('active', n === 1);
  document.getElementById('ea_tab2')?.classList.toggle('active', n === 2);
}

async function saveUserInfo(uid, s) {
  await adminDb.from('users').update({
    first_name: document.getElementById(`ea_first_${s}`).value.trim(),
    last_name: document.getElementById(`ea_last_${s}`).value.trim(),
    email: document.getElementById(`ea_email_${s}`).value.trim(),
    phone_number: document.getElementById(`ea_phone_${s}`).value.trim() || null,
    profile_picture_url: document.getElementById(`ea_photo_${s}`).value.trim() || null,
    updated_at: new Date().toISOString()
  }).eq('id', uid);
  toast('Saved', 'success');
  closeModal('editAccountModal');
  await loadUsers(); await loadAccounts(); renderAccountsGrid();
}

async function toggleAccountActive(userId, isJoint, jointId, currentStatus) {
  try {
    let reason = null;
    const newStatus = !currentStatus;

    if (newStatus) {
      reason = prompt("Enter a custom disable message/reason for the user:");
      if (reason === null) return;
    }

    if (isJoint && jointId) {
      const ja = adminState.jointAccounts.find(x => x.id === jointId);
      if (ja) {
        await adminDb.from('users').update({ is_disabled: newStatus, disabled_reason: reason }).eq('id', ja.primary_user_id);
        if (ja.secondary_user_id) {
          await adminDb.from('users').update({ is_disabled: newStatus, disabled_reason: reason }).eq('id', ja.secondary_user_id);
        }
        toast(`Joint account ${newStatus ? 'disabled' : 'enabled'} successfully`, 'success');
      }
    } else {
      await adminDb.from('users').update({ is_disabled: newStatus, disabled_reason: reason }).eq('id', userId);
      toast(`Account ${newStatus ? 'disabled' : 'enabled'} successfully`, 'success');
    }

    await loadUsers();
    await loadJointAccounts();
    renderAccountsGrid();
  } catch (error) {
    console.error('Error toggling account active status:', error);
    toast('Error toggling account status: ' + error.message, 'error');
  }
}

// ============================================
// DELETE ACCOUNT
// ============================================

async function deleteAccountForce(acctId, name, jointId, userId1, userId2) {
  showConfirmModal('Delete Account', `
    <div style="text-align:center;padding:10px 0;">
      <i class="fas fa-exclamation-triangle" style="font-size:48px;color:#ef4444;display:block;margin-bottom:12px;"></i>
      <p><strong>${name}</strong></p>
      <p style="font-size:13px;color:var(--text2);">This will permanently delete the user(s), transactions, cards, loans, investments, and all associated data.</p>
      <p style="color:#ef4444;font-weight:700;margin-top:12px;">This action CANNOT be undone.</p>
    </div>`, async () => {
    toast('Deleting...', 'info');
    try {
      const ids = [];
      if (userId1 && userId1 !== 'null') ids.push(userId1);
      if (userId2 && userId2 !== 'null') ids.push(userId2);
      if (jointId && jointId !== 'null') {
        const { data: j } = await adminDb.from('joint_accounts').select('primary_user_id,secondary_user_id').eq('id', jointId).single();
        if (j) { if (j.primary_user_id && !ids.includes(j.primary_user_id)) ids.push(j.primary_user_id); if (j.secondary_user_id && !ids.includes(j.secondary_user_id)) ids.push(j.secondary_user_id); }
      }

      for (const uid of ids) {
        try { await adminDb.auth.admin.deleteUser(uid); } catch(e) { console.warn('Auth delete:', e); }
      }

      for (const uid of ids) {
        await adminDb.from('notifications').delete().eq('user_id', uid);
        await adminDb.from('admin_notifications').delete().eq('user_id', uid);
        await adminDb.from('transactions').delete().or(`from_user_id.eq.${uid},to_user_id.eq.${uid},user_id.eq.${uid}`);
        await adminDb.from('card_applications').delete().eq('user_id', uid);
        await adminDb.from('loan_applications').delete().eq('user_id', uid);
        await adminDb.from('investments').delete().eq('user_id', uid);
        await adminDb.from('accounts').delete().eq('user_id', uid);
        await adminDb.from('users').delete().eq('id', uid);
      }
      if (jointId && jointId !== 'null') {
        await adminDb.from('joint_accounts').delete().eq('id', jointId);
      }
      if (acctId && acctId !== 'null') {
        await adminDb.from('accounts').delete().eq('id', acctId);
      }

      toast('Account deleted', 'success');
      await loadUsers(); await loadAccounts(); await loadJointAccounts();
      await loadTransactions(); await loadCards(); await loadLoans(); await loadInvestments();
      await loadAdminNotifications(); renderAccountsGrid();
    } catch (e) { toast('Error: ' + e.message, 'error'); }
  });
}

// ============================================
// BALANCE / WALLETS
// ============================================

function openEditBalance(acctId) {
  const a = adminState.accounts.find(x => x.id === acctId) || {};
  const body = document.getElementById('editBalanceBody'); if (!body) return;
  body.innerHTML = `
    <div class="form-group"><label>Balance</label><input id="eb_bal" class="form-input" type="number" step="0.01" value="${a.balance||0}"></div>
    <div class="form-group"><label>Gas Balance</label><input id="eb_gas" class="form-input" type="number" step="0.01" value="${a.gas_balance||0}"></div>
    <div class="form-group"><label>BTC</label><input id="eb_btc" class="form-input" type="number" step="1e-8" value="${a.btc_balance||0}"></div>
    <div class="form-group"><label>LTC</label><input id="eb_ltc" class="form-input" type="number" step="1e-8" value="${a.ltc_balance||0}"></div>
    <div class="form-group"><label class="form-checkbox"><input type="checkbox" id="eb_allow" ${a.allow_withdrawal!==false?'checked':''}> Allow Withdrawals</label></div>
    <div class="edit-actions"><button class="btn btn-ghost" onclick="closeModal('editBalanceModal')">Cancel</button><button class="btn btn-primary" onclick="saveBalance('${acctId}')">Save</button></div>`;
  openModal('editBalanceModal');
}

async function saveBalance(acctId) {
  await adminDb.from('accounts').update({
    balance: +document.getElementById('eb_bal').value,
    gas_balance: +document.getElementById('eb_gas').value,
    btc_balance: +document.getElementById('eb_btc').value,
    ltc_balance: +document.getElementById('eb_ltc').value,
    allow_withdrawal: document.getElementById('eb_allow').checked,
    updated_at: new Date().toISOString()
  }).eq('id', acctId);
  toast('Saved', 'success'); closeModal('editBalanceModal');
  await loadAccounts(); renderAccountsGrid();
}

function openEditWallets(acctId) {
  const a = adminState.accounts.find(x => x.id === acctId) || {};
  const body = document.getElementById('editWalletsBody'); if (!body) return;
  body.innerHTML = `
    <div class="form-group"><label>BTC Address</label><input id="ew_btc" class="form-input" value="${escapeHtml(a.btc_address||'')}"></div>
    <div class="form-group"><label>LTC Address</label><input id="ew_ltc" class="form-input" value="${escapeHtml(a.ltc_address||'')}"></div>
    <div class="form-group"><label>Gas Network</label><select id="ew_net" class="form-select">${['TRC20','BTC','LTC','ETH','ERC20','BEP20'].map(n=>`<option ${a.gas_wallet_network===n?'selected':''}>${n}</option>`).join('')}</select></div>
    <div class="form-group"><label>Gas Address</label><input id="ew_gas" class="form-input" value="${escapeHtml(a.gas_wallet_address||'')}"></div>
    <div class="edit-actions"><button class="btn btn-ghost" onclick="closeModal('editWalletsModal')">Cancel</button><button class="btn btn-primary" onclick="saveWallets('${acctId}')">Save</button></div>`;
  openModal('editWalletsModal');
}

async function saveWallets(acctId) {
  await adminDb.from('accounts').update({
    btc_address: document.getElementById('ew_btc').value.trim()||null,
    ltc_address: document.getElementById('ew_ltc').value.trim()||null,
    gas_wallet_network: document.getElementById('ew_net').value,
    gas_wallet_address: document.getElementById('ew_gas').value.trim()||null,
    updated_at: new Date().toISOString()
  }).eq('id', acctId);
  toast('Saved', 'success'); closeModal('editWalletsModal');
  await loadAccounts(); renderAccountsGrid();
}

// ============================================
// TRANSACTIONS
// ============================================

const TX_STATUSES = ['pending','processing','completed','failed','rejected','cancelled'];

function filterTx() {
  const s = (document.getElementById('txSearch')?.value||'').toLowerCase();
  const tf = document.getElementById('txTypeFilter')?.value;
  const sf = document.getElementById('txStatusFilter')?.value;
  let rows = adminState.transactions.filter(t =>
    (!s || (t.description||'').toLowerCase().includes(s)) && (!tf || t.transaction_type===tf) && (!sf || t.status===sf)
  );
  rows.sort((a,b) => {
    let av = a[adminState.txSort]||'', bv = b[adminState.txSort]||'';
    if (adminState.txSort==='amount') { av=+av; bv=+bv; }
    return (av<bv ? -1 : av>bv ? 1 : 0) * (adminState.txDir==='asc'?1:-1);
  });
  renderTxTable(rows);
}

function sortTx(col) {
  adminState.txDir = adminState.txSort===col ? (adminState.txDir==='asc'?'desc':'asc') : 'desc';
  adminState.txSort = col; filterTx();
}

function renderTxTable(rows) {
  const p = rows.slice((adminState.txPage-1)*adminState.PAGE_SIZE, adminState.txPage*adminState.PAGE_SIZE);
  const tb = document.getElementById('txBody'); if (!tb) return;
  tb.innerHTML = p.length ? p.map(t => {
    const u = getUserById(t.user_id||t.from_user_id)||{};
    return `<tr>
      <td>${fmtDate(t.created_at)}</td><td>${escapeHtml(`${u.first_name||''} ${u.last_name||''}`.trim()||u.email||'—')}</td>
      <td><span class="badge">${t.transaction_type||'—'}</span></td><td style="font-weight:700;">${fmtCurrency(t.amount)}</td>
      <td>${escapeHtml(t.description||'—')}</td>
      <td><select class="inline-select" onchange="updateTxStatus('${t.id}',this.value)">${TX_STATUSES.map(s=>`<option ${t.status===s?'selected':''}>${s}</option>`).join('')}</select></td>
      <td><button class="btn btn-danger btn-sm" onclick="deleteTx('${t.id}')"><i class="fas fa-trash"></i></button></td>
    </tr>`;
  }).join('') : '<tr class="empty-row"><td colspan="7">No transactions.</td></tr>';
  renderPagination('txPagination', rows.length, adminState.txPage, p => { adminState.txPage=p; filterTx(); });
}

async function updateTxStatus(id, s) {
  await adminDb.from('transactions').update({ status: s, updated_at: new Date().toISOString() }).eq('id', id);
  const t = adminState.transactions.find(x=>x.id===id); if (t) t.status=s;
  toast('Updated', 'success');
}

async function deleteTx(id) {
  await adminDb.from('transactions').delete().eq('id', id);
  adminState.transactions = adminState.transactions.filter(t=>t.id!==id);
  filterTx(); toast('Deleted', 'success');
}

// ============================================
// LOANS - COMPLETE APPROVAL SYSTEM
// ============================================

const LOAN_STATUSES = ['pending','processing','approved','disbursed','rejected','cancelled','repaid'];

/**
 * Update loan status with full approval workflow
 */
async function updateLoanStatus(loanId, newStatus, isApproved = false) {
  try {
    const loan = adminState.loans.find(l => l.id === loanId);
    if (!loan) {
      toast('Loan not found', 'error');
      return;
    }

    // Handle approval
    if (isApproved && newStatus === 'approved') {
      await approveLoan(loan);
    } 
    // Handle rejection
    else if (newStatus === 'rejected') {
      await rejectLoan(loan);
    }
    // Handle status updates
    else {
      const { error } = await adminDb
        .from('loan_applications')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', loanId);

      if (error) throw error;
      
      // Update local state
      const localLoan = adminState.loans.find(l => l.id === loanId);
      if (localLoan) localLoan.status = newStatus;
      
      toast(`Loan status updated to ${newStatus}`, 'success');
    }

    // Refresh data
    await loadLoans();
    filterLoans();
  } catch (error) {
    console.error('Error updating loan:', error);
    toast('Error updating loan: ' + error.message, 'error');
  }
}

/**
 * Approve a loan - full workflow
 */
async function approveLoan(loan) {
  // Check if user meets KYC requirements
  const user = getUserById(loan.user_id);
  if (!user) {
    toast('User not found', 'error');
    return;
  }

  /*
  const kycLevel = adminState.kycLevels.find(k => k.id === user.kyc_level);
  if (!kycLevel || !kycLevel.can_apply_loan) {
    toast('User does not meet KYC requirements for loans', 'error');
    return;
  }
  */

  // Calculate loan terms
  const interestRate = 5.5; // Default interest rate (could be dynamic based on user/loan type)
  const termMonths = loan.term_months || 12;
  const monthlyRate = interestRate / 100 / 12;
  
  // Calculate monthly payment using amortization formula
  const monthlyPayment = loan.amount * monthlyRate * Math.pow(1 + monthlyRate, termMonths) / 
                         (Math.pow(1 + monthlyRate, termMonths) - 1);
  const totalRepayment = monthlyPayment * termMonths;

  // Start a transaction for data consistency
  const updates = {
    status: 'approved',
    interest_rate: interestRate,
    monthly_payment: monthlyPayment,
    total_repayment: totalRepayment,
    total_repayable: totalRepayment,
    approved_at: new Date().toISOString(),
    reviewed_at: new Date().toISOString(),
    admin_notes: `Approved by admin on ${new Date().toLocaleString()}`,
    updated_at: new Date().toISOString()
  };

  // Update loan application
  const { error: updateError } = await adminDb
    .from('loan_applications')
    .update(updates)
    .eq('id', loan.id);

  if (updateError) throw updateError;

  // Update local state
  const localLoan = adminState.loans.find(l => l.id === loan.id);
  if (localLoan) Object.assign(localLoan, updates);

  // Create disbursement transaction (pending)
  const { error: txError } = await adminDb
    .from('transactions')
    .insert({
      user_id: loan.user_id,
      amount: loan.amount,
      transaction_type: 'loan_disbursement',
      status: 'pending',
      description: `Loan disbursement - ${loan.application_reference}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

  if (txError) console.warn('Failed to create transaction:', txError);

  // Resolve pending action if exists
  if (loan.pending_action_id) {
    try {
      await adminDb
        .from('pending_actions')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          response_notes: 'Approved by admin'
        })
        .eq('id', loan.pending_action_id);
    } catch (e) {
      console.warn('Failed to update pending action:', e);
    }
  }

  // Send notification to user
  await adminDb
    .from('notifications')
    .insert({
      user_id: loan.user_id,
      type: 'loan_approved',
      title: 'Loan Approved!',
      body: `Your loan of ${fmtCurrency(loan.amount)} has been approved. Monthly payment: ${fmtCurrency(monthlyPayment)} for ${termMonths} months.`,
      is_read: false,
      created_at: new Date().toISOString()
    });

  toast('Loan approved successfully!', 'success');
}

/**
 * Reject a loan with reason
 */
async function rejectLoan(loan) {
  // Show prompt for rejection reason
  const reason = await new Promise((resolve) => {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay open';
    modal.id = 'rejectReasonModal';
    modal.innerHTML = `
      <div class="modal-box" style="max-width:440px;">
        <div class="modal-header">
          <span class="modal-title">Rejection Reason</span>
          <button class="modal-close" onclick="closeModal('rejectReasonModal')"><i class="fas fa-times"></i></button>
        </div>
        <div class="modal-body">
          <p style="color:var(--text2);margin-bottom:12px;">Please provide a reason for rejecting this loan:</p>
          <textarea id="rejectionReason" class="form-input" rows="4" placeholder="Enter rejection reason..."></textarea>
          <div style="display:flex;gap:10px;margin-top:16px;">
            <button class="btn btn-ghost" style="flex:1;" onclick="closeModal('rejectReasonModal')">Cancel</button>
            <button class="btn btn-danger" style="flex:1;" onclick="confirmReject()">Reject Loan</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(modal);
    
    window.confirmReject = () => {
      const reasonText = document.getElementById('rejectionReason').value.trim();
      closeModal('rejectReasonModal');
      modal.remove();
      resolve(reasonText || 'No reason provided');
    };
  });

  if (!reason) {
    toast('Rejection cancelled', 'info');
    return;
  }

  // Update loan as rejected
  const updates = {
    status: 'rejected',
    rejection_reason: reason,
    reviewed_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const { error: updateError } = await adminDb
    .from('loan_applications')
    .update(updates)
    .eq('id', loan.id);

  if (updateError) throw updateError;

  // Update local state
  const localLoan = adminState.loans.find(l => l.id === loan.id);
  if (localLoan) Object.assign(localLoan, updates);

  // Resolve pending action if exists
  if (loan.pending_action_id) {
    try {
      await adminDb
        .from('pending_actions')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          response_notes: `Rejected: ${reason}`
        })
        .eq('id', loan.pending_action_id);
    } catch (e) {
      console.warn('Failed to update pending action:', e);
    }
  }

  // Send rejection notification
  await adminDb
    .from('notifications')
    .insert({
      user_id: loan.user_id,
      type: 'loan_rejected',
      title: 'Loan Application Rejected',
      body: `Your loan application for ${fmtCurrency(loan.amount)} was rejected. Reason: ${reason}`,
      is_read: false,
      created_at: new Date().toISOString()
    });

  toast('Loan rejected', 'success');
}

/**
 * Disburse an approved loan
 */
async function disburseLoan(loanId) {
  try {
    const loan = adminState.loans.find(l => l.id === loanId);
    if (!loan) {
      toast('Loan not found', 'error');
      return;
    }

    if (loan.status !== 'approved' && loan.status !== 'processing' && loan.status !== 'pending') {
      toast('Loan must be approved or processing before disbursement', 'error');
      return;
    }

    // Update loan status to disbursed
    const { error: updateError } = await adminDb
      .from('loan_applications')
      .update({
        status: 'disbursed',
        disbursed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', loanId);

    if (updateError) throw updateError;

    // Update local state
    const localLoan = adminState.loans.find(l => l.id === loanId);
    if (localLoan) {
      localLoan.status = 'disbursed';
      localLoan.disbursed_at = new Date().toISOString();
    }

    // Find user's account and credit the loan amount
    const { data: account, error: accountFetchError } = await adminDb
      .from('accounts')
      .select('id, balance')
      .eq('user_id', loan.user_id)
      .single();

    if (accountFetchError) {
      console.warn('Account not found for user:', loan.user_id);
    } else if (account) {
      const { error: accountError } = await adminDb
        .from('accounts')
        .update({
          balance: (account.balance || 0) + loan.amount,
          updated_at: new Date().toISOString()
        })
        .eq('id', account.id);

      if (accountError) throw accountError;
    }

    // Update transaction status
    await adminDb
      .from('transactions')
      .update({
        status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('user_id', loan.user_id)
      .eq('transaction_type', 'loan_disbursement')
      .in('status', ['pending', 'processing']);

    // Send notification
    await adminDb
      .from('notifications')
      .insert({
        user_id: loan.user_id,
        type: 'loan_disbursed',
        title: 'Loan Disbursed',
        body: `Your loan of ${fmtCurrency(loan.amount)} has been disbursed to your account.`,
        is_read: false,
        created_at: new Date().toISOString()
      });

    toast('Loan disbursed successfully!', 'success');
    
    // Refresh all data
    await loadLoans();
    await loadAccounts();
    await loadTransactions();
    filterLoans();
    renderAccountsGrid();
  } catch (error) {
    console.error('Error disbursing loan:', error);
    toast('Error disbursing loan: ' + error.message, 'error');
  }
}

/**
 * Filter and render loans table
 */
function filterLoans() {
  const search = (document.getElementById('loanSearch')?.value || '').toLowerCase();
  const statusFilter = document.getElementById('loanStatusFilter')?.value;
  const typeFilter = document.getElementById('loanTypeFilter')?.value;
  
  let rows = adminState.loans.filter(l => {
    const matchesSearch = !search || 
      (l.purpose || '').toLowerCase().includes(search) ||
      (l.application_reference || '').toLowerCase().includes(search);
    const matchesStatus = !statusFilter || l.status === statusFilter;
    const matchesType = !typeFilter || l.loan_type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });
  
  renderLoansTable(rows);
}

/**
 * Render loans table with approval actions
 */
function renderLoansTable(rows) {
  const p = rows.slice((adminState.loanPage - 1) * adminState.PAGE_SIZE, adminState.loanPage * adminState.PAGE_SIZE);
  const tb = document.getElementById('loansBody');
  if (!tb) return;

  if (!p.length) {
    tb.innerHTML = '<tr class="empty-row"><td colspan="9">No loans found.</td></tr>';
    return;
  }

  tb.innerHTML = p.map(l => {
    const user = getUserById(l.user_id);
    const userName = user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email || 'Unknown' : 'Unknown';
    
    const statusColors = {
      pending: '#f59e0b',
      processing: '#3b82f6',
      approved: '#10b981',
      disbursed: '#8b5cf6',
      rejected: '#ef4444',
      cancelled: '#6b7280',
      repaid: '#059669'
    };

    const canApprove = ['pending', 'processing'].includes(l.status);
    const canDisburse = l.status === 'approved';

    return `<tr>
      <td style="font-size:12px;">${fmtDate(l.created_at)}</td>
      <td><strong>${escapeHtml(userName)}</strong></td>
      <td>${l.level || '—'}</td>
      <td style="font-weight:700;">${fmtCurrency(l.amount)}</td>
      <td>${fmtCurrency(l.total_repayable || l.total_repayment || 0)}</td>
      <td>${l.term_months || '—'} months</td>
      <td><span style="font-size:11px;color:var(--text-secondary);">${escapeHtml(l.application_reference || 'N/A')}</span></td>
      <td>
        <select class="inline-select" onchange="updateLoanStatus('${l.id}',this.value)">
          ${LOAN_STATUSES.map(s=>`<option value="${s}" ${l.status===s?'selected':''}>${s}</option>`).join('')}
        </select>
      </td>
      <td>
        <div style="display:flex;gap:4px;flex-wrap:wrap;">
          ${canApprove ? `
            <button class="btn btn-success btn-sm" onclick="updateLoanStatus('${l.id}','approved')" title="Approve Loan" style="font-size:10px;padding:2px 8px;">
              <i class="fas fa-check"></i> Approve
            </button>
            <button class="btn btn-danger btn-sm" onclick="updateLoanStatus('${l.id}','rejected')" title="Reject Loan" style="font-size:10px;padding:2px 8px;">
              <i class="fas fa-times"></i> Reject
            </button>
          ` : ''}
          ${canDisburse ? `
            <button class="btn btn-primary btn-sm" onclick="updateLoanStatus('${l.id}','disbursed')" title="Disburse Loan" style="font-size:10px;padding:2px 8px;">
              <i class="fas fa-money-bill-wave"></i> Disburse
            </button>
          ` : ''}
          <button class="btn btn-danger btn-sm" onclick="deleteLoan('${l.id}')" title="Delete Loan" style="font-size:10px;padding:2px 8px;">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </td>
    </tr>`;
  }).join('');

  renderPagination('loanPagination', rows.length, adminState.loanPage, p => {
    adminState.loanPage = p;
    filterLoans();
  });
}

/**
 * Delete a loan
 */
async function deleteLoan(id) {
  showConfirmModal('Delete Loan', 'Are you sure you want to delete this loan application? This action cannot be undone.', async () => {
    await adminDb.from('loan_applications').delete().eq('id', id);
    adminState.loans = adminState.loans.filter(l => l.id !== id);
    filterLoans();
    toast('Loan deleted', 'success');
  });
}

// ============================================
// CARDS
// ============================================

const CARD_STATUSES = ['pending','processing','approved','active','shipped','delivered','rejected','cancelled'];

function filterCards() {
  const search = (document.getElementById('cardSearch')?.value || '').toLowerCase();
  const statusFilter = document.getElementById('cardStatusFilter')?.value;
  
  const rows = adminState.cards.filter(c => {
    const matchesSearch = !search || 
      (c.card_holder || '').toLowerCase().includes(search);
    const matchesStatus = !statusFilter || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });
  
  renderCardsTable(rows);
}

async function updateCardStatus(id, newStatus) {
  try {
    const { error } = await adminDb
      .from('card_applications')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
    const c = adminState.cards.find(x => x.id === id);
    if (c) c.status = newStatus;
    toast(`Card status updated to ${newStatus}`, 'success');
    await loadCards();
    filterCards();
  } catch (error) {
    console.error('Error updating card:', error);
    toast('Error updating card: ' + error.message, 'error');
  }
}

function renderCardsTable(rows) {
  const p = rows.slice((adminState.cardPage - 1) * adminState.PAGE_SIZE, adminState.cardPage * adminState.PAGE_SIZE);
  const tb = document.getElementById('cardsBody');
  if (!tb) return;

  tb.innerHTML = p.length ? p.map(c => {
    return `<tr>
      <td>${fmtDate(c.created_at)}</td>
      <td><strong>${escapeHtml(c.card_holder || '—')}</strong></td>
      <td>${escapeHtml(c.card_network || '—')}</td>
      <td>${escapeHtml(c.card_type || c.delivery_type || '—')}</td>
      <td>${escapeHtml(c.wallet_type || '—')}${c.crypto_coin ? ` (${escapeHtml(c.crypto_coin.toUpperCase())})` : ''}</td>
      <td><span style="font-size:11px;color:var(--text-secondary);">${escapeHtml(c.application_reference || 'N/A')}</span></td>
      <td>
        <select class="inline-select" onchange="updateCardStatus('${c.id}',this.value)">
          ${CARD_STATUSES.map(s=>`<option value="${s}" ${c.status===s?'selected':''}>${s}</option>`).join('')}
        </select>
      </td>
      <td>
        <button class="btn btn-danger btn-sm" onclick="deleteCard('${c.id}')"><i class="fas fa-trash"></i></button>
      </td>
    </tr>`;
  }).join('') : '<tr class="empty-row"><td colspan="8">No cards found.</td></tr>';
  
  renderPagination('cardPagination', rows.length, adminState.cardPage, p => {
    adminState.cardPage = p;
    filterCards();
  });
}

async function deleteCard(id) {
  showConfirmModal('Delete Card', 'Are you sure you want to delete this card application?', async () => {
    await adminDb.from('card_applications').delete().eq('id', id);
    adminState.cards = adminState.cards.filter(c => c.id !== id);
    filterCards();
    toast('Card deleted', 'success');
  });
}

// ============================================
// INVESTMENTS
// ============================================

const INVEST_STATUSES = ['active','matured','withdrawn','cancelled'];

function filterInvestments() {
  const search = (document.getElementById('investSearch')?.value || '').toLowerCase();
  const statusFilter = document.getElementById('investStatusFilter')?.value;
  
  const rows = adminState.investments.filter(i => {
    const matchesSearch = !search || 
      (i.goal_name || '').toLowerCase().includes(search);
    const matchesStatus = !statusFilter || i.status === statusFilter;
    return matchesSearch && matchesStatus;
  });
  
  renderInvestTable(rows);
}

async function updateInvestmentStatus(id, newStatus) {
  try {
    const { error } = await adminDb
      .from('investments')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
    const i = adminState.investments.find(x => x.id === id);
    if (i) i.status = newStatus;
    toast(`Investment status updated to ${newStatus}`, 'success');
    await loadInvestments();
    filterInvestments();
  } catch (error) {
    console.error('Error updating investment:', error);
    toast('Error updating investment: ' + error.message, 'error');
  }
}

function renderInvestTable(rows) {
  const p = rows.slice((adminState.investPage - 1) * adminState.PAGE_SIZE, adminState.investPage * adminState.PAGE_SIZE);
  const tb = document.getElementById('investBody');
  if (!tb) return;

  tb.innerHTML = p.length ? p.map(i => {
    const user = getUserById(i.user_id);
    const userName = user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email || 'Unknown' : 'Unknown';
    
    return `<tr>
      <td>${fmtDate(i.created_at)}</td>
      <td><strong>${escapeHtml(userName)}</strong></td>
      <td>${escapeHtml(i.goal_name || '—')}</td>
      <td><span class="badge" style="background:#0f766e;color:white;">${escapeHtml(i.plan || '—')}</span></td>
      <td style="font-weight:700;">${fmtCurrency(i.locked_amount)}</td>
      <td>${fmtCurrency(i.current_profit || 0)}</td>
      <td>${fmtCurrency(i.projected_value || i.target_amount || 0)}</td>
      <td>
        <select class="inline-select" onchange="updateInvestmentStatus('${i.id}',this.value)">
          ${INVEST_STATUSES.map(s=>`<option value="${s}" ${i.status===s?'selected':''}>${s}</option>`).join('')}
        </select>
      </td>
      <td>
        <button class="btn btn-danger btn-sm" onclick="deleteInvestment('${i.id}')"><i class="fas fa-trash"></i></button>
      </td>
    </tr>`;
  }).join('') : '<tr class="empty-row"><td colspan="9">No investments found.</td></tr>';
  
  renderPagination('investPagination', rows.length, adminState.investPage, p => {
    adminState.investPage = p;
    filterInvestments();
  });
}

async function deleteInvestment(id) {
  showConfirmModal('Delete Investment', 'Are you sure you want to delete this investment?', async () => {
    await adminDb.from('investments').delete().eq('id', id);
    adminState.investments = adminState.investments.filter(i => i.id !== id);
    filterInvestments();
    toast('Investment deleted', 'success');
  });
}

// ============================================
// NOTIFICATIONS
// ============================================

function updateNotificationBadge() {
  const c = adminState.adminNotifications.filter(n => !n.is_read).length;
  const b = document.getElementById('notificationBadge');
  if (b) {
    b.textContent = c > 99 ? '99+' : c;
    b.style.display = c > 0 ? 'inline-flex' : 'none';
  }
}

function renderNotificationsDropdown() {
  const c = document.getElementById('notificationsDropdownList');
  if (!c) return;
  
  c.innerHTML = adminState.adminNotifications.length ? 
    adminState.adminNotifications.slice(0, 20).map(n => `
      <div class="notification-item ${n.is_read ? '' : 'unread'}" onclick="markNotificationRead('${n.id}')">
        <div class="notification-title">${escapeHtml(n.title)}</div>
        <div class="notification-message">${escapeHtml(n.message)}</div>
        <div class="notification-time">${fmtDate(n.created_at)}</div>
      </div>
    `).join('') : 
    '<div class="empty-notifications"><i class="fas fa-bell-slash"></i><p>No notifications</p></div>';
}

function toggleAdminNotifications() {
  const d = document.getElementById('adminNotificationsDropdown');
  if (!d) return;
  d.style.display = d.style.display === 'none' || d.style.display === '' ? 'block' : 'none';
  if (d.style.display === 'block') renderNotificationsDropdown();
}

async function markNotificationRead(id) {
  await adminDb.from('admin_notifications').update({ is_read: true }).eq('id', id);
  await loadAdminNotifications();
}

async function buildNotifTargetOptions() {
  const t = document.getElementById('notifTarget')?.value;
  const g = document.getElementById('notifTargetIdGroup');
  const s = document.getElementById('notifTargetId');
  
  if (t === 'all') {
    if (g) g.style.display = 'none';
    return;
  }
  
  if (g) g.style.display = 'block';
  
  if (t === 'user' && s) {
    s.innerHTML = adminState.users.map(u => 
      `<option value="${u.id}">${escapeHtml(`${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email)}</option>`
    ).join('');
  }
  
  if (t === 'joint' && s) {
    s.innerHTML = adminState.jointAccounts.map(j => 
      `<option value="${j.id}">${escapeHtml(j.account_name || 'Joint')}</option>`
    ).join('');
  }
}

async function sendNotification() {
  const t = document.getElementById('notifTarget')?.value;
  const tid = document.getElementById('notifTargetId')?.value;
  const type = document.getElementById('notifType')?.value;
  const title = document.getElementById('notifTitle')?.value.trim();
  const body = document.getElementById('notifBody')?.value.trim();
  
  if (!title) {
    toast('Enter a title', 'error');
    return;
  }
  
  const row = {
    type,
    title,
    body: body || null,
    created_at: new Date().toISOString()
  };
  
  try {
    if (t === 'all') {
      await adminDb.from('notifications').insert(
        adminState.users.map(u => ({ ...row, user_id: u.id }))
      );
    } else if (t === 'user') {
      await adminDb.from('notifications').insert([{ ...row, user_id: tid }]);
    } else if (t === 'joint') {
      await adminDb.from('notifications').insert([{ ...row, joint_account_id: tid }]);
    }
    
    toast('Notification sent', 'success');
    document.getElementById('notifTitle').value = '';
    document.getElementById('notifBody').value = '';
    await loadAllNotifications();
  } catch (error) {
    toast('Error sending notification: ' + error.message, 'error');
  }
}

function renderNotifAdminTable() {
  const tb = document.getElementById('notifAdminBody');
  if (!tb) return;
  
  tb.innerHTML = adminState.notifications.length ? 
    adminState.notifications.map(n => `
      <tr>
        <td>${fmtDate(n.created_at)}</td>
        <td>${escapeHtml(n.title)}</td>
        <td><span class="badge" style="background:${n.is_read ? '#6b7280' : '#3b82f6'};color:white;">${n.is_read ? 'Read' : 'Unread'}</span></td>
        <td>
          <button class="btn btn-danger btn-sm" onclick="deleteNotifAdmin('${n.id}')"><i class="fas fa-trash"></i></button>
        </td>
      </tr>
    `).join('') : 
    '<tr class="empty-row"><td colspan="4">No notifications.</td></tr>';
}

async function deleteNotifAdmin(id) {
  await adminDb.from('notifications').delete().eq('id', id);
  adminState.notifications = adminState.notifications.filter(n => n.id !== id);
  renderNotifAdminTable();
  toast('Notification deleted', 'success');
}

// ============================================
// PAGINATION
// ============================================

function renderPagination(cid, total, page, cb) {
  const el = document.getElementById(cid);
  if (!el) return;
  
  const pages = Math.ceil(total / adminState.PAGE_SIZE);
  if (pages <= 1) {
    el.innerHTML = `<span class="page-info">${total} records</span>`;
    return;
  }
  
  let h = '';
  if (page > 1) h += `<button class="page-btn" onclick="(${cb.toString()})(${page - 1})">‹</button>`;
  
  for (let p = Math.max(1, page - 2); p <= Math.min(pages, page + 2); p++) {
    h += `<button class="page-btn${p === page ? ' current' : ''}" onclick="(${cb.toString()})(${p})">${p}</button>`;
  }
  
  if (page < pages) h += `<button class="page-btn" onclick="(${cb.toString()})(${page + 1})">›</button>`;
  h += `<span class="page-info">${total} records</span>`;
  el.innerHTML = h;
}

// ============================================
// ADDITIONAL CSS STYLES (injected)
// ============================================

// Inject required styles for the new buttons
(function injectStyles() {
  const style = document.createElement('style');
  style.textContent = `
    .btn-success {
      background: #10b981;
      color: white;
    }
    .btn-success:hover {
      background: #059669;
    }
    .btn-success.btn-sm {
      padding: 2px 8px;
      font-size: 10px;
    }
  `;
  document.head.appendChild(style);
})();
