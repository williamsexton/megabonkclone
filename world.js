// World generation - textures, city, sky
import * as THREE from 'https://cdn.skypack.dev/three@0.128.0';

export function createAsphaltTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#333';
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 2000; i++) {
        ctx.fillStyle = Math.random() > 0.5 ? '#3a3a3a' : '#2a2a2a';
        ctx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
    }
    ctx.fillStyle = '#cc9900';
    ctx.fillRect(250, 0, 4, 512);
    ctx.fillRect(258, 0, 4, 512);
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(20, 20);
    return texture;
}

export function createBuildingTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#3a2e2a';
    ctx.fillRect(0, 0, 256, 512);
    ctx.fillStyle = '#111';
    ctx.fillRect(8, 8, 240, 496);
    ctx.fillStyle = '#553322';
    ctx.fillRect(16, 16, 224, 480);
    ctx.fillStyle = '#ffffaa';
    for (let y = 40; y < 480; y += 80) {
        if (Math.random() > 0.3) ctx.fillRect(40, y, 60, 48);
        if (Math.random() > 0.3) ctx.fillRect(152, y, 60, 48);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = true;
    return texture;
}

export function createGrassTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#1a4011';
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 4000; i++) {
        ctx.fillStyle = Math.random() > 0.5 ? '#2a5021' : '#15300e';
        ctx.fillRect(Math.random() * 512, Math.random() * 512, 3, 3);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 4);
    return texture;
}

export function createRoadTexture(vertical = false) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#222';
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 1000; i++) {
        ctx.fillStyle = Math.random() > 0.5 ? '#2a2a2a' : '#1a1a1a';
        ctx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
    }
    ctx.fillStyle = '#cc9900';
    if (vertical) {
        ctx.fillRect(250, 0, 4, 512);
        ctx.fillRect(258, 0, 4, 512);
    } else {
        ctx.fillRect(0, 250, 512, 4);
        ctx.fillRect(0, 258, 512, 4);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
}

export function createSkyDome(scene) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#050510');
    gradient.addColorStop(1, '#1a1a3a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 512);
    ctx.fillStyle = 'rgba(50,50,80,0.3)';
    for (let i = 0; i < 100; i++) {
        ctx.beginPath();
        ctx.arc(Math.random() * 512, Math.random() * 256, 20 + Math.random() * 40, 0, Math.PI * 2);
        ctx.fill();
    }
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.MeshBasicMaterial({ map: texture, side: THREE.BackSide, fog: false });
    scene.add(new THREE.Mesh(new THREE.SphereGeometry(400, 32, 32), material));
}

export function generateCity(scene, cityBlocks) {
    const buildTex = createBuildingTexture();
    const buildMat = new THREE.MeshStandardMaterial({ map: buildTex, roughness: 0.9 });
    const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.8 });
    const roadVMat = new THREE.MeshStandardMaterial({ map: createRoadTexture(true), roughness: 0.6 });
    const roadHMat = new THREE.MeshStandardMaterial({ map: createRoadTexture(false), roughness: 0.6 });
    const grassMat = new THREE.MeshStandardMaterial({ map: createGrassTexture(), roughness: 1.0 });
    const dirtMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 1.0 });

    const blockSize = 40;
    const streetWidth = 20;
    const citySize = 5;
    const unit = blockSize + streetWidth;

    for (let x = -citySize; x <= citySize; x++) {
        for (let z = -citySize; z <= citySize; z++) {
            const posX = x * unit;
            const posZ = z * unit;

            // Center park area
            if (Math.abs(x) <= 1 && Math.abs(z) <= 1) {
                const grass = new THREE.Mesh(new THREE.PlaneGeometry(unit, unit), grassMat);
                grass.rotation.x = -Math.PI / 2;
                grass.position.set(posX, 0.05, posZ);
                grass.receiveShadow = true;
                scene.add(grass);

                // Dirt paths
                if (x === 0 || z === 0) {
                    const pathW = 8;
                    if (x === 0) {
                        const p = new THREE.Mesh(new THREE.PlaneGeometry(pathW, unit), dirtMat);
                        p.rotation.x = -Math.PI / 2;
                        p.position.set(posX, 0.06, posZ);
                        p.receiveShadow = true;
                        scene.add(p);
                    }
                    if (z === 0) {
                        const p = new THREE.Mesh(new THREE.PlaneGeometry(unit, pathW), dirtMat);
                        p.rotation.x = -Math.PI / 2;
                        p.position.set(posX, 0.065, posZ);
                        p.receiveShadow = true;
                        scene.add(p);
                    }
                }

                // Fountain in center
                if (x === 0 && z === 0) {
                    const fBase = new THREE.Mesh(new THREE.CylinderGeometry(5, 5, 1, 16), new THREE.MeshStandardMaterial({ color: 0x888888 }));
                    fBase.position.set(0, 0.5, 0);
                    fBase.castShadow = true;
                    fBase.receiveShadow = true;
                    scene.add(fBase);
                    const fPole = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 3, 8), new THREE.MeshStandardMaterial({ color: 0x888888 }));
                    fPole.position.set(0, 2, 0);
                    fPole.castShadow = true;
                    scene.add(fPole);
                    const fTop = new THREE.Mesh(new THREE.TorusGeometry(2, 0.5, 8, 16), new THREE.MeshStandardMaterial({ color: 0x888888 }));
                    fTop.rotation.x = Math.PI / 2;
                    fTop.position.set(0, 3, 0);
                    scene.add(fTop);
                    const water = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 0.8, 16), new THREE.MeshBasicMaterial({ color: 0x33ccff }));
                    water.position.set(0, 0.8, 0);
                    scene.add(water);
                    cityBlocks.push({ minX: -3, maxX: 3, minZ: -3, maxZ: 3 });
                }
                continue;
            }

            // Buildings
            const h = 20 + Math.random() * 40;
            const mesh = new THREE.Mesh(new THREE.BoxGeometry(blockSize, h, blockSize), buildMat);
            mesh.position.set(posX, h / 2, posZ);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            scene.add(mesh);

            // Sidewalks
            const swGeo = new THREE.BoxGeometry(blockSize + 4, 0.5, blockSize + 4);
            const swMesh = new THREE.Mesh(swGeo, sidewalkMat);
            swMesh.position.set(posX, 0.25, posZ);
            swMesh.receiveShadow = true;
            scene.add(swMesh);

            cityBlocks.push({
                minX: posX - blockSize / 2 - 2,
                maxX: posX + blockSize / 2 + 2,
                minZ: posZ - blockSize / 2 - 2,
                maxZ: posZ + blockSize / 2 + 2
            });
        }
    }

    // Vertical roads
    for (let x = -citySize; x <= citySize; x++) {
        const roadX = x * unit + unit / 2;
        const road = new THREE.Mesh(new THREE.PlaneGeometry(10, unit * (citySize * 2 + 1)), roadVMat);
        road.rotation.x = -Math.PI / 2;
        road.position.set(roadX, 0.04, 0);
        road.receiveShadow = true;
        scene.add(road);
    }

    // Horizontal roads
    for (let z = -citySize; z <= citySize; z++) {
        const roadZ = z * unit + unit / 2;
        const road = new THREE.Mesh(new THREE.PlaneGeometry(unit * (citySize * 2 + 1), 10), roadHMat);
        road.rotation.x = -Math.PI / 2;
        road.position.set(0, 0.045, roadZ);
        road.receiveShadow = true;
        scene.add(road);
    }
}

export function checkCityCollision(pos, cityBlocks) {
    for (let block of cityBlocks) {
        if (pos.x > block.minX && pos.x < block.maxX && pos.z > block.minZ && pos.z < block.maxZ) {
            return true;
        }
    }
    return false;
}
