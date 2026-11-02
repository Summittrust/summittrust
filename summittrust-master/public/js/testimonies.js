// ==========================================================================
// Summit Trust Holdings — Social Proof / Testimonies Live Activity Ticker
// Real-time notifications for deposits, profits, signups & vault locks
// ==========================================================================

(function () {
    'use strict';

    // Prevent double initialization
    if (window.__hbTestimoniesInitialized) return;

    // Strictly restrict testimonies live ticker to the Home page
    var path = window.location.pathname.toLowerCase();
    var isHome = path === '/' ||
                 path.endsWith('/') ||
                 path.endsWith('/public/') ||
                 path.endsWith('/public/') ||
                 path === '' ||
                 (!path.includes('auth') &&
                  !path.includes('dashboard') &&
                  !path.includes('admin') &&
                  !path.includes('about'));

    if (!isHome) return;

    window.__hbTestimoniesInitialized = true;

    // ── EXPANDED NAMES LIST (Swiss, European & Global Private Wealth Clients) ──────
    var NAMES = [
        // Swiss & Liechtenstein Private Clients
        'Laurent Favre', 'Beatrix von Berg', 'Christoph Widmer', 'Sybille Keller', 'Lukas Zimmermann',
        'Adrien Debrunner', 'Charlotte Vauthey', 'Julian von Meiss', 'Philippe Bär', 'Camille Sandoz',
        'Mathieu Burckhardt', 'Maximilian von Bern', 'Gian-Luca Meyer', 'Therese Oertli', 'Florian Steiger',
        'Céline Rochat', 'Marc Hodel', 'Nathalie Vonlanthen', 'Severin Ammann',

        // UK & North America Private Clients
        'Lord Alistair Sterling', 'Constance Beaumont', 'James Sterling', 'Emily Chen', 'Michael Torres',
        'Daniel Wright', 'Andrew Willis', 'Olivia Bennett', 'Jake Morrison', 'Zoe Campbell',
        'Marcus Johnson', 'William Zhang', 'Emma Thompson', 'Liam O\'Connor', 'Sophia Garcia',
        'Noah Martinez', 'Isabella Rodriguez', 'Mason Lee', 'Mia Davis', 'Ethan Brown',
        'Charlotte Wilson', 'Alexander Moore', 'Amelia Taylor', 'Benjamin Anderson', 'Arthur Pendelton',
        'Benedict Calthorpe', 'Carter Robinson', 'Emily Clark', 'Luke Rodriguez', 'Avery Young',
        
        // Continental Europe
        'Claire Dubois', 'Nadia Kowalski', 'Sofia Rossi', 'Thomas Müller', 'Elena Petrov',
        'Giovanni Romano', 'Marie Lambert', 'Hans Weber', 'Helena Novak', 'Björn Eriksson',
        'Catherine Moreau', 'Dmitri Volkov', 'Elena Garcia', 'Greta Schmidt', 'Lars Johansson',
        'Stefan Bauer', 'Tatiana Popov', 'Ursula Mueller', 'Andrea Ricci', 'Eva Lindstrom',
        'Julia Fischer', 'Laura Jensen', 'Oliver Schmidt', 'Henrik Lindqvist', 'Frederik van den Berg',
        'Victoire de Montmirail', 'Klaus Lindemann', 'Geneviève de Courcy',
        
        // Middle East Family Offices & Private Wealth
        'Tariq Al-Mansoor', 'Ibrahim Hassan', 'Soraya Al-Khatib', 'Layla Karimi', 'Zayd Al-Hashemi',
        'Omar Khalil', 'Fatima Zahra', 'Ahmed Mansour', 'Yara Nassar', 'Farah Al-Sabah',
        'Mohammed Ali', 'Karim El-Sayed',
        
        // Asia-Pacific Private Wealth
        'Aisha Patel', 'Priya Nair', 'Yuki Tanaka', 'Ryan Nakamura', 'Mei Lin',
        'Rajesh Kumar', 'Kenji Watanabe', 'Ananya Sharma', 'Hiroshi Tanaka', 'Vikram Singh',
        'Wendy Chang', 'Dominic Wong', 'Hannah Kim',
        
        // Latin America Private Wealth
        'Lucas Fernandez', 'Kevin Muñoz', 'Isabella Lima', 'Carlos Mendez', 'Diego Silva',
        'Felipe Costa', 'Javier Lopez', 'Bruno Santos', 'Camila Ruiz', 'Gabriela Cruz'
    ];

    // Saturated avatar background colors
    var COLORS = [
        '#0B6BCB', '#0F7B4F', '#7C3AED', '#D95F0E', '#DC2626',
        '#0891B2', '#D97706', '#BE185D', '#16A34A', '#6D28D9',
        '#E11D48', '#4F46E5', '#EA580C', '#0D9488', '#0284C7'
    ];

    var usedNames = [];
    var ticker = null;
    var timerId = null;

    function fmtMoney(n) {
        return '$' + n.toLocaleString('en-US');
    }

    function pickRandom(arr, usedArr) {
        var available = arr.filter(function (x) { return usedArr.indexOf(x) === -1; });
        if (!available.length) {
            usedArr.length = 0;
            available = arr.slice();
        }
        var pick = available[Math.floor(Math.random() * available.length)];
        usedArr.push(pick);
        return pick;
    }

    function getInitials(name) {
        var parts = name.trim().split(/\s+/);
        if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
        return (parts[0][0] + parts[1][0]).toUpperCase();
    }

    function getColor(name) {
        var hash = 0;
        for (var i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        var index = Math.abs(hash) % COLORS.length;
        return COLORS[index];
    }

    function randomAmount() {
        var r = Math.random();
        var val;
        if (r < 0.40) {
            val = 250 + Math.random() * 2250;      // $250 - $2,500
        } else if (r < 0.75) {
            val = 2500 + Math.random() * 12500;   // $2,500 - $15,000
        } else if (r < 0.92) {
            val = 15000 + Math.random() * 55000;  // $15,000 - $70,000
        } else {
            val = 70000 + Math.random() * 180000; // $70,000 - $250,000
        }

        if (val < 1000) return Math.round(val / 10) * 10;
        if (val < 10000) return Math.round(val / 50) * 50;
        if (val < 50000) return Math.round(val / 250) * 250;
        return Math.round(val / 1000) * 1000;
    }

    // ── POPUP FACTORY ──────
    function createPopup() {
        var name = pickRandom(NAMES, usedNames);
        var inits = getInitials(name);
        var color = getColor(name);

        var eventType = Math.random();
        var msgHtml = '';
        var iconHtml = '';

        if (eventType < 0.50) {
            // Profit distribution
            var amount = randomAmount();
            msgHtml = 'just received a payout of <span class="highlight-amount">' + fmtMoney(amount) + '</span>';
            iconHtml = '<span class="testimony-icon profit"><i class="fas fa-chart-line"></i></span>';
        } else if (eventType < 0.75) {
            // New user registration
            msgHtml = 'just activated an <span class="highlight-action">Institutional Account</span>';
            iconHtml = '<span class="testimony-icon signup"><i class="fas fa-user-check"></i></span>';
        } else if (eventType < 0.90) {
            // Treasury Vault lock
            var vaultAmount = randomAmount();
            msgHtml = 'locked <span class="highlight-amount">' + fmtMoney(vaultAmount) + '</span> into Summit Trust Holdings Vault';
            iconHtml = '<span class="testimony-icon vault"><i class="fas fa-vault"></i></span>';
        } else {
            // Security verification
            msgHtml = 'completed <span class="highlight-action">Biometric Dual-Sig Setup</span>';
            iconHtml = '<span class="testimony-icon verified"><i class="fas fa-shield-halved"></i></span>';
        }

        var popup = document.createElement('div');
        popup.className = 'testimony-popup';
        popup.setAttribute('role', 'status');

        popup.innerHTML =
            '<div class="testimony-avatar" style="background-color: ' + color + ';">' + inits + '</div>' +
            '<div class="testimony-text">' +
                '<div class="testimony-top">' +
                    '<span class="testimony-name">' + name + '</span>' +
                    '<span class="testimony-badge"><span class="testimony-pulse"></span>Live</span>' +
                '</div>' +
                '<div class="testimony-msg">' + msgHtml + '</div>' +
            '</div>' +
            '<div class="testimony-actions">' +
                '<button type="button" class="testimony-close-btn" aria-label="Dismiss">&times;</button>' +
                iconHtml +
            '</div>';

        // Auto-dismiss management with hover pause
        var dismissTimeout = null;
        var remainingTime = 5500;
        var startTime = Date.now();

        function removePopup() {
            if (popup.classList.contains('leaving')) return;
            popup.classList.add('leaving');
            setTimeout(function () {
                if (popup.parentNode) {
                    popup.parentNode.removeChild(popup);
                }
            }, 360);
        }

        function scheduleDismiss(delay) {
            dismissTimeout = setTimeout(removePopup, delay);
        }

        // Close button handler
        var closeBtn = popup.querySelector('.testimony-close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                clearTimeout(dismissTimeout);
                removePopup();
            });
        }

        // Hover pause
        popup.addEventListener('mouseenter', function () {
            clearTimeout(dismissTimeout);
            remainingTime -= (Date.now() - startTime);
            if (remainingTime < 1000) remainingTime = 1000;
        });

        popup.addEventListener('mouseleave', function () {
            startTime = Date.now();
            scheduleDismiss(remainingTime);
        });

        scheduleDismiss(remainingTime);
        return popup;
    }

    // ── SHOW SINGLE POPUP ──────
    function showPopup() {
        if (!ticker) {
            ticker = getOrCreateTicker();
            if (!ticker) return;
        }

        // Limit active popups to at most 2 so screen doesn't clutter
        var activePopups = ticker.querySelectorAll('.testimony-popup:not(.leaving)');
        if (activePopups.length >= 2) {
            var oldest = activePopups[0];
            oldest.classList.add('leaving');
            setTimeout(function () {
                if (oldest.parentNode) oldest.parentNode.removeChild(oldest);
            }, 360);
        }

        var popup = createPopup();
        ticker.appendChild(popup);
    }

    // ── GET OR CREATE CONTAINER ──────
    function getOrCreateTicker() {
        var existing = document.getElementById('testimonyTicker');
        if (existing) return existing;
        if (!document.body) return null;

        var el = document.createElement('div');
        el.id = 'testimonyTicker';
        el.setAttribute('aria-live', 'polite');
        document.body.appendChild(el);
        return el;
    }

    // ── INITIALIZATION ──────
    function initTicker() {
        ticker = getOrCreateTicker();
        if (!ticker) {
            setTimeout(initTicker, 200);
            return;
        }

        // First popup appears 1.2s after page load for natural entry
        setTimeout(function () {
            showPopup();
        }, 1200);

        // Second popup follows 2.6s later
        setTimeout(function () {
            showPopup();
        }, 3800);

        // Subsequent popups appear regularly every 7 to 9 seconds
        timerId = setInterval(function () {
            showPopup();
        }, 8500);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initTicker);
    } else {
        // DOM already parsed
        initTicker();
    }
})();

