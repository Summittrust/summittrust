const CurrencyConverter = {
    // Cache rates to minimize API calls
    cache: {
        rates: null,
        timestamp: null,
        baseCurrency: null,
        expiryMinutes: 60 // Refresh every hour
    },

    // Base API URL
    apiUrl: 'https://api.exchangerate.host',

    // Get exchange rates (cached)
    async getExchangeRates(baseCurrency = 'USD') {
        // Check cache first
        if (this.cache.rates && 
            this.cache.timestamp && 
            this.cache.baseCurrency === baseCurrency) {
            const age = (Date.now() - this.cache.timestamp) / (1000 * 60);
            if (age < this.cache.expiryMinutes) {
                return this.cache.rates;
            }
        }

        try {
            const response = await fetch(`${this.apiUrl}/latest?base=${baseCurrency}`);
            const data = await response.json();
            
            if (data.success) {
                this.cache.rates = data.rates;
                this.cache.timestamp = Date.now();
                this.cache.baseCurrency = baseCurrency;
                return data.rates;
            } else {
                throw new Error('Failed to fetch rates');
            }
        } catch (error) {
            console.error('Error fetching exchange rates:', error);
            return this.getFallbackRates();
        }
    },

    // Fallback rates in case API is down
    getFallbackRates() {
        return {
            'EUR': 0.92,
            'GBP': 0.79,
            'JPY': 150.50,
            'CAD': 1.35,
            'AUD': 1.52,
            'CHF': 0.88,
            'CNY': 7.24,
            'INR': 83.50,
            'BRL': 5.15,
            'ZAR': 18.80,
            'NGN': 1500.00,
            'KES': 130.00,
            'GHS': 12.50,
            'UGX': 3800.00,
            'TZS': 2600.00
        };
    },

    // Convert USD to any currency
    async convertCurrency(amount, fromCurrency = 'USD', toCurrency) {
        if (fromCurrency === toCurrency) {
            return {
                amount: amount,
                currency: toCurrency,
                formatted: this.formatCurrency(amount, toCurrency)
            };
        }

        const rates = await this.getExchangeRates(fromCurrency);
        
        if (!rates || !rates[toCurrency]) {
            console.warn(`Rate not found for ${toCurrency}, using 1:1`);
            return {
                amount: amount,
                currency: toCurrency,
                formatted: this.formatCurrency(amount, toCurrency),
                isEstimate: true
            };
        }

        const converted = amount * rates[toCurrency];
        
        return {
            amount: converted,
            currency: toCurrency,
            rate: rates[toCurrency],
            formatted: this.formatCurrency(converted, toCurrency),
            isEstimate: false
        };
    },

    // Quick USD to local currency conversion
    async usdToLocal(usdAmount, targetCurrency) {
        return this.convertCurrency(usdAmount, 'USD', targetCurrency);
    },

    // Get currency symbol
    getCurrencySymbol(currencyCode) {
        const symbols = {
            'USD': '$', 'EUR': '€', 'GBP': '£', 'JPY': '¥',
            'CAD': 'C$', 'AUD': 'A$', 'CHF': 'Fr', 'CNY': '¥',
            'INR': '₹', 'BRL': 'R$', 'ZAR': 'R', 'NGN': '₦',
            'KES': 'KSh', 'GHS': 'GH₵', 'UGX': 'USh', 'TZS': 'TSh',
            'AED': 'د.إ', 'SAR': '﷼', 'TRY': '₺', 'RUB': '₽'
        };
        return symbols[currencyCode] || currencyCode;
    },

    // Format currency with proper locale
    formatCurrency(amount, currencyCode) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currencyCode,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
    },

    // Get currency code from country (ISO 3166-1 alpha-2)
    getCurrencyFromCountry(countryCode) {
        const countryCurrencyMap = {
            // North America
            'US': 'USD', 'CA': 'CAD', 'MX': 'MXN',
            // Europe
            'GB': 'GBP', 'DE': 'EUR', 'FR': 'EUR', 'IT': 'EUR', 'ES': 'EUR',
            'NL': 'EUR', 'BE': 'EUR', 'PT': 'EUR', 'CH': 'CHF', 'SE': 'SEK',
            'NO': 'NOK', 'DK': 'DKK', 'PL': 'PLN', 'CZ': 'CZK', 'HU': 'HUF',
            // Asia
            'JP': 'JPY', 'CN': 'CNY', 'IN': 'INR', 'KR': 'KRW', 'SG': 'SGD',
            'MY': 'MYR', 'TH': 'THB', 'VN': 'VND', 'PH': 'PHP', 'ID': 'IDR',
            'PK': 'PKR', 'BD': 'BDT', 'LK': 'LKR', 'NP': 'NPR',
            // Middle East
            'AE': 'AED', 'SA': 'SAR', 'IL': 'ILS', 'TR': 'TRY', 'QA': 'QAR',
            'KW': 'KWD', 'BH': 'BHD', 'OM': 'OMR',
            // Africa
            'ZA': 'ZAR', 'NG': 'NGN', 'KE': 'KES', 'GH': 'GHS', 'UG': 'UGX',
            'TZ': 'TZS', 'EG': 'EGP', 'MA': 'MAD', 'DZ': 'DZD', 'TN': 'TND',
            'ET': 'ETB', 'CM': 'XAF', 'SN': 'XOF', 'CI': 'XOF',
            // South America
            'BR': 'BRL', 'AR': 'ARS', 'CL': 'CLP', 'CO': 'COP', 'PE': 'PEN',
            'VE': 'VES', 'UY': 'UYU', 'PY': 'PYG', 'BO': 'BOB',
            // Oceania
            'AU': 'AUD', 'NZ': 'NZD', 'FJ': 'FJD'
        };
        return countryCurrencyMap[countryCode] || 'USD';
    },

    // Get all supported currencies
    async getSupportedCurrencies() {
        try {
            const response = await fetch(`${this.apiUrl}/symbols`);
            const data = await response.json();
            return data.symbols || {};
        } catch (error) {
            console.error('Error fetching currency symbols:', error);
            return null;
        }
    },

    // Convert and display in user-friendly format
    async formatBalanceForUser(usdAmount, userCountry) {
        const currencyCode = this.getCurrencyFromCountry(userCountry);
        const result = await this.usdToLocal(usdAmount, currencyCode);
        
        return {
            usd: this.formatCurrency(usdAmount, 'USD'),
            local: result.formatted,
            currency: currencyCode,
            rate: result.rate,
            symbol: this.getCurrencySymbol(currencyCode),
            raw: {
                usd: usdAmount,
                local: result.amount
            }
        };
    },

    // Format multiple balances at once
    async formatBalances(balances, userCountry) {
        const currencyCode = this.getCurrencyFromCountry(userCountry);
        const rates = await this.getExchangeRates('USD');
        
        if (!rates || !rates[currencyCode]) {
            return balances.map(b => ({
                ...b,
                usd: this.formatCurrency(b.amount, 'USD'),
                local: this.formatCurrency(b.amount, 'USD'),
                currency: 'USD'
            }));
        }

        const rate = rates[currencyCode];
        
        return balances.map(b => ({
            ...b,
            usd: this.formatCurrency(b.amount, 'USD'),
            local: this.formatCurrency(b.amount * rate, currencyCode),
            currency: currencyCode,
            rate: rate
        }));
    }
};