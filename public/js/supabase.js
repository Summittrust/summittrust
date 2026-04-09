// ============================================
// SUPABASE INITIALIZATION
// ============================================

(function () {
    const SUPABASE_URL = 'https://jotfmjdmorjweoumdvuq.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpvdGZtamRtb3Jqd2VvdW1kdnVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3Mzk2OTksImV4cCI6MjA5MTMxNTY5OX0.bTkJKZtHEz_cBBHsYwWiWMotLpCpKU68_ROE-mKWm4s';

    if (!window.supabase || typeof window.supabase.createClient !== 'function') {
        console.error('❌ Supabase CDN not loaded. Make sure the CDN <script> tag comes before supabase.js');
        return;
    }

    const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: false,
            storage: window.localStorage
        }
    });

    // Expose under both names so auth.js and dashboard.js always find it
    window.supabaseClient = client;
    window.db = client;

    console.log('✅ Supabase initialized');
})();