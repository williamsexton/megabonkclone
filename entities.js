// Entity management - spawning, updating, collision
import * as THREE from 'https://cdn.skypack.dev/three@0.128.0';
import { SkeletonUtils } from 'https://cdn.skypack.dev/three@0.128.0/examples/jsm/utils/SkeletonUtils.js';
import { CONFIG, ENEMY_TYPES, GAME_SPEED, ENEMY_SPEED_MULT } from './config.js';
import { assets, mixers, setupModelAnimation, centerAndScaleModel } from './models.js';
import { checkCityCollision } from './world.js';
import { updateHUD } from './ui.js';

export function spawnEnemy(state, entities, scene, playerMesh, isBoss = false) {
    const min = Math.floor(state.time / 60);
    const type = ENEMY_TYPES[min % ENEMY_TYPES.length];
    const angle = Math.random() * Math.PI * 2;
    const dist = isBoss ? 40 : 25 + Math.random() * 10;
    const x = playerMesh.position.x + Math.cos(angle) * dist;
    const z = playerMesh.position.z + Math.sin(angle) * dist;
    const group = new THREE.Group();
    const modelKey = isBoss ? 'enemy_boss' : type.modelKey;
    
    if (assets.models[modelKey]) {
        const model = SkeletonUtils.clone(assets.models[modelKey]);
        const s = CONFIG.models[modelKey] ? (CONFIG.models[modelKey].scale || 1) : 1;
        centerAndScaleModel(model, s);
        group.add(model);
        setupModelAnimation(model, modelKey);
    } else {
        let geo;
        if (isBoss) geo = new THREE.DodecahedronGeometry(4);
        else if (type.geo === 'box') geo = new THREE.BoxGeometry(1, 1, 1);
        else if (type.geo === 'tetra') geo = new THREE.TetrahedronGeometry(0.8);
        else geo = new THREE.OctahedronGeometry(1);
        const mat = new THREE.MeshStandardMaterial({ color: isBoss ? 0x880000 : type.color });
        const model = new THREE.Mesh(geo, mat);
        model.userData.origEmissive = 0x000000;
        model.userData.origColor = mat.color.getHex();
        group.add(model);
    }
    
    group.position.set(x, isBoss ? 2 : type.size / 2, z);
    scene.add(group);
    const scale = 1 + (state.time * 0.015);
    const speedBoost = state.speedMult || 1.0;
    entities.enemies.push({
        mesh: group,
        hp: (isBoss ? 600 : type.hp) * scale,
        maxHp: (isBoss ? 600 : type.hp) * scale,
        speed: (isBoss ? 0.025 * GAME_SPEED * ENEMY_SPEED_MULT : type.speed + (Math.random() * 0.005)) * speedBoost,
        isBoss,
        radius: isBoss ? 2.5 : type.size * 0.6
    });
    
    if (isBoss) {
        document.getElementById('boss-warning').style.display = 'block';
        setTimeout(() => document.getElementById('boss-warning').style.display = 'none', 3000);
    }
}

export function spawnFinalBoss(state, entities, scene) {
    const group = new THREE.Group();
    const modelKey = 'enemy_final_boss';
    if (assets.models[modelKey]) {
        const model = SkeletonUtils.clone(assets.models[modelKey]);
        const s = CONFIG.models[modelKey] ? (CONFIG.models[modelKey].scale || 6) : 6;
        centerAndScaleModel(model, s);
        group.add(model);
        setupModelAnimation(model, modelKey);
    } else {
        const geo = new THREE.IcosahedronGeometry(6);
        const mat = new THREE.MeshStandardMaterial({ color: 0x990000, emissive: 0xff0000, emissiveIntensity: 0.5 });
        const model = new THREE.Mesh(geo, mat);
        model.userData.origEmissive = 0xff0000;
        model.userData.origColor = 0x990000;
        group.add(model);
    }
    group.position.set(0, 3, -15);
    scene.add(group);
    entities.enemies.push({
        mesh: group,
        hp: 30000,
        maxHp: 30000,
        speed: 0.04 * GAME_SPEED * ENEMY_SPEED_MULT,
        isBoss: true,
        isFinalBoss: true,
        radius: 3
    });
    document.getElementById('boss-warning').style.display = 'block';
    document.getElementById('boss-warning').innerText = 'FINAL BOSS!';
    setTimeout(() => document.getElementById('boss-warning').style.display = 'none', 3000);
}

export function spawnGem(pos, value, entities, scene) {
    const mesh = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.3),
        new THREE.MeshStandardMaterial({ color: CONFIG.colors.gem, emissive: 0x00aa88 })
    );
    mesh.position.copy(pos);
    mesh.position.y = 0.5;
    scene.add(mesh);
    entities.gems.push({
        mesh,
        value,
        rotSpeed: { x: Math.random() * 0.05, y: Math.random() * 0.05 }
    });
}

export function spawnChest(pos, playerMesh, entities, scene) {
    const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(1.5, 1.5, 1.5),
        new THREE.MeshStandardMaterial({ color: CONFIG.colors.chest, emissive: 0xaa8800 })
    );
    if (pos) {
        mesh.position.copy(pos);
    } else {
        const angle = Math.random() * Math.PI * 2;
        const dist = 15 + Math.random() * 10;
        mesh.position.set(
            playerMesh.position.x + Math.cos(angle) * dist,
            0.75,
            playerMesh.position.z + Math.sin(angle) * dist
        );
    }
    mesh.position.y = 0.75;
    scene.add(mesh);
    entities.chests.push({ mesh });
}

export function spawnFly(pos, entities, scene) {
    const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.2),
        new THREE.MeshBasicMaterial({ color: CONFIG.colors.fly })
    );
    mesh.position.copy(pos);
    scene.add(mesh);
    entities.flies.push({ mesh, target: null, life: 300 });
}

export function createParticles(pos, color, count, isCrit, entities, scene) {
    for (let i = 0; i < count; i++) {
        const mesh = new THREE.Mesh(
            new THREE.BoxGeometry(0.2, 0.2, 0.2),
            new THREE.MeshBasicMaterial({ color: isCrit ? 0xffff00 : color })
        );
        mesh.position.copy(pos);
        scene.add(mesh);
        const s = isCrit ? 0.5 : 0.25;
        entities.particles.push({
            mesh,
            velocity: new THREE.Vector3(
                (Math.random() - 0.5) * s,
                Math.random() * s,
                (Math.random() - 0.5) * s
            ),
            life: 40
        });
    }
}

export function checkEnemyDeath(enemy, state, entities, scene) {
    if (enemy.hp <= 0 && entities.enemies.includes(enemy)) {
        createParticles(enemy.mesh.position, CONFIG.colors.gem, 5, false, entities, scene);
        
        // Final Boss victory
        if (enemy.isFinalBoss) {
            state.finalBossDefeated = true;
            state.isRunning = false;
            document.exitPointerLock();
            const gameOverEl = document.getElementById('game-over');
            gameOverEl.style.background = 'rgba(0,100,0,0.8)';
            gameOverEl.querySelector('h1').innerText = 'VICTORY!';
            document.getElementById('final-stats').innerText = `Time: ${document.getElementById('time-display').innerText} | Kills: ${state.kills}`;
            gameOverEl.style.display = 'flex';
            
            // Cleanup mixer
            enemy.mesh.traverse(child => {
                if (child.userData.mixer) {
                    const idx = mixers.indexOf(child.userData.mixer);
                    if (idx > -1) mixers.splice(idx, 1);
                }
            });
            
            scene.remove(enemy.mesh);
            entities.enemies.splice(entities.enemies.indexOf(enemy), 1);
            return true;
        }
        
        if (enemy.isBoss) {
            spawnChest(enemy.mesh.position, null, entities, scene);
        } else {
            const roll = Math.random();
            if (roll < 0.001) {
                const types = ['magnet', 'bomb', 'battery'];
                const t = types[Math.floor(Math.random() * types.length)];
                const c = t === 'magnet' ? CONFIG.colors.magnet : (t === 'bomb' ? CONFIG.colors.bomb : CONFIG.colors.battery);
                const mesh = new THREE.Mesh(
                    new THREE.IcosahedronGeometry(0.5),
                    new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.5 })
                );
                mesh.position.copy(enemy.mesh.position);
                mesh.position.y = 1;
                scene.add(mesh);
                entities.powerups.push({ mesh, type: t, rotationSpeed: 0.02 });
            } else {
                spawnGem(enemy.mesh.position, 1, entities, scene);
            }
        }
        
        // Cleanup mixer
        enemy.mesh.traverse(child => {
            if (child.userData.mixer) {
                const idx = mixers.indexOf(child.userData.mixer);
                if (idx > -1) mixers.splice(idx, 1);
            }
        });
        
        scene.remove(enemy.mesh);
        entities.enemies.splice(entities.enemies.indexOf(enemy), 1);
        state.kills++;
        if (state.lifesteal > 0 && Math.random() < state.lifesteal) {
            state.hp = Math.min(state.maxHp, state.hp + 1);
        }
        updateHUD(state);
        return true;
    }
    return false;
}

export function updateEnemies(entities, state, playerMesh) {
    entities.enemies.forEach((e, i) => {
        const seek = new THREE.Vector3().subVectors(playerMesh.position, e.mesh.position).normalize();
        const sep = new THREE.Vector3();
        let count = 0;
        
        for (let k = 1; k <= Math.min(entities.enemies.length, 15); k++) {
            const other = entities.enemies[(i + k) % entities.enemies.length];
            if (other === e) continue;
            const distSq = e.mesh.position.distanceToSquared(other.mesh.position);
            const minDist = e.radius + other.radius;
            if (distSq < minDist * minDist) {
                const push = new THREE.Vector3().subVectors(e.mesh.position, other.mesh.position).normalize();
                push.divideScalar(Math.sqrt(distSq) + 0.1);
                sep.add(push);
                count++;
            }
        }
        
        const heading = seek.clone();
        if (count > 0) {
            sep.normalize().multiplyScalar(2.0);
            heading.add(sep);
        }
        heading.normalize().multiplyScalar(e.speed);
        const nextPos = e.mesh.position.clone().add(heading);
        if (!checkCityCollision(nextPos, state.cityBlocks)) {
            e.mesh.position.add(heading);
        }
        e.mesh.lookAt(playerMesh.position);
    });
}
