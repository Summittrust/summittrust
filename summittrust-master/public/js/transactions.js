// ============================================
// TRANSACTIONS PAGE MODULE
// ============================================

const TxPage = (() => {

    // ---- state ----
    let allTx      = [];
    let filtered   = [];
    let sortKey    = 'created_at';
    let sortDir    = 'desc';
    let page       = 1;
    const PER_PAGE = 15;

    // ---- type helpers ----
    const TYPE_ICON = {
        transfer:             { cls: 'send',     icon: 'fa-paper-plane' },
        send:                 { cls: 'send',     icon: 'fa-paper-plane' },
        withdrawal:           { cls: 'send',     icon: 'fa-arrow-up' },
        receive:              { cls: 'receive',  icon: 'fa-arrow-down' },
        deposit:              { cls: 'receive',  icon: 'fa-arrow-down' },
        card_purchase:        { cls: 'other',    icon: 'fa-credit-card' },
        card_payment:         { cls: 'other',    icon: 'fa-credit-card' },
        loan_disbursement:    { cls: 'receive',  icon: 'fa-hand-holding-usd' },
        loan_repayment:       { cls: 'other',    icon: 'fa-receipt' },
        investment_deposit:   { cls: 'other',    icon: 'fa-chart-line' },
        investment_withdrawal:{ cls: 'receive',  icon: 'fa-chart-line' },
        crypto_buy:           { cls: 'other',    icon: 'fab fa-bitcoin' },
        crypto_send:          { cls: 'send',     icon: 'fab fa-bitcoin' },
        crypto_receive:       { cls: 'receive',  icon: 'fab fa-bitcoin' },
        fee:                  { cls: 'other',    icon: 'fa-receipt' },
        interest:             { cls: 'receive',  icon: 'fa-percentage' },
    };

    function typeInfo(type) {
        return TYPE_ICON[type] || { cls: 'other', icon: 'fa-circle' };
    }

    function isDebit(t) {
        return ['send', 'transfer', 'withdrawal', 'card_purchase', 'card_payment', 'loan_repayment', 'investment_deposit', 'crypto_send', 'fee'].includes(t.transaction_type);
    }

    // ---- render the full section ----
    function renderShell() {
        const section = document.getElementById('transactionsSection');
        if (!section) return;

        section.innerHTML = `
            <div class="tx-section-header">
                <div>
                    <h2 class="tx-heading">Transactions Ledger</h2>
                    <p class="tx-subheading">Comprehensive institutional record of all settled, pending, and scheduled transactions.</p>
                </div>
                <div class="tx-header-actions">
                    <button class="btn btn-outline btn-small tx-export-btn" onclick="TxPage.exportStatement()" title="Export filtered list as PDF">
                        <i class="fas fa-file-pdf"></i> Export Statement
                    </button>
                </div>
            </div>

            <!-- Summary strip -->
            <div class="tx-summary" id="txSummary"></div>

            <!-- Toolbar -->
            <div class="tx-toolbar">
                <div class="tx-search-wrap">
                    <i class="fas fa-search"></i>
                    <input type="text" class="tx-search" id="txSearch"
                           placeholder="Search by description, reference, counterparty…">
                    <button type="button" class="tx-search-clear" id="txSearchClear" onclick="document.getElementById('txSearch').value=''; TxPage.clearFilters();" style="display:none;" title="Clear search">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="tx-filters">
                    <div class="tx-select-wrap">
                        <select class="tx-filter-select" id="txTypeFilter">
                            <option value="">All Types</option>
                            <option value="send">Sent / Outflow</option>
                            <option value="receive">Received / Inflow</option>
                            <option value="transfer">Internal Transfer</option>
                            <option value="card_payment">Card Settlement</option>
                            <option value="loan_disbursement">Credit Facility</option>
                            <option value="investment_deposit">Capital Allocation</option>
                            <option value="fee">Bank Fee</option>
                        </select>
                    </div>
                    <div class="tx-select-wrap">
                        <select class="tx-filter-select" id="txStatusFilter">
                            <option value="">All Statuses</option>
                            <option value="completed">Completed</option>
                            <option value="pending">Pending</option>
                            <option value="processing">Processing</option>
                            <option value="failed">Failed</option>
                            <option value="rejected">Rejected</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                    </div>
                    <div class="tx-select-wrap">
                        <select class="tx-filter-select" id="txDateFilter">
                            <option value="">All Periods</option>
                            <option value="today">Today</option>
                            <option value="week">This Week</option>
                            <option value="month">This Month</option>
                            <option value="3months">Last 3 Months</option>
                        </select>
                    </div>
                </div>
            </div>

            <!-- Table card -->
            <div class="dashboard-card tx-card-container" style="padding:0;overflow:visible;">
                <div class="tx-table-wrap">
                    <table class="tx-table" id="txTable">
                        <thead>
                            <tr>
                                <th data-col="transaction_type" onclick="TxPage.sort('transaction_type')">
                                    Type <i class="fas fa-sort sort-icon"></i>
                                </th>
                                <th data-col="description">Description &amp; Reference</th>
                                <th data-col="counterparty">Counterparty</th>
                                <th data-col="created_at" onclick="TxPage.sort('created_at')" class="sorted">
                                    Date <i class="fas fa-sort-down sort-icon"></i>
                                </th>
                                <th data-col="amount" onclick="TxPage.sort('amount')" style="text-align:right;">
                                    Amount <i class="fas fa-sort sort-icon"></i>
                                </th>
                                <th data-col="status">Status</th>
                            </tr>
                        </thead>
                        <tbody id="txBody">
                            <tr><td colspan="6">
                                <div class="tx-loading">
                                    <i class="fas fa-spinner fa-spin"></i> Loading transactions…
                                </div>
                            </td></tr>
                        </tbody>
                    </table>
                </div>
                <div style="padding:0 16px 16px;">
                    <div class="tx-pagination" id="txPagination"></div>
                </div>
            </div>

            <!-- Detail drawer -->
            <div class="tx-drawer-overlay" id="txDrawerOverlay" onclick="TxPage.closeDrawer(event)">
                <div class="tx-drawer" id="txDrawer">
                    <div class="tx-drawer-header">
                        <h3>Transaction Detail</h3>
                        <button class="tx-drawer-close" onclick="TxPage.closeDrawer()" aria-label="Close">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div id="txDrawerBody"></div>
                </div>
            </div>`;

        // Wire up live filters
        const searchInput = document.getElementById('txSearch');
        searchInput?.addEventListener('input', () => {
            page = 1;
            const clearBtn = document.getElementById('txSearchClear');
            if (clearBtn) clearBtn.style.display = searchInput.value ? 'block' : 'none';
            applyFilters();
        });
        document.getElementById('txTypeFilter')?.addEventListener('change', () => { page = 1; applyFilters(); });
        document.getElementById('txStatusFilter')?.addEventListener('change', () => { page = 1; applyFilters(); });
        document.getElementById('txDateFilter')?.addEventListener('change', () => { page = 1; applyFilters(); });
    }

    // ---- fetch all transactions for this user ----
    async function load() {
        // Auto-initialize shell if switching to transactions tab triggered load
        // but renderShell hasn't been called yet
        if (!document.getElementById('txBody')) {
            renderShell();
        }
        try {
            const { data, error } = await db
                .from('transactions')
                .select('*')
                .or(`from_user_id.eq.${currentUser.id},to_user_id.eq.${currentUser.id},user_id.eq.${currentUser.id},initiated_by_user_id.eq.${currentUser.id},approved_by_user_id.eq.${currentUser.id}${currentUser.joint_account_id ? ',joint_account_id.eq.' + currentUser.joint_account_id : ''}`)
                .order('created_at', { ascending: false })
                .limit(500);  // reasonable cap; add real pagination for larger datasets

            if (error) throw error;

            // De-duplicate: a send + receive for the same internal transfer creates 2 rows
            // Keep both but mark clearly
            allTx = data || [];
            applyFilters();
            renderSummary();

        } catch (err) {
            console.error('TxPage.load error:', err);
            const body = document.getElementById('txBody');
            if (body) body.innerHTML = `
                <tr><td colspan="6">
                    <div class="tx-empty">
                        <div class="tx-empty-icon"><i class="fas fa-exclamation-circle"></i></div>
                        <h4>Failed to Load Transactions</h4>
                        <p>An issue occurred while retrieving the account ledger. <a href="#" onclick="TxPage.reload()">Click to Retry</a></p>
                    </div>
                </td></tr>`;
        }
    }

    // ---- summary strip ----
    function renderSummary() {
        const el = document.getElementById('txSummary');
        if (!el) return;

        const completed = allTx.filter(t => t.status === 'completed');
        const totalSent     = completed.filter(t => isDebit(t)).reduce((s, t) => s + parseFloat(t.amount || 0), 0);
        const totalReceived = completed.filter(t => !isDebit(t)).reduce((s, t) => s + parseFloat(t.amount || 0), 0);
        const pending       = allTx.filter(t => t.status === 'pending').length;

        el.innerHTML = `
            <div class="tx-summary-card tx-card-sent">
                <div class="tx-summary-top">
                    <span class="label">Total Outward</span>
                    <div class="tx-summary-icon sent"><i class="fas fa-arrow-up"></i></div>
                </div>
                <div class="value sent">-${formatCurrency(totalSent)}</div>
                <div class="tx-summary-sub">Debited outflows</div>
            </div>
            <div class="tx-summary-card tx-card-received">
                <div class="tx-summary-top">
                    <span class="label">Total Inward</span>
                    <div class="tx-summary-icon received"><i class="fas fa-arrow-down"></i></div>
                </div>
                <div class="value received">+${formatCurrency(totalReceived)}</div>
                <div class="tx-summary-sub">Credited settlements</div>
            </div>
            <div class="tx-summary-card tx-card-count">
                <div class="tx-summary-top">
                    <span class="label">Total Records</span>
                    <div class="tx-summary-icon records"><i class="fas fa-receipt"></i></div>
                </div>
                <div class="value">${allTx.length}</div>
                <div class="tx-summary-sub">Ledger transactions</div>
            </div>
            <div class="tx-summary-card tx-card-pending">
                <div class="tx-summary-top">
                    <span class="label">In Review</span>
                    <div class="tx-summary-icon pending"><i class="fas fa-clock"></i></div>
                </div>
                <div class="value ${pending > 0 ? 'pending-val' : ''}">${pending}</div>
                <div class="tx-summary-sub">${pending === 1 ? '1 pending approval' : `${pending} pending approvals`}</div>
            </div>`;
    }

    // ---- filtering ----
    function applyFilters() {
        const search     = document.getElementById('txSearch')?.value.trim().toLowerCase() || '';
        const typeVal    = document.getElementById('txTypeFilter')?.value || '';
        const statusVal  = document.getElementById('txStatusFilter')?.value || '';
        const dateVal    = document.getElementById('txDateFilter')?.value || '';

        const now   = new Date();
        const start = dateVal === 'today'   ? startOf('day', now)
                    : dateVal === 'week'    ? startOf('week', now)
                    : dateVal === 'month'   ? startOf('month', now)
                    : dateVal === '3months' ? new Date(now.getFullYear(), now.getMonth() - 3, now.getDate())
                    : null;

        filtered = allTx.filter(t => {
            if (typeVal   && t.transaction_type !== typeVal)   return false;
            if (statusVal && t.status           !== statusVal) return false;
            if (start     && new Date(t.created_at) < start)  return false;
            if (search) {
                const haystack = [
                    t.description, t.transaction_reference,
                    t.from_email, t.to_email, t.status, t.transaction_type
                ].join(' ').toLowerCase();
                if (!haystack.includes(search)) return false;
            }
            return true;
        });

        sortData();
        renderTable();
        renderPagination();
    }

    function startOf(unit, d) {
        const copy = new Date(d);
        if (unit === 'day')   { copy.setHours(0, 0, 0, 0); }
        if (unit === 'week')  { copy.setDate(d.getDate() - d.getDay()); copy.setHours(0, 0, 0, 0); }
        if (unit === 'month') { copy.setDate(1); copy.setHours(0, 0, 0, 0); }
        return copy;
    }

    // ---- sorting ----
    function sortData() {
        filtered.sort((a, b) => {
            let av = a[sortKey], bv = b[sortKey];
            if (sortKey === 'amount') { av = parseFloat(av || 0); bv = parseFloat(bv || 0); }
            if (sortKey === 'created_at') { av = new Date(av); bv = new Date(bv); }
            if (av < bv) return sortDir === 'asc' ? -1 : 1;
            if (av > bv) return sortDir === 'asc' ? 1 : -1;
            return 0;
        });
    }

    function sort(key) {
        if (sortKey === key) {
            sortDir = sortDir === 'asc' ? 'desc' : 'asc';
        } else {
            sortKey = key;
            sortDir = key === 'created_at' ? 'desc' : 'asc';
        }

        // Update header icons
        document.querySelectorAll('.tx-table thead th').forEach(th => {
            th.classList.remove('sorted');
            const icon = th.querySelector('.sort-icon');
            if (icon) icon.className = 'fas fa-sort sort-icon';
        });
        const activeTh = document.querySelector(`.tx-table thead th[data-col="${key}"]`);
        if (activeTh) {
            activeTh.classList.add('sorted');
            const icon = activeTh.querySelector('.sort-icon');
            if (icon) icon.className = `fas fa-sort-${sortDir === 'asc' ? 'up' : 'down'} sort-icon`;
        }

        sortData();
        renderTable();
    }

    // ---- table render ----
    function renderTable() {
        const body = document.getElementById('txBody');
        if (!body) return;

        const start = (page - 1) * PER_PAGE;
        const slice = filtered.slice(start, start + PER_PAGE);

        if (!slice.length) {
            body.innerHTML = `
                <tr><td colspan="6">
                    <div class="tx-empty">
                        <div class="tx-empty-icon"><i class="fas fa-search"></i></div>
                        <h4>${allTx.length ? 'No Matching Records Found' : 'No Transactions Registered'}</h4>
                        <p>${allTx.length ? 'Try adjusting your search criteria, transaction type, or date range.' : 'Your account ledger will record incoming deposits, transfers, card settlements, and withdrawals.'}</p>
                        ${allTx.length ? `<button type="button" class="btn btn-outline btn-small" onclick="TxPage.clearFilters()" style="margin-top:14px;"><i class="fas fa-undo"></i> Reset Filters</button>` : ''}
                    </div>
                </td></tr>`;
            return;
        }

        body.innerHTML = slice.map(t => {
            const info        = typeInfo(t.transaction_type);
            const debit       = isDebit(t);
            const counterparty = debit ? (t.to_email || '—') : (t.from_email || '—');
            const label       = t.description || t.transaction_type?.replace(/_/g, ' ') || '—';
            const d           = new Date(t.created_at);
            const dateStr     = isNaN(d) ? '—' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            const timeStr     = isNaN(d) ? '' : d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
            const amountStr   = `${debit ? '-' : '+'}${formatCurrency(t.amount)}`;

            return `
                <tr onclick="TxPage.openDrawer('${t.id}')" class="tx-row" title="Click to view full transaction ledger details">
                    <td>
                        <div class="tx-type-cell">
                            <div class="tx-type-icon ${info.cls}">
                                <i class="fas ${info.icon}"></i>
                            </div>
                            <div class="tx-type-meta">
                                <span class="tx-type-name">${escHtml(t.transaction_type?.replace(/_/g, ' ') || '—')}</span>
                            </div>
                        </div>
                    </td>
                    <td>
                        <div class="tx-desc-cell">
                            <div class="tx-desc" title="${escHtml(label)}">${escHtml(label)}</div>
                            ${t.transaction_reference
                                ? `<div class="tx-ref"><span>#</span>${escHtml(t.transaction_reference)}</div>`
                                : ''}
                        </div>
                    </td>
                    <td class="tx-col-counterparty">
                        <div class="tx-counterparty-wrap" title="${escHtml(counterparty)}">
                            <span class="tx-counterparty-avatar"><i class="far fa-user"></i></span>
                            <span class="tx-counterparty-email">${escHtml(counterparty)}</span>
                        </div>
                    </td>
                    <td class="tx-col-date">
                        <div class="tx-date-wrap">
                            <span class="tx-date-main">${dateStr}</span>
                            ${timeStr ? `<span class="tx-date-time">${timeStr}</span>` : ''}
                        </div>
                    </td>
                    <td class="tx-col-amount" style="text-align:right;">
                        <div class="tx-amount-wrap">
                            <span class="tx-amount ${debit ? 'debit' : 'credit'}">${amountStr}</span>
                            ${t.fee && parseFloat(t.fee) > 0
                                ? `<span class="tx-fee-tag">Fee: ${formatCurrency(t.fee)}</span>`
                                : ''}
                        </div>
                    </td>
                    <td class="tx-col-status">
                        <span class="tx-status-pill tx-status-${t.status}">
                            <span class="status-dot"></span>
                            <span>${t.status}</span>
                        </span>
                    </td>
                </tr>`;
        }).join('');
    }

    function statusIcon(status) {
        const map = {
            completed:  '<i class="fas fa-check-circle"></i>',
            pending:    '<i class="fas fa-clock"></i>',
            processing: '<i class="fas fa-spinner fa-spin"></i>',
            failed:     '<i class="fas fa-times-circle"></i>',
            rejected:   '<i class="fas fa-ban"></i>',
            cancelled:  '<i class="fas fa-minus-circle"></i>',
        };
        return map[status] || '';
    }

    // ---- pagination ----
    function renderPagination() {
        const el = document.getElementById('txPagination');
        if (!el) return;

        const totalPages = Math.ceil(filtered.length / PER_PAGE);
        const start = (page - 1) * PER_PAGE + 1;
        const end   = Math.min(page * PER_PAGE, filtered.length);

        if (!filtered.length) { el.innerHTML = ''; return; }

        // Build page number buttons (show at most 5 around current)
        let pageBtns = '';
        const range = pageRange(page, totalPages);
        range.forEach(p => {
            if (p === '…') {
                pageBtns += `<span style="padding:6px 4px;color:var(--text-secondary);">…</span>`;
            } else {
                pageBtns += `<button class="tx-page-btn${p === page ? ' active' : ''}"
                    onclick="TxPage.goTo(${p})">${p}</button>`;
            }
        });

        el.innerHTML = `
            <span>Showing ${start}–${end} of ${filtered.length}</span>
            <div class="tx-page-btns">
                <button class="tx-page-btn" onclick="TxPage.goTo(${page - 1})"
                    ${page <= 1 ? 'disabled' : ''}>
                    <i class="fas fa-chevron-left"></i>
                </button>
                ${pageBtns}
                <button class="tx-page-btn" onclick="TxPage.goTo(${page + 1})"
                    ${page >= totalPages ? 'disabled' : ''}>
                    <i class="fas fa-chevron-right"></i>
                </button>
            </div>`;
    }

    function pageRange(current, total) {
        if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
        if (current <= 4) return [1, 2, 3, 4, 5, '…', total];
        if (current >= total - 3) return [1, '…', total-4, total-3, total-2, total-1, total];
        return [1, '…', current-1, current, current+1, '…', total];
    }

    function goTo(p) {
        const totalPages = Math.ceil(filtered.length / PER_PAGE);
        if (p < 1 || p > totalPages) return;
        page = p;
        renderTable();
        renderPagination();
        // Scroll to top of table
        document.getElementById('txTable')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    // ---- detail drawer ----
    let currentDrawerTxId = null;

    function openDrawer(txId) {
        currentDrawerTxId = txId;
        const t = allTx.find(tx => tx.id === txId);
        if (!t) return;

        const debit = isDebit(t);
        const amountStr = `${debit ? '-' : '+'}${formatCurrency(t.amount)}`;
        const typeTitle = (t.transaction_type || 'transaction').replace(/_/g, ' ');
        const info = typeInfo(t.transaction_type);

        const rows = [
            ['Reference',    `<span class="mono" id="txRefCode">${escHtml(t.transaction_reference || '—')}</span> ${t.transaction_reference ? `<button type="button" class="tx-copy-btn" onclick="navigator.clipboard.writeText('${escHtml(t.transaction_reference)}'); TxPage.showCopied(this)" title="Copy Reference"><i class="fas fa-copy"></i></button>` : ''}`],
            ['Type',         `<span style="text-transform:capitalize;">${escHtml(typeTitle)}</span>`],
            ['Status',       `<span class="tx-status-pill tx-status-${t.status}"><span class="status-dot"></span><span>${t.status}</span></span>`],
            ['Amount',       `<span class="tx-amount ${debit ? 'debit' : 'credit'}">${amountStr}</span>`],
            t.fee && parseFloat(t.fee) > 0 ? ['Fee', formatCurrency(t.fee)] : null,
            t.total_amount ? ['Total Amount', formatCurrency(t.total_amount)] : null,
            ['Currency',     t.currency || 'USD'],
            ['From Account', escHtml(t.from_email || '—')],
            ['To / Beneficiary', escHtml(t.to_email || '—')],
            t.description ? ['Description', escHtml(t.description)] : null,
            ['Initiation Date', new Date(t.created_at).toLocaleString()],
            t.completed_at  ? ['Settlement Date', new Date(t.completed_at).toLocaleString()] : null,
            t.processed_at  ? ['Processing Date', new Date(t.processed_at).toLocaleString()] : null,
            t.failure_reason ? ['Failure Reason', `<span style="color:var(--error);">${escHtml(t.failure_reason)}</span>`] : null,
        ].filter(Boolean);

        document.getElementById('txDrawerBody').innerHTML = `
            <div class="tx-drawer-hero">
                <div class="tx-type-icon ${info.cls} tx-drawer-hero-icon"><i class="fas ${info.icon}"></i></div>
                <div class="tx-drawer-hero-amount ${debit ? 'debit' : 'credit'}">${amountStr}</div>
                <div class="tx-drawer-hero-label">${escHtml(typeTitle)}</div>
                <div style="margin-top:8px;">
                    <span class="tx-status-pill tx-status-${t.status}"><span class="status-dot"></span><span>${t.status}</span></span>
                </div>
            </div>
            <div class="tx-drawer-table">
                ${rows.map(([label, value]) => `
                    <div class="tx-detail-row">
                        <span class="dl">${label}</span>
                        <span class="dv">${value}</span>
                    </div>`).join('')}
            </div>
            <div style="margin-top:24px;">
                <button class="btn btn-primary btn-block" onclick="TxPage.downloadReceipt('${txId}')" style="display:flex;align-items:center;justify-content:center;gap:8px;">
                    <i class="fas fa-file-pdf"></i> Download Official Receipt
                </button>
            </div>`;

        document.getElementById('txDrawerOverlay').classList.add('active');
        if (typeof updateTawkVisibility === 'function') updateTawkVisibility();
    }

    function closeDrawer(e) {
        // If clicking the overlay itself (not the drawer panel), close it
        if (e && e.target !== document.getElementById('txDrawerOverlay')) return;
        document.getElementById('txDrawerOverlay')?.classList.remove('active');
        if (typeof updateTawkVisibility === 'function') updateTawkVisibility();
    }

    // ---- jsPDF loader (loaded once on demand) ----
    let _jsPDFReady = null;
    function loadJsPDF() {
        if (_jsPDFReady) return _jsPDFReady;
        _jsPDFReady = new Promise((resolve, reject) => {
            if (window.jspdf?.jsPDF) { resolve(window.jspdf.jsPDF); return; }
            const s = document.createElement('script');
            s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
            s.onload  = () => resolve(window.jspdf.jsPDF);
            s.onerror = () => reject(new Error('Failed to load jsPDF'));
            document.head.appendChild(s);
        });
        return _jsPDFReady;
    }

    // ---- single transaction receipt ----
    async function downloadReceipt(txId) {
        const t = allTx.find(tx => tx.id === txId);
        if (!t) return;

        try {
            const JsPDF = await loadJsPDF();
            const doc   = new JsPDF({ unit: 'pt', format: 'a4' });
            const W     = doc.internal.pageSize.getWidth();
            const debit = isDebit(t);

            // ---- header band ----
            doc.setFillColor(15, 42, 36);          // Summit Trust Holdings ink
            doc.rect(0, 0, W, 80, 'F');

            doc.setTextColor(244, 239, 230);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(22);
            doc.text('Summit Trust Holdings', 40, 36);

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(11);
            doc.text('Transaction Receipt  •  London, United Kingdom', 40, 56);
            doc.text(`Generated: ${new Date().toLocaleString()}`, W - 40, 56, { align: 'right' });

            // ---- amount hero ----
            doc.setFillColor(248, 250, 252);
            doc.rect(40, 100, W - 80, 70, 'F');

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(28);
            doc.setTextColor(debit ? 162 : 47, debit ? 59 : 107, debit ? 42 : 79);
            doc.text(`${debit ? '-' : '+'}${formatCurrency(t.amount)}`, W / 2, 143, { align: 'center' });

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(11);
            doc.setTextColor(107, 114, 128);
            doc.text((t.transaction_type || 'transaction').replace(/_/g, ' ').toUpperCase(), W / 2, 160, { align: 'center' });

            // ---- status pill ----
            const statusColors = {
                completed:  [220, 252, 231, 21, 128, 61],
                pending:    [254, 249, 195, 161, 98, 7],
                processing: [219, 234, 254, 29, 78, 216],
                failed:     [254, 226, 226, 185, 28, 28],
                rejected:   [252, 231, 243, 157, 23, 77],
                cancelled:  [243, 244, 246, 107, 114, 128],
            };
            const sc = statusColors[t.status] || statusColors.cancelled;
            doc.setFillColor(sc[0], sc[1], sc[2]);
            doc.roundedRect(W / 2 - 40, 170, 80, 20, 6, 6, 'F');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.setTextColor(sc[3], sc[4], sc[5]);
            doc.text(t.status.toUpperCase(), W / 2, 184, { align: 'center' });

            // ---- detail rows ----
            const rows = [
                ['Reference',   t.transaction_reference || '—'],
                ['From',        t.from_email  || '—'],
                ['To',          t.to_email    || '—'],
                ['Currency',    t.currency    || 'USD'],
                t.fee && parseFloat(t.fee) > 0 ? ['Fee',   formatCurrency(t.fee)]         : null,
                t.total_amount                 ? ['Total', formatCurrency(t.total_amount)] : null,
                t.description                  ? ['Description', t.description]            : null,
                ['Date',        new Date(t.created_at).toLocaleString()],
                t.completed_at ? ['Completed', new Date(t.completed_at).toLocaleString()]  : null,
                t.failure_reason ? ['Reason',  t.failure_reason]                           : null,
            ].filter(Boolean);

            let y = 210;
            const labelX = 40, valueX = 200, rowH = 28;

            doc.setDrawColor(229, 231, 235);

            rows.forEach(([ label, value ], i) => {
                if (i % 2 === 0) {
                    doc.setFillColor(249, 250, 251);
                    doc.rect(40, y - 14, W - 80, rowH, 'F');
                }
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(10);
                doc.setTextColor(107, 114, 128);
                doc.text(label, labelX, y);

                doc.setFont('helvetica', 'bold');
                doc.setTextColor(17, 24, 39);
                // wrap long values
                const lines = doc.splitTextToSize(String(value), W - valueX - 40);
                doc.text(lines, valueX, y);

                y += rowH;
            });

            // ---- footer ----
            doc.setFillColor(15, 42, 36);
            const pH = doc.internal.pageSize.getHeight();
            doc.rect(0, pH - 40, W, 40, 'F');
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.setTextColor(244, 239, 230);
            doc.text('Summit Trust Holdings  •  London, United Kingdom  •  summittrustbnk@proton.me', W / 2, pH - 16, { align: 'center' });

            const ref  = t.transaction_reference || t.id.slice(0, 8);
            doc.save(`Citizen-Wealth-receipt-${ref}.pdf`);

        } catch (err) {
            console.error('downloadReceipt error:', err);
            showToast('Error generating receipt PDF', 'error');
        }
    }

    // ---- statement export (filtered list) ----
    async function exportStatement() {
        if (!filtered.length) { showToast('No transactions to export', 'warning'); return; }

        try {
            const JsPDF = await loadJsPDF();
            const doc   = new JsPDF({ unit: 'pt', format: 'a4', orientation: 'landscape' });
            const W     = doc.internal.pageSize.getWidth();
            const H     = doc.internal.pageSize.getHeight();

            // helper to add header on each page
            const addHeader = () => {
                doc.setFillColor(15, 42, 36);
                doc.rect(0, 0, W, 50, 'F');
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(16);
                doc.setTextColor(244, 239, 230);
                doc.text('Summit Trust Holdings  —  Private Client Statement', 30, 32);
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(9);
                doc.text(`${currentUser.first_name} ${currentUser.last_name}  •  London, United Kingdom  •  ${new Date().toLocaleDateString()}`, W - 30, 32, { align: 'right' });
            };

            const addFooter = (pageNum, total) => {
                doc.setFillColor(243, 244, 246);
                doc.rect(0, H - 26, W, 26, 'F');
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(8);
                doc.setTextColor(107, 114, 128);
                doc.text(`Page ${pageNum} of ${total}`, W / 2, H - 10, { align: 'center' });
                doc.text('This statement is for informational purposes only.', 30, H - 10);
            };

            // ---- summary page ----
            addHeader();

            const completedTx   = filtered.filter(t => t.status === 'completed');
            const totalSent     = completedTx.filter(t => isDebit(t)).reduce((s, t) => s + parseFloat(t.amount || 0), 0);
            const totalReceived = completedTx.filter(t => !isDebit(t)).reduce((s, t) => s + parseFloat(t.amount || 0), 0);

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(13);
            doc.setTextColor(17, 24, 39);
            doc.text('Summary', 30, 80);

            const summaryItems = [
                ['Total transactions', String(filtered.length)],
                ['Total sent',         formatCurrency(totalSent)],
                ['Total received',     formatCurrency(totalReceived)],
                ['Net',                formatCurrency(totalReceived - totalSent)],
                ['Period',             (() => {
                    const dateFilter = document.getElementById('txDateFilter')?.value;
                    const map = { today: 'Today', week: 'This week', month: 'This month', '3months': 'Last 3 months', '': 'All time' };
                    return map[dateFilter] || 'All time';
                })()],
            ];

            let sy = 100;
            summaryItems.forEach(([label, value]) => {
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(10);
                doc.setTextColor(107, 114, 128);
                doc.text(label, 30, sy);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(17, 24, 39);
                doc.text(value, 200, sy);
                sy += 22;
            });

            // ---- table ----
            const cols = [
                { label: 'Date',          w: 90,  key: t => new Date(t.created_at).toLocaleDateString() },
                { label: 'Reference',     w: 120, key: t => t.transaction_reference || '—' },
                { label: 'Type',          w: 90,  key: t => (t.transaction_type || '').replace(/_/g, ' ') },
                { label: 'Description',   w: 150, key: t => t.description || '—' },
                { label: 'From',          w: 120, key: t => t.from_email || '—' },
                { label: 'To',            w: 120, key: t => t.to_email   || '—' },
                { label: 'Amount',        w: 80,  key: t => `${isDebit(t) ? '-' : '+'}${formatCurrency(t.amount)}`, align: 'right' },
                { label: 'Status',        w: 70,  key: t => t.status },
            ];

            const tableX   = 30;
            const rowH     = 20;
            const headerH  = 24;
            let   curPage  = 1;
            const pageRows = Math.floor((H - 50 - 26 - 20) / rowH) - 1; // rows that fit per page

            // calculate total pages needed
            const txPages = Math.ceil(filtered.length / pageRows);
            const totalPages = txPages + 1; // +1 for summary page

            // draw table header
            const drawTableHeader = (y) => {
                doc.setFillColor(15, 42, 36);
                doc.rect(tableX, y, W - 60, headerH, 'F');
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(9);
                doc.setTextColor(244, 239, 230);
                let x = tableX + 6;
                cols.forEach(col => {
                    doc.text(col.label, col.align === 'right' ? x + col.w - 6 : x, y + 16,
                        col.align === 'right' ? { align: 'right' } : {});
                    x += col.w;
                });
                return y + headerH;
            };

            // draw one data row
            const drawRow = (t, y, rowIdx) => {
                if (rowIdx % 2 === 0) {
                    doc.setFillColor(249, 250, 251);
                    doc.rect(tableX, y, W - 60, rowH, 'F');
                }
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(8);

                let x = tableX + 6;
                cols.forEach(col => {
                    const raw   = col.key(t);
                    const isAmt = col.label === 'Amount';
                    const isSt  = col.label === 'Status';

                    if (isAmt) {
                        doc.setTextColor(isDebit(t) ? 220 : 22, isDebit(t) ? 38 : 163, isDebit(t) ? 38 : 74);
                    } else if (isSt) {
                        const stMap = {
                            completed: [21, 128, 61],   pending:    [161, 98, 7],
                            processing:[29, 78, 216],   failed:     [185, 28, 28],
                            rejected:  [157, 23, 77],   cancelled:  [107, 114, 128],
                        };
                        const c = stMap[t.status] || [107, 114, 128];
                        doc.setTextColor(...c);
                    } else {
                        doc.setTextColor(55, 65, 81);
                    }

                    const text = doc.splitTextToSize(String(raw), col.w - 8)[0] || ''; // one line only
                    doc.text(text, col.align === 'right' ? x + col.w - 6 : x, y + 14,
                        col.align === 'right' ? { align: 'right' } : {});
                    x += col.w;
                });

                // light separator line
                doc.setDrawColor(229, 231, 235);
                doc.line(tableX, y + rowH, tableX + W - 60, y + rowH);
            };

            // paginate transactions
            let txIndex = 0;
            for (let p = 0; p < txPages; p++) {
                doc.addPage();
                curPage++;
                addHeader();

                let y = drawTableHeader(60);

                const batchEnd = Math.min(txIndex + pageRows, filtered.length);
                let rowIdx = 0;
                while (txIndex < batchEnd) {
                    drawRow(filtered[txIndex], y, rowIdx);
                    y += rowH;
                    txIndex++;
                    rowIdx++;
                }

                addFooter(curPage, totalPages);
            }

            // add footer to summary page (page 1)
            // jsPDF setPage is 1-based
            doc.setPage(1);
            addFooter(1, totalPages);

            const dateStr = new Date().toISOString().slice(0, 10);
            doc.save(`Citizen-Wealth-statement-${currentUser.first_name || 'Client'}-${dateStr}.pdf`);
            showToast('Statement downloaded', 'success');

        } catch (err) {
            console.error('exportStatement error:', err);
            showToast('Error generating statement PDF', 'error');
        }
    }

    // ---- utils ----
    function escHtml(str) {
        return String(str || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function showCopied(btn) {
        if (!btn) return;
        const orig = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-check" style="color:var(--success)"></i>';
        setTimeout(() => { btn.innerHTML = orig; }, 1600);
    }

    function clearFilters() {
        const s = document.getElementById('txSearch'); if (s) s.value = '';
        const clr = document.getElementById('txSearchClear'); if (clr) clr.style.display = 'none';
        const t = document.getElementById('txTypeFilter'); if (t) t.value = '';
        const st = document.getElementById('txStatusFilter'); if (st) st.value = '';
        const d = document.getElementById('txDateFilter'); if (d) d.value = '';
        page = 1;
        applyFilters();
    }

    async function reload() {
        page = 1;
        await load();
    }

    // ---- public API ----
    return { renderShell, load, sort, goTo, openDrawer, closeDrawer, reload, downloadReceipt, exportStatement, showCopied, clearFilters };

})();

// ============================================
// HOOK INTO EXISTING showSection
// ============================================

// Wrap the existing showSection so that switching to 'transactions'
// initialises and loads the module the first time.
(function () {
    const _original = window.showSection;
    let txInitialized = false;

    window.showSection = function (section) {
        _original?.call(this, section);

        if (section === 'transactions') {
            if (!txInitialized) {
                TxPage.renderShell();
                txInitialized = true;
            }
            TxPage.load();
        }
    };
})();

// Also expose globally so onclick attrs can call it
window.TxPage = TxPage;

