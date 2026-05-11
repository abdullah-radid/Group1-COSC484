(function () {
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

        const hamburger = document.createElement('button');
        hamburger.className = 'hamburger';
        hamburger.setAttribute('aria-label', 'Menu');
        hamburger.innerHTML = '<span></span><span></span><span></span>';
        hamburger.onclick = function () {
            navRight.classList.toggle('open');
        };

        const nav = document.querySelector('nav');
        if (nav) nav.appendChild(hamburger);

        const pageNames = {
            'residentMenu.html': 'Dashboard',
            'payRent.html': 'Pay Rent',
            'lease.html': 'Lease Terms',
            'maintenanceRequest.html': 'Maintenance Request',
            'message.html': 'Send Message',
            'administrationMenu.html': 'Dashboard',
            'adminMessages.html': 'Messages',
            'residentStatuses.html': 'Resident Statuses',
            'manageNotices.html': 'Manage Notices',
            'maintenanceMenu.html': 'Dashboard',
            'workOrders.html': 'Work Orders',
            'updateStatus.html': 'Update Status'
        };

        const currentPage = window.location.pathname.split('/').pop();
        const pageName = pageNames[currentPage];
        if (pageName && !document.querySelector('.nav-page-indicator')) {
            const indicator = document.createElement('span');
            indicator.className = 'nav-page-indicator';
            indicator.textContent = pageName;
            const navBrand = document.querySelector('.nav-brand');
            if (navBrand) navBrand.after(indicator);
        }
    });
})();
