// ============================================
// SUPABASE INITIALIZATION - FIXED SESSION
// ============================================

(function () {
    const SUPABASE_URL = (window.CONFIG && window.CONFIG.SUPABASE_URL) || 'https://jotfmjdmorjweoumdvuq.supabase.co';
    const SUPABASE_ANON_KEY = (window.CONFIG && window.CONFIG.SUPABASE_ANON_KEY) || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpvdGZtamRtb3Jqd2VvdW1kdnVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3Mzk2OTksImV4cCI6MjA5MTMxNTY5OX0.bTkJKZtHEz_cBBHsYwWiWMotLpCpKU68_ROE-mKWm4s';

    if (!window.supabase || typeof window.supabase.createClient !== 'function') {
        console.error('❌ Supabase CDN not loaded. Make sure the CDN <script> tag comes before supabase.js');
        return;
    }

    // Use configuration with explicit storage key and PKCE flow
    const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
            storage: window.localStorage,
            storageKey: 'sb-jotfmjdmorjweoumdvuq-auth-token',
            flowType: 'pkce'
        }
    });

    // Expose globally under both names
    window.supabaseClient = client;
    window.db = client;

    // Debug: Log session status immediately
    client.auth.getSession().then(({ data, error }) => {
        if (error) {
            console.error('❌ Session error on init:', error);
        } else if (data && data.session) {
            console.log('✅ Session found on init for:', data.session.user.email);
        } else {
            const storageKey = 'sb-jotfmjdmorjweoumdvuq-auth-token';
            const stored = localStorage.getItem(storageKey);
            console.log('LocalStorage has token?', !!stored);
        }
    }).catch(err => {
        console.warn('Session check caught:', err);
    });

    console.log('✅ Supabase initialized with fixed config');
})();
