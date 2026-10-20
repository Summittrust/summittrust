// Navbar Component
class Navbar {
    constructor() {
        this.init();
    }

    init() {
        this.mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
        this.mobileMenu = document.querySelector('.mobile-menu');
        this.themeToggle = document.getElementById('themeToggle');
        
        this.bindEvents();
        this.setInitialTheme();
    }

    bindEvents() {
        // Mobile menu toggle
        if (this.mobileMenuToggle) {
            this.mobileMenuToggle.addEventListener('click', () => {
                this.mobileMenu.classList.toggle('active');
                const icon = this.mobileMenuToggle.querySelector('i');
                if (icon) {
                    if (icon.classList.contains('fa-bars')) {
                        icon.classList.remove('fa-bars');
                        icon.classList.add('fa-times');
                    } else {
                        icon.classList.remove('fa-times');
                        icon.classList.add('fa-bars');
                    }
                }
            });
        }

        // Theme toggle
        if (this.themeToggle) {
            this.themeToggle.addEventListener('click', () => {
                this.toggleTheme();
            });
        }

        // Close mobile menu on window resize
        window.addEventListener('resize', () => {
            if (window.innerWidth > 768 && this.mobileMenu) {
                this.mobileMenu.classList.remove('active');
                const icon = this.mobileMenuToggle?.querySelector('i');
                if (icon) {
                    icon.classList.remove('fa-times');
                    icon.classList.add('fa-bars');
                }
            }
        });
    }

    setInitialTheme() {
        // Check localStorage first
        let theme = localStorage.getItem('Summit_Trust_theme');
        
        // If not in localStorage, try Helpers, default to light
        if (!theme && typeof Helpers !== 'undefined' && Helpers) {
            try {
                theme = Helpers.getCurrentTheme();
            } catch (error) {
                theme = 'light';
            }
        } else if (!theme) {
            theme = 'light';
        }
        
        this.applyTheme(theme);
    }

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        
        this.applyTheme(newTheme);
        
        // Save to localStorage
        localStorage.setItem('Summit_Trust_theme', newTheme);
        
        // Update Helpers if available
        if (typeof Helpers !== 'undefined' && Helpers.setTheme) {
            try {
                Helpers.setTheme(newTheme);
            } catch (error) {
                console.error('Error updating Helpers theme:', error);
            }
        }
    }

    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        this.updateThemeIcon(theme);
    }

    updateThemeIcon(theme) {
        if (this.themeToggle) {
            const icon = this.themeToggle.querySelector('i');
            if (icon) {
                if (theme === 'dark') {
                    icon.classList.remove('fa-moon');
                    icon.classList.add('fa-sun');
                } else {
                    icon.classList.remove('fa-sun');
                    icon.classList.add('fa-moon');
                }
            }
        }
    }
}

// Initialize navbar when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new Navbar();
});