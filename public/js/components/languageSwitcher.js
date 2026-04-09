// ============================================
// LANGUAGE SWITCHER
// Uses the googtrans cookie method — the only
// reliable way to programmatically control
// Google Translate across all modern browsers.
//
// How it works:
//   1. Set cookie: googtrans=/en/TARGET_LANG
//   2. Reload the page
//   Google Translate reads the cookie on load
//   and applies the translation automatically.
// ============================================

(function () {

    // ── LANGUAGE MAP ──────────────────────────
    // Maps our lang codes to Google Translate codes

    var LANG_MAP = {
        'en':  'en',
        'es':  'es',
        'fr':  'fr',
        'de':  'de',
        'pt':  'pt',
        'ar':  'ar',
        'zh':  'zh-CN'
    };

    var LANG_LABELS = {
        'en': 'EN',
        'es': 'ES',
        'fr': 'FR',
        'de': 'DE',
        'pt': 'PT',
        'ar': 'AR',
        'zh': '中文'
    };

    // ── COOKIE HELPERS ────────────────────────

    function setGoogleTranslateCookie(langCode) {
        var gtCode = LANG_MAP[langCode] || langCode;
        var cookieVal = langCode === 'en' ? '' : '/en/' + gtCode;

        // Must be set on both root domain and current path
        // googtrans cookie requires no-expiry (session) or explicit date
        var expiry = new Date();
        expiry.setFullYear(expiry.getFullYear() + 1);
        var expires = expiry.toUTCString();

        // Set for current path and root
        document.cookie = 'googtrans=' + cookieVal + '; path=/; expires=' + expires;
        document.cookie = 'googtrans=' + cookieVal + '; path=/; domain=' + location.hostname + '; expires=' + expires;
    }

    function getStoredLang() {
        return localStorage.getItem('Summit Trust_lang') || 'en';
    }

    function storeLang(lang) {
        localStorage.setItem('Summit Trust_lang', lang);
    }

    // ── APPLY LANGUAGE ────────────────────────

    function applyLanguage(lang) {
        storeLang(lang);
        setGoogleTranslateCookie(lang);
        // Reload so Google Translate picks up the cookie
        location.reload();
    }

    // ── UPDATE UI ─────────────────────────────

    function updateUI(lang) {
        // Desktop button label
        var langSpan = document.querySelector('.lang-btn span');
        if (langSpan) langSpan.textContent = LANG_LABELS[lang] || lang.toUpperCase();

        // Desktop — mark active link
        document.querySelectorAll('[data-lang]').forEach(function (el) {
            el.style.fontWeight = el.getAttribute('data-lang') === lang ? '700' : '';
            el.style.color      = el.getAttribute('data-lang') === lang ? 'var(--accent-primary)' : '';
        });

        // Mobile select
        var mobileSelect = document.getElementById('mobileLangSelect');
        if (mobileSelect) mobileSelect.value = lang;

        // RTL for Arabic
        if (lang === 'ar') {
            document.documentElement.setAttribute('dir', 'rtl');
        } else {
            document.documentElement.setAttribute('dir', 'ltr');
        }
    }

    // ── INIT ──────────────────────────────────

    function init() {
        var currentLang = getStoredLang();
        updateUI(currentLang);

        // Desktop dropdown toggle
        var langBtn      = document.querySelector('.lang-btn');
        var langDropdown = document.querySelector('.lang-dropdown');

        if (langBtn && langDropdown) {
            langBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                langDropdown.classList.toggle('active');
            });

            document.addEventListener('click', function (e) {
                if (!langBtn.contains(e.target) && !langDropdown.contains(e.target)) {
                    langDropdown.classList.remove('active');
                }
            });
        }

        // Language link clicks (desktop)
        document.querySelectorAll('[data-lang]').forEach(function (el) {
            el.addEventListener('click', function (e) {
                e.preventDefault();
                var lang = el.getAttribute('data-lang');
                if (langDropdown) langDropdown.classList.remove('active');
                if (lang === currentLang) return; // already active, no reload needed
                applyLanguage(lang);
            });
        });

        // Mobile select
        var mobileSelect = document.getElementById('mobileLangSelect');
        if (mobileSelect) {
            mobileSelect.addEventListener('change', function () {
                var lang = mobileSelect.value;
                if (lang === currentLang) return;
                applyLanguage(lang);
            });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();