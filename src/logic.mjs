import {
   armorPropertyMap,
   weaponPropertyMap,
   baseArmorMaterials,
   baseWeaponMaterials,
   materialStats,
   preciousMaterials,
} from "./constants.mjs"

const normaliseName = (text) =>
   text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")

const armorMaterialMap = {}
Object.entries(baseArmorMaterials).forEach(([mat, names]) => {
   names.forEach((name) => (armorMaterialMap[normaliseName(name)] = mat))
})

const weaponMaterialMap = {}
Object.entries(baseWeaponMaterials).forEach(([mat, names]) => {
   names.forEach((name) => (weaponMaterialMap[normaliseName(name)] = mat))
})

export const getDefaultDurability = (item) => {
   let rawBaseItem = item.system.baseItem
   let baseItem = rawBaseItem ? normaliseName(rawBaseItem) : null
   let materialKey = null

   if (item.type === "armor" && baseItem) {
      materialKey = armorMaterialMap[baseItem]
   } else if (item.type === "weapon" && baseItem) {
      materialKey = weaponMaterialMap[baseItem]
   }

   let baseStats = { maxHp: 10, hardness: 5 }
   let assignedMaterial = item.getFlag("world", "assignedMaterial")

   if (assignedMaterial && materialStats[assignedMaterial]) {
      baseStats = {
         maxHp: materialStats[assignedMaterial].hp,
         hardness: materialStats[assignedMaterial].hd,
      }
   } else if (materialKey && materialStats[materialKey]) {
      baseStats = {
         maxHp: materialStats[materialKey].hp,
         hardness: materialStats[materialKey].hd,
      }
   }

   let usePreciousMaterial =
      item.getFlag("world", "usePreciousMaterial") !== false
   let preciousType = item.system.material?.type
   let preciousGrade = item.system.material?.grade

   if (
      usePreciousMaterial &&
      preciousType &&
      preciousGrade &&
      preciousMaterials[preciousType]
   ) {
      let category = item.type === "armor" ? "armor" : "weapon"
      let preciousData =
         preciousMaterials[preciousType][category]?.[preciousGrade]

      if (preciousData) {
         let restrictMaterials = game.settings.get(
            "pf2e-aztecs-sundered",
            "restrictPreciousMaterial",
         )
         if (
            !restrictMaterials ||
            preciousData.hd > baseStats.hardness ||
            preciousData.hp > baseStats.maxHp
         ) {
            return {
               maxHp: preciousData.hp,
               hardness: preciousData.hd,
            }
         }
      }
   }

   return baseStats
}

export const applyNPCArmorPenalties = async (item, choices) => {
   let rules = []
   let isDestroyed = choices.fullDestruction

   if (isDestroyed) {
      let baseArmorClass = Number(item.system.acBonus) || 0
      let potencyRune = Number(item.system.runes?.potency) || 0
      choices.acPenalty = -(baseArmorClass + potencyRune)
      choices.suppressResilient = true
      choices.activeProps = item.system.runes?.property || []
   }

   if (choices.acPenalty !== 0) {
      rules.push({
         key: "FlatModifier",
         selector: "ac",
         value: choices.acPenalty,
         slug: isDestroyed ? "destroyed-armor-penalty" : "broken-armor-penalty",
         label: game.i18n.localize(
            "pf2e-aztecs-sundered.rule-elements.broken.armor",
         ),
      })
   }

   if (choices.suppressResilient && choices.resilientVal > 0) {
      rules.push({
         key: "FlatModifier",
         selector: "saving-throw",
         value: -choices.resilientVal,
         slug: isDestroyed ? "destroyed-resilient" : "broken-resilient",
         label: game.i18n.localize(
            "pf2e-aztecs-sundered.rule-elements.broken.resilient-rune",
         ),
      })
   }

   choices.activeProps.forEach((property) => {
      let propertyMap = armorPropertyMap[property]
      if (propertyMap.type === "skill") {
         rules.push({
            key: "FlatModifier",
            selector: propertyMap.skill,
            value: propertyMap.value,
            slug: isDestroyed ? `destroyed-${property}` : `broken-${property}`,
            label: game.i18n.format(
               "pf2e-aztecs-sundered.rule-elements.broken.other-rune",
               { type: property },
            ),
         })
      } else if (propertyMap.type === "resistance") {
         rules.push({
            key: "Weakness",
            type: propertyMap.element,
            value: Math.abs(propertyMap.value),
            slug: isDestroyed ? `destroyed-${property}` : `broken-${property}`,
            label: game.i18n.format(
               "pf2e-aztecs-sundered.rule-elements.broken.other-rune",
               { type: property },
            ),
         })
      }
   })

   let effectNameKey = isDestroyed
      ? "pf2e-aztecs-sundered.destroyed-effect.label"
      : "pf2e-aztecs-sundered.broken-effect.label"
   let effectDescriptionKey = isDestroyed
      ? "pf2e-aztecs-sundered.destroyed-effect.description"
      : "pf2e-aztecs-sundered.broken-effect.description"

   let effectData = {
      name: game.i18n.format(effectNameKey, { itemName: item.name }),
      type: "effect",
      img: item.img || "icons/svg/hazard.svg",
      system: {
         description: {
            value: game.i18n.format(effectDescriptionKey, {
               itemName: item.name,
            }),
         },
         rules: rules,
      },
      flags: { "pf2e-aztecs-sundered": { brokenItemId: item.id } },
   }

   await item.actor.createEmbeddedDocuments("Item", [effectData])
}

export const removeNPCArmorPenalties = async (item) => {
   let penaltyEffects = item.actor.items.filter(
      (effectItem) =>
         effectItem.type === "effect" &&
         effectItem.flags?.["pf2e-aztecs-sundered"]?.brokenItemId === item.id,
   )
   let effectIds = penaltyEffects.map((effect) => effect.id)
   if (effectIds.length > 0) {
      await item.actor.deleteEmbeddedDocuments("Item", effectIds)
   }
}

export const applyNPCWeaponPenalties = async (item, choices) => {
   let linkedStrikes = item.actor.items.filter(
      (strikeItem) =>
         strikeItem.type === "melee" &&
         strikeItem.flags?.pf2e?.linkedWeapon === item.id,
   )
   let strikeIds = linkedStrikes.map((strike) => "item:id:" + strike.id)
   let strikePredicate = strikeIds.length > 0 ? [{ or: strikeIds }] : []
   let rules = []
   let isDestroyed = choices.fullDestruction

   if (isDestroyed) {
      choices.wPenalty = -50
      choices.suppressStriking = true
      choices.activeProps = item.system.runes?.property || []
   }

   if (choices.wPenalty !== 0) {
      rules.push({
         key: "FlatModifier",
         selector: ["attack", "damage"],
         value: choices.wPenalty,
         predicate: strikePredicate,
         slug: isDestroyed
            ? "destroyed-weapon-penalty"
            : "broken-weapon-penalty",
         label: game.i18n.localize(
            "pf2e-aztecs-sundered.rule-elements.broken.weapon",
         ),
      })
   }

   if (choices.suppressStriking && choices.strikingVal > 0) {
      rules.push({
         key: "DamageAlteration",
         mode: "add",
         property: "dice-number",
         selectors: ["strike-damage"],
         value: -choices.strikingVal,
         predicate: strikePredicate,
         slug: isDestroyed ? "destroyed-striking-rune" : "broken-striking-rune",
         label: game.i18n.localize(
            "pf2e-aztecs-sundered.rule-elements.broken.striking-rune",
         ),
      })
   }

   choices.activeProps.forEach((property) => {
      let propertyMap = weaponPropertyMap[property]
      if (propertyMap && propertyMap.element) {
         rules.push({
            key: "DamageDice",
            selector: "strike-damage",
            damageType: propertyMap.element,
            diceNumber: -1,
            predicate: strikePredicate,
            slug: isDestroyed
               ? `destroyed-${property}-rune`
               : `broken-${property}-rune`,
            label: game.i18n.format(
               "pf2e-aztecs-sundered.rule-elements.broken.other-rune",
               { type: property },
            ),
         })
      }
   })

   let effectNameKey = isDestroyed
      ? "pf2e-aztecs-sundered.destroyed-effect.label"
      : "pf2e-aztecs-sundered.broken-effect.label"
   let effectDescriptionKey = isDestroyed
      ? "pf2e-aztecs-sundered.destroyed-effect.description"
      : "pf2e-aztecs-sundered.broken-effect.description"

   let effectData = {
      name: game.i18n.format(effectNameKey, { itemName: item.name }),
      type: "effect",
      img: item.img || "icons/svg/hazard.svg",
      system: {
         description: {
            value: game.i18n.format(effectDescriptionKey, {
               itemName: item.name,
            }),
         },
         rules: rules,
      },
      flags: { "pf2e-aztecs-sundered": { brokenItemId: item.id } },
   }

   await item.actor.createEmbeddedDocuments("Item", [effectData])
}

export const removeNPCWeaponPenalties = async (item) => {
   let penaltyEffects = item.actor.items.filter(
      (effectItem) =>
         effectItem.type === "effect" &&
         effectItem.flags?.["pf2e-aztecs-sundered"]?.brokenItemId === item.id,
   )
   let effectIds = penaltyEffects.map((effect) => effect.id)
   if (effectIds.length > 0) {
      await item.actor.deleteEmbeddedDocuments("Item", effectIds)
   }
}
