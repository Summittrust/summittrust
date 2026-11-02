// Helper functions
const Helpers = {
    // Generate random string
    generateRandomString(length = 32) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    },

    // Generate transaction PIN (4 digits)
    generateTransactionPIN() {
        return Math.floor(1000 + Math.random() * 9000).toString();
    },

    // Hash password (simplified for demo)
    async hashPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hash = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hash));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return hashHex;
    },

    // Get currency code from country name
    getCurrencyFromCountry(country) {
        if (!country) return 'USD';
        const c = country.toLowerCase().trim();
        if (c === 'za' || c.includes('south africa')) return 'ZAR';
        if (c === 'bw' || c.includes('botswana'))     return 'BWP';
        if (c === 'zm' || c.includes('zambia'))       return 'ZMW';
        if (c === 'zw' || c.includes('zimbabwe'))     return 'ZWG';
        if (c === 'ng' || c.includes('nigeria'))      return 'NGN';
        if (c === 'ke' || c.includes('kenya'))        return 'KES';
        if (c === 'gh' || c.includes('ghana'))        return 'GHS';
        if (c === 'ug' || c.includes('uganda'))       return 'UGX';
        if (c === 'tz' || c.includes('tanzania'))     return 'TZS';
        if (c === 'ch' || c.includes('United Kingdom'))  return 'CHF';
        if (c === 'gb' || c.includes('united kingdom') || c.includes('britain') || c === 'uk') return 'GBP';
        if (c === 'eu' || c.includes('germany') || c.includes('france') || c.includes('italy') || c.includes('spain') || c.includes('portugal') || c.includes('netherlands') || c.includes('belgium') || c.includes('ireland') || c.includes('austria') || c.includes('greece') || c.includes('finland')) return 'EUR';
        if (c === 'ca' || c.includes('canada'))       return 'CAD';
        if (c === 'au' || c.includes('australia'))    return 'AUD';
        if (c === 'in' || c.includes('india'))        return 'INR';
        if (c === 'ae' || c.includes('united arab emirates') || c.includes('emirates') || c === 'uae') return 'AED';
        if (c === 'sa' || c.includes('saudi'))        return 'SAR';
        if (c === 'na' || c.includes('namibia'))      return 'NAD';
        if (c === 'mw' || c.includes('malawi'))       return 'MWK';
        if (c === 'rw' || c.includes('rwanda'))       return 'RWF';
        if (c === 'sz' || c.includes('swaziland') || c.includes('eswatini')) return 'SZL';
        if (c === 'ls' || c.includes('lesotho'))      return 'LSL';
        return 'USD';
    },

    // Format currency
    formatCurrency(amount, currencyCode, isConverted) {
        let currency = currencyCode || 'USD';
        if (!currencyCode && window.currentUser && window.currentUser.country) {
            currency = this.getCurrencyFromCountry(window.currentUser.country);
        } else if (!currencyCode && window.currentAccountCurrency) {
            currency = window.currentAccountCurrency;
        }

        let displayVal = parseFloat(amount) || 0;
        if (!isConverted && currency !== 'USD') {
            const rates = (window.CurrencyConverter && window.CurrencyConverter.cache && window.CurrencyConverter.cache.rates) 
                ? window.CurrencyConverter.cache.rates 
                : {
                    'USD': 1.0, 'EUR': 0.92, 'GBP': 0.79, 'CHF': 0.88, 'JPY': 150.50, 'CAD': 1.35, 'AUD': 1.52,
                    'ZAR': 18.80, 'BWP': 13.50, 'ZMW': 27.00, 'ZWG': 26.50, 'ZWL': 26.50,
                    'NGN': 1500.00, 'KES': 130.00, 'GHS': 12.50, 'UGX': 3800.00, 'TZS': 2600.00,
                    'INR': 83.50, 'AED': 3.67, 'SAR': 3.75, 'NAD': 18.80, 'MWK': 1730.00, 'RWF': 1300.00,
                    'SZL': 18.80, 'LSL': 18.80
                  };
            const rate = rates[currency] || (currency === 'ZWG' ? rates['ZWL'] : (currency === 'ZWL' ? rates['ZWG'] : 1.0)) || 1.0;
            displayVal = displayVal * rate;
        }

        const symbols = {
            'USD': '$',
            'EUR': '€',
            'GBP': '£',
            'CHF': 'Fr. ',
            'ZAR': 'R ',
            'BWP': 'P ',
            'ZMW': 'ZK ',
            'ZWG': 'ZiG ',
            'ZWL': 'ZiG ',
            'NGN': '₦',
            'KES': 'KSh ',
            'GHS': 'GH₵ ',
            'UGX': 'USh ',
            'TZS': 'TSh ',
            'CAD': 'CA$ ',
            'AUD': 'AU$ ',
            'INR': '₹',
            'AED': 'AED ',
            'SAR': 'SAR ',
            'NAD': 'N$ ',
            'MWK': 'MK ',
            'RWF': 'FRw ',
            'SZL': 'E ',
            'LSL': 'L '
        };

        const formattedNum = displayVal.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });

        if (symbols[currency]) {
            return (symbols[currency] === '$' ? '$' : symbols[currency]) + formattedNum;
        }

        try {
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: currency,
                minimumFractionDigits: 2
            }).format(displayVal);
        } catch (e) {
            return '$' + formattedNum;
        }
    },

    formatUSDToLocal(amount) {
        return this.formatCurrency(amount, null, false);
    },

    // Format date
    formatDate(date) {
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    // Generate transaction ID
    generateTransactionId() {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 8);
        return `MTX-${timestamp}-${random}`.toUpperCase();
    },

    // Generate account number
    generateAccountNumber() {
        const prefix = 'RC';
        const timestamp = Date.now().toString().slice(-8);
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        return `${prefix}${timestamp}${random}`;
    },

    // Validate email
    validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    },

    // Validate password strength
    validatePassword(password) {
        return password.length >= 8;
    },

    // Get current language
    getCurrentLanguage() {
        return localStorage.getItem('rcb_language') || localStorage.getItem('Horizon Bank_language') || localStorage.getItem('West Haven Bank_language') || 'en';
    },

    // Get theme
    getCurrentTheme() {
        return localStorage.getItem('theme') || localStorage.getItem('rcb_theme') || localStorage.getItem('Horizon Bank_theme') || localStorage.getItem('West Haven Bank_theme') || 'dark';
    },

    // Set theme
    setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        localStorage.setItem('rcb_theme', theme);
        localStorage.setItem('Horizon Bank_theme', theme);
    },

    // Show notification
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `alert alert-${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : 
                                 type === 'error' ? 'exclamation-circle' : 
                                 type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;
        
        notification.style.position = 'fixed';
        notification.style.top = '20px';
        notification.style.right = '20px';
        notification.style.zIndex = '9999';
        notification.style.minWidth = '300px';
        notification.style.boxShadow = 'var(--shadow)';
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 5000);
    },

    // Translate text
    t(key) {
        const lang = this.getCurrentLanguage();
        return TRANSLATIONS[lang]?.[key] || TRANSLATIONS.en[key] || key;
    }
};

console.log('Helpers loaded successfully');


