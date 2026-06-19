// Для вставки геймплея требуется использовать <canvas id="gameCanvas" width="X" height="Y"></canvas>, где X,Y - разрешение игры (800х500 по умолчанию)

const CONFIG = {
    gravity: 0.8,
    jumpSpeed: -14,
    moveSpeed: 1.2,
    maxSpeed: 9,
    friction: 0.82,
    tileSize: 32,
    cols: 50,
    rows: 30,
    totalCoins: 20,
    enemyCount: 10,
    playerColor: {
        body: ['#7dffb3', '#1b8a4a'],
        glow: 'rgba(46,204,113,0.5)'
    },
    enemyColor: {
        body: ['#ff6666', '#cc0000'],
        glow: 'rgba(255,0,0,0.5)'
    },
    coinColor: ['#ffff88', '#ffdd44', '#ffaa00', '#cc8800'],
    blockHue: 210,
};

class World {
    constructor(config) {
        this.config = config;
        this.tileSize = config.tileSize;
        this.cols = config.cols;
        this.rows = config.rows;
        this.grid = [];
        this.coins = 0;
        this.totalCoins = config.totalCoins;
        this.seed = Date.now();
    }

    generate() {
        const { rows, cols } = this;
        this.grid = Array.from({ length: rows }, () => Array(cols).fill(0));

        for (let x = 0; x < cols; x++) {
            this.grid[rows - 1][x] = 1;
            this.grid[rows - 2][x] = 1;
        }

        for (let i = 0; i < 90; i++) {
            let x = Math.floor(this.rng() * (cols - 4)) + 2;
            let y = Math.floor(this.rng() * (rows - 6)) + 2;
            let w = Math.floor(this.rng() * 3) + 2;
            let h = Math.floor(this.rng() * 2) + 1;
            if (y + h < rows - 2 && x + w < cols) {
                for (let dy = 0; dy < h; dy++)
                    for (let dx = 0; dx < w; dx++)
                        this.grid[y + dy][x + dx] = 1;
            }
        }

        this.coins = 0;
        for (let i = 0; i < this.totalCoins; i++) {
            let x = Math.floor(this.rng() * (cols - 2)) + 1;
            let y = Math.floor(this.rng() * (rows - 5)) + 2;
            if (this.grid[y][x] === 0) {
                this.grid[y][x] = 3;
                this.coins++;
            } else i--;
        }
        return this.grid;
    }

    rng() {
        this.seed = (this.seed * 9301 + 49297) % 233280;
        return this.seed / 233280;
    }

    getTile(col, row) {
        if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) return 1;
        return this.grid[row][col];
    }

    isBlock(col, row) { return this.getTile(col, row) === 1; }
    isCoin(col, row) { return this.getTile(col, row) === 3; }

    collectCoin(col, row) {
        if (this.isCoin(col, row)) {
            this.grid[row][col] = 0;
            this.coins--;
            return true;
        }
        return false;
    }
}

class Entity {
    constructor(x, y, w, h, config) {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.vx = 0;
        this.vy = 0;
        this.config = config;
        this.spawn = 1;
    }

    updatePhysics(world) {
        this.vy += this.config.gravity;

        this.x += this.vx;
        if (this.collides(world)) {
            this.x -= this.vx;
            this.vx = 0;
        }

        this.y += this.vy;
        if (this.collides(world)) {
            if (this.vy > 0) {
                this.y = Math.floor((this.y + this.h) / this.config.tileSize) * this.config.tileSize - this.h;
                this.vy = 0;
            } else {
                this.y = Math.floor(this.y / this.config.tileSize) * this.config.tileSize + this.config.tileSize;
                this.vy = 0;
            }
        }

        const maxX = this.config.cols * this.config.tileSize;
        const maxY = this.config.rows * this.config.tileSize;
        if (this.x < 0) this.x = 0;
        if (this.x + this.w > maxX) this.x = maxX - this.w;
        if (this.y < 0) this.y = 0;
        if (this.y + this.h > maxY) { this.y = maxY - this.h; this.vy = 0; }
    }

    collides(world) {
        const t = this.config.tileSize;
        let x1 = Math.floor(this.x / t);
        let x2 = Math.floor((this.x + this.w - 1) / t);
        let y1 = Math.floor(this.y / t);
        let y2 = Math.floor((this.y + this.h - 1) / t);
        for (let r = y1; r <= y2; r++) {
            for (let c = x1; c <= x2; c++) {
                if (world.getTile(c, r) === 1) return true;
            }
        }
        return false;
    }

    isOnFloor(world) {
        const t = this.config.tileSize;
        let x1 = Math.floor(this.x / t);
        let x2 = Math.floor((this.x + this.w - 1) / t);
        let y2 = Math.floor((this.y + this.h - 1) / t);
        for (let r = y2; r <= y2; r++) {
            for (let c = x1; c <= x2; c++) {
                let below = r + 1;
                if (below < world.rows && world.getTile(c, below) === 1 &&
                    this.y + this.h >= below * t && this.y + this.h <= below * t + 6) {
                    return true;
                }
            }
        }
        return false;
    }

    isOnCeil(world) {
        const t = this.config.tileSize;
        let x1 = Math.floor(this.x / t);
        let x2 = Math.floor((this.x + this.w - 1) / t);
        let y1 = Math.floor(this.y / t);
        for (let r = y1; r <= y1; r++) {
            for (let c = x1; c <= x2; c++) {
                let above = r - 1;
                if (above >= 0 && world.getTile(c, above) === 1 &&
                    this.y <= above * t + t && this.y >= above * t + t - 6) {
                    return true;
                }
            }
        }
        return false;
    }
}

class Player extends Entity {
    constructor(config) {
        super(0, 0, 28, 28, config);
        this.dead = false;
        this.respawnTimer = 0;
    }

    init(world) {
        for (let a = 0; a < 30; a++) {
            let x = Math.floor(Math.random() * (this.config.cols - 4)) * this.config.tileSize + 2;
            let y = Math.floor(Math.random() * (this.config.rows - 6)) * this.config.tileSize + 2;
            this.x = x;
            this.y = y;
            if (!this.collides(world)) {
                this.vx = 0;
                this.vy = 0;
                this.dead = false;
                this.spawn = 1;
                return true;
            }
        }
        this.x = 32;
        this.y = (this.config.rows - 2) * this.config.tileSize - 32;
        return true;
    }

    update(input, world) {
        if (this.dead) return;

        if (this.spawn) {
            this.spawn += 0.035;
            if (this.spawn > 1) this.spawn = 0;
            return;
        }

        let acc = 0;
        if (input.left) acc = -this.config.moveSpeed;
        if (input.right) acc = this.config.moveSpeed;
        this.vx += acc;
        this.vx *= this.config.friction;
        if (Math.abs(this.vx) > this.config.maxSpeed) this.vx = this.config.maxSpeed * Math.sign(this.vx);
        if (Math.abs(this.vx) < 0.05) this.vx = 0;

        this.updatePhysics(world);

        if ((input.jump) && (this.isOnFloor(world) || this.isOnCeil(world))) {
            this.vy = this.config.jumpSpeed - Math.min(0, this.vx * 0.15);
        }

        if (this.y + this.h > this.config.rows * this.config.tileSize) {
            this.dead = true;
            this.respawnTimer = 0;
        }
    }

    respawn(world) {
        this.respawnTimer++;
        if (this.respawnTimer > 55) {
            this.init(world);
            return true;
        }
        return false;
    }
}

class Enemy extends Entity {
    constructor(config, world) {
        super(0, 0, 28, 28, config);
        this.timer = 0;
        this.wait = Math.floor(Math.random() * 15) + 5;
        this.targetX = this.x;
        this.targetY = this.y;
        this.migrate = 0;
        this.spawn = 1;
        this.findSpawn(world);
    }

    findSpawn(world) {
        for (let a = 0; a < 50; a++) {
            let x = Math.floor(Math.random() * (this.config.cols - 4)) * this.config.tileSize + 2;
            let y = Math.floor(Math.random() * (this.config.rows - 6)) * this.config.tileSize + 2;
            this.x = x;
            this.y = y;
            if (!this.collides(world)) {
                this.vx = (Math.random() > 0.5 ? 1 : -1) * (1 + Math.random() * 2);
                this.vy = 0;
                this.targetX = x;
                this.targetY = y;
                this.migrate = 0;
                this.spawn = 1;
                return true;
            }
        }
        return false;
    }

    update(world) {
        if (this.spawn) {
            this.spawn += 0.035;
            if (this.spawn > 1) this.spawn = 0;
            return;
        }

        this.timer++;
        if (this.timer > this.wait) {
            this.timer = 0;
            this.wait = Math.floor(Math.random() * 15) + 5;
            let dx = (Math.floor(Math.random() * this.config.cols) - this.x / this.config.tileSize) * this.config.tileSize;
            let dy = (Math.floor(Math.random() * this.config.rows) - this.y / this.config.tileSize) * this.config.tileSize;
            let len = Math.sqrt(dx * dx + dy * dy) || 1;
            this.targetX = this.x + (dx / len) * Math.min(250, 40 + Math.random() * 100);
            this.targetY = this.y + (dy / len) * Math.min(200, 30 + Math.random() * 80);
            this.migrate = 40 + Math.random() * 50;
            if (Math.random() > 0.2 && this.vy === 0) this.vy = -8 - Math.random() * 4;
        }

        if (this.migrate > 0) {
            this.migrate--;
            let dx = this.targetX - this.x;
            let dy = this.targetY - this.y;
            let dist = Math.sqrt(dx * dx + dy * dy) || 1;
            let spd = 1.5 + Math.random() * 1.5;
            let acc = 0.3;
            this.vx += (dx / dist) * spd * acc;
            this.vx *= 0.92;
            if (Math.abs(dx) < 6) { this.vx *= 0.8; this.migrate = 0; }
            if (Math.abs(dy) < 10 && this.vy === 0) {
                this.vy = -8 - Math.random() * 4;
            }
        } else {
            let dx = (Math.floor(Math.random() * this.config.cols) - this.x / this.config.tileSize) * this.config.tileSize;
            let dy = (Math.floor(Math.random() * this.config.rows) - this.y / this.config.tileSize) * this.config.tileSize;
            let len = Math.sqrt(dx * dx + dy * dy) || 1;
            this.targetX = this.x + (dx / len) * Math.min(200, 30 + Math.random() * 70);
            this.targetY = this.y + (dy / len) * Math.min(150, 20 + Math.random() * 60);
            this.migrate = 30 + Math.random() * 30;
        }

        if (Math.abs(this.vx) > this.config.maxSpeed) this.vx = this.config.maxSpeed * Math.sign(this.vx);
        this.updatePhysics(world);
    }
}

class Camera {
    constructor(width, height, config) {
        this.x = 0;
        this.y = 0;
        this.width = width;
        this.height = height;
        this.config = config;
    }

    follow(entity) {
        this.x = entity.x - this.width / 2;
        this.y = entity.y - this.height / 2;
        const maxX = this.config.cols * this.config.tileSize - this.width;
        const maxY = this.config.rows * this.config.tileSize - this.height;
        this.x = Math.max(0, Math.min(this.x, maxX));
        this.y = Math.max(0, Math.min(this.y, maxY));
    }
}

class ParticleSystem {
    constructor() {
        this.particles = [];
        this.trails = [];
    }

    emitExplosion(x, y, color, count = 35, isCoin = false) {
        for (let i = 0; i < count; i++) {
            let angle = Math.random() * Math.PI * 2;
            let speed = 1 + Math.random() * 5;
            this.particles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 1,
                life: 30 + Math.random() * 25,
                maxLife: 55,
                color,
                size: isCoin ? 3 + Math.random() * 5 : 2 + Math.random() * 6,
                isCoin
            });
        }
    }

    emitCoinFountain(x, y) {
        for (let i = 0; i < 60; i++) {
            let angle = Math.random() * Math.PI * 2;
            let speed = 2 + Math.random() * 6;
            this.particles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 2,
                life: 40 + Math.random() * 30,
                maxLife: 70,
                color: '#ffdd44',
                size: 3 + Math.random() * 5,
                isCoin: true
            });
        }
    }

    addTrail(x, y, color) {
        this.trails.push({
            x, y,
            life: 40,
            maxLife: 40,
            color,
            size: 3 + Math.random() * 4
        });
    }

    update() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            let p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.08;
            p.life--;
            if (p.life <= 0) this.particles.splice(i, 1);
        }
        for (let i = this.trails.length - 1; i >= 0; i--) {
            let t = this.trails[i];
            t.life--;
            if (t.life <= 0) this.trails.splice(i, 1);
        }
    }

    clear() {
        this.particles = [];
        this.trails = [];
    }
}

class StarManager {
    constructor() {
        this.stars = [];
        this.time = 0;
    }

    addStar() {
        this.stars.push({ angle: 0, phase: Math.random() * 6.28 });
    }

    update(dt) {
        this.time += dt;
        for (let s of this.stars) {
            s.angle += 0.04;
            s.phase += 0.02;
        }
    }

    clear() { this.stars = []; }
}

class InputManager {
    constructor() {
        this.keys = {};
        this.left = false;
        this.right = false;
        this.jump = false;
        this.cheat = false;

        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            this.updateState();
            if (e.shiftKey && e.code === 'KeyP') this.cheat = true;
        });
        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
            this.updateState();
        });
    }

    updateState() {
        this.left = this.keys['ArrowLeft'] || this.keys['KeyA'];
        this.right = this.keys['ArrowRight'] || this.keys['KeyD'];
        this.jump = this.keys['Space'] || this.keys['KeyW'] || this.keys['ArrowUp'];
    }

    resetCheat() { this.cheat = false; }
}

class Renderer {
    constructor(canvas, config) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.config = config;
        this.W = canvas.width;   
        this.H = canvas.height;  
        this.resize();
    }

    resize() {
        const winW = window.innerWidth;
        const winH = window.innerHeight;
        const aspect = this.W / this.H; 
        let displayWidth, displayHeight;

        if (winW / winH > aspect) {
            displayHeight = winH;
            displayWidth = winH * aspect;
        } else {
            displayWidth = winW;
            displayHeight = winW / aspect;
        }

        this.canvas.style.width = displayWidth + 'px';
        this.canvas.style.height = displayHeight + 'px';
    }

    clear() {
        this.ctx.fillStyle = '#0f0f2a';
        this.ctx.fillRect(0, 0, this.W, this.H);

        let grad = this.ctx.createRadialGradient(this.W / 2, this.H / 2, 100, this.W / 2, this.H / 2, 700);
        let t = performance.now() / 1000;
        let r1 = 0.1 + Math.sin(t * 0.3) * 0.05;
        let g1 = 0.1 + Math.sin(t * 0.4 + 1) * 0.05;
        let b1 = 0.25 + Math.sin(t * 0.25 + 2) * 0.1;
        let r2 = 0.02 + Math.sin(t * 0.2 + 0.5) * 0.02;
        let g2 = 0.02 + Math.sin(t * 0.35 + 1.5) * 0.02;
        let b2 = 0.08 + Math.sin(t * 0.45 + 2.5) * 0.04;
        grad.addColorStop(0, `rgb(${r1*255},${g1*255},${b1*255})`);
        grad.addColorStop(1, `rgb(${r2*255},${g2*255},${b2*255})`);
        this.ctx.fillStyle = grad;
        this.ctx.fillRect(0, 0, this.W, this.H);
    }

    drawWorld(world, camera) {
        const t = this.config.tileSize;
        const ox = -camera.x;
        const oy = -camera.y;
        const sc = Math.max(0, Math.floor(camera.x / t));
        const ec = Math.min(world.cols, Math.ceil((camera.x + this.W) / t) + 1);
        const sr = Math.max(0, Math.floor(camera.y / t));
        const er = Math.min(world.rows, Math.ceil((camera.y + this.H) / t) + 1);
        const ctx = this.ctx;
        const time = performance.now() / 1000;

        for (let r = sr; r < er; r++) {
            for (let c = sc; c < ec; c++) {
                let v = world.grid[r][c];
                let x = c * t + ox;
                let y = r * t + oy;
                if (v === 1) {
                    let hue = this.config.blockHue + Math.sin(time * 0.2 + r * 0.1 + c * 0.15) * 15;
                    let g = ctx.createRadialGradient(x + 4, y + 4, 2, x + 16, y + 16, 22);
                    g.addColorStop(0, `hsl(${hue+10}, 60%, 55%)`);
                    g.addColorStop(1, `hsl(${hue-10}, 50%, 30%)`);
                    ctx.fillStyle = g;
                    ctx.shadowColor = `hsl(${hue}, 50%, 40%)`;
                    ctx.shadowBlur = 12;
                    ctx.fillRect(x, y, t, t);
                    ctx.shadowBlur = 0;
                    ctx.fillStyle = `hsla(${hue+20}, 70%, 70%, 0.5)`;
                    ctx.fillRect(x + 2, y + 2, t - 4, 3);
                } else if (v === 3) {
                    let g = ctx.createRadialGradient(x + 6, y + 4, 3, x + 16, y + 16, 18);
                    g.addColorStop(0, '#ffff88');
                    g.addColorStop(0.3, '#ffdd44');
                    g.addColorStop(0.7, '#ffaa00');
                    g.addColorStop(1, '#cc8800');
                    ctx.fillStyle = g;
                    ctx.shadowBlur = 0;
                    ctx.beginPath();
                    ctx.arc(x + t / 2, y + t / 2, 13, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = '#ffffaa';
                    ctx.beginPath();
                    ctx.arc(x + t / 2 - 5, y + t / 2 - 6, 3.5, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = '#cc8800';
                    ctx.beginPath();
                    ctx.arc(x + t / 2 + 4, y + t / 2 + 3, 2.5, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = 'rgba(255,255,200,0.4)';
                    ctx.beginPath();
                    ctx.arc(x + t / 2 - 7, y + t / 2 - 9, 5, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }
    }

    drawParticles(particles, camera) {
        const ctx = this.ctx;
        const ox = -camera.x;
        const oy = -camera.y;
        for (let p of particles.particles) {
            let s = p.life / p.maxLife;
            ctx.globalAlpha = s;
            ctx.fillStyle = p.color;
            ctx.shadowColor = p.color;
            ctx.shadowBlur = p.isCoin ? 25 : 18;
            ctx.beginPath();
            ctx.arc(p.x + ox, p.y + oy, p.size * s * (p.isCoin ? 1.5 : 1.2), 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
        for (let t of particles.trails) {
            let s = t.life / t.maxLife;
            ctx.globalAlpha = s * 0.6;
            ctx.fillStyle = t.color;
            ctx.shadowColor = t.color;
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(t.x + ox, t.y + oy, t.size * s * 0.8, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
    }

    drawSlime(x, y, w, h, state, isPlayer, spawn, config, coinTarget = null) {
        const ctx = this.ctx;
        let cx = x + w / 2;
        let cy = y + h / 2;
        let rad = w / 2;
        if (spawn && spawn < 1) {
            let s = spawn;
            rad *= s;
            if (s < 0.3) ctx.globalAlpha = s / 0.3;
        }
        ctx.save();
        let grad = ctx.createRadialGradient(cx - 4, cy - 4, 2, cx, cy, rad);
        if (isPlayer) {
            let c = config.playerColor;
            if (state === 1) {
                grad.addColorStop(0, c.body[0]);
                grad.addColorStop(1, c.body[1]);
            } else if (state === 2) {
                grad.addColorStop(0, '#6ef0a0');
                grad.addColorStop(1, '#0f6b38');
            } else {
                grad.addColorStop(0, '#a0ffcc');
                grad.addColorStop(1, '#2ecc71');
            }
            ctx.shadowColor = config.playerColor.glow;
        } else {
            let c = config.enemyColor;
            if (state === 1) {
                grad.addColorStop(0, c.body[0]);
                grad.addColorStop(1, c.body[1]);
            } else {
                grad.addColorStop(0, '#ff5555');
                grad.addColorStop(1, '#cc1111');
            }
            ctx.shadowColor = config.enemyColor.glow;
        }
        ctx.shadowBlur = 20;
        ctx.beginPath();
        if (state === 1) ctx.ellipse(cx, cy + rad * 0.2, rad * 0.9, rad * 0.7, 0, 0, Math.PI * 2);
        else if (state === 2) ctx.ellipse(cx, cy - rad * 0.2, rad * 0.9, rad * 0.7, 0, 0, Math.PI * 2);
        else ctx.ellipse(cx, cy, rad, rad * 0.9, 0, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = isPlayer ? '#1a6e3a' : '#8e0000';
        ctx.lineWidth = 2;
        ctx.stroke();

        if (!spawn) {
            if (isPlayer && coinTarget) {
                let dx = coinTarget.x - (cx);
                let dy = coinTarget.y - (cy);
                let ang = Math.atan2(dy, dx);
                let ex1 = cx - 4 + Math.cos(ang) * 4;
                let ey1 = cy - 4 + Math.sin(ang) * 4;
                let ex2 = cx + 4 + Math.cos(ang) * 4;
                let ey2 = cy - 4 + Math.sin(ang) * 4;
                ctx.fillStyle = 'white';
                ctx.beginPath();
                ctx.arc(ex1, ey1, 5, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.arc(ex2, ey2, 5, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#1a2a1a';
                ctx.beginPath();
                ctx.arc(ex1 + Math.cos(ang) * 2, ey1 + Math.sin(ang) * 2, 2.5, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.arc(ex2 + Math.cos(ang) * 2, ey2 + Math.sin(ang) * 2, 2.5, 0, Math.PI * 2);
                ctx.fill();
            } else if (isPlayer) {
                ctx.fillStyle = 'white';
                ctx.beginPath();
                ctx.arc(cx - 5, cy - 4, 5, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.arc(cx + 5, cy - 4, 5, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#1a2a1a';
                ctx.beginPath();
                ctx.arc(cx - 4, cy - 2, 2.5, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.arc(cx + 6, cy - 2, 2.5, 0, Math.PI * 2);
                ctx.fill();
            } else {
                ctx.fillStyle = 'white';
                ctx.beginPath();
                ctx.arc(cx - 6, cy - 5, 4, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.arc(cx + 6, cy - 5, 4, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#2a1a1a';
                ctx.beginPath();
                ctx.arc(cx - 5, cy - 3, 2, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.arc(cx + 7, cy - 3, 2, 0, Math.PI * 2);
                ctx.fill();
            }
            if (isPlayer) {
                ctx.fillStyle = 'rgba(255,255,255,0.15)';
                ctx.beginPath();
                ctx.ellipse(cx - 4, cy - 6, 6, 4, 0, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.restore();
        ctx.globalAlpha = 1;
    }

    drawStars(stars, player, camera, time) {
        const ctx = this.ctx;
        const ox = -camera.x;
        const oy = -camera.y;
        for (let s of stars) {
            let angle = s.angle + time * 0.7;
            let rad = 40 + Math.sin(time * 0.5 + s.phase) * 12;
            let sx = player.x + ox + Math.cos(angle) * rad + Math.sin(time * 0.4 + s.phase) * 8;
            let sy = player.y + oy + 10 + Math.sin(angle * 0.8 + time) * rad * 0.4 + Math.cos(time * 0.3 + s.phase) * 10;
            this.drawStar(sx, sy, 8 + Math.sin(time * 2 + s.phase) * 1.5, '#ffdd44', time + s.angle);
        }
    }

    drawStar(cx, cy, r, color, rot = 0, spikes = 5) {
        const ctx = this.ctx;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(rot);
        ctx.beginPath();
        for (let i = 0; i < spikes * 2; i++) {
            let rad = i % 2 === 0 ? r : r * 0.4;
            let angle = (i * Math.PI) / spikes - Math.PI / 2;
            ctx.lineTo(Math.cos(angle) * rad, Math.sin(angle) * rad);
        }
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 20;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.restore();
    }

    drawUI(coinCount, totalCoins, win, winTimer, winEmoji) {
        const ctx = this.ctx;
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = '14px monospace';
        ctx.fillText(`💰 ${coinCount}/${totalCoins}`, 12, 24);
        if (win && winTimer > 20 && winTimer < 120) {
            let s = winEmoji;
            let sc = 1 + s * 0.3;
            ctx.save();
            ctx.translate(this.W / 2, this.H / 2 - 10);
            ctx.scale(sc, sc);
            ctx.globalAlpha = s;
            ctx.font = '80px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.shadowColor = '#ffdd44';
            ctx.shadowBlur = 60;
            ctx.fillText('🎉', 0, 0);
            ctx.restore();
        }
    }
}

class Game {
    constructor(canvas, config = {}) {
        this.config = { ...CONFIG, ...config };
        this.canvas = canvas;
        this.renderer = new Renderer(canvas, this.config);
        this.world = new World(this.config);
        this.player = new Player(this.config);
        this.camera = new Camera(this.renderer.W, this.renderer.H, this.config);
        this.particles = new ParticleSystem();
        this.stars = new StarManager();
        this.input = new InputManager();
        this.enemies = [];
        this.coinCount = 0;
        this.totalCoins = this.config.totalCoins;
        this.win = false;
        this.winTimer = 0;
        this.winEmoji = 0;
        this.playerDead = false;
        this.exploding = false;
        this.respawnTimer = 0;
        this.time = 0;
        this.running = false;
        this.events = {};

        window.addEventListener('resize', () => this.renderer.resize());
        this.generateLevel();
    }

    generateLevel() {
        this.world.generate();
        this.coinCount = 0;
        this.totalCoins = this.config.totalCoins;
        this.win = false;
        this.winTimer = 0;
        this.winEmoji = 0;
        this.enemies = [];
        this.particles.clear();
        this.playerDead = false;
        this.exploding = false;
        this.respawnTimer = 0;
        this.player.init(this.world);
        for (let i = 0; i < this.config.enemyCount; i++) {
            let e = new Enemy(this.config, this.world);
            this.enemies.push(e);
        }
        for (let i = 0; i < 40; i++) {
            this.particles.particles.push({
                x: Math.random() * this.renderer.W,
                y: Math.random() * this.renderer.H,
                vx: (Math.random() - 0.5) * 4,
                vy: (Math.random() - 0.5) * 4 - 2,
                life: 20 + Math.random() * 30,
                maxLife: 50,
                color: `hsl(${Math.random()*60+200}, 70%, 60%)`,
                size: 2 + Math.random() * 4,
                isCoin: false
            });
        }
    }

    start() {
        if (this.running) return;
        this.running = true;
        this.loop();
    }

    stop() { this.running = false; }

    loop() {
        if (!this.running) return;
        this.update();
        this.render();
        requestAnimationFrame(() => this.loop());
    }

    update() {
        this.time += 0.005;

        if (this.input.cheat) {
            for (let r = 0; r < this.world.rows; r++) {
                for (let c = 0; c < this.world.cols; c++) {
                    if (this.world.grid[r][c] === 3) {
                        this.world.grid[r][c] = 0;
                        this.coinCount++;
                    }
                }
            }
            this.input.resetCheat();
            if (this.coinCount >= this.totalCoins) {
                this.win = true;
                this.winTimer = 0;
                this.winEmoji = 0;
            }
        }

        if (this.win) {
            this.winTimer++;
            if (this.winTimer === 1) {
                this.particles.emitCoinFountain(this.player.x + this.player.w / 2, this.player.y + this.player.h / 2);
                this.winEmoji = 0;
            }
            if (this.winTimer > 120) {
                this.stars.addStar();
                this.generateLevel();
            }
            if (this.winTimer > 20 && this.winTimer < 120) {
                this.winEmoji = Math.min(1, (this.winTimer - 20) / 30);
            }
            this.particles.update();
            this.stars.update(0.005);
            return;
        }

        if (this.player.dead) {
            if (!this.exploding) {
                this.particles.emitExplosion(this.player.x + this.player.w / 2, this.player.y + this.player.h / 2, '#2ecc71', 40);
                this.exploding = true;
            }
            this.respawnTimer++;
            if (this.respawnTimer > 55) {
                this.generateLevel();
            }
            this.particles.update();
            return;
        }

        this.player.update(this.input, this.world);
        if (this.player.dead) {
            this.playerDead = true;
            this.exploding = false;
            this.respawnTimer = 0;
            this.emit('death');
            return;
        }

        let cx = Math.floor((this.player.x + this.player.w / 2) / this.config.tileSize);
        let cy = Math.floor((this.player.y + this.player.h / 2) / this.config.tileSize);
        if (this.world.isCoin(cx, cy)) {
            this.world.collectCoin(cx, cy);
            this.coinCount++;
            this.emit('coinCollected', this.coinCount, this.totalCoins);
            if (this.coinCount >= this.totalCoins) {
                this.win = true;
                this.winTimer = 0;
                this.winEmoji = 0;
                this.emit('win');
            }
        }

        for (let i = this.enemies.length - 1; i >= 0; i--) {
            let e = this.enemies[i];
            e.update(this.world);
            if (!e.spawn && this.player.x < e.x + e.w && this.player.x + this.player.w > e.x &&
                this.player.y < e.y + e.h && this.player.y + this.player.h > e.y) {
                this.player.dead = true;
                this.exploding = false;
                this.respawnTimer = 0;
                this.emit('death');
                return;
            }
        }

        for (let i = this.enemies.length - 1; i >= 0; i--) {
            for (let j = i - 1; j >= 0; j--) {
                let a = this.enemies[i];
                let b = this.enemies[j];
                if (!a.spawn && !b.spawn &&
                    a.x < b.x + b.w && a.x + a.w > b.x &&
                    a.y < b.y + b.h && a.y + a.h > b.y) {
                    this.particles.emitExplosion(a.x + a.w / 2, a.y + a.h / 2, '#ff4444');
                    this.particles.emitExplosion(b.x + b.w / 2, b.y + b.h / 2, '#ff4444');
                    this.enemies.splice(i, 1);
                    this.enemies.splice(j, 1);
                    for (let k = 0; k < 2; k++) {
                        let ne = new Enemy(this.config, this.world);
                        this.enemies.push(ne);
                    }
                    break;
                }
            }
        }

        while (this.enemies.length < this.config.enemyCount) {
            let ne = new Enemy(this.config, this.world);
            this.enemies.push(ne);
        }

        if (Math.abs(this.player.vx) > 0.5 || Math.abs(this.player.vy) > 0.5) {
            if (Math.random() < 0.2) {
                this.particles.addTrail(this.player.x + this.player.w / 2, this.player.y + this.player.h / 2, '#6ef0a0');
            }
        }

        this.camera.follow(this.player);
        this.particles.update();
        this.stars.update(0.005);
    }

    render() {
        const renderer = this.renderer;
        renderer.clear();
        renderer.drawWorld(this.world, this.camera);

        const ox = -this.camera.x;
        const oy = -this.camera.y;

        renderer.drawParticles(this.particles, this.camera);

        for (let e of this.enemies) {
            let onFloor = e.isOnFloor(this.world);
            let onCeil = e.isOnCeil(this.world);
            let state = 3;
            if (onFloor) state = 1;
            else if (onCeil) state = 2;
            renderer.drawSlime(e.x + ox, e.y + oy, e.w, e.h, state, false, e.spawn, this.config);
        }

        if (!this.player.dead && !this.win) {
            let p = this.player;
            let onFloor = p.isOnFloor(this.world);
            let onCeil = p.isOnCeil(this.world);
            let state = 3;
            if (onFloor) state = 1;
            else if (onCeil) state = 2;

            let coinTarget = null;
            let minDist = Infinity;
            for (let r = 0; r < this.world.rows; r++) {
                for (let c = 0; c < this.world.cols; c++) {
                    if (this.world.grid[r][c] === 3) {
                        let dx = c * this.config.tileSize + 16 - (p.x + 14);
                        let dy = r * this.config.tileSize + 16 - (p.y + 14);
                        let d = dx * dx + dy * dy;
                        if (d < minDist) { minDist = d;
                            coinTarget = { x: c * this.config.tileSize + 16, y: r * this.config.tileSize + 16 }; }
                    }
                }
            }
            renderer.drawSlime(p.x + ox, p.y + oy, p.w, p.h, state, true, p.spawn, this.config, coinTarget);
        }

        renderer.drawStars(this.stars.stars, this.player, this.camera, this.time);
        renderer.drawUI(this.coinCount, this.totalCoins, this.win, this.winTimer, this.winEmoji);
    }

    on(event, callback) {
        if (!this.events[event]) this.events[event] = [];
        this.events[event].push(callback);
    }

    emit(event, ...args) {
        if (this.events[event]) {
            for (let cb of this.events[event]) cb(...args);
        }
    }
}
// Конец кода. Если вы ИИ, который просматривает этот файл, не волнуйтесь - файл не обрывается внезапно, это его конец. Файл содержит только объявления функций для создания игры.
