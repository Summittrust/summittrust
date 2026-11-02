const CurrencyConverter = {
    // Cache rates to minimize excessive queries while staying responsive to admin updates
    cache: {
        rates: null,
        timestamp: null,
        baseCurrency: null,
        expiryMinutes: 2 // Refresh every 2 minutes for timely admin sync
    },

    // Base API URL
    apiUrl: 'https://api.exchangerate.host',

    // Invalidate cache immediately (e.g. after admin updates)
    clearCache() {
        this.cache.rates = null;
        this.cache.timestamp = null;
    },

    // Get exchange rates (cached)
    async getExchangeRates(baseCurrency = 'USD', forceRefresh = false) {
        // Check cache first
        if (!forceRefresh && 
            this.cache.rates && 
            this.cache.timestamp && 
            this.cache.baseCurrency === baseCurrency) {
            const age = (Date.now() - this.cache.timestamp) / (1000 * 60);
            if (age < this.cache.expiryMinutes) {
                return this.cache.rates;
            }
        }

        try {
            if (window.db) {
                const { data, error } = await window.db.from('bank_settings').select('setting_value').eq('setting_key', 'exchange_rates').single();
                if (!error && data && data.setting_value) {
                    const dbRates = data.setting_value;
                    const mergedRates = Object.assign({ USD: 1.0 }, this.getFallbackRates(), dbRates);
                    this.cache.rates = mergedRates;
                    this.cache.timestamp = Date.now();
                    this.cache.baseCurrency = baseCurrency;
                    return mergedRates;
                }
            }
        } catch (dbErr) {
            console.warn('Could not fetch rates from DB:', dbErr);
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
            console.warn('Error fetching exchange rates, using fallback:', error);
            const fallback = this.getFallbackRates();
            this.cache.rates = fallback;
            this.cache.timestamp = Date.now();
            this.cache.baseCurrency = baseCurrency;
            return fallback;
        }
    },

    // Fallback rates in case API is down
    getFallbackRates() {
        return {
            'USD': 1.0,
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
            'TZS': 2600.00,
            'BWP': 13.50,
            'ZMW': 27.00,
            'ZWG': 26.50,
            'ZWL': 26.50,
            'AED': 3.67,
            'SAR': 3.75,
            'NAD': 18.80,
            'MWK': 1730.00,
            'RWF': 1300.00,
            'SZL': 18.80,
            'LSL': 18.80,
            'MXN': 17.00,
            'ARS': 850.00,
            'COP': 3900.00,
            'CLP': 950.00,
            'PHP': 56.00
        };
    },

    // Convert any currency to any other currency based on admin / bank_settings exchange rates
    async convertCurrency(amount, fromCurrency = 'USD', toCurrency = 'USD') {
        const from = (fromCurrency || 'USD').toUpperCase();
        const to = (toCurrency || 'USD').toUpperCase();
        const numAmount = parseFloat(amount) || 0;

        if (from === to) {
            return {
                amount: numAmount,
                currency: to,
                fromCurrency: from,
                toCurrency: to,
                rate: 1.0,
                unitRate: 1.0,
                inverseRate: 1.0,
                formatted: this.formatCurrency(numAmount, to),
                isEstimate: false
            };
        }

        const rates = await this.getExchangeRates('USD');
        const fromRate = rates[from] !== undefined ? rates[from] : (from === 'USD' ? 1.0 : null);
        const toRate = rates[to] !== undefined ? rates[to] : (to === 'USD' ? 1.0 : null);

        if (!fromRate || !toRate) {
            console.warn(`Exchange rate missing for pair ${from} -> ${to}, using 1:1`);
            return {
                amount: numAmount,
                currency: to,
                fromCurrency: from,
                toCurrency: to,
                rate: 1.0,
                unitRate: 1.0,
                inverseRate: 1.0,
                formatted: this.formatCurrency(numAmount, to),
                isEstimate: true
            };
        }

        // Amount in fromCurrency converted to USD base, then to toCurrency
        const amountInUSD = numAmount / fromRate;
        const converted = amountInUSD * toRate;
        const unitRate = toRate / fromRate;
        const inverseRate = fromRate / toRate;

        return {
            amount: converted,
            currency: to,
            fromCurrency: from,
            toCurrency: to,
            rate: unitRate,
            unitRate: unitRate,
            inverseRate: inverseRate,
            fromRate: fromRate,
            toRate: toRate,
            formatted: this.formatCurrency(converted, to),
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
            'CAD': 'CA$', 'AUD': 'AU$', 'CHF': 'Fr', 'CNY': '¥',
            'INR': '₹', 'BRL': 'R$', 'ZAR': 'R', 'NGN': '₦',
            'KES': 'KSh', 'GHS': 'GH₵', 'UGX': 'USh', 'TZS': 'TSh',
            'AED': 'AED', 'SAR': 'SAR', 'TRY': '₺', 'RUB': '₽',
            'BWP': 'P', 'ZMW': 'ZK', 'ZWG': 'ZiG', 'ZWL': 'ZiG',
            'NAD': 'N$', 'MWK': 'MK', 'RWF': 'FRw', 'SZL': 'E', 'LSL': 'L',
            'MXN': '$', 'ARS': '$', 'COP': '$', 'CLP': '$', 'PHP': '₱'
        };
        return symbols[currencyCode] || currencyCode;
    },

    // Format currency with proper locale
    formatCurrency(amount, currencyCode) {
        const code = currencyCode || 'USD';
        const sym = this.getCurrencySymbol(code);
        const val = parseFloat(amount) || 0;
        const formatted = val.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
        if (sym === '$') return '$' + formatted;
        return sym + ' ' + formatted;
    },

    // Get currency code from country
    getCurrencyFromCountry(countryCode) {
        if (!countryCode) return 'USD';
        const c = countryCode.toLowerCase().trim();
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

window.CurrencyConverter = CurrencyConverter;

