// goocore.js – чистая библиотека для 2D-платформеров (без демо)
(function(window) {
    // ===== КОНФИГУРАЦИЯ =====
    const CONFIG = {
        G: 0.8, JUMP: -14, SPEED: 1.2, MAXV: 9, FRIC: 0.82,
        T: 32, COLS: 50, ROWS: 30, W: 800, H: 500
    };

    // ===== СОСТОЯНИЕ =====
    let world = [];
    let player = { x: 0, y: 0, vx: 0, vy: 0, w: 28, h: 28, onFloor: false };
    let cam = { x: 0, y: 0 };
    let keys = {};
    let mouse = { x: CONFIG.W / 2, y: CONFIG.H / 2 };
    let objects = [];
    let canvas = null;
    let ctx = null;

    // ===== ХОЛСТ (создаётся только при вызове initCanvas) =====
    function initCanvas(id) {
        canvas = document.getElementById(id) || (() => {
            const c = document.createElement('canvas');
            c.id = id || 'c';
            document.body.prepend(c);
            return c;
        })();
        canvas.width = CONFIG.W;
        canvas.height = CONFIG.H;
        ctx = canvas.getContext('2d');
        return canvas;
    }

    // ===== ФИЗИКА =====
    function collides(x, y, w, h) {
        const x1 = Math.floor(x / CONFIG.T), x2 = Math.floor((x + w - 1) / CONFIG.T);
        const y1 = Math.floor(y / CONFIG.T), y2 = Math.floor((y + h - 1) / CONFIG.T);
        for (let r = y1; r <= y2; r++) {
            for (let c = x1; c <= x2; c++) {
                if (r < 0 || r >= CONFIG.ROWS || c < 0 || c >= CONFIG.COLS) return true;
                if (world[r] && world[r][c] === 1) return true;
            }
        }
        return false;
    }

    function isOnFloor(p) {
        const x1 = Math.floor(p.x / CONFIG.T), x2 = Math.floor((p.x + p.w - 1) / CONFIG.T);
        const y2 = Math.floor((p.y + p.h - 1) / CONFIG.T);
        for (let r = y2; r <= y2; r++) {
            for (let c = x1; c <= x2; c++) {
                const below = r + 1;
                if (below < CONFIG.ROWS && world[below] && world[below][c] === 1 &&
                    p.y + p.h >= below * CONFIG.T && p.y + p.h <= below * CONFIG.T + 6) {
                    return true;
                }
            }
        }
        return false;
    }

    // ===== УПРАВЛЕНИЕ МИРОМ =====
    function createWorld(rows, cols) {
        const r = rows || CONFIG.ROWS;
        const c = cols || CONFIG.COLS;
        world = Array.from({ length: r }, () => Array(c).fill(0));
        CONFIG.ROWS = r;
        CONFIG.COLS = c;
        return world;
    }

    function setBlock(row, col, value) {
        if (row >= 0 && row < CONFIG.ROWS && col >= 0 && col < CONFIG.COLS) {
            world[row][col] = value || 1;
        }
    }

    function getBlock(row, col) {
        if (row >= 0 && row < CONFIG.ROWS && col >= 0 && col < CONFIG.COLS) {
            return world[row][col];
        }
        return 0;
    }

    // ===== ИГРОК =====
    function setPlayer(x, y) {
        player.x = x;
        player.y = y;
        player.vx = 0;
        player.vy = 0;
        player.onFloor = false;
    }

    function updatePlayer() {
        const p = player;
        let acc = 0;
        if (keys['ArrowLeft'] || keys['KeyA']) acc = -CONFIG.SPEED;
        if (keys['ArrowRight'] || keys['KeyD']) acc = CONFIG.SPEED;
        p.vx += acc;
        p.vx *= CONFIG.FRIC;
        if (Math.abs(p.vx) > CONFIG.MAXV) p.vx = CONFIG.MAXV * Math.sign(p.vx);
        if (Math.abs(p.vx) < 0.05) p.vx = 0;

        p.x += p.vx;
        if (collides(p.x, p.y, p.w, p.h)) {
            p.x -= p.vx;
            p.vx = 0;
        }

        p.vy += CONFIG.G;
        p.y += p.vy;
        if (collides(p.x, p.y, p.w, p.h)) {
            if (p.vy > 0) {
                p.y = Math.floor((p.y + p.h) / CONFIG.T) * CONFIG.T - p.h;
                p.vy = 0;
            } else if (p.vy < 0) {
                p.y = Math.floor(p.y / CONFIG.T) * CONFIG.T + CONFIG.T;
                p.vy = 0;
            }
        }

        p.onFloor = isOnFloor(p);

        if ((keys['Space'] || keys['KeyW'] || keys['ArrowUp']) && p.onFloor) {
            p.vy = CONFIG.JUMP;
        }

        if (p.x < 0) p.x = 0;
        if (p.x + p.w > CONFIG.COLS * CONFIG.T) p.x = CONFIG.COLS * CONFIG.T - p.w;
        if (p.y < 0) p.y = 0;
        if (p.y + p.h > CONFIG.ROWS * CONFIG.T) {
            p.y = CONFIG.ROWS * CONFIG.T - p.h;
            p.vy = 0;
        }
    }

    // ===== КАМЕРА =====
    function updateCam() {
        cam.x = player.x - CONFIG.W / 2;
        cam.y = player.y - CONFIG.H / 2;
        cam.x = Math.max(0, Math.min(cam.x, CONFIG.COLS * CONFIG.T - CONFIG.W));
        cam.y = Math.max(0, Math.min(cam.y, CONFIG.ROWS * CONFIG.T - CONFIG.H));
    }

    // ===== ОБЪЕКТЫ =====
    function createObject() {
        return { x: 0, y: 0, w: 28, h: 28, vx: 0, vy: 0, update: null, draw: null };
    }

    function registerObject(obj) {
        objects.push(obj);
    }

    // ===== ОТРИСОВКА =====
    function drawWorld(ox, oy) {
        if (!ctx) return;
        for (let r = 0; r < CONFIG.ROWS; r++) {
            for (let c = 0; c < CONFIG.COLS; c++) {
                if (world[r] && world[r][c] === 1) {
                    const x = c * CONFIG.T + ox, y = r * CONFIG.T + oy;
                    ctx.fillStyle = '#4a6fa5';
                    ctx.fillRect(x, y, CONFIG.T, CONFIG.T);
                    ctx.fillStyle = '#3a5f8f';
                    ctx.fillRect(x + 2, y + 2, CONFIG.T - 4, 4);
                }
            }
        }
    }

    function drawPlayer(ox, oy) {
        if (!ctx) return;
        const p = player;
        const px = p.x + ox, py = p.y + oy;
        const cx = px + p.w / 2, cy = py + p.h / 2;
        const rad = p.w / 2;
        const onFloor = p.onFloor;

        const grad = ctx.createRadialGradient(cx - 4, cy - 4, 2, cx, cy, rad);
        if (onFloor) {
            grad.addColorStop(0, '#2ecc71');
            grad.addColorStop(1, '#1b8a4a');
        } else {
            grad.addColorStop(0, '#a0ffcc');
            grad.addColorStop(1, '#2ecc71');
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

        // Глаза (следят за курсором)
        const mx = mouse.x, my = mouse.y;
        let dx = mx - (px + p.w / 2), dy = my - (py + p.h / 2);
        const dist = Math.hypot(dx, dy);
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

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(ex1, ey1, eyeR, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(ex2, ey2, eyeR, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#1a2a1a';
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

    function drawBackground() {
        if (!ctx) return;
        const grad = ctx.createRadialGradient(CONFIG.W / 2, CONFIG.H / 2, 100, CONFIG.W / 2, CONFIG.H / 2, 700);
        grad.addColorStop(0, '#1a1a3e');
        grad.addColorStop(1, '#0f0f2a');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, CONFIG.W, CONFIG.H);
    }

    // ===== ОСНОВНОЙ ЦИКЛ (вы вызываете его сами) =====
    function update() {
        updatePlayer();
        updateCam();
        for (let obj of objects) {
            if (obj.update) obj.update();
        }
    }

    function draw() {
        if (!ctx) return;
        const ox = -cam.x, oy = -cam.y;
        drawBackground();
        drawWorld(ox, oy);
        drawPlayer(ox, oy);
        for (let obj of objects) {
            if (obj.draw) obj.draw(ctx, ox, oy);
        }
    }

    // ===== ПУБЛИЧНОЕ API =====
    const GooCore = {
        // Конфигурация (можно менять)
        config: CONFIG,

        // Данные
        world: world,
        player: player,
        cam: cam,
        keys: keys,
        mouse: mouse,
        objects: objects,
        canvas: canvas,
        ctx: ctx,

        // Холст
        initCanvas: initCanvas,

        // Мир
        createWorld: createWorld,
        setBlock: setBlock,
        getBlock: getBlock,

        // Игрок
        setPlayer: setPlayer,
        updatePlayer: updatePlayer,

        // Камера
        updateCam: updateCam,

        // Объекты
        createObject: createObject,
        registerObject: registerObject,

        // Отрисовка
        drawBackground: drawBackground,
        drawWorld: drawWorld,
        drawPlayer: drawPlayer,
        draw: draw,

        // Физика
        update: update,
        collides: collides,
        isOnFloor: isOnFloor,

        // Размеры
        T: CONFIG.T,
        COLS: CONFIG.COLS,
        ROWS: CONFIG.ROWS,
        W: CONFIG.W,
        H: CONFIG.H
    };

    window.GooCore = GooCore;

    // ===== ВВОД (подключается автоматически) =====
    document.addEventListener('keydown', e => { GooCore.keys[e.code] = true; });
    document.addEventListener('keyup', e => { GooCore.keys[e.code] = false; });

    // Обработчики мыши добавляются после создания холста
    // Их нужно вызывать вручную или они будут добавлены при initCanvas
    const origInitCanvas = initCanvas;
    GooCore.initCanvas = function(id) {
        const c = origInitCanvas(id);
        c.addEventListener('mousemove', function(e) {
            const rect = c.getBoundingClientRect();
            const scaleX = c.width / rect.width;
            const scaleY = c.height / rect.height;
            GooCore.mouse.x = (e.clientX - rect.left) * scaleX;
            GooCore.mouse.y = (e.clientY - rect.top) * scaleY;
        });
        c.addEventListener('mouseleave', function() {
            GooCore.mouse.x = GooCore.player.x + GooCore.player.w / 2;
            GooCore.mouse.y = GooCore.player.y + GooCore.player.h / 2;
        });
        return c;
    };

})(window);
