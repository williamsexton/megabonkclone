// Main game loop and initialization
import * as THREE from 'https://cdn.skypack.dev/three@0.128.0';
import { SkeletonUtils } from 'https://cdn.skypack.dev/three@0.128.0/examples/jsm/utils/SkeletonUtils.js';
import { CONFIG, GAME_SPEED } from './config.js';
import { loadAssets, assets, mixers, centerAndScaleModel, setupModelAnimation } from './models.js';
import { createAsphaltTexture, createSkyDome, generateCity, checkCityCollision } from './world.js';
import { spawnEnemy, spawnFinalBoss, spawnGem, spawnChest, spawnFly, createParticles, checkEnemyDeath, updateEnemies } from './entities.js';
import { updateHUD, updateInventory, updateBossHealth, showUpgradeModal, applyUpgrade } from './ui.js';
import * as Weapons from './weapons.js';

let scene, camera, renderer, playerMesh, clock;
let lastFrameTime = performance.now();
const keys = { w: false, a: false, s: false, d: false };

// Mobile controls
let mobileJoysticks = {
    move: { active: false, x: 0, y: 0 },
    camera: { active: false, x: 0, y: 0 }
};

let state = {
    isRunning: false, isPaused: false, frame: 0, time: 0, kills: 0, level: 1, xp: 0, xpToNextLevel: 5,
    hp: 100, maxHp: 100, playerColor: 0xffffff, shield: 0, maxShield: 0, shieldRegenTimer: 0,
    lifesteal: 0, damageReduction: 0, critChance: 0, contactDamage: 0, bloodyLustStacks: 0,
    camTheta: Math.PI / 2, camPhi: 0.5, damageMult: 1, areaMult: 1, cooldownMult: 1, projectileCount: 0,
    moveSpeed: 0.13 * GAME_SPEED, curse: 1, pickupRange: 8, rapidFireTimer: 0,
    weapons: {
        wand: { level: 0, cooldown: 0, baseCD: 40 },
        axe: { level: 0, cooldown: 0, baseCD: 70 },
        sword: { level: 0, cooldown: 0, baseCD: 60 },
        boomerang: { level: 0, cooldown: 0, baseCD: 70 },
        chain_lightning: { level: 0, cooldown: 0, baseCD: 80 },
        shattering_star: { level: 0, cooldown: 0, baseCD: 65 },
        iron_maiden: { level: 0, cooldown: 0, baseCD: 100 },
        ember_whip: { level: 0, cooldown: 0, baseCD: 55 },
        binding_roots: { level: 0, cooldown: 0, baseCD: 110 },
        meteor_shower: { level: 0, cooldown: 0, baseCD: 85 },
        drifting_fog: { level: 0, cooldown: 0, baseCD: 95 }
    },
    guppyChance: 0, rottenBabyChance: 0, cityBlocks: [],
    finalBossDefeated: false, finalBossSpawned: false, difficultyMult: 1.0, speedMult: 1.0
};

let entities = { enemies: [], projectiles: [], gems: [], chests: [], particles: [], aoeZones: [], powerups: [], flies: [], summonItem: null };

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050510);
    scene.fog = new THREE.Fog(0x050510, 30, 120);
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.body.appendChild(renderer.domElement);
    
    scene.add(new THREE.AmbientLight(0x222244, 1.0));
    const dl = new THREE.DirectionalLight(0xaaccff, 0.5);
    dl.position.set(20, 50, 20);
    dl.castShadow = true;
    dl.shadow.mapSize.width = 2048;
    dl.shadow.mapSize.height = 2048;
    scene.add(dl);
    
    const p1 = new THREE.PointLight(0xffaa00, 1, 40);
    p1.position.set(30, 10, 30);
    scene.add(p1);
    const p2 = new THREE.PointLight(0xffaa00, 1, 40);
    p2.position.set(-30, 10, -30);
    scene.add(p2);
    
    const groundMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(2000, 2000),
        new THREE.MeshStandardMaterial({ map: createAsphaltTexture(), roughness: 0.8 })
    );
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.receiveShadow = true;
    scene.add(groundMesh);
    
    const grid = new THREE.GridHelper(500, 100, 0x333333, 0x111111);
    grid.position.y = 0.1;
    scene.add(grid);
    
    createSkyDome(scene);
    
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') document.exitPointerLock();
        if ('wasd'.includes(e.key)) keys[e.key] = true;
    });
    
    document.addEventListener('keyup', (e) => {
        if ('wasd'.includes(e.key)) keys[e.key] = false;
    });
    
    renderer.domElement.addEventListener('click', () => {
        if (state.isRunning && !state.isPaused) renderer.domElement.requestPointerLock();
    });
    
    window.addEventListener('mousemove', (e) => {
        if (document.pointerLockElement !== renderer.domElement) return;
        state.camTheta -= e.movementX * 0.002;
        state.camPhi = Math.max(0.1, Math.min(Math.PI / 2 - 0.1, state.camPhi + e.movementY * 0.002));
    });
    
    clock = new THREE.Clock();
    loadAssets();
    animate();
    setupMobileControls();
}

function setupMobileControls() {
    // Show joysticks on touch devices
    if ('ontouchstart' in window) {
        document.getElementById('mobile-move-joystick').style.display = 'block';
        document.getElementById('mobile-camera-joystick').style.display = 'block';
        document.getElementById('controls-hint').style.display = 'none';
    }
    
    // Handle move joystick
    const moveJoy = document.getElementById('mobile-move-joystick');
    const moveStick = moveJoy.querySelector('.mobile-joystick-stick');
    
    moveJoy.addEventListener('touchstart', (e) => {
        e.preventDefault();
        mobileJoysticks.move.active = true;
    });
    
    moveJoy.addEventListener('touchmove', (e) => {
        if (!mobileJoysticks.move.active) return;
        e.preventDefault();
        const touch = e.touches[0];
        const rect = moveJoy.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        let dx = touch.clientX - centerX;
        let dy = touch.clientY - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const maxDist = rect.width / 2 - 25;
        if (distance > maxDist) {
            dx = dx / distance * maxDist;
            dy = dy / distance * maxDist;
        }
        moveStick.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
        mobileJoysticks.move.x = dx / maxDist;
        mobileJoysticks.move.y = dy / maxDist;
    });
    
    moveJoy.addEventListener('touchend', () => {
        mobileJoysticks.move.active = false;
        mobileJoysticks.move.x = 0;
        mobileJoysticks.move.y = 0;
        moveStick.style.transform = 'translate(-50%, -50%)';
    });
    
    // Handle camera joystick
    const camJoy = document.getElementById('mobile-camera-joystick');
    const camStick = camJoy.querySelector('.mobile-joystick-stick');
    
    camJoy.addEventListener('touchstart', (e) => {
        e.preventDefault();
        mobileJoysticks.camera.active = true;
    });
    
    camJoy.addEventListener('touchmove', (e) => {
        if (!mobileJoysticks.camera.active) return;
        e.preventDefault();
        const touch = e.touches[0];
        const rect = camJoy.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        let dx = touch.clientX - centerX;
        let dy = touch.clientY - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const maxDist = rect.width / 2 - 25;
        if (distance > maxDist) {
            dx = dx / distance * maxDist;
            dy = dy / distance * maxDist;
        }
        camStick.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
        mobileJoysticks.camera.x = dx / maxDist;
        mobileJoysticks.camera.y = dy / maxDist;
    });
    
    camJoy.addEventListener('touchend', () => {
        mobileJoysticks.camera.active = false;
        mobileJoysticks.camera.x = 0;
        mobileJoysticks.camera.y = 0;
        camStick.style.transform = 'translate(-50%, -50%)';
    });
}

window.gameStart = function(charType) {
    document.getElementById('title-screen').style.display = 'none';
    document.getElementById('ui-layer').style.display = 'flex';
    document.getElementById('xp-bar-container').style.display = 'block';
    document.getElementById('player-bars').style.display = 'block';
    
    // Try to request pointer lock, but don't block game start if it fails (iOS doesn't support it)
    if (renderer.domElement.requestPointerLock) {
        renderer.domElement.requestPointerLock().catch(() => {
            console.log('Pointer lock not supported, continuing without it');
        });
    }
    
    mixers.length = 0;
    generateCity(scene, state.cityBlocks);
    
    // Reset state
    state = {
        isRunning: true, isPaused: false, frame: 0, time: 0, kills: 0, level: 1, xp: 0, xpToNextLevel: 5,
        hp: 100, maxHp: 100, shield: 0, maxShield: 0, shieldRegenTimer: 0,
        lifesteal: 0, damageReduction: 0, critChance: 0, contactDamage: 0, bloodyLustStacks: 0,
        camTheta: Math.PI / 2, camPhi: 0.5, damageMult: 1, areaMult: 1, cooldownMult: 1, projectileCount: 0,
        moveSpeed: 0.13 * GAME_SPEED, curse: 1, pickupRange: 8, rapidFireTimer: 0,
        weapons: {
            wand: { level: 0, cooldown: 0, baseCD: 40 },
            axe: { level: 0, cooldown: 0, baseCD: 70 },
            sword: { level: 0, cooldown: 0, baseCD: 60 },
            boomerang: { level: 0, cooldown: 0, baseCD: 70 },
            chain_lightning: { level: 0, cooldown: 0, baseCD: 80 },
            shattering_star: { level: 0, cooldown: 0, baseCD: 65 },
            iron_maiden: { level: 0, cooldown: 0, baseCD: 100 },
            ember_whip: { level: 0, cooldown: 0, baseCD: 55 },
            binding_roots: { level: 0, cooldown: 0, baseCD: 110 },
            meteor_shower: { level: 0, cooldown: 0, baseCD: 85 },
            drifting_fog: { level: 0, cooldown: 0, baseCD: 95 }
        },
        guppyChance: 0, rottenBabyChance: 0, cityBlocks: state.cityBlocks,
        finalBossDefeated: false, finalBossSpawned: false, difficultyMult: 1.0, speedMult: 1.0
    };
    
    // Set character-specific stats
    if (charType === 'mage') { state.playerColor = 0x3366ff; state.weapons.wand.level = 1; }
    if (charType === 'tank') { state.playerColor = 0xffaa00; state.weapons.axe.level = 1; state.maxHp = 150; state.hp = 150; }
    if (charType === 'warrior') { state.playerColor = 0xcccccc; state.weapons.sword.level = 1; state.damageMult = 1.1; }
    if (charType === 'ranger') { state.playerColor = 0x33ff33; state.weapons.boomerang.level = 1; state.moveSpeed = 0.16; }
    
    // Create player
    if (playerMesh) scene.remove(playerMesh);
    const playerGroup = new THREE.Group();
    const playerModelKey = `player_${charType}`;
    if (assets.models[playerModelKey]) {
        const model = SkeletonUtils.clone(assets.models[playerModelKey]);
        const s = CONFIG.models[playerModelKey] ? CONFIG.models[playerModelKey].scale : 2;
        centerAndScaleModel(model, s);
        playerGroup.add(model);
        setupModelAnimation(model, playerModelKey);
    } else {
        const model = new THREE.Mesh(
            new THREE.BoxGeometry(1, 2, 1),
            new THREE.MeshStandardMaterial({ color: state.playerColor })
        );
        model.userData.origEmissive = 0x000000;
        model.userData.origColor = state.playerColor;
        playerGroup.add(model);
    }
    playerMesh = playerGroup;
    playerMesh.position.set(12, 1, 12);
    scene.add(playerMesh);
    
    // Clear entities
    [...entities.enemies, ...entities.projectiles, ...entities.gems, ...entities.chests, ...entities.particles, ...entities.aoeZones, ...entities.powerups, ...entities.flies].forEach(e => scene.remove(e.mesh));
    entities = { enemies: [], projectiles: [], gems: [], chests: [], particles: [], aoeZones: [], powerups: [], flies: [], summonItem: null };
    
    // Spawn summon item
    const summonMesh = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.8),
        new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 0.8 })
    );
    summonMesh.position.set(-6, 1, 0);
    scene.add(summonMesh);
    entities.summonItem = { mesh: summonMesh };
    
    updateHUD(state);
};

window.returnToTitle = function() {
    state.isRunning = false;
    document.exitPointerLock();
    document.getElementById('game-over').style.display = 'none';
    document.getElementById('ui-layer').style.display = 'none';
    document.getElementById('xp-bar-container').style.display = 'none';
    document.getElementById('player-bars').style.display = 'none';
    document.getElementById('title-screen').style.display = 'flex';
};

let damageFlashTimer = 0;

function takeDamage(amt) {
    let actualDmg = amt * (state.damageReduction ? 0.5 : 1);
    if (state.shield > 0) {
        state.shield -= actualDmg;
        if (state.shield < 0) {
            state.hp += state.shield;
            state.shield = 0;
        }
    } else {
        state.hp -= actualDmg;
    }
    state.shieldRegenTimer = 180;
    if (state.bloodyLustStacks < 10) state.bloodyLustStacks++;
    
    // Set damage flash timer instead of using setTimeout
    damageFlashTimer = 3; // frames
    
    if (state.hp <= 0) {
        state.isRunning = false;
        if (document.pointerLockElement) document.exitPointerLock();
        document.getElementById('final-stats').innerText = `Survived: ${document.getElementById('time-display').innerText} | Kills: ${state.kills}`;
        document.getElementById('game-over').style.display = 'flex';
    }
}

function levelUp() {
    state.level++;
    state.xp = 0;
    state.xpToNextLevel = Math.floor(state.xpToNextLevel * 1.1) + 10;
    showUpgradeModal(state, false, (opt) => applyUpgrade(opt, state, renderer));
}

function openChest() {
    showUpgradeModal(state, true, (opt) => applyUpgrade(opt, state, renderer));
}

function animate() {
    requestAnimationFrame(animate);
    if (!state.isPaused) {
        const delta = clock.getDelta();
        mixers.forEach(mixer => mixer.update(delta));
    }
    if (!state.isRunning || state.isPaused) return;
    
    state.frame++;
    
    // Update FPS
    const currentTime = performance.now();
    document.getElementById('fps-counter').innerText = `FPS: ${Math.round(1000 / (currentTime - lastFrameTime))}`;
    lastFrameTime = currentTime;
    
    // Time-based spawning
    if (state.frame % 60 === 0) {
        state.time++;
        document.getElementById('time-display').innerText = new Date(state.time * 1000).toISOString().substr(14, 5);
        const timeFactor = Math.floor(state.time / 5);
        const baseRate = Math.max(1, CONFIG.baseSpawnRate - timeFactor);
        const spawnRate = Math.max(1, Math.floor(baseRate / (state.curse * state.difficultyMult)));
        const enemyCount = Math.ceil((4 + Math.floor(state.time / 5)) * state.difficultyMult);
        if (state.frame % spawnRate === 0) {
            for (let i = 0; i < enemyCount; i++) spawnEnemy(state, entities, scene, playerMesh);
        }
        if (state.time > 0 && state.time % 60 === 0) spawnEnemy(state, entities, scene, playerMesh, true);
        if (state.time > 10 && state.time % 30 === 0 && Math.random() > 0.5) {
            spawnChest(null, playerMesh, entities, scene);
        }
        if (Math.random() < state.rottenBabyChance) spawnFly(playerMesh.position, entities, scene);
    }
    
    // Shield regen
    if (state.maxShield > 0) {
        if (state.shieldRegenTimer > 0) state.shieldRegenTimer--;
        else if (state.shield < state.maxShield && state.frame % 10 === 0) state.shield++;
    }
    document.getElementById('hp-fill').style.width = (state.hp / state.maxHp * 100) + '%';
    document.getElementById('shield-fill').style.width = state.maxShield > 0 ? (state.shield / state.maxShield * 100) + '%' : '0%';
    
    // Camera
    const cx = CONFIG.camRadius * Math.sin(state.camTheta) * Math.cos(state.camPhi);
    const cy = CONFIG.camRadius * Math.sin(state.camPhi) + CONFIG.camHeight;
    const cz = CONFIG.camRadius * Math.cos(state.camTheta) * Math.cos(state.camPhi);
    camera.position.set(playerMesh.position.x + cx, playerMesh.position.y + cy, playerMesh.position.z + cz);
    camera.lookAt(playerMesh.position.clone().add(new THREE.Vector3(0, 1.5, 0)));
    
    // Camera control (mobile joystick or mouse)
    if (mobileJoysticks.camera.active) {
        state.camTheta -= mobileJoysticks.camera.x * 0.05;
        state.camPhi = Math.max(0.1, Math.min(Math.PI / 2 - 0.1, state.camPhi + mobileJoysticks.camera.y * 0.05));
    }
    
    // Player movement
    const move = new THREE.Vector3(0, 0, 0);
    
    // Mobile joystick input
    if (mobileJoysticks.move.active) {
        move.x = mobileJoysticks.move.x;
        move.z = mobileJoysticks.move.y;
    }
    
    // Keyboard input
    if (keys.w) move.z -= 1;
    if (keys.s) move.z += 1;
    if (keys.a) move.x -= 1;
    if (keys.d) move.x += 1;
    
    if (move.lengthSq() > 0) {
        const fwd = new THREE.Vector3();
        camera.getWorldDirection(fwd);
        fwd.y = 0;
        fwd.normalize();
        const rgt = new THREE.Vector3();
        rgt.crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize();
        const vec = new THREE.Vector3().addScaledVector(fwd, -move.z).addScaledVector(rgt, move.x);
        vec.normalize().multiplyScalar(state.moveSpeed);
        const nextPos = playerMesh.position.clone().add(vec);
        if (!checkCityCollision(nextPos, state.cityBlocks)) {
            playerMesh.position.add(vec);
        }
        playerMesh.rotation.y = Math.atan2(-vec.z, vec.x) + Math.PI / 2;
    }
    
    // Update enemies
    updateEnemies(entities, state, playerMesh);
    
    // Enemy collision damage
    entities.enemies.forEach(e => {
        if (e.mesh.position.distanceTo(playerMesh.position) < 1.2) {
            takeDamage(1.0);
            if (state.contactDamage > 0) {
                e.hp -= state.contactDamage;
                checkEnemyDeath(e, state, entities, scene);
            }
        }
    });
    
    // Weapons
    const cd = state.cooldownMult * (state.rapidFireTimer > 0 ? 0.25 : 1);
    if (state.rapidFireTimer > 0) state.rapidFireTimer--;
    
    Object.keys(state.weapons).forEach(weaponId => {
        const weapon = state.weapons[weaponId];
        if (weapon.level > 0) {
            weapon.cooldown--;
            if (weapon.cooldown <= 0) {
                const weaponFunctions = {
                    wand: () => Weapons.fireWand(state, entities, scene, playerMesh),
                    axe: () => Weapons.fireAxe(state, entities, scene, playerMesh),
                    sword: () => Weapons.fireSword(state, entities, scene, playerMesh, camera),
                    boomerang: () => Weapons.fireBoomerang(state, entities, scene, playerMesh),
                    chain_lightning: () => Weapons.fireChainLightning(state, entities, scene, playerMesh),
                    shattering_star: () => Weapons.fireShatteringStar(state, entities, scene, playerMesh),
                    iron_maiden: () => Weapons.fireIronMaiden(state, entities, scene, playerMesh),
                    ember_whip: () => Weapons.fireEmberWhip(state, entities, scene, playerMesh),
                    binding_roots: () => Weapons.fireBindingRoots(state, entities, scene),
                    meteor_shower: () => Weapons.fireMeteorShower(state, entities, scene, playerMesh),
                    drifting_fog: () => Weapons.fireDriftingFog(state, entities, scene, playerMesh)
                };
                if (weaponFunctions[weaponId]) weaponFunctions[weaponId]();
                weapon.cooldown = weapon.baseCD * cd;
            }
        }
    });
    
    // Update projectiles (this is complex, keeping inline)
    for (let i = entities.projectiles.length - 1; i >= 0; i--) {
        const p = entities.projectiles[i];
        p.life--;
        
        if (p.type === 'axe') {
            p.mesh.position.add(p.velocity.clone().multiplyScalar(GAME_SPEED));
            p.velocity.y -= p.gravity;
            p.mesh.rotation.x += 0.2;
            if (p.mesh.position.y <= 0.2) {
                const r = 4 * state.areaMult * (p.areaScale || 1);
                const m = new THREE.Mesh(
                    new THREE.CylinderGeometry(r, r, 0.1, 16),
                    new THREE.MeshBasicMaterial({ color: CONFIG.colors.aoe, transparent: true, opacity: 0.5 })
                );
                m.position.set(p.mesh.position.x, 0.05, p.mesh.position.z);
                scene.add(m);
                entities.aoeZones.push({
                    mesh: m,
                    radius: r,
                    damage: 12 * state.damageMult * (p.areaScale || 1),
                    life: 480,
                    tickRate: 20,
                    tickTimer: 0
                });
                p.life = 0;
            }
        } else if (p.type === 'boomerang') {
            p.mesh.rotation.y += 0.5;
            p.mesh.position.add(p.velocity.clone().multiplyScalar(GAME_SPEED));
            if (p.returnState === 0) {
                p.returnTimer--;
                p.velocity.multiplyScalar(0.95);
                if (p.returnTimer <= 0) p.returnState = 1;
            } else {
                const d = new THREE.Vector3().subVectors(playerMesh.position, p.mesh.position).normalize();
                p.velocity.add(d.multiplyScalar(0.025)).clampLength(0, 0.4);
                if (p.mesh.position.distanceTo(playerMesh.position) < 1) p.life = 0;
            }
        } else {
            p.mesh.position.add(p.velocity.clone().multiplyScalar(GAME_SPEED));
        }
        
        if (p.type === 'meteor' && p.mesh.position.y <= 1) {
            const r = p.aoeRadius || 3;
            entities.enemies.forEach(e => {
                if (e.mesh.position.distanceTo(p.mesh.position) < r) {
                    e.hp -= p.damage;
                    createParticles(e.mesh.position, 0xff6600, 5, false, entities, scene);
                    checkEnemyDeath(e, state, entities, scene);
                }
            });
            p.life = 0;
        }
        
        if (p.life > 0 && p.type !== 'axe' && p.type !== 'meteor') {
            for (let j = entities.enemies.length - 1; j >= 0; j--) {
                const e = entities.enemies[j];
                if (p.type === 'boomerang' && p.hitList && p.hitList.includes(e)) continue;
                if (p.mesh.position.distanceTo(e.mesh.position) < (e.isBoss ? 2.5 : 1.2)) {
                    let isCrit = Math.random() < state.critChance;
                    let dmg = p.damage * (isCrit ? 2 : 1) * (1 + (state.bloodyLustStacks * 0.1));
                    e.hp -= dmg;
                    createParticles(e.mesh.position, 0xff3333, 3, isCrit, entities, scene);
                    if (state.guppyChance && Math.random() < state.guppyChance) spawnFly(e.mesh.position, entities, scene);
                    
                    if (p.type === 'shattering_star' && !p.shattered) {
                        p.shattered = true;
                        for (let f = 0; f < 8; f++) {
                            const mesh = new THREE.Mesh(
                                new THREE.SphereGeometry(0.2),
                                new THREE.MeshBasicMaterial({ color: 0xffff00 })
                            );
                            mesh.position.copy(p.mesh.position);
                            scene.add(mesh);
                            const a = f * (Math.PI * 2 / 8);
                            const vel = new THREE.Vector3(Math.cos(a) * 0.3, 0, Math.sin(a) * 0.3);
                            entities.projectiles.push({
                                type: 'star_fragment',
                                mesh,
                                velocity: vel,
                                damage: p.damage * 0.5,
                                life: 80
                            });
                        }
                    }
                    
                    if (p.type === 'boomerang') {
                        if (!p.hitList) p.hitList = [];
                        p.hitList.push(e);
                        setTimeout(() => {
                            if (p.hitList) {
                                const idx = p.hitList.indexOf(e);
                                if (idx > -1) p.hitList.splice(idx, 1);
                            }
                        }, 500);
                    } else if (p.type === 'wand' && p.bounces > 0) {
                        p.bounces--;
                        if (!p.hitList) p.hitList = [];
                        p.hitList.push(e);
                        let near = null, minDist = 15;
                        entities.enemies.forEach(t => {
                            if (t !== e && !p.hitList.includes(t)) {
                                const d = p.mesh.position.distanceTo(t.mesh.position);
                                if (d < minDist) { minDist = d; near = t; }
                            }
                        });
                        if (near) {
                            p.velocity = new THREE.Vector3().subVectors(near.mesh.position, p.mesh.position).normalize().multiplyScalar(0.3);
                            p.life += 20;
                        } else p.life = 0;
                    } else p.life = 0;
                    
                    checkEnemyDeath(e, state, entities, scene);
                    if (p.life <= 0) break;
                }
            }
        }
        
        if (p.life <= 0) {
            scene.remove(p.mesh);
            entities.projectiles.splice(i, 1);
        }
    }
    
    // Update flies
    for (let i = entities.flies.length - 1; i >= 0; i--) {
        const f = entities.flies[i];
        f.life--;
        let target = null, minDist = 20;
        entities.enemies.forEach(e => {
            const d = f.mesh.position.distanceTo(e.mesh.position);
            if (d < minDist) { minDist = d; target = e; }
        });
        if (target) {
            const dir = new THREE.Vector3().subVectors(target.mesh.position, f.mesh.position).normalize();
            f.mesh.position.add(dir.multiplyScalar(0.2 * GAME_SPEED));
            if (f.mesh.position.distanceTo(target.mesh.position) < 1.5) {
                target.hp -= 20 * state.damageMult;
                checkEnemyDeath(target, state, entities, scene);
                f.life = 0;
            }
        } else {
            const orbitPos = playerMesh.position.clone();
            orbitPos.x += Math.sin(state.time + i) * 3;
            orbitPos.z += Math.cos(state.time + i) * 3;
            orbitPos.y = 2;
            f.mesh.position.lerp(orbitPos, 0.05);
        }
        if (f.life <= 0) {
            scene.remove(f.mesh);
            entities.flies.splice(i, 1);
        }
    }
    
    // Update AOE zones
    for (let i = entities.aoeZones.length - 1; i >= 0; i--) {
        const z = entities.aoeZones[i];
        z.life--;
        z.tickTimer--;
        if (z.mesh.material) z.mesh.material.opacity = 0.3 + Math.sin(state.frame * 0.2) * 0.2;
        if (z.tickTimer <= 0) {
            z.tickTimer = z.tickRate;
            entities.enemies.forEach(e => {
                if (e.mesh.position.distanceTo(z.mesh.position) < z.radius) {
                    e.hp -= z.damage;
                    checkEnemyDeath(e, state, entities, scene);
                }
            });
        }
        if (z.life <= 0) {
            scene.remove(z.mesh);
            entities.aoeZones.splice(i, 1);
        }
    }
    
    // Update gems, chests, powerups, particles
    for (let i = entities.gems.length - 1; i >= 0; i--) {
        const e = entities.gems[i];
        e.mesh.rotation.x += e.rotSpeed.x;
        e.mesh.rotation.y += e.rotSpeed.y;
        const dist = playerMesh.position.distanceTo(e.mesh.position);
        if (e.isMagnetized || dist < state.pickupRange) {
            const d = new THREE.Vector3().subVectors(playerMesh.position, e.mesh.position).normalize();
            e.mesh.position.add(d.multiplyScalar((e.isMagnetized ? 0.6 : 0.2) * GAME_SPEED));
        }
        if (dist < 0.8) {
            state.xp += e.value;
            scene.remove(e.mesh);
            entities.gems.splice(i, 1);
            if (state.xp >= state.xpToNextLevel) levelUp();
            updateHUD(state);
        }
    }
    
    for (let i = entities.powerups.length - 1; i >= 0; i--) {
        const e = entities.powerups[i];
        e.mesh.rotation.y += e.rotationSpeed;
        e.mesh.rotation.x += e.rotationSpeed;
        if (playerMesh.position.distanceTo(e.mesh.position) < 2) {
            const n = document.getElementById('powerup-notif');
            n.style.display = 'block';
            n.innerText = e.type.toUpperCase() + "!";
            if (e.type === 'magnet') entities.gems.forEach(g => g.isMagnetized = true);
            if (e.type === 'bomb') {
                [...entities.enemies].forEach(en => { en.hp = 0; checkEnemyDeath(en, state, entities, scene); });
                entities.enemies = [];
            }
            if (e.type === 'battery') state.rapidFireTimer = 600;
            scene.remove(e.mesh);
            entities.powerups.splice(i, 1);
        }
    }
    
    for (let i = entities.chests.length - 1; i >= 0; i--) {
        entities.chests[i].mesh.rotation.y += 0.01;
        if (playerMesh.position.distanceTo(entities.chests[i].mesh.position) < 2) {
            createParticles(entities.chests[i].mesh.position, 0xffd700, 20, true, entities, scene);
            scene.remove(entities.chests[i].mesh);
            entities.chests.splice(i, 1);
            openChest();
        }
    }
    
    for (let i = entities.particles.length - 1; i >= 0; i--) {
        entities.particles[i].mesh.position.add(entities.particles[i].velocity.clone().multiplyScalar(GAME_SPEED));
        entities.particles[i].life--;
        entities.particles[i].mesh.scale.multiplyScalar(0.9);
        if (entities.particles[i].life <= 0) {
            scene.remove(entities.particles[i].mesh);
            entities.particles.splice(i, 1);
        }
    }
    
    // Check summon item
    if (entities.summonItem && playerMesh.position.distanceTo(entities.summonItem.mesh.position) < 2.5) {
        if (!state.finalBossSpawned) {
            state.finalBossSpawned = true;
            scene.remove(entities.summonItem.mesh);
            entities.summonItem = null;
            spawnFinalBoss(state, entities, scene);
        }
    }
    
    // Make summon item pulse
    if (entities.summonItem) {
        entities.summonItem.mesh.rotation.y += 0.02;
        entities.summonItem.mesh.rotation.x += 0.01;
        const scale = 1 + Math.sin(state.frame * 0.05) * 0.1;
        entities.summonItem.mesh.scale.set(scale, scale, scale);
    }
    
    // Handle damage flash effect
    if (damageFlashTimer > 0) {
        damageFlashTimer--;
        // Flash red
        playerMesh.traverse(c => {
            if (c.isMesh && c.material) {
                if (c.material.emissive) c.material.emissive.setHex(0xff0000);
                else if (c.material.color) c.material.color.setHex(0xff0000);
            }
        });
    } else if (damageFlashTimer === 0) {
        // Reset colors
        playerMesh.traverse(c => {
            if (c.isMesh && c.material) {
                if (c.userData.origEmissive !== undefined && c.material.emissive) {
                    c.material.emissive.setHex(c.userData.origEmissive);
                }
                if (c.userData.origColor !== undefined && c.material.color) {
                    c.material.color.setHex(c.userData.origColor);
                }
            }
        });
        damageFlashTimer = -1; // Mark as done
    }
    
    // Progressive difficulty
    if (state.time >= 900 && state.time % 20 === 0 && state.frame % 60 === 0) {
        state.difficultyMult *= 1.2;
        state.speedMult *= 1.1;
    }
    
    updateBossHealth(entities);
    renderer.render(scene, camera);
}

init();
