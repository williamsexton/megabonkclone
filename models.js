// Model loading and animation management
import * as THREE from 'https://cdn.skypack.dev/three@0.128.0';
import { GLTFLoader } from 'https://cdn.skypack.dev/three@0.128.0/examples/jsm/loaders/GLTFLoader.js';
import { SkeletonUtils } from 'https://cdn.skypack.dev/three@0.128.0/examples/jsm/utils/SkeletonUtils.js';
import { CONFIG, GAME_SPEED } from './config.js';

export const assets = { models: {}, animations: {} };
export const mixers = [];
export const previewScenes = {};

export function loadAssets() {
    const loader = new GLTFLoader();
    const debugEl = document.getElementById('model-loading-debug');
    const statusEl = document.getElementById('loading-status');
    let count = 0;
    const total = Object.keys(CONFIG.models).length;
    
    Object.keys(CONFIG.models).forEach(key => {
        const cfg = CONFIG.models[key];
        if (!cfg || !cfg.url) return;
        
        try {
            loader.load(cfg.url, (gltf) => {
                assets.models[key] = gltf.scene;
                assets.animations[key] = gltf.animations;
                gltf.scene.traverse(obj => {
                    if (obj.isMesh) {
                        obj.castShadow = true;
                        obj.receiveShadow = true;
                    }
                });
                debugEl.innerHTML += `<div>Loaded: ${key}</div>`;
                count++;
                if (count >= total && statusEl) {
                    statusEl.innerText = "ASSETS READY!";
                    statusEl.style.color = "#00ff00";
                    setupCharacterPreviews();
                }
            }, undefined, (error) => {
                console.warn(error);
                debugEl.innerHTML += `<div style="color:yellow">Failed: ${key}</div>`;
            });
        } catch (e) {
            console.warn(e);
        }
    });
}

export function setupModelAnimation(mesh, key) {
    if (assets.animations[key] && assets.animations[key].length > 0) {
        const mixer = new THREE.AnimationMixer(mesh);
        mixer.clipAction(assets.animations[key][0]).play();
        mixer.timeScale = GAME_SPEED;
        mixers.push(mixer);
        mesh.userData.mixer = mixer;
        return mixer;
    }
    return null;
}

export function centerAndScaleModel(model, scale) {
    model.position.set(0, 0, 0);
    model.rotation.set(0, 0, 0);
    model.scale.set(1, 1, 1);
    model.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    model.scale.set(scale, scale, scale);
    model.position.x = -center.x * scale;
    model.position.y = -box.min.y * scale;
    model.position.z = -center.z * scale;
    model.traverse(child => {
        if (child.isMesh && child.material) {
            child.material = child.material.clone();
            child.userData.origEmissive = child.material.emissive ? child.material.emissive.getHex() : 0x000000;
            child.userData.origColor = child.material.color ? child.material.color.getHex() : 0xffffff;
        }
    });
}

export function setupCharacterPreviews() {
    const charTypes = ['mage', 'tank', 'warrior', 'ranger'];
    const clock = new THREE.Clock();
    
    charTypes.forEach(charType => {
        const canvas = document.getElementById(`preview-${charType}`);
        const placeholder = document.getElementById(`placeholder-${charType}`);
        if (!canvas) return;
        
        const previewScene = new THREE.Scene();
        previewScene.background = new THREE.Color(0x050510);
        const previewCamera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
        previewCamera.position.set(0, 2, 5);
        previewCamera.lookAt(0, 1, 0);
        
        const previewRenderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
        previewRenderer.setSize(150, 150);
        
        previewScene.add(new THREE.AmbientLight(0xffffff, 0.8));
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
        dirLight.position.set(2, 3, 2);
        previewScene.add(dirLight);
        
        const modelKey = `player_${charType}`;
        if (assets.models[modelKey]) {
            const model = SkeletonUtils.clone(assets.models[modelKey]);
            const s = CONFIG.models[modelKey] ? CONFIG.models[modelKey].scale : 2;
            centerAndScaleModel(model, s * 0.8);
            model.position.y = 0;
            previewScene.add(model);
            
            const mixer = assets.animations[modelKey] && assets.animations[modelKey].length > 0 ?
                new THREE.AnimationMixer(model) : null;
            if (mixer) mixer.clipAction(assets.animations[modelKey][0]).play();
            
            previewScenes[charType] = {
                scene: previewScene,
                camera: previewCamera,
                renderer: previewRenderer,
                model,
                mixer,
                rotation: 0
            };
            canvas.style.display = 'block';
            placeholder.style.display = 'none';
        }
    });
    
    animatePreviews(clock);
}

function animatePreviews(clock) {
    requestAnimationFrame(() => animatePreviews(clock));
    const delta = clock.getDelta();
    Object.values(previewScenes).forEach(preview => {
        if (preview.mixer) preview.mixer.update(delta);
        preview.rotation += 0.005;
        preview.model.rotation.y = preview.rotation;
        preview.renderer.render(preview.scene, preview.camera);
    });
}
