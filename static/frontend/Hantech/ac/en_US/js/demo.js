/**
 * Static design preview only (not loaded by Magento): replaces server actions with demo feedback
 * and provides the mobile menu toggle normally handled by Magento's JS.
 */
(function () {
    'use strict';

    function toast(text) {
        var el = document.createElement('div');
        el.textContent = text;
        el.style.cssText = 'position:fixed;left:50%;bottom:28px;transform:translateX(-50%);z-index:9999;' +
            'background:#141b2b;color:#fff;padding:14px 22px;border-radius:999px;font:600 14px Manrope,sans-serif;' +
            'box-shadow:0 18px 40px -16px rgba(0,0,0,.5);max-width:90vw;text-align:center';
        document.body.appendChild(el);
        setTimeout(function () { el.remove(); }, 3200);
    }

    document.addEventListener('submit', function (e) {
        var form = e.target;
        if (e.defaultPrevented || form.hasAttribute('data-form') || form.hasAttribute('data-ht-login')) {
            return;
        }
        e.preventDefault();
        if (form.id === 'product_addtocart_form') {
            var install = form.querySelector('.product-custom-option[type="radio"]:checked');
            var label = install && form.querySelector('label[for="' + install.id + '"]');
            toast('Design preview: added to cart' + (label ? ' — ' + label.textContent.trim().split('\n')[0] : ''));
        } else {
            toast('Design preview — this action is available in the live shop.');
        }
    });

    document.addEventListener('click', function (e) {
        var toggle = e.target.closest('[data-action="toggle-nav"]');
        if (toggle) {
            e.preventDefault();
            document.documentElement.classList.toggle('nav-open');
            document.documentElement.classList.toggle('nav-before-open');
        } else if (document.documentElement.classList.contains('nav-open') && !e.target.closest('.nav-sections')) {
            document.documentElement.classList.remove('nav-open', 'nav-before-open');
        }
    });
}());
