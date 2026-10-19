// ============================================
// TESTIMONIES / SOCIAL PROOF TICKER
// Two popups every 12 seconds, shuffled.
// ============================================

(function () {

    // ── NAMES — EXPANDED LIST (100+ names) ──────
    var NAMES = [
        // American/English
        'Sarah Barker', 'James Okafor', 'Emily Chen', 'Michael Torres', 'Aisha Patel',
        'Daniel Wright', 'Lucas Fernandez', 'Priya Nair', 'Andrew Willis', 'Nadia Kowalski',
        'Samuel Adeyemi', 'Claire Dubois', 'Kevin Muñoz', 'Yuki Tanaka', 'Olivia Bennett',
        'Ibrahim Hassan', 'Sofia Rossi', 'David Mensah', 'Amara Diallo', 'Jake Morrison',
        'Layla Karimi', 'Thomas Müller', 'Grace Owusu', 'Ryan Nakamura', 'Isabella Lima',
        'Omar Khalil', 'Zoe Campbell', 'Marcus Johnson', 'Elena Petrov', 'William Zhang',
        
        // Additional names
        'Emma Thompson', 'Liam O\'Connor', 'Sophia Garcia', 'Noah Martinez', 'Isabella Rodriguez',
        'Mason Lee', 'Mia Davis', 'Ethan Brown', 'Charlotte Wilson', 'Alexander Moore',
        'Amelia Taylor', 'Benjamin Anderson', 'Harper Thomas', 'Elijah Jackson', 'Evelyn White',
        'Logan Harris', 'Abigail Martin', 'Carter Robinson', 'Emily Clark', 'Luke Rodriguez',
        'Madison Lewis', 'Dylan Walker', 'Elizabeth Hall', 'Gabriel Allen', 'Avery Young',
        'Julian King', 'Sofia Wright', 'David Scott', 'Victoria Green', 'Joseph Adams',
        
        // International
        'Mei Lin', 'Rajesh Kumar', 'Fatima Zahra', 'Carlos Mendez', 'Ingrid Bergman',
        'Kenji Watanabe', 'Olga Petrov', 'Hans Weber', 'Giovanni Romano', 'Marie Lambert',
        'Ahmed Mansour', 'Ananya Sharma', 'Diego Silva', 'Helena Novak', 'Björn Eriksson',
        'Catherine Moreau', 'Dmitri Volkov', 'Elena Garcia', 'Felipe Costa', 'Greta Schmidt',
        'Hiroshi Tanaka', 'Inga Larsen', 'Javier Lopez', 'Katrina Kowalski', 'Lars Johansson',
        
        // More variety
        'Natalie Clark', 'Oscar Pena', 'Paula Fernandes', 'Quentin Lee', 'Rebecca Walsh',
        'Stefan Bauer', 'Tatiana Popov', 'Ursula Mueller', 'Vikram Singh', 'Wendy Chang',
        'Xavier Dupont', 'Yara Nassar', 'Zachary Cohen', 'Andrea Ricci', 'Bruno Santos',
        'Camila Ruiz', 'Dominic Wong', 'Eva Lindstrom', 'Franklin Okonkwo', 'Gabriela Cruz',
        'Hannah Kim', 'Ivan Petrovic', 'Julia Fischer', 'Kyle Morrison', 'Laura Jensen',
        'Mohammed Ali', 'Nicole White', 'Oliver Schmidt', 'Patricia Brown', 'Quinn Sullivan'
    ];

    // ── AMOUNT GENERATOR ─────────────────────────
    // Generates a "realistic-looking" dollar amount between $50 and $400,000.
    // Uses weighted tiers so small amounts appear more often than huge ones.

    function randomAmount() {
        var tier = Math.random();
        var amount;

        if (tier < 0.35) {
            // $50 – $999  (35% chance)
            amount = 50 + Math.random() * 950;
        } else if (tier < 0.60) {
            // $1,000 – $9,999  (25% chance)
            amount = 1000 + Math.random() * 9000;
        } else if (tier < 0.80) {
            // $10,000 – $49,999  (20% chance)
            amount = 10000 + Math.random() * 40000;
        } else if (tier < 0.93) {
            // $50,000 – $199,999  (13% chance)
            amount = 50000 + Math.random() * 150000;
        } else {
            // $200,000 – $400,000  (7% chance)
            amount = 200000 + Math.random() * 200000;
        }

        // Round to a clean number based on magnitude
        if (amount < 1000)        return Math.round(amount / 10)  * 10;
        if (amount < 10000)       return Math.round(amount / 50)  * 50;
        if (amount < 100000)      return Math.round(amount / 500) * 500;
        return                           Math.round(amount / 1000) * 1000;
    }

    // ── AVATAR COLORS ─────────────────────────
    var COLORS = [
        '#D95F0E','#2563eb','#7c3aed','#059669',
        '#dc2626','#0891b2','#d97706','#be185d',
        '#16a34a','#6d28b9','#e11d48','#4f46e5',
        '#ea580c','#0d9488','#b45309','#0284c7',
        '#c2410c','#9333ea','#ca8a04','#2dd4bf'
    ];

    // ── STATE ─────────────────────────────────
    var usedNames = [];
    var ticker    = null;

    function fmtMoney(n) {
        return '$' + n.toLocaleString('en-US');
    }

    function pickRandom(arr, usedArr) {
        var available = arr.filter(function (x) { return !usedArr.includes(x); });
        if (!available.length) { usedArr.length = 0; available = arr.slice(); }
        var pick = available[Math.floor(Math.random() * available.length)];
        usedArr.push(pick);
        return pick;
    }

    function initials(name) {
        var parts = name.split(' ');
        return (parts[0][0] + (parts[1] ? parts[1][0] : '')).toUpperCase();
    }

    function colorFor(name) {
        var idx = 0;
        for (var i = 0; i < name.length; i++) idx += name.charCodeAt(i);
        return COLORS[idx % COLORS.length];
    }

    // ── BUILD POPUP ───────────────────────────

    function buildPopup(isProfit) {
        var name   = pickRandom(NAMES,   usedNames);
        var color  = colorFor(name);
        var inits  = initials(name);

        var el = document.createElement('div');
        el.className = 'testimony-popup';

        if (isProfit) {
            var amount = randomAmount();
            el.innerHTML =
                '<div class="testimony-avatar" style="background:' + color + ';">' + inits + '</div>'
                + '<div class="testimony-text">'
                + '<div class="testimony-name">' + name + '</div>'
                + '<div class="testimony-msg">just received a profit of <span class="highlight-amount">' + fmtMoney(amount) + '</span></div>'
                + '</div>'
                + '<div class="testimony-icon profit"><i class="fas fa-chart-line"></i></div>';
        } else {
            el.innerHTML =
                '<div class="testimony-avatar" style="background:' + color + ';">' + inits + '</div>'
                + '<div class="testimony-text">'
                + '<div class="testimony-name">' + name + '</div>'
                + '<div class="testimony-msg">just <span class="highlight-signup">signed up</span></div>'
                + '</div>'
                + '<div class="testimony-icon signup"><i class="fas fa-user-plus"></i></div>';
        }

        return el;
    }

    // ── SHOW PAIR ─────────────────────────────

    function showPair() {
        if (!ticker) return;

        // Decide which two to show (always one profit + one signup, shuffled)
        var types  = [true, false];
        // shuffle
        if (Math.random() > 0.5) types.reverse();

        types.forEach(function (isProfit, i) {
            setTimeout(function () {
                var popup = buildPopup(isProfit);
                ticker.appendChild(popup);

                // Auto-remove after 5s (leaving animation)
                setTimeout(function () {
                    popup.classList.add('leaving');
                    setTimeout(function () {
                        if (popup.parentNode) popup.parentNode.removeChild(popup);
                    }, 380);
                }, 5000);
            }, i * 800); // stagger the two popups by 800ms
        });
    }

    // ── INIT ──────────────────────────────────

    function init() {
        // Create ticker container
        ticker = document.createElement('div');
        ticker.id = 'testimonyTicker';
        document.body.appendChild(ticker);

        // Show first pair immediately then every 12 seconds
        showPair();
        setInterval(showPair, 12000);
    }

    // Wait for DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();