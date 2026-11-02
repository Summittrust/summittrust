const crypto = require('crypto');

module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
    );

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
        const cleanEmail = (body.email || '').toLowerCase().trim();

        if (!cleanEmail || !cleanEmail.includes('@')) {
            return res.status(400).json({ error: 'Valid email address is required' });
        }

        const SUPABASE_URL = 'https://jotfmjdmorjweoumdvuq.supabase.co';
        const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpvdGZtamRtb3Jqd2VvdW1kdnVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3Mzk2OTksImV4cCI6MjA5MTMxNTY5OX0.bTkJKZtHEz_cBBHsYwWiWMotLpCpKU68_ROE-mKWm4s';
        const NITROSEND_API_KEY = process.env.NITROSEND_API_KEY || 'nskey_live_44879eb57a52d337b55f7687101029cb';

        // 1. Verify user exists in database
        const userCheck = await fetch(`${SUPABASE_URL}/rest/v1/users?email=eq.${encodeURIComponent(cleanEmail)}&select=id,first_name,email`, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
        });

        const users = await userCheck.json();
        if (!users || users.length === 0) {
            return res.status(404).json({ error: 'No account found with this email address' });
        }
        const user = users[0];

        // 2. Generate 6-digit numeric verification code (15-min expiry)
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

        // 3. Store OTP in database
        const updateRes = await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${user.id}`, {
            method: 'PATCH',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
            },
            body: JSON.stringify({
                otp_code: otpCode,
                otp_expires_at: expiresAt
            })
        });

        if (!updateRes.ok) {
            const errText = await updateRes.text();
            console.error('Supabase update error:', errText);
            throw new Error('Failed to create reset code in database');
        }

        // 4. Construct email template matching Summit Trust Holdings branding & color scheme
        const emailHtml = `
            <!DOCTYPE html>
            <html>
            <head><meta charset="utf-8"></head>
            <body style="margin:0;padding:24px;background-color:#F6F3FF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
                <table width="100%" border="0" cellspacing="0" cellpadding="0">
                    <tr>
                        <td align="center">
                            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:520px;background:#ffffff;border-radius:16px;border:1px solid #DDD5F7;overflow:hidden;box-shadow:0 8px 24px rgba(27,15,74,0.08);">
                                <tr>
                                    <td style="padding:32px 32px 24px;text-align:left;background:#1B0F4A;border-bottom:2px solid #6C3FF0;">
                                        <h1 style="margin:0;font-size:22px;letter-spacing:0.4px;font-weight:700;color:#FFFFFF;font-family:Georgia,serif;">Summit Trust Holdings</h1>
                                        <p style="margin:6px 0 0;font-size:11px;color:#DDD5F7;letter-spacing:1px;text-transform:uppercase;font-weight:600;">Private Wealth &bull; Security &bull; London, UK</p>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding:32px 32px 24px;">
                                        <h2 style="margin:0 0 12px;font-size:18px;color:#1B0F4A;">Password Reset Verification Code</h2>
                                        <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#475569;">
                                            Hello ${user.first_name || 'Valued Client'},<br>
                                            We received a request to reset the password for your Summit Trust Holdings account. Enter the verification code below to establish a new password:
                                        </p>
                                        <div style="background:#EFEAFE;border:1px dashed #6C3FF0;border-radius:12px;padding:20px;text-align:center;margin:24px 0;">
                                            <span style="font-family:'Courier New',Courier,monospace;font-size:36px;font-weight:800;letter-spacing:8px;color:#6C3FF0;">
                                                ${otpCode}
                                            </span>
                                        </div>
                                        <p style="margin:0 0 16px;font-size:13px;line-height:1.5;color:#6B6486;text-align:center;">
                                            This verification code expires in <strong>15 minutes</strong>.
                                        </p>
                                        <div style="background:#FFE3F0;border-left:4px solid #E8559A;padding:12px 16px;border-radius:6px;margin:20px 0;">
                                            <p style="margin:0;font-size:12px;color:#991B1B;line-height:1.5;">
                                                <strong>Security Reminder:</strong> Never share this code with anyone. Summit Trust Holdings staff will never ask for your password or reset codes.
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding:20px 32px;background:#F6F3FF;border-top:1px solid #DDD5F7;text-align:center;">
                                        <p style="margin:0 0 4px;font-size:11px;color:#6B6486;">
                                            100 Bishopsgate, London EC2N 4AG, United Kingdom &bull; 256-bit AES Encrypted
                                        </p>
                                        <p style="margin:0;font-size:11px;color:#94a3b8;">
                                            &copy; ${new Date().getFullYear()} Summit Trust Holdings. All rights reserved.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </body>
            </html>
        `;

        // 5. Send via NitroSend API
        const idempotencyKey = crypto.randomUUID();
        const nitroRes = await fetch('https://api.nitrosend.com/v1/my/messages', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${NITROSEND_API_KEY}`,
                'Content-Type': 'application/json',
                'Idempotency-Key': idempotencyKey
            },
            body: JSON.stringify({
                channel: 'email',
                from: 'Summit Trust Holdings <help@reserved-citizen.nitrosend.net>',
                to: cleanEmail,
                subject: `${otpCode} is your Summit Trust Holdings reset code`,
                html: emailHtml,
                body: `Hello ${user.first_name || 'Valued Client'},\n\nYour Summit Trust Holdings password reset verification code is: ${otpCode}\n\nThis code will expire in 15 minutes.\n\nIf you did not request this code, please ignore this email.\n\nSummit Trust Holdings`,
                idempotency_key: idempotencyKey
            })
        });

        const nitroData = await nitroRes.json();
        if (!nitroRes.ok) {
            console.error('NitroSend API error:', nitroData);
            return res.status(nitroRes.status).json({
                error: nitroData.message || 'Failed to dispatch email via NitroSend'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Reset verification code has been sent to your email.'
        });

    } catch (err) {
        console.error('send-reset-email error:', err);
        return res.status(500).json({ error: err.message || 'Internal server error' });
    }
};
