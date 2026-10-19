// Home Page JavaScript
class HomePage {
    constructor() {
        this.init();
    }

    init() {
        this.initializeAnimations();
        this.checkUserSession();
        this.initializeCounters();
    }

    initializeAnimations() {
        // Add scroll animation to feature cards
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }
            });
        }, observerOptions);

        // Observe feature cards
        document.querySelectorAll('.feature-card, .account-card').forEach(el => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(30px)';
            el.style.transition = 'all 0.6s ease-out';
            observer.observe(el);
        });
    }

    checkUserSession() {
        // Check if Session exists
        if (typeof Session !== 'undefined' && Session) {
            try {
                const session = Session.getCurrentSession();
                if (session && session.userId) {
                    this.updateNavbarForLoggedInUser();
                }
            } catch (error) {
                console.error('Error checking session:', error);
            }
        } else {
            console.log('Session not available yet');
        }
    }

    updateNavbarForLoggedInUser() {
        const authButtons = document.querySelector('.auth-buttons');
        if (authButtons) {
            authButtons.innerHTML = `
                <a href="/dashboard.html" class="btn btn-outline">
                    <i class="fas fa-tachometer-alt"></i>
                    Dashboard
                </a>
                <button class="btn btn-outline" id="logoutBtn">
                    <i class="fas fa-sign-out-alt"></i>
                    Logout
                </button>
            `;

            // Add logout handler
            const logoutBtn = document.getElementById('logoutBtn');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    if (typeof Session !== 'undefined' && Session) {
                        Session.clearSession();
                        window.location.reload();
                    }
                });
            }
        }
    }

    initializeCounters() {
        // Animate statistics counters
        const stats = document.querySelectorAll('.stat-number');
        stats.forEach(stat => {
            const value = stat.textContent;
            if (value.includes('K')) {
                // Handle K values (500K)
                const num = parseInt(value) * 1000;
                this.animateCounter(stat, num, 'K');
            } else if (value.includes('B')) {
                // Handle B values ($2B)
                const num = parseFloat(value.replace('$', '')) * 1000000000;
                this.animateCounter(stat, num, 'B', true);
            } else if (value.includes('%')) {
                // Handle percentages (99.9%)
                const num = parseFloat(value);
                this.animateCounter(stat, num, '%');
            }
        });
    }

    animateCounter(element, target, suffix, isCurrency = false) {
        let current = 0;
        const increment = target / 100;
        const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
                current = target;
                clearInterval(timer);
            }
            
            if (isCurrency) {
                element.textContent = `$${(current / 1000000000).toFixed(1)}B`;
            } else if (suffix === '%') {
                element.textContent = current.toFixed(1) + '%';
            } else if (suffix === 'K') {
                element.textContent = (current / 1000).toFixed(0) + 'K+';
            }
        }, 20);
    }
}

// Initialize home page when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Small delay to ensure all scripts are loaded
    setTimeout(() => {
        new HomePage();
    }, 100);
});