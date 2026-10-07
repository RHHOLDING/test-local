/**
 * HANTECH homepage hero: the air conditioner switches on and throws cool air as the visitor scrolls.
 *
 * The hero section is tall (≈3 viewports) and its stage is sticky, so scroll position inside the
 * section becomes a 0→1 progress value. Everything visual is derived from that value:
 *   power / flap angle / particle emission / stream strength / room colour / temperature / copy phase.
 * Particles keep flowing while the visitor rests, so the unit feels "on" rather than scrubbed.
 */
(function () {
    'use strict';

    var hero = document.getElementById('ht-hero');
    if (!hero) {
        return;
    }

    var stage = hero.querySelector('.ht-hero__stage');
    var canvas = hero.querySelector('.ht-hero__air');
    var ctx = canvas.getContext('2d');
    var vent = hero.querySelector('.ht-ac__vent');
    var flap = hero.querySelector('.ht-ac__flap');
    var acTemp = hero.querySelector('.ht-ac__temp');
    var tempEl = hero.querySelector('[data-temp]');
    var stateEl = hero.querySelector('[data-state]');
    var phases = hero.querySelectorAll('.ht-hero__phase');
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    var START_TEMP = 29;
    var TARGET_TEMP = 21;

    var progress = 0;
    var air = 0;
    var visible = true;
    var particles = [];
    var lastTime = 0;
    var emitDebt = 0;
    var dpr = 1;
    var width = 0;
    var height = 0;
    var ventBox = {x: 0, y: 0, w: 0};
    var running = false;
    var currentPhase = 0;

    function clamp(v, min, max) {
        return v < min ? min : v > max ? max : v;
    }

    function smoothstep(a, b, v) {
        var t = clamp((v - a) / (b - a), 0, 1);
        return t * t * (3 - 2 * t);
    }

    function resize() {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        width = stage.clientWidth;
        height = stage.clientHeight;
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        measureVent();
    }

    function measureVent() {
        var s = stage.getBoundingClientRect();
        var v = vent.getBoundingClientRect();
        ventBox = {x: v.left - s.left, y: v.bottom - s.top, w: v.width};
    }

    function readProgress() {
        var rect = hero.getBoundingClientRect();
        var range = hero.offsetHeight - window.innerHeight;
        return range > 0 ? clamp(-rect.top / range, 0, 1) : 0;
    }

    function setFlap(open) {
        // Front view of a louvre swinging down: it drops, foreshortens and widens slightly.
        var s = Math.sin(open * 1.05);
        var top = 176 + 18 * s;
        var bottom = top + 22 * (1 - 0.72 * s);
        var spread = 8 * s;
        flap.setAttribute('points', [
            (54 - spread) + ',' + top, (746 + spread) + ',' + top,
            (746 + spread * 1.6) + ',' + bottom, (54 - spread * 1.6) + ',' + bottom
        ].join(' '));
    }

    function render() {
        progress = readProgress();

        var power = progress > 0.012;
        air = smoothstep(0.02, 0.3, progress);
        var cool = smoothstep(0.08, 0.78, progress);
        var temp = START_TEMP - (START_TEMP - TARGET_TEMP) * cool;

        stage.style.setProperty('--air', air.toFixed(3));
        stage.style.setProperty('--warm', (1 - cool).toFixed(3));
        stage.style.setProperty('--cool', cool.toFixed(3));
        stage.classList.toggle('is-on', power);
        stage.classList.toggle('is-scrolled', progress > 0.03);

        setFlap(air);
        acTemp.textContent = power ? TARGET_TEMP + '°' : '--';
        tempEl.textContent = temp.toFixed(1);
        stateEl.textContent = !power ? 'Hot & sticky'
            : cool < 0.92 ? 'Cooling down…'
            : 'Perfect climate ✓';

        var phase = progress < 0.34 ? 0 : progress < 0.68 ? 1 : 2;
        if (phase !== currentPhase) {
            phases[currentPhase].classList.remove('is-active');
            phases[phase].classList.add('is-active');
            currentPhase = phase;
        }

        if (!reduced && visible && !running && (air > 0.01 || particles.length)) {
            running = true;
            lastTime = performance.now();
            requestAnimationFrame(tick);
        }
    }

    function emit(count) {
        var center = ventBox.x + ventBox.w / 2;
        for (var i = 0; i < count; i++) {
            var x = ventBox.x + ventBox.w * (0.04 + Math.random() * 0.92);
            var rel = (x - center) / (ventBox.w / 2);
            var mist = Math.random() < 0.3;
            particles.push({
                x: x,
                y: ventBox.y + Math.random() * 4,
                vx: rel * (140 + 320 * air) + (Math.random() - 0.5) * 40,
                vy: 90 + 230 * air + Math.random() * 70,
                age: 0,
                life: 1.4 + Math.random() * 1.6,
                size: mist ? 3 + Math.random() * 6 : 0.7 + Math.random() * 1.3,
                mist: mist,
                wobble: Math.random() * Math.PI * 2
            });
        }
    }

    function tick(now) {
        var dt = Math.min((now - lastTime) / 1000, 0.05);
        lastTime = now;

        // Emission scales with airflow and with stage width so phones aren't flooded.
        var rate = air * (width < 700 ? 110 : 220);
        emitDebt += rate * dt;
        var n = Math.floor(emitDebt);
        emitDebt -= n;
        if (n) {
            emit(n);
        }

        ctx.clearRect(0, 0, width, height);
        ctx.lineCap = 'round';

        for (var i = particles.length - 1; i >= 0; i--) {
            var p = particles[i];
            p.age += dt;
            if (p.age >= p.life || p.y > height + 20) {
                particles.splice(i, 1);
                continue;
            }
            p.wobble += dt * 3;
            p.vx *= 0.994;
            p.vy *= 0.989;
            p.x += (p.vx + Math.sin(p.wobble) * 14) * dt;
            p.y += p.vy * dt;

            var t = p.age / p.life;
            var alpha = Math.sin(Math.PI * Math.min(t * 1.4, 1)) * (1 - t) * (0.22 + 0.3 * air);

            if (p.mist) {
                ctx.fillStyle = 'rgba(160, 218, 255,' + (alpha * 0.55).toFixed(3) + ')';
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * (1 + t * 2.5), 0, Math.PI * 2);
                ctx.fill();
            } else {
                ctx.strokeStyle = 'rgba(70, 168, 245,' + alpha.toFixed(3) + ')';
                ctx.lineWidth = p.size;
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.quadraticCurveTo(
                    p.x - p.vx * 0.05 + Math.cos(p.wobble) * 6, p.y - p.vy * 0.05,
                    p.x - p.vx * 0.11, p.y - p.vy * 0.11
                );
                ctx.stroke();
            }
        }

        if (visible && (air > 0.01 || particles.length)) {
            requestAnimationFrame(tick);
        } else {
            running = false;
            ctx.clearRect(0, 0, width, height);
        }
    }

    if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (entries) {
            visible = entries[0].isIntersecting;
            if (visible) {
                render();
            }
        }).observe(hero);
    }

    var queued = false;
    window.addEventListener('scroll', function () {
        if (!queued) {
            queued = true;
            requestAnimationFrame(function () {
                queued = false;
                render();
            });
        }
    }, {passive: true});

    window.addEventListener('resize', function () {
        resize();
        render();
    });

    if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(measureVent);
    }

    resize();
    render();
}());
