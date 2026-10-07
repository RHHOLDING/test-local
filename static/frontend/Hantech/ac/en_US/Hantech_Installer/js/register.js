/**
 * Installer registration wizard (front-end prototype).
 * Step navigation with per-step validation, radius/postcode helpers, document pickers and a local
 * draft so an installer can come back later. Submitting shows the confirmation screen only —
 * persisting applications (and creating the partner record in Odoo) is the backend phase.
 */
(function () {
    'use strict';

    var root = document.querySelector('[data-ht-register]');
    if (!root) {
        return;
    }

    var DRAFT_KEY = 'hantech-installer-draft';
    var SECRET = /^(password|password_confirm|iban|bic|account_holder|tax_number)$/;

    var form = root.querySelector('[data-form]');
    var steps = Array.prototype.slice.call(root.querySelectorAll('[data-step]'));
    var links = root.querySelectorAll('[data-step-link]');
    var prev = root.querySelector('[data-prev]');
    var next = root.querySelector('[data-next]');
    var bar = root.querySelector('[data-progress]');
    var label = root.querySelector('[data-progress-label]');
    var current = 0;
    var furthest = 0;

    function show(index) {
        steps[current].classList.remove('is-active');
        current = index;
        furthest = Math.max(furthest, index);
        steps[current].classList.add('is-active');

        links.forEach(function (li, i) {
            li.classList.toggle('is-current', i === current);
            li.classList.toggle('is-done', i < furthest || (i < current));
        });
        prev.hidden = current === 0;
        next.textContent = current === steps.length - 1 ? 'Submit application' : 'Continue';
        bar.style.width = ((current + 1) / steps.length * 100) + '%';
        label.textContent = 'Step ' + (current + 1) + ' of ' + steps.length + ' · ' + steps[current].querySelector('legend').textContent;

        var top = root.getBoundingClientRect().top + window.scrollY - 20;
        if (window.scrollY > top) {
            window.scrollTo({top: top, behavior: 'smooth'});
        }
    }

    function fieldError(input, message) {
        var field = input.closest('.ht-field, .ht-doc, .ht-check-line') || input.parentNode;
        var note = field.querySelector('.ht-error');
        field.classList.toggle('has-error', !!message);
        if (message) {
            if (!note) {
                note = document.createElement('small');
                note.className = 'ht-error';
                field.appendChild(note);
            }
            note.textContent = message;
        } else if (note) {
            note.remove();
        }
    }

    function messageFor(input) {
        var v = input.validity;
        if (v.valueMissing) {
            return input.type === 'checkbox' ? 'Please confirm to continue.'
                : input.type === 'file' ? 'Please upload this document.'
                : 'This field is required.';
        }
        if (v.typeMismatch) {
            return input.type === 'email' ? 'Please enter a valid email address.' : 'Please check the format.';
        }
        if (v.patternMismatch) {
            return /postcode/.test(input.name) ? 'Please enter a 5-digit postcode.'
                : input.name === 'vat_id' ? 'Format: DE followed by 9 digits.'
                : 'Please check the format.';
        }
        if (v.tooShort) {
            return 'At least ' + input.minLength + ' characters.';
        }
        return input.validationMessage;
    }

    function validate(step) {
        var ok = true;
        var first = null;
        step.querySelectorAll('input, select').forEach(function (input) {
            if (input.type === 'hidden' || input.disabled) {
                return;
            }
            var message = input.checkValidity() ? '' : messageFor(input);
            if (!message && input.dataset.match) {
                var other = form.elements[input.dataset.match];
                if (other && other.value !== input.value) {
                    message = 'Passwords do not match.';
                }
            }
            if (!message && input.name === 'iban' && input.value && !validIban(input.value)) {
                message = 'Please check your IBAN.';
            }
            fieldError(input, message);
            if (message && ok) {
                ok = false;
                first = input;
            }
        });
        if (first) {
            first.focus({preventScroll: true});
            first.closest('.ht-field, .ht-doc, .ht-check-line').scrollIntoView({behavior: 'smooth', block: 'center'});
        }
        return ok;
    }

    function validIban(value) {
        var iban = value.replace(/\s+/g, '').toUpperCase();
        if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(iban)) {
            return false;
        }
        var moved = iban.slice(4) + iban.slice(0, 4);
        var digits = moved.replace(/[A-Z]/g, function (c) { return c.charCodeAt(0) - 55; });
        var rest = 0;
        for (var i = 0; i < digits.length; i += 7) {
            rest = parseInt(String(rest) + digits.substr(i, 7), 10) % 97;
        }
        return rest === 1;
    }

    next.addEventListener('click', function () {
        if (!validate(steps[current])) {
            return;
        }
        if (current < steps.length - 1) {
            show(current + 1);
            saveDraft();
        } else {
            submit();
        }
    });

    prev.addEventListener('click', function () {
        if (current > 0) {
            show(current - 1);
        }
    });

    links.forEach(function (li, i) {
        li.addEventListener('click', function () {
            if (i <= furthest && (i < current || validate(steps[current]))) {
                show(i);
            }
        });
    });

    form.addEventListener('input', function (e) {
        if (e.target.closest('.has-error') && e.target.checkValidity()) {
            fieldError(e.target, '');
        }
    });

    form.addEventListener('submit', function (e) {
        e.preventDefault();
    });

    function submit() {
        var company = form.elements.company.value || 'your company';
        root.querySelector('[data-done-company]').textContent = company;
        root.querySelector('[data-done-ref]').textContent =
            'HT-P-' + new Date().getFullYear() + '-' + String(Math.floor(1000 + Math.random() * 9000));
        steps[current].classList.remove('is-active');
        root.querySelector('[data-done]').hidden = false;
        root.querySelector('[data-nav]').hidden = true;
        links.forEach(function (li) {
            li.classList.remove('is-current');
            li.classList.add('is-done');
        });
        bar.style.width = '100%';
        label.textContent = 'Application submitted';
        try {
            localStorage.removeItem(DRAFT_KEY);
        } catch (err) { /* storage unavailable */ }
        root.scrollIntoView({behavior: 'smooth'});
    }

    /* ---------- service area ---------- */
    var radius = root.querySelector('[data-radius]');
    var radiusOut = root.querySelector('[data-radius-out]');
    var circle = root.querySelector('[data-radius-circle]');
    var areaKm = root.querySelector('[data-area-km]');

    function syncRadius() {
        var km = parseInt(radius.value, 10);
        radiusOut.textContent = km + ' km';
        circle.setAttribute('r', String(20 + (km - 10) / 190 * 118));
        areaKm.textContent = '≈ ' + Math.round(Math.PI * km * km).toLocaleString('de-DE') + ' km²';
        radius.style.setProperty('--fill', ((km - 10) / 190 * 100) + '%');
    }
    radius.addEventListener('input', syncRadius);

    // Base postcode defaults to the company postcode.
    var base = form.elements.base_postcode;
    form.elements.postcode.addEventListener('change', function () {
        if (!base.value) {
            base.value = form.elements.postcode.value;
        }
    });

    var tagsBox = root.querySelector('[data-tags]');
    var tagInput = root.querySelector('[data-tag-input]');
    var tagsValue = root.querySelector('[data-tags-value]');
    var tags = [];

    function renderTags() {
        tagsBox.querySelectorAll('.ht-tag').forEach(function (t) { t.remove(); });
        tags.forEach(function (tag, i) {
            var el = document.createElement('span');
            el.className = 'ht-tag';
            el.textContent = tag;
            var x = document.createElement('button');
            x.type = 'button';
            x.setAttribute('aria-label', 'Remove ' + tag);
            x.textContent = '×';
            x.addEventListener('click', function () {
                tags.splice(i, 1);
                renderTags();
            });
            el.appendChild(x);
            tagsBox.insertBefore(el, tagInput);
        });
        tagsValue.value = tags.join(',');
    }

    tagInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
            e.preventDefault();
            var v = tagInput.value.replace(/\D/g, '');
            if (/^\d{1,5}$/.test(v) && tags.indexOf(v) === -1) {
                tags.push(v);
                renderTags();
            }
            tagInput.value = '';
        } else if (e.key === 'Backspace' && !tagInput.value && tags.length) {
            tags.pop();
            renderTags();
        }
    });

    /* ---------- steppers, files, IBAN ---------- */
    root.querySelectorAll('[data-stepper]').forEach(function (s) {
        var input = s.querySelector('input');
        function bump(d) {
            var v = (parseInt(input.value, 10) || 0) + d;
            input.value = Math.min(Math.max(v, +input.min || 0), +input.max || 999);
        }
        s.querySelector('[data-dec]').addEventListener('click', function () { bump(-1); });
        s.querySelector('[data-inc]').addEventListener('click', function () { bump(1); });
    });

    root.querySelectorAll('[data-file]').forEach(function (input) {
        input.addEventListener('change', function () {
            var drop = input.closest('.ht-drop');
            var file = input.files[0];
            drop.classList.toggle('has-file', !!file);
            drop.querySelector('[data-file-name]').textContent = file
                ? file.name + ' · ' + Math.max(1, Math.round(file.size / 1024)) + ' KB'
                : '';
            if (file) {
                fieldError(input, '');
            }
        });
    });

    var iban = root.querySelector('[data-iban]');
    iban.addEventListener('input', function () {
        var pos = iban.selectionStart;
        var before = iban.value.length;
        iban.value = iban.value.replace(/[^a-z0-9]/gi, '').toUpperCase().replace(/(.{4})/g, '$1 ').trim();
        iban.setSelectionRange(pos + iban.value.length - before, pos + iban.value.length - before);
    });

    /* ---------- local draft (never stores passwords or bank data) ---------- */
    var saved = root.querySelector('[data-saved]');

    function saveDraft() {
        var data = {step: current, tags: tags, fields: {}};
        Array.prototype.forEach.call(form.elements, function (el) {
            if (!el.name || SECRET.test(el.name) || el.type === 'file') {
                return;
            }
            if (el.type === 'checkbox') {
                (data.fields[el.name] = data.fields[el.name] || []).push(el.checked ? el.value : null);
            } else {
                data.fields[el.name] = el.value;
            }
        });
        try {
            localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
            saved.classList.add('is-visible');
            setTimeout(function () { saved.classList.remove('is-visible'); }, 1800);
        } catch (err) { /* storage unavailable */ }
    }

    function loadDraft() {
        var data;
        try {
            data = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
        } catch (err) {
            data = null;
        }
        if (!data) {
            return;
        }
        Object.keys(data.fields).forEach(function (name) {
            var list = form.querySelectorAll('[name="' + name + '"]');
            var value = data.fields[name];
            list.forEach(function (el, i) {
                if (el.type === 'checkbox') {
                    el.checked = Array.isArray(value) && value[i] !== null && value[i] !== undefined;
                } else if (typeof value === 'string') {
                    el.value = value;
                }
            });
        });
        tags = data.tags || [];
        renderTags();
        syncRadius();
        furthest = data.step || 0;
        show(data.step || 0);
    }

    form.addEventListener('change', function () {
        clearTimeout(form._draftTimer);
        form._draftTimer = setTimeout(saveDraft, 600);
    });

    syncRadius();
    show(0);
    loadDraft();
}());
