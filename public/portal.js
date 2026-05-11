(function () {

    // Toast notification system
    const toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);

    window.showToast = function (message, type) {
        type = type || 'success';
        const toast = document.createElement('div');
        toast.className = 'toast ' + type;
        toast.textContent = message;
        toastContainer.appendChild(toast);
        requestAnimationFrame(() => toast.classList.add('show'));
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    };

    document.addEventListener('DOMContentLoaded', function () {
        const navRight = document.querySelector('.nav-right');
        if (!navRight) return;

        // Hamburger menu for mobile
        const hamburger = document.createElement('button');
        hamburger.className = 'hamburger';
        hamburger.setAttribute('aria-label', 'Menu');
        hamburger.innerHTML = '<span></span><span></span><span></span>';
        hamburger.onclick = function () {
            navRight.classList.toggle('open');
        };
        const nav = document.querySelector('nav');
        if (nav) nav.appendChild(hamburger);

        // Active page indicator
        const pageNames = {
            'residentMenu.html':      'Dashboard',
            'payRent.html':           'Pay Rent',
            'lease.html':             'Lease Terms',
            'maintenanceRequest.html':'Maintenance Request',
            'message.html':           'Send Message',
            'administrationMenu.html':'Dashboard',
            'adminMessages.html':     'Messages',
            'residentStatuses.html':  'Resident Statuses',
            'manageNotices.html':     'Manage Notices',
            'maintenanceMenu.html':   'Dashboard',
            'workOrders.html':        'Work Orders',
            'updateStatus.html':      'Update Status'
        };
        const currentPage = window.location.pathname.split('/').pop();
        const pageName = pageNames[currentPage];
        if (pageName) {
            const indicator = document.createElement('span');
            indicator.className = 'nav-page-indicator';
            indicator.textContent = pageName;
            const navBrand = document.querySelector('.nav-brand');
            if (navBrand) navBrand.after(indicator);
        }

        // Notification bell
        const navUser = document.querySelector('.nav-user');
        if (navUser) {
            let notifCount = parseInt(localStorage.getItem('notifCount') || '0');

            const bell = document.createElement('div');
            bell.className = 'notif-bell';
            bell.title = 'Notifications';

            const img = document.createElement('img');
            img.src = 'images/notification-icon.png';
            img.alt = 'Notifications';
            img.className = 'notif-bell-img';

            const badge = document.createElement('span');
            badge.className = 'notif-dot';
            badge.textContent = notifCount;

            bell.appendChild(img);
            bell.appendChild(badge);

            function updateBell() {
                badge.textContent = notifCount;
                if (notifCount > 0) {
                    bell.classList.add('has-alert');
                } else {
                    bell.classList.remove('has-alert');
                }
                localStorage.setItem('notifCount', notifCount);
            }

            window.addNotification = function (count) {
                notifCount += (count || 1);
                updateBell();
            };

            window.clearNotifications = function () {
                notifCount = 0;
                updateBell();
            };

            bell.onclick = function () {
                notifCount = 0;
                updateBell();
            };

            updateBell();
            navRight.insertBefore(bell, navRight.firstChild);
        }
    });
})();
