// Weapon systems - all weapon firing logic
import * as THREE from 'https://cdn.skypack.dev/three@0.128.0';
import { CONFIG, GAME_SPEED } from './config.js';
import { createParticles, checkEnemyDeath, spawnFly } from './entities.js';

export function fireWand(state, entities, scene, playerMesh) {
    const count = 1 + state.projectileCount + Math.floor((state.weapons.wand.level - 1) / 2);
    
    // Find target once for this volley
    let target = null, minDist = 1000;
    entities.enemies.forEach(e => {
        const d = playerMesh.position.distanceTo(e.mesh.position);
        if (d < 25 && d < minDist) { minDist = d; target = e; }
    });
    if (!target) return;
    
    // Calculate direction once
    const targetPos = target.mesh.position.clone();
    const baseDir = new THREE.Vector3().subVectors(targetPos, playerMesh.position).normalize();
    
    for (let i = 0; i < count; i++) {
        setTimeout(() => {
            const mesh = new THREE.Mesh(
                new THREE.SphereGeometry(0.3 * state.areaMult),
                new THREE.MeshBasicMaterial({ color: CONFIG.colors.projectile })
            );
            mesh.position.copy(playerMesh.position);
            mesh.position.y = 1;
            scene.add(mesh);
            
            // Use the pre-calculated direction
            const dir = baseDir.clone();
            entities.projectiles.push({
                type: 'wand',
                mesh,
                velocity: dir.multiplyScalar(0.3),
                damage: (15 + state.weapons.wand.level * 5) * state.damageMult,
                life: 120,
                bounces: Math.max(0, state.weapons.wand.level - 1),
                hitList: []
            });
        }, i * 80);
    }
}

export function fireAxe(state, entities, scene, playerMesh) {
    const count = 1 + state.projectileCount + Math.floor((state.weapons.axe.level - 1) / 2);
    for (let i = 0; i < count; i++) {
        const mesh = new THREE.Mesh(
            new THREE.CylinderGeometry(0.3, 0.3, 0.6),
            new THREE.MeshStandardMaterial({ color: 0xff8800 })
        );
        mesh.position.copy(playerMesh.position);
        mesh.position.y = 2;
        scene.add(mesh);
        const a = Math.random() * Math.PI * 2;
        const s = 0.15 + Math.random() * 0.1;
        entities.projectiles.push({
            type: 'axe',
            mesh,
            velocity: new THREE.Vector3(Math.cos(a) * s, 0.6, Math.sin(a) * s),
            gravity: 0.015,
            damage: 0,
            areaScale: 1 + state.weapons.axe.level * 0.15,
            life: 200
        });
    }
}

export function fireSword(state, entities, scene, playerMesh, camera) {
    const fwd = new THREE.Vector3();
    camera.getWorldDirection(fwd);
    fwd.y = 0;
    fwd.normalize();
    const angle = Math.atan2(fwd.x, fwd.z);
    
    const coneAngle = Math.acos(0.5) * 2;
    const mesh = new THREE.Mesh(
        new THREE.CircleGeometry(14 * state.areaMult, 32, -coneAngle / 2, coneAngle),
        new THREE.MeshBasicMaterial({ color: CONFIG.colors.sword, side: THREE.DoubleSide, transparent: true, opacity: 0.6 })
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.copy(playerMesh.position);
    mesh.position.y = 1;
    mesh.rotation.z = angle - Math.PI / 2;
    scene.add(mesh);
    
    const innerMesh = new THREE.Mesh(
        new THREE.CircleGeometry(3.5 * state.areaMult, 32),
        new THREE.MeshBasicMaterial({ color: CONFIG.colors.sword, side: THREE.DoubleSide, transparent: true, opacity: 0.4 })
    );
    innerMesh.rotation.x = -Math.PI / 2;
    innerMesh.position.copy(playerMesh.position);
    innerMesh.position.y = 1;
    scene.add(innerMesh);
    
    setTimeout(() => { scene.remove(mesh); scene.remove(innerMesh); }, 150);
    
    const r = 14 * state.areaMult;
    const dmg = (40 + state.weapons.sword.level * 15) * state.damageMult;
    const innerRadius = 3.5 * state.areaMult;
    
    entities.enemies.forEach(e => {
        const dist = playerMesh.position.distanceTo(e.mesh.position);
        const dir = new THREE.Vector3().subVectors(e.mesh.position, playerMesh.position).normalize();
        const dotProduct = fwd.dot(dir);
        
        if ((dist < innerRadius) || (dist < r && dotProduct > 0.5)) {
            e.hp -= dmg;
            if (state.lifesteal > 0 && Math.random() < state.lifesteal) {
                state.hp = Math.min(state.maxHp, state.hp + 1);
            }
            checkEnemyDeath(e, state, entities, scene);
        }
    });
}

export function fireBoomerang(state, entities, scene, playerMesh) {
    const count = 1 + state.projectileCount + Math.floor((state.weapons.boomerang.level - 1) / 2);
    let target = null, minDist = 1000;
    entities.enemies.forEach(e => {
        const d = playerMesh.position.distanceTo(e.mesh.position);
        if (d < 25 && d < minDist) { minDist = d; target = e; }
    });
    const base = target ?
        new THREE.Vector3().subVectors(target.mesh.position, playerMesh.position).normalize() :
        new THREE.Vector3(1, 0, 0);
    
    for (let i = 0; i < count; i++) {
        const mesh = new THREE.Mesh(
            new THREE.BoxGeometry(1 * state.areaMult, 0.2, 0.2),
            new THREE.MeshBasicMaterial({ color: CONFIG.colors.boomerang })
        );
        mesh.position.copy(playerMesh.position);
        mesh.position.y = 1;
        scene.add(mesh);
        const dir = base.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), (i - (count - 1) / 2) * 0.5);
        entities.projectiles.push({
            type: 'boomerang',
            mesh,
            velocity: dir.multiplyScalar(0.35),
            damage: (20 + state.weapons.boomerang.level * 6) * state.damageMult,
            life: 300,
            returnState: 0,
            returnTimer: 80
        });
    }
}

export function fireChainLightning(state, entities, scene, playerMesh) {
    let target = null, d = 1000;
    entities.enemies.forEach(e => {
        const dist = playerMesh.position.distanceTo(e.mesh.position);
        if (dist < 25 && dist < d) { d = dist; target = e; }
    });
    if (!target) return;
    
    const group = new THREE.Group();
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.4), new THREE.MeshBasicMaterial({ color: 0x00ffff }));
    group.add(core);
    for (let i = 0; i < 3; i++) {
        const ring = new THREE.Mesh(
            new THREE.TorusGeometry(0.5 + i * 0.2, 0.05, 8, 16),
            new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.6 })
        );
        group.add(ring);
    }
    group.position.copy(playerMesh.position);
    group.position.y = 1;
    scene.add(group);
    
    const dmg = 25 * state.damageMult;
    const jumps = 3 + Math.floor(state.weapons.chain_lightning.level / 2);
    target.hp -= dmg;
    createParticles(target.mesh.position, 0x00ffff, 8, false, entities, scene);
    checkEnemyDeath(target, state, entities, scene);
    
    let prev = target, hits = [target];
    for (let j = 0; j < jumps; j++) {
        let next = null, minD = 15;
        entities.enemies.forEach(e => {
            if (hits.includes(e)) return;
            const d2 = prev.mesh.position.distanceTo(e.mesh.position);
            if (d2 < minD) { minD = d2; next = e; }
        });
        if (!next) break;
        for (let p = 0; p < 5; p++) {
            createParticles(
                new THREE.Vector3().lerpVectors(prev.mesh.position, next.mesh.position, p / 5),
                0x00ffff, 2, false, entities, scene
            );
        }
        next.hp -= dmg * 0.8;
        createParticles(next.mesh.position, 0x00ffff, 5, false, entities, scene);
        checkEnemyDeath(next, state, entities, scene);
        hits.push(next);
        prev = next;
    }
    setTimeout(() => scene.remove(group), 150);
}

export function fireShatteringStar(state, entities, scene, playerMesh) {
    let target = null, d = 1000;
    entities.enemies.forEach(e => {
        const dist = playerMesh.position.distanceTo(e.mesh.position);
        if (dist < 30 && dist < d) { d = dist; target = e; }
    });
    if (!target) return;
    
    const mesh = new THREE.Mesh(
        new THREE.TetrahedronGeometry(0.5),
        new THREE.MeshBasicMaterial({ color: 0xffff00 })
    );
    mesh.position.copy(playerMesh.position);
    mesh.position.y = 1;
    scene.add(mesh);
    const vel = new THREE.Vector3().subVectors(target.mesh.position, playerMesh.position).normalize().multiplyScalar(0.4);
    entities.projectiles.push({
        type: 'shattering_star',
        mesh,
        velocity: vel,
        damage: 30 * state.damageMult,
        life: 150,
        shattered: false
    });
}

export function fireIronMaiden(state, entities, scene, playerMesh) {
    const a = Math.random() * Math.PI * 2;
    const d = 20 + Math.random() * 15;
    const pos = new THREE.Vector3(
        playerMesh.position.x + Math.cos(a) * d,
        0.5,
        playerMesh.position.z + Math.sin(a) * d
    );
    const group = new THREE.Group();
    const base = new THREE.Mesh(
        new THREE.CylinderGeometry(2, 2, 1, 8),
        new THREE.MeshStandardMaterial({ color: 0x666666 })
    );
    group.add(base);
    for (let i = 0; i < 8; i++) {
        const spike = new THREE.Mesh(
            new THREE.ConeGeometry(0.2, 1, 4),
            new THREE.MeshStandardMaterial({ color: 0x888888 })
        );
        const angle = i * (Math.PI * 2 / 8);
        spike.position.set(Math.cos(angle) * 1.8, 1, Math.sin(angle) * 1.8);
        spike.rotation.z = Math.PI;
        group.add(spike);
    }
    group.position.copy(pos);
    scene.add(group);
    entities.aoeZones.push({
        mesh: group,
        radius: 2.5,
        damage: 100 * state.damageMult,
        life: 300,
        tickRate: 10,
        tickTimer: 0,
        trap: true
    });
    createParticles(pos, 0xff0000, 10, false, entities, scene);
}

export function fireEmberWhip(state, entities, scene, playerMesh) {
    let target = null, d = 0;
    entities.enemies.forEach(e => {
        const dist = playerMesh.position.distanceTo(e.mesh.position);
        if (dist < 30 && dist > d) { d = dist; target = e; }
    });
    if (!target) return;
    
    const dir = new THREE.Vector3().subVectors(target.mesh.position, playerMesh.position).normalize();
    const group = new THREE.Group();
    const whip = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.3, 15 * state.areaMult),
        new THREE.MeshBasicMaterial({ color: 0xff4400 })
    );
    group.add(whip);
    for (let i = 0; i < 8; i++) {
        const flame = new THREE.Mesh(
            new THREE.TetrahedronGeometry(0.3),
            new THREE.MeshBasicMaterial({ color: 0xff8800 })
        );
        flame.position.z = i * -2;
        group.add(flame);
    }
    group.position.copy(playerMesh.position);
    group.position.y = 1;
    const angle = Math.atan2(dir.x, dir.z);
    group.rotation.y = angle;
    scene.add(group);
    
    const dmg = 20 * state.damageMult;
    entities.enemies.forEach(e => {
        const toE = new THREE.Vector3().subVectors(e.mesh.position, playerMesh.position);
        if (toE.normalize().dot(dir) > 0.9 && toE.length() < 15) {
            e.hp -= dmg;
            createParticles(e.mesh.position, 0xff4400, 5, false, entities, scene);
            checkEnemyDeath(e, state, entities, scene);
        }
    });
    setTimeout(() => scene.remove(group), 200);
}

export function fireBindingRoots(state, entities, scene) {
    if (entities.enemies.length === 0) return;
    const target = entities.enemies[Math.floor(Math.random() * entities.enemies.length)];
    createParticles(target.mesh.position, 0xffaa00, 5, false, entities, scene);
    setTimeout(() => {
        if (!entities.enemies.includes(target)) return;
        const group = new THREE.Group();
        const base = new THREE.Mesh(
            new THREE.CylinderGeometry(1.5, 1.5, 0.2, 16),
            new THREE.MeshBasicMaterial({ color: 0x33aa33, transparent: true, opacity: 0.7 })
        );
        group.add(base);
        for (let i = 0; i < 6; i++) {
            const vine = new THREE.Mesh(
                new THREE.CylinderGeometry(0.1, 0.05, 2, 8),
                new THREE.MeshBasicMaterial({ color: 0x228822 })
            );
            const angle = i * (Math.PI * 2 / 6);
            vine.position.set(Math.cos(angle) * 1, 1, Math.sin(angle) * 1);
            vine.rotation.x = Math.PI / 6;
            group.add(vine);
        }
        group.position.copy(target.mesh.position);
        group.position.y = 0.1;
        scene.add(group);
        target.speed *= 0.5;
        target.rooted = true;
        entities.aoeZones.push({
            mesh: group,
            radius: 1.5,
            damage: 8 * state.damageMult,
            life: 300,
            tickRate: 30,
            tickTimer: 0,
            root: true,
            target
        });
    }, 60);
}

export function fireMeteorShower(state, entities, scene, playerMesh) {
    const cnt = 3 + Math.floor(state.weapons.meteor_shower.level / 2);
    for (let i = 0; i < cnt; i++) {
        setTimeout(() => {
            const a = Math.random() * Math.PI * 2;
            const d = 30 + Math.random() * 20;
            const gPos = new THREE.Vector3(
                playerMesh.position.x + Math.cos(a) * d,
                0.1,
                playerMesh.position.z + Math.sin(a) * d
            );
            const indicator = new THREE.Mesh(
                new THREE.RingGeometry(2.5, 3, 32),
                new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.6 })
            );
            indicator.rotation.x = -Math.PI / 2;
            indicator.position.copy(gPos);
            scene.add(indicator);
            setTimeout(() => scene.remove(indicator), 1500);
            
            const tPos = new THREE.Vector3(gPos.x, 30, gPos.z);
            const group = new THREE.Group();
            const core = new THREE.Mesh(
                new THREE.SphereGeometry(0.8),
                new THREE.MeshBasicMaterial({ color: 0xff6600 })
            );
            group.add(core);
            const trail = new THREE.Mesh(
                new THREE.ConeGeometry(0.4, 2, 8),
                new THREE.MeshBasicMaterial({ color: 0xff8800, transparent: true, opacity: 0.6 })
            );
            trail.rotation.x = Math.PI;
            trail.position.y = 1.5;
            group.add(trail);
            group.position.copy(tPos);
            scene.add(group);
            entities.projectiles.push({
                type: 'meteor',
                mesh: group,
                velocity: new THREE.Vector3(0, -0.8, 0),
                damage: 40 * state.damageMult,
                life: 100,
                aoeRadius: 3 * state.areaMult
            });
        }, i * 100);
    }
}

export function fireDriftingFog(state, entities, scene, playerMesh) {
    const pos = playerMesh.position.clone();
    pos.x += Math.random() * 10 - 5;
    pos.z += Math.random() * 10 - 5;
    const group = new THREE.Group();
    const fog = new THREE.Mesh(
        new THREE.CylinderGeometry(4 * state.areaMult, 4 * state.areaMult, 2, 16),
        new THREE.MeshBasicMaterial({ color: 0x669966, transparent: true, opacity: 0.4 })
    );
    group.add(fog);
    for (let i = 0; i < 12; i++) {
        const particle = new THREE.Mesh(
            new THREE.SphereGeometry(0.2),
            new THREE.MeshBasicMaterial({ color: 0x88cc88, transparent: true, opacity: 0.5 })
        );
        particle.position.set((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 1.5, (Math.random() - 0.5) * 6);
        group.add(particle);
    }
    group.position.copy(pos);
    group.position.y = 1;
    scene.add(group);
    const vel = new THREE.Vector3((Math.random() - 0.5) * 0.05, 0, (Math.random() - 0.5) * 0.05);
    entities.aoeZones.push({
        mesh: group,
        radius: 4 * state.areaMult,
        damage: 6 * state.damageMult,
        life: 600,
        tickRate: 20,
        tickTimer: 0,
        fog: true,
        velocity: vel
    });
}
