export const physicalTypes = [
  "armor",
  "weapon",
  "shield",
  "equipment",
  "consumable",
  "treasure",
  "backpack",
];

export const materialStats = {
  paper: {
    hd: 0,
    hp: 1,
  },
  "cloth-thin": {
    hd: 0,
    hp: 1,
  },
  "glass-thin": {
    hd: 0,
    hp: 1,
  },
  cloth: {
    hd: 1,
    hp: 4,
  },
  glass: {
    hd: 1,
    hp: 4,
  },
  "glass-structure": {
    hd: 2,
    hp: 8,
  },
  "leather-thin": {
    hd: 2,
    hp: 8,
  },
  "rope-thin": {
    hd: 2,
    hp: 8,
  },
  "wood-thin": {
    hd: 3,
    hp: 12,
  },
  leather: {
    hd: 4,
    hp: 16,
  },
  rope: {
    hd: 4,
    hp: 16,
  },
  "stone-thin": {
    hd: 5,
    hp: 16,
  },
  "iron-thin": {
    hd: 5,
    hp: 20,
  },
  wood: {
    hd: 5,
    hp: 20,
  },
  stone: {
    hd: 7,
    hp: 28,
  },
  iron: {
    hd: 9,
    hp: 36,
  },
  "wood-structure": {
    hd: 10,
    hp: 40,
  },
  "stone-structure": {
    hd: 14,
    hp: 56,
  },
  "iron-structure": {
    hd: 18,
    hp: 72,
  },
};

export const armorPropertyMap = {
  acidResistant: {
    type: "resistance",
    element: "acid",
    value: -5,
  },
  coldResistant: {
    type: "resistance",
    element: "cold",
    value: -5,
  },
  electricityResistant: {
    type: "resistance",
    element: "electricity",
    value: -5,
  },
  fireResistant: {
    type: "resistance",
    element: "fire",
    value: -5,
  },
  sonicResistant: {
    type: "resistance",
    element: "sonic",
    value: -5,
  },
  shadow: {
    type: "skill",
    skill: "stealth",
    value: -1,
  },
  greaterShadow: {
    type: "skill",
    skill: "stealth",
    value: -2,
  },
  majorShadow: {
    type: "skill",
    skill: "stealth",
    value: -3,
  },
  slick: {
    type: "skill",
    skill: "acrobatics",
    value: -1,
  },
  greaterSlick: {
    type: "skill",
    skill: "acrobatics",
    value: -2,
  },
  majorSlick: {
    type: "skill",
    skill: "acrobatics",
    value: -3,
  },
};

export const weaponPropertyMap = {
  flaming: { element: "fire" },
  frost: { element: "cold" },
  shock: { element: "electricity" },
  corrosive: { element: "acid" },
  thundering: { element: "sonic" },
  holy: { element: "spirit" },
  unholy: { element: "spirit" },
};
