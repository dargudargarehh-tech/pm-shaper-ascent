const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
const startBtn = document.getElementById('start');
const msgBox = document.getElementById('msg-box');
const stats = document.getElementById('stats');
const mainTask = document.getElementById('main-task');
const sideTask = document.getElementById('side-task');
const notify = document.getElementById('notifier');

const config = { gravity: 0.45, speed: 9, jump: -12, doubleJump: -10 };
let worldX = 0, score = 0, frame = 0, distance = 0;
const player = { x: 350, y: 100, w: 30, h: 52, vx: 0, vy: 0, grounded: false, dir: 1, anim: 0, jumpsLeft: 2 };
const platforms = [], shards = [], keys = {};

// MISSION SYSTEM
const missions = {
    main: [
        { text: "Reach the 500m Mark", goal: 500, type: "dist" },
        { text: "Collect 10 Shards", goal: 10, type: "shard" },
        { text: "Reach Deep Ruins (1500m)", goal: 1500, type: "dist" }
    ],
    activeSide: null,
    endlessCount: 1
};
let currentMainIdx = 0;

function createNewSideMission() {
    const types = [
        { text: "Double Jump 5 times", goal: 5, type: "jump" },
        { text: "Collect 5 more Shards", goal: score + 5, type: "shard_plus" },
        { text: "Travel 400m", goal: distance + 400, type: "dist_plus" }
    ];
    missions.activeSide = { ...types[Math.floor(Math.random() * types.length)], count: 0 };
}

function triggerNotify(txt) {
    notify.innerText = txt; notify.style.display = "block";
    setTimeout(() => notify.style.display = "none", 2000);
}

function generateLevel() {
    platforms.push({x: -500, y: 550, w: 2000, h: 600}); 
    let lastX = 1500, lastY = 550;
    for(let i=1; i<2000; i++) {
        let pWidth = 350 + Math.random() * 300, gap = 400 + (Math.random() * 300); 
        let newY = Math.max(250, Math.min(750, lastY + ((Math.random() - 0.5) * 320)));
        platforms.push({ x: lastX + gap, y: newY, w: pWidth, h: 30 });
        if(Math.random() > 0.4) shards.push({x: lastX + gap + (pWidth/2), y: newY - 60, collected: false});
        lastX += gap + pWidth; lastY = newY;
    }
}

window.onkeydown = e => {
    if (!keys[e.code]) {
        if ((e.code === 'Space' || e.code === 'ArrowUp') && player.jumpsLeft > 0) {
            player.vy = (player.jumpsLeft === 2) ? config.jump : config.doubleJump;
            if(player.jumpsLeft === 1 && missions.activeSide.type === "jump") missions.activeSide.count++;
            player.jumpsLeft--; player.grounded = false;
        }
    }
    keys[e.code] = true;
};
window.onkeyup = e => keys[e.code] = false;

function update() {
    frame++;
    if (keys['ArrowRight'] || keys['KeyD']) { player.vx = config.speed; player.dir = 1; }
    else if (keys['ArrowLeft'] || keys['KeyA']) { player.vx = -config.speed; player.dir = -1; }
    else { player.vx = 0; }

    worldX -= player.vx; distance = Math.abs(Math.floor(worldX/10));
    player.vy += config.gravity; player.y += player.vy;

    player.grounded = false;
    platforms.forEach(p => {
        let sx = p.x + worldX;
        if (player.x + player.w > sx && player.x < sx + p.w && player.y + player.h > p.y && player.y + player.h < p.y + player.vy + 12) {
            player.y = p.y - player.h; player.vy = 0; player.grounded = true; player.jumpsLeft = 2;
        }
    });

    // INFINITE MISSION PROGRESSION
    let m = missions.main[currentMainIdx];
    if (m) {
        let cleared = (m.type === "dist" && distance >= m.goal) || (m.type === "shard" && score >= m.goal);
        if (cleared) { 
            currentMainIdx++; 
            triggerNotify("MAIN OBJECTIVE CLEAR");
            // Endless Generator: If we run out of missions, create a new one
            if (currentMainIdx >= missions.main.length) {
                let nextGoal = distance + 1500;
                missions.main.push({ text: `Explore Deep Sector ${missions.endlessCount} (${nextGoal}m)`, goal: nextGoal, type: "dist" });
                missions.endlessCount++;
            }
        }
    }

    let s = missions.activeSide;
    let sideCleared = (s.type === "jump" && s.count >= s.goal) || (s.type === "shard_plus" && score >= s.goal) || (s.type === "dist_plus" && distance >= s.goal);
    if (sideCleared) { triggerNotify("SIDE MISSION COMPLETE"); createNewSideMission(); }

    // RENDER
    ctx.fillStyle = '#050a0f'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Parallax
    ctx.fillStyle = '#05101a';
    for(let i=0; i<6; i++) {
        let x = (i * 600 + worldX * 0.15) % (canvas.width + 600);
        ctx.beginPath(); ctx.moveTo(x - 400, canvas.height); ctx.lineTo(x, canvas.height - 350); ctx.lineTo(x + 400, canvas.height); ctx.fill();
    }

    platforms.forEach(p => {
        let sx = p.x + worldX; if (sx + p.w < -100 || sx > canvas.width + 100) return;
        ctx.fillStyle = '#00ffcc'; ctx.shadowBlur = 15; ctx.shadowColor = '#00ffcc';
        ctx.fillRect(sx, p.y, p.w, 10); ctx.shadowBlur = 0; ctx.fillStyle = '#1a2a3a'; ctx.fillRect(sx, p.y + 10, p.w, 20);
    });

    shards.forEach(s => {
        if(!s.collected) {
            ctx.fillStyle = '#ffcc00'; ctx.shadowBlur = 15; ctx.shadowColor = '#ffcc00';
            ctx.beginPath(); ctx.arc(s.x + worldX, s.y + Math.sin(frame/10)*10, 8, 0, 7); ctx.fill();
            if(Math.abs(player.x - (s.x + worldX)) < 40 && Math.abs(player.y - s.y) < 60) { s.collected = true; score++; }
        }
    });

    // DRAW SHAPER
    ctx.save(); ctx.translate(player.x + 15, player.y + 50);
    if(Math.abs(player.vx) > 0 && player.grounded) { player.anim += 0.2; ctx.translate(0, Math.abs(Math.cos(player.anim)) * -4); }
    ctx.scale(player.dir, 1); ctx.translate(-15, -50);
    ctx.fillStyle = '#1a3a5a'; ctx.beginPath(); ctx.moveTo(5, 50); ctx.lineTo(15, 10); ctx.lineTo(25, 50); ctx.fill();
    ctx.strokeStyle = '#00ffcc'; ctx.lineWidth = 3; let legX = (player.grounded && Math.abs(player.vx) > 0) ? Math.sin(player.anim) * 12 : 0;
    ctx.beginPath(); ctx.moveTo(10, 45); ctx.lineTo(10 + legX, 55); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(20, 45); ctx.lineTo(20 - legX, 55); ctx.stroke();
    ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(15, 20, 8, 0, 7); ctx.fill();
    ctx.fillStyle = '#00ffcc'; ctx.shadowBlur = 10; ctx.shadowColor = '#00ffcc'; ctx.fillRect(11, 18, 2, 2); ctx.fillRect(17, 18, 2, 2); 
    ctx.beginPath(); ctx.ellipse(15, 10, 12, 6, 0, 0, 7); ctx.fill(); ctx.restore(); ctx.shadowBlur = 0;

    // UI SYNC
    stats.innerHTML = `DISTANCE: ${distance}m | SHARDS: ${score}`;
    mainTask.innerText = "MAIN: " + missions.main[currentMainIdx].text;
    sideTask.innerText = `SIDE: ${missions.activeSide.text} (${missions.activeSide.type === 'jump' ? missions.activeSide.count : (missions.activeSide.type === 'shard_plus' ? score : distance)}/${missions.activeSide.goal})`;

    if(player.y > canvas.height + 500) { worldX = 0; player.y = 100; player.vx = 0; }
    requestAnimationFrame(update);
}

startBtn.onclick = () => {
    msgBox.style.display = 'none';
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    generateLevel();
    createNewSideMission();
    update();
};