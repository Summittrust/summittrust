// ============================================
// SUMMIT TRUST AUTH PAGE UI CONTROLLER
// ============================================

let individualData = {};
let pendingJointAccount = null;

const CLOUDINARY = {
    cloudName: 'ddvwy00eg',
    uploadPreset: 'summit-trust-uploads'
};

// ── MODAL HELPERS ─────────────────────────────

window.openModal = function(id) {
    const m = document.getElementById(id);
    if (!m) return;
    const authContainer = document.getElementById('authContainer');
    if (authContainer) {
        authContainer.style.opacity = '0.3';
        authContainer.style.pointerEvents = 'none';
    }
    m.classList.add('active');
    document.body.style.overflow = 'hidden';
    if (id === 'forgotModal') { resetForgotForm(); }
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
    if (id === 'secondUserModal') resetSecondUserModal();
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

document.getElementById('loginForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    
    if (!email) { alert('Please enter your email'); return; }
    if (!password) { alert('Please enter your password'); return; }
    
    const btn = this.querySelector('button[type="submit"]');
    const orig = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in...';
    
    try {
        if (!window.Auth) { throw new Error('Auth system not loaded'); }
        const result = await window.Auth.login(email, password);
        if (result.success) {
            window.location.href = '/dashboard.html';
        } else {
            alert('Login failed: ' + result.error);
            btn.disabled = false;
            btn.innerHTML = orig;
        }
    } catch(err) {
        alert('Login error: ' + err.message);
        btn.disabled = false;
        btn.innerHTML = orig;
    }
});

// ── INDIVIDUAL REGISTRATION (Single Step, Regular Password) ──

function validateStep1() {
    const firstName = document.getElementById('indFirstName').value.trim();
    const lastName = document.getElementById('indLastName').value.trim();
    const email = document.getElementById('indEmail').value.trim();
    const phone = document.getElementById('indPhone').value.trim();
    const password = document.getElementById('indPassword').value;
    const confirm = document.getElementById('indConfirm').value;
    const birthDate = document.getElementById('indBirthDate').value;
    const gender = document.getElementById('indGender').value;
    const country = document.getElementById('indCountry').value;
    const profilePic = document.getElementById('profilePicUrl').value;
    
    if (!firstName) { alert('First name is required'); return false; }
    if (!lastName) { alert('Last name is required'); return false; }
    if (!email) { alert('Email address is required'); return false; }
    if (!email.includes('@')) { alert('Please enter a valid email address'); return false; }
    if (!phone) { alert('Phone number is required'); return false; }
    if (!password) { alert('Password is required'); return false; }
    if (password.length < 6) { alert('Password must be at least 6 characters'); return false; }
    if (password !== confirm) { alert('Passwords do not match'); return false; }
    if (!birthDate) { alert('Date of birth is required'); return false; }
    if (!gender) { alert('Please select your gender'); return false; }
    if (!country) { alert('Please select your country'); return false; }
    if (!profilePic) { alert('Please upload a profile picture'); return false; }
    
    return true;
}

window.processIndividualSignup = async function() {
    if (!validateStep1()) return;
    
    individualData = {
        firstName: document.getElementById('indFirstName').value.trim(),
        lastName: document.getElementById('indLastName').value.trim(),
        email: document.getElementById('indEmail').value.trim(),
        phoneNumber: document.getElementById('indPhone').value.trim(),
        password: document.getElementById('indPassword').value,
        birthDate: document.getElementById('indBirthDate').value,
        gender: document.getElementById('indGender').value,
        country: document.getElementById('indCountry').options[document.getElementById('indCountry').selectedIndex]?.text || '',
        profilePicture: document.getElementById('profilePicUrl').value
    };
    
    const btn = document.getElementById('indCompleteBtn');
    if (btn) { 
        btn.disabled = true; 
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating account...'; 
    }
    
    try {
        if (!window.Auth) { throw new Error('Auth system not loaded'); }
        
        const result = await window.Auth.signUpIndividual(individualData);
        
        if (result.success) {
            window.location.href = '/dashboard.html';
        } else {
            alert('Registration failed: ' + result.error);
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = 'Create Account';
            }
        }
    } catch(err) {
        alert('Error: ' + err.message);
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = 'Create Account';
        }
    }
};

window.goToSecurityStep = window.processIndividualSignup;
window.completeIndividualSignup = function() {
    window.location.href = '/dashboard.html';
};

function resetIndividualForm() {
    const inputs = ['indFirstName', 'indLastName', 'indEmail', 'indPhone', 'indPassword', 'indConfirm', 'indBirthDate', 'indGender', 'indCountry'];
    inputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    
    // Reset file upload
    const profileUrl = document.getElementById('profilePicUrl');
    if (profileUrl) profileUrl.value = '';
    const profilePreview = document.getElementById('profilePicPreview');
    if (profilePreview) profilePreview.innerHTML = '';
    const profileText = document.getElementById('profilePicText');
    if (profileText) profileText.innerHTML = 'Click to upload your photo';
    
    // Reset buttons
    const completeBtn = document.getElementById('indCompleteBtn');
    if (completeBtn) {
        completeBtn.disabled = false;
        completeBtn.innerHTML = 'Create Account';
    }
    
    individualData = {};
}

// ── FILE UPLOAD ─────────────────────────────

window.triggerFileUpload = function(id) {
    const fileInput = document.getElementById(id + 'File');
    if (fileInput) {
        fileInput.value = '';
        fileInput.click();
    }
};

// Initialize file input listeners
document.getElementById('profilePicFile')?.addEventListener('change', function(e) {
    if (e.target.files.length) handleFileUpload(e.target.files[0], 'profilePic');
});
document.getElementById('jointPic1File')?.addEventListener('change', function(e) {
    if (e.target.files.length) handleFileUpload(e.target.files[0], 'jointPic1');
});
document.getElementById('joinPicFile')?.addEventListener('change', function(e) {
    if (e.target.files.length) handleFileUpload(e.target.files[0], 'joinPic');
});

async function handleFileUpload(file, id) {
    if (!file) return;
    
    if (!file.type.match('image.*')) {
        alert('Please upload a JPG or PNG image');
        return;
    }
    
    if (file.size > 2 * 1024 * 1024) {
        alert('File must be under 2MB');
        return;
    }
    
    const textEl = document.getElementById(id + 'Text');
    if (textEl) textEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY.uploadPreset);
    
    try {
        const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY.cloudName}/image/upload`, {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.secure_url) {
            document.getElementById(id + 'Url').value = data.secure_url;
            
            const preview = document.getElementById(id + 'Preview');
            if (preview) {
                preview.innerHTML = `<div style="margin-top:10px;"><img src="${data.secure_url}" style="width:80px;height:80px;border-radius:50%;object-fit:cover;"></div>`;
            }
            
            if (textEl) textEl.innerHTML = 'Photo uploaded! Click to change';
        } else {
            throw new Error('Upload failed');
        }
    } catch(err) {
        console.error('Upload error:', err);
        if (textEl) textEl.innerHTML = 'Upload failed. Click to retry';
        alert('Failed to upload image');
    }
}

// ── JOINT REGISTRATION ─────────────────────────

async function handleJointSubmit(e) {
    e.preventDefault();
    const pass1 = document.getElementById('jointPass1')?.value;
    const conf1 = document.getElementById('jointConfirm1')?.value;
    if (pass1 !== conf1) { alert('Passwords do not match'); return; }
    if (pass1.length < 6) { alert('Password must be at least 6 characters'); return; }

    const primaryData = {
        firstName: document.getElementById('jointFirst1')?.value.trim(),
        lastName: document.getElementById('jointLast1')?.value.trim(),
        email: document.getElementById('jointEmail1')?.value.trim(),
        phoneNumber: document.getElementById('jointPhone1')?.value.trim(),
        password: pass1,
        birthDate: document.getElementById('jointBirth1')?.value,
        gender: document.getElementById('jointGender1')?.value,
        country: document.getElementById('jointCountry1')?.options[document.getElementById('jointCountry1')?.selectedIndex]?.text || '',
        profilePicture: document.getElementById('jointPic1Url')?.value || '',
        secondUserEmail: document.getElementById('jointEmail2')?.value.trim(),
        secondUserPhone: document.getElementById('jointPhone2')?.value.trim()
    };

    const submitBtn = e.target.querySelector('button[type="submit"]');
    if (submitBtn) { submitBtn.disabled = true; submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...'; }

    try {
        const res = await window.Auth.initJointAccount(primaryData);
        if (res.success) {
            document.getElementById('jointFormWrapper').style.display = 'none';
            const otpDisplay = document.getElementById('otpDisplay');
            if (otpDisplay) otpDisplay.style.display = 'block';
            const otpCode = document.getElementById('jointOtp');
            if (otpCode) otpCode.textContent = res.otp;
        } else {
            alert('Failed to create joint account: ' + res.error);
            if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = 'Create Account & Get OTP'; }
        }
    } catch(err) {
        alert('Error: ' + err.message);
        if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = 'Create Account & Get OTP'; }
    }
}

document.getElementById('jointPrimaryForm')?.addEventListener('submit', handleJointSubmit);

function resetJointForm() {
    const f = document.getElementById('jointPrimaryForm');
    if (f) f.reset();
    const wrapper = document.getElementById('jointFormWrapper');
    if (wrapper) wrapper.style.display = 'block';
    const otpDisplay = document.getElementById('otpDisplay');
    if (otpDisplay) otpDisplay.style.display = 'none';
}

function resetSecondUserModal() {
    const f = document.getElementById('secondUserForm');
    if (f) f.reset();
}

window.verifyOTP = async function() {
    const otp = document.getElementById('otpInput')?.value.trim();
    const email = document.getElementById('otpEmail')?.value.trim();
    const phone = document.getElementById('otpPhone')?.value.trim();
    if (!otp || !email || !phone) { alert('Please enter OTP, email, and phone number'); return; }

    try {
        const { data: joint, error } = await window.db
            .from('joint_accounts')
            .select('*')
            .eq('invitation_otp', otp)
            .eq('secondary_user_email', email.toLowerCase())
            .eq('secondary_user_phone', phone)
            .eq('status', 'pending')
            .single();

        if (error || !joint) {
            alert('Invalid OTP or matching details');
            return;
        }

        pendingJointAccount = joint;
        closeModal('otpVerifyModal');
        const secondEmail = document.getElementById('secondEmail');
        if (secondEmail) secondEmail.value = email;
        openModal('secondUserModal');
    } catch (err) {
        alert('Error verifying OTP: ' + err.message);
    }
};

document.getElementById('secondUserForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    if (!pendingJointAccount) { alert('No pending joint account found'); return; }

    const pass = document.getElementById('secondPass')?.value;
    const conf = document.getElementById('secondConfirm')?.value;
    if (pass !== conf) { alert('Passwords do not match'); return; }
    if (pass.length < 6) { alert('Password must be at least 6 characters'); return; }

    const userData = {
        firstName: document.getElementById('secondFirstName')?.value.trim(),
        lastName: document.getElementById('secondLastName')?.value.trim(),
        password: pass,
        birthDate: document.getElementById('secondBirth')?.value,
        gender: document.getElementById('secondGender')?.value,
        country: document.getElementById('secondCountry')?.options[document.getElementById('secondCountry')?.selectedIndex]?.text || '',
        profilePicture: document.getElementById('joinPicUrl')?.value || ''
    };

    const submitBtn = this.querySelector('button[type="submit"]');
    if (submitBtn) { submitBtn.disabled = true; submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registering...'; }

    try {
        const res = await window.Auth.completeJointAccount(
            pendingJointAccount.id,
            userData,
            pendingJointAccount.secondary_user_email,
            pendingJointAccount.secondary_user_phone
        );
        if (res.success) {
            window.location.href = '/dashboard.html';
        } else {
            alert('Registration failed: ' + res.error);
            if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = 'Complete Registration'; }
        }
    } catch(err) {
        alert('Error: ' + err.message);
        if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = 'Complete Registration'; }
    }
});

// ── PASSWORD RESET (NITROSEND OTP + SUPABASE FALLBACK) ───────────

let currentResetEmail = '';

window.requestPasswordReset = async function() {
    const email = document.getElementById('resetEmail')?.value.trim();
    if (!email) { alert('Please enter your email address'); return; }
    if (!email.includes('@')) { alert('Please enter a valid email address'); return; }

    const btn = document.getElementById('sendResetBtn');
    const origText = btn ? btn.innerHTML : 'Send Reset Code';
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending code...';
    }

    try {
        if (!window.Auth) throw new Error('Auth system not loaded');
        const res = await window.Auth.requestPasswordReset(email);
        if (res.success) {
            currentResetEmail = email;
            const step1 = document.getElementById('forgotStep1');
            const step2 = document.getElementById('forgotStep2');
            const successDiv = document.getElementById('forgotSuccess');
            if (step1) step1.style.display = 'none';
            if (successDiv) successDiv.style.display = 'none';
            if (step2) step2.style.display = 'block';

            const noticeText = document.getElementById('resetSentNoticeText');
            if (noticeText) {
                noticeText.textContent = `Verification code sent to ${email}. Check your inbox and spam folder:`;
            }

            const otpInput = document.getElementById('resetOtpCode');
            if (otpInput) {
                otpInput.value = '';
                setTimeout(() => otpInput.focus(), 150);
            }
        } else {
            alert('Password reset request failed: ' + res.error);
            if (btn) { btn.disabled = false; btn.innerHTML = origText; }
        }
    } catch(err) {
        alert('Error: ' + err.message);
        if (btn) { btn.disabled = false; btn.innerHTML = origText; }
    }
};

window.resendResetCode = async function() {
    const email = currentResetEmail || document.getElementById('resetEmail')?.value.trim();
    if (!email) { backToStep1(); return; }
    
    try {
        if (!window.Auth) throw new Error('Auth system not loaded');
        const res = await window.Auth.requestPasswordReset(email);
        if (res.success) {
            alert('A fresh verification code has been sent to ' + email);
        } else {
            alert('Failed to resend code: ' + res.error);
        }
    } catch (e) {
        alert('Error: ' + e.message);
    }
};

window.backToStep1 = function() {
    const step1 = document.getElementById('forgotStep1');
    const step2 = document.getElementById('forgotStep2');
    const successDiv = document.getElementById('forgotSuccess');
    if (step1) step1.style.display = 'block';
    if (step2) step2.style.display = 'none';
    if (successDiv) successDiv.style.display = 'none';

    const btn = document.getElementById('sendResetBtn');
    if (btn) { btn.disabled = false; btn.innerHTML = 'Send Reset Code'; }
};

window.showOtpStepFromSuccess = function() {
    const s1 = document.getElementById('forgotStep1');
    const s2 = document.getElementById('forgotStep2');
    const sc = document.getElementById('forgotSuccess');
    if (s1) s1.style.display = 'none';
    if (sc) sc.style.display = 'none';
    if (s2) s2.style.display = 'block';
    document.getElementById('resetOtpCode')?.focus();
};

window.updateNewPassword = async function() {
    const email = currentResetEmail || document.getElementById('resetEmail')?.value.trim();
    const otpCode = document.getElementById('resetOtpCode')?.value.trim();
    const newPass = document.getElementById('newPassword')?.value;
    const confPass = document.getElementById('confirmPassword')?.value;

    if (otpCode !== undefined && otpCode !== null && otpCode !== '') {
        if (!/^\d{6}$/.test(otpCode)) {
            alert('Please enter a valid 6-digit verification code');
            document.getElementById('resetOtpCode')?.focus();
            return;
        }
    }

    if (!newPass) { alert('Please enter a new password'); return; }
    if (newPass.length < 6) { alert('Password must be at least 6 characters'); return; }
    if (newPass !== confPass) { alert('Passwords do not match'); return; }

    const btn = document.getElementById('saveNewPassBtn');
    const origText = btn ? btn.innerHTML : 'Update Password';
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating password...';
    }

    try {
        if (!window.Auth) throw new Error('Auth system not loaded');
        
        let res;
        if (otpCode && /^\d{6}$/.test(otpCode)) {
            // Verify OTP via NitroSend code
            res = await window.Auth.verifyOtpAndResetPassword(email, otpCode, newPass);
        } else {
            // Native Supabase Auth link recovery
            res = await window.Auth.updatePassword(newPass);
        }

        if (res.success) {
            alert('Password updated successfully! You can now log in with your new password.');
            closeModal('forgotModal');
            window.history.replaceState({}, document.title, window.location.pathname);
            
            const targetEmail = res.email || email;
            if (targetEmail) {
                const loginEmail = document.getElementById('loginEmail');
                if (loginEmail) loginEmail.value = targetEmail;
            }
            document.getElementById('loginPassword')?.focus();
        } else {
            alert('Failed to update password: ' + res.error);
            if (btn) { btn.disabled = false; btn.innerHTML = origText; }
        }
    } catch(err) {
        alert('Error updating password: ' + err.message);
        if (btn) { btn.disabled = false; btn.innerHTML = origText; }
    }
};

function showSetNewPasswordStep() {
    openModal('forgotModal');
    const s1 = document.getElementById('forgotStep1');
    const s2 = document.getElementById('forgotStep2');
    const sc = document.getElementById('forgotSuccess');
    if (s1) s1.style.display = 'none';
    if (sc) sc.style.display = 'none';
    if (s2) s2.style.display = 'block';
    const h2 = document.querySelector('#forgotModal h2');
    if (h2) h2.textContent = 'Set New Password';
}

function resetForgotForm() {
    const s1 = document.getElementById('forgotStep1');
    const s2 = document.getElementById('forgotStep2');
    const sc = document.getElementById('forgotSuccess');
    if (s1) s1.style.display = 'block';
    if (s2) s2.style.display = 'none';
    if (sc) sc.style.display = 'none';

    const rEmail = document.getElementById('resetEmail');
    if (rEmail) rEmail.value = '';
    const rOtp = document.getElementById('resetOtpCode');
    if (rOtp) rOtp.value = '';
    const nPass = document.getElementById('newPassword');
    if (nPass) nPass.value = '';
    const cPass = document.getElementById('confirmPassword');
    if (cPass) cPass.value = '';

    const btn = document.getElementById('sendResetBtn');
    if (btn) { btn.disabled = false; btn.innerHTML = 'Send Reset Code'; }
    const saveBtn = document.getElementById('saveNewPassBtn');
    if (saveBtn) { saveBtn.disabled = false; saveBtn.innerHTML = 'Update Password'; }

    const h2 = document.querySelector('#forgotModal h2');
    if (h2) h2.textContent = 'Reset Password';
}

// Check for Supabase Auth Password Recovery session
if (window.db?.auth) {
    window.db.auth.onAuthStateChange((event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
            showSetNewPasswordStep();
        }
    });
}

function checkRecoveryFromUrl() {
    const hash = window.location.hash || '';
    const search = window.location.search || '';
    const hashParams = new URLSearchParams(hash.startsWith('#') ? hash.substring(1) : hash);
    const searchParams = new URLSearchParams(search);

    const emailParam = searchParams.get('email') || hashParams.get('email');
    const codeParam = searchParams.get('code') || searchParams.get('reset_code') || hashParams.get('code');

    if (codeParam && emailParam) {
        currentResetEmail = emailParam;
        openModal('forgotModal');
        const s1 = document.getElementById('forgotStep1');
        const s2 = document.getElementById('forgotStep2');
        if (s1) s1.style.display = 'none';
        if (s2) s2.style.display = 'block';
        const otpInput = document.getElementById('resetOtpCode');
        if (otpInput) otpInput.value = codeParam;
        document.getElementById('newPassword')?.focus();
        return;
    }

    if (hashParams.get('type') === 'recovery' || searchParams.get('type') === 'recovery' || searchParams.get('reset') === 'true' || searchParams.has('code')) {
        setTimeout(showSetNewPasswordStep, 350);
    }
}

document.addEventListener('DOMContentLoaded', checkRecoveryFromUrl);

window.goToDashboard = function() {
    window.location.href = '/dashboard.html';
};

// ── THEME TOGGLE ─────────────────────────────

document.getElementById('themeToggle')?.addEventListener('click', () => {
    const next = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    const icon = document.querySelector('#themeToggle i');
    if (icon) icon.className = next === 'light' ? 'fas fa-moon' : 'fas fa-sun';
});

// Apply saved theme
const savedTheme = localStorage.getItem('theme') || 'light';
document.documentElement.setAttribute('data-theme', savedTheme);
const themeIcon = document.querySelector('#themeToggle i');
if (themeIcon) themeIcon.className = savedTheme === 'light' ? 'fas fa-moon' : 'fas fa-sun';