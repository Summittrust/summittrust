// ════════════════════════════════════════════
//  LEGAL MODALS — legal.js
//  Exposes:  openPrivacyPolicy(e)
//            openTerms(e)
//            openLegal(tab)      ← programmatic
// ════════════════════════════════════════════

(function () {
    'use strict';

    /* ── Content ────────────────────────────── */
    const PRIVACY = {
        title: 'Privacy Policy',
        date: 'Effective: January 1, 2024',
        html: `
<h2>1. Introduction</h2>
<p>Welcome to <strong>Summit Trust Digital Bank</strong> ("Summit Trust", "we", "our", "us"). This Privacy Policy explains how we collect, use, disclose, and safeguard your personal information when you use our website, mobile application, and financial services (collectively, the "Services").</p>
<p>By accessing or using our Services, you agree to this Privacy Policy. If you do not agree, please discontinue use immediately.</p>

<h2>2. Information We Collect</h2>
<p>We collect information you provide directly, automatically, and from third parties:</p>
<ul>
    <li><strong>Identity Data</strong> — full name, date of birth, government-issued ID, Social Security Number (or equivalent).</li>
    <li><strong>Contact Data</strong> — email address, phone number, mailing address.</li>
    <li><strong>Financial Data</strong> — bank account numbers, transaction history, investment balances, loan details.</li>
    <li><strong>Technical Data</strong> — IP address, browser type, device identifiers, cookies, usage logs.</li>
    <li><strong>Communications Data</strong> — messages sent through our support or in-app chat.</li>
</ul>

<h2>3. How We Use Your Information</h2>
<p>We use collected information to:</p>
<ul>
    <li>Provide, maintain, and improve our Services.</li>
    <li>Process transactions and manage your account.</li>
    <li>Verify your identity and prevent fraud.</li>
    <li>Comply with legal and regulatory obligations (AML, KYC).</li>
    <li>Send service notifications, security alerts, and account updates.</li>
    <li>Personalise your experience and improve recommendations.</li>
    <li>Conduct analytics and business intelligence (in aggregated, anonymised form).</li>
</ul>

<h2>4. Sharing Your Information</h2>
<p>We do <strong>not</strong> sell your personal information. We may share it with:</p>
<ul>
    <li><strong>Service Providers</strong> — Supabase (database), Cloudinary (media), payment processors, identity verification partners — each bound by data-processing agreements.</li>
    <li><strong>Regulatory Authorities</strong> — financial regulators, law enforcement, or courts where required by law.</li>
    <li><strong>Business Transfers</strong> — in the event of a merger, acquisition, or asset sale, subject to continued privacy protections.</li>
</ul>

<h2>5. Data Retention</h2>
<p>We retain personal data for as long as your account is active or as needed to fulfil legal obligations (typically 7 years for financial records). You may request deletion of non-legally-required data by contacting us.</p>

<h2>6. Security</h2>
<p>We employ industry-standard security measures including 256-bit TLS encryption, AES-256 at-rest encryption, biometric authentication options, multi-factor authentication, and continuous monitoring. No method of transmission or storage is 100% secure; use our Services at your own risk.</p>

<h2>7. Cookies & Tracking</h2>
<p>We use essential cookies (required for authentication and security), analytics cookies (Google Analytics, aggregated), and language preference cookies (Google Translate). You can manage cookies via your browser settings; disabling essential cookies may impair functionality.</p>

<h2>8. Your Rights</h2>
<p>Depending on your jurisdiction, you may have the right to:</p>
<ul>
    <li>Access and receive a copy of your personal data.</li>
    <li>Correct inaccurate data.</li>
    <li>Request erasure (subject to legal retention requirements).</li>
    <li>Restrict or object to processing.</li>
    <li>Data portability.</li>
    <li>Withdraw consent at any time (where processing is consent-based).</li>
</ul>
<p>To exercise these rights, contact <a href="mailto:privacy@summit-trustbank.com">privacy@summit-trustbank.com</a>.</p>

<h2>9. Children's Privacy</h2>
<p>Our Services are not directed to individuals under the age of 18. We do not knowingly collect personal information from minors. If you believe we have inadvertently collected such data, contact us for immediate deletion.</p>

<h2>10. Changes to This Policy</h2>
<p>We may update this Privacy Policy periodically. We will notify you of material changes via email or in-app notification at least 14 days before they take effect. Continued use of our Services after the effective date constitutes acceptance.</p>

<h2>11. Contact Us</h2>
<p>For privacy inquiries: <a href="mailto:privacy@summit-trustbank.com">privacy@summit-trustbank.com</a><br>
Summit Trust Digital Bank · Privacy Team · 123 Finance Street, Lagos, Nigeria.</p>
        `
    };

    const TERMS = {
        title: 'Terms of Service',
        date: 'Effective: January 1, 2024',
        html: `
<h2>1. Acceptance of Terms</h2>
<p>By creating an account or using any feature of <strong>Summit Trust Digital Bank</strong> ("Summit Trust", "we", "us"), you agree to be legally bound by these Terms of Service ("Terms"). If you do not agree, you may not use our Services.</p>

<h2>2. Eligibility</h2>
<p>To use Summit Trust, you must:</p>
<ul>
    <li>Be at least 18 years of age (or the age of majority in your jurisdiction).</li>
    <li>Provide accurate, complete, and current registration information.</li>
    <li>Not be prohibited from receiving financial services under applicable law.</li>
    <li>Complete our identity verification (KYC) process.</li>
</ul>

<h2>3. Account Registration & Security</h2>
<p>You are responsible for maintaining the confidentiality of your credentials (password, PIN, recovery phrase). You must notify us immediately at <a href="mailto:security@summit-trustbank.com">security@summit-trustbank.com</a> if you suspect unauthorised access. Summit Trust is not liable for losses resulting from your failure to safeguard credentials.</p>
<p>Your <strong>12-word recovery phrase</strong> is the sole method to recover or reset your account. Store it offline in a secure location. Summit Trust cannot retrieve this phrase on your behalf.</p>

<h2>4. Permitted Use</h2>
<p>You agree to use Summit Trust solely for lawful purposes. You may not:</p>
<ul>
    <li>Use the Services for money laundering, terrorism financing, or fraud.</li>
    <li>Reverse-engineer, decompile, or attempt to extract our source code.</li>
    <li>Transmit malware, spam, or any harmful content.</li>
    <li>Impersonate another person or entity.</li>
    <li>Circumvent security measures or rate limits.</li>
</ul>

<h2>5. Transactions & Fees</h2>
<p>All transactions are processed in real time. <strong>Completed transactions are final and irreversible</strong> except where required by applicable law. Fees (if any) are disclosed before transaction confirmation. Summit Trust reserves the right to update fee schedules with 30 days' notice.</p>

<h2>6. Joint Accounts</h2>
<p>Joint accounts require approval from both account holders for transactions above threshold limits. Each holder is jointly and severally liable for all obligations arising from the account. Either holder may request closure; outstanding balances must be settled before closure is processed.</p>

<h2>7. Investment Products</h2>
<p>Investment goal features involve locking funds for a specified period. Early withdrawal may forfeit accrued returns and incur penalties as disclosed at time of creation. <strong>Projected returns are estimates, not guarantees.</strong> Past performance does not guarantee future results.</p>

<h2>8. Loan Products</h2>
<p>Loan disbursements are subject to credit assessment at Summit Trust's sole discretion. Failure to repay may result in account suspension, credit reporting, and legal action. Interest rates and repayment schedules are disclosed in your loan agreement.</p>

<h2>9. Card Services</h2>
<p>Debit cards issued by Summit Trust remain our property. Report lost or stolen cards immediately. You are liable for unauthorised transactions occurring before you report the card missing.</p>

<h2>10. Suspension & Termination</h2>
<p>Summit Trust may suspend or terminate your account immediately if we detect fraud, legal violations, or activity that jeopardises our platform or other users. We will provide notice and recourse where legally required. You may close your account at any time by following the in-app account deletion process.</p>

<h2>11. Limitation of Liability</h2>
<p>To the maximum extent permitted by law, Summit Trust's aggregate liability to you for any claim arising out of or related to these Terms or the Services shall not exceed the total fees paid by you to Summit Trust in the 12 months preceding the claim. We are not liable for indirect, incidental, or consequential damages.</p>

<h2>12. Dispute Resolution</h2>
<p>Any disputes shall be first attempted to be resolved through our customer support. If unresolved within 30 days, disputes shall be referred to binding arbitration under the rules of the applicable arbitration body in your jurisdiction. Class action waiver applies to the fullest extent permitted by law.</p>

<h2>13. Governing Law</h2>
<p>These Terms are governed by the laws of Nigeria (or the jurisdiction in which Summit Trust Digital Bank is registered) without regard to conflict-of-law principles.</p>

<h2>14. Changes to Terms</h2>
<p>We may modify these Terms at any time. Material changes will be communicated with 14 days' notice. Continued use after the effective date constitutes acceptance of updated Terms.</p>

<h2>15. Contact</h2>
<p>Legal inquiries: <a href="mailto:legal@summit-trustbank.com">legal@summit-trustbank.com</a><br>
Summit Trust Digital Bank · Legal Department · 123 Finance Street, Lagos, Nigeria.</p>
        `
    };

    /* ── DOM bootstrap ──────────────────────── */
    let overlayEl = null;
    let sheetEl   = null;
    let bodyEl    = null;
    let titleEl   = null;
    let metaEl    = null;
    let activeTab = 'privacy';

    function ensureModal() {
        if (overlayEl) return;

        // Inject CSS if not already present
        if (!document.querySelector('link[href*="legal.css"]')) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = '/css/legal.css';
            document.head.appendChild(link);
        }

        overlayEl = document.createElement('div');
        overlayEl.className = 'legal-overlay';
        overlayEl.setAttribute('role', 'dialog');
        overlayEl.setAttribute('aria-modal', 'true');

        overlayEl.innerHTML = `
            <div class="legal-sheet">
                <div class="legal-sheet__handle"></div>
                <div class="legal-sheet__header">
                    <div>
                        <div class="legal-sheet__title" id="legalTitle"></div>
                        <div class="legal-sheet__meta"  id="legalMeta"></div>
                    </div>
                    <button class="legal-sheet__close" id="legalClose" aria-label="Close">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="legal-tabs">
                    <button class="legal-tab" id="tabPrivacy" onclick="window.openPrivacyPolicy()">Privacy Policy</button>
                    <button class="legal-tab" id="tabTerms"   onclick="window.openTerms()">Terms of Service</button>
                </div>
                <div class="legal-sheet__body" id="legalBody"></div>
            </div>
        `;

        document.body.appendChild(overlayEl);

        sheetEl = overlayEl.querySelector('.legal-sheet');
        bodyEl  = overlayEl.querySelector('#legalBody');
        titleEl = overlayEl.querySelector('#legalTitle');
        metaEl  = overlayEl.querySelector('#legalMeta');

        // Close on overlay click
        overlayEl.addEventListener('click', (e) => {
            if (e.target === overlayEl) closeModal();
        });

        // Close button
        overlayEl.querySelector('#legalClose').addEventListener('click', closeModal);

        // Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && overlayEl.classList.contains('active')) closeModal();
        });
    }

    function renderContent(data, tabId) {
        titleEl.textContent = data.title;
        metaEl.textContent  = data.date;
        bodyEl.innerHTML    = data.html;
        bodyEl.scrollTop    = 0;

        // Update tab highlight
        overlayEl.querySelectorAll('.legal-tab').forEach(t => t.classList.remove('active'));
        overlayEl.querySelector('#' + tabId).classList.add('active');
    }

    function openModal(data, tabId) {
        ensureModal();
        renderContent(data, tabId);
        activeTab = tabId === 'tabPrivacy' ? 'privacy' : 'terms';

        // Force reflow then activate
        overlayEl.offsetHeight;
        overlayEl.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeModal() {
        if (!overlayEl) return;
        overlayEl.classList.remove('active');
        document.body.style.overflow = '';
    }

    /* ── Public API ─────────────────────────── */
    window.openPrivacyPolicy = function (e) {
        if (e) e.preventDefault();
        openModal(PRIVACY, 'tabPrivacy');
    };

    window.openTerms = function (e) {
        if (e) e.preventDefault();
        openModal(TERMS, 'tabTerms');
    };

    window.openLegal = function (tab) {
        if (tab === 'terms') openModal(TERMS, 'tabTerms');
        else openModal(PRIVACY, 'tabPrivacy');
    };

    window.closeLegalModal = closeModal;

})();