// Session Management
class SessionManager {
    constructor() {
        this.sessionKey = 'Summit Trust_session';
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
        return session;
    }

    getCurrentSession() {
        const sessionStr = localStorage.getItem(this.sessionKey);
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