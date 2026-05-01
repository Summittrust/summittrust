// ════════════════════════════════════════════
//  ABOUT PAGE — JavaScript
// ════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
    initScrollAnimations();
    initCounters();
});

/* ── Scroll-reveal animations ─────────────── */
function initScrollAnimations() {
    const targets = document.querySelectorAll(
        '.about-how__card, .about-leadership__card, .about-stats__item, ' +
        '.about-split__visual, .about-split__content'
    );

    targets.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(32px)';
        el.style.transition = 'opacity .55s ease-out, transform .55s ease-out';
    });

    const io = new IntersectionObserver((entries) => {
        entries.forEach((entry, i) => {
            if (entry.isIntersecting) {
                // Stagger siblings in the same parent
                const siblings = Array.from(entry.target.parentElement.children);
                const idx = siblings.indexOf(entry.target);
                setTimeout(() => {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }, idx * 80);
                io.unobserve(entry.target);
            }
        });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    targets.forEach(el => io.observe(el));
}

/* ── Animated counters ────────────────────── */
function initCounters() {
    const nums = document.querySelectorAll('.about-stats__num');

    const io = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateCounter(entry.target);
                io.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });

    nums.forEach(el => io.observe(el));
}

function animateCounter(el) {
    const target = parseInt(el.getAttribute('data-count'), 10);
    const duration = 1800;
    const start = performance.now();

    function step(now) {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
        const current = Math.floor(eased * target);

        // Format large numbers
        if (target >= 1000) {
            el.textContent = (current / 1000).toFixed(current >= 100000 ? 0 : 1) +
                             (target >= 1000000 ? 'M' : 'K');
        } else {
            el.textContent = current;
        }

        if (progress < 1) requestAnimationFrame(step);
        else el.textContent = formatFinal(target);
    }

    requestAnimationFrame(step);
}

function formatFinal(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000)    return (n / 1000).toFixed(0) + 'K';
    return n.toString();
}