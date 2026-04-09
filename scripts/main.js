import { physicalTypes } from "./constants.js"
import {
   openMaterialDialog,
   launchNPCDialog,
   launchSunderMacro,
   launchRepairDialog,
   launchPersistentItemDamageDialog,
} from "./ui.js"
import {
   processItemDamage,
   applyNPCArmorPenalties,
   removeNPCArmorPenalties,
   applyNPCWeaponPenalties,
   removeNPCWeaponPenalties,
   getDefaultDurability,
} from "./logic.js"
import { registerSettings } from "./settings.js"

Hooks.once("init", () => {
   registerSettings()
   game.modules.get("pf2e-aztecs-sundered").api = { launchSunderMacro }
})

const buildDurabilityHTML = (item, isSheet = false) => {
   let isShield = item.type === "shield"
   let isDefaultType =
      item.type === "armor" || item.type === "weapon" || isShield
   let maximumHpFlag = item.getFlag("world", "maxHp")
   let hasDurability = maximumHpFlag !== undefined
   let defaultDurabilityStats = getDefaultDurability(item)
   let isGameMaster = game.user.isGM
   let baseRepairSetting = game.settings.get(
      "pf2e-aztecs-sundered",
      "showRepairButtonUI",
   )

   let showRepairButton = isGameMaster
      ? baseRepairSetting
      : baseRepairSetting &&
        game.settings.get("pf2e-aztecs-sundered", "showRepairButtonUI_players")

   let repairMarkup = showRepairButton
      ? `<a class="repair-wrench inv-repair" data-item-id="${item.id}" title="${game.i18n.localize("pf2e-aztecs-sundered.sheet-text.repair-item")}" style="margin-left: 6px; cursor: pointer;"><i class="fa-solid fa-wrench"></i></a>`
      : ""

   let containerStyle = isSheet
      ? "grid-column: 1 / -1; width: 100%; margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid #7a7971; font-size: 0.9em; display: block;"
      : "margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid #7a7971; font-size: 0.9em;"

   if (!isDefaultType && !hasDurability) {
      return `<div class="aztec-durability-summary" style="${containerStyle} text-align: center;"><a class="add-durability" data-item-id="${item.id}" title="${game.i18n.localize("pf2e-aztecs-sundered.sheet-text.track-durability")}"><i class="fa-solid fa-shield-exclamation"></i> ${game.i18n.localize("pf2e-aztecs-sundered.sheet-text.track-durability")}</a></div>`
   }

   let currentHitPoints = isShield
      ? (item.system.hp?.value ?? 0)
      : isDefaultType && !hasDurability
        ? defaultDurabilityStats.maxHp
        : (item.getFlag("world", "currentHp") ?? 0)

   let maximumHitPoints = isShield
      ? (item.system.hp?.max ?? 0)
      : isDefaultType && !hasDurability
        ? defaultDurabilityStats.maxHp
        : (maximumHpFlag ?? 0)

   let itemHardness = isShield
      ? (item.system.hardness ?? 0)
      : isDefaultType && !hasDurability
        ? defaultDurabilityStats.hardness
        : (item.getFlag("world", "hardness") ?? 0)

   let brokenThreshold = isShield
      ? (item.system.hp?.brokenThreshold ?? Math.floor(maximumHitPoints / 2))
      : Math.floor(maximumHitPoints / 2)

   let ignoreHardnessLabel = isSheet
      ? `<label style="display:flex; align-items:center; gap: 4px; font-size: 0.9em; cursor: pointer; margin: 0;"><input type="checkbox" class="inv-ignore-box" data-item-id="${item.id}" style="margin: 0; width: 14px; height: 14px;"> ${game.i18n.localize("pf2e-aztecs-sundered.sheet-text.ignore-hardness")}</label>`
      : `<input type="checkbox" class="inv-ignore-box" data-item-id="${item.id}" title="${game.i18n.localize("pf2e-aztecs-sundered.sheet-text.ignore-hardness")}" style="margin: 0; width: 14px; height: 14px; cursor: pointer;">`

   let assignMaterialMarkup = isShield
      ? ""
      : `<a class="assign-material" data-item-id="${item.id}" title="${game.i18n.localize("pf2e-aztecs-sundered.dialog.material.title")}"><i class="fa-solid fa-m"></i> ${game.i18n.localize("pf2e-aztecs-sundered.dialog.material.title")}</a>`

   let hitPointsLabel = game.i18n.localize("pf2e-aztecs-sundered.sheet-text.hp")
   let statusText = ""

   if (maximumHitPoints > 0) {
      if (currentHitPoints <= 0)
         statusText = ` (${game.i18n.localize("pf2e-aztecs-sundered.status.destroyed")})`
      else if (currentHitPoints <= brokenThreshold)
         statusText = ` (${game.i18n.localize("pf2e-aztecs-sundered.status.broken")})`
   }

   return `<div class="aztec-durability-summary" style="${containerStyle}"><div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;"><span style="display: flex; align-items: center; gap: 12px;"><span>${hitPointsLabel}${statusText}: <span class="durability-edit" data-item-id="${item.id}" data-flag-key="currentHp" contenteditable="true">${currentHitPoints}</span> / <span class="durability-edit" data-item-id="${item.id}" data-flag-key="maxHp" contenteditable="true">${maximumHitPoints}</span></span><span style="display: flex; align-items: center; gap: 6px;"><a class="damage-hammer inv-hammer" data-item-id="${item.id}" title="${game.i18n.localize("pf2e-aztecs-sundered.sheet-text.strike-item")}"><i class="fa-solid fa-hammer-crash"></i></a><span class="inv-damage-edit" data-item-id="${item.id}" contenteditable="true" style="display: inline-block; min-width: 16px; text-align: center;" title="${game.i18n.localize("pf2e-aztecs-sundered.sheet-text.damage-amt")}">0</span>${ignoreHardnessLabel}${repairMarkup}</span></span>${assignMaterialMarkup}</div><div><span>${game.i18n.localize("pf2e-aztecs-sundered.sheet-text.hardness")}: <span class="durability-edit" data-item-id="${item.id}" data-flag-key="hardness" contenteditable="true">${itemHardness}</span> (BT: ${brokenThreshold})</span></div></div>`
}

const attachDurabilityListeners = (html, entity) => {
   html
      .find(".inv-repair")
      .off("click")
      .on("click", async (event) => {
         event.preventDefault()
         event.stopPropagation()
         const item = entity.items
            ? entity.items.get(event.currentTarget.dataset.itemId)
            : entity
         if (item) launchRepairDialog(item)
      })
   html
      .find(".assign-material")
      .off("click")
      .on("click", (event) => {
         event.preventDefault()
         event.stopPropagation()
         const item = entity.items
            ? entity.items.get(event.currentTarget.dataset.itemId)
            : entity
         if (item) openMaterialDialog(item, false)
      })
   html
      .find(".add-durability")
      .off("click")
      .on("click", (event) => {
         event.preventDefault()
         event.stopPropagation()
         const item = entity.items
            ? entity.items.get(event.currentTarget.dataset.itemId)
            : entity
         if (item) openMaterialDialog(item, true)
      })
   html
      .find(".durability-edit, .inv-damage-edit")
      .off("focus")
      .on("focus", (event) => {
         const selection = window.getSelection()
         const range = document.createRange()
         range.selectNodeContents(event.currentTarget)
         selection.removeAllRanges()
         selection.addRange(range)
      })
   html
      .find(".durability-edit")
      .off("blur")
      .on("blur", async (event) => {
         const spanElement = event.currentTarget
         const flagKey = spanElement.dataset.flagKey
         let newInputValue = parseInt(spanElement.innerText) || 0
         const item = entity.items
            ? entity.items.get(spanElement.dataset.itemId)
            : entity

         if (item) {
            let itemUpdates = {}
            let isShield = item.type === "shield"
            let isDefaultType =
               item.type === "weapon" || item.type === "armor" || isShield
            let defaultDurabilityStats = getDefaultDurability(item)

            let currentMaximumHp = isShield
               ? (item.system.hp?.max ?? 1)
               : (item.getFlag("world", "maxHp") ??
                 (isDefaultType ? defaultDurabilityStats.maxHp : 1))

            let currentHitPoints = isShield
               ? (item.system.hp?.value ?? 0)
               : (item.getFlag("world", "currentHp") ??
                 (isDefaultType ? defaultDurabilityStats.maxHp : 0))

            if (flagKey === "currentHp") {
               newInputValue = Math.min(
                  Math.max(newInputValue, 0),
                  currentMaximumHp,
               )
               spanElement.innerText = newInputValue
            } else if (flagKey === "maxHp") {
               newInputValue = Math.max(newInputValue, 1)
               spanElement.innerText = newInputValue
               if (currentHitPoints > newInputValue)
                  itemUpdates[
                     isShield ? "system.hp.value" : "flags.world.currentHp"
                  ] = newInputValue
            } else if (flagKey === "hardness") {
               newInputValue = Math.max(newInputValue, 0)
               spanElement.innerText = newInputValue
            }

            if (isShield) {
               if (flagKey === "currentHp")
                  itemUpdates["system.hp.value"] = newInputValue
               if (flagKey === "maxHp")
                  itemUpdates["system.hp.max"] = newInputValue
               if (flagKey === "hardness")
                  itemUpdates["system.hardness"] = newInputValue
            } else {
               if (
                  item.getFlag("world", "maxHp") === undefined &&
                  isDefaultType
               ) {
                  itemUpdates["flags.world.maxHp"] =
                     flagKey === "maxHp"
                        ? newInputValue
                        : defaultDurabilityStats.maxHp
                  itemUpdates["flags.world.currentHp"] =
                     flagKey === "currentHp"
                        ? newInputValue
                        : defaultDurabilityStats.maxHp
                  itemUpdates["flags.world.hardness"] =
                     flagKey === "hardness"
                        ? newInputValue
                        : defaultDurabilityStats.hardness
               }
               if (item.getFlag("world", flagKey) !== newInputValue)
                  itemUpdates[`flags.world.${flagKey}`] = newInputValue
            }
            if (Object.keys(itemUpdates).length > 0)
               await item.update(itemUpdates)
         }
      })
   html
      .find(".durability-edit, .inv-damage-edit")
      .off("keydown")
      .on("keydown", (event) => {
         if (event.key === "Enter") {
            event.preventDefault()
            event.currentTarget.blur()
         }
      })
   html
      .find(".inv-hammer")
      .off("click")
      .on("click", async (event) => {
         event.preventDefault()
         event.stopPropagation()
         const item = entity.items
            ? entity.items.get(event.currentTarget.dataset.itemId)
            : entity
         const damageSpan = $(event.currentTarget)
            .parent()
            .find(".inv-damage-edit")
         const damageAmount = parseInt(damageSpan.text()) || 0
         if (damageAmount > 0 && item) {
            await processItemDamage(
               item,
               damageAmount,
               $(event.currentTarget)
                  .parent()
                  .find(".inv-ignore-box")
                  .is(":checked"),
            )
            damageSpan.text("0")
         }
      })
}

Hooks.on("preUpdateItem", (item, changes, options, userId) => {
   if (game.user.id !== userId) return

   if (changes.system && changes.system.containerId !== undefined) {
      if (changes.system.containerId !== null && item.actor) {
         let backpackContainer = item.actor.items.get(
            changes.system.containerId,
         )
         if (
            backpackContainer &&
            backpackContainer.type === "backpack" &&
            backpackContainer.getFlag("world", "maxHp") !== undefined
         ) {
            if (
               (backpackContainer.getFlag("world", "currentHp") ?? 0) <=
               Math.floor(backpackContainer.getFlag("world", "maxHp") / 2)
            ) {
               ui.notifications.warn(
                  game.i18n.format(
                     "pf2e-aztecs-sundered.notifications.cant-stow",
                     { containerName: backpackContainer.name },
                  ),
               )
               delete changes.system.containerId
            }
         }
      }
   }

   if (!physicalTypes.includes(item.type)) return

   let isShield = item.type === "shield"
   let isDefaultType =
      item.type === "armor" || item.type === "weapon" || isShield
   let defaultDurabilityStats = getDefaultDurability(item)

   options.aztecOldMax = isShield
      ? (item.system.hp?.max ?? 1)
      : item.getFlag("world", "maxHp") ||
        (isDefaultType ? defaultDurabilityStats.maxHp : 1)

   options.aztecOldHp = isShield
      ? (item.system.hp?.value ?? 0)
      : (item.getFlag("world", "currentHp") ??
        (isDefaultType ? defaultDurabilityStats.maxHp : 0))

   let newMaximumHitPoints = isShield
      ? (changes.system?.hp?.max ?? options.aztecOldMax)
      : (changes.flags?.world?.maxHp ?? options.aztecOldMax)

   let newCurrentHitPoints = isShield
      ? (changes.system?.hp?.value ?? options.aztecOldHp)
      : (changes.flags?.world?.currentHp ?? options.aztecOldHp)

   if (newCurrentHitPoints > newMaximumHitPoints) {
      newCurrentHitPoints = newMaximumHitPoints
      if (isShield) {
         changes.system = changes.system || {}
         changes.system.hp = changes.system.hp || {}
         changes.system.hp.value = newMaximumHitPoints
      } else {
         changes.flags = changes.flags || {}
         changes.flags.world = changes.flags.world || {}
         changes.flags.world.currentHp = newMaximumHitPoints
      }
   }

   let brokenThreshold = isShield
      ? (item.system.hp?.brokenThreshold ?? Math.floor(newMaximumHitPoints / 2))
      : Math.floor(newMaximumHitPoints / 2)
   let isBroken =
      newMaximumHitPoints > 0 && newCurrentHitPoints <= brokenThreshold

   if (
      newCurrentHitPoints === 0 &&
      (isDefaultType || item.getFlag("world", "maxHp") !== undefined)
   ) {
      if (changes.system?.equipped) {
         let newCarryType =
            changes.system.equipped.carryType ?? item.system.equipped?.carryType
         if (
            !["dropped", "stowed", "worn"].includes(newCarryType) ||
            (changes.system.equipped.inSlot ?? item.system.equipped?.inSlot) ===
               true
         ) {
            ui.notifications.warn(
               game.i18n.format(
                  "pf2e-aztecs-sundered.notifications.cant-equip",
                  { itemName: item.name },
               ),
            )
            delete changes.system.equipped
         }
      }
      if (options.aztecOldHp > 0) {
         changes.system = changes.system || {}
         changes.system.equipped = changes.system.equipped || {}
         Object.assign(changes.system.equipped, {
            carryType: "worn",
            inSlot: false,
            handsHeld: 0,
            invested: false,
         })
      }
   }

   if (item.actor?.type === "npc" || isShield) return

   let itemRules = foundry.utils.duplicate(item.system.rules || [])
   let rulesHaveChanged = false

   if (item.type === "armor") {
      let armorPenalty =
         item.system.category === "light"
            ? game.settings.get("pf2e-aztecs-sundered", "armourPenaltyLight")
            : item.system.category === "medium"
              ? game.settings.get("pf2e-aztecs-sundered", "armourPenaltyMedium")
              : item.system.category === "heavy"
                ? game.settings.get(
                     "pf2e-aztecs-sundered",
                     "armourPenaltyHeavy",
                  )
                : 0

      if (item.system.traits?.value?.includes("laminar")) {
         armorPenalty = Math.min(
            0,
            armorPenalty -
               game.settings.get(
                  "pf2e-aztecs-sundered",
                  "laminarPenaltyReduction",
               ),
         )
      }

      let brokenArmorIndex = itemRules.findIndex(
         (rule) => rule.slug === "broken-armour-penalty",
      )

      if (
         isBroken &&
         game.settings.get("pf2e-aztecs-sundered", "enableArmourPenalty") &&
         armorPenalty !== 0
      ) {
         if (brokenArmorIndex === -1) {
            itemRules.push({
               key: "FlatModifier",
               selector: "ac",
               value: armorPenalty,
               slug: "broken-armour-penalty",
               label: game.i18n.localize(
                  "pf2e-aztecs-sundered.rule-elements.broken.armor",
               ),
            })
            rulesHaveChanged = true
         } else if (itemRules[brokenArmorIndex].value !== armorPenalty) {
            itemRules[brokenArmorIndex].value = armorPenalty
            rulesHaveChanged = true
         }
      } else if (brokenArmorIndex !== -1) {
         itemRules.splice(brokenArmorIndex, 1)
         rulesHaveChanged = true
      }
   }

   if (item.type === "weapon") {
      let weaponPenaltyAmount = game.settings.get(
         "pf2e-aztecs-sundered",
         "weaponPenaltyAmount",
      )
      let brokenAttackIndex = itemRules.findIndex(
         (rule) => rule.slug === "broken-weapon-attack",
      )
      let brokenDamageIndex = itemRules.findIndex(
         (rule) => rule.slug === "broken-weapon-damage",
      )

      if (
         isBroken &&
         game.settings.get("pf2e-aztecs-sundered", "enableWeaponPenalty") &&
         weaponPenaltyAmount !== 0
      ) {
         if (brokenAttackIndex === -1) {
            itemRules.push({
               key: "FlatModifier",
               selector: "attack",
               type: "item",
               value: weaponPenaltyAmount,
               slug: "broken-weapon-attack",
               label: game.i18n.localize(
                  "pf2e-aztecs-sundered.rule-elements.broken.weapon",
               ),
            })
            rulesHaveChanged = true
         } else if (
            itemRules[brokenAttackIndex].value !== weaponPenaltyAmount
         ) {
            itemRules[brokenAttackIndex].value = weaponPenaltyAmount
            rulesHaveChanged = true
         }
         if (brokenDamageIndex === -1) {
            itemRules.push({
               key: "FlatModifier",
               selector: "damage",
               type: "item",
               value: weaponPenaltyAmount,
               slug: "broken-weapon-damage",
               label: game.i18n.localize(
                  "pf2e-aztecs-sundered.rule-elements.broken.weapon",
               ),
            })
            rulesHaveChanged = true
         } else if (
            itemRules[brokenDamageIndex].value !== weaponPenaltyAmount
         ) {
            itemRules[brokenDamageIndex].value = weaponPenaltyAmount
            rulesHaveChanged = true
         }
      } else {
         if (brokenAttackIndex !== -1 || brokenDamageIndex !== -1) {
            ;[brokenDamageIndex, brokenAttackIndex]
               .sort((a, b) => b - a)
               .forEach((indexPosition) => {
                  if (indexPosition !== -1) itemRules.splice(indexPosition, 1)
               })
            rulesHaveChanged = true
         }
      }
   }

   if (rulesHaveChanged) {
      changes.system = changes.system || {}
      changes.system.rules = itemRules
   }

   let runesBackup = item.getFlag("world", "runesBackup")
   if (isBroken) {
      if (!runesBackup) {
         runesBackup = foundry.utils.duplicate(item.system.runes || {})
         changes.flags = changes.flags || {}
         changes.flags.world = changes.flags.world || {}
         changes.flags.world.runesBackup = runesBackup
      }
      let desiredRunes = foundry.utils.duplicate(runesBackup)

      if (item.type === "armor") {
         if (
            game.settings.get("pf2e-aztecs-sundered", "suppressArmourPotency")
         ) {
            desiredRunes.potency = 0
            desiredRunes.resilient = 0
            desiredRunes.property = []
         } else {
            if (
               game.settings.get(
                  "pf2e-aztecs-sundered",
                  "suppressArmourResilient",
               )
            )
               desiredRunes.resilient = 0
            if (
               game.settings.get(
                  "pf2e-aztecs-sundered",
                  "suppressArmourProperty",
               )
            )
               desiredRunes.property = []
         }
      } else if (item.type === "weapon") {
         if (
            game.settings.get("pf2e-aztecs-sundered", "suppressWeaponPotency")
         ) {
            desiredRunes.potency = 0
            desiredRunes.striking = 0
            desiredRunes.property = []
         } else {
            if (
               game.settings.get(
                  "pf2e-aztecs-sundered",
                  "suppressWeaponStriking",
               )
            )
               desiredRunes.striking = 0
            if (
               game.settings.get(
                  "pf2e-aztecs-sundered",
                  "suppressWeaponProperty",
               )
            )
               desiredRunes.property = []
         }
      }
      changes.system = changes.system || {}
      changes.system.runes = desiredRunes
   } else if (
      options.aztecOldMax > 0 &&
      options.aztecOldHp <=
         (isShield
            ? (item.system.hp?.brokenThreshold ??
              Math.floor(options.aztecOldMax / 2))
            : Math.floor(options.aztecOldMax / 2)) &&
      !isBroken &&
      runesBackup
   ) {
      changes.system = changes.system || {}
      changes.system.runes = foundry.utils.duplicate(runesBackup)
      changes.flags = changes.flags || {}
      changes.flags.world = changes.flags.world || {}
      changes.flags.world["-=runesBackup"] = null
   }
})

Hooks.on("updateItem", async (item, changes, options, userId) => {
   if (game.user.id !== userId) return

   if (
      item.type === "backpack" &&
      item.actor &&
      options.aztecOldHp > 0 &&
      (changes.flags?.world?.currentHp ?? item.getFlag("world", "currentHp")) <=
         0
   ) {
      const backpackContents = item.actor.items.filter(
         (i) => i.system.containerId === item.id,
      )
      if (backpackContents.length > 0)
         await item.actor.updateEmbeddedDocuments(
            "Item",
            backpackContents.map((containedItem) => ({
               _id: containedItem.id,
               "system.containerId": null,
               "system.equipped.carryType": "dropped",
            })),
         )
   }

   if (item.type !== "armor" && item.type !== "weapon") return

   let expandedChanges = foundry.utils.expandObject(changes)
   if (
      expandedChanges.system?.material !== undefined ||
      expandedChanges.flags?.world?.usePreciousMaterial !== undefined ||
      expandedChanges.system?.baseItem !== undefined ||
      expandedChanges.flags?.world?.assignedMaterial !== undefined
   ) {
      let defaultDurabilityStats = getDefaultDurability(item)
      let oldMaximumHp = options.aztecOldMax || 1
      let newCurrentHp = Math.max(
         0,
         Math.round(
            ((item.getFlag("world", "currentHp") ??
               defaultDurabilityStats.maxHp) /
               oldMaximumHp) *
               defaultDurabilityStats.maxHp,
         ),
      )
      if (
         item.getFlag("world", "maxHp") !== defaultDurabilityStats.maxHp ||
         item.getFlag("world", "hardness") !== defaultDurabilityStats.hardness
      ) {
         await item.update({
            "flags.world.maxHp": defaultDurabilityStats.maxHp,
            "flags.world.currentHp": isNaN(newCurrentHp)
               ? defaultDurabilityStats.maxHp
               : newCurrentHp,
            "flags.world.hardness": defaultDurabilityStats.hardness,
         })
      }
   }

   if (item.actor?.type === "npc") {
      let isDefaultType = item.type === "armor" || item.type === "weapon"
      let defaultDurabilityStats = getDefaultDurability(item)
      let oldMaximumHp =
         options.aztecOldMax ??
         (isDefaultType ? defaultDurabilityStats.maxHp : 1)
      let oldCurrentHp =
         options.aztecOldHp ??
         (isDefaultType ? defaultDurabilityStats.maxHp : 0)
      let newMaximumHp =
         changes.flags?.world?.maxHp ??
         item.getFlag("world", "maxHp") ??
         oldMaximumHp
      let newCurrentHp =
         changes.flags?.world?.currentHp ??
         item.getFlag("world", "currentHp") ??
         oldCurrentHp

      if (
         oldMaximumHp > 0 &&
         oldCurrentHp > 0 &&
         newMaximumHp > 0 &&
         newCurrentHp <= 0
      ) {
         let npcChoices = await launchNPCDialog(item, true)
         if (npcChoices) {
            if (item.type === "armor") {
               await removeNPCArmorPenalties(item)
               await applyNPCArmorPenalties(item, npcChoices)
            }
            if (item.type === "weapon") {
               await removeNPCWeaponPenalties(item)
               await applyNPCWeaponPenalties(item, npcChoices)
            }
         }
      } else if (
         oldMaximumHp > 0 &&
         oldCurrentHp > Math.floor(oldMaximumHp / 2) &&
         newMaximumHp > 0 &&
         newCurrentHp <= Math.floor(newMaximumHp / 2)
      ) {
         let npcChoices = await launchNPCDialog(item, false)
         if (npcChoices) {
            if (item.type === "armor") {
               await removeNPCArmorPenalties(item)
               await applyNPCArmorPenalties(item, npcChoices)
            }
            if (item.type === "weapon") {
               await removeNPCWeaponPenalties(item)
               await applyNPCWeaponPenalties(item, npcChoices)
            }
         }
      } else if (
         oldMaximumHp > 0 &&
         oldCurrentHp <= Math.floor(oldMaximumHp / 2) &&
         newCurrentHp > Math.floor(newMaximumHp / 2)
      ) {
         if (item.type === "armor") await removeNPCArmorPenalties(item)
         if (item.type === "weapon") await removeNPCWeaponPenalties(item)
      }
   }
})

Hooks.on("renderItemSheet", (app, htmlElement) => {
   const item = app.document
   if (!physicalTypes.includes(item.type)) return
   const html = $(htmlElement[0] ?? htmlElement)
   let targetTab = html.find('.tab[data-tab="description"]').length
      ? html.find('.tab[data-tab="description"]')
      : html.find('.tab[data-tab="details"]').length
        ? html.find('.tab[data-tab="details"]')
        : html.find(".sheet-body")

   if (targetTab.length) targetTab.prepend(buildDurabilityHTML(item, true))
   attachDurabilityListeners(html, item)

   if (item.type === "weapon" || item.type === "armor") {
      let preciousMaterialCheckbox = `<div class="form-group"><label>${game.i18n.localize("pf2e-aztecs-sundered.sheet-text.use-precious")}</label><input type="checkbox" name="flags.world.usePreciousMaterial" data-dtype="Boolean" ${item.getFlag("world", "usePreciousMaterial") !== false ? "checked" : ""}></div>`
      let specificSystemInput = html.find('input[name="system.specific"]')
      let materialTypeSelect = html.find('select[name="system.material.type"]')

      if (specificSystemInput.length > 0)
         specificSystemInput
            .closest(".form-group")
            .after(preciousMaterialCheckbox)
      else if (materialTypeSelect.length > 0)
         materialTypeSelect
            .closest(".form-group")
            .after(preciousMaterialCheckbox)
      else
         html.find('.tab[data-tab="details"]').append(preciousMaterialCheckbox)
   }
})

Hooks.on("renderActorSheet", (app, htmlElement) => {
   const actor = app.actor
   if (
      !actor ||
      !["character", "npc", "familiar", "vehicle", "loot"].includes(actor.type)
   )
      return

   let showInventoryUI = game.user.isGM
      ? game.settings.get("pf2e-aztecs-sundered", "showInventoryUI")
      : game.settings.get("pf2e-aztecs-sundered", "showInventoryUI") &&
        game.settings.get("pf2e-aztecs-sundered", "showInventoryUI_players")

   let showDamageButton = game.user.isGM
      ? game.settings.get("pf2e-aztecs-sundered", "showDamageButtonUI")
      : game.settings.get("pf2e-aztecs-sundered", "showDamageButtonUI") &&
        game.settings.get("pf2e-aztecs-sundered", "showDamageButtonUI_players")

   let showAssignMaterialButton = game.user.isGM
      ? game.settings.get("pf2e-aztecs-sundered", "showAssignMaterialButtonUI")
      : game.settings.get(
           "pf2e-aztecs-sundered",
           "showAssignMaterialButtonUI",
        ) &&
        game.settings.get(
           "pf2e-aztecs-sundered",
           "showAssignMaterialButtonUI_players",
        )

   let showTrackDurabilityButton = game.user.isGM
      ? game.settings.get("pf2e-aztecs-sundered", "showTrackDurabilityButtonUI")
      : game.settings.get(
           "pf2e-aztecs-sundered",
           "showTrackDurabilityButtonUI",
        ) &&
        game.settings.get(
           "pf2e-aztecs-sundered",
           "showTrackDurabilityButtonUI_players",
        )

   let showRepairButton = game.user.isGM
      ? game.settings.get("pf2e-aztecs-sundered", "showRepairButtonUI")
      : game.settings.get("pf2e-aztecs-sundered", "showRepairButtonUI") &&
        game.settings.get("pf2e-aztecs-sundered", "showRepairButtonUI_players")

   const html = $(htmlElement[0] ?? htmlElement)
   const inventoryItems =
      actor.inventory?.contents ||
      actor.items.filter((i) => physicalTypes.includes(i.type))
   let hitPointsString = game.i18n.localize(
      "pf2e-aztecs-sundered.sheet-text.hp-short",
   )
   let hardnessString = game.i18n.localize(
      "pf2e-aztecs-sundered.sheet-text.hd-short",
   )

   inventoryItems.forEach((item) => {
      let isShield = item.type === "shield"
      let isDefaultType =
         item.type === "armor" || item.type === "weapon" || isShield
      let hasDurabilityFlags = item.getFlag("world", "maxHp") !== undefined
      let defaultDurabilityStats = getDefaultDurability(item)
      let nameElement = html
         .find(`[data-item-id="${item.id}"]`)
         .find(".item-name h4")
         .first()

      if (nameElement.length === 0)
         nameElement = html
            .find(`[data-item-id="${item.id}"]`)
            .find(".name")
            .first()

      if (isDefaultType || hasDurabilityFlags) {
         let currentHitPoints = isShield
            ? (item.system.hp?.value ?? 0)
            : (item.getFlag("world", "currentHp") ??
              (isDefaultType && !hasDurabilityFlags
                 ? defaultDurabilityStats.maxHp
                 : 0))
         let maximumHitPoints = isShield
            ? (item.system.hp?.max ?? 0)
            : (item.getFlag("world", "maxHp") ??
              (isDefaultType && !hasDurabilityFlags
                 ? defaultDurabilityStats.maxHp
                 : 0))
         let itemHardness = isShield
            ? (item.system.hardness ?? 0)
            : (item.getFlag("world", "hardness") ??
              (isDefaultType && !hasDurabilityFlags
                 ? defaultDurabilityStats.hardness
                 : 0))
         let brokenThreshold = isShield
            ? (item.system.hp?.brokenThreshold ??
              Math.floor(maximumHitPoints / 2))
            : Math.floor(maximumHitPoints / 2)

         if (showInventoryUI) {
            let damageMarkup = showDamageButton
               ? `<span style="margin-left: 14px; display: inline-flex; align-items: center; gap: 6px;"><a class="damage-hammer inv-hammer" data-item-id="${item.id}" title="${game.i18n.localize("pf2e-aztecs-sundered.sheet-text.strike-item")}"><i class="fa-solid fa-hammer-crash"></i></a><span class="inv-damage-edit" data-item-id="${item.id}" contenteditable="true" style="display: inline-block; min-width: 16px; text-align: center;" title="${game.i18n.localize("pf2e-aztecs-sundered.sheet-text.damage-amt")}">0</span><input type="checkbox" class="inv-ignore-box" data-item-id="${item.id}" title="${game.i18n.localize("pf2e-aztecs-sundered.sheet-text.ignore-hardness")}" style="margin: 0; width: 14px; height: 14px; cursor: pointer;"></span>`
               : ""
            let repairMarkup = showRepairButton
               ? `<span style="margin-left: 6px; display: inline-flex; align-items: center;"><a class="repair-wrench inv-repair" data-item-id="${item.id}" title="${game.i18n.localize("pf2e-aztecs-sundered.sheet-text.repair-item")}"><i class="fa-solid fa-wrench"></i></a></span>`
               : ""

            nameElement.append(
               `<span style="font-size: 0.85em; color: grey; margin-left: 8px; display: inline-flex; align-items: center;">(${hitPointsString}: <span class="durability-edit" data-item-id="${item.id}" data-flag-key="currentHp" contenteditable="true">${currentHitPoints}</span> / <span class="durability-edit" data-item-id="${item.id}" data-flag-key="maxHp" contenteditable="true">${maximumHitPoints}</span> | ${hardnessString}: <span class="durability-edit" data-item-id="${item.id}" data-flag-key="hardness" contenteditable="true">${itemHardness}</span>)${damageMarkup}${repairMarkup}</span>`,
            )

            if (!isShield && showAssignMaterialButton) {
               let materialButton = `<a class="assign-material" data-item-id="${item.id}" title="${game.i18n.localize("pf2e-aztecs-sundered.dialog.material.title")}" style="margin-right: 8px; font-size: 1.1em;"><i class="fa-solid fa-m"></i></a>`
               let carryToggle = html
                  .find(`[data-item-id="${item.id}"]`)
                  .find(".item-carry-type")
                  .first()
               if (carryToggle.length > 0) carryToggle.before(materialButton)
               else
                  html
                     .find(`[data-item-id="${item.id}"]`)
                     .find(".item-controls")
                     .first()
                     .prepend(materialButton)
            }
         }
         if (maximumHitPoints > 0) {
            if (currentHitPoints <= 0) {
               nameElement.prepend(
                  `<i class="fa-solid fa-skull" style="color: #555; margin-right: 6px;" title="${game.i18n.localize("pf2e-aztecs-sundered.status.destroyed")}"></i>`,
               )
               nameElement.css({ opacity: "0.5", filter: "grayscale(100%)" })
               html
                  .find(`[data-item-id="${item.id}"]`)
                  .find(".item-image")
                  .first()
                  .css({ opacity: "0.5", filter: "grayscale(100%)" })
            } else if (currentHitPoints <= brokenThreshold) {
               nameElement.prepend(
                  `<i class="fa-solid fa-heart-crack" style="color: #a83232; margin-right: 6px;" title="${game.i18n.localize("pf2e-aztecs-sundered.status.broken")}"></i>`,
               )
            }
         }
      } else if (showInventoryUI && showTrackDurabilityButton) {
         nameElement.append(
            `<a class="add-durability" data-item-id="${item.id}" title="${game.i18n.localize("pf2e-aztecs-sundered.sheet-text.track-durability")}"><i class="fa-solid fa-shield-exclamation"></i></a>`,
         )
      }
   })
   attachDurabilityListeners(html, actor)
})

Hooks.on("renderChatMessage", (message, htmlElement, data) => {
   if (!game.settings.get("pf2e-aztecs-sundered", "injectSunderButton")) return
   if (
      !game.user.isGM &&
      !game.settings.get("pf2e-aztecs-sundered", "allowPlayersSunderButton")
   )
      return
   if (!message.isDamageRoll) return

   if (
      message.flags?.pf2e?.context?.options?.includes("splash-damage") ||
      (message.flavor &&
         message.flavor.toLowerCase().includes("splash damage roll"))
   )
      return

   const html = $(htmlElement[0] ?? htmlElement)

   let parsedDamage = []
   let persistentData = null
   let totalDamage = 0

   if (message.rolls && Array.isArray(message.rolls)) {
      message.rolls.forEach((roll) => {
         if (roll.instances && Array.isArray(roll.instances)) {
            roll.instances.forEach((inst) => {
               let flavorStr = String(inst.options?.flavor || "").toLowerCase()
               let formulaStr = String(inst.formula || "").toLowerCase()

               let isPersistent =
                  inst.persistent ||
                  flavorStr.includes("persistent") ||
                  formulaStr.includes("persistent")

               if (isPersistent) {
                  let rawFormula =
                     inst.head?.expression || inst.formula || "1d6"
                  let cleanFormula = String(rawFormula)
                     .split(/[pP\[]/)[0]
                     .replace(/[^\d\+\-\*\/\(\)d]/gi, "")
                     .trim()

                  let parsedType =
                     inst.type ||
                     flavorStr
                        .replace("persistent", "")
                        .replace(/[^a-z]/g, "")
                        .trim() ||
                     "damage"
                  persistentData = {
                     formula: cleanFormula || "1d6",
                     type: parsedType,
                  }
               } else {
                  let parsedType =
                     inst.type ||
                     flavorStr.replace(/[^a-z]/g, "").trim() ||
                     "untyped"
                  parsedDamage.push({
                     type: parsedType,
                     value: inst.total,
                     selected: true,
                  })
                  totalDamage += inst.total
               }
            })
         } else if (roll.total) {
            parsedDamage.push({
               type: "untyped",
               value: roll.total,
               selected: true,
            })
            totalDamage += roll.total
         }
      })
   }

   let attackerData = {
      rawDamage: totalDamage,
      parsedDamage: parsedDamage,
      isAdamantine: false,
      adamantineGrade: null,
      isCorrosive: false,
      corrosiveDice: "",
      isRazing: false,
      razingDamage: 0,
      persistentData: persistentData,
   }

   let weapon = message.item
   if (weapon && weapon.type === "weapon") {
      if (weapon.system.material?.type === "adamantine") {
         attackerData.isAdamantine = true
         attackerData.adamantineGrade = weapon.system.material.grade
      }

      let traits = weapon.system.traits?.value || []
      if (traits.includes("razing")) {
         let strikingTier = weapon.system.runes?.striking || 0
         let diceCount = 1 + strikingTier
         attackerData.isRazing = true
         attackerData.razingDamage = diceCount * 2
      }

      let isCrit =
         message.flags?.pf2e?.context?.options?.includes("critical-hit") ||
         (message.flavor && message.flavor.toLowerCase().includes("critical"))
      if (isCrit) {
         let propertyRunes = weapon.system.runes?.property || []
         let isGreater = propertyRunes.includes("greaterCorrosive")
         let isStandard = propertyRunes.includes("corrosive")

         if (isGreater || isStandard) {
            attackerData.isCorrosive = true
            attackerData.corrosiveDice = isGreater ? "6d6" : "3d6"
         }
      }
   }

   let btnHtml = `
      <button type="button" class="sunder-chat-btn" title="${game.i18n.localize("pf2e-aztecs-sundered.sheet-text.strike-item")}">
         <i class="fa-solid fa-hammer-crash fa-fw" inert=""></i>
         <span class="label">${game.i18n.localize("pf2e-aztecs-sundered.chat.sunder-button-label")}</span>
      </button>
   `

   html.find(".damage-application").first().append(btnHtml)

   html[0].addEventListener(
      "click",
      async (event) => {
         let btn = event.target.closest(".sunder-chat-btn")
         if (!btn) return

         event.preventDefault()
         event.stopPropagation()

         let targetActor =
            Array.from(game.user.targets)[0]?.actor ||
            canvas.tokens.controlled[0]?.actor

         if (!targetActor) {
            return ui.notifications.warn(
               game.i18n.localize(
                  "pf2e-aztecs-sundered.notifications.no-target",
               ),
            )
         }

         launchSunderMacro(targetActor, attackerData)
      },
      true,
   )
})

Hooks.on("updateCombat", (combat, updateData) => {
   if (!game.user.isGM || (!("turn" in updateData) && !("round" in updateData)))
      return
   let previousCombatantId = combat.previous?.combatantId
   if (!previousCombatantId) return
   let previousCombatant = combat.combatants.get(previousCombatantId)
   if (!previousCombatant || !previousCombatant.actor) return

   previousCombatant.actor.items
      .filter(
         (item) =>
            item.type === "effect" &&
            item.flags?.["pf2e-aztecs-sundered"]?.isPersistentItemDamage,
      )
      .forEach((effectItem) =>
         launchPersistentItemDamageDialog(previousCombatant.actor, effectItem),
      )
})
