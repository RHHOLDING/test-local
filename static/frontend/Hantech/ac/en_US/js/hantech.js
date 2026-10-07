/**
 * HANTECH storefront helpers (vanilla, no RequireJS needed):
 *  - reveal-on-scroll for elements marked .ht-reveal
 *  - product page: buying "with installation" requires accepting the installation package scope
 */
(function () {
    'use strict';

    document.documentElement.classList.add('ht-js');

    function onReady(fn) {
        if (document.readyState !== 'loading') {
            fn();
        } else {
            document.addEventListener('DOMContentLoaded', fn);
        }
    }

    function initReveal() {
        var items = document.querySelectorAll('.ht-reveal');
        if (!items.length) {
            return;
        }
        if (!('IntersectionObserver' in window)) {
            items.forEach(function (el) { el.classList.add('is-in'); });
            return;
        }
        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-in');
                    io.unobserve(entry.target);
                }
            });
        }, {rootMargin: '0px 0px -8% 0px', threshold: 0.08});
        items.forEach(function (el) { io.observe(el); });
    }

    function initInstallationScope() {
        var box = document.querySelector('[data-ht-install]');
        var form = document.getElementById('product_addtocart_form');
        if (!box || !form) {
            return;
        }
        var accept = box.querySelector('[data-ht-accept]');
        var error = box.querySelector('[data-ht-error]');

        function installationOption() {
            var radios = form.querySelectorAll('.product-custom-option[type="radio"]');
            for (var i = 0; i < radios.length; i++) {
                var label = form.querySelector('label[for="' + radios[i].id + '"]');
                if (label && /with\s+(hantech\s+)?installation/i.test(label.textContent)) {
                    return radios[i];
                }
            }
            return null;
        }

        var withInstall = installationOption();
        if (!withInstall) {
            return;
        }

        function sync() {
            var active = withInstall.checked;
            box.classList.toggle('is-selected', active);
            if (!active || accept.checked) {
                box.classList.remove('has-error');
                error.hidden = true;
            }
        }

        form.addEventListener('change', sync);
        accept.addEventListener('change', sync);

        box.querySelector('[data-ht-choose]').addEventListener('click', function () {
            withInstall.checked = true;
            withInstall.dispatchEvent(new Event('change', {bubbles: true}));
            withInstall.dispatchEvent(new Event('click', {bubbles: true}));
            sync();
        });

        // Capture phase on document runs before Magento's own submit handlers on the form.
        document.addEventListener('submit', function (event) {
            if (event.target !== form || !withInstall.checked || accept.checked) {
                return;
            }
            event.preventDefault();
            event.stopImmediatePropagation();
            box.classList.add('has-error');
            error.hidden = false;
            box.scrollIntoView({behavior: 'smooth', block: 'center'});
        }, true);

        sync();
    }

    onReady(function () {
        initReveal();
        initInstallationScope();
    });
}());
