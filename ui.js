// UI management and updates
import { UPGRADES } from './config.js';

export function updateHUD(state) {
    document.getElementById('level-display').innerText = `LVL ${state.level}`;
    document.getElementById('kill-display').innerText = `KILLS: ${state.kills}`;
    document.getElementById('xp-bar-fill').style.width = (state.xp / state.xpToNextLevel * 100) + '%';
}

export function updateInventory(state) {
    const weaponsContainer = document.getElementById('inventory-weapons');
    const itemsContainer = document.getElementById('inventory-items');
    weaponsContainer.innerHTML = '';
    itemsContainer.innerHTML = '';
    
    // Show weapons
    UPGRADES.filter(u => u.type === 'weapon' && state.weapons[u.id] && state.weapons[u.id].level > 0).forEach(w => {
        const div = document.createElement('div');
        div.className = 'inv-item';
        div.innerHTML = `<span class="inv-item-icon">${w.icon}</span><span class="inv-item-level">Lv${state.weapons[w.id].level}</span>`;
        weaponsContainer.appendChild(div);
    });
    
    // Show items
    if (!state.items) state.items = {};
    UPGRADES.filter(u => u.type === 'item' && state.items[u.id]).forEach(item => {
        const div = document.createElement('div');
        div.className = 'inv-item';
        div.innerHTML = `<span class="inv-item-icon">${item.icon}</span>`;
        itemsContainer.appendChild(div);
    });
    
    // Show/hide inventory based on whether player has anything
    const hasItems = weaponsContainer.children.length > 0 || itemsContainer.children.length > 0;
    document.getElementById('inventory').style.display = hasItems ? 'block' : 'none';
}

export function updateBossHealth(entities) {
    const boss = entities.enemies.find(e => e.isBoss || e.isFinalBoss);
    const bossContainer = document.getElementById('boss-health-container');
    
    if (boss) {
        bossContainer.style.display = 'block';
        const bossName = document.getElementById('boss-name');
        const bossBar = document.getElementById('boss-health-bar-fill');
        const bossText = document.getElementById('boss-health-text');
        
        bossName.innerText = boss.isFinalBoss ? 'FINAL BOSS' : 'BOSS';
        const healthPercent = (boss.hp / boss.maxHp) * 100;
        bossBar.style.width = healthPercent + '%';
        bossText.innerText = `${Math.ceil(boss.hp)} / ${Math.ceil(boss.maxHp)}`;
    } else {
        bossContainer.style.display = 'none';
    }
}

export function showUpgradeModal(state, isChest, applyUpgradeCallback) {
    state.isPaused = true;
    document.exitPointerLock();
    const container = document.getElementById('upgrade-cards');
    container.innerHTML = '';
    const title = document.getElementById('modal-title');
    const subtitle = document.getElementById('modal-subtitle');
    
    const isWeaponLevel = state.level % 5 === 0;
    
    if (isChest) {
        title.innerText = "TREASURE!";
        subtitle.innerText = "Choose a Weapon";
    } else if (isWeaponLevel) {
        title.innerText = "LEVEL UP!";
        subtitle.innerText = "Choose a Weapon";
    } else {
        title.innerText = "LEVEL UP!";
        subtitle.innerText = "Choose an upgrade";
    }

    let pool = [...UPGRADES];
    if (isChest || isWeaponLevel) {
        pool = pool.filter(u => u.type === 'weapon');
    }

    const picks = [];
    while (picks.length < Math.min(3, pool.length)) {
        const p = pool[Math.floor(Math.random() * pool.length)];
        if (!picks.includes(p)) picks.push(p);
    }
    
    picks.forEach(opt => {
        const div = document.createElement('div');
        div.className = 'upgrade-card';
        let tag = '';
        if (opt.type === 'weapon') {
            const lvl = state.weapons[opt.id].level;
            tag = lvl === 0 ? '<span class="new-tag">NEW!</span>' : `<span class="new-tag" style="background:#444">LVL ${lvl + 1}</span>`;
        }
        div.innerHTML = `<div class="upgrade-icon">${opt.icon}</div>${tag}<div class="upgrade-title">${opt.title}</div><div class="upgrade-desc">${opt.desc}</div>`;
        div.onclick = () => applyUpgradeCallback(opt);
        container.appendChild(div);
    });
    document.getElementById('modal-overlay').style.display = 'flex';
}

export function applyUpgrade(opt, state, renderer) {
    if (opt.type === 'weapon') {
        state.weapons[opt.id].level++;
        state.weapons[opt.id].cooldown = 0;
    } else {
        // Binding of Isaac Item Logic
        switch (opt.id) {
            case 'sad_onion': state.cooldownMult *= 0.8; break;
            case 'crickets_head': state.damageMult += 0.5; break;
            case 'magic_mush': state.damageMult += 0.1; state.areaMult += 0.1; state.cooldownMult *= 0.95; state.maxHp += 10; state.hp += 10; break;
            case 'the_pact': state.damageMult += 0.2; state.cooldownMult *= 0.9; break;
            case 'pentagram': state.damageMult += 0.3; break;
            case 'meat': state.maxHp += 25; state.hp += 25; state.damageMult += 0.1; break;
            case 'growth_hormones': state.damageMult += 0.15; state.moveSpeed *= 1.15; break;
            case 'synthoil': state.damageMult += 0.15; state.areaMult += 0.2; break;
            case 'wire_coat_hanger': state.cooldownMult *= 0.8; break;
            case '20_20': state.projectileCount += 1; break;
            case 'mutant_spider': state.projectileCount += 3; state.cooldownMult *= 1.3; break;
            case 'the_halo': state.damageMult += 0.05; state.areaMult += 0.05; state.cooldownMult *= 0.95; state.moveSpeed *= 1.05; break;
            case 'lucky_foot': state.critChance += 0.15; break;
            case 'polyphemus': state.damageMult += 1.0; state.cooldownMult *= 1.5; break;
            case 'sacred_heart': state.damageMult += 0.5; state.cooldownMult *= 1.2; state.areaMult += 0.2; break;
            case 'proptosis': state.damageMult += 0.5; state.areaMult *= 0.8; break;
            case 'holy_mantle': state.maxShield += 50; state.shield += 50; break;
            case 'the_wafer': state.damageReduction = 1; break;
            case 'bloody_lust': state.bloodyLustStacks = 0; break;
            case 'guppys_head': state.guppyChance = (state.guppyChance || 0) + 0.15; break;
            case 'charm_vampire': state.lifesteal += 0.05; break;
            case 'magneto': state.pickupRange *= 1.5; break;
            case 'leo': state.contactDamage += 5; break;
        }
    }
    
    if (opt.type === 'item') {
        if (!state.items) state.items = {};
        state.items[opt.id] = true;
    }
    
    document.getElementById('modal-overlay').style.display = 'none';
    state.isPaused = false;
    renderer.domElement.requestPointerLock();
    updateHUD(state);
    updateInventory(state);
}
