// Session Management
class SessionManager {
    constructor() {
        this.sessionKey = 'rcb_session';
        this.legacySessionKey = 'Horizon Bank_session';
        this.olderSessionKey = 'West Haven Bank_session';
        this.sessionDuration = 7 * 24 * 60 * 60 * 1000; // 7 days
    }

    createSession(userId, token) {
        const session = {
            userId,
            token,
            createdAt: Date.now(),
            expiresAt: Date.now() + this.sessionDuration
        };
        
        localStorage.setItem(this.sessionKey, JSON.stringify(session));
        localStorage.setItem(this.legacySessionKey, JSON.stringify(session));
        return session;
    }

    getCurrentSession() {
        let sessionStr = localStorage.getItem(this.sessionKey) || localStorage.getItem(this.legacySessionKey) || localStorage.getItem(this.olderSessionKey);
        if (!sessionStr) return null;
        
        try {
            const session = JSON.parse(sessionStr);
            
            // Check if session has expired
            if (Date.now() > session.expiresAt) {
                this.clearSession();
                return null;
            }
            
            return session;
        } catch (e) {
            this.clearSession();
            return null;
        }
    }

    clearSession() {
        localStorage.removeItem(this.sessionKey);
        localStorage.removeItem(this.legacySessionKey);
        localStorage.removeItem(this.olderSessionKey);
    }

    async validateSession() {
        const session = this.getCurrentSession();
        if (!session) return false;
        
        // Verify session with backend
        // const result = await api.getSession(session.token);
        // return result.data && result.data.length > 0;
        return true; // Simplified for now
    }
}

// Create global instance
const Session = new SessionManager();
console.log('Session loaded successfully');

