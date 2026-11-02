// ============================================
// AUTH PAGE UI CONTROLLER
// ============================================

let currentOTP  = '';
let resetToken  = '';
let individualData = {};

const CLOUDINARY = {
    cloudName:    window.CONFIG?.CLOUDINARY_CLOUD_NAME || 'ilhugflr',
    uploadPreset: window.CONFIG?.CLOUDINARY_UPLOAD_PRESET || 'cwm_uploads'
};

// ── INIT ─────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
    if (!window.Auth) { console.error('Auth not loaded'); return; }
    if (!window.db)   { console.error('Supabase not loaded'); return; }

    applyTheme();
    await loadCountries();
    await checkSession();
    bindEvents();
    bindFileInputs();

    // Check for password reset token in URL or Supabase Auth recovery hash
    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromUrl = urlParams.get('reset_token') || urlParams.get('token');
    const hash = window.location.hash || '';
    const isRecoveryHash = hash.includes('type=recovery') || hash.includes('access_token');

    if (tokenFromUrl || isRecoveryHash) {
        if (tokenFromUrl) resetToken = tokenFromUrl;
        openModal('forgotModal');
        document.getElementById('forgotStep1').style.display = 'none';
        document.getElementById('forgotStep2').style.display = 'block';
    }

    // Auto-open registration modal when clicking "Open Private Account" or "Open Account"
    const mode = (urlParams.get('mode') || urlParams.get('tab') || urlParams.get('action') || '').toLowerCase();
    const isRegister = mode === 'register' || mode === 'signup' || urlParams.has('register') || hash === '#signup' || hash === '#register';
    if (isRegister) {
        setTimeout(() => {
            if (mode === 'individual' || mode === 'personal') {
                if (typeof openIndividualForm === 'function') openIndividualForm();
            } else if (mode === 'joint') {
                if (typeof openJointForm === 'function') openJointForm();
            } else {
                if (typeof openModal === 'function') openModal('accountTypeModal');
            }
        }, 120);
    }

    // Listen to Supabase Auth state changes for recovery events
    if (window.db?.auth?.onAuthStateChange) {
        window.db.auth.onAuthStateChange((event) => {
            if (event === 'PASSWORD_RECOVERY') {
                openModal('forgotModal');
                document.getElementById('forgotStep1').style.display = 'none';
                document.getElementById('forgotStep2').style.display = 'block';
            }
        });
    }
});

function applyTheme() {
    const t = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', t);
    const icon = document.querySelector('#themeToggle i');
    if (icon) icon.className = t === 'light' ? 'fas fa-moon' : 'fas fa-sun';
}

async function checkSession() {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const mode = (urlParams.get('mode') || urlParams.get('tab') || urlParams.get('action') || '').toLowerCase();
        const hash = window.location.hash || '';
        const isRegister = mode === 'register' || mode === 'signup' || urlParams.has('register') || hash === '#signup' || hash === '#register';
        if (isRegister) return; // Do not auto-redirect if user explicitly clicked to register a new account

        const s = await Auth.validateSession();
        if (s) window.location.href = '/dashboard';
    } catch (_) {}
}

function bindEvents() {
    document.getElementById('loginForm')?.addEventListener('submit', handleLogin);
    document.getElementById('jointPrimaryForm')?.addEventListener('submit', handleJointSubmit);
    document.getElementById('secondUserForm')?.addEventListener('submit', handleSecondUserSubmit);

    document.getElementById('themeToggle')?.addEventListener('click', () => {
        const next = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('theme', next);
        const icon = document.querySelector('#themeToggle i');
        if (icon) icon.className = next === 'light' ? 'fas fa-moon' : 'fas fa-sun';
    });

    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal') && e.target.classList.contains('active')) {
            closeModal(e.target.id);
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const open = document.querySelector('.modal.active');
            if (open) closeModal(open.id);
        }
    });
}

// ── MODAL HELPERS ─────────────────────────────

window.openModal = function(id) {
    const m = document.getElementById(id);
    if (!m) { console.error('Modal not found:', id); return; }
    document.getElementById('authContainer').style.opacity = '0.3';
    document.getElementById('authContainer').style.pointerEvents = 'none';
    m.classList.add('active');
    document.body.style.overflow = 'hidden';

    if (id === 'forgotModal' && !resetToken) { resetForgotForm(); }
};

window.closeModal = function(id) {
    const m = document.getElementById(id);
    if (!m) return;
    m.classList.remove('active');
    document.getElementById('authContainer').style.opacity = '1';
    document.getElementById('authContainer').style.pointerEvents = 'auto';
    document.body.style.overflow = '';

    if (id === 'individualModal')  resetIndividualForm();
    if (id === 'jointModal')       resetJointForm();
    if (id === 'secondUserModal')  resetSecondUserForm();
    if (id === 'forgotModal')      resetForgotForm();
    if (id === 'otpVerifyModal')   document.getElementById('otpInput').value = '';
};

window.showModal = window.openModal;
window.hideModal = window.closeModal;

window.openIndividualForm = function() {
    closeModal('accountTypeModal');
    setTimeout(() => openModal('individualModal'), 250);
};
window.showIndividualForm = window.openIndividualForm;

window.openJointForm = function() {
    closeModal('accountTypeModal');
    setTimeout(() => openModal('jointModal'), 250);
};
window.showJointForm = window.openJointForm;

function changeLanguage(lang) { console.log('Language:', lang); }

// ── LOGIN ─────────────────────────────────────

async function handleLogin(e) {
    e.preventDefault();
    const btn  = e.target.querySelector('button[type="submit"]');
    const orig = btn?.innerHTML;
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in…'; }

    const email    = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const result   = await Auth.login(email, password);

    if (result.success) {
        window.location.href = '/dashboard';
    } else {
        showLoginError(result.error || 'Invalid email or password');
        if (btn) { btn.disabled = false; btn.innerHTML = orig; }
    }
}

function showLoginError(msg) {
    document.querySelector('.auth-error-msg')?.remove();
    const el = document.createElement('div');
    el.className = 'auth-error-msg';
    el.style.cssText = 'background:#fee2e2;color:#b91c1c;border:1px solid #fca5a5;' +
        'border-radius:8px;padding:10px 14px;margin-top:12px;font-size:.875rem;' +
        'display:flex;align-items:center;gap:8px;';
    el.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${msg}`;
    document.getElementById('loginForm').appendChild(el);
    setTimeout(() => el.remove(), 5000);
}

// ── COUNTRIES ────────────────────────────────

async function loadCountries() {
    const countries = await Auth.fetchCountries();
    ['indCountry', 'jointCountry1', 'secondCountry'].forEach(id => {
        const s = document.getElementById(id);
        if (!s) return;
        s.innerHTML = '<option value="">Select country</option>';
        countries.forEach(c => { s.innerHTML += `<option value="${c.code}">${c.name}</option>`; });
    });
}

// ── INDIVIDUAL REGISTRATION ───────────────────

window.nextIndividualStep = function(step) {
    if (step === 1 && validateStep1()) {
        individualData = {
            firstName: document.getElementById('indFirstName').value,
            lastName:  document.getElementById('indLastName').value,
            email:     document.getElementById('indEmail').value,
            password:  document.getElementById('indPassword').value,
            birthDate: document.getElementById('indBirthDate').value,
            gender:    document.getElementById('indGender').value,
            country:   document.getElementById('indCountry').options[
                           document.getElementById('indCountry').selectedIndex].text
        };
        setStepUI(1, 2);
    }
};

window.prevIndividualStep = function() { setStepUI(2, 1); };

function setStepUI(from, to) {
    document.getElementById('individualStep' + from).classList.remove('active');
    document.getElementById('individualStep' + to).classList.add('active');
    document.querySelectorAll('#individualModal .step').forEach((d, i) => {
        d.classList.remove('active', 'completed');
        if (i + 1 < to)  d.classList.add('completed');
        if (i + 1 === to) d.classList.add('active');
    });
}

function validateStep1() {
    const f  = id => document.getElementById(id)?.value || '';
    const fn = f('indFirstName'), ln = f('indLastName'), em = f('indEmail'),
          pw = f('indPassword'),  cf = f('indConfirm'),
          bd = f('indBirthDate'), gn = f('indGender'),   co = f('indCountry');
    if (!fn||!ln||!em||!pw||!cf||!bd||!gn||!co) { alert('Please fill in all fields'); return false; }
    if (pw.length < 8)    { alert('Password must be at least 8 characters'); return false; }
    if (pw !== cf)         { alert('Passwords do not match'); return false; }
    if (!em.includes('@')) { alert('Please enter a valid email'); return false; }
    return true;
}

window.processIndividualSignup = async function() {
    individualData.governmentId   = document.getElementById('govIdUrl').value;
    individualData.profilePicture = document.getElementById('profilePicUrl').value;

    if (!individualData.governmentId)   { alert('Please upload your government ID'); return; }
    if (!individualData.profilePicture) { alert('Please upload your profile picture'); return; }

    const btn = document.getElementById('indCompleteBtn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting…'; }

    const result = await Auth.signUpIndividual(individualData);

    if (result.success) {
        window.location.href = '/dashboard';
    } else {
        alert('Registration failed: ' + result.error);
        if (btn) { btn.disabled = false; btn.innerHTML = 'Complete <i class="fas fa-check"></i>'; }
    }
};

function resetIndividualForm() {
    ['indFirstName','indLastName','indEmail','indPassword','indConfirm',
     'indBirthDate','indGender','indCountry'].forEach(id => {
        const el = document.getElementById(id); if (el) el.value = '';
    });
    clearUpload('govId');
    clearUpload('profilePic');
    const step1 = document.getElementById('individualStep1');
    const step2 = document.getElementById('individualStep2');
    if (step1) step1.classList.add('active');
    if (step2) step2.classList.remove('active');
    document.querySelectorAll('#individualModal .step').forEach((d, i) => {
        d.classList.toggle('active', i === 0);
        d.classList.remove('completed');
    });
    const btn = document.getElementById('indCompleteBtn');
    if (btn) { btn.disabled = false; btn.innerHTML = 'Complete <i class="fas fa-check"></i>'; }
    individualData = {};
}

// ── JOINT REGISTRATION (User A) ──────────────

async function handleJointSubmit(e) {
    e.preventDefault();

    const pass1 = document.getElementById('jointPass1').value;
    const conf1 = document.getElementById('jointConfirm1').value;
    if (pass1 !== conf1)  { alert('Passwords do not match'); return; }
    if (pass1.length < 8) { alert('Password must be at least 8 characters'); return; }

    const required = ['jointFirst1','jointLast1','jointEmail1','jointBirth1',
                      'jointGender1','jointCountry1','jointEmail2'];
    for (const id of required) {
        if (!document.getElementById(id)?.value) { alert('Please fill in all fields'); return; }
    }

    if (!document.getElementById('jointId1Url').value)  { alert('Please upload your government ID'); return; }
    if (!document.getElementById('jointPic1Url').value) { alert('Please upload your profile picture'); return; }

    const secondUserEmail = document.getElementById('jointEmail2').value.trim();

    const primaryData = {
        firstName:      document.getElementById('jointFirst1').value,
        lastName:       document.getElementById('jointLast1').value,
        email:          document.getElementById('jointEmail1').value,
        password:       pass1,
        birthDate:      document.getElementById('jointBirth1').value,
        gender:         document.getElementById('jointGender1').value,
        country:        document.getElementById('jointCountry1').options[
                            document.getElementById('jointCountry1').selectedIndex].text,
        governmentId:   document.getElementById('jointId1Url').value,
        profilePicture: document.getElementById('jointPic1Url').value
    };

    const btn = document.getElementById('jointSubmitBtn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating account…'; }

    const result = await Auth.initJointAccount(primaryData);

    if (result.success) {
        document.getElementById('jointFormWrapper').style.display = 'none';
        document.getElementById('otpDisplay').style.display       = 'block';
        document.getElementById('jointOtp').textContent           = result.otp;

        const info = document.createElement('div');
        info.className = 'alert alert-info';
        info.style.marginBottom = '16px';
        info.innerHTML = `<i class="fas fa-info-circle"></i>
            <span>Share this OTP with <strong>${secondUserEmail}</strong>.
            They must click <em>"Complete Joint Account Setup"</em> on the login page,
            enter this OTP, then fill in their own details.</span>`;
        document.getElementById('otpDisplay').insertBefore(info, document.getElementById('otpDisplay').firstChild);
    } else {
        alert('Registration failed: ' + result.error);
        if (btn) { btn.disabled = false; btn.innerHTML = 'Create Account &amp; Get OTP'; }
    }
}

function resetJointForm() {
    ['jointFirst1','jointLast1','jointEmail1','jointPass1','jointConfirm1',
     'jointBirth1','jointGender1','jointCountry1','jointEmail2'].forEach(id => {
        const el = document.getElementById(id); if (el) el.value = '';
    });
    clearUpload('jointId1');
    clearUpload('jointPic1');
    document.getElementById('jointFormWrapper').style.display = 'block';
    document.getElementById('otpDisplay').style.display       = 'none';
    document.querySelectorAll('#otpDisplay .alert-info').forEach(el => el.remove());
    const btn = document.getElementById('jointSubmitBtn');
    if (btn) { btn.disabled = false; btn.innerHTML = 'Create Account &amp; Get OTP'; }
}

// ── OTP VERIFICATION (User B) ─────────────────

window.verifyOTP = async function() {
    const otp = document.getElementById('otpInput').value.trim();
    if (!/^\d{6}$/.test(otp)) { alert('Please enter a valid 6-digit OTP'); return; }

    const btn = document.getElementById('otpVerifyBtn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying…'; }

    try {
        const { data, error } = await window.db
            .from('joint_accounts')
            .select('id, status')
            .eq('invitation_otp', otp)
            .single();

        if (error || !data) {
            alert('Invalid OTP. Please check the code and try again.');
            if (btn) { btn.disabled = false; btn.innerHTML = 'Verify &amp; Continue <i class="fas fa-arrow-right"></i>'; }
            return;
        }
        if (data.status !== 'pending') {
            alert('This OTP has already been used — the account is already active.');
            if (btn) { btn.disabled = false; btn.innerHTML = 'Verify &amp; Continue <i class="fas fa-arrow-right"></i>'; }
            return;
        }

        currentOTP = otp;
        if (btn) { btn.disabled = false; btn.innerHTML = 'Verify &amp; Continue <i class="fas fa-arrow-right"></i>'; }
        closeModal('otpVerifyModal');
        setTimeout(() => openModal('secondUserModal'), 250);

    } catch (err) {
        alert('Error verifying OTP. Please try again.');
        if (btn) { btn.disabled = false; btn.innerHTML = 'Verify &amp; Continue <i class="fas fa-arrow-right"></i>'; }
    }
};

// ── SECOND USER REGISTRATION (User B) ────────

async function handleSecondUserSubmit(e) {
    e.preventDefault();

    const pass = document.getElementById('secondPass').value;
    const conf = document.getElementById('secondConfirm').value;
    if (pass !== conf)   { alert('Passwords do not match'); return; }
    if (pass.length < 8) { alert('Password must be at least 8 characters'); return; }

    const required = ['secondFirstName','secondLastName','secondEmail',
                      'secondBirth','secondGender','secondCountry'];
    for (const id of required) {
        if (!document.getElementById(id)?.value) { alert('Please fill in all fields'); return; }
    }

    if (!document.getElementById('secondGovIdUrl').value)     { alert('Please upload your government ID'); return; }
    if (!document.getElementById('secondProfilePicUrl').value) { alert('Please upload your profile picture'); return; }

    const userData = {
        firstName:      document.getElementById('secondFirstName').value,
        lastName:       document.getElementById('secondLastName').value,
        email:          document.getElementById('secondEmail').value,
        password:       pass,
        birthDate:      document.getElementById('secondBirth').value,
        gender:         document.getElementById('secondGender').value,
        country:        document.getElementById('secondCountry').options[
                            document.getElementById('secondCountry').selectedIndex].text,
        governmentId:   document.getElementById('secondGovIdUrl').value,
        profilePicture: document.getElementById('secondProfilePicUrl').value
    };

    const btn  = e.target.querySelector('button[type="submit"]');
    const orig = btn?.innerHTML;
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting…'; }

    const result = await Auth.completeJointAccount(currentOTP, userData);

    if (result.success) {
        window.location.href = '/dashboard';
    } else {
        alert('Registration failed: ' + result.error);
        if (btn) { btn.disabled = false; btn.innerHTML = orig; }
    }
}

function resetSecondUserForm() {
    ['secondFirstName','secondLastName','secondEmail','secondPass','secondConfirm',
     'secondBirth','secondGender','secondCountry'].forEach(id => {
        const el = document.getElementById(id); if (el) el.value = '';
    });
    clearUpload('secondGovId');
    clearUpload('secondProfilePic');
    document.getElementById('secondUserForm').style.display     = 'block';
}

// ── GO TO DASHBOARD ───────────────────────────

window.goToDashboard = function() {
    const btn = event?.target;
    if (btn?.tagName === 'BUTTON') {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Going to dashboard…';
    }
    window.location.href = '/dashboard';
};

// ── FORGOT PASSWORD ───────────────────────────

window.sendResetLink = async function() {
    const email = (document.getElementById('resetEmail') || {}).value.trim();
    if (!email) { alert('Please enter your email address'); return; }
    if (!email.includes('@')) { alert('Please enter a valid email address'); return; }

    const btn = document.getElementById('sendResetBtn');
    const statusEl = document.getElementById('forgotStatus');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending link…'; }
    if (statusEl) statusEl.innerHTML = '';

    const result = await Auth.requestPasswordReset(email);
    if (result.success) {
        if (statusEl) {
            statusEl.innerHTML = `<div class="alert alert-success" style="background:#ecfdf5;color:#065f46;border:1.5px solid #10b981;padding:14px 16px;border-radius:10px;font-size:.875rem;margin-top:14px;line-height:1.5;">
                <div style="display:flex;align-items:flex-start;gap:10px;">
                    <i class="fas fa-check-circle" style="font-size:1.25rem;color:#059669;margin-top:2px;"></i>
                    <div>
                        <div style="font-weight:700;font-size:.95rem;margin-bottom:4px;color:#064e3b;">Reset link sent successfully!</div>
                        <div>A password reset token and link have been dispatched.</div>
                        <div style="margin-top:10px;padding:10px 12px;background:#f0fdf4;border-left:4px solid #059669;border-radius:4px;font-weight:700;color:#065f46;">
                            <i class="fas fa-exclamation-circle"></i> Please check both your <u>INBOX</u> and <u>SPAM / JUNK FOLDER</u> for your reset token and link!
                        </div>
                    </div>
                </div>
            </div>`;
        }
        if (btn) { btn.disabled = false; btn.innerHTML = 'Send Reset Link <i class="fas fa-paper-plane"></i>'; }
    } else {
        if (statusEl) {
            statusEl.innerHTML = `<div class="alert alert-error" style="background:#fee2e2;color:#b91c1c;border:1px solid #fca5a5;padding:10px 14px;border-radius:8px;font-size:.875rem;margin-top:10px;">
                <i class="fas fa-exclamation-circle"></i> ${result.error}
            </div>`;
        }
        if (btn) { btn.disabled = false; btn.innerHTML = 'Send Reset Link <i class="fas fa-paper-plane"></i>'; }
    }
};

window.resetPassword = async function() {
    const np = document.getElementById('newPassword').value;
    const cf = document.getElementById('confirmPassword').value;

    const hash = window.location.hash || '';
    const isRecoverySession = hash.includes('type=recovery') || hash.includes('access_token');

    if (!resetToken && !isRecoverySession) { alert('Invalid or missing reset token. Please request a new reset link.'); return; }
    if (!np || !cf)    { alert('Please fill in both fields'); return; }
    if (np.length < 8) { alert('Password must be at least 8 characters'); return; }
    if (np !== cf)     { alert('Passwords do not match'); return; }

    const btn = document.getElementById('submitResetBtn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Resetting…'; }

    const result = await Auth.resetPassword(resetToken, np);
    if (result.success) {
        alert('Password reset successfully! Please sign in with your new password.');
        resetToken = '';
        closeModal('forgotModal');

        // Clear query parameters & hash from URL
        if (window.history && window.history.replaceState) {
            window.history.replaceState(null, '', window.location.pathname);
        }

        // Switch to login tab
        const loginTab = document.querySelector('[data-tab="login"]');
        if (loginTab) loginTab.click();
    } else {
        alert(result.error || 'Failed to reset password');
        if (btn) { btn.disabled = false; btn.innerHTML = 'Reset Password'; }
    }
};

function resetForgotForm() {
    ['resetEmail','newPassword','confirmPassword'].forEach(id => {
        const el = document.getElementById(id); if (el) el.value = '';
    });
    const statusEl = document.getElementById('forgotStatus');
    if (statusEl) statusEl.innerHTML = '';
    document.getElementById('forgotStep1').style.display = 'block';
    document.getElementById('forgotStep2').style.display = 'none';
}

// ── FILE UPLOADS ──────────────────────────────

function bindFileInputs() {
    document.querySelectorAll('input[type="file"]').forEach(input => {
        const id = input.id.replace('File', '');
        input.addEventListener('change', (e) => {
            if (e.target.files.length) handleFile(e.target.files[0], id);
        });
    });
}

window.triggerFileUpload = function(id) {
    let fi = document.getElementById(id + 'File');
    if (!fi) {
        fi = document.createElement('input');
        fi.type = 'file';
        fi.id   = id + 'File';
        fi.style.display = 'none';
        const isPic = id.toLowerCase().includes('pic') || id.toLowerCase().includes('profile');
        fi.accept = isPic ? '.jpg,.jpeg,.png' : '.jpg,.jpeg,.png,.pdf';
        document.body.appendChild(fi);
        fi.addEventListener('change', (e) => { if (e.target.files.length) handleFile(e.target.files[0], id); });
    }
    fi.value = '';
    fi.click();
};

function handleFile(file, id) {
    const isPic   = id.toLowerCase().includes('pic') || id.toLowerCase().includes('profile');
    const maxSize = isPic ? 2097152 : 5242880;
    const allowed = isPic
        ? ['image/jpeg','image/jpg','image/png']
        : ['image/jpeg','image/jpg','image/png','application/pdf'];

    if (!allowed.includes(file.type)) {
        alert(isPic ? 'Please upload a JPG or PNG image' : 'Please upload a JPG, PNG or PDF');
        return;
    }
    if (file.size > maxSize) { alert(`File must be under ${maxSize / 1048576}MB`); return; }
    showPreview(file, id);
    uploadToCloudinary(file, id);
}

function showPreview(file, id) {
    const preview = document.getElementById(id + 'Preview');
    const textEl  = document.getElementById(id + 'Text');
    if (!preview) return;
    if (textEl) textEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Preparing…';
    const reader = new FileReader();
    reader.onload = (e) => {
        const safeName = escHtml(file.name);
        const displayName = escHtml(truncateFileName(file.name, 28));
        preview.innerHTML = `
            <div class="single-preview" style="display:flex;align-items:center;gap:12px;padding:12px 14px;background:var(--bg-secondary);border:1px solid var(--border);border-radius:12px;width:100%;max-width:100%;box-sizing:border-box;overflow:hidden;position:relative;margin-top:14px;">
                ${file.type.startsWith('image/')
                    ? `<img src="${e.target.result}" alt="Preview" style="width:48px;height:48px;min-width:48px;max-width:48px;border-radius:10px;object-fit:cover;flex-shrink:0;border:1px solid var(--border);">`
                    : `<div class="file-icon-wrap" style="width:48px;height:48px;min-width:48px;max-width:48px;border-radius:10px;display:flex;align-items:center;justify-content:center;background:rgba(176,141,87,0.12);color:var(--accent);font-size:22px;flex-shrink:0;border:1px solid var(--border);"><i class="fas fa-file-pdf"></i></div>`}
                <div class="file-info" style="flex:1 1 0%;min-width:0;max-width:calc(100% - 94px);overflow:hidden;box-sizing:border-box;">
                    <div class="file-name" title="${safeName}" style="font-weight:600;font-size:0.86rem;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;width:100%;display:block;margin-bottom:2px;word-break:break-all;">${displayName}</div>
                    <div class="file-size" style="font-size:0.75rem;color:var(--text-secondary);font-variant-numeric:tabular-nums;">${fmtSize(file.size)}</div>
                    <div class="upload-progress" id="${id}Bar" style="height:5px;border-radius:4px;background:var(--border);overflow:hidden;margin-top:6px;width:100%;"><div class="progress-bar" style="width:0%;height:100%;background:linear-gradient(90deg,#b08d57,#d4af37);transition:width 0.3s ease;"></div></div>
                    <div class="progress-text" id="${id}Pct" style="display:flex;justify-content:space-between;font-size:0.75rem;color:var(--text-secondary);margin-top:4px;font-variant-numeric:tabular-nums;"><span>Uploading…</span><span>0%</span></div>
                </div>
                <button type="button" class="remove-file-btn" onclick="removeUpload('${id}')" title="Remove file" aria-label="Remove file" style="flex-shrink:0;width:32px;height:32px;border-radius:50%;border:1px solid var(--border);display:flex;align-items:center;justify-content:center;color:var(--text-secondary);background:var(--card-bg);cursor:pointer;margin-left:auto;">
                    <i class="fas fa-times"></i>
                </button>
            </div>`;
        if (textEl) textEl.style.display = 'none';
    };
    reader.readAsDataURL(file);
}

function uploadToCloudinary(file, id) {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('upload_preset', CLOUDINARY.uploadPreset);
    fd.append('cloud_name',    CLOUDINARY.cloudName);

    const xhr = new XMLHttpRequest();

    xhr.upload.onprogress = (e) => {
        if (!e.lengthComputable) return;
        const pct = Math.round(e.loaded / e.total * 100);
        const bar = document.querySelector(`#${id}Bar .progress-bar`);
        const txt = document.getElementById(id + 'Pct');
        if (bar) bar.style.width = pct + '%';
        if (txt) txt.innerHTML = `<span>Uploading…</span><span>${pct}%</span>`;
    };

    xhr.onload = () => {
        if (xhr.status === 200) {
            const url    = JSON.parse(xhr.responseText).secure_url;
            const hidden = document.getElementById(id + 'Url');
            if (hidden) hidden.value = url;
            const bar    = document.querySelector(`#${id}Bar .progress-bar`);
            const txt    = document.getElementById(id + 'Pct');
            const textEl = document.getElementById(id + 'Text');
            if (bar) { bar.style.width = '100%'; bar.style.background = 'var(--success)'; }
            if (txt) txt.innerHTML = `<span style="color:var(--success)"><i class="fas fa-check-circle"></i> Done!</span><span>100%</span>`;
            if (textEl) { textEl.style.display = 'block'; textEl.textContent = 'Click to replace'; }
        } else {
            uploadError(id);
        }
    };

    xhr.onerror = () => uploadError(id);
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUDINARY.cloudName}/auto/upload`);
    xhr.send(fd);
}

function uploadError(id) {
    const txt    = document.getElementById(id + 'Pct');
    const textEl = document.getElementById(id + 'Text');
    if (txt)    txt.innerHTML = '<span style="color:var(--error)"><i class="fas fa-exclamation-circle"></i> Upload failed</span>';
    if (textEl) { textEl.style.display = 'block'; textEl.textContent = 'Click to try again'; }
}

window.removeUpload = function(id) {
    const h = document.getElementById(id + 'Url');     if (h) h.value = '';
    const p = document.getElementById(id + 'Preview'); if (p) p.innerHTML = '';
    const f = document.getElementById(id + 'File');    if (f) f.value = '';
    const t = document.getElementById(id + 'Text');
    if (t) {
        t.style.display = 'block';
        const isPic = id.toLowerCase().includes('pic') || id.toLowerCase().includes('profile');
        t.textContent = isPic ? 'Click to upload photo' : 'Click to upload ID (JPG, PNG, PDF)';
    }
};

function clearUpload(id) { window.removeUpload(id); }

function fmtSize(b) {
    if (b < 1024)    return b + ' B';
    if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
    return (b / 1048576).toFixed(1) + ' MB';
}

function escHtml(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function truncateFileName(name, maxLen = 28) {
    if (!name || name.length <= maxLen) return name || '';
    const lastDot = name.lastIndexOf('.');
    if (lastDot > 0 && lastDot < name.length - 1) {
        const ext = name.slice(lastDot);
        const base = name.slice(0, lastDot);
        const avail = maxLen - ext.length - 3; // 3 for '...'
        if (avail > 4) {
            const front = Math.ceil(avail * 0.6);
            const back = avail - front;
            return base.slice(0, front) + '...' + (back > 0 ? base.slice(-back) : '') + ext;
        }
    }
    return name.slice(0, maxLen - 3) + '...';
}


