// ============================================
// AUTH PAGE UI CONTROLLER
// ============================================

let currentOTP  = '';
let resetToken  = '';
let individualData = {};

const CLOUDINARY = {
    cloudName:    'ddvwy00eg',
    uploadPreset: 'summit-trust-uploads'
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
});

function applyTheme() {
    const t = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', t);
    const icon = document.querySelector('#themeToggle i');
    if (icon) icon.className = t === 'light' ? 'fas fa-moon' : 'fas fa-sun';
}

async function checkSession() {
    try {
        const s = await Auth.validateSession();
        if (s) window.location.href = '/dashboard.html';
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

    // Build phrase grid when forgot modal opens
    if (id === 'forgotModal') { resetForgotForm(); buildAuthPhraseGrid(); }
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
        window.location.href = '/dashboard.html';
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
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating account…'; }

    const result = await Auth.signUpIndividual(individualData);

    if (result.success) {
        document.getElementById('individualStep2').classList.remove('active');
        document.getElementById('individualStep3').style.display = 'block';
        document.getElementById('indRecoveryPhrase').textContent = result.recoveryPhrase;
        document.querySelectorAll('#individualModal .step').forEach(d => d.classList.add('completed'));
    } else {
        alert('Registration failed: ' + result.error);
        if (btn) { btn.disabled = false; btn.innerHTML = 'Complete'; }
    }
};

window.completeIndividualSignup = function() {
    if (!document.getElementById('indConfirmSave').checked) {
        alert('Please confirm you have saved your recovery phrase');
        return;
    }
    const btn = document.getElementById('indGoDashBtn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Going to dashboard…'; }
    window.location.href = '/dashboard.html';
};

function resetIndividualForm() {
    ['indFirstName','indLastName','indEmail','indPassword','indConfirm',
     'indBirthDate','indGender','indCountry'].forEach(id => {
        const el = document.getElementById(id); if (el) el.value = '';
    });
    clearUpload('govId');
    clearUpload('profilePic');
    document.getElementById('individualStep1').classList.add('active');
    document.getElementById('individualStep2').classList.remove('active');
    document.getElementById('individualStep3').style.display = 'none';
    document.querySelectorAll('#individualModal .step').forEach((d, i) => {
        d.classList.toggle('active', i === 0);
        d.classList.remove('completed');
    });
    const btn = document.getElementById('indCompleteBtn');
    if (btn) { btn.disabled = false; btn.innerHTML = 'Complete'; }
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
        document.getElementById('primaryPhrase').textContent      = result.recoveryPhrase;

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
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Completing registration…'; }

    const result = await Auth.completeJointAccount(currentOTP, userData);

    if (result.success) {
        document.getElementById('secondUserForm').style.display     = 'none';
        document.getElementById('secondUserSecurity').style.display = 'block';
        document.getElementById('secondRecovery').textContent       = result.recoveryPhrase;
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
    document.getElementById('secondUserSecurity').style.display = 'none';
}

// ── GO TO DASHBOARD ───────────────────────────

window.goToDashboard = function() {
    const boxes = ['indConfirmSave', 'primaryConfirmSave', 'secondConfirmSave'];
    for (const id of boxes) {
        const el = document.getElementById(id);
        if (el && el.offsetParent !== null && !el.checked) {
            alert('Please confirm you have saved your recovery phrase');
            return;
        }
    }
    const btn = event?.target;
    if (btn?.tagName === 'BUTTON') {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Going to dashboard…';
    }
    window.location.href = '/dashboard.html';
};

// ── FORGOT PASSWORD ───────────────────────────

window.verifyPhrase = async function() {
    const email  = (document.getElementById('resetEmail') || {}).value.trim();
    const words  = getAuthPhraseWords();
    const phrase = words.join(' ').trim();
    if (!email)              { alert('Please enter your email'); return; }
    if (words.some(w => !w)) { alert('Please fill in all 12 recovery words'); return; }

    const result = await Auth.verifyRecoveryPhrase(email, phrase);
    if (result.success) {
        resetToken = result.resetToken;
        document.getElementById('forgotStep1').style.display = 'none';
        document.getElementById('forgotStep2').style.display = 'block';
    } else {
        alert(result.error);
    }
};

window.resetPassword = async function() {
    const np = document.getElementById('newPassword').value;
    const cf = document.getElementById('confirmPassword').value;
    if (!np || !cf)    { alert('Please fill in both fields'); return; }
    if (np.length < 8) { alert('Password must be at least 8 characters'); return; }
    if (np !== cf)     { alert('Passwords do not match'); return; }

    const result = await Auth.resetPassword(resetToken, np);
    if (result.success) {
        alert('Password reset! Please sign in with your new password.');
        closeModal('forgotModal');
    } else {
        alert(result.error);
    }
};

function resetForgotForm() {
    ['resetEmail','newPassword','confirmPassword'].forEach(id => {
        const el = document.getElementById(id); if (el) el.value = '';
    });
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
        preview.innerHTML = `
            <div class="single-preview">
                ${file.type.startsWith('image/')
                    ? `<img src="${e.target.result}" alt="Preview">`
                    : `<i class="fas fa-file-pdf" style="font-size:36px;color:var(--error)"></i>`}
                <div class="file-info">
                    <div class="file-name">${file.name}</div>
                    <div class="file-size">${fmtSize(file.size)}</div>
                    <div class="upload-progress" id="${id}Bar"><div class="progress-bar" style="width:0%"></div></div>
                    <div class="progress-text" id="${id}Pct"><span>Uploading…</span><span>0%</span></div>
                </div>
                <i class="fas fa-times remove-file" onclick="removeUpload('${id}')"></i>
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

// ── AUTH PHRASE GRID ──────────────────────────

function buildAuthPhraseGrid() {
    const container = document.getElementById('forgotPhraseGrid');
    if (!container) return;
    let html = '';
    for (let i = 1; i <= 12; i++) {
        html += `<div class="phrase-cell">
            <span class="phrase-num">${i}</span>
            <input type="text" id="authPhrase_${i}" autocomplete="off"
                spellcheck="false" autocorrect="off" autocapitalize="off"
                placeholder="word" onkeydown="authPhraseNav(event,${i})">
        </div>`;
    }
    container.innerHTML = html;
    setTimeout(() => document.getElementById('authPhrase_1')?.focus(), 100);
}

function authPhraseNav(e, idx) {
    if (e.key === ' ' || e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        document.getElementById('authPhrase_' + (idx + 1))?.focus();
    }
}

function getAuthPhraseWords() {
    const words = [];
    for (let i = 1; i <= 12; i++) {
        const el = document.getElementById('authPhrase_' + i);
        words.push(el ? el.value.trim().toLowerCase() : '');
    }
    return words;
}