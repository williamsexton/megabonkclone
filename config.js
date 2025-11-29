// Game Configuration and Constants

export const GAME_SPEED = 1.0;
export const ENEMY_SPEED_MULT = 1.6;

export const CONFIG = {
    baseSpawnRate: 12,
    camRadius: 12,
    camHeight: 6,
    colors: {
        gem: 0x00ffcc,
        chest: 0xffd700,
        projectile: 0xffff00,
        ground: 0x1a1a1a,
        grid: 0x333333,
        aoe: 0xff4400,
        boomerang: 0x00ff00,
        sword: 0xffffff,
        magnet: 0x0099ff,
        bomb: 0x111111,
        battery: 0x00ff00,
        fly: 0x0000ff
    },
    models: {
        // Player Models - One for each class
        player_mage: { url: 'https://ds3mod.s3.us-west-2.amazonaws.com/vinnieRun.glb', scale: 2 },
        player_tank: { url: 'https://ds3mod.s3.us-west-2.amazonaws.com/bomberrun.glb', scale: 2 },
        player_warrior: { url: 'https://ds3mod.s3.us-west-2.amazonaws.com/hostrun.glb', scale: 2 },
        player_ranger: { url: 'https://ds3mod.s3.us-west-2.amazonaws.com/hostessrun.glb', scale: 2 },
        
        // Enemy Models - One for each type
        enemy_type0: { url: 'https://ds3mod.s3.us-west-2.amazonaws.com/goonwalk1.glb', scale: 2.5 },
        enemy_type1: { url: 'https://ds3mod.s3.us-west-2.amazonaws.com/goonwalk2.glb', scale: 2.5 },
        enemy_type2: { url: 'https://ds3mod.s3.us-west-2.amazonaws.com/goonwalk3.glb', scale: 3.5 },
        enemy_type3: { url: 'https://ds3mod.s3.us-west-2.amazonaws.com/goonwalk4.glb', scale: 2.5 },
        
        // Boss Models
        enemy_boss: { url: 'https://ds3mod.s3.us-west-2.amazonaws.com/goonwalk5.glb', scale: 5 },
        enemy_final_boss: { url: 'https://ds3mod.s3.us-west-2.amazonaws.com/bosswalk.glb', scale: 8 }
    }
};

export const ENEMY_TYPES = [
    { id: 0, color: 0xff3333, hp: 15, speed: 0.04 * GAME_SPEED * ENEMY_SPEED_MULT, size: 1, geo: 'box', modelKey: 'enemy_type0' },
    { id: 1, color: 0x33ff33, hp: 10, speed: 0.07 * GAME_SPEED * ENEMY_SPEED_MULT, size: 0.8, geo: 'tetra', modelKey: 'enemy_type1' },
    { id: 2, color: 0x3333ff, hp: 45, speed: 0.025 * GAME_SPEED * ENEMY_SPEED_MULT, size: 1.5, geo: 'ico', modelKey: 'enemy_type2' },
    { id: 3, color: 0xffff33, hp: 25, speed: 0.05 * GAME_SPEED * ENEMY_SPEED_MULT, size: 1, geo: 'octa', modelKey: 'enemy_type3' }
];

export const UPGRADES = [
    { id: 'wand', type: 'weapon', title: 'Gun', desc: 'Fires bullets.', icon: '🔫' },
    { id: 'axe', type: 'weapon', title: 'Goonabomb', desc: 'Creates damaging fire zones.', icon: '💣' },
    { id: 'sword', type: 'weapon', title: 'Fist', desc: 'Punches in an arc.', icon: '👊' },
    { id: 'boomerang', type: 'weapon', title: 'Boomerang', desc: 'Returns to you.', icon: '🥚' },
    { id: 'chain_lightning', type: 'weapon', title: 'Chain Lightning', desc: 'Arcs between enemies.', icon: '⚡' },
    { id: 'shattering_star', type: 'weapon', title: 'Shattering Star', desc: 'Shatters into fragments.', icon: '⭐' },
    { id: 'iron_maiden', type: 'weapon', title: 'Iron Maiden', desc: 'Spawns spiked trap.', icon: '🔱' },
    { id: 'ember_whip', type: 'weapon', title: 'Ember Whip', desc: 'Fiery multi-hit whip.', icon: '🔥' },
    { id: 'binding_roots', type: 'weapon', title: 'Binding Roots', desc: 'Slows enemies over time.', icon: '🌿' },
    { id: 'meteor_shower', type: 'weapon', title: 'Meteor Shower', desc: 'Meteors from above.', icon: '☄️' },
    { id: 'drifting_fog', type: 'weapon', title: 'Drifting Fog', desc: 'Poison cloud zone.', icon: '🌫️' },
    { id: 'sad_onion', type: 'item', title: 'Sad Onion', desc: 'Fire Rate +20%', icon: '🧅' },
    { id: 'crickets_head', type: 'item', title: 'Cricket\'s Head', desc: 'Damage +50%', icon: '🐶' },
    { id: 'magic_mush', type: 'item', title: 'Magic Mushroom', desc: 'All Stats +10%', icon: '🍄' },
    { id: 'the_pact', type: 'item', title: 'The Pact', desc: 'Damage +20%, Fire Rate +10%', icon: '📜' },
    { id: 'pentagram', type: 'item', title: 'Pentagram', desc: 'Damage +30%', icon: '⭐' },
    { id: 'meat', type: 'item', title: 'Meat!', desc: 'HP +25, Damage +10%', icon: '🥩' },
    { id: 'growth_hormones', type: 'item', title: 'Growth Hormones', desc: 'Damage +15%, Speed +15%', icon: '💉' },
    { id: 'synthoil', type: 'item', title: 'Synthoil', desc: 'Damage +15%, Area +20%', icon: '⚫' },
    { id: 'wire_coat_hanger', type: 'item', title: 'Wire Coat Hanger', desc: 'Fire Rate +20%', icon: '〰️' },
    { id: '20_20', type: 'item', title: '20/20', desc: 'Double Shot', icon: '👓' },
    { id: 'mutant_spider', type: 'item', title: 'Mutant Spider', desc: 'Quad Shot, Fire Rate Down', icon: '🕷️' },
    { id: 'the_halo', type: 'item', title: 'The Halo', desc: 'All Stats +5%', icon: '😇' },
    { id: 'lucky_foot', type: 'item', title: 'Lucky Foot', desc: 'Crit Chance +15%', icon: '🦶' },
    { id: 'polyphemus', type: 'item', title: 'Polyphemus', desc: 'Mega Damage, Slow Fire', icon: '👁️‍🗨️' },
    { id: 'sacred_heart', type: 'item', title: 'Sacred Heart', desc: 'Mega Damage, Homing', icon: '❤️‍🔥' },
    { id: 'proptosis', type: 'item', title: 'Proptosis', desc: 'Damage +50%, Area -20%', icon: '👀' },
    { id: 'holy_mantle', type: 'item', title: 'Holy Mantle', desc: 'Shield +50', icon: '🛡️' },
    { id: 'the_wafer', type: 'item', title: 'The Wafer', desc: 'Halves Damage', icon: '🍘' },
    { id: 'bloody_lust', type: 'item', title: 'Bloody Lust', desc: 'Berserk on hit', icon: '🩸' },
    { id: 'guppys_head', type: 'item', title: 'Guppy\'s Head', desc: 'Spawns Flies', icon: '🐱' },
    { id: 'charm_vampire', type: 'item', title: 'Charm of Vampire', desc: 'Heals on kill', icon: '🦇' },
    { id: 'magneto', type: 'item', title: 'Magneto', desc: 'Pickup Range +50%', icon: '🧲' },
    { id: 'leo', type: 'item', title: 'Leo', desc: 'Stomp Damage', icon: '🦁' }
];
