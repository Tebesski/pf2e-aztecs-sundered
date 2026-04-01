export const physicalTypes = [
   "armor",
   "weapon",
   "equipment",
   "consumable",
   "treasure",
   "backpack",
]

export const materialStats = {
   paper: {
      name: "Paper",
      hd: 0,
      hp: 1,
      examples: "Book pages, paper fan, scroll",
   },
   "cloth-thin": {
      name: "Thin cloth",
      hd: 0,
      hp: 1,
      examples: "Kite, silk dress, undershirt",
   },
   "glass-thin": {
      name: "Thin glass",
      hd: 0,
      hp: 1,
      examples: "Bottle, spectacles, window pane",
   },
   cloth: {
      name: "Cloth",
      hd: 1,
      hp: 4,
      examples: "Cloth armor, heavy jacket, sack, tent",
   },
   glass: {
      name: "Glass",
      hd: 1,
      hp: 4,
      examples: "Glass block, glass table, heavy vase",
   },
   "glass-structure": {
      name: "Glass structure",
      hd: 2,
      hp: 8,
      examples: "Glass block wall",
   },
   "leather-thin": {
      name: "Thin leather",
      hd: 2,
      hp: 8,
      examples: "Backpack, jacket, pouch, strap, whip",
   },
   "rope-thin": {
      name: "Thin rope",
      hd: 2,
      hp: 8,
      examples: "Standard adventuring rope",
   },
   "wood-thin": {
      name: "Thin wood",
      hd: 3,
      hp: 12,
      examples: "Chair, club, sapling, wooden shield",
   },
   leather: {
      name: "Leather",
      hd: 4,
      hp: 16,
      examples: "Leather armor, saddle",
   },
   rope: {
      name: "Rope",
      hd: 4,
      hp: 16,
      examples: "Industrial rope, ship rigging",
   },
   "stone-thin": {
      name: "Thin stone",
      hd: 5,
      hp: 16,
      examples: "Chalkboard, slate tiles, stone cladding",
   },
   "iron-thin": {
      name: "Thin iron or steel",
      hd: 5,
      hp: 20,
      examples: "Chain, steel shield, sword",
   },
   wood: {
      name: "Wood",
      hd: 5,
      hp: 20,
      examples: "Chest, simple door, table, tree trunk",
   },
   stone: { name: "Stone", hd: 7, hp: 28, examples: "Paving stone, statue" },
   iron: {
      name: "Iron or steel",
      hd: 9,
      hp: 36,
      examples: "Anvil, iron or steel armor, stove",
   },
   "wood-structure": {
      name: "Wooden structure",
      hd: 10,
      hp: 40,
      examples: "Reinforced door, wooden wall",
   },
   "stone-structure": {
      name: "Stone structure",
      hd: 14,
      hp: 56,
      examples: "Stone wall",
   },
   "iron-structure": {
      name: "Iron or steel structure",
      hd: 18,
      hp: 72,
      examples: "Iron plate wall",
   },
}

export const armorPropertyMap = {
   acidResistant: {
      label: "Reduce Acid Resistance by 5",
      type: "resistance",
      element: "acid",
      value: -5,
   },
   coldResistant: {
      label: "Reduce Cold Resistance by 5",
      type: "resistance",
      element: "cold",
      value: -5,
   },
   electricityResistant: {
      label: "Reduce Electricity Resistance by 5",
      type: "resistance",
      element: "electricity",
      value: -5,
   },
   fireResistant: {
      label: "Reduce Fire Resistance by 5",
      type: "resistance",
      element: "fire",
      value: -5,
   },
   sonicResistant: {
      label: "Reduce Sonic Resistance by 5",
      type: "resistance",
      element: "sonic",
      value: -5,
   },
   shadow: {
      label: "Reduce Stealth by 1",
      type: "skill",
      skill: "stealth",
      value: -1,
   },
   greaterShadow: {
      label: "Reduce Stealth by 2",
      type: "skill",
      skill: "stealth",
      value: -2,
   },
   majorShadow: {
      label: "Reduce Stealth by 3",
      type: "skill",
      skill: "stealth",
      value: -3,
   },
   slick: {
      label: "Reduce Acrobatics by 1",
      type: "skill",
      skill: "acrobatics",
      value: -1,
   },
   greaterSlick: {
      label: "Reduce Acrobatics by 2",
      type: "skill",
      skill: "acrobatics",
      value: -2,
   },
   majorSlick: {
      label: "Reduce Acrobatics by 3",
      type: "skill",
      skill: "acrobatics",
      value: -3,
   },
}

export const weaponPropertyMap = {
   flaming: { label: "Remove Fire Damage", element: "fire" },
   frost: { label: "Remove Cold Damage", element: "cold" },
   shock: { label: "Remove Electricity Damage", element: "electricity" },
   corrosive: { label: "Remove Acid Damage", element: "acid" },
   thundering: { label: "Remove Sonic Damage", element: "sonic" },
   holy: { label: "Remove Spirit Damage (Holy)", element: "spirit" },
   unholy: { label: "Remove Spirit Damage (Unholy)", element: "spirit" },
}
