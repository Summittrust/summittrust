// ============================================
// NOTIFICATION MODULE
// Personal: mark read / delete instantly, no PIN / no approval
// Joint: mark read / delete requires PIN from current user
//        + pending_action for partner to approve deletion
//        (mark-read does NOT need partner approval, only delete does)
// ============================================

// ── STATE ─────────────────────────────────────

var notifState = {
    items:       [],
    unreadCount: 0,
    open:        false,
    expanded:    null   // id of currently expanded item
};

// ── TYPE → ICON MAP ───────────────────────────

var NOTIF_ICONS = {
    info:        'fa-info-circle',
    success:     'fa-check-circle',
    warning:     'fa-exclamation-triangle',
    error:       'fa-times-circle',
    transaction: 'fa-exchange-alt',
    card:        'fa-credit-card',
    loan:        'fa-hand-holding-usd',
    investment:  'fa-chart-line',
    system:      'fa-bell'
};

// ── INIT ──────────────────────────────────────

function initNotifications() {
    // Inject bell button into navbar nav-actions (before user menu)
    var navActions = document.querySelector('.nav-actions');
    if (!navActions) return;

    var wrap = document.createElement('div');
    wrap.className = 'notif-wrap';
    wrap.id        = 'notifWrap';
    wrap.innerHTML =
        '<button class="notif-btn" id="notifBtn" onclick="toggleNotifDropdown(event)" aria-label="Notifications">'
        + '<i class="fas fa-bell"></i>'
        + '<span class="notif-badge hidden" id="notifBadge">0</span>'
        + '</button>'
        + '<div class="notif-dropdown" id="notifDropdown">'
        + '<div class="notif-header">'
        + '<div class="notif-header-title">'
        + '<i class="fas fa-bell"></i> Notifications'
        + '<span class="notif-header-unread hidden" id="notifUnreadLabel">0 unread</span>'
        + '</div>'
        + '<div class="notif-header-actions">'
        + '<button class="notif-header-btn" onclick="markAllRead()" title="Mark all as read"><i class="fas fa-check-double"></i> All read</button>'
        + '<button class="notif-header-btn danger" onclick="clearAllNotifications()" title="Clear all"><i class="fas fa-trash"></i> Clear all</button>'
        + '</div>'
        + '</div>'
        + '<div class="notif-list" id="notifList">'
        + '<div class="notif-loading"><i class="fas fa-spinner fa-spin"></i> Loading…</div>'
        + '</div>'
        + '</div>';

    // Insert before the first child (theme toggle)
    navActions.insertBefore(wrap, navActions.firstChild);

    // Close on outside click — but not when clicking inside the dropdown itself
    document.addEventListener('click', function (e) {
        var btn  = document.getElementById('notifBtn');
        var drop = document.getElementById('notifDropdown');
        if (!btn || !drop) return;
        // If click is inside the dropdown or on the bell button, do nothing
        if (drop.contains(e.target) || btn.contains(e.target)) return;
        closeNotifDropdown();
    });

    // Poll every 10 seconds for new notifications
    setInterval(function () {
        loadNotifications(notifState.open);
    }, 10000);

    // Load immediately
    loadNotifications();
}

// ── TOGGLE ────────────────────────────────────

function toggleNotifDropdown(e) {
    if (e) e.stopPropagation();
    var dropdown = document.getElementById('notifDropdown');
    if (!dropdown) return;
    if (notifState.open) {
        closeNotifDropdown();
    } else {
        dropdown.classList.add('open');
        notifState.open = true;
        loadNotifications();
    }
}

function closeNotifDropdown() {
    var dropdown = document.getElementById('notifDropdown');
    if (dropdown) dropdown.classList.remove('open');
    notifState.open = false;
}

// ── LOAD ──────────────────────────────────────

async function loadNotifications(renderList) {
    if (renderList === undefined) renderList = true;
    try {
        var q = db.from('notifications').select('*').order('created_at', { ascending: false }).limit(50);
        if (currentUser.account_type === 'joint' && currentUser.joint_account_id) {
            q = q.or('user_id.eq.' + currentUser.id + ',joint_account_id.eq.' + currentUser.joint_account_id);
        } else {
            q = q.eq('user_id', currentUser.id);
        }

        var res = await q;
        notifState.items = res.data || [];
        notifState.unreadCount = notifState.items.filter(function (n) { return !n.is_read; }).length;

        updateBadge();
        if (renderList) renderNotifList();
    } catch (err) {
        console.error('loadNotifications error:', err);
        if (renderList) renderNotifList();
    }
}

// ── BADGE ─────────────────────────────────────

function updateBadge() {
    var badge = document.getElementById('notifBadge');
    var label = document.getElementById('notifUnreadLabel');
    var count = notifState.unreadCount;

    if (badge) {
        if (count > 0) {
            badge.textContent = count > 99 ? '99+' : count;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    }

    if (label) {
        if (count > 0) {
            label.textContent = count + ' unread';
            label.classList.remove('hidden');
        } else {
            label.classList.add('hidden');
        }
    }
}

// ── RENDER LIST ───────────────────────────────

function renderNotifList() {
    var list = document.getElementById('notifList');
    if (!list) return;

    if (!notifState.items.length) {
        list.innerHTML =
            '<div class="notif-empty">'
            + '<i class="fas fa-bell-slash"></i>'
            + '<p>No notifications yet</p>'
            + '</div>';
        return;
    }

    list.innerHTML = notifState.items.map(function (n) {
        return renderNotifItem(n);
    }).join('');
}

function renderNotifItem(n) {
    var icon      = NOTIF_ICONS[n.type] || 'fa-bell';
    var isUnread  = !n.is_read;
    var timeStr   = formatNotifTime(n.created_at);
    var isExpanded = notifState.expanded === n.id;

    return '<div class="notif-item' + (isUnread ? ' unread' : '') + '" id="notif-' + n.id + '">'
        + '<div class="notif-item-header" onclick="toggleNotifExpand(\'' + n.id + '\',event)">'
        + '<div class="notif-icon ' + (n.type || 'info') + '">'
        + '<i class="fas ' + icon + '"></i>'
        + '</div>'
        + '<div class="notif-item-content">'
        + '<div class="notif-item-title">' + escHtml(n.title) + '</div>'
        + '<div class="notif-item-time">' + timeStr + '</div>'
        + '</div>'
        + (isUnread ? '<div class="notif-unread-dot"></div>' : '')
        + '<i class="fas fa-chevron-' + (isExpanded ? 'up' : 'down') + '" style="font-size:.7rem;color:var(--text-secondary);flex-shrink:0;"></i>'
        + '</div>'
        + '<div class="notif-item-body' + (isExpanded ? ' expanded' : '') + '" id="notif-body-' + n.id + '">'
        + (n.body ? '<p style="margin:0 0 10px;">' + escHtml(n.body) + '</p>' : '')
        + '<div class="notif-item-actions">'
        + (isUnread
            ? '<button class="notif-action-btn" onclick="markOneRead(\'' + n.id + '\',event)"><i class="fas fa-check"></i> Mark read</button>'
            : '')
        + '<button class="notif-action-btn danger" onclick="deleteNotification(\'' + n.id + '\',event)"><i class="fas fa-trash"></i> Delete</button>'
        + '</div>'
        + '</div>'
        + '</div>';
}

function toggleNotifExpand(id, e) {
    if (e) e.stopPropagation();

    var body     = document.getElementById('notif-body-' + id);
    var item     = document.getElementById('notif-' + id);
    var chevron  = item ? item.querySelector('.notif-item-header .fa-chevron-down, .notif-item-header .fa-chevron-up') : null;
    if (!body) return;

    var isExpanded = body.classList.contains('expanded');

    // Collapse any currently open item
    if (notifState.expanded && notifState.expanded !== id) {
        var oldBody    = document.getElementById('notif-body-' + notifState.expanded);
        var oldItem    = document.getElementById('notif-' + notifState.expanded);
        var oldChevron = oldItem ? oldItem.querySelector('.fa-chevron-up') : null;
        if (oldBody)    oldBody.classList.remove('expanded');
        if (oldChevron) { oldChevron.classList.remove('fa-chevron-up'); oldChevron.classList.add('fa-chevron-down'); }
    }

    if (isExpanded) {
        body.classList.remove('expanded');
        if (chevron) { chevron.classList.remove('fa-chevron-up'); chevron.classList.add('fa-chevron-down'); }
        notifState.expanded = null;
    } else {
        body.classList.add('expanded');
        if (chevron) { chevron.classList.remove('fa-chevron-down'); chevron.classList.add('fa-chevron-up'); }
        notifState.expanded = id;

        // Auto mark as read without re-rendering
        var n = notifState.items.find(function (x) { return x.id === id; });
        if (n && !n.is_read) {
            markOneReadSilent(id).then(function () {
                // Remove unread dot and highlight from DOM
                if (item) {
                    item.classList.remove('unread');
                    var dot = item.querySelector('.notif-unread-dot');
                    if (dot) dot.remove();
                    // Remove mark read button
                    var markBtn = item.querySelector('.notif-action-btn:not(.danger)');
                    if (markBtn) markBtn.remove();
                }
                updateBadge();
            });
        }
    }
}

// ── TIME FORMAT ───────────────────────────────

function formatNotifTime(iso) {
    var d    = new Date(iso);
    var now  = new Date();
    var diff = Math.floor((now - d) / 1000);
    if (diff < 60)    return 'Just now';
    if (diff < 3600)  return Math.floor(diff / 60) + 'm ago';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
    if (diff < 604800) return Math.floor(diff / 86400) + 'd ago';
    return d.toLocaleDateString();
}

function escHtml(str) {
    return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── MARK READ ─────────────────────────────────
// Personal: instant. Joint: instant (no partner approval needed for read).

async function markOneRead(id, e) {
    if (e) e.stopPropagation();
    await markOneReadSilent(id);
    renderNotifList();
    updateBadge();
}

async function markOneReadSilent(id) {
    try {
        await db.from('notifications')
            .update({ is_read: true, read_at: new Date().toISOString() })
            .eq('id', id);

        var n = notifState.items.find(function (x) { return x.id === id; });
        if (n) { n.is_read = true; n.read_at = new Date().toISOString(); }
        notifState.unreadCount = notifState.items.filter(function (x) { return !x.is_read; }).length;
    } catch (err) { console.error('markOneReadSilent error:', err); }
}

async function markAllRead() {
    try {
        var q = db.from('notifications').update({ is_read: true, read_at: new Date().toISOString() });
        if (currentUser.account_type === 'joint' && currentUser.joint_account_id) {
            q = q.or('user_id.eq.' + currentUser.id + ',joint_account_id.eq.' + currentUser.joint_account_id);
        } else {
            q = q.eq('user_id', currentUser.id);
        }
        await q;
        notifState.items.forEach(function (n) { n.is_read = true; });
        notifState.unreadCount = 0;
        updateBadge();
        renderNotifList();
        showToast('All notifications marked as read', 'success');
    } catch (err) {
        showToast('Error: ' + err.message, 'error');
    }
}

// ── DELETE ────────────────────────────────────
// Personal: instant, no PIN.
// Joint: PIN required from current user + pending_action for partner.

async function deleteNotification(id, e) {
    if (e) e.stopPropagation();

    if (currentUser.account_type === 'joint' && currentUser.joint_account_id) {
        var confirmed = await requestPin('Enter your PIN to delete this notification.');
        if (!confirmed) return;

        var pending = await createPendingAction('notification_delete', { notification_id: id });
        if (pending) {
            showToast('Deletion request sent — awaiting co-holder approval', 'info');
        }
        return;
    }

    // Personal: delete immediately
    await executeDeleteNotification(id);
}

async function executeDeleteNotification(id) {
    try {
        await db.from('notifications').delete().eq('id', id);
        notifState.items = notifState.items.filter(function (n) { return n.id !== id; });
        notifState.unreadCount = notifState.items.filter(function (n) { return !n.is_read; }).length;
        if (notifState.expanded === id) notifState.expanded = null;
        updateBadge();
        renderNotifList();
        showToast('Notification deleted', 'success');
    } catch (err) {
        showToast('Error: ' + err.message, 'error');
    }
}

async function clearAllNotifications() {
    if (!notifState.items.length) return;

    if (currentUser.account_type === 'joint' && currentUser.joint_account_id) {
        var confirmed = await requestPin('Enter your PIN to clear all notifications.');
        if (!confirmed) return;

        var pending = await createPendingAction('notification_clear_all', { cleared_at: new Date().toISOString() });
        if (pending) {
            showToast('Clear request sent — awaiting co-holder approval', 'info');
        }
        return;
    }

    // Personal: clear immediately
    await executeClearAllNotifications();
}

async function executeClearAllNotifications() {
    try {
        var q = db.from('notifications').delete();
        if (currentUser.account_type === 'joint' && currentUser.joint_account_id) {
            q = q.or('user_id.eq.' + currentUser.id + ',joint_account_id.eq.' + currentUser.joint_account_id);
        } else {
            q = q.eq('user_id', currentUser.id);
        }
        await q;
        notifState.items       = [];
        notifState.unreadCount = 0;
        notifState.expanded    = null;
        updateBadge();
        renderNotifList();
        showToast('All notifications cleared', 'success');
    } catch (err) {
        showToast('Error: ' + err.message, 'error');
    }
}

// ── WIRE UP ───────────────────────────────────

window.initNotifications          = initNotifications;
window.loadNotifications          = loadNotifications;
window.toggleNotifDropdown        = toggleNotifDropdown;
window.closeNotifDropdown         = closeNotifDropdown;
window.toggleNotifExpand          = toggleNotifExpand;
window.markOneRead                = markOneRead;
window.markAllRead                = markAllRead;
window.deleteNotification         = deleteNotification;
window.clearAllNotifications      = clearAllNotifications;
window.executeDeleteNotification  = executeDeleteNotification;
window.executeClearAllNotifications = executeClearAllNotifications;