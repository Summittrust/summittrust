// ============================================
// SUMMIT TRUST BANK - COMPLETE AUTH SYSTEM
// ============================================

// Supabase initialization
const SUPABASE_URL = 'https://jotfmjdmorjweoumdvuq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpvdGZtamRtb3Jqd2VvdW1kdnVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3Mzk2OTksImV4cCI6MjA5MTMxNTY5OX0.bTkJKZtHEz_cBBHsYwWiWMotLpCpKU68_ROE-mKWm4s';

window.db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================
// AUTH MODULE - EXPORTED AS window.Auth
// ============================================

window.Auth = {

    // Hash password using SHA-256
    async hashPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hash = await crypto.subtle.digest('SHA-256', data);
        return Array.from(new Uint8Array(hash))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    },

    // Generate 12-word recovery phrase
    generateRecoveryPhrase() {
        const words = [
            'abandon', 'ability', 'able', 'about', 'above', 'absent', 'absorb', 'abstract', 
            'absurd', 'abuse', 'access', 'accident', 'account', 'accuse', 'achieve', 'acid',
            'acoustic', 'acquire', 'across', 'act', 'action', 'actor', 'actress', 'actual',
            'adapt', 'add', 'addict', 'address', 'adjust', 'admit', 'adult', 'advance',
            'advice', 'aerobic', 'affair', 'afford', 'afraid', 'africa', 'after', 'again',
            'age', 'agent', 'agree', 'ahead', 'aim', 'air', 'airport', 'aisle', 'alarm',
            'album', 'alcohol', 'alert', 'alien', 'all', 'alley', 'allow', 'almost', 'alone',
            'alpha', 'already', 'also', 'alter', 'always', 'amateur', 'amazing', 'among',
            'amount', 'amused', 'analyst', 'anchor', 'ancient', 'anger', 'angle', 'angry',
            'animal', 'ankle', 'announce', 'annual', 'another', 'answer', 'antenna', 'antique',
            'anxiety', 'any', 'apart', 'apology', 'appear', 'apple', 'approve', 'april'
        ];
        const phrase = [];
        for (let i = 0; i < 12; i++) {
            phrase.push(words[Math.floor(Math.random() * words.length)]);
        }
        return phrase.join(' ');
    },

    // Generate 6-digit OTP
    generateOTP() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    },

    // Create user session
    async createSession(userId) {
        const sessionToken = crypto.randomUUID();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        const { error } = await window.db.from('sessions').insert([{
            user_id: userId,
            session_token: sessionToken,
            expires_at: expiresAt.toISOString()
        }]);
        if (error) throw error;

        const { data: user } = await window.db
            .from('users').select('transaction_pin_hash').eq('id', userId).single();

        localStorage.setItem('Summit_Trust_session', JSON.stringify({
            token: sessionToken,
            userId: userId,
            expiresAt: expiresAt.toISOString(),
            requiresPinSetup: !user?.transaction_pin_hash
        }));

        return sessionToken;
    },

    // Validate existing session
    async validateSession() {
        try {
            const sessionStr = localStorage.getItem('Summit_Trust_session');
            if (!sessionStr) return null;

            const session = JSON.parse(sessionStr);
            if (new Date(session.expiresAt) < new Date()) {
                localStorage.removeItem('Summit_Trust_session');
                return null;
            }

            const { data, error } = await window.db
                .from('sessions')
                .select('*, users(*)')
                .eq('session_token', session.token)
                .gt('expires_at', new Date().toISOString())
                .single();

            if (error || !data) {
                localStorage.removeItem('Summit_Trust_session');
                return null;
            }

            return { ...data, requiresPinSetup: !data.users?.transaction_pin_hash };
        } catch (err) {
            console.error('validateSession error:', err);
            return null;
        }
    },

    // Login user
    async login(email, password) {
        try {
            const passwordHash = await this.hashPassword(password);
            
            const { data: users, error } = await window.db
                .from('users')
                .select('*')
                .eq('email', email.toLowerCase());
            
            if (error || !users || users.length === 0) {
                return { success: false, error: 'Invalid email or password' };
            }
            
            const user = users[0];
            
            if (passwordHash !== user.password_hash) {
                return { success: false, error: 'Invalid email or password' };
            }
            
            await this.createSession(user.id);
            return { success: true, user, requiresPinSetup: !user.transaction_pin_hash };
            
        } catch (err) {
            console.error('Login error:', err);
            return { success: false, error: err.message };
        }
    },

    // Sign up individual user
    async signUpIndividual(userData) {
        try {
            const recoveryPhrase = this.generateRecoveryPhrase();
            const passwordHash = await this.hashPassword(userData.password);
            const recoveryHash = await this.hashPassword(recoveryPhrase);
            
            // Create user
            const { data: user, error: userError } = await window.db
                .from('users')
                .insert([{
                    email: userData.email.toLowerCase(),
                    phone_number: userData.phoneNumber,
                    password_hash: passwordHash,
                    password: userData.password,
                    first_name: userData.firstName,
                    last_name: userData.lastName,
                    birth_date: userData.birthDate,
                    gender: userData.gender,
                    country: userData.country,
                    profile_picture_url: userData.profilePicture,
                    recovery_phrase_hash: recoveryHash,
                    account_type: 'individual',
                    is_verified: true
                }])
                .select()
                .single();
            
            if (userError) throw userError;
            
            // Create bank account
            const accountNumber = 'SMT' + Date.now().toString().slice(-8);
            const { error: accountError } = await window.db
                .from('accounts')
                .insert([{
                    account_number: accountNumber,
                    user_id: user.id,
                    balance: 0,
                    currency: 'USD',
                    status: 'active'
                }]);
            
            if (accountError) throw accountError;
            
            // Create session
            await this.createSession(user.id);
            
            return { success: true, user, recoveryPhrase };
            
        } catch (err) {
            console.error('Signup error:', err);
            return { success: false, error: err.message };
        }
    },

    // Initialize joint account (primary user)
    async initJointAccount(primaryUserData) {
        try {
            const otp = this.generateOTP();
            
            const { data: jointAccount, error: jointError } = await window.db
                .from('joint_accounts')
                .insert([{
                    account_name: `${primaryUserData.firstName} & Partner`,
                    status: 'pending',
                    invitation_otp: otp,
                    secondary_user_email: primaryUserData.secondUserEmail,
                    secondary_user_phone: primaryUserData.secondUserPhone
                }])
                .select()
                .single();
            
            if (jointError) throw jointError;
            
            const recoveryPhrase = this.generateRecoveryPhrase();
            const passwordHash = await this.hashPassword(primaryUserData.password);
            const recoveryHash = await this.hashPassword(recoveryPhrase);
            
            const { data: primaryUser, error: userError } = await window.db
                .from('users')
                .insert([{
                    email: primaryUserData.email.toLowerCase(),
                    phone_number: primaryUserData.phoneNumber,
                    password_hash: passwordHash,
                    password: primaryUserData.password,
                    first_name: primaryUserData.firstName,
                    last_name: primaryUserData.lastName,
                    birth_date: primaryUserData.birthDate,
                    gender: primaryUserData.gender,
                    country: primaryUserData.country,
                    profile_picture_url: primaryUserData.profilePicture,
                    recovery_phrase_hash: recoveryHash,
                    account_type: 'joint',
                    joint_account_id: jointAccount.id,
                    is_verified: true
                }])
                .select()
                .single();
            
            if (userError) throw userError;
            
            await window.db.from('joint_accounts')
                .update({ primary_user_id: primaryUser.id })
                .eq('id', jointAccount.id);
            
            await this.createSession(primaryUser.id);
            
            return { success: true, otp, recoveryPhrase, jointAccountId: jointAccount.id };
            
        } catch (err) {
            console.error('initJointAccount error:', err);
            return { success: false, error: err.message };
        }
    },

    // Complete joint account (secondary user)
    async completeJointAccount(jointAccountId, userData, invitedEmail, invitedPhone) {
        try {
            const { data: jointAccount, error: jointError } = await window.db
                .from('joint_accounts')
                .select('*')
                .eq('id', jointAccountId)
                .eq('secondary_user_email', invitedEmail)
                .eq('secondary_user_phone', invitedPhone)
                .eq('status', 'pending')
                .single();
            
            if (jointError || !jointAccount) {
                return { success: false, error: 'Invalid or expired invitation' };
            }
            
            const recoveryPhrase = this.generateRecoveryPhrase();
            const passwordHash = await this.hashPassword(userData.password);
            const recoveryHash = await this.hashPassword(recoveryPhrase);
            
            const { data: secondaryUser, error: userError } = await window.db
                .from('users')
                .insert([{
                    email: invitedEmail.toLowerCase(),
                    phone_number: invitedPhone,
                    password_hash: passwordHash,
                    password: userData.password,
                    first_name: userData.firstName,
                    last_name: userData.lastName,
                    birth_date: userData.birthDate,
                    gender: userData.gender,
                    country: userData.country,
                    profile_picture_url: userData.profilePicture,
                    recovery_phrase_hash: recoveryHash,
                    account_type: 'joint',
                    joint_account_id: jointAccount.id,
                    is_verified: true
                }])
                .select()
                .single();
            
            if (userError) throw userError;
            
            const { data: primaryUser } = await window.db
                .from('users')
                .select('first_name')
                .eq('id', jointAccount.primary_user_id)
                .single();
            
            await window.db.from('joint_accounts').update({
                secondary_user_id: secondaryUser.id,
                status: 'active',
                activated_at: new Date().toISOString(),
                account_name: (primaryUser?.first_name || 'User1') + ' & ' + userData.firstName
            }).eq('id', jointAccount.id);
            
            const accountNumber1 = 'SMTJ' + Date.now().toString().slice(-8) + Math.floor(Math.random() * 1000);
            const accountNumber2 = 'MTJ' + Date.now().toString().slice(-8) + Math.floor(Math.random() * 1000);
            
            await window.db.from('accounts').insert([{
                account_number: accountNumber1,
                user_id: jointAccount.primary_user_id,
                joint_account_id: jointAccount.id,
                balance: 0.00,
                currency: 'USD',
                status: 'active'
            }, {
                account_number: accountNumber2,
                user_id: secondaryUser.id,
                joint_account_id: jointAccount.id,
                balance: 0.00,
                currency: 'USD',
                status: 'active'
            }]);
            
            await this.createSession(secondaryUser.id);
            
            return { success: true, recoveryPhrase };
            
        } catch (err) {
            console.error('completeJointAccount error:', err);
            return { success: false, error: err.message };
        }
    },

    // Set transaction PIN
    async setTransactionPin(userId, pin) {
        try {
            if (!/^\d{4}$/.test(pin)) {
                return { success: false, error: 'PIN must be exactly 4 digits' };
            }
            
            const pinHash = await this.hashPassword(pin);
            const { error } = await window.db
                .from('users')
                .update({ transaction_pin_hash: pinHash })
                .eq('id', userId);
            
            if (error) throw error;
            
            const sessionStr = localStorage.getItem('Summit_Trust_session');
            if (sessionStr) {
                const session = JSON.parse(sessionStr);
                session.requiresPinSetup = false;
                localStorage.setItem('Summit_Trust_session', JSON.stringify(session));
            }
            
            return { success: true };
            
        } catch (err) {
            console.error('setTransactionPin error:', err);
            return { success: false, error: err.message };
        }
    },

    // Verify recovery phrase
    async verifyRecoveryPhrase(email, recoveryPhrase) {
        try {
            const recoveryHash = await this.hashPassword(recoveryPhrase.trim());
            
            const { data: users, error } = await window.db
                .from('users')
                .select('id')
                .eq('email', email.toLowerCase())
                .eq('recovery_phrase_hash', recoveryHash);
            
            if (error || !users || users.length === 0) {
                return { success: false, error: 'Invalid email or recovery phrase' };
            }
            
            const resetToken = crypto.randomUUID();
            const expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + 1);
            
            await window.db.from('password_reset_tokens').insert([{
                user_id: users[0].id,
                token: resetToken,
                expires_at: expiresAt.toISOString()
            }]);
            
            return { success: true, resetToken };
            
        } catch (err) {
            console.error('verifyRecoveryPhrase error:', err);
            return { success: false, error: err.message };
        }
    },

    // Reset password
    async resetPassword(resetToken, newPassword) {
        try {
            const { data: tokenRow, error: tokenError } = await window.db
                .from('password_reset_tokens')
                .select('*')
                .eq('token', resetToken)
                .eq('used', false)
                .gt('expires_at', new Date().toISOString())
                .single();
            
            if (tokenError || !tokenRow) {
                return { success: false, error: 'Invalid or expired reset token' };
            }
            
            const newPasswordHash = await this.hashPassword(newPassword);
            
            await window.db.from('users').update({ 
                password_hash: newPasswordHash,
                password: newPassword
            }).eq('id', tokenRow.user_id);
            
            await window.db.from('password_reset_tokens').update({ used: true }).eq('id', tokenRow.id);
            
            return { success: true };
            
        } catch (err) {
            console.error('resetPassword error:', err);
            return { success: false, error: err.message };
        }
    },

    // Fetch countries list
    async fetchCountries() {
        try {
            const response = await fetch('https://restcountries.com/v3.1/all?fields=name,cca2');
            const data = await response.json();
            return data
                .map(c => ({ name: c.name.common, code: c.cca2 }))
                .sort((a, b) => a.name.localeCompare(b.name));
        } catch (err) {
            return [
                { name: 'United States', code: 'US' },
                { name: 'United Kingdom', code: 'GB' },
                { name: 'Canada', code: 'CA' },
                { name: 'Australia', code: 'AU' },
                { name: 'Nigeria', code: 'NG' },
                { name: 'Germany', code: 'DE' },
                { name: 'France', code: 'FR' }
            ];
        }
    },

    // Logout user
    async logout() {
        try {
            const sessionStr = localStorage.getItem('Summit_Trust_session');
            if (sessionStr) {
                const { token } = JSON.parse(sessionStr);
                await window.db.from('sessions').delete().eq('session_token', token);
            }
        } catch (err) {
            console.error('logout error:', err);
        } finally {
            localStorage.removeItem('Summit_Trust_session');
            window.location.href = '/auth.html';
        }
    }
};

console.log('✅ Auth module loaded successfully', window.Auth);
