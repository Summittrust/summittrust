// ============================================
// BLUVAULT AUTH PAGE UI CONTROLLER
// ============================================

let individualData = {};
let resetToken = '';
let pendingJointAccount = null;

const CLOUDINARY = {
    cloudName: 'ddvwy00eg',
    uploadPreset: 'phontos'
};

// ── INIT ─────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
    if (!window.Auth) { console.error('Auth not loaded'); return; }
    if (!window.db) { console.error('Supabase not loaded'); return; }

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
    } catch (_) { }
}

function bindEvents() {
    document.getElementById('loginForm')?.addEventListener('submit', handleLogin);
    document.getElementById('jointPrimaryForm')?.addEventListener('submit', handleJointSubmit);
    document.getElementById('joinCompleteForm')?.addEventListener('submit', handleJoinCompleteSubmit);

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
    const authContainer = document.getElementById('authContainer');
    if (authContainer) {
        authContainer.style.opacity = '0.3';
        authContainer.style.pointerEvents = 'none';
    }
    m.classList.add('active');
    document.body.style.overflow = 'hidden';

    if (id === 'forgotModal') { resetForgotForm(); buildAuthPhraseGrid(); }
};

window.closeModal = function(id) {
    const m = document.getElementById(id);
    if (!m) return;
    m.classList.remove('active');
    const authContainer = document.getElementById('authContainer');
    if (authContainer) {
        authContainer.style.opacity = '1';
        authContainer.style.pointerEvents = 'auto';
    }
    document.body.style.overflow = '';

    if (id === 'individualModal') resetIndividualForm();
    if (id === 'jointModal') resetJointForm();
    if (id === 'joinJointModal') resetJoinModal();
    if (id === 'forgotModal') resetForgotForm();
};

window.openIndividualForm = function() {
    closeModal('accountTypeModal');
    setTimeout(() => openModal('individualModal'), 250);
};

window.openJointForm = function() {
    closeModal('accountTypeModal');
    setTimeout(() => openModal('jointModal'), 250);
};

// ── LOGIN ─────────────────────────────────────

async function handleLogin(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const orig = btn?.innerHTML;
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in...'; }

    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const result = await Auth.login(email, password);

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
    el.style.cssText = 'background:#fee2e2;color:#b91c1c;border:1px solid #fca5a5;border-radius:8px;padding:10px 14px;margin-top:12px;font-size:.875rem;display:flex;align-items:center;gap:8px;';
    el.innerHTML = '<i class="fas fa-exclamation-circle"></i> ' + msg;
    document.getElementById('loginForm').appendChild(el);
    setTimeout(() => el.remove(), 5000);
}

// ── COUNTRIES ────────────────────────────────

async function loadCountries() {
    const countries = await Auth.fetchCountries();
    ['indCountry', 'jointCountry1', 'joinCountry'].forEach(id => {
        const s = document.getElementById(id);
        if (!s) return;
        s.innerHTML = '<option value="">Select country</option>';
        countries.forEach(c => { s.innerHTML += '<option value="' + c.code + '">' + c.name + '</option>'; });
    });
}

// ── INDIVIDUAL REGISTRATION ───────────────────

window.nextIndividualStep = function(step) {
    if (step === 1 && validateStep1()) {
        individualData = {
            firstName: document.getElementById('indFirstName').value,
            lastName: document.getElementById('indLastName').value,
            email: document.getElementById('indEmail').value,
            phoneNumber: document.getElementById('indPhone').value,
            password: document.getElementById('indPassword').value,
            birthDate: document.getElementById('indBirthDate').value,
            gender: document.getElementById('indGender').value,
            country: document.getElementById('indCountry').options[
                document.getElementById('indCountry').selectedIndex]?.text || ''
        };
        setStepUI(1, 2);
    }
};

window.prevIndividualStep = function() { setStepUI(2, 1); };

function setStepUI(from, to) {
    const step1 = document.getElementById('individualStep1');
    const step2 = document.getElementById('individualStep2');
    if (step1) step1.classList.remove('active');
    if (step2) step2.classList.remove('active');
    
    if (to === 1 && step1) step1.classList.add('active');
    if (to === 2 && step2) step2.classList.add('active');
    
    const steps = document.querySelectorAll('#individualModal .step');
    steps.forEach((d, i) => {
        d.classList.remove('active', 'completed');
        if (i + 1 < to) d.classList.add('completed');
        if (i + 1 === to) d.classList.add('active');
    });
}

function validateStep1() {
    const getVal = (id) => document.getElementById(id)?.value || '';
    const fn = getVal('indFirstName');
    const ln = getVal('indLastName');
    const em = getVal('indEmail');
    const ph = getVal('indPhone');
    const pw = getVal('indPassword');
    const cf = getVal('indConfirm');
    const bd = getVal('indBirthDate');
    const gn = getVal('indGender');
    const co = getVal('indCountry');
    
    if (!fn || !ln || !em || !ph || !pw || !cf || !bd || !gn || !co) {
        alert('Please fill in all fields');
        return false;
    }
    if (pw.length < 8) {
        alert('Password must be at least 8 characters');
        return false;
    }
    if (pw !== cf) {
        alert('Passwords do not match');
        return false;
    }
    if (!em.includes('@')) {
        alert('Please enter a valid email');
        return false;
    }
    if (!ph.match(/^[\+]?[\d\s\-\(\)]+$/) || ph.replace(/[\s\-\(\)]/g, '').length < 10) {
        alert('Please enter a valid phone number (minimum 10 digits)');
        return false;
    }
    return true;
}

window.processIndividualSignup = async function() {
    individualData.profilePicture = document.getElementById('profilePicUrl').value;

    if (!individualData.profilePicture) {
        alert('Please upload your profile picture');
        return;
    }

    const btn = document.getElementById('indCompleteBtn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating account...'; }

    const result = await Auth.signUpIndividual(individualData);

    if (result.success) {
        const step2 = document.getElementById('individualStep2');
        const step3 = document.getElementById('individualStep3');
        const recoveryPhrase = document.getElementById('indRecoveryPhrase');
        if (step2) step2.classList.remove('active');
        if (step3) step3.style.display = 'block';
        if (recoveryPhrase) recoveryPhrase.textContent = result.recoveryPhrase;
        
        const steps = document.querySelectorAll('#individualModal .step');
        steps.forEach(d => d.classList.add('completed'));
    } else {
        alert('Registration failed: ' + result.error);
        if (btn) { btn.disabled = false; btn.innerHTML = 'Complete'; }
    }
};

window.completeIndividualSignup = function() {
    const confirmBox = document.getElementById('indConfirmSave');
    if (!confirmBox.checked) {
        alert('Please confirm you have saved your recovery phrase');
        return;
    }
    const btn = document.getElementById('indGoDashBtn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Going to dashboard...'; }
    window.location.href = '/dashboard.html';
};

function resetIndividualForm() {
    const fields = ['indFirstName', 'indLastName', 'indEmail', 'indPhone', 'indPassword', 'indConfirm',
        'indBirthDate', 'indGender', 'indCountry'];
    fields.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    clearUpload('profilePic');
    
    const step1 = document.getElementById('individualStep1');
    const step2 = document.getElementById('individualStep2');
    const step3 = document.getElementById('individualStep3');
    if (step1) step1.classList.add('active');
    if (step2) step2.classList.remove('active');
    if (step3) step3.style.display = 'none';
    
    const steps = document.querySelectorAll('#individualModal .step');
    steps.forEach((d, i) => {
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
    if (pass1 !== conf1) { alert('Passwords do not match'); return; }
    if (pass1.length < 8) { alert('Password must be at least 8 characters'); return; }

    const required = ['jointFirst1', 'jointLast1', 'jointEmail1', 'jointPhone1', 'jointBirth1',
        'jointGender1', 'jointCountry1', 'jointEmail2', 'jointPhone2'];
    for (const id of required) {
        if (!document.getElementById(id)?.value) {
            alert('Please fill in all fields');
            return;
        }
    }

    if (!document.getElementById('jointPic1Url').value) {
        alert('Please upload your profile picture');
        return;
    }

    const countrySelect = document.getElementById('jointCountry1');
    const primaryData = {
        firstName: document.getElementById('jointFirst1').value,
        lastName: document.getElementById('jointLast1').value,
        email: document.getElementById('jointEmail1').value,
        phoneNumber: document.getElementById('jointPhone1').value,
        password: pass1,
        birthDate: document.getElementById('jointBirth1').value,
        gender: document.getElementById('jointGender1').value,
        country: countrySelect.options[countrySelect.selectedIndex]?.text || '',
        profilePicture: document.getElementById('jointPic1Url').value,
        secondUserEmail: document.getElementById('jointEmail2').value,
        secondUserPhone: document.getElementById('jointPhone2').value
    };

    const btn = document.getElementById('jointSubmitBtn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating account...'; }

    const result = await Auth.initJointAccount(primaryData);

    if (result.success) {
        const formWrapper = document.getElementById('jointFormWrapper');
        const otpDisplay = document.getElementById('otpDisplay');
        const jointOtp = document.getElementById('jointOtp');
        const primaryPhrase = document.getElementById('primaryPhrase');
        
        if (formWrapper) formWrapper.style.display = 'none';
        if (otpDisplay) otpDisplay.style.display = 'block';
        if (jointOtp) jointOtp.textContent = result.otp;
        if (primaryPhrase) primaryPhrase.textContent = result.recoveryPhrase;
    } else {
        alert('Registration failed: ' + result.error);
        if (btn) { btn.disabled = false; btn.innerHTML = 'Create Account & Get OTP'; }
    }
}

function resetJointForm() {
    const fields = ['jointFirst1', 'jointLast1', 'jointEmail1', 'jointPhone1', 'jointPass1', 'jointConfirm1',
        'jointBirth1', 'jointGender1', 'jointCountry1', 'jointEmail2', 'jointPhone2'];
    fields.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    clearUpload('jointPic1');
    
    const formWrapper = document.getElementById('jointFormWrapper');
    const otpDisplay = document.getElementById('otpDisplay');
    if (formWrapper) formWrapper.style.display = 'block';
    if (otpDisplay) otpDisplay.style.display = 'none';
    
    const btn = document.getElementById('jointSubmitBtn');
    if (btn) { btn.disabled = false; btn.innerHTML = 'Create Account & Get OTP'; }
}

// ── OTP VERIFICATION AND FORM SHOW (User B) ─────────────────

window.verifyAndShowForm = async function() {
    const otp = document.getElementById('joinOtp').value.trim();
    const email = document.getElementById('joinEmail').value.trim();
    const phone = document.getElementById('joinPhone').value.trim();
    
    if (!/^\d{6}$/.test(otp)) { alert('Please enter a valid 6-digit OTP'); return; }
    if (!email) { alert('Please enter your email'); return; }
    if (!phone) { alert('Please enter your phone number'); return; }

    const btn = document.getElementById('joinVerifyBtn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying...'; }

    try {
        const { data: jointAccount, error } = await window.db
            .from('joint_accounts')
            .select('id, status, secondary_user_email, secondary_user_phone')
            .eq('invitation_otp', otp)
            .eq('secondary_user_email', email.toLowerCase())
            .eq('secondary_user_phone', phone)
            .eq('status', 'pending')
            .single();

        if (error || !jointAccount) {
            alert('Invalid OTP or credentials. Please check with the account owner.');
            if (btn) { btn.disabled = false; btn.innerHTML = 'Verify & Continue'; }
            return;
        }

        pendingJointAccount = jointAccount;
        
        const joinEmailReadonly = document.getElementById('joinEmailReadonly');
        const joinPhoneReadonly = document.getElementById('joinPhoneReadonly');
        if (joinEmailReadonly) {
            joinEmailReadonly.value = jointAccount.secondary_user_email || '';
        }
        if (joinPhoneReadonly) {
            joinPhoneReadonly.value = jointAccount.secondary_user_phone || '';
        }
        
        const joinPassword = document.getElementById('joinPassword');
        const joinConfirmPassword = document.getElementById('joinConfirmPassword');
        if (joinPassword) joinPassword.value = '';
        if (joinConfirmPassword) joinConfirmPassword.value = '';
        
        document.getElementById('joinStep1').style.display = 'none';
        document.getElementById('joinStep2').style.display = 'block';
        
        if (btn) { btn.disabled = false; btn.innerHTML = 'Verify & Continue'; }

    } catch (err) {
        console.error('OTP verification error:', err);
        alert('Error verifying OTP. Please try again.');
        if (btn) { btn.disabled = false; btn.innerHTML = 'Verify & Continue'; }
    }
};

// ── COMPLETE JOINT REGISTRATION (User B) ─────

async function handleJoinCompleteSubmit(e) {
    e.preventDefault();

    if (!pendingJointAccount) {
        alert('Please verify your OTP first');
        return;
    }

    const pass = document.getElementById('joinPassword').value;
    const conf = document.getElementById('joinConfirmPassword').value;
    if (pass !== conf) { alert('Passwords do not match'); return; }
    if (pass.length < 8) { alert('Password must be at least 8 characters'); return; }

    const required = ['joinFirstName', 'joinLastName', 'joinBirth', 'joinGender', 'joinCountry'];
    for (const id of required) {
        if (!document.getElementById(id)?.value) {
            alert('Please fill in all fields');
            return;
        }
    }

    if (!document.getElementById('joinPicUrl').value) {
        alert('Please upload your profile picture');
        return;
    }

    const countrySelect = document.getElementById('joinCountry');
    const userData = {
        firstName: document.getElementById('joinFirstName').value,
        lastName: document.getElementById('joinLastName').value,
        email: document.getElementById('joinEmailReadonly').value,
        phoneNumber: document.getElementById('joinPhoneReadonly').value,
        password: pass,
        birthDate: document.getElementById('joinBirth').value,
        gender: document.getElementById('joinGender').value,
        country: countrySelect.options[countrySelect.selectedIndex]?.text || '',
        profilePicture: document.getElementById('joinPicUrl').value
    };

    const btn = e.target.querySelector('button[type="submit"]');
    const orig = btn?.innerHTML;
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Completing registration...'; }

    const result = await Auth.completeJointAccount(
        pendingJointAccount.id,
        userData,
        pendingJointAccount.secondary_user_email,
        pendingJointAccount.secondary_user_phone
    );

    if (result.success) {
        const form = document.getElementById('joinCompleteForm');
        const security = document.getElementById('joinSecurity');
        const recovery = document.getElementById('joinRecovery');
        if (form) form.style.display = 'none';
        if (security) security.style.display = 'block';
        if (recovery) recovery.textContent = result.recoveryPhrase;
    } else {
        alert('Registration failed: ' + result.error);
        if (btn) { btn.disabled = false; btn.innerHTML = orig; }
    }
}

function resetJoinModal() {
    document.getElementById('joinStep1').style.display = 'block';
    document.getElementById('joinStep2').style.display = 'none';
    
    const joinOtp = document.getElementById('joinOtp');
    const joinEmail = document.getElementById('joinEmail');
    const joinPhone = document.getElementById('joinPhone');
    if (joinOtp) joinOtp.value = '';
    if (joinEmail) joinEmail.value = '';
    if (joinPhone) joinPhone.value = '';
    
    const fields = ['joinFirstName', 'joinLastName', 'joinPassword', 'joinConfirmPassword',
        'joinBirth', 'joinGender', 'joinCountry'];
    fields.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    
    const joinEmailReadonly = document.getElementById('joinEmailReadonly');
    const joinPhoneReadonly = document.getElementById('joinPhoneReadonly');
    if (joinEmailReadonly) joinEmailReadonly.value = '';
    if (joinPhoneReadonly) joinPhoneReadonly.value = '';
    
    clearUpload('joinPic');
    
    const form = document.getElementById('joinCompleteForm');
    const security = document.getElementById('joinSecurity');
    if (form) form.style.display = 'block';
    if (security) security.style.display = 'none';
    
    pendingJointAccount = null;
}

window.completeJoinSignup = function() {
    const confirmBox = document.getElementById('joinConfirmSave');
    if (!confirmBox.checked) {
        alert('Please confirm you have saved your recovery phrase');
        return;
    }
    window.location.href = '/dashboard.html';
};

// ── GO TO DASHBOARD ───────────────────────────

window.goToDashboard = function() {
    const confirmBoxes = ['indConfirmSave', 'primaryConfirmSave', 'joinConfirmSave'];
    for (const id of confirmBoxes) {
        const el = document.getElementById(id);
        if (el && el.offsetParent !== null && !el.checked) {
            alert('Please confirm you have saved your recovery phrase');
            return;
        }
    }
    window.location.href = '/dashboard.html';
};

// ── FORGOT PASSWORD ───────────────────────────

window.verifyPhrase = async function() {
    const email = document.getElementById('resetEmail')?.value.trim();
    const words = getAuthPhraseWords();
    const phrase = words.join(' ').trim();
    if (!email) { alert('Please enter your email'); return; }
    if (words.some(w => !w)) { alert('Please fill in all 12 recovery words'); return; }

    const result = await Auth.verifyRecoveryPhrase(email, phrase);
    if (result.success) {
        resetToken = result.resetToken;
        const step1 = document.getElementById('forgotStep1');
        const step2 = document.getElementById('forgotStep2');
        if (step1) step1.style.display = 'none';
        if (step2) step2.style.display = 'block';
    } else {
        alert(result.error);
    }
};

window.resetPassword = async function() {
    const np = document.getElementById('newPassword').value;
    const cf = document.getElementById('confirmPassword').value;
    if (!np || !cf) { alert('Please fill in both fields'); return; }
    if (np.length < 8) { alert('Password must be at least 8 characters'); return; }
    if (np !== cf) { alert('Passwords do not match'); return; }

    const result = await Auth.resetPassword(resetToken, np);
    if (result.success) {
        alert('Password reset! Please sign in with your new password.');
        closeModal('forgotModal');
    } else {
        alert(result.error);
    }
};

function resetForgotForm() {
    const fields = ['resetEmail', 'newPassword', 'confirmPassword'];
    fields.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    const step1 = document.getElementById('forgotStep1');
    const step2 = document.getElementById('forgotStep2');
    if (step1) step1.style.display = 'block';
    if (step2) step2.style.display = 'none';
}

// ── FILE UPLOADS (Profile Picture Only) ──────

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
        fi.id = id + 'File';
        fi.style.display = 'none';
        fi.accept = '.jpg,.jpeg,.png';
        document.body.appendChild(fi);
        fi.addEventListener('change', (e) => { if (e.target.files.length) handleFile(e.target.files[0], id); });
    }
    fi.value = '';
    fi.click();
};

function handleFile(file, id) {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowed.includes(file.type)) {
        alert('Please upload a JPG or PNG image');
        return;
    }
    if (file.size > 2097152) {
        alert('File must be under 2MB');
        return;
    }
    showPreview(file, id);
    uploadToCloudinary(file, id);
}

function showPreview(file, id) {
    const preview = document.getElementById(id + 'Preview');
    const textEl = document.getElementById(id + 'Text');
    if (!preview) return;
    if (textEl) textEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Preparing...';
    
    const reader = new FileReader();
    reader.onload = (e) => {
        preview.innerHTML = '<div class="single-preview">' +
            '<img src="' + e.target.result + '" alt="Preview">' +
            '<div class="file-info">' +
            '<div class="file-name">' + file.name + '</div>' +
            '<div class="file-size">' + fmtSize(file.size) + '</div>' +
            '<div class="upload-progress" id="' + id + 'Bar"><div class="progress-bar" style="width:0%"></div></div>' +
            '<div class="progress-text" id="' + id + 'Pct"><span>Uploading...</span><span>0%</span></div>' +
            '</div>' +
            '<i class="fas fa-times remove-file" onclick="removeUpload(\'' + id + '\')"></i>' +
            '</div>';
        if (textEl) textEl.style.display = 'none';
    };
    reader.readAsDataURL(file);
}

function uploadToCloudinary(file, id) {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('upload_preset', CLOUDINARY.uploadPreset);
    fd.append('cloud_name', CLOUDINARY.cloudName);

    const xhr = new XMLHttpRequest();

    xhr.upload.onprogress = (e) => {
        if (!e.lengthComputable) return;
        const pct = Math.round(e.loaded / e.total * 100);
        const bar = document.querySelector('#' + id + 'Bar .progress-bar');
        const txt = document.getElementById(id + 'Pct');
        if (bar) bar.style.width = pct + '%';
        if (txt) txt.innerHTML = '<span>Uploading...</span><span>' + pct + '%</span>';
    };

    xhr.onload = () => {
        if (xhr.status === 200) {
            const url = JSON.parse(xhr.responseText).secure_url;
            const hidden = document.getElementById(id + 'Url');
            if (hidden) hidden.value = url;
            const bar = document.querySelector('#' + id + 'Bar .progress-bar');
            const txt = document.getElementById(id + 'Pct');
            const textEl = document.getElementById(id + 'Text');
            if (bar) { bar.style.width = '100%'; bar.style.background = 'var(--success)'; }
            if (txt) txt.innerHTML = '<span style="color:var(--success)"><i class="fas fa-check-circle"></i> Done!</span><span>100%</span>';
            if (textEl) { textEl.style.display = 'block'; textEl.textContent = 'Click to replace'; }
        } else {
            uploadError(id);
        }
    };

    xhr.onerror = () => uploadError(id);
    xhr.open('POST', 'https://api.cloudinary.com/v1_1/' + CLOUDINARY.cloudName + '/auto/upload');
    xhr.send(fd);
}

function uploadError(id) {
    const txt = document.getElementById(id + 'Pct');
    const textEl = document.getElementById(id + 'Text');
    if (txt) txt.innerHTML = '<span style="color:var(--error)"><i class="fas fa-exclamation-circle"></i> Upload failed</span>';
    if (textEl) { textEl.style.display = 'block'; textEl.textContent = 'Click to try again'; }
}

window.removeUpload = function(id) {
    const h = document.getElementById(id + 'Url');
    if (h) h.value = '';
    const p = document.getElementById(id + 'Preview');
    if (p) p.innerHTML = '';
    const f = document.getElementById(id + 'File');
    if (f) f.value = '';
    const t = document.getElementById(id + 'Text');
    if (t) {
        t.style.display = 'block';
        t.textContent = 'Click to upload photo';
    }
};

function clearUpload(id) { window.removeUpload(id); }

function fmtSize(b) {
    if (b < 1024) return b + ' B';
    if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
    return (b / 1048576).toFixed(1) + ' MB';
}

// ── AUTH PHRASE GRID ──────────────────────────

function buildAuthPhraseGrid() {
    const container = document.getElementById('forgotPhraseGrid');
    if (!container) return;
    let html = '';
    for (let i = 1; i <= 12; i++) {
        html += '<div class="phrase-cell">' +
            '<span class="phrase-num">' + i + '</span>' +
            '<input type="text" id="authPhrase_' + i + '" autocomplete="off"' +
            ' spellcheck="false" autocorrect="off" autocapitalize="off"' +
            ' placeholder="word" onkeydown="authPhraseNav(event,' + i + ')">' +
            '</div>';
    }
    container.innerHTML = html;
    setTimeout(() => document.getElementById('authPhrase_1')?.focus(), 100);
}

window.authPhraseNav = function(e, idx) {
    if (e.key === ' ' || e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        document.getElementById('authPhrase_' + (idx + 1))?.focus();
    }
};

function getAuthPhraseWords() {
    const words = [];
    for (let i = 1; i <= 12; i++) {
        const el = document.getElementById('authPhrase_' + i);
        words.push(el ? el.value.trim().toLowerCase() : '');
    }
    return words;
}