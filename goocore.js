// goocore.js – минимальный 2D-движок для платформеров
(function(window) {
    const G = 0.8, JUMP = -14, SPEED = 1.2, MAXV = 9, FRIC = 0.82;
    const T = 32, COLS = 50, ROWS = 30;
    const W = 800, H = 500;

    const config = {
        G, JUMP, SPEED, MAXV, FRIC, T, COLS, ROWS, W, H,
        bgColor1: '#0f0f2a',
        bgColor2: '#1a1a3e',
        blockColor: '#4a6fa5',
        blockHighlight: '#3a5f8f',
        playerColor1: '#2ecc71',
        playerColor2: '#1b8a4a',
        playerColorAir: '#a0ffcc',
        playerColorAir2: '#2ecc71',
        eyeWhite: '#ffffff',
        pupil: '#1a2a1a'
    };

    let world = [];
    let player = {
        x: 0, y: 0, vx: 0, vy: 0, w: 28, h: 28,
        onFloor: false,
        getState() { return this.onFloor ? 1 : 0; }
    };
    let cam = { x: 0, y: 0 };
    let keys = {};
    let mouse = { x: W/2, y: H/2 };
    let objects = [];
    let customUpdate = null;
    let customDraw = null;

    // Холст и контекст
    const canvas = document.getElementById('c') || (() => {
        const c = document.createElement('canvas');
        c.id = 'c';
        document.body.prepend(c);
        return c;
    })();
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');

    function collides(x, y, w, h) {
        const x1 = Math.floor(x / T), x2 = Math.floor((x + w - 1) / T);
        const y1 = Math.floor(y / T), y2 = Math.floor((y + h - 1) / T);
        for (let r = y1; r <= y2; r++) {
            for (let c = x1; c <= x2; c++) {
                if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return true;
                if (world[r][c] === 1) return true;
            }
        }
        return false;
    }

    function isOnFloor(p) {
        const x1 = Math.floor(p.x / T), x2 = Math.floor((p.x + p.w - 1) / T);
        const y2 = Math.floor((p.y + p.h - 1) / T);
        for (let r = y2; r <= y2; r++) {
            for (let c = x1; c <= x2; c++) {
                const below = r + 1;
                if (below < ROWS && world[below][c] === 1 &&
                    p.y + p.h >= below * T && p.y + p.h <= below * T + 6) {
                    return true;
                }
            }
        }
        return false;
    }

    function initWorld() {
        world = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
        for (let x = 0; x < COLS; x++) {
            world[ROWS - 1][x] = 1;
            world[ROWS - 2][x] = 1;
        }
    }

    function initPlayer() {
        player.x = 2 * T;
        player.y = (ROWS - 5) * T;
        player.vx = 0;
        player.vy = 0;
        player.onFloor = false;
    }

    function updatePlayer() {
        const p = player;
        let acc = 0;
        if (keys['ArrowLeft'] || keys['KeyA']) acc = -config.SPEED;
        if (keys['ArrowRight'] || keys['KeyD']) acc = config.SPEED;
        p.vx += acc;
        p.vx *= config.FRIC;
        if (Math.abs(p.vx) > config.MAXV) p.vx = config.MAXV * Math.sign(p.vx);
        if (Math.abs(p.vx) < 0.05) p.vx = 0;

        p.x += p.vx;
        if (collides(p.x, p.y, p.w, p.h)) {
            p.x -= p.vx;
            p.vx = 0;
        }

        p.vy += config.G;
        p.y += p.vy;
        if (collides(p.x, p.y, p.w, p.h)) {
            if (p.vy > 0) {
                p.y = Math.floor((p.y + p.h) / T) * T - p.h;
                p.vy = 0;
            } else if (p.vy < 0) {
                p.y = Math.floor(p.y / T) * T + T;
                p.vy = 0;
            }
        }

        p.onFloor = isOnFloor(p);

        if ((keys['Space'] || keys['KeyW'] || keys['ArrowUp']) && p.onFloor) {
            p.vy = config.JUMP;
        }

        if (p.x < 0) p.x = 0;
        if (p.x + p.w > COLS * T) p.x = COLS * T - p.w;
        if (p.y < 0) p.y = 0;
        if (p.y + p.h > ROWS * T) {
            p.y = ROWS * T - p.h;
            p.vy = 0;
        }
    }

    function updateCam() {
        cam.x = player.x - W / 2;
        cam.y = player.y - H / 2;
        cam.x = Math.max(0, Math.min(cam.x, COLS * T - W));
        cam.y = Math.max(0, Math.min(cam.y, ROWS * T - H));
    }

    function drawWorld(ox, oy) {
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                if (world[r][c] === 1) {
                    const x = c * T + ox, y = r * T + oy;
                    ctx.fillStyle = config.blockColor;
                    ctx.fillRect(x, y, T, T);
                    ctx.fillStyle = config.blockHighlight;
                    ctx.fillRect(x + 2, y + 2, T - 4, 4);
                }
            }
        }
    }

    function drawPlayer(ox, oy) {
        const p = player;
        const px = p.x + ox, py = p.y + oy;
        const cx = px + p.w / 2, cy = py + p.h / 2;
        const rad = p.w / 2;
        const onFloor = p.onFloor;

        let grad = ctx.createRadialGradient(cx - 4, cy - 4, 2, cx, cy, rad);
        if (onFloor) {
            grad.addColorStop(0, config.playerColor1);
            grad.addColorStop(1, config.playerColor2);
        } else {
            grad.addColorStop(0, config.playerColorAir);
            grad.addColorStop(1, config.playerColorAir2);
        }
        ctx.shadowColor = 'rgba(46,204,113,0.5)';
        ctx.shadowBlur = 20;
        ctx.beginPath();
        if (onFloor) {
            ctx.ellipse(cx, cy + rad * 0.2, rad * 0.9, rad * 0.7, 0, 0, Math.PI * 2);
        } else {
            ctx.ellipse(cx, cy, rad, rad * 0.9, 0, 0, Math.PI * 2);
        }
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#1a6e3a';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Глаза
        const mx = mouse.x, my = mouse.y;
        let dx = mx - (px + p.w / 2), dy = my - (py + p.h / 2);
        let dist = Math.hypot(dx, dy);
        let ang = 0;
        if (dist > 1) ang = Math.atan2(dy, dx);
        const eyeR = 5, pupilR = 2.5;
        let ex1 = cx - 4, ey1 = cy - 4, ex2 = cx + 4, ey2 = cy - 4;
        if (dist > 1) {
            const maxOff = 3;
            const offX = Math.cos(ang) * maxOff, offY = Math.sin(ang) * maxOff;
            ex1 += offX; ey1 += offY;
            ex2 += offX; ey2 += offY;
        }
        ctx.fillStyle = config.eyeWhite;
        ctx.beginPath();
        ctx.arc(ex1, ey1, eyeR, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(ex2, ey2, eyeR, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = config.pupil;
        let pOffX = 0, pOffY = 0;
        if (dist > 1) {
            pOffX = Math.cos(ang) * 1.5;
            pOffY = Math.sin(ang) * 1.5;
        }
        ctx.beginPath();
        ctx.arc(ex1 + pOffX, ey1 + pOffY, pupilR, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(ex2 + pOffX, ey2 + pOffY, pupilR, 0, Math.PI * 2);
        ctx.fill();
    }

    function update() {
        if (customUpdate) {
            customUpdate();
        } else {
            updatePlayer();
            updateCam();
            for (let obj of objects) {
                if (obj.update) obj.update();
            }
        }
    }

    function draw() {
        const ox = -cam.x, oy = -cam.y;
        // Фон
        const grad = ctx.createRadialGradient(W/2, H/2, 100, W/2, H/2, 700);
        grad.addColorStop(0, config.bgColor2);
        grad.addColorStop(1, config.bgColor1);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);

        if (customDraw) {
            customDraw(ctx, ox, oy);
        } else {
            drawWorld(ox, oy);
            drawPlayer(ox, oy);
            for (let obj of objects) {
                if (obj.draw) obj.draw(ctx, ox, oy);
            }
        }
    }

    function loop() {
        update();
        draw();
        requestAnimationFrame(loop);
    }

    const GooCore = {
        config: config,
        world: world,
        player: player,
        cam: cam,
        keys: keys,
        mouse: mouse,
        objects: objects,
        canvas: canvas,
        ctx: ctx,

        init: function() {
            initWorld();
            initPlayer();
            cam.x = 0; cam.y = 0;
            objects.length = 0;
            customUpdate = null;
            customDraw = null;
        },

        start: function() {
            this.init();
            loop();
        },

        registerObject: function(obj) {
            objects.push(obj);
        },

        setCustomUpdate: function(fn) {
            customUpdate = fn;
        },

        setCustomDraw: function(fn) {
            customDraw = fn;
        },

        createObject: function() {
            return {
                x: 0, y: 0, w: 28, h: 28,
                vx: 0, vy: 0,
                update: null,
                draw: null
            };
        },

        collides: collides,
        isOnFloor: isOnFloor
    };

    window.GooCore = GooCore;

    // Обработчики ввода
    document.addEventListener('keydown', e => { GooCore.keys[e.code] = true; });
    document.addEventListener('keyup', e => { GooCore.keys[e.code] = false; });

    canvas.addEventListener('mousemove', function(e) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        GooCore.mouse.x = (e.clientX - rect.left) * scaleX;
        GooCore.mouse.y = (e.clientY - rect.top) * scaleY;
    });
    canvas.addEventListener('mouseleave', function() {
        GooCore.mouse.x = GooCore.player.x + GooCore.player.w / 2;
        GooCore.mouse.y = GooCore.player.y + GooCore.player.h / 2;
    });

})(window);
