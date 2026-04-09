import {
   armorPropertyMap,
   weaponPropertyMap,
   baseArmorMaterials,
   baseWeaponMaterials,
   materialStats,
   preciousMaterials,
} from "./constants.js"

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

export const processItemDamage = async (item, damage, ignoreHardness) => {
   let isShield = item.type === "shield"
   let isDefaultType =
      item.type === "armor" || item.type === "weapon" || isShield
   let hasDurabilityFlags = item.getFlag("world", "maxHp") !== undefined

   let currentHp = isShield
      ? (item.system.hp?.value ?? 0)
      : hasDurabilityFlags
        ? item.getFlag("world", "currentHp")
        : isDefaultType
          ? 10
          : 0

   let baseHardness = isShield
      ? (item.system.hardness ?? 0)
      : hasDurabilityFlags
        ? item.getFlag("world", "hardness")
        : isDefaultType
          ? 5
          : 0

   let materialType = item.system.material?.type
   let isDragonhide = materialType === "dragonhide"
   let isGrisantian =
      materialType === "grisantian-pelt" || materialType === "grisantianPelt"

   let needsDialog = ignoreHardness || isDragonhide || isGrisantian

   const applyDamage = async (finalDamage) => {
      let newHp = Math.max(0, currentHp - finalDamage)
      let updates = {}

      if (isShield) {
         updates["system.hp.value"] = newHp
      } else {
         updates["flags.world.currentHp"] = newHp
         if (!hasDurabilityFlags) {
            updates["flags.world.maxHp"] = 10
            updates["flags.world.hardness"] = 5
         }
      }
      await item.update(updates)
   }

   if (needsDialog) {
      let dialogContent = ""

      if (ignoreHardness) {
         dialogContent += `
            <div class="form-group">
                <label>${game.i18n.localize("pf2e-aztecs-sundered.dialog.ignore-hardness.amount-to-ignore")}:</label>
                <div class="form-fields">
                    <input type="number" id="ignored-val" value="0" autofocus>
                </div>
            </div>
         `
      }

      if (isGrisantian) {
         dialogContent += `
            <div class="form-group" style="margin-top: 8px;">
                <label>${game.i18n.localize("pf2e-aztecs-sundered.sheet-text.grisantian-fire")}</label>
                <div class="form-fields">
                    <input type="checkbox" id="mat-fire">
               </div>
            </div>
            <div class="form-group">
                <label>${game.i18n.localize("pf2e-aztecs-sundered.sheet-text.grisantian-piercing")}</label>
                <div class="form-fields">
                    <input type="checkbox" id="mat-piercing-slashing">
                </div>
            </div>
         `
      }

      if (isDragonhide) {
         dialogContent += `
            <div class="form-group" style="margin-top: 8px;">
                <label>${game.i18n.localize("pf2e-aztecs-sundered.sheet-text.dragonhide-element")}</label>
                <div class="form-fields">
                    <input type="checkbox" id="mat-dragon-element">
                </div>
            </div>
         `
      }

      dialogContent += `
         <div style="text-align: center; margin-top: 10px; font-size: 1.1em;">
             ${game.i18n.localize("pf2e-aztecs-sundered.dialog.ignore-hardness.damage-to-hp")}: <strong id="dynamic-damage-preview">${Math.max(0, damage - baseHardness)}</strong>
         </div>
      `

      new Dialog({
         title: game.i18n.localize(
            "pf2e-aztecs-sundered.dialog.ignore-hardness.title",
         ),
         content: dialogContent,
         render: (html) => {
            const updatePreview = () => {
               let ignoredAmount = ignoreHardness
                  ? parseInt(html.find("#ignored-val").val()) || 0
                  : 0
               let effectiveHardness = baseHardness

               if (
                  isGrisantian &&
                  html.find("#mat-piercing-slashing").is(":checked")
               ) {
                  effectiveHardness *= 2
               }

               effectiveHardness = Math.max(
                  0,
                  effectiveHardness - ignoredAmount,
               )
               let finalDamage = Math.max(0, damage - effectiveHardness)

               if (isGrisantian && html.find("#mat-fire").is(":checked")) {
                  finalDamage = 0
               }
               if (
                  isDragonhide &&
                  html.find("#mat-dragon-element").is(":checked")
               ) {
                  finalDamage = 0
               }

               html.find("#dynamic-damage-preview").text(finalDamage)
            }

            html.find("input").on("input change", updatePreview)
            updatePreview()
         },
         buttons: {
            apply: {
               icon: '<i class="fa-solid fa-hammer-crash"></i>',
               label: game.i18n.localize("PF2E.WeaponStrikeLabel"),
               callback: async (html) => {
                  let ignoredAmount = ignoreHardness
                     ? parseInt(html.find("#ignored-val").val()) || 0
                     : 0
                  let effectiveHardness = baseHardness

                  if (
                     isGrisantian &&
                     html.find("#mat-piercing-slashing").is(":checked")
                  ) {
                     effectiveHardness *= 2
                  }

                  effectiveHardness = Math.max(
                     0,
                     effectiveHardness - ignoredAmount,
                  )
                  let finalDamage = Math.max(0, damage - effectiveHardness)

                  if (isGrisantian && html.find("#mat-fire").is(":checked")) {
                     finalDamage = 0
                  }
                  if (
                     isDragonhide &&
                     html.find("#mat-dragon-element").is(":checked")
                  ) {
                     finalDamage = 0
                  }

                  await applyDamage(finalDamage)
               },
            },
         },
         default: "apply",
      }).render(true)
   } else {
      let finalDamage = Math.max(0, damage - baseHardness)
      await applyDamage(finalDamage)
   }
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
