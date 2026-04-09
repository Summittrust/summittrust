// API Utility for Supabase
class API {
    constructor() {
        this.supabaseUrl = CONFIG.SUPABASE_URL;
        this.supabaseKey = CONFIG.SUPABASE_ANON_KEY;
    }

    async request(endpoint, options = {}) {
        const url = `${this.supabaseUrl}/rest/v1/${endpoint}`;
        
        const headers = {
            'apikey': this.supabaseKey,
            'Authorization': `Bearer ${this.supabaseKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        };

        // Add session token if available
        const session = Session.getCurrentSession();
        if (session) {
            headers['Authorization'] = `Bearer ${session.token}`;
        }

        const config = {
            ...options,
            headers: {
                ...headers,
                ...options.headers
            }
        };

        try {
            const response = await fetch(url, config);
            
            if (!response.ok) {
                throw new Error(`API Error: ${response.status}`);
            }
            
            const data = await response.json();
            return { data, error: null };
        } catch (error) {
            console.error('API Request Failed:', error);
            return { data: null, error };
        }
    }

    // User methods
    async createUser(userData) {
        return this.request('users', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    }

    async getUserByEmail(email) {
        return this.request(`users?email=eq.${email}&select=*`);
    }

    async getUserById(id) {
        return this.request(`users?id=eq.${id}&select=*`);
    }

    // Account methods
    async createAccount(accountData) {
        return this.request('accounts', {
            method: 'POST',
            body: JSON.stringify(accountData)
        });
    }

    async getUserAccounts(userId) {
        return this.request(`accounts?user_id=eq.${userId}&select=*`);
    }

    // Transaction methods
    async createTransaction(transactionData) {
        return this.request('transactions', {
            method: 'POST',
            body: JSON.stringify(transactionData)
        });
    }

    async getUserTransactions(accountId) {
        return this.request(`transactions?from_account_id=eq.${accountId}&order=created_at.desc`);
    }

    // Session methods
    async createSession(sessionData) {
        return this.request('sessions', {
            method: 'POST',
            body: JSON.stringify(sessionData)
        });
    }

    async getSession(token) {
        return this.request(`sessions?session_token=eq.${token}&select=*`);
    }

    async deleteSession(token) {
        return this.request(`sessions?session_token=eq.${token}`, {
            method: 'DELETE'
        });
    }
}

// Create global API instance
const api = new API();