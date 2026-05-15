// ============================================
// SUMMIT TRUST AUTH PAGE UI CONTROLLER
// ============================================

let individualData = {};
let resetToken = '';
let pendingJointAccount = null;
let currentRecoveryWords = [];

const CLOUDINARY = {
    cloudName: 'ddvwy00eg',
    uploadPreset: 'summit-trust-uploads'
};

// Generate recovery phrase
function generateRecoveryPhrase() {
    const words = [
        'apple', 'mountain', 'river', 'cloud', 'flower', 'sunshine', 'ocean', 'forest',
        'thunder', 'lightning', 'rainbow', 'butterfly', 'dragon', 'phoenix', 'tiger', 'eagle',
        'crystal', 'silver', 'golden', 'ruby', 'sapphire', 'diamond', 'emerald', 'pearl',
        'wisdom', 'courage', 'honor', 'peace', 'joy', 'love', 'hope', 'faith',
        'dream', 'vision', 'destiny', 'freedom', 'harmony', 'balance', 'serenity', 'bliss'
    ];
    const selected = [];
    for (let i = 0; i < 12; i++) {
        selected.push(words[Math.floor(Math.random() * words.length)]);
    }
    return selected;
}

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

// ── INDIVIDUAL REGISTRATION ───────────────────

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

window.goToSecurityStep = function() {
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
    
    // Generate and display recovery phrase
    currentRecoveryWords = generateRecoveryPhrase();
    const recoveryDiv = document.getElementById('indRecoveryPhrase');
    if (recoveryDiv) {
        let html = '';
        currentRecoveryWords.forEach((word, i) => {
            html += `<span style="display:inline-block;background:#22c55e;color:white;padding:8px 12px;margin:5px;border-radius:8px;font-size:14px;">${i+1}. ${word}</span>`;
        });
        recoveryDiv.innerHTML = html;
    }
    
    // Switch to step 2
    document.getElementById('individualStep1').classList.remove('active');
    document.getElementById('individualStep2').classList.add('active');
    document.getElementById('indStep1Dot').classList.remove('active');
    document.getElementById('indStep1Dot').classList.add('completed');
    document.getElementById('indStep2Dot').classList.add('active');
};

window.processIndividualSignup = async function() {
    const confirmBox = document.getElementById('indConfirmSave');
    if (!confirmBox.checked) {
        alert('Please confirm that you have saved your recovery phrase');
        return;
    }
    
    const btn = document.getElementById('indCompleteBtn');
    if (btn) { 
        btn.disabled = true; 
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating account...'; 
    }
    
    try {
        if (!window.Auth) { throw new Error('Auth system not loaded'); }
        
        const recoveryPhrase = currentRecoveryWords.join(' ');
        const result = await window.Auth.signUpIndividual(individualData);
        
        if (result.success) {
            alert('Account created successfully!');
            btn.style.display = 'none';
            const goBtn = document.getElementById('indGoDashBtn');
            if (goBtn) goBtn.style.display = 'block';
        } else {
            alert('Registration failed: ' + result.error);
            btn.disabled = false;
            btn.innerHTML = 'Complete Registration';
        }
    } catch(err) {
        alert('Error: ' + err.message);
        btn.disabled = false;
        btn.innerHTML = 'Complete Registration';
    }
};

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
    
    // Reset to step 1
    document.getElementById('individualStep1').classList.add('active');
    document.getElementById('individualStep2').classList.remove('active');
    document.getElementById('indStep1Dot').classList.add('active');
    document.getElementById('indStep1Dot').classList.remove('completed');
    document.getElementById('indStep2Dot').classList.remove('active');
    
    // Reset buttons
    const completeBtn = document.getElementById('indCompleteBtn');
    const goBtn = document.getElementById('indGoDashBtn');
    if (completeBtn) completeBtn.style.display = 'block';
    if (goBtn) goBtn.style.display = 'none';
    const confirmBox = document.getElementById('indConfirmSave');
    if (confirmBox) confirmBox.checked = false;
    
    // Clear recovery phrase
    const recoveryDiv = document.getElementById('indRecoveryPhrase');
    if (recoveryDiv) recoveryDiv.innerHTML = '';
    
    individualData = {};
    currentRecoveryWords = [];
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

// ── JOINT REGISTRATION (simplified for now) ──

async function handleJointSubmit(e) {
    e.preventDefault();
    alert('Joint account registration coming soon');
}

document.getElementById('jointPrimaryForm')?.addEventListener('submit', handleJointSubmit);

function resetJointForm() {
    // Basic reset
}

function resetSecondUserModal() {
    // Basic reset
}

window.verifyOTP = function() {
    alert('OTP verification coming soon');
};

window.verifyPhrase = function() {
    alert('Password reset coming soon');
};

window.resetPassword = function() {
    alert('Password reset coming soon');
};

window.goToDashboard = function() {
    window.location.href = '/dashboard.html';
};

function resetForgotForm() {
    // Basic reset
}

function buildAuthPhraseGrid() {
    // Basic grid
}

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