// ============================================
// AUTHENTICATION MODULE
// Guard: only runs once even if loaded twice
// ============================================

if (!window.Auth) {

if (!window.db) {
    throw new Error('Supabase not initialized. Check supabase.js loads before auth.js.');
}

window.Auth = {

    async hashPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hash = await crypto.subtle.digest('SHA-256', data);
        return Array.from(new Uint8Array(hash))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    },

    async verifyPin(pin, storedHash) {
        const hash = await this.hashPassword(pin);
        return hash === storedHash;
    },

    generateRecoveryPhrase() {
const words = [
  'awake','aware','away','awesome','awful','awkward','axis',
  'baby','bachelor','bacon','badge','bag','balance','balcony','ball',
  'bamboo','banana','banner','bar','barely','bargain','barrel','base',
  'basic','basket','battle','beach','bean','beauty','because','become',
  'beef','before','begin','behave','behind','believe','below','belt',
  'bench','benefit','best','betray','better','between','beyond','bicycle',
  'bid','bike','bind','biology','bird','birth','bitter','black',
  'blade','blame','blanket','blast','bleak','bless','blind','blood',
  'blossom','blouse','blue','blur','blush','board','boat','body',
  'boil','bomb','bone','bonus','book','boost','border','boring',
  'borrow','boss','bottom','bounce','box','boy','bracket','brain',
  'brand','brass','brave','bread','breeze','brick','bridge','brief',
  'bright','bring','brisk','broccoli','broken','bronze','broom','brother',
  'brown','brush','bubble','buddy','budget','buffalo','build','bulb',
  'bulk','bullet','bundle','bunker','burden','burger','burst','bus',
  'business','busy','butter','buyer','buzz',
  'cabbage','cabin','cable','cactus','cage','cake','call','calm',
  'camera','camp','can','canal','cancel','candy','cannon','canoe',
  'canvas','canyon','capable','capital','captain','car','carbon','card',
  'cargo','carpet','carry','cart','case','cash','casino','castle',
  'casual','cat','catalog','catch','category','cattle','caught','cause',
  'caution','cave','ceiling','celery','cement','census','century','cereal',
  'certain','chair','chalk','champion','change','chaos','chapter','charge',
  'chase','chat','cheap','check','cheese','chef','cherry','chest',
  'chicken','chief','child','chimney','choice','choose','chronic','chunk',
  'churn','cigar','cinnamon','circle','citizen','city','civil','claim',
  'clap','clarify','claw','clay','clean','clerk','clever','click',
  'client','cliff','climb','clinic','clip','clock','clog','close',
  'cloth','cloud','clown','club','clump','cluster','clutch','coach',
  'coast','coconut','code','coffee','coil','coin','collect','color',
  'column','combine','come','comfort','comic','common','company','concert',
  'conduct','confirm','congress','connect','consider','control','convince','cook',
  'cool','copper','copy','coral','core','corn','correct','cost',
  'cotton','couch','country','couple','course','cousin','cover','coyote',
  'crack','cradle','craft','cram','crane','crash','crater','crawl',
  'crazy','cream','credit','creek','crew','cricket','crime','crisp',
  'critic','crop','cross','crouch','crowd','crucial','cruel','cruise',
  'crumble','crunch','crush','cry','crystal','cube','culture','cup',
  'cupboard','curious','current','curtain','curve','cushion','custom','cute',
  'cycle'
];
        const phrase = [];
        for (let i = 0; i < 12; i++) {
            phrase.push(words[Math.floor(Math.random() * words.length)]);
        }
        return phrase.join(' ');
    },

    generateOTP() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    },

    // ---- SESSION ----

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

        localStorage.setItem('Summit Trust_session', JSON.stringify({
            token: sessionToken,
            userId,
            expiresAt: expiresAt.toISOString(),
            requiresPinSetup: !user?.transaction_pin_hash
        }));

        return sessionToken;
    },

    async validateSession() {
        try {
            const sessionStr = localStorage.getItem('Summit Trust_session');
            if (!sessionStr) return null;

            const session = JSON.parse(sessionStr);
            if (new Date(session.expiresAt) < new Date()) {
                localStorage.removeItem('Summit Trust_session');
                return null;
            }

            const { data, error } = await window.db
                .from('sessions')
                .select('*, users(*)')
                .eq('session_token', session.token)
                .gt('expires_at', new Date().toISOString())
                .single();

            if (error || !data) {
                localStorage.removeItem('Summit Trust_session');
                return null;
            }

            return { ...data, requiresPinSetup: !data.users?.transaction_pin_hash };
        } catch (err) {
            console.error('validateSession error:', err);
            return null;
        }
    },

    async logout() {
        try {
            const sessionStr = localStorage.getItem('Summit Trust_session');
            if (sessionStr) {
                const { token } = JSON.parse(sessionStr);
                await window.db.from('sessions').delete().eq('session_token', token);
            }
        } catch (err) {
            console.error('logout error:', err);
        } finally {
            localStorage.removeItem('Summit Trust_session');
            window.location.href = '/auth.html';
        }
    },

    // ---- LOGIN ----

    async login(email, password) {
        try {
            const { data: users, error } = await window.db
                .from('users').select('*').eq('email', email.trim().toLowerCase());

            if (error || !users?.length) {
                return { success: false, error: 'Invalid email or password' };
            }

            const user = users[0];
            const passwordHash = await this.hashPassword(password);

            if (passwordHash !== user.password_hash) {
                return { success: false, error: 'Invalid email or password' };
            }

            await this.createSession(user.id);
            return { success: true, user, requiresPinSetup: !user.transaction_pin_hash };
        } catch (err) {
            console.error('login error:', err);
            return { success: false, error: err.message };
        }
    },

    // ---- INDIVIDUAL SIGNUP ----

    async signUpIndividual(userData) {
        try {
            const recoveryPhrase = this.generateRecoveryPhrase();
            const [passwordHash, recoveryPhraseHash] = await Promise.all([
                this.hashPassword(userData.password),
                this.hashPassword(recoveryPhrase)
            ]);

            const { data: user, error } = await window.db.from('users').insert([{
                email: userData.email.trim().toLowerCase(),
                password_hash: passwordHash,
                first_name: userData.firstName,
                last_name: userData.lastName,
                birth_date: userData.birthDate,
                gender: userData.gender,
                country: userData.country,
                government_id_url: userData.governmentId,
                profile_picture_url: userData.profilePicture,
                recovery_phrase_hash: recoveryPhraseHash,
                transaction_pin_hash: null,
                account_type: 'individual',
                is_verified: true
            }]).select().single();

            if (error) throw error;

            // accounts constraint: user_id OR joint_account_id, never both
            const accountNumber = 'MT' + Date.now().toString().slice(-8) + Math.floor(Math.random() * 1000);
            await window.db.from('accounts').insert([{
                account_number: accountNumber,
                user_id: user.id,
                balance: 0.00,
                currency: 'USD',
                status: 'active'
            }]);

            await this.createSession(user.id);
            return { success: true, user, recoveryPhrase };
        } catch (err) {
            console.error('signUpIndividual error:', err);
            return { success: false, error: err.message };
        }
    },

    // ---- JOINT SIGNUP — Primary user ----
    // joint_accounts schema: id, primary_user_id, secondary_user_id,
    //   account_name, status, invitation_otp, created_at, activated_at
    // NOTE: no otp_expires_at column

    async initJointAccount(primaryUserData) {
        try {
            const otp = this.generateOTP();

            const { data: jointAccount, error: jointError } = await window.db
                .from('joint_accounts').insert([{
                    account_name: `${primaryUserData.firstName} & Partner`,
                    status: 'pending',
                    invitation_otp: otp
                }]).select().single();

            if (jointError) throw jointError;

            const recoveryPhrase = this.generateRecoveryPhrase();
            const [passwordHash, recoveryPhraseHash] = await Promise.all([
                this.hashPassword(primaryUserData.password),
                this.hashPassword(recoveryPhrase)
            ]);

            const { data: primaryUser, error: userError } = await window.db
                .from('users').insert([{
                    email: primaryUserData.email.trim().toLowerCase(),
                    password_hash: passwordHash,
                    first_name: primaryUserData.firstName,
                    last_name: primaryUserData.lastName,
                    birth_date: primaryUserData.birthDate,
                    gender: primaryUserData.gender,
                    country: primaryUserData.country,
                    government_id_url: primaryUserData.governmentId,
                    profile_picture_url: primaryUserData.profilePicture,
                    recovery_phrase_hash: recoveryPhraseHash,
                    transaction_pin_hash: null,
                    account_type: 'joint',
                    joint_account_id: jointAccount.id,
                    is_verified: true
                }]).select().single();

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

    // ---- JOINT SIGNUP — Secondary user ----

    async completeJointAccount(otp, userData) {
        try {
            const { data: jointAccount, error: jointError } = await window.db
                .from('joint_accounts')
                .select('*')
                .eq('invitation_otp', otp)
                .eq('status', 'pending')
                .single();

            if (jointError || !jointAccount) {
                return { success: false, error: 'Invalid or expired OTP' };
            }

            const recoveryPhrase = this.generateRecoveryPhrase();
            const [passwordHash, recoveryPhraseHash] = await Promise.all([
                this.hashPassword(userData.password),
                this.hashPassword(recoveryPhrase)
            ]);

            const { data: secondaryUser, error: userError } = await window.db
                .from('users').insert([{
                    email: userData.email.trim().toLowerCase(),
                    password_hash: passwordHash,
                    first_name: userData.firstName,
                    last_name: userData.lastName,
                    birth_date: userData.birthDate,
                    gender: userData.gender,
                    country: userData.country,
                    government_id_url: userData.governmentId,
                    profile_picture_url: userData.profilePicture,
                    recovery_phrase_hash: recoveryPhraseHash,
                    transaction_pin_hash: null,
                    account_type: 'joint',
                    joint_account_id: jointAccount.id,
                    is_verified: true
                }]).select().single();

            if (userError) throw userError;

            await window.db.from('joint_accounts').update({
                secondary_user_id: secondaryUser.id,
                status: 'active',
                activated_at: new Date().toISOString()
            }).eq('id', jointAccount.id);

            // accounts constraint: joint_account_id only, no user_id
            const accountNumber = 'MTJ' + Date.now().toString().slice(-8) + Math.floor(Math.random() * 1000);
            await window.db.from('accounts').insert([{
                account_number: accountNumber,
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

    // ---- PIN SETUP ----

    async setTransactionPin(userId, pin) {
        try {
            if (!/^\d{4}$/.test(pin)) {
                return { success: false, error: 'PIN must be exactly 4 digits' };
            }

            const pinHash = await this.hashPassword(pin);
            const { error } = await window.db
                .from('users').update({ transaction_pin_hash: pinHash }).eq('id', userId);

            if (error) throw error;

            const sessionStr = localStorage.getItem('Summit Trust_session');
            if (sessionStr) {
                const session = JSON.parse(sessionStr);
                session.requiresPinSetup = false;
                localStorage.setItem('Summit Trust_session', JSON.stringify(session));
            }

            return { success: true };
        } catch (err) {
            console.error('setTransactionPin error:', err);
            return { success: false, error: err.message };
        }
    },

    // ---- PASSWORD RESET ----

    async verifyRecoveryPhrase(email, recoveryPhrase) {
        try {
            const { data: users, error } = await window.db
                .from('users').select('*').eq('email', email.trim().toLowerCase());

            if (error || !users?.length) {
                return { success: false, error: 'User not found' };
            }

            const user = users[0];
            const hash = await this.hashPassword(recoveryPhrase.trim());

            if (hash !== user.recovery_phrase_hash) {
                return { success: false, error: 'Invalid recovery phrase' };
            }

            const resetToken = crypto.randomUUID();
            const expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + 1);

            await window.db.from('password_reset_tokens').insert([{
                user_id: user.id,
                token: resetToken,
                expires_at: expiresAt.toISOString()
            }]);

            return { success: true, resetToken };
        } catch (err) {
            console.error('verifyRecoveryPhrase error:', err);
            return { success: false, error: err.message };
        }
    },

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

            const passwordHash = await this.hashPassword(newPassword);
            await window.db.from('users').update({ password_hash: passwordHash }).eq('id', tokenRow.user_id);
            await window.db.from('password_reset_tokens').update({ used: true }).eq('id', tokenRow.id);

            return { success: true };
        } catch (err) {
            console.error('resetPassword error:', err);
            return { success: false, error: err.message };
        }
    },

    // ---- COUNTRIES ----

    async fetchCountries() {
        try {
            const response = await fetch('https://restcountries.com/v3.1/all?fields=name,cca2');
            const data = await response.json();
            return data
                .map(c => ({ name: c.name.common, code: c.cca2 }))
                .sort((a, b) => a.name.localeCompare(b.name));
        } catch (err) {
            return [
                { name: 'Australia',      code: 'AU' },
                { name: 'Canada',         code: 'CA' },
                { name: 'France',         code: 'FR' },
                { name: 'Germany',        code: 'DE' },
                { name: 'Nigeria',        code: 'NG' },
                { name: 'United Kingdom', code: 'GB' },
                { name: 'United States',  code: 'US' }
            ];
        }
    }
};

} // end if(!window.Auth)