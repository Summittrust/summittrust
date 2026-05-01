// ============================================
// SUPABASE INITIALIZATION - FIXED SESSION
// ============================================

(function () {
    const SUPABASE_URL = 'https://jotfmjdmorjweoumdvuq.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpvdGZtamRtb3Jqd2VvdW1kdnVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3Mzk2OTksImV4cCI6MjA5MTMxNTY5OX0.bTkJKZtHEz_cBBHsYwWiWMotLpCpKU68_ROE-mKWm4s';

    if (!window.supabase || typeof window.supabase.createClient !== 'function') {
        console.error('❌ Supabase CDN not loaded');
        return;
    }

    // CRITICAL: Use the SAME configuration as auth.html
    const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,  // Changed to TRUE to detect session from URL
            storage: window.localStorage,
            storageKey: 'sb-jotfmjdmorjweoumdvuq-auth-token', // Explicit storage key
            flowType: 'pkce' // Use PKCE flow for better security
        }
    });

    // Expose globally
    window.supabaseClient = client;
    window.db = client;

    // Debug: Log session status immediately
    client.auth.getSession().then(({ data, error }) => {
        if (error) {
            console.error('❌ Session error on init:', error);
        } else if (data.session) {
            console.log('✅ Session found on init for:', data.session.user.email);
            console.log('Session expires at:', new Date(data.session.expires_at * 1000));
        } else {
            console.log('⚠️ No session on init - check localStorage');
            // Check what's in localStorage
            const storageKey = 'sb-jotfmjdmorjweoumdvuq-auth-token';
            const stored = localStorage.getItem(storageKey);
            console.log('LocalStorage has token?', !!stored);
        }
    });

    console.log('✅ Supabase initialized with fixed config');
})();