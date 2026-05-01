// ============================================
// BLUVAULT DASHBOARD - COMPLETE (CRYPTO FIXED)
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
        // CHANGE THIS LINE - use your custom session instead of Supabase
        const session = await Auth.validateSession();
        
        if (!session) {
            console.log('No session found');
            const errorHtml = `
                <div style="position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); 
                            background:#dc2626; color:white; padding:30px; border-radius:12px; 
                            z-index:99999; text-align:center;">
                    <h2>❌ No Session Found</h2>
                    <p style="margin:15px 0;">Please login first</p>
                    <button onclick="window.location.href='/auth.html'" 
                            style="margin-top:15px; padding:10px 20px; background:white; color:#dc2626; 
                                   border:none; border-radius:6px; cursor:pointer;">
                        Go to Login
                    </button>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', errorHtml);
            return;
        }
        
        // Get user data from the session (CHANGE THIS)
        const userData = session.users;
        
        currentUser = {
            id: session.user_id,  // CHANGE - use session.user_id
            email: userData?.email || '',
            first_name: userData?.first_name || 'User',
            last_name: userData?.last_name || '',
            account_type: userData?.account_type || 'individual',
            transaction_pin_hash: userData?.transaction_pin_hash || null,
            joint_account_id: userData?.joint_account_id || null,
            kyc_level: userData?.kyc_level || 1,
            profile_picture_url: userData?.profile_picture_url || null,
            recovery_phrase_hash: userData?.recovery_phrase_hash || null,
            password_hash: userData?.password_hash || null
        };

        updateUserInterface();  // This now exists
        setupEventListeners();
        
        if (!currentUser.transaction_pin_hash) {
            showPinSetupModal();
        }
        
        await loadDashboardData();
        handleAccountSpecificUI();
        
    } catch (err) {
        console.error('Dashboard init error:', err);
        showToast('Error loading dashboard: ' + err.message, 'error');
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
    await Auth.logout();  // Make sure this is Auth.logout, not something else
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
    const toggle = document.getElementById('mobileMenuToggle');
    const overlay = document.getElementById('mobileMenuOverlay');
    const close = document.getElementById('mobileMenuClose');

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


// Add this function anywhere after currentUser is defined
function updateUserInterface() {
    // Update display name in welcome header
    const displayName = document.getElementById('displayName');
    if (displayName) {
        displayName.textContent = `${currentUser.first_name} ${currentUser.last_name}`.trim() || currentUser.email;
    }
    
    // Update user name in navigation
    const userName = document.getElementById('userName');
    if (userName) {
        userName.textContent = currentUser.first_name || 'User';
    }
    
    // Update dropdown user info
    const dropUserName = document.getElementById('dropUserName');
    if (dropUserName) {
        dropUserName.textContent = `${currentUser.first_name} ${currentUser.last_name}`.trim() || currentUser.email;
    }
    
    const dropUserEmail = document.getElementById('dropUserEmail');
    if (dropUserEmail) {
        dropUserEmail.textContent = currentUser.email || '';
    }
    
    // Update account type display
    const accountTypeDisplay = document.getElementById('accountTypeDisplay');
    if (accountTypeDisplay) {
        const type = currentUser.account_type === 'joint' ? 'Joint Account' : 'Personal Account';
        accountTypeDisplay.textContent = type;
    }
    
    // Update avatar in navigation
    const navAvatar = document.getElementById('navAvatar');
    if (navAvatar) {
        if (currentUser.profile_picture_url) {
            navAvatar.innerHTML = `<img src="${currentUser.profile_picture_url}" 
                style="width:28px;height:28px;border-radius:50%;object-fit:cover;display:block;">`;
        } else {
            const initials = `${currentUser.first_name?.[0] || ''}${currentUser.last_name?.[0] || ''}`.toUpperCase();
            navAvatar.innerHTML = `<span style="font-size:1rem;font-weight:600;">${initials || 'U'}</span>`;
        }
    }
}

// ============================================
// PIN SETUP MODAL
// ============================================

function showPinSetupModal() {
    document.getElementById('pinModal')?.classList.add('active');
}

async function handlePinSetupSubmit(e) {
    e.preventDefault();

    const pin = document.getElementById('pin').value;
    const confirm = document.getElementById('pinConfirm').value;

    if (!/^\d{4}$/.test(pin)) { showToast('PIN must be 4 digits', 'error'); return; }
    if (pin !== confirm) { showToast('PINs do not match', 'error'); return; }

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
// PIN VERIFICATION HELPER
// ============================================

function requestPin(promptMessage) {
    return new Promise((resolve) => {
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

        const msgEl = document.getElementById('pinVerifyMsg');
        const input = document.getElementById('pinVerifyInput');
        const btn = document.getElementById('pinVerifyBtn');
        const errEl = document.getElementById('pinVerifyError');
        const closeBtn = document.getElementById('pinVerifyClose');

        msgEl.textContent = promptMessage || 'Enter your transaction PIN to continue.';
        input.value = '';
        errEl.textContent = '';
        modal.classList.add('active');
        setTimeout(() => input.focus(), 100);

        const cleanup = () => {
            modal.classList.remove('active');
            btn.replaceWith(btn.cloneNode(true));
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
        loadCryptoWallets(),
        loadPendingActions(),
        loadRecentTransactions(),
        loadCards(),
        loadLoans(),
        loadInvestments()
    ]);
    if (window.TxPage && typeof window.TxPage.load === 'function') {
        window.TxPage.load();
    }
}

async function loadBalance() {
    try {
        let query = db.from('accounts')
            .select('balance, gas_balance, account_number, status, btc_balance, ltc_balance')
            .eq('status', 'active');

        if (currentUser.account_type === 'joint' && currentUser.joint_account_id) {
            query = query.eq('joint_account_id', currentUser.joint_account_id);
        } else {
            query = query.eq('user_id', currentUser.id).limit(1);
        }

        const { data, error } = await query;
        if (error) { console.error('Balance query error:', error); return; }

        if (!data || data.length === 0) {
            await createUserAccount();
            return;
        }

        // For joint accounts, sum all balances and gas balances
        let totalBalance = 0;
        let totalGasBalance = 0;

        data.forEach(account => {
            totalBalance += parseFloat(account.balance || 0);
            totalGasBalance += parseFloat(account.gas_balance || 0);
        });

        const el = document.getElementById('balance');
        if (el) el.textContent = formatCurrency(totalBalance);
        const gasEl = document.getElementById('gasBalance');
        if (gasEl) gasEl.textContent = formatCurrency(totalGasBalance);
    } catch (err) {
        console.error('loadBalance error:', err);
    }
}

async function loadCryptoWallets() {
    try {
        let query = db.from('accounts')
            .select('btc_address, ltc_address, btc_balance, ltc_balance, gas_wallet_address, gas_wallet_network, gas_balance, user_id, joint_account_id')
            .eq('status', 'active');

        if (currentUser.joint_account_id) {
            query = query.eq('joint_account_id', currentUser.joint_account_id);
        } else {
            query = query.eq('user_id', currentUser.id);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Crypto wallets error:', error);
            return;
        }

        if (!data || data.length === 0) {
            console.log('No accounts found');
            return;
        }

        console.log('All accounts for crypto:', data);  // DEBUG

        // For any account type, consolidate wallets from all accounts
        // Find each type of wallet from any account that has it
        const btcAccount = data.find(acc => acc.btc_address && acc.btc_address.trim() !== '');
        const ltcAccount = data.find(acc => acc.ltc_address && acc.ltc_address.trim() !== '');
        const gasAccount = data.find(acc => acc.gas_wallet_address && acc.gas_wallet_address.trim() !== '');
        
        console.log('Consolidated wallets - BTC:', btcAccount ? 'found' : 'not found', '| LTC:', ltcAccount ? 'found' : 'not found', '| Gas:', gasAccount ? 'found' : 'not found');  // DEBUG

        const btcDiv = document.getElementById('btcWalletCard');
        if (btcDiv) {
            if (btcAccount && btcAccount.btc_address && btcAccount.btc_address.trim() !== '') {
                btcDiv.innerHTML = `
                    <div class="wallet-header"><i class="fab fa-bitcoin" style="color:#f7931a;"></i> Bitcoin (BTC)</div>
                    <div class="wallet-address" style="font-family:monospace;font-size:0.75rem;word-break:break-all;background:var(--bg-tertiary);padding:8px;border-radius:8px;margin:8px 0;">${btcAccount.btc_address}</div>
                    <div class="wallet-balance" style="font-weight:700;margin:8px 0;">${parseFloat(btcAccount.btc_balance || 0).toFixed(8)} BTC</div>
                    <button class="btn btn-sm btn-outline" onclick="copyToClipboard('${btcAccount.btc_address}')" style="width:100%;">Copy Address</button>
                `;
            } else {
                btcDiv.innerHTML = `
                    <div class="wallet-header"><i class="fab fa-bitcoin" style="color:#f7931a;"></i> Bitcoin (BTC)</div>
                    <div class="wallet-empty" style="color:var(--text-secondary);padding:12px;text-align:center;">No BTC wallet yet</div>
                    <button class="btn btn-sm btn-outline" onclick="generateCryptoWallet('btc')" style="width:100%;">Generate BTC Wallet</button>
                `;
            }
        }

        const ltcDiv = document.getElementById('ltcWalletCard');
        if (ltcDiv) {
            if (ltcAccount && ltcAccount.ltc_address && ltcAccount.ltc_address.trim() !== '') {
                ltcDiv.innerHTML = `
                    <div class="wallet-header"><i class="fas fa-coins" style="color:#345d9d;"></i> Litecoin (LTC)</div>
                    <div class="wallet-address" style="font-family:monospace;font-size:0.75rem;word-break:break-all;background:var(--bg-tertiary);padding:8px;border-radius:8px;margin:8px 0;">${ltcAccount.ltc_address}</div>
                    <div class="wallet-balance" style="font-weight:700;margin:8px 0;">${parseFloat(ltcAccount.ltc_balance || 0).toFixed(8)} LTC</div>
                    <button class="btn btn-sm btn-outline" onclick="copyToClipboard('${ltcAccount.ltc_address}')" style="width:100%;">Copy Address</button>
                `;
            } else {
                ltcDiv.innerHTML = `
                    <div class="wallet-header"><i class="fas fa-coins" style="color:#345d9d;"></i> Litecoin (LTC)</div>
                    <div class="wallet-empty" style="color:var(--text-secondary);padding:12px;text-align:center;">No LTC wallet yet</div>
                    <button class="btn btn-sm btn-outline" onclick="generateCryptoWallet('ltc')" style="width:100%;">Generate LTC Wallet</button>
                `;
            }
        }

        const gasDiv = document.getElementById('gasWalletCard');
        if (gasDiv) {
            if (gasAccount && gasAccount.gas_wallet_address && gasAccount.gas_wallet_address.trim() !== '') {
                gasDiv.innerHTML = `
                    <div class="wallet-header"><i class="fas fa-gas-pump" style="color:#10b981;"></i> Gas Wallet (${gasAccount.gas_wallet_network || 'TRC20'})</div>
                    <div class="wallet-address" style="font-family:monospace;font-size:0.75rem;word-break:break-all;background:var(--bg-tertiary);padding:8px;border-radius:8px;margin:8px 0;">${gasAccount.gas_wallet_address}</div>
                    <div class="wallet-balance" style="font-weight:700;margin:8px 0;">${formatCurrency(gasAccount.gas_balance || 0)}</div>
                    <button class="btn btn-sm btn-outline" onclick="copyToClipboard('${gasAccount.gas_wallet_address}')" style="width:100%;">Copy Address</button>
                `;
            } else {
                gasDiv.innerHTML = `
                    <div class="wallet-header"><i class="fas fa-gas-pump" style="color:#10b981;"></i> Gas Wallet</div>
                    <div class="wallet-empty" style="color:var(--text-secondary);padding:12px;text-align:center;">No Gas wallet yet</div>
                    <button class="btn btn-sm btn-outline" onclick="generateCryptoWallet('gas')" style="width:100%;">Generate Gas Wallet</button>
                `;
            }
        }

    } catch (err) {
        console.error('loadCryptoWallets error:', err);
    }
}

// ============================================
// RECEIVE MODAL - FULLY FIXED CRYPTO TAB
// ============================================

window.showReceiveModal = async function() {
    let modal = document.getElementById('receiveModal');
    
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'receiveModal';
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal" style="max-width: 500px;">
                <div class="modal-header">
                    <h3>Receive Money</h3>
                    <button class="modal-close" onclick="hideModal('receiveModal')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div style="display:flex; gap:10px; margin-bottom:20px; border-bottom:1px solid var(--border);">
                        <button id="receiveUsdTabBtn" style="flex:1; padding:10px; background:none; border:none; cursor:pointer; font-weight:600;">USD</button>
                        <button id="receiveCryptoTabBtn" style="flex:1; padding:10px; background:none; border:none; cursor:pointer; font-weight:600;">Crypto</button>
                    </div>
                    <div id="receiveUsdPanel" style="display:block;">
                        <div class="alert alert-info" style="margin-bottom:16px;">
                            <i class="fas fa-info-circle"></i>
                            <span>Share your USD wallet information to receive money.</span>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Your Account Number</label>
                            <div style="display:flex; gap:10px;">
                                <input type="text" id="receiveAccountNumber" class="form-input" readonly style="flex:1;">
                                <button class="btn btn-outline" onclick="copyToClipboard(document.getElementById('receiveAccountNumber').value)">Copy</button>
                            </div>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Your Email</label>
                            <div style="display:flex; gap:10px;">
                                <input type="text" id="receiveEmail" class="form-input" readonly style="flex:1;">
                                <button class="btn btn-outline" onclick="copyToClipboard(document.getElementById('receiveEmail').value)">Copy</button>
                            </div>
                        </div>
                    </div>
                    <div id="receiveCryptoPanel" style="display:none;">
                        <div id="receiveCryptoContainer" style="text-align:center; padding:20px;">
                            <i class="fas fa-spinner fa-spin"></i> Loading crypto wallets...
                        </div>
                    </div>
                </div>
            </div>`;
        document.body.appendChild(modal);
        
        document.getElementById('receiveUsdTabBtn').addEventListener('click', () => {
            document.getElementById('receiveUsdPanel').style.display = 'block';
            document.getElementById('receiveCryptoPanel').style.display = 'none';
        });
        document.getElementById('receiveCryptoTabBtn').addEventListener('click', () => {
            document.getElementById('receiveUsdPanel').style.display = 'none';
            document.getElementById('receiveCryptoPanel').style.display = 'block';
            loadReceiveCryptoWallets();
        });
    }


let accountQuery = db.from('accounts')
    .select('account_number')
    .eq('status', 'active');

if (currentUser.joint_account_id) {
    accountQuery = accountQuery.eq('joint_account_id', currentUser.joint_account_id);
} else {
    accountQuery = accountQuery.eq('user_id', currentUser.id);
}

const { data: accountData } = await accountQuery;
const account = accountData?.[0];


    document.getElementById('receiveAccountNumber').value = account?.account_number || 'No account found';
    document.getElementById('receiveEmail').value = currentUser.email || '';

    modal.classList.add('active');
    // Pre-load crypto wallets (in case the Crypto tab is clicked later)
    await loadReceiveCryptoWallets();
};

async function loadReceiveCryptoWallets() {
    const container = document.getElementById('receiveCryptoContainer');
    if (!container) return;
    
    try {
        let query = db.from('accounts')
            .select('btc_address, ltc_address, gas_wallet_address, gas_wallet_network')
            .eq('status', 'active');

        if (currentUser.joint_account_id) {
            query = query.eq('joint_account_id', currentUser.joint_account_id);
        } else {
            query = query.eq('user_id', currentUser.id);
        }

        const { data, error } = await query;
        if (error) throw error;

        console.log('Raw accounts for crypto:', data);  // DEBUG

        // IMPORTANT: Find each wallet type from any account that has it (consolidate)
        const btcAccount = data?.find(acc => acc.btc_address && acc.btc_address.trim() !== '');
        const ltcAccount = data?.find(acc => acc.ltc_address && acc.ltc_address.trim() !== '');
        const gasAccount = data?.find(acc => acc.gas_wallet_address && acc.gas_wallet_address.trim() !== '');

        if (!btcAccount && !ltcAccount && !gasAccount) {
            console.warn('No account with crypto addresses found');
            container.innerHTML = `<div class="alert alert-warning" style="text-align:center;">
                <i class="fas fa-exclamation-triangle"></i>
                <p>No crypto wallets found. Please contact support to activate your crypto wallets.</p>
            </div>`;
            return;
        }

        console.log('Consolidated wallets - BTC:', btcAccount ? 'found' : 'not found', '| LTC:', ltcAccount ? 'found' : 'not found', '| Gas:', gasAccount ? 'found' : 'not found');  // DEBUG

        let html = '<div style="display:flex; flex-direction:column; gap:16px;">';
        
        if (btcAccount && btcAccount.btc_address && btcAccount.btc_address.trim() !== '') {
            html += `
                <div style="padding:12px; border:1px solid var(--border); border-radius:12px;">
                    <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
                        <i class="fab fa-bitcoin" style="color:#f7931a; font-size:1.2rem;"></i>
                        <strong>Bitcoin (BTC)</strong>
                    </div>
                    <div style="font-family:monospace; font-size:0.75rem; word-break:break-all; background:var(--bg-tertiary); padding:8px; border-radius:8px; margin:8px 0;">
                        ${btcAccount.btc_address}
                    </div>
                    <button class="btn btn-sm btn-outline" onclick="copyToClipboard('${btcAccount.btc_address}')" style="width:100%;">Copy BTC Address</button>
                </div>`;
        }
        
        if (ltcAccount && ltcAccount.ltc_address && ltcAccount.ltc_address.trim() !== '') {
            html += `
                <div style="padding:12px; border:1px solid var(--border); border-radius:12px;">
                    <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
                        <i class="fas fa-coins" style="color:#345d9d; font-size:1.2rem;"></i>
                        <strong>Litecoin (LTC)</strong>
                    </div>
                    <div style="font-family:monospace; font-size:0.75rem; word-break:break-all; background:var(--bg-tertiary); padding:8px; border-radius:8px; margin:8px 0;">
                        ${ltcAccount.ltc_address}
                    </div>
                    <button class="btn btn-sm btn-outline" onclick="copyToClipboard('${ltcAccount.ltc_address}')" style="width:100%;">Copy LTC Address</button>
                </div>`;
        }
        
        if (gasAccount && gasAccount.gas_wallet_address && gasAccount.gas_wallet_address.trim() !== '') {
            html += `
                <div style="padding:12px; border:1px solid var(--border); border-radius:12px;">
                    <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
                        <i class="fas fa-gas-pump" style="color:#10b981; font-size:1.2rem;"></i>
                        <strong>Gas Wallet (${gasAccount.gas_wallet_network || 'TRC20'})</strong>
                    </div>
                    <div style="font-family:monospace; font-size:0.75rem; word-break:break-all; background:var(--bg-tertiary); padding:8px; border-radius:8px; margin:8px 0;">
                        ${gasAccount.gas_wallet_address}
                    </div>
                    <button class="btn btn-sm btn-outline" onclick="copyToClipboard('${gasAccount.gas_wallet_address}')" style="width:100%;">Copy Gas Address</button>
                </div>`;
        }
        
        html += '</div>';
        container.innerHTML = html;
        
    } catch (err) {
        console.error('loadReceiveCryptoWallets error:', err);
        container.innerHTML = '<div style="text-align:center; padding:20px; color:var(--error);">Error loading crypto wallets</div>';
    }
}

// ============================================
// COPY TO CLIPBOARD
// ============================================

window.copyToClipboard = function(text) {
    if (!text) { showToast('Nothing to copy', 'error'); return; }
    navigator.clipboard.writeText(text).then(() => {
        showToast('Address copied to clipboard!', 'success');
    }).catch(() => {
        showToast('Failed to copy address', 'error');
    });
};

window.generateCryptoWallet = async function(type) {
    showToast('Wallet generation feature coming soon. Please contact support.', 'info');
};

async function createUserAccount() {
    try {
        let checkQuery = db.from('accounts').select('id, balance');
        if (currentUser.account_type === 'joint' && currentUser.joint_account_id) {
            checkQuery = checkQuery.eq('joint_account_id', currentUser.joint_account_id);
        } else {
            checkQuery = checkQuery.eq('user_id', currentUser.id);
        }
        const { data: existing } = await checkQuery;
        if (existing && existing.length > 0) {
            var totalBalance = 0;
            existing.forEach(function(acc) { totalBalance += parseFloat(acc.balance || 0); });
            const el = document.getElementById('balance');
            if (el) el.textContent = formatCurrency(totalBalance);
            return existing[0];
        }

        const prefix = currentUser.account_type === 'joint' ? 'SMTJ' : 'SMT';
        const accountNumber = prefix + Date.now().toString().slice(-8) + Math.floor(Math.random() * 1000);
        const record = { account_number: accountNumber, balance: 0.00, currency: 'USD', status: 'active' };

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
// PENDING ACTIONS (kept as before)
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
        { table: 'card_applications', type: 'card', title: 'Card Application', icon: 'fa-credit-card',
          desc: r => `${r.card_type} ${r.card_network} Card` },
        { table: 'loan_applications', type: 'loan', title: 'Loan Application', icon: 'fa-hand-holding-usd',
          desc: r => `${formatCurrency(r.amount)} — ${r.purpose}` },
        { table: 'investments', type: 'investment', title: 'Investment Goal', icon: 'fa-chart-line',
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



async function sendAdminNotification(type, title, message, actionType, actionData) {
    try {
        const userDetails = {
            user_id: currentUser.id,
            user_name: `${currentUser.first_name || ''} ${currentUser.last_name || ''}`.trim(),
            user_email: currentUser.email,
            user_phone: currentUser.phone_number || 'N/A',
            account_type: currentUser.account_type,
            joint_account_id: currentUser.joint_account_id || null,
            timestamp: new Date().toISOString()
        };

        const fullActionData = {
            ...actionData,
            user_details: userDetails
        };

        const { error } = await db.from('admin_notifications').insert([{
            notification_type: type,
            title: title,
            message: message,
            action_type: actionType || null,
            action_data: fullActionData,
            user_id: currentUser.id,
            joint_account_id: currentUser.joint_account_id || null,
            is_read: false,
            created_at: new Date().toISOString()
        }]);
        
        if (error) {
            console.error('Admin notification error:', error);
        } else {
            console.log('Admin notification sent:', title);
        }
    } catch (err) {
        console.error('sendAdminNotification error:', err);
    }
}



// ============================================
// APPROVE / DECLINE JOINT ACTIONS (summary)
// ============================================

async function handleApproveAction(pendingActionId) {
    try {
        const { data: pendingAction, error: fetchErr } = await db
            .from('pending_actions').select('*').eq('id', pendingActionId).single();
        if (fetchErr) throw fetchErr;

        if (pendingAction.action_type === 'account_deletion') {
            const phraseOk = await requestPhraseForDeletion();
            if (!phraseOk) return;
        } else {
            const confirmed = await requestPin('Enter your PIN to approve this action.');
            if (!confirmed) return;
        }

        await executeApprovedAction(pendingAction);

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

async function requestPhraseForDeletion() {
    return new Promise(function(resolve) {
        let modal = document.getElementById('approvalPinModal');
        let body = modal ? modal.querySelector('.modal-body') : null;
        if (!body) { resolve(false); return; }

        let origHtml = body.innerHTML;
        let origTitle = modal.querySelector('h3') ? modal.querySelector('h3').textContent : '';

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

        document.getElementById('approvalPhraseCancel').onclick = function() {
            modal.classList.remove('active');
            body.innerHTML = origHtml;
            if (modal.querySelector('h3')) modal.querySelector('h3').textContent = origTitle;
            resolve(false);
        };

        document.getElementById('approvalPhraseConfirm').onclick = async function() {
            let words = getPhraseFromGrid('approvalPhraseGrid');
            if (words.some(function(w) { return !w; })) {
                showToast('Please fill in all 12 words', 'error');
                return;
            }
            let phrase = words.join(' ');
            let phraseHash = await Auth.hashPassword(phrase);
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
    const reason = await promptDeclineReason();
    if (reason === null) return;

    try {
        await db.from('pending_actions').update({
            status: 'rejected',
            rejected_by_user_id: currentUser.id,
            rejection_reason: reason || null,
            completed_at: new Date().toISOString()
        }).eq('id', pendingActionId);

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

        const input = document.getElementById('declineReasonInput');
        const confirmBtn = document.getElementById('declineConfirmBtn');
        const closeBtn = document.getElementById('declineModalClose');

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
            try {
                let toUserId = null;
                let toUserEmail = action_data.recipient;
                
                if (action_data.recipient) {
                    const { data: recipUser, error: recipError } = await db
                        .from('users')
                        .select('id, email')
                        .eq('email', action_data.recipient.toLowerCase())
                        .maybeSingle();
                    
                    if (!recipError && recipUser) {
                        toUserId = recipUser.id;
                        toUserEmail = recipUser.email;
                    }
                }

                const { data: accounts, error: accError } = await db
                    .from('accounts')
                    .select('id, balance')
                    .eq('joint_account_id', currentUser.joint_account_id)
                    .eq('status', 'active');
                
                if (accError) throw new Error('Failed to fetch accounts: ' + accError.message);
                if (!accounts || accounts.length === 0) throw new Error('No active accounts found');

                let totalBalance = 0;
                accounts.forEach(acc => {
                    totalBalance += parseFloat(acc.balance || 0);
                });

                const sendAmount = parseFloat(action_data.amount);
                if (totalBalance < sendAmount) throw new Error(`Insufficient funds. Available: $${totalBalance.toFixed(2)}, Required: $${sendAmount.toFixed(2)}`);

                const primaryAccount = accounts[0];
                const newBalance = parseFloat(primaryAccount.balance || 0) - sendAmount;
                
                const { error: deductError } = await db
                    .from('accounts')
                    .update({ 
                        balance: newBalance, 
                        updated_at: new Date().toISOString() 
                    })
                    .eq('id', primaryAccount.id);
                
                if (deductError) throw new Error('Failed to deduct funds: ' + deductError.message);

                if (toUserId) {
                    const { data: recipAccount, error: recipAccError } = await db
                        .from('accounts')
                        .select('id, balance')
                        .eq('user_id', toUserId)
                        .eq('status', 'active')
                        .maybeSingle();
                    
                    if (!recipAccError && recipAccount) {
                        const newRecipBalance = parseFloat(recipAccount.balance || 0) + sendAmount;
                        await db
                            .from('accounts')
                            .update({ 
                                balance: newRecipBalance, 
                                updated_at: new Date().toISOString() 
                            })
                            .eq('id', recipAccount.id);

                        await db.from('transactions').insert([{
                            user_id: toUserId,
                            transaction_type: 'receive',
                            amount: sendAmount,
                            currency: 'USD',
                            total_amount: sendAmount,
                            from_user_id: pendingAction.initiated_by_user_id,
                            from_email: action_data.senderEmail,
                            to_user_id: toUserId,
                            to_email: toUserEmail,
                            description: action_data.description || 'Transfer received',
                            status: 'completed',
                            requires_approval: false,
                            completed_at: new Date().toISOString(),
                            created_at: new Date().toISOString()
                        }]);
                    }
                }

                const { error: txError } = await db.from('transactions').insert([{
                    joint_account_id: currentUser.joint_account_id,
                    pending_action_id: pendingAction.id,
                    initiated_by_user_id: pendingAction.initiated_by_user_id,
                    approved_by_user_id: currentUser.id,
                    transaction_type: 'send',
                    amount: sendAmount,
                    currency: 'USD',
                    total_amount: sendAmount,
                    from_user_id: pendingAction.initiated_by_user_id,
                    to_user_id: toUserId,
                    from_email: action_data.senderEmail,
                    to_email: toUserEmail,
                    description: action_data.description || 'Joint account transfer',
                    status: 'completed',
                    requires_approval: false,
                    completed_at: new Date().toISOString(),
                    created_at: new Date().toISOString()
                }]);
                
                if (txError) throw new Error('Failed to record transaction: ' + txError.message);
                
                // ADMIN NOTIFICATION: Transfer Approved
                await sendAdminNotification(
                    'transaction_approved',
                    `✅ Transfer Approved - ${formatCurrency(sendAmount)}`,
                    `Joint account transfer of ${formatCurrency(sendAmount)} from ${action_data.senderEmail} to ${toUserEmail || action_data.recipient} has been approved by ${currentUser.first_name} ${currentUser.last_name}.`,
                    'transfer_approved',
                    action_data
                );
                
                console.log(`Transfer completed: $${sendAmount} from joint account to ${toUserEmail || 'external'}`);
                break;
                
            } catch (err) {
                console.error('Transaction execution error:', err);
                throw err;
            }
        }

        case 'card_application': {
            try {
                let shipping = action_data.shipping;
                let shipAddr = shipping
                    ? `${shipping.addr1}${shipping.addr2 ? ', ' + shipping.addr2 : ''}, ${shipping.city}, ${shipping.state} ${shipping.zip}, ${shipping.country}`
                    : null;

                const cardNumber = generateCardNumber();
                const expiry = generateExpiry();
                
                const { data: initiator, error: initError } = await db
                    .from('users')
                    .select('first_name, last_name')
                    .eq('id', pendingAction.initiated_by_user_id)
                    .single();
                
                if (initError) console.warn('Could not fetch initiator:', initError);
                
                const cardHolder = initiator
                    ? `${initiator.first_name || ''} ${initiator.last_name || ''}`.trim().toUpperCase()
                    : 'CARDHOLDER';

                const cardFee = action_data.fee || (action_data.delivery_type === 'physical' ? 300 : 100);
                
                // Get accounts for fee deduction
                const { data: accounts, error: accError } = await db
                    .from('accounts')
                    .select('id, balance')
                    .eq('joint_account_id', currentUser.joint_account_id)
                    .eq('status', 'active');
                
                if (accError) throw new Error('Failed to fetch accounts: ' + accError.message);
                if (!accounts || accounts.length === 0) throw new Error('No active accounts found');

                let totalBalance = 0;
                accounts.forEach(acc => {
                    totalBalance += parseFloat(acc.balance || 0);
                });

                if (totalBalance < cardFee) {
                    throw new Error(`Insufficient funds for card fee: $${cardFee}`);
                }

                const primaryAccount = accounts[0];
                const newBalance = parseFloat(primaryAccount.balance || 0) - cardFee;
                
                await db
                    .from('accounts')
                    .update({ balance: newBalance, updated_at: new Date().toISOString() })
                    .eq('id', primaryAccount.id);

                const cardData = {
                    joint_account_id: currentUser.joint_account_id,
                    pending_action_id: pendingAction.id,
                    application_reference: 'CARD-' + Date.now().toString(36).toUpperCase(),
                    card_type: action_data.card_type || action_data.delivery_type || 'digital',
                    card_network: action_data.card_network,
                    wallet_type: action_data.wallet_type || 'usd',
                    crypto_coin: action_data.crypto_coin || null,
                    delivery_type: action_data.delivery_type || 'digital',
                    shipping_name: shipping ? shipping.name : null,
                    shipping_address: shipAddr,
                    card_number: cardNumber,
                    card_expiry: expiry,
                    card_holder: cardHolder,
                    status: 'pending',
                    initiated_by_user_id: pendingAction.initiated_by_user_id,
                    approved_by_user_id: currentUser.id,
                    created_at: new Date().toISOString()
                };
                
                const { error: cardError } = await db
                    .from('card_applications')
                    .insert([cardData]);
                
                if (cardError) {
                    console.error('Card insert error:', cardError);
                    throw new Error('Failed to create card application: ' + cardError.message);
                }

                // Record transaction for fee
                const networkLabel = (action_data.card_network || '').charAt(0).toUpperCase() + (action_data.card_network || '').slice(1);
                const txDesc = `${action_data.delivery_type === 'physical' ? 'Physical' : 'Digital'} ${networkLabel} card application fee (${action_data.wallet_type === 'crypto' ? (action_data.crypto_coin || 'crypto').toUpperCase() : 'USD'})`;
                
                await db.from('transactions').insert([{
                    joint_account_id: currentUser.joint_account_id,
                    user_id: pendingAction.initiated_by_user_id,
                    pending_action_id: pendingAction.id,
                    transaction_type: 'card_payment',
                    amount: cardFee,
                    currency: 'USD',
                    total_amount: cardFee,
                    fee: cardFee,
                    from_user_id: pendingAction.initiated_by_user_id,
                    approved_by_user_id: currentUser.id,
                    description: txDesc,
                    status: 'completed',
                    requires_approval: false,
                    completed_at: new Date().toISOString(),
                    created_at: new Date().toISOString()
                }]);
                
                // ADMIN NOTIFICATION: Card Application Approved
                await sendAdminNotification(
                    'card_application_approved',
                    `✅ Card Application Approved - ${action_data.card_network?.toUpperCase()} ${action_data.delivery_type} Card`,
                    `Card application for ${action_data.card_network?.toUpperCase()} ${action_data.delivery_type} card has been approved by ${currentUser.first_name} ${currentUser.last_name}. Card generated for ${cardHolder}. Fee: ${formatCurrency(cardFee)}`,
                    'card_approved',
                    action_data
                );
                
                console.log(`Card application created: ${action_data.card_network} ${cardHolder}`);
                break;
                
            } catch (err) {
                console.error('Card application execution error:', err);
                throw err;
            }
        }

        case 'loan_application': {
            if (typeof window.executeLoanApproval === 'function') {
                await window.executeLoanApproval(pendingAction);
                
                // ADMIN NOTIFICATION: Loan Application Approved
                await sendAdminNotification(
                    'loan_application_approved',
                    `✅ Loan Approved - ${formatCurrency(action_data.amount)}`,
                    `Loan application for ${formatCurrency(action_data.amount)} (Level ${action_data.level}) has been approved by ${currentUser.first_name} ${currentUser.last_name}. Term: ${action_data.term_months} months | Total Repayable: ${formatCurrency(action_data.total_repayable)}`,
                    'loan_approved',
                    action_data
                );
            } else {
                console.error('executeLoanApproval function not found');
                throw new Error('Loan approval handler not available');
            }
            break;
        }

        case 'investment_goal': {
            if (typeof window.executeInvestmentApproval === 'function') {
                await window.executeInvestmentApproval(pendingAction);
                
                // ADMIN NOTIFICATION: Investment Approved
                await sendAdminNotification(
                    'investment_approved',
                    `✅ Investment Approved - ${action_data.plan?.charAt(0).toUpperCase() + action_data.plan?.slice(1)} Plan`,
                    `Investment of ${formatCurrency(action_data.amount)} in ${action_data.plan} plan has been approved by ${currentUser.first_name} ${currentUser.last_name}. Lock period: ${action_data.lock_months} months | Projected: ${formatCurrency(action_data.projected)}`,
                    'investment_approved',
                    action_data
                );
            } else {
                console.error('executeInvestmentApproval function not found');
                throw new Error('Investment approval handler not available');
            }
            break;
        }

        case 'account_deletion': {
            await executeJointAccountDeletion(pendingAction);
            
            // ADMIN NOTIFICATION: Account Deletion
            await sendAdminNotification(
                'account_deletion_approved',
                `⚠️ Joint Account Deletion Approved`,
                `Joint account deletion has been approved by ${currentUser.first_name} ${currentUser.last_name}. The account and all associated data will be permanently deleted.`,
                'deletion_approved',
                action_data
            );
            break;
        }

        case 'card_cancellation': {
            if (typeof window.executeCancelCard === 'function') {
                await window.executeCancelCard(action_data.card_id);
                
                // ADMIN NOTIFICATION: Card Cancellation
                await sendAdminNotification(
                    'card_cancellation_approved',
                    `💳 Card Cancellation Approved`,
                    `Card cancellation has been approved by ${currentUser.first_name} ${currentUser.last_name}. The card has been deactivated.`,
                    'cancellation_approved',
                    action_data
                );
            } else {
                console.error('executeCancelCard function not found');
                throw new Error('Card cancellation handler not available');
            }
            break;
        }

        case 'crypto_send': {
            try {
                const coin = action_data.coin;
                const amount = parseFloat(action_data.amount);
                const balanceField = coin === 'btc' ? 'btc_balance' : 'ltc_balance';
                const coinLabel = coin.toUpperCase();

                const { data: accounts, error: accError } = await db
                    .from('accounts')
                    .select(`id, ${balanceField}`)
                    .eq('joint_account_id', currentUser.joint_account_id)
                    .eq('status', 'active');
                
                if (accError) throw new Error('Failed to fetch accounts: ' + accError.message);
                if (!accounts || accounts.length === 0) throw new Error('No active accounts found');

                let totalBalance = 0;
                accounts.forEach(acc => {
                    totalBalance += parseFloat(acc[balanceField] || 0);
                });

                if (amount > totalBalance) {
                    throw new Error(`Insufficient ${coinLabel} balance. Available: ${totalBalance.toFixed(8)} ${coinLabel}, Required: ${amount.toFixed(8)} ${coinLabel}`);
                }

                let remainingAmount = amount;
                for (const account of accounts) {
                    if (remainingAmount <= 0) break;
                    
                    const currentBalance = parseFloat(account[balanceField] || 0);
                    if (currentBalance > 0) {
                        const deductAmount = Math.min(remainingAmount, currentBalance);
                        const newBalance = currentBalance - deductAmount;
                        
                        await db
                            .from('accounts')
                            .update({ [balanceField]: newBalance, updated_at: new Date().toISOString() })
                            .eq('id', account.id);
                        
                        remainingAmount -= deductAmount;
                    }
                }

                await db.from('transactions').insert([{
                    joint_account_id: currentUser.joint_account_id,
                    pending_action_id: pendingAction.id,
                    initiated_by_user_id: pendingAction.initiated_by_user_id,
                    approved_by_user_id: currentUser.id,
                    transaction_type: 'crypto_send',
                    amount: 0,
                    currency: 'USD',
                    total_amount: 0,
                    from_user_id: pendingAction.initiated_by_user_id,
                    from_email: action_data.senderEmail,
                    crypto_coin: coin,
                    crypto_amount: amount,
                    crypto_address: action_data.address,
                    description: action_data.description || `${coinLabel} send to ${action_data.address?.slice(0, 12)}...`,
                    status: 'completed',
                    requires_approval: false,
                    completed_at: new Date().toISOString(),
                    created_at: new Date().toISOString()
                }]);
                
                // ADMIN NOTIFICATION: Crypto Send Approved
                await sendAdminNotification(
                    'crypto_send_approved',
                    `🪙 Crypto Transfer Approved - ${amount.toFixed(8)} ${coinLabel}`,
                    `Crypto transfer of ${amount.toFixed(8)} ${coinLabel} to ${action_data.address?.slice(0, 20)}... has been approved by ${currentUser.first_name} ${currentUser.last_name}.`,
                    'crypto_approved',
                    action_data
                );
                
                console.log(`Crypto send completed: ${amount.toFixed(8)} ${coinLabel}`);
                break;
                
            } catch (err) {
                console.error('Crypto send execution error:', err);
                throw err;
            }
        }

        default: {
            console.warn(`Unknown action type: ${action_type}`);
            throw new Error(`Unknown action type: ${action_type}`);
        }
    }
}


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
            const isSender = t.from_user_id === currentUser.id || t.transaction_type === 'send';
            const counterparty = isSender ? (t.to_email || 'External') : (t.from_email || 'External');
            const label = t.description || (t.transaction_type?.replace(/_/g, ' ')) || 'Transfer';
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

async function loadCards() {
    if (typeof window._loadCards === 'function') {
        await window._loadCards();
    }
}

async function loadLoans() {
    if (typeof window._loadLoans === 'function') {
        await window._loadLoans();
    }
}

async function loadInvestments() {
    if (typeof window._loadInvestments === 'function') {
        await window._loadInvestments();
    }
}

function generateCardNumber() {
    let num = '';
    for (let i = 0; i < 4; i++) {
        num += Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        if (i < 3) num += ' ';
    }
    return num;
}

function generateExpiry() {
    const date = new Date();
    const year = date.getFullYear() + 4;
    const month = date.getMonth() + 1;
    return `${month.toString().padStart(2, '0')}/${year.toString().slice(-2)}`;
}

// ============================================
// FORM HANDLERS
// ============================================

async function handleSendSubmit(e) {
    e.preventDefault();

    const amount = parseFloat(document.getElementById('sendAmount').value);
    const recipient = document.getElementById('recipientEmail').value.trim();
    const description = document.getElementById('sendDesc').value.trim();

    if (!amount || amount <= 0) { showToast('Enter a valid amount', 'error'); return; }
    if (!recipient) { showToast('Enter recipient email', 'error'); return; }

    const confirmed = await requestPin('Enter your PIN to send money.');
    if (!confirmed) return;

    try {
        if (currentUser.account_type === 'joint' && currentUser.joint_account_id) {
            const actionData = { amount, recipient, description, senderEmail: currentUser.email };
            const pending = await createPendingAction('transaction', actionData);
            if (pending) {
                showToast('Transfer initiated — waiting for co-owner to approve', 'success');
                hideModal('sendModal');
                document.getElementById('sendForm').reset();
                await loadDashboardData();
            }
        } else {
            const { data: account, error: accErr } = await db
                .from('accounts').select('*').eq('user_id', currentUser.id).single();

            if (accErr || !account) { showToast('Account not found', 'error'); return; }
            if (parseFloat(account.balance) < amount) { showToast('Insufficient funds', 'error'); return; }

            await db.from('accounts').update({
                balance: parseFloat(account.balance) - amount,
                updated_at: new Date().toISOString()
            }).eq('user_id', currentUser.id);

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

    const amount = parseFloat(document.getElementById('requestAmount').value);
    const fromEmail = document.getElementById('requestFrom').value.trim();
    const desc = document.getElementById('requestDesc').value.trim();

    if (!amount || amount <= 0) { showToast('Enter a valid amount', 'error'); return; }
    if (!fromEmail) { showToast('Enter the email to request from', 'error'); return; }

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
// HELPERS
// ============================================

function getActionTitle(type) {
    return {
        transaction: 'Transfer',
        card_application: 'Card Application',
        card_cancellation: 'Card Cancellation',
        loan_application: 'Loan Application',
        investment_goal: 'Investment',
        account_deletion: 'Account Deletion Request',
        notification_delete: 'Delete Notification',
        notification_clear_all: 'Clear All Notifications'
    }[type] || 'Action';
}

function getActionDescription(action) {
    const d = action.action_data;
    switch (action.action_type) {
        case 'transaction': return `${formatCurrency(d.amount)} to ${d.recipient}`;
        case 'card_application': return (d.delivery_type === 'physical' ? 'Physical' : 'Digital') + ' ' + (d.card_network || '') + ' card (' + (d.wallet_type === 'crypto' ? (d.crypto_coin || 'crypto').toUpperCase() : 'USD') + ')';
        case 'card_cancellation': return 'Cancel card — requires co-holder approval';
        case 'notification_delete': return 'Delete a notification';
        case 'notification_clear_all': return 'Clear all notifications';
        case 'loan_application': return `${formatCurrency(d.amount)} — ${d.purpose}`;
        case 'investment_goal': return (d.plan ? d.plan.charAt(0).toUpperCase() + d.plan.slice(1) + ' plan — ' : '') + (d.goal_name || '') + ' (' + formatCurrency(d.amount) + ')';
        case 'account_deletion': return 'Requested by account holder — approve to permanently close account';
        default: return 'Pending approval';
    }
}

function getActionIcon(type) {
    return {
        transaction: 'fa-exchange-alt',
        card_application: 'fa-credit-card',
        card_cancellation: 'fa-ban',
        notification_delete: 'fa-bell-slash',
        notification_clear_all: 'fa-trash',
        loan_application: 'fa-hand-holding-usd',
        investment_goal: 'fa-chart-line',
        account_deletion: 'fa-trash-alt'
    }[type] || 'fa-clock';
}

// ============================================
// UI UTILITIES
// ============================================

function showSendModal() { document.getElementById('sendModal')?.classList.add('active'); }
function showRequestModal() { document.getElementById('requestModal')?.classList.add('active'); }
function showLoanModal() { document.getElementById('loanModal')?.classList.add('active'); }
function hideCardModal() { document.getElementById('cardModal')?.classList.remove('active'); }
function hideLoanModal() { document.getElementById('loanModal')?.classList.remove('active'); }
function hideInvestmentModal() { document.getElementById('investmentModal')?.classList.remove('active'); }
function hideGasWalletModal() { document.getElementById('gasWalletModal')?.classList.remove('active'); }
function hideModal(modalId) { document.getElementById(modalId)?.classList.remove('active'); }

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.className = `toast-notification toast-${type}`;
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

const savedTheme = localStorage.getItem('theme') || 'light';
document.documentElement.setAttribute('data-theme', savedTheme);

// ============================================
// SETTINGS
// ============================================

const SETTINGS_CLOUDINARY = {
    cloudName: 'dmbgczlom',
    uploadPreset: 'phontos'
};

function initSettingsSection() {
    const preview = document.getElementById('settingsAvatarPreview');
    if (preview) {
        if (currentUser.profile_picture_url) {
            preview.innerHTML = `<img src="${currentUser.profile_picture_url}"
                style="width:100%;height:100%;object-fit:cover;">`;
        } else {
            const initials = `${currentUser.first_name?.[0] || ''}${currentUser.last_name?.[0] || ''}`.toUpperCase();
            preview.innerHTML = `<span style="font-size:1.4rem;font-weight:700;
                color:var(--accent-primary)">${initials}</span>`;
        }
    }

    const desc = document.getElementById('deleteAccountDesc');
    if (desc && currentUser.account_type === 'joint') {
        desc.textContent = 'Permanently delete this joint account. Both account holders must approve. ' +
            'Your co-holder will see this as a pending request and must confirm with their PIN.';
    }

    const fi = document.getElementById('settingsPicFile');
    if (fi && !fi.dataset.bound) {
        fi.dataset.bound = '1';
        fi.addEventListener('change', (e) => {
            if (e.target.files.length) handleSettingsPicFile(e.target.files[0]);
        });
    }

    const newEmailEl = document.getElementById('newEmail');
    if (newEmailEl && !newEmailEl.value) newEmailEl.value = currentUser.email || '';
}

window.triggerSettingsUpload = function() {
    document.getElementById('settingsPicFile')?.click();
};

function handleSettingsPicFile(file) {
    if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
        showToast('Please upload a JPG or PNG', 'error'); return;
    }
    if (file.size > 2097152) {
        showToast('Image must be under 2MB', 'error'); return;
    }

    const textEl = document.getElementById('settingsPicText');
    if (textEl) textEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading…';

    const reader = new FileReader();
    reader.onload = (e) => {
        const preview = document.getElementById('settingsAvatarPreview');
        if (preview) preview.innerHTML = `<img src="${e.target.result}"
            style="width:100%;height:100%;object-fit:cover;">`;
    };
    reader.readAsDataURL(file);

    const fd = new FormData();
    fd.append('file', file);
    fd.append('upload_preset', SETTINGS_CLOUDINARY.uploadPreset);
    fd.append('cloud_name', SETTINGS_CLOUDINARY.cloudName);

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
        const avatarEl = document.getElementById('navAvatar');
        if (avatarEl) avatarEl.innerHTML = `<img src="${url}" alt="${currentUser.first_name}"
            style="width:28px;height:28px;border-radius:50%;object-fit:cover;display:block;">`;
        showToast('Profile picture updated', 'success');
        document.getElementById('settingsPicUrl').value = '';
    }

    if (btn) { btn.disabled = false; btn.innerHTML = 'Save Profile Picture'; }
};

window.saveEmail = async function() {
    const newEmail = document.getElementById('newEmail').value.trim().toLowerCase();
    const password = document.getElementById('emailCurrentPassword').value;

    if (!newEmail || !newEmail.includes('@')) { showToast('Enter a valid email', 'error'); return; }
    if (!password) { showToast('Enter your current password to confirm', 'error'); return; }
    if (newEmail === currentUser.email) { showToast('That is already your email', 'error'); return; }

    const btn = document.getElementById('saveEmailBtn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving…'; }

    const passwordHash = await Auth.hashPassword(password);
    if (passwordHash !== currentUser.password_hash) {
        showToast('Incorrect password', 'error');
        if (btn) { btn.disabled = false; btn.innerHTML = 'Update Email'; }
        return;
    }

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

window.savePassword = async function() {
    const current = document.getElementById('currentPassword').value;
    const newPw = document.getElementById('settingsNewPassword').value;
    const confirm = document.getElementById('settingsConfirmPassword').value;

    if (!current) { showToast('Enter your current password', 'error'); return; }
    if (!newPw) { showToast('Enter a new password', 'error'); return; }
    if (newPw.length < 8) { showToast('Password must be at least 8 characters', 'error'); return; }
    if (newPw !== confirm) { showToast('New passwords do not match', 'error'); return; }

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
        document.getElementById('currentPassword').value = '';
        document.getElementById('settingsNewPassword').value = '';
        document.getElementById('settingsConfirmPassword').value = '';
        showToast('Password updated successfully', 'success');
    }

    if (btn) { btn.disabled = false; btn.innerHTML = 'Update Password'; }
};

// ── PHRASE GRID HELPER ───────────────────────

function buildPhraseGrid(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    let html = "";
    for (let i = 1; i <= 12; i++) {
        const nav = "phraseKeyNav(event," + JSON.stringify(containerId) + "," + i + ")";
        html += '<div class="phrase-cell">';
        html += '<span class="phrase-num">' + i + '</span>';
        html += '<input type="text" id="phrase_' + containerId + '_' + i + '" autocomplete="off" spellcheck="false" autocorrect="off" autocapitalize="off" placeholder="word" onkeydown="' + nav + '">';
        html += '</div>';
    }
    container.innerHTML = html;
    const first = document.getElementById("phrase_" + containerId + "_1");
    if (first) setTimeout(function() { first.focus(); }, 100);
}

function phraseKeyNav(e, gridId, idx) {
    if (e.key === ' ' || e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        const next = document.getElementById('phrase_' + gridId + '_' + (idx + 1));
        if (next) next.focus();
    }
}

function getPhraseFromGrid(containerId) {
    const words = [];
    for (let i = 1; i <= 12; i++) {
        const el = document.getElementById('phrase_' + containerId + '_' + i);
        words.push(el ? el.value.trim().toLowerCase() : '');
    }
    return words;
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
    const oldPin = document.getElementById('oldPinInput')?.value || '';
    const newPin = document.getElementById('newPinInput')?.value || '';
    const confPin = document.getElementById('confirmPinInput')?.value || '';

    if (!/^\d{4}$/.test(oldPin)) { showToast('Enter your current 4-digit PIN', 'error'); return; }
    if (!/^\d{4}$/.test(newPin)) { showToast('New PIN must be 4 digits', 'error'); return; }
    if (newPin !== confPin) { showToast('New PINs do not match', 'error'); return; }

    const btn = document.getElementById('pinResetConfirmBtn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying...'; }

    const oldOk = await Auth.verifyPin(oldPin, currentUser.transaction_pin_hash);
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
    const words = getPhraseFromGrid('pinResetPhraseGrid');
    const newPin = document.getElementById('phraseNewPin')?.value || '';
    const confPin = document.getElementById('phraseConfirmPin')?.value || '';

    if (words.some(function(w) { return !w; })) { showToast('Please fill in all 12 words', 'error'); return; }
    if (!/^\d{4}$/.test(newPin)) { showToast('New PIN must be 4 digits', 'error'); return; }
    if (newPin !== confPin) { showToast('New PINs do not match', 'error'); return; }

    const btn = document.getElementById('pinResetPhraseBtn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying...'; }

    const phrase = words.join(' ');
    const phraseHash = await Auth.hashPassword(phrase);
    if (phraseHash !== currentUser.recovery_phrase_hash) {
        showToast('Recovery phrase is incorrect', 'error');
        if (btn) { btn.disabled = false; btn.innerHTML = 'Reset PIN'; }
        return;
    }

    await savePinReset(newPin, btn);
}

async function savePinReset(newPin, btn) {
    try {
        const newHash = await Auth.hashPassword(newPin);
        const { error } = await db.from('users')
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

const TAWK_URL = 'https://tawk.to/chat/69bd820f1f2eee1c3a8ff028/1jk6483t0';

function openCustomerCare() {
    document.getElementById('tawkDirectLink').href = TAWK_URL;
    document.getElementById('customerCareModal').classList.add('active');
    if (typeof Tawk_API !== 'undefined' && Tawk_API.toggle) {
        Tawk_API.toggle();
    }
}

// ── DELETE ACCOUNT ────────────────────────────

window.initiateDeleteAccount = async function() {
    let balQ = db.from('accounts').select('balance').eq('status', 'active');
    if (currentUser.account_type === 'joint' && currentUser.joint_account_id) {
        balQ = balQ.eq('joint_account_id', currentUser.joint_account_id);
    } else {
        balQ = balQ.eq('user_id', currentUser.id);
    }
    const balRes = await balQ;
    
    // Sum all balances for joint accounts
    let balance = 0;
    if (balRes.data && Array.isArray(balRes.data)) {
        balRes.data.forEach(acc => {
            balance += parseFloat(acc.balance || 0);
        });
    }

    if (balance > 0) {
        showToast('You have ' + formatCurrency(balance) + ' remaining. Please withdraw all funds before deleting your account.', 'error');
        const desc = document.getElementById('deleteAccountDesc');
        if (desc) {
            desc.innerHTML = '<span style="color:var(--error)"><i class="fas fa-exclamation-circle"></i> You still have <strong>' + formatCurrency(balance) + '</strong>. Please withdraw all funds first.</span>';
        }
        return;
    }

    document.getElementById('deleteConfirmModal').classList.add('active');
    buildPhraseGrid('deletePhraseGrid');
};

window.confirmDeleteAccount = async function() {
    const words = getPhraseFromGrid('deletePhraseGrid');
    if (words.some(function(w) { return !w; })) {
        showToast('Please fill in all 12 recovery phrase words', 'error');
        return;
    }

    const btn = document.getElementById('confirmDeleteBtn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying...'; }

    const phrase = words.join(' ');
    const phraseHash = await Auth.hashPassword(phrase);
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
        joint_account_id: currentUser.joint_account_id,
        initiated_by_user_id: currentUser.id,
        action_type: 'account_deletion',
        action_data: { requested_by: currentUser.id, requested_at: new Date().toISOString() },
        expires_at: expiresAt.toISOString()
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
    await loadDashboardData();
}

async function executeAccountDeletion() {
    try {
        const userId = currentUser.id;

        await db.from('sessions').delete().eq('user_id', userId);
        await db.from('transactions').delete().or(`from_user_id.eq.${userId},to_user_id.eq.${userId},user_id.eq.${userId}`);
        await db.from('accounts').delete().eq('user_id', userId);
        await db.from('users').delete().eq('id', userId);

        localStorage.removeItem('Summit_Trust_session');
        window.location.href = '/auth.html';
    } catch (err) {
        console.error('executeAccountDeletion error:', err);
        showToast('Error deleting account: ' + err.message, 'error');
    }
}

async function executeJointAccountDeletion(pendingAction) {
    try {
        const jointId = currentUser.joint_account_id;

        const { data: jointAccount } = await db
            .from('joint_accounts').select('primary_user_id, secondary_user_id').eq('id', jointId).single();

        const userIds = [jointAccount.primary_user_id, jointAccount.secondary_user_id].filter(Boolean);

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

        localStorage.removeItem('Summit_Trust_session');
        window.location.href = '/auth.html';
    } catch (err) {
        console.error('executeJointAccountDeletion error:', err);
        showToast('Error deleting joint account: ' + err.message, 'error');
        throw err;
    }
}

// ── EXPOSE SETTINGS HELPERS ───────────────────
window.initPinReset = initPinReset;
window.showPinResetWithOld = showPinResetWithOld;
window.showPinResetWithPhrase = showPinResetWithPhrase;
window.confirmPinResetWithOld = confirmPinResetWithOld;
window.confirmPinResetWithPhrase = confirmPinResetWithPhrase;
window.openCustomerCare = openCustomerCare;
window.buildPhraseGrid = buildPhraseGrid;
window.getPhraseFromGrid = getPhraseFromGrid;
window.phraseKeyNav = phraseKeyNav;
window.loadKYCUpgradePage = loadKYCUpgradePage;
window.initCardModal = () => {
    if (typeof window.initCardModal === 'function') window.initCardModal();
};
window.showGasWalletModal = () => {
    document.getElementById('gasWalletModal')?.classList.add('active');
};

// Section visibility helpers
window.showSection = function(section) {
    ['overview', 'transactions', 'cards', 'loans', 'investments', 'settings', 'kyc-upgrade'].forEach(s => {
        const el = document.getElementById(s + 'Section');
        if (el) el.style.display = s === section ? 'block' : 'none';
    });
    document.querySelectorAll('.sidebar-link, .mobile-menu-item').forEach(l => l.classList.remove('active'));
    const target = event?.target?.closest('.sidebar-link, .mobile-menu-item');
    if (target) target.classList.add('active');
    if (section === 'settings') initSettingsSection();
    if (section === 'kyc-upgrade') loadKYCUpgradePage();
};

// ============================================
// KYC UPGRADE FUNCTIONALITY
// ============================================

async function loadKYCUpgradePage() {
    try {
        const container = document.getElementById('kycContent');
        if (!container) return;

        // Load current user's KYC level and kyc_levels table
        const { data: kycLevels, error: levelsErr } = await db
            .from('kyc_levels')
            .select('*')
            .order('id', { ascending: true });

        if (levelsErr) throw levelsErr;

        const currentKycLevel = currentUser.kyc_level || 1;
        const currentKycStatus = currentUser.kyc_upgrade_status || null;

        // Build KYC levels display
        let html = `
            <div class="dashboard-card" style="margin-bottom:20px;">
                <h3 style="margin-bottom:16px;">Current KYC Level</h3>
                <div style="display:flex;align-items:center;gap:16px;padding:16px;background:var(--bg-secondary);border-radius:8px;margin-bottom:16px;">
                    <div style="width:60px;height:60px;border-radius:50%;background:var(--accent-primary);color:white;display:flex;align-items:center;justify-content:center;font-size:1.4rem;font-weight:700;">
                        ${currentKycLevel}
                    </div>
                    <div>
                        <h4 style="margin:0 0 4px;">Level ${currentKycLevel}</h4>
                        <p class="text-secondary" style="margin:0;font-size:.85rem;">
                            ${currentKycStatus ? `Status: <strong>${currentKycStatus}</strong>` : 'Verified'}
                        </p>
                    </div>
                </div>
            </div>

            <div class="dashboard-card">
                <h3 style="margin-bottom:16px;">Available Levels</h3>
                <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:16px;">`;

        if (kycLevels && Array.isArray(kycLevels)) {
            for (const level of kycLevels) {
                const isCurrentLevel = level.id === currentKycLevel;
                const isUpgradeable = level.id > currentKycLevel;
                const badgeClass = isCurrentLevel ? 'status-success' : (isUpgradeable ? 'status-pending' : 'status-completed');
                
                html += `
                    <div style="padding:16px;border:2px solid ${isCurrentLevel ? 'var(--accent-primary)' : 'var(--border)'};border-radius:12px;background:var(--bg-secondary);transition:all 0.2s;">
                        <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:12px;">
                            <h4 style="margin:0;">Level ${level.id}: ${level.level_name}</h4>
                            <span class="status-badge ${badgeClass}" style="font-size:0.75rem;">
                                ${isCurrentLevel ? 'Current' : (isUpgradeable ? 'Available' : 'Completed')}
                            </span>
                        </div>
                        <p class="text-secondary" style="margin:0 0 12px;font-size:.85rem;">${level.description || 'No description'}</p>
                        <div style="font-size:.85rem;margin-bottom:12px;color:var(--text-secondary);">
                            <div style="margin-bottom:4px;"><i class="fas fa-dollar-sign"></i> Fee: <strong>${formatCurrency(level.fee_amount)}</strong></div>
                            <div style="margin-bottom:4px;"><i class="fas fa-exchange-alt"></i> Daily Limit: <strong>${formatCurrency(level.daily_transfer_limit)}</strong></div>
                            <div style="margin-bottom:4px;"><i class="fas fa-calendar-alt"></i> Monthly Limit: <strong>${formatCurrency(level.monthly_transfer_limit)}</strong></div>
                            ${level.can_invest ? '<div style="margin-bottom:4px;"><i class="fas fa-check" style="color:var(--success);"></i> Can Invest</div>' : ''}
                            ${level.can_apply_loan ? '<div style="margin-bottom:4px;"><i class="fas fa-check" style="color:var(--success);"></i> Can Apply for Loan</div>' : ''}
                            ${level.can_apply_card ? '<div style="margin-bottom:4px;"><i class="fas fa-check" style="color:var(--success);"></i> Can Apply for Card</div>' : ''}
                        </div>
                        ${isUpgradeable ? `<button class="btn btn-primary btn-block" onclick="showKYCUpgradeModal(${level.id})">
                            <i class="fas fa-arrow-up"></i> Upgrade to Level ${level.id}
                        </button>` : ''}
                    </div>`;
            }
        }

        html += `
                </div>
            </div>`;

        container.innerHTML = html;
    } catch (err) {
        console.error('loadKYCUpgradePage error:', err);
        showToast('Error loading KYC levels: ' + err.message, 'error');
    }
}

window.showKYCUpgradeModal = async function(targetKycLevel) {
    try {
        const modal = document.getElementById('kycUpgradeModal');
        const body = document.getElementById('kycUpgradeBody');

        // Get the target level details
        const { data: targetLevel, error: levelErr } = await db
            .from('kyc_levels')
            .select('*')
            .eq('id', targetKycLevel)
            .single();

        if (levelErr) throw levelErr;

        // Show processing screen
        body.innerHTML = `
            <div style="text-align:center;padding:20px;">
                <i class="fas fa-spinner fa-spin" style="font-size:2rem;color:var(--accent-primary);margin-bottom:16px;display:block;"></i>
                <h4>Checking Gas Wallet Balance...</h4>
                <p class="text-secondary">Please wait while we verify your gas wallet...</p>
            </div>`;
        modal.classList.add('active');

        // Get user's account and check gas balance
        const account = await getUserAccount();
        if (!account) {
            throw new Error('Could not find your account');
        }

        const gasBalance = parseFloat(account.gas_balance || 0);
        const requiredFee = parseFloat(targetLevel.fee_amount || 0);

        // Check if they have enough gas balance
        if (gasBalance < requiredFee) {
            // Not enough balance - show fund prompt
            body.innerHTML = `
                <div style="text-align:center;padding:20px;">
                    <div style="width:60px;height:60px;margin:0 auto 16px;background:var(--error,#dc2626);border-radius:50%;display:flex;align-items:center;justify-content:center;">
                        <i class="fas fa-exclamation-triangle" style="color:white;font-size:1.5rem;"></i>
                    </div>
                    <h4>Insufficient Gas Balance</h4>
                    <p class="text-secondary" style="margin:0 0 20px;">
                        You need <strong>${formatCurrency(requiredFee)}</strong> to upgrade to Level ${targetKycLevel}.
                        <br>Current balance: <strong>${formatCurrency(gasBalance)}</strong>
                    </p>
                    <div style="background:var(--bg-secondary);padding:12px;border-radius:8px;margin-bottom:20px;font-size:.85rem;color:var(--text-secondary);">
                        <i class="fas fa-info-circle"></i> You need to fund your gas wallet first.
                    </div>
                    <div style="display:flex;gap:10px;">
                        <button class="btn btn-outline" style="flex:1;" onclick="hideModal('kycUpgradeModal')">Cancel</button>
                        <button class="btn btn-primary" style="flex:1;" onclick="showGasWalletModal(); hideModal('kycUpgradeModal');">
                            <i class="fas fa-wallet"></i> Fund Gas Wallet
                        </button>
                    </div>
                </div>`;
            return;
        }

        // Enough balance - show confirmation
        body.innerHTML = `
            <div style="padding:20px;">
                <div style="background:var(--bg-secondary);padding:16px;border-radius:8px;margin-bottom:20px;">
                    <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
                        <span class="text-secondary">Upgrade to Level:</span>
                        <strong>${targetKycLevel}</strong>
                    </div>
                    <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
                        <span class="text-secondary">Fee:</span>
                        <strong>${formatCurrency(requiredFee)}</strong>
                    </div>
                    <div style="display:flex;justify-content:space-between;">
                        <span class="text-secondary">Current Gas Balance:</span>
                        <strong>${formatCurrency(gasBalance)}</strong>
                    </div>
                </div>
                <div class="alert alert-info" style="margin-bottom:20px;">
                    <i class="fas fa-info-circle"></i>
                    <span>Confirm this upgrade to proceed. The fee will be deducted from your gas wallet.</span>
                </div>
                <div style="display:flex;gap:10px;">
                    <button class="btn btn-outline" style="flex:1;" onclick="hideModal('kycUpgradeModal')">Cancel</button>
                    <button class="btn btn-primary" style="flex:1;" id="confirmKycUpgradeBtn" onclick="processKYCUpgrade(${targetKycLevel}, ${requiredFee})">
                        <i class="fas fa-check"></i> Confirm Upgrade
                    </button>
                </div>
            </div>`;
    } catch (err) {
        console.error('showKYCUpgradeModal error:', err);
        showToast('Error: ' + err.message, 'error');
    }
};

window.processKYCUpgrade = async function(targetKycLevel, fee) {
    try {
        const modal = document.getElementById('kycUpgradeModal');
        const body = document.getElementById('kycUpgradeBody');
        const btn = document.getElementById('confirmKycUpgradeBtn');

        // Show processing state
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';

        // Request PIN confirmation
        const pinConfirmed = await requestPin('Enter your PIN to confirm KYC upgrade.');
        if (!pinConfirmed) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-check"></i> Confirm Upgrade';
            return;
        }

        // Get user's account
        const account = await getUserAccount();
        if (!account) throw new Error('Could not find your account');

        // Deduct fee from gas balance
        const newGasBalance = parseFloat(account.gas_balance || 0) - fee;

        const { error: updateErr } = await db
            .from('accounts')
            .update({
                gas_balance: newGasBalance,
                updated_at: new Date().toISOString()
            })
            .eq('id', account.id);

        if (updateErr) throw updateErr;

        // Update user's KYC upgrade status
        const { error: userErr } = await db
            .from('users')
            .update({
                kyc_upgrade_status: 'processing',
                kyc_upgrade_requested_to: targetKycLevel,
                updated_at: new Date().toISOString()
            })
            .eq('id', currentUser.id);

        if (userErr) throw userErr;

        // Create transaction record for the fee
        await db.from('transactions').insert([{
            user_id: currentUser.id,
            transaction_type: 'kyc_upgrade_fee',
            amount: fee,
            currency: 'USD',
            total_amount: fee,
            description: `KYC Level ${targetKycLevel} Upgrade Fee`,
            status: 'completed',
            requires_approval: false,
            completed_at: new Date().toISOString()
        }]);

        // Send admin notification
        await sendKYCUpgradeNotification(targetKycLevel, fee);

        // Show processing screen
        body.innerHTML = `
            <div style="text-align:center;padding:40px 20px;">
                <div style="width:80px;height:80px;margin:0 auto 20px;background:var(--accent-primary,#2563eb);border-radius:50%;display:flex;align-items:center;justify-content:center;animation:pulse 2s infinite;">
                    <i class="fas fa-check" style="color:white;font-size:2rem;"></i>
                </div>
                <h4>Processing Your KYC Upgrade</h4>
                <p class="text-secondary" style="margin:0 0 20px;">
                    Your upgrade request to Level ${targetKycLevel} has been submitted.
                    <br>Our team will review it and update your account within 24 hours.
                </p>
                <button class="btn btn-primary btn-block" onclick="hideModal('kycUpgradeModal'); loadKYCUpgradePage();">
                    <i class="fas fa-check-circle"></i> Close
                </button>
            </div>
            <style>
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.7; }
                }
            </style>`;

        // Update UI
        currentUser.kyc_upgrade_status = 'processing';
        currentUser.kyc_upgrade_requested_to = targetKycLevel;

        showToast('KYC upgrade request submitted! Please check your email for updates.', 'success');
        
        // Reload dashboard data
        setTimeout(() => {
            loadDashboardData();
        }, 2000);

    } catch (err) {
        console.error('processKYCUpgrade error:', err);
        showToast('Error processing upgrade: ' + err.message, 'error');
        const btn = document.getElementById('confirmKycUpgradeBtn');
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-check"></i> Confirm Upgrade';
        }
    }
};

async function sendKYCUpgradeNotification(targetLevel, fee) {
    try {
        const { error } = await db
            .from('admin_notifications')
            .insert([{
                user_id: currentUser.id,
                notification_type: 'kyc_upgrade_request',
                title: `KYC Upgrade Request - Level ${targetLevel}`,
                message: `User ${currentUser.first_name} ${currentUser.last_name} (${currentUser.email}) has requested to upgrade their KYC level to ${targetLevel}. Upgrade fee: ${formatCurrency(fee)}. Please review and update their KYC status.`,
                action_type: 'review_kyc_upgrade',
                action_data: {
                    user_id: currentUser.id,
                    target_kyc_level: targetLevel,
                    fee_amount: fee,
                    requested_at: new Date().toISOString()
                },
                is_read: false
            }]);

        if (error) throw error;
    } catch (err) {
        console.error('sendKYCUpgradeNotification error:', err);
        // Don't throw - notification is supplementary
    }
}

async function getUserAccount() {
    try {
        let query = db.from('accounts')
            .select('*')
            .eq('status', 'active');

        if (currentUser.account_type === 'joint' && currentUser.joint_account_id) {
            query = query.eq('joint_account_id', currentUser.joint_account_id);
        } else {
            query = query.eq('user_id', currentUser.id);
        }

        const { data, error } = await query;

        if (error) throw error;
        
        if (!data || data.length === 0) return null;
        
        // For joint accounts, consolidate into a single account object
        if (currentUser.account_type === 'joint' && data.length > 1) {
            // Find the account with gas wallet (if any)
            const gasWalletAccount = data.find(acc => acc.gas_wallet_address && acc.gas_wallet_address.trim() !== '');
            const primaryAccount = data[0];
            
            // Sum all gas balances for consolidated total
            let totalGasBalance = 0;
            data.forEach(acc => {
                totalGasBalance += parseFloat(acc.gas_balance || 0);
            });
            
            // Create consolidated account
            const consolidated = {
                ...primaryAccount,
                gas_balance: totalGasBalance,
                gas_wallet_address: gasWalletAccount?.gas_wallet_address || null,
                gas_wallet_network: gasWalletAccount?.gas_wallet_network || null
            };
            return consolidated;
        }
        
        return data[0] || null;
    } catch (err) {
        console.error('getUserAccount error:', err);
        return null;
    }
}

// Make sure hideModal is globally available
window.hideModal = hideModal;