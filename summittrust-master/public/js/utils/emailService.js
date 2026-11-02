// ============================================================================
// Summit Trust Holdings — INSTITUTIONAL EMAIL DISPATCH SERVICE
// Multi-provider email engine:
// 1. Primary: Nitrosend REST API (Transactional messages & notifications)
// 2. Fallback: Supabase Edge Function & Custom SMTP relay
// ============================================================================

(function () {
    'use strict';

    const DEFAULT_CONFIG = {
        SUPABASE_URL: 'https://jotfmjdmorjweoumdvuq.supabase.co',
        SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpvdGZtamRtb3Jqd2VvdW1kdnVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3Mzk2OTksImV4cCI6MjA5MTMxNTY5OX0.bTkJKZtHEz_cBBHsYwWiWMotLpCpKU68_ROE-mKWm4s',
        NITROSEND_API_KEY: 'nskey_live_44879eb57a52d337b55f7687101029cb',
        NITROSEND_API_URL: 'https://api.nitrosend.com/v1/my/messages',
        NITROSEND_FROM_EMAIL: 'help@reserved-citizen.nitrosend.net',
        NITROSEND_FROM_NAME: 'Summit Trust Holdings',
        ADMIN_EMAIL: 'summittrustbnk@proton.me',
        BANK_NAME: 'Summit Trust Holdings',
        HEADQUARTERS: 'Hochschulstrasse 6, 3012 London, United Kingdom',
        SLOGAN: 'Banking, held in trust'
    };

    function getConfig(key) {
        if (window.CONFIG && window.CONFIG[key] !== undefined) {
            return window.CONFIG[key];
        }
        return DEFAULT_CONFIG[key];
    }

    // ── INSTITUTIONAL HTML EMAIL BUILDER ──────────────────────────────────────
    function buildBaseEmailWrapper(contentHtml, footerNote) {
        const bankName = getConfig('BANK_NAME');
        const headquarters = getConfig('HEADQUARTERS');
        const slogan = getConfig('SLOGAN');
        const year = new Date().getFullYear();

        return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${bankName}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F5F2EB; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #1E293B;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F5F2EB; padding: 36px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 580px; background-color: #FFFFFF; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(15,42,36,0.06); border: 1px solid #E5E0D8;">
          
          <!-- Institutional Header -->
          <tr>
            <td style="background-color: #0F2A24; padding: 32px 36px; text-align: left; border-bottom: 2px solid #C5A059;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <div style="font-size: 21px; font-weight: 700; color: #FAF8F5; letter-spacing: 0.6px; font-family: Georgia, 'Cormorant Garamond', serif;">
                      ${bankName}
                    </div>
                    <div style="color: #C5A059; font-size: 11px; margin-top: 5px; letter-spacing: 1.2px; text-transform: uppercase; font-weight: 600;">
                      ${slogan} &bull; London, United Kingdom
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Body -->
          <tr>
            <td style="padding: 36px 36px 28px;">
              ${contentHtml}
            </td>
          </tr>

          <!-- Institutional Security Footer -->
          <tr>
            <td style="background-color: #FAF8F5; padding: 24px 36px; border-top: 1px solid #E5E0D8; text-align: center;">
              <p style="margin: 0 0 8px; color: #64748B; font-size: 12px; line-height: 1.5;">
                ${footerNote || 'Automated institutional security dispatch &bull; 256-bit AES encrypted transmission'}
              </p>
              <p style="margin: 0; color: #94A3B8; font-size: 11px; line-height: 1.5;">
                &copy; ${year} ${bankName}. All rights reserved.<br>
                ${headquarters} &bull; Member, Swiss Banking Integrity Standards
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
    }

    function buildRowsTable(rows) {
        const rowsHtml = rows.map(r => `
          <tr>
            <td style="padding: 11px 16px; border-bottom: 1px solid #F1ECE1; color: #64748B; font-size: 13px; font-weight: 500; width: 40%;">${r.label}</td>
            <td style="padding: 11px 16px; border-bottom: 1px solid #F1ECE1; color: #0F2A24; font-size: 13.5px; font-weight: 600; text-align: right; word-break: break-all;">${r.value}</td>
          </tr>
        `).join('');

        return `
          <table width="100%" cellspacing="0" cellpadding="0" style="border: 1px solid #E5E0D8; border-radius: 8px; overflow: hidden; background-color: #FFFFFF; margin: 20px 0;">
            ${rowsHtml}
          </table>
        `;
    }

    const EmailService = {
        // ── 1. SEND VIA NITROSEND REST API ────────────────────────────────────
        async sendViaNitrosend({ to, subject, htmlBody, textBody }) {
            const apiKey = getConfig('NITROSEND_API_KEY');
            const apiUrl = getConfig('NITROSEND_API_URL');
            const fromName = getConfig('NITROSEND_FROM_NAME');
            const fromEmail = getConfig('NITROSEND_FROM_EMAIL');

            const idempotencyKey = 'rcb_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);

            const payload = {
                channel: 'email',
                from: `${fromName} <${fromEmail}>`,
                to: to,
                subject: subject,
                body: htmlBody
            };

            console.log(`[EmailService] 🚀 Dispatching via Nitrosend to ${to} (${subject})...`);

            try {
                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json',
                        'Idempotency-Key': idempotencyKey
                    },
                    body: JSON.stringify(payload),
                    keepalive: true
                });

                const resData = await response.json().catch(() => ({}));

                if (response.ok) {
                    console.log(`[EmailService] ✅ Nitrosend message queued successfully (ID: ${resData.id || resData.data?.id})`);
                    return { success: true, provider: 'nitrosend', data: resData };
                }

                console.warn(`[EmailService] ⚠️ Nitrosend returned HTTP ${response.status}:`, resData);
                return { success: false, provider: 'nitrosend', status: response.status, data: resData };
            } catch (err) {
                console.warn(`[EmailService] Nitrosend connection error:`, err);
                return { success: false, provider: 'nitrosend', error: err.message };
            }
        },

        // ── 2. SEND VIA SUPABASE EDGE FUNCTION / CUSTOM SMTP ──────────────────
        async sendViaSupabase(type, data = {}, options = {}) {
            const supabaseUrl = getConfig('SUPABASE_URL');
            const anonKey = getConfig('SUPABASE_ANON_KEY');

            console.log(`[EmailService] ✉️ Relaying email via Supabase Edge Function (${type})...`, { data, options });

            // Direct fetch to edge function
            try {
                const response = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': anonKey,
                        'Authorization': `Bearer ${anonKey}`
                    },
                    body: JSON.stringify({ type, data, ...options }),
                    keepalive: true
                });

                if (response.ok) {
                    const result = await response.json();
                    console.log(`[EmailService] ✅ Email sent via Supabase Edge Function (${type}):`, result);
                    return { success: true, provider: 'supabase', data: result };
                }

                const errJson = await response.json().catch(() => ({}));
                console.warn(`[EmailService] Edge Function returned HTTP ${response.status}:`, errJson);
            } catch (fetchErr) {
                console.warn(`[EmailService] Supabase direct fetch error:`, fetchErr);
            }

            // Fallback to client invoke if available
            try {
                if (window.supabaseClient && window.supabaseClient.functions) {
                    const res = await window.supabaseClient.functions.invoke('send-email', {
                        body: { type, data, ...options }
                    });
                    if (res.data) {
                        console.log(`[EmailService] ✅ Email sent via supabaseClient (${type}):`, res.data);
                        return { success: true, provider: 'supabase-invoke', data: res.data };
                    }
                    if (res.error) {
                        console.warn('[EmailService] supabaseClient invoke error:', res.error);
                    }
                }
            } catch (invokeErr) {
                console.warn('[EmailService] supabaseClient fallback error:', invokeErr);
            }

            return { success: false, provider: 'supabase', error: 'Could not deliver email through Supabase' };
        },

        // ── 3. PRIMARY TRANSPORT: GMAIL SMTP VIA SUPABASE EDGE FUNCTION ────────
        // Dispatches via Supabase Edge Function (smtp.gmail.com:465) using GMAIL_USER & GMAIL_APP_PASSWORD secrets
        async sendEmail({ to, subject, htmlBody, textBody, type = 'custom', data = {}, options = {} }) {
            // Attempt 1: Supabase Edge Function (Gmail SMTP)
            console.log(`[EmailService] 🚀 Dispatching via Gmail SMTP (Supabase Edge Function) to ${to}...`);
            const supaRes = await this.sendViaSupabase(type, data, {
                to,
                subject,
                html: htmlBody,
                text: textBody,
                ...options
            });

            if (supaRes.success) {
                return supaRes;
            }

            // Attempt 2: Automated fallback to Nitrosend REST API
            console.log(`[EmailService] 🔄 Supabase Gmail SMTP returned error, attempting secondary Nitrosend dispatch to ${to}...`);
            const nitroRes = await this.sendViaNitrosend({ to, subject, htmlBody, textBody });
            if (nitroRes.success) {
                return nitroRes;
            }

            return supaRes;
        },

        // ── 4. PASSWORD RESET EMAIL (NITROSEND PRIMARY) ───────────────────────
        async sendPasswordResetEmail(email, resetUrl, userName = 'Valued Client', resetToken = '') {
            const cleanName = userName && userName !== 'Customer' ? userName : 'Valued Client';
            const adminEmail = getConfig('ADMIN_EMAIL');
            const tokenDisplay = resetToken || (new URL(resetUrl, window.location.href).searchParams.get('reset_token') || 'Secured Token');

            const contentHtml = `
              <h2 style="margin: 0 0 10px; color: #0F2A24; font-size: 21px; font-weight: 700; font-family: Georgia, 'Cormorant Garamond', serif;">
                Password Reset Authorization
              </h2>
              <p style="margin: 0 0 20px; color: #475569; font-size: 14px; line-height: 1.6;">
                Dear ${cleanName},<br><br>
                We have received an authorized request to reset your private banking credentials for your <strong>Summit Trust Holdings</strong> portal. Click the button below to establish a new password.
              </p>

              <!-- Reset Button -->
              <div style="text-align: center; margin: 28px 0;">
                <a href="${resetUrl}" style="background-color: #0F2A24; color: #FAF8F5; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 14px; font-weight: 600; display: inline-block; letter-spacing: 0.5px; box-shadow: 0 4px 14px rgba(15,42,36,0.2); border: 1px solid #0F2A24;">
                  Reset Account Password
                </a>
              </div>

              <!-- Security Token Box -->
              <div style="background-color: #FAF8F5; border: 1px dashed #C5A059; border-radius: 8px; padding: 16px; margin: 24px 0; text-align: center;">
                <div style="color: #64748B; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">One-Time Security Token</div>
                <div style="color: #0F2A24; font-size: 16px; font-weight: 700; font-family: 'Courier New', monospace; margin-top: 4px; letter-spacing: 1.5px;">${tokenDisplay}</div>
              </div>

              <div style="background-color: #F8FAFC; border-left: 3px solid #C5A059; padding: 14px 16px; border-radius: 4px; margin-top: 24px;">
                <p style="margin: 0; color: #64748B; font-size: 12.5px; line-height: 1.5;">
                  <strong>Security Advisory:</strong> This reset authorization is cryptographically signed and expires in <strong>60 minutes</strong>. If you did not initiate this request, please disregard this email or report immediately to Private Wealth Security at <a href="mailto:${adminEmail}" style="color: #0F2A24; font-weight: 600; text-decoration: underline;">${adminEmail}</a>.
                </p>
              </div>
            `;

            const htmlBody = buildBaseEmailWrapper(contentHtml, 'Private Wealth Security &bull; Cryptographic Password Reset Transmission');
            const subject = 'Summit Trust Holdings — Password Reset Request';
            const textBody = `Hello ${cleanName},\n\nA request to reset your password has been received.\nPlease visit the following link to establish a new password:\n${resetUrl}\n\nSecurity Token: ${tokenDisplay}\nThis link expires in 60 minutes.\nIf you did not initiate this request, please contact ${adminEmail}.`;

            console.log(`[EmailService] 🔐 Dispatching password reset email to ${email} via Nitrosend mailer...`);

            return this.sendEmail({
                to: email,
                subject: subject,
                htmlBody: htmlBody,
                textBody: textBody,
                type: 'password_reset',
                data: { email, resetUrl, userName: cleanName, resetToken: tokenDisplay }
            });
        },

        // ── 5. REGULAR TRANSACTION ALERTS (USER COPY + ADMIN COPY) ────────────
        async notifyWithdrawal(txData) {
            return this.notifyTransaction({ ...txData, isDebit: true });
        },

        async notifyTransaction(txData) {
            const adminEmail = getConfig('ADMIN_EMAIL');
            const userEmail = txData.userEmail || txData.email;
            const userName = txData.userName || txData.fullName || 'Private Client';
            const amount = txData.amount != null ? Number(txData.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00';
            const currency = (txData.currency || 'USD').toUpperCase();
            const routingNumber = txData.routingNumber || 'N/A';
            const reference = txData.reference || txData.transaction_reference || ('REF-' + Date.now().toString(36).toUpperCase());
            const nowIso = new Date().toUTCString();
            const status = txData.status ? (txData.status.charAt(0).toUpperCase() + txData.status.slice(1)) : 'Completed';

            // 1. Determine direction: Debit vs Credit
            let isDebit = true;
            if (typeof txData.isDebit === 'boolean') {
                isDebit = txData.isDebit;
            } else if (txData.type || txData.transaction_type) {
                const txType = String(txData.type || txData.transaction_type).toLowerCase().trim();
                const creditTypes = ['deposit', 'receive', 'credit', 'interest', 'wire_inward', 'direct_credit', 'refund', 'topup'];
                const debitTypes = ['transfer', 'withdrawal', 'send', 'card_purchase', 'card_payment', 'fee', 'investment_deposit', 'debit', 'wire_outward'];
                if (creditTypes.includes(txType)) {
                    isDebit = false;
                } else if (debitTypes.includes(txType)) {
                    isDebit = true;
                }
            } else if (txData.method && /credit|deposit|inward|receive/i.test(txData.method)) {
                isDebit = false;
            }

            const method = txData.method || (isDebit ? 'Bank Transfer / Wire' : 'Institutional Direct Credit');
            const counterparty = txData.counterparty || (isDebit ? (txData.recipientName || 'External Beneficiary') : (txData.senderName || 'Institutional Direct Clearing'));
            const userAcct = txData.recipientAccount || txData.accountNumber || (isDebit ? 'Private Checking Account' : 'Private Wealth Account');

            const senderDisplayName = isDebit ? userName : (txData.senderName || counterparty);
            const recipientDisplayName = isDebit ? (txData.recipientName || counterparty) : userName;

            console.log(`[EmailService] 💳 Processing ${isDebit ? 'DEBIT' : 'CREDIT'} transaction alerts for ref ${reference} (User: ${userEmail}, Admin: ${adminEmail})...`);

            const rowsCommon = isDebit
                ? [
                    { label: 'Transaction Reference', value: reference },
                    { label: 'Debited Amount', value: `${currency} ${amount}` },
                    { label: 'Transfer Method', value: method },
                    { label: 'Beneficiary / Payee', value: recipientDisplayName },
                    { label: 'Destination Account', value: txData.recipientAccount || counterparty },
                    { label: 'Status', value: status },
                    { label: 'Execution Timestamp', value: nowIso }
                ]
                : [
                    { label: 'Transaction Reference', value: reference },
                    { label: 'Credited Amount', value: `+${currency} ${amount}` },
                    { label: 'Settlement Method', value: method },
                    { label: 'Sender / Originating Source', value: senderDisplayName },
                    { label: 'Credited Account', value: userAcct },
                    { label: 'Beneficiary', value: userName },
                    { label: 'Status', value: status },
                    { label: 'Settlement Timestamp', value: nowIso }
                ];

            if (routingNumber && routingNumber !== 'N/A') {
                rowsCommon.splice(rowsCommon.length - 2, 0, { label: 'Routing / SWIFT Code', value: routingNumber });
            }

            const dispatches = [];

            // A. DISPATCH USER COPY (TRANSACTION RECEIPT)
            if (userEmail && userEmail !== 'N/A') {
                const isProcessing = status.toLowerCase() === 'processing';
                const isCompleted = status.toLowerCase() === 'completed';
                const debitTitle = isProcessing
                    ? 'Withdrawal Order Processing'
                    : (isCompleted ? 'Withdrawal Order Completed' : 'Transaction Confirmation Receipt');
                const debitSubtitle = isProcessing
                    ? `Dear ${userName},<br>Your withdrawal order has been submitted and is currently processing under institutional custody. Below are the execution parameters for your records.`
                    : (isCompleted
                        ? `Dear ${userName},<br>Your withdrawal order has been completed successfully under institutional custody. Funds have been dispatched to your designated beneficiary.`
                        : `Dear ${userName},<br>Your transaction order has been processed under institutional custody. Below are the execution parameters for your records.`);
                const debitBadgeColor = isProcessing ? '#2563EB' : (isCompleted ? '#16A34A' : '#0F2A24');

                const userContentHtml = isDebit
                  ? `
                  <h2 style="margin: 0 0 6px; color: #0F2A24; font-size: 21px; font-weight: 700; font-family: Georgia, 'Cormorant Garamond', serif;">
                    ${debitTitle}
                  </h2>
                  <p style="margin: 0 0 20px; color: #475569; font-size: 14px; line-height: 1.5;">
                    ${debitSubtitle}
                  </p>

                  <div style="background-color: #FAF8F5; border-radius: 8px; padding: 18px 24px; text-align: center; margin: 16px 0 20px; border: 1px solid #E5E0D8;">
                    <div style="font-size: 12px; color: #64748B; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Debited Amount</div>
                    <div style="font-size: 26px; font-weight: 700; color: #0F2A24; margin-top: 4px; font-family: Georgia, serif;">${currency} ${amount}</div>
                    <div style="margin-top: 6px; display: inline-block; background-color: ${debitBadgeColor}; color: #FAF8F5; font-size: 11px; font-weight: 600; padding: 3px 12px; border-radius: 12px; letter-spacing: 0.5px;">${status.toUpperCase()}</div>
                  </div>

                  ${buildRowsTable(rowsCommon)}

                  <div style="background-color: #F8FAFC; border-left: 3px solid #0F2A24; padding: 14px 16px; border-radius: 4px; margin-top: 20px;">
                    <p style="margin: 0; color: #64748B; font-size: 12.5px; line-height: 1.5;">
                      If you have questions regarding this debit or require an official SWIFT / MT103 advice statement, contact your private wealth manager at <a href="mailto:${adminEmail}" style="color: #0F2A24; font-weight: 600; text-decoration: underline;">${adminEmail}</a>.
                    </p>
                  </div>
                  `
                  : `
                  <h2 style="margin: 0 0 6px; color: #0F2A24; font-size: 21px; font-weight: 700; font-family: Georgia, 'Cormorant Garamond', serif;">
                    Account Credit Notification
                  </h2>
                  <p style="margin: 0 0 20px; color: #475569; font-size: 14px; line-height: 1.5;">
                    Dear ${userName},<br>
                    We are pleased to inform you that funds have been credited to your account under institutional custody. The inward balance has cleared and is immediately available for your use.
                  </p>

                  <div style="background-color: #F0FDF4; border-radius: 8px; padding: 18px 24px; text-align: center; margin: 16px 0 20px; border: 1px solid #BBF7D0;">
                    <div style="font-size: 12px; color: #166534; text-transform: uppercase; letter-spacing: 1px; font-weight: 700;">Credited Amount</div>
                    <div style="font-size: 26px; font-weight: 700; color: #14532D; margin-top: 4px; font-family: Georgia, serif;">+${currency} ${amount}</div>
                    <div style="margin-top: 6px; display: inline-block; background-color: #16A34A; color: #FAF8F5; font-size: 11px; font-weight: 600; padding: 3px 12px; border-radius: 12px; letter-spacing: 0.5px;">${status}</div>
                  </div>

                  ${buildRowsTable(rowsCommon)}

                  <div style="background-color: #F0FDF4; border-left: 3px solid #16A34A; padding: 14px 16px; border-radius: 4px; margin-top: 20px;">
                    <p style="margin: 0; color: #166534; font-size: 12.5px; line-height: 1.5;">
                      If you have questions regarding this credit or require an official SWIFT / MT103 credit advice statement, contact your private wealth manager at <a href="mailto:${adminEmail}" style="color: #0F2A24; font-weight: 600; text-decoration: underline;">${adminEmail}</a>.
                    </p>
                  </div>
                  `;

                const userSubject = isDebit
                    ? (isProcessing
                        ? `Withdrawal Processing: ${currency} ${amount} [${reference}]`
                        : (isCompleted
                            ? `Withdrawal Completed: ${currency} ${amount} [${reference}]`
                            : `Transaction Confirmation: ${currency} ${amount} [${reference}]`))
                    : `Credit Confirmation: +${currency} ${amount} [${reference}]`;
                const userHtml = buildBaseEmailWrapper(userContentHtml, isDebit ? 'Official Transaction Statement &bull; Summit Trust Holdings' : 'Official Credit Advice &bull; Summit Trust Holdings');
                const userText = isDebit
                    ? `Dear ${userName},\n\nYour transaction of ${currency} ${amount} is ${status}.\nReference: ${reference}\nBeneficiary: ${recipientDisplayName} (${txData.recipientAccount || counterparty})\nMethod: ${method}\nStatus: ${status}\nTime: ${nowIso}`
                    : `Dear ${userName},\n\nYour account has been credited with +${currency} ${amount}.\nReference: ${reference}\nSender: ${senderDisplayName}\nMethod: ${method}\nStatus: ${status}\nTime: ${nowIso}`;

                dispatches.push(
                    this.sendEmail({
                        to: userEmail,
                        subject: userSubject,
                        htmlBody: userHtml,
                        textBody: userText,
                        type: isDebit ? 'withdrawal' : 'deposit',
                        data: { ...txData, isDebit, role: 'user' }
                    }).then(res => {
                        console.log(`[EmailService] User copy dispatched to ${userEmail}:`, res.success);
                        return res;
                    })
                );
            }

            // B. DISPATCH ADMIN COPY (AUDIT ALERT)
            const isProcessing = status.toLowerCase() === 'processing';
            const isCompleted = status.toLowerCase() === 'completed';
            const adminRows = isDebit
                ? [
                    { label: 'Sender Name', value: userName },
                    { label: 'Sender Email', value: userEmail || 'N/A' },
                    ...rowsCommon
                ]
                : [
                    { label: 'Beneficiary Client', value: userName },
                    { label: 'Client Email', value: userEmail || 'N/A' },
                    ...rowsCommon
                ];

            const adminContentHtml = isDebit
              ? `
              <h2 style="margin: 0 0 6px; color: #0F2A24; font-size: 21px; font-weight: 700; font-family: Georgia, 'Cormorant Garamond', serif;">
                ${isProcessing ? 'Institutional Audit: Outbound Withdrawal Processing' : (isCompleted ? 'Institutional Audit: Withdrawal Verified & Completed' : 'Institutional Audit: Transaction Executed')}
              </h2>
              <p style="margin: 0 0 20px; color: #475569; font-size: 14px; line-height: 1.5;">
                ${isProcessing ? 'An outbound withdrawal request has been submitted by a client and is currently processing. Details are listed below for verification:' : (isCompleted ? 'An outbound withdrawal order has been verified and settled on the platform:' : 'An outbound transaction order has been dispatched on the platform. Review the audit parameters below:')}
              </p>

              <div style="background-color: #FAF8F5; border-radius: 8px; padding: 18px 24px; text-align: center; margin: 16px 0 20px; border: 1px solid #E5E0D8;">
                <div style="font-size: 12px; color: #64748B; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Transaction Volume</div>
                <div style="font-size: 26px; font-weight: 700; color: #0F2A24; margin-top: 4px; font-family: Georgia, serif;">${currency} ${amount}</div>
                <div style="margin-top: 6px; display: inline-block; background-color: ${isProcessing ? '#2563EB' : '#C5A059'}; color: ${isProcessing ? '#FAF8F5' : '#0F2A24'}; font-size: 11px; font-weight: 700; padding: 3px 12px; border-radius: 12px; letter-spacing: 0.5px;">${isProcessing ? 'AUDIT: PROCESSING' : (isCompleted ? 'AUDIT: VERIFIED & SETTLED' : 'AUDIT LOGGED')}</div>
              </div>

              ${buildRowsTable(adminRows)}
              `
              : `
              <h2 style="margin: 0 0 6px; color: #0F2A24; font-size: 21px; font-weight: 700; font-family: Georgia, 'Cormorant Garamond', serif;">
                Institutional Audit: Inward Credit Executed
              </h2>
              <p style="margin: 0 0 20px; color: #475569; font-size: 14px; line-height: 1.5;">
                An inward funds credit has been posted to a client account. Review the audit parameters below:
              </p>

              <div style="background-color: #F0FDF4; border-radius: 8px; padding: 18px 24px; text-align: center; margin: 16px 0 20px; border: 1px solid #BBF7D0;">
                <div style="font-size: 12px; color: #166534; text-transform: uppercase; letter-spacing: 1px; font-weight: 700;">Credited Volume</div>
                <div style="font-size: 26px; font-weight: 700; color: #14532D; margin-top: 4px; font-family: Georgia, serif;">+${currency} ${amount}</div>
                <div style="margin-top: 6px; display: inline-block; background-color: #16A34A; color: #FAF8F5; font-size: 11px; font-weight: 700; padding: 3px 12px; border-radius: 12px; letter-spacing: 0.5px;">CREDIT AUDIT</div>
              </div>

              ${buildRowsTable(adminRows)}
              `;

            const adminSubject = isDebit
                ? (isProcessing
                    ? `[Admin Audit] Outbound Withdrawal Processing: ${currency} ${amount} — ${userName} [${reference}]`
                    : (isCompleted
                        ? `[Admin Audit] Withdrawal Completed: ${currency} ${amount} — ${userName} [${reference}]`
                        : `[Admin Audit] Outbound Transaction: ${currency} ${amount} — ${userName} [${reference}]`))
                : `[Admin Audit] Inbound Credit / Deposit: +${currency} ${amount} — ${userName} [${reference}]`;
            const adminHtml = buildBaseEmailWrapper(adminContentHtml, 'Internal Security Audit &bull; Administrative Notification');
            const adminText = isDebit
                ? `[Admin Audit]\nSender: ${userName} (${userEmail})\nAmount: ${currency} ${amount}\nBeneficiary: ${recipientDisplayName} (${txData.recipientAccount || counterparty})\nRef: ${reference}\nTime: ${nowIso}`
                : `[Admin Audit - Credit]\nClient: ${userName} (${userEmail})\nCredited Amount: +${currency} ${amount}\nOriginating Source: ${senderDisplayName}\nRef: ${reference}\nTime: ${nowIso}`;

            dispatches.push(
                this.sendEmail({
                    to: adminEmail,
                    subject: adminSubject,
                    htmlBody: adminHtml,
                    textBody: adminText,
                    type: isDebit ? 'withdrawal' : 'deposit',
                    data: { ...txData, isDebit, role: 'admin' }
                }).then(res => {
                    console.log(`[EmailService] Admin copy dispatched to ${adminEmail}:`, res.success);
                    return res;
                })
            );

            // Execute both dispatches simultaneously
            return Promise.allSettled(dispatches).then(results => {
                return {
                    success: results.some(r => r.status === 'fulfilled' && r.value?.success),
                    results: results
                };
            });
        },

        // ── 6. SIGNUP NOTIFICATION (ADMIN & WELCOME) ──────────────────────────
        async notifySignup(userData) {
            const adminEmail = getConfig('ADMIN_EMAIL');
            const userEmail = userData.email;
            const fullName = userData.fullName || `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || 'New Client';
            const country = userData.country || 'N/A';
            const accountType = (userData.accountType || 'individual').toUpperCase();
            const accountNumber = userData.accountNumber || 'Assigned on Verification';
            const nowIso = new Date().toUTCString();

            // Admin dispatch
            const adminSubject = `[Summit Trust Holdings] New Account Opened: ${fullName} (${country})`;
            const adminRows = [
                { label: 'Client Name', value: fullName },
                { label: 'Client Email', value: userEmail },
                { label: 'Domicile / Country', value: country },
                { label: 'Account Structure', value: accountType },
                { label: 'Account Number', value: accountNumber },
                { label: 'Registration Time', value: nowIso }
            ];

            const adminContentHtml = `
              <h2 style="margin: 0 0 6px; color: #0F2A24; font-size: 21px; font-weight: 700; font-family: Georgia, 'Cormorant Garamond', serif;">
                New Private Account Registration
              </h2>
              <p style="margin: 0 0 20px; color: #475569; font-size: 14px; line-height: 1.5;">
                A new client has completed initial account onboarding on Summit Trust Holdings.
              </p>
              ${buildRowsTable(adminRows)}
            `;

            return this.sendEmail({
                to: adminEmail,
                subject: adminSubject,
                htmlBody: buildBaseEmailWrapper(adminContentHtml, 'Client Onboarding Security Notification'),
                textBody: `[New Registration]\nClient: ${fullName} (${userEmail})\nCountry: ${country}\nStructure: ${accountType}\nTime: ${nowIso}`,
                type: 'signup',
                data: userData
            });
        },

        // ── 7. LOAN APPLICATION NOTIFICATION ──────────────────────────────────
        async notifyLoanRequest(loanData) {
            const adminEmail = getConfig('ADMIN_EMAIL');
            const userEmail = loanData.userEmail || loanData.email;
            const userName = loanData.userName || loanData.fullName || 'Client';
            const amount = loanData.amount != null ? `$${Number(loanData.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : 'N/A';
            const level = loanData.level ? `Tier ${loanData.level}` : 'Standard';
            const term = loanData.termMonths ? `${loanData.termMonths} Months` : '12 Months';
            const totalRepayable = loanData.totalRepayable != null ? `$${Number(loanData.totalRepayable).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : 'N/A';
            const monthlyPayment = loanData.monthlyPayment != null ? `$${Number(loanData.monthlyPayment).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : 'N/A';
            const nowIso = new Date().toUTCString();

            const rows = [
                { label: 'Borrower Name', value: userName },
                { label: 'Borrower Email', value: userEmail || 'N/A' },
                { label: 'Principal Requested', value: amount },
                { label: 'Credit Tier', value: level },
                { label: 'Term Duration', value: term },
                { label: 'Monthly Payment', value: monthlyPayment },
                { label: 'Total Repayable', value: totalRepayable },
                { label: 'Application Time', value: nowIso }
            ];

            const contentHtml = `
              <h2 style="margin: 0 0 6px; color: #0F2A24; font-size: 21px; font-weight: 700; font-family: Georgia, 'Cormorant Garamond', serif;">
                New Credit Facility Application
              </h2>
              <p style="margin: 0 0 20px; color: #475569; font-size: 14px; line-height: 1.5;">
                A private client has submitted an application for institutional credit disbursement.
              </p>
              ${buildRowsTable(rows)}
            `;

            return this.sendEmail({
                to: adminEmail,
                subject: `[Summit Trust Holdings] Credit Facility Application: ${amount} (${userName})`,
                htmlBody: buildBaseEmailWrapper(contentHtml, 'Private Credit Underwriting Notification'),
                textBody: `[Credit Facility Application]\nBorrower: ${userName} (${userEmail})\nPrincipal: ${amount}\nTerm: ${term}\nTime: ${nowIso}`,
                type: 'loan_request',
                data: loanData
            });
        },

        // ── 8. INVESTMENT NOTIFICATION ─────────────────────────────────────────
        async notifyInvestment(investData) {
            const adminEmail = getConfig('ADMIN_EMAIL');
            const userEmail = investData.userEmail || investData.email;
            const userName = investData.userName || investData.fullName || 'Client';
            const plan = investData.plan || 'Wealth Management';
            const amount = investData.amount != null ? `$${Number(investData.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : 'N/A';
            const lockMonths = investData.lockMonths ? `${investData.lockMonths} Months` : '12 Months';
            const goalName = investData.goalName || 'Capital Growth';
            const projectedValue = investData.projectedValue != null ? `$${Number(investData.projectedValue).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : 'N/A';
            const nowIso = new Date().toUTCString();

            const rows = [
                { label: 'Investor Name', value: userName },
                { label: 'Investor Email', value: userEmail || 'N/A' },
                { label: 'Portfolio Tier', value: plan },
                { label: 'Allocated Capital', value: amount },
                { label: 'Maturity Term', value: lockMonths },
                { label: 'Projected Valuation', value: projectedValue },
                { label: 'Portfolio Title', value: goalName },
                { label: 'Activation Time', value: nowIso }
            ];

            const contentHtml = `
              <h2 style="margin: 0 0 6px; color: #0F2A24; font-size: 21px; font-weight: 700; font-family: Georgia, 'Cormorant Garamond', serif;">
                Wealth Management Allocation Activated
              </h2>
              <p style="margin: 0 0 20px; color: #475569; font-size: 14px; line-height: 1.5;">
                A client has allocated capital into a structured wealth management portfolio.
              </p>
              ${buildRowsTable(rows)}
            `;

            return this.sendEmail({
                to: adminEmail,
                subject: `[Summit Trust Holdings] Wealth Portfolio Allocation: ${amount} (${plan})`,
                htmlBody: buildBaseEmailWrapper(contentHtml, 'Private Wealth Management Notification'),
                textBody: `[Wealth Allocation]\nInvestor: ${userName} (${userEmail})\nPlan: ${plan}\nCapital: ${amount}\nTime: ${nowIso}`,
                type: 'investment',
                data: investData
            });
        },

        // ── 8b. DAILY INVESTMENT PROFIT ACCRUAL NOTIFICATION ──────────────────
        async notifyDailyProfit(profitData) {
            const userEmail = profitData.userEmail || profitData.email;
            if (!userEmail) {
                console.warn('[EmailService] Cannot send daily profit email: missing recipient userEmail');
                return { success: false, error: 'Missing user email' };
            }
            const userName = profitData.userName || profitData.fullName || 'Valued Client';
            const goalName = profitData.goalName || profitData.goal_name || 'Wealth Portfolio';
            const ref = profitData.investmentReference || profitData.reference || profitData.investment_reference || 'N/A';
            const plan = profitData.plan ? (String(profitData.plan).charAt(0).toUpperCase() + String(profitData.plan).slice(1)) : 'Wealth Management';
            const formatCurr = (val) => {
                if (val == null || val === '') return 'N/A';
                const num = Number(val);
                if (!isNaN(num)) return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                return String(val).startsWith('$') ? String(val) : `$${val}`;
            };

            const dailyProfit = formatCurr(profitData.dailyProfit ?? profitData.daily_profit ?? 0);
            const totalProfit = formatCurr(profitData.totalProfit ?? profitData.total_profit ?? 0);
            const currentValue = formatCurr(profitData.currentValue ?? profitData.current_value);
            const projectedValue = formatCurr(profitData.projectedValue ?? profitData.projected_value);
            const nowIso = new Date().toUTCString();

            const rows = [
                { label: 'Portfolio Title', value: goalName },
                { label: 'Reference ID', value: ref },
                { label: 'Portfolio Tier', value: plan },
                { label: 'Daily Return Accrued', value: `<span style="color: #16A34A; font-weight: 700;">+${dailyProfit}</span>` },
                { label: 'Total Accrued Profit', value: totalProfit },
                { label: 'Current Valuation', value: currentValue },
                { label: 'Target / Projected', value: projectedValue },
                { label: 'Accrual Timestamp', value: nowIso }
            ];

            const contentHtml = `
              <h2 style="margin: 0 0 6px; color: #0F2A24; font-size: 21px; font-weight: 700; font-family: Georgia, 'Cormorant Garamond', serif;">
                Daily Investment Return Credited
              </h2>
              <p style="margin: 0 0 20px; color: #475569; font-size: 14px; line-height: 1.5;">
                Dear ${userName},<br>
                We are pleased to inform you that your structured wealth portfolio <strong>"${goalName}"</strong> has accrued its daily return under Swiss institutional custody.
              </p>

              <div style="background-color: #F0FDF4; border-radius: 8px; padding: 18px 24px; text-align: center; margin: 16px 0 20px; border: 1px solid #BBF7D0;">
                <div style="font-size: 12px; color: #166534; text-transform: uppercase; letter-spacing: 1px; font-weight: 700;">Daily Return Accrued</div>
                <div style="font-size: 26px; font-weight: 700; color: #14532D; margin-top: 4px; font-family: Georgia, serif;">+${dailyProfit}</div>
                <div style="margin-top: 6px; display: inline-block; background-color: #16A34A; color: #FAF8F5; font-size: 11px; font-weight: 600; padding: 3px 12px; border-radius: 12px; letter-spacing: 0.5px;">ACCRUED</div>
              </div>

              ${buildRowsTable(rows)}

              <div style="text-align: center; margin: 26px 0 16px;">
                <a href="https://reservedcitizenbank.web.app/dashboard" style="background-color: #0F2A24; color: #FAF8F5; text-decoration: none; padding: 13px 28px; border-radius: 8px; font-size: 13.5px; font-weight: 600; display: inline-block; letter-spacing: 0.3px; box-shadow: 0 4px 12px rgba(15,42,36,0.25);">
                  View Portfolio in Dashboard
                </a>
              </div>
            `;

            return this.sendEmail({
                to: userEmail,
                subject: `[Summit Trust Holdings] Daily Yield Accrued: +${dailyProfit} [${goalName}]`,
                htmlBody: buildBaseEmailWrapper(contentHtml, 'Private Wealth Portfolio Return &bull; Summit Trust Holdings'),
                textBody: `Dear ${userName},\n\nYour portfolio "${goalName}" (${ref}) accrued +${dailyProfit} today.\nTotal Profit to Date: ${totalProfit}\nCurrent Valuation: ${currentValue}\nTime: ${nowIso}`,
                type: 'investment_profit',
                data: profitData
            });
        },

        // ── 9. ADMIN CUSTOM EMAIL DISPATCH ────────────────────────────────────
        async sendAdminCustomEmail(to, clientName, subject, messageText) {
            const cleanName = clientName && clientName !== 'Customer' ? clientName : 'Valued Client';
            const paragraphs = String(messageText || '')
                .split(/\n+/)
                .map(p => p.trim())
                .filter(Boolean)
                .map(p => `<p style="margin: 0 0 16px; color: #334155; font-size: 14.5px; line-height: 1.65;">${p}</p>`)
                .join('');

            const contentHtml = `
              <h2 style="margin: 0 0 12px; color: #0F2A24; font-size: 20px; font-weight: 700; font-family: Georgia, 'Cormorant Garamond', serif;">
                ${subject}
              </h2>
              <p style="margin: 0 0 18px; color: #475569; font-size: 14px; font-weight: 500;">
                Dear ${cleanName},
              </p>
              <div style="background-color: #FAF8F5; border: 1px solid #EBE4D8; border-left: 4px solid #C5A059; border-radius: 8px; padding: 20px 24px; margin-bottom: 24px;">
                ${paragraphs || '<p style="margin:0;color:#334155;font-size:14.5px;line-height:1.65;">(No message content)</p>'}
              </div>
              <p style="margin: 0; color: #64748B; font-size: 13px; line-height: 1.6;">
                Should you require any further assistance or clarification, our institutional client service desk remains at your disposal.
              </p>
            `;

            const htmlBody = buildBaseEmailWrapper(contentHtml, 'Summit Trust Holdings &bull; Official Institutional Communication');

            return this.sendEmail({
                to,
                subject: subject.startsWith('[Summit Trust Holdings]') ? subject : `[Summit Trust Holdings] ${subject}`,
                htmlBody,
                textBody: `Dear ${cleanName},\n\n${messageText}\n\n---\nSummit Trust Holdings\nHochschulstrasse 6, 3012 London, United Kingdom`,
                type: 'custom',
                data: { recipient: to, name: clientName, subject, message: messageText }
            });
        }
    };

    EmailService.buildBaseEmailWrapper = buildBaseEmailWrapper;

    window.EmailService = EmailService;
})();



