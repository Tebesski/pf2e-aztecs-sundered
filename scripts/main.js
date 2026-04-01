import { physicalTypes } from "./constants.js"
import { openMaterialDialog, launchNPCDialog } from "./ui.js"
import {
   processItemDamage,
   applyNPCArmorPenalties,
   removeNPCArmorPenalties,
   applyNPCWeaponPenalties,
   removeNPCWeaponPenalties,
} from "./logic.js"
import { registerSettings } from "./settings.js"

Hooks.once("init", () => {
   registerSettings()
})

const buildDurabilityHTML = (item, isSheet = false) => {
   let isShield = item.type === "shield"
   let isDefaultType =
      item.type === "armor" || item.type === "weapon" || isShield
   let maxHpFlag = item.getFlag("world", "maxHp")
   let hasDurability = maxHpFlag !== undefined

   let containerStyle = isSheet
      ? "grid-column: 1 / -1; width: 100%; margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid #7a7971; font-size: 0.9em; display: block;"
      : "margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid #7a7971; font-size: 0.9em;"

   if (!isDefaultType && !hasDurability) {
      return `<div class="aztec-durability-summary" style="${containerStyle} text-align: center;">
            <a class="add-durability" data-item-id="${item.id}" title="Track Durability"><i class="fa-solid fa-shield-exclamation"></i> Track Durability</a>
        </div>`
   }

   let currentHp = isShield
      ? item.system.hp?.value ?? 0
      : isDefaultType && !hasDurability
      ? 10
      : item.getFlag("world", "currentHp") ?? 0
   let maxHp = isShield
      ? item.system.hp?.max ?? 0
      : isDefaultType && !hasDurability
      ? 10
      : maxHpFlag ?? 0
   let hardness = isShield
      ? item.system.hardness ?? 0
      : isDefaultType && !hasDurability
      ? 5
      : item.getFlag("world", "hardness") ?? 0
   let threshold = isShield
      ? item.system.hp?.brokenThreshold ?? Math.floor(maxHp / 2)
      : Math.floor(maxHp / 2)

   let ignoreLabel = isSheet
      ? `<label style="display:flex; align-items:center; gap: 4px; font-size: 0.9em; cursor: pointer; margin: 0;"><input type="checkbox" class="inv-ignore-box" data-item-id="${item.id}" style="margin: 0; width: 14px; height: 14px;"> Ignore Hardness</label>`
      : `<input type="checkbox" class="inv-ignore-box" data-item-id="${item.id}" title="Ignore Hardness" style="margin: 0; width: 14px; height: 14px; cursor: pointer;">`

   let assignMaterialMarkup = isShield
      ? ""
      : `<a class="assign-material" data-item-id="${item.id}" title="Assign Material"><i class="fa-solid fa-m"></i> Assign Material</a>`

   return `
        <div class="aztec-durability-summary" style="${containerStyle}">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
                <span style="display: flex; align-items: center; gap: 12px;">
                    <span>HP: <span class="durability-edit" data-item-id="${item.id}" data-flag-key="currentHp" contenteditable="true">${currentHp}</span> / <span class="durability-edit" data-item-id="${item.id}" data-flag-key="maxHp" contenteditable="true">${maxHp}</span></span>
                    <span style="display: flex; align-items: center; gap: 6px;">
                        <a class="damage-hammer inv-hammer" data-item-id="${item.id}" title="Strike Item"><i class="fa-solid fa-hammer-crash"></i></a>
                        <span class="inv-damage-edit" data-item-id="${item.id}" contenteditable="true" style="display: inline-block; min-width: 16px; text-align: center;" title="Damage Amount">0</span>
                        ${ignoreLabel}
                    </span>
                </span>
                ${assignMaterialMarkup}
            </div>
            <div>
                <span>Hardness: <span class="durability-edit" data-item-id="${item.id}" data-flag-key="hardness" contenteditable="true">${hardness}</span> (BT: ${threshold})</span>
            </div>
        </div>
    `
}

const attachDurabilityListeners = (html, entity) => {
   html
      .find(".assign-material")
      .off("click")
      .on("click", (event) => {
         event.preventDefault()
         event.stopPropagation()
         const itemId = event.currentTarget.dataset.itemId
         const item = entity.items ? entity.items.get(itemId) : entity
         if (item) openMaterialDialog(item, false)
      })

   html
      .find(".add-durability")
      .off("click")
      .on("click", (event) => {
         event.preventDefault()
         event.stopPropagation()
         const itemId = event.currentTarget.dataset.itemId
         const item = entity.items ? entity.items.get(itemId) : entity
         if (item) openMaterialDialog(item, true)
      })

   html
      .find(".durability-edit, .inv-damage-edit")
      .off("focus")
      .on("focus", (event) => {
         const span = event.currentTarget
         const selection = window.getSelection()
         const range = document.createRange()
         range.selectNodeContents(span)
         selection.removeAllRanges()
         selection.addRange(range)
      })

   html
      .find(".durability-edit")
      .off("blur")
      .on("blur", async (event) => {
         const span = event.currentTarget
         const itemId = span.dataset.itemId
         const flagKey = span.dataset.flagKey
         let newValue = parseInt(span.innerText) || 0
         const item = entity.items ? entity.items.get(itemId) : entity

         if (item) {
            let updates = {}
            let isShield = item.type === "shield"
            let isDefaultType =
               item.type === "weapon" || item.type === "armor" || isShield

            let currentMax = isShield
               ? item.system.hp?.max ?? 1
               : item.getFlag("world", "maxHp") ?? (isDefaultType ? 10 : 1)
            let currentHp = isShield
               ? item.system.hp?.value ?? 0
               : item.getFlag("world", "currentHp") ?? (isDefaultType ? 10 : 0)

            if (flagKey === "currentHp") {
               if (newValue > currentMax) newValue = currentMax
               if (newValue < 0) newValue = 0
               span.innerText = newValue
            } else if (flagKey === "maxHp") {
               if (newValue < 1) newValue = 1
               span.innerText = newValue
               if (currentHp > newValue) {
                  if (isShield) updates["system.hp.value"] = newValue
                  else updates["flags.world.currentHp"] = newValue
               }
            } else if (flagKey === "hardness") {
               if (newValue < 0) newValue = 0
               span.innerText = newValue
            }

            if (isShield) {
               if (flagKey === "currentHp")
                  updates["system.hp.value"] = newValue
               if (flagKey === "maxHp") updates["system.hp.max"] = newValue
               if (flagKey === "hardness") updates["system.hardness"] = newValue
            } else {
               if (
                  item.getFlag("world", "maxHp") === undefined &&
                  isDefaultType
               ) {
                  updates["flags.world.maxHp"] =
                     flagKey === "maxHp" ? newValue : 10
                  updates["flags.world.currentHp"] =
                     flagKey === "currentHp" ? newValue : 10
                  updates["flags.world.hardness"] =
                     flagKey === "hardness" ? newValue : 5
               }

               if (item.getFlag("world", flagKey) !== newValue) {
                  updates[`flags.world.${flagKey}`] = newValue
               }
            }

            if (Object.keys(updates).length > 0) {
               await item.update(updates)
            }
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
         const icon = event.currentTarget
         const itemId = icon.dataset.itemId
         const item = entity.items ? entity.items.get(itemId) : entity

         const damageSpan = $(event.currentTarget)
            .parent()
            .find(".inv-damage-edit")
         const damage = parseInt(damageSpan.text()) || 0
         if (damage <= 0 || !item) return

         const ignoreHardness = $(event.currentTarget)
            .parent()
            .find(".inv-ignore-box")
            .is(":checked")
         await processItemDamage(item, damage, ignoreHardness)
         damageSpan.text("0")
      })
}

Hooks.on("preUpdateItem", (item, changes, options, userId) => {
   if (game.user.id !== userId) return
   if (!physicalTypes.includes(item.type)) return

   let isShield = item.type === "shield"
   let isDefaultType =
      item.type === "armor" || item.type === "weapon" || isShield
   let oldMax = isShield
      ? item.system.hp?.max ?? 1
      : item.getFlag("world", "maxHp") || (isDefaultType ? 10 : 1)
   let oldHp = isShield
      ? item.system.hp?.value ?? 0
      : item.getFlag("world", "currentHp") ?? (isDefaultType ? 10 : 0)

   options.aztecOldHp = oldHp
   options.aztecOldMax = oldMax

   let newMax = isShield
      ? changes.system?.hp?.max ?? oldMax
      : changes.flags?.world?.maxHp ?? oldMax
   let newHp = isShield
      ? changes.system?.hp?.value ?? oldHp
      : changes.flags?.world?.currentHp ?? oldHp

   if (newHp > newMax) {
      newHp = newMax
      if (isShield) {
         changes.system = changes.system || {}
         changes.system.hp = changes.system.hp || {}
         changes.system.hp.value = newMax
      } else {
         changes.flags = changes.flags || {}
         changes.flags.world = changes.flags.world || {}
         changes.flags.world.currentHp = newMax
      }
   }

   let threshold = isShield
      ? item.system.hp?.brokenThreshold ?? Math.floor(newMax / 2)
      : Math.floor(newMax / 2)
   let wasBroken =
      oldMax > 0 &&
      oldHp <=
         (isShield
            ? item.system.hp?.brokenThreshold ?? Math.floor(oldMax / 2)
            : Math.floor(oldMax / 2))
   let isBroken = newMax > 0 && newHp <= threshold

   if (newHp === 0) {
      if (changes.system?.equipped) {
         let newCarry =
            changes.system.equipped.carryType ?? item.system.equipped?.carryType
         let newInSlot =
            changes.system.equipped.inSlot ?? item.system.equipped?.inSlot
         let allowedTypes = ["dropped", "stowed", "worn"]
         if (!allowedTypes.includes(newCarry) || newInSlot === true) {
            ui.notifications.warn(
               `${item.name} is destroyed and cannot be equipped.`
            )
            delete changes.system.equipped
         }
      }
      if (oldHp > 0) {
         changes.system = changes.system || {}
         changes.system.equipped = changes.system.equipped || {}
         changes.system.equipped.carryType = "worn"
         changes.system.equipped.inSlot = false
         changes.system.equipped.handsHeld = 0
         changes.system.equipped.invested = false
      }
   }

   if (item.actor && item.actor.type === "npc") return
   if (isShield) return

   let rules = foundry.utils.duplicate(item.system.rules || [])
   let rulesChanged = false

   if (item.type === "armor") {
      let armorPenaltyEnabled = game.settings.get(
         "pf2e-aztecs-sundered",
         "enableArmourPenalty"
      )
      let penalty = 0
      if (item.system.category === "light")
         penalty = game.settings.get(
            "pf2e-aztecs-sundered",
            "armourPenaltyLight"
         )
      if (item.system.category === "medium")
         penalty = game.settings.get(
            "pf2e-aztecs-sundered",
            "armourPenaltyMedium"
         )
      if (item.system.category === "heavy")
         penalty = game.settings.get(
            "pf2e-aztecs-sundered",
            "armourPenaltyHeavy"
         )

      let brokenRuleIndex = rules.findIndex(
         (r) => r.slug === "broken-armour-penalty"
      )
      if (isBroken && armorPenaltyEnabled && penalty !== 0) {
         if (brokenRuleIndex === -1) {
            rules.push({
               key: "FlatModifier",
               selector: "ac",
               value: penalty,
               slug: "broken-armour-penalty",
               label: "Broken Armour",
            })
            rulesChanged = true
         } else if (rules[brokenRuleIndex].value !== penalty) {
            rules[brokenRuleIndex].value = penalty
            rulesChanged = true
         }
      } else if (brokenRuleIndex !== -1) {
         rules.splice(brokenRuleIndex, 1)
         rulesChanged = true
      }
   }

   if (item.type === "weapon") {
      let weaponPenaltyEnabled = game.settings.get(
         "pf2e-aztecs-sundered",
         "enableWeaponPenalty"
      )
      let penalty = game.settings.get(
         "pf2e-aztecs-sundered",
         "weaponPenaltyAmount"
      )

      let atkRuleIndex = rules.findIndex(
         (r) => r.slug === "broken-weapon-attack"
      )
      let dmgRuleIndex = rules.findIndex(
         (r) => r.slug === "broken-weapon-damage"
      )

      if (isBroken && weaponPenaltyEnabled && penalty !== 0) {
         if (atkRuleIndex === -1) {
            rules.push({
               key: "FlatModifier",
               selector: "attack",
               type: "item",
               value: penalty,
               slug: "broken-weapon-attack",
               label: "Broken Weapon",
            })
            rulesChanged = true
         } else if (rules[atkRuleIndex].value !== penalty) {
            rules[atkRuleIndex].value = penalty
            rulesChanged = true
         }
         if (dmgRuleIndex === -1) {
            rules.push({
               key: "FlatModifier",
               selector: "damage",
               type: "item",
               value: penalty,
               slug: "broken-weapon-damage",
               label: "Broken Weapon",
            })
            rulesChanged = true
         } else if (rules[dmgRuleIndex].value !== penalty) {
            rules[dmgRuleIndex].value = penalty
            rulesChanged = true
         }
      } else {
         let toRemove = []
         if (atkRuleIndex !== -1) toRemove.push(atkRuleIndex)
         if (dmgRuleIndex !== -1) toRemove.push(dmgRuleIndex)
         if (toRemove.length > 0) {
            toRemove.sort((a, b) => b - a).forEach((i) => rules.splice(i, 1))
            rulesChanged = true
         }
      }
   }

   if (rulesChanged) {
      changes.system = changes.system || {}
      changes.system.rules = rules
   }

   let backup = item.getFlag("world", "runesBackup")

   if (isBroken) {
      let currentRunes = foundry.utils.duplicate(item.system.runes || {})
      if (!backup) {
         backup = currentRunes
         changes.flags = changes.flags || {}
         changes.flags.world = changes.flags.world || {}
         changes.flags.world.runesBackup = backup
      }

      let desiredRunes = foundry.utils.duplicate(backup)

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
                  "suppressArmourResilient"
               )
            )
               desiredRunes.resilient = 0
            if (
               game.settings.get(
                  "pf2e-aztecs-sundered",
                  "suppressArmourProperty"
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
                  "suppressWeaponStriking"
               )
            )
               desiredRunes.striking = 0
            if (
               game.settings.get(
                  "pf2e-aztecs-sundered",
                  "suppressWeaponProperty"
               )
            )
               desiredRunes.property = []
         }
      }

      if (changes.system?.runes) {
         foundry.utils.mergeObject(backup, changes.system.runes)
         changes.flags = changes.flags || {}
         changes.flags.world = changes.flags.world || {}
         changes.flags.world.runesBackup = backup

         desiredRunes = foundry.utils.duplicate(backup)
         if (item.type === "armor") {
            if (
               game.settings.get(
                  "pf2e-aztecs-sundered",
                  "suppressArmourPotency"
               )
            ) {
               desiredRunes.potency = 0
               desiredRunes.resilient = 0
               desiredRunes.property = []
            } else {
               if (
                  game.settings.get(
                     "pf2e-aztecs-sundered",
                     "suppressArmourResilient"
                  )
               )
                  desiredRunes.resilient = 0
               if (
                  game.settings.get(
                     "pf2e-aztecs-sundered",
                     "suppressArmourProperty"
                  )
               )
                  desiredRunes.property = []
            }
         } else if (item.type === "weapon") {
            if (
               game.settings.get(
                  "pf2e-aztecs-sundered",
                  "suppressWeaponPotency"
               )
            ) {
               desiredRunes.potency = 0
               desiredRunes.striking = 0
               desiredRunes.property = []
            } else {
               if (
                  game.settings.get(
                     "pf2e-aztecs-sundered",
                     "suppressWeaponStriking"
                  )
               )
                  desiredRunes.striking = 0
               if (
                  game.settings.get(
                     "pf2e-aztecs-sundered",
                     "suppressWeaponProperty"
                  )
               )
                  desiredRunes.property = []
            }
         }
      }

      changes.system = changes.system || {}
      changes.system.runes = desiredRunes
   } else if (wasBroken && !isBroken) {
      if (backup) {
         changes.system = changes.system || {}
         changes.system.runes = foundry.utils.duplicate(backup)
         changes.flags = changes.flags || {}
         changes.flags.world = changes.flags.world || {}
         changes.flags.world["-=runesBackup"] = null
      }
   }
})

Hooks.on("updateItem", async (item, changes, options, userId) => {
   if (game.user.id !== userId) return
   if (item.type !== "armor" && item.type !== "weapon") return

   if (item.actor && item.actor.type === "npc") {
      let isDefaultType = item.type === "armor" || item.type === "weapon"
      let oldMax = options.aztecOldMax ?? (isDefaultType ? 10 : 1)
      let oldHp = options.aztecOldHp ?? (isDefaultType ? 10 : 0)
      let newMax = item.getFlag("world", "maxHp") ?? oldMax
      let newHp = item.getFlag("world", "currentHp") ?? oldHp

      let wasBroken = oldMax > 0 && oldHp <= Math.floor(oldMax / 2)
      let isBroken = newMax > 0 && newHp <= Math.floor(newMax / 2)

      if (!wasBroken && isBroken) {
         let choices = await launchNPCDialog(item)
         if (choices) {
            if (item.type === "armor")
               await applyNPCArmorPenalties(item, choices)
            if (item.type === "weapon")
               await applyNPCWeaponPenalties(item, choices)
         }
      } else if (wasBroken && !isBroken) {
         if (item.type === "armor") await removeNPCArmorPenalties(item)
         if (item.type === "weapon") await removeNPCWeaponPenalties(item)
      }
   }
})

Hooks.on("renderItemSheet", (app, htmlElement, data) => {
   const item = app.document
   if (!physicalTypes.includes(item.type)) return

   const html = $(htmlElement[0] ?? htmlElement)

   let content = buildDurabilityHTML(item, true)
   let tab = html.find('.tab[data-tab="description"]')

   if (tab.length) {
      tab.prepend(content)
   } else {
      html.find(".sheet-body").prepend(content)
   }

   attachDurabilityListeners(html, item)
})

Hooks.on("renderActorSheet", (app, htmlElement, data) => {
   const actor = app.actor
   const allowedActors = ["character", "npc", "familiar", "vehicle", "loot"]

   if (!actor || !allowedActors.includes(actor.type)) return

   const html = $(htmlElement[0] ?? htmlElement)

   const physicalItems =
      actor.inventory?.contents ||
      actor.items.filter((i) => physicalTypes.includes(i.type))
   let showInventoryUI = game.settings.get(
      "pf2e-aztecs-sundered",
      "showInventoryUI"
   )

   physicalItems.forEach((item) => {
      let isShield = item.type === "shield"
      let isDefaultType =
         item.type === "armor" || item.type === "weapon" || isShield
      let maxHpFlag = item.getFlag("world", "maxHp")
      let hasDurability = maxHpFlag !== undefined

      let itemRow = html.find(`[data-item-id="${item.id}"]`)
      let nameElement = itemRow.find(".item-name h4")

      if (nameElement.length === 0) {
         nameElement = itemRow.find(".name")
      }

      if (isDefaultType || hasDurability) {
         let currentHp = isShield
            ? item.system.hp?.value ?? 0
            : item.getFlag("world", "currentHp") ??
              (isDefaultType && !hasDurability ? 10 : 0)
         let maxHp = isShield
            ? item.system.hp?.max ?? 0
            : maxHpFlag ?? (isDefaultType && !hasDurability ? 10 : 0)
         let hardness = isShield
            ? item.system.hardness ?? 0
            : item.getFlag("world", "hardness") ??
              (isDefaultType && !hasDurability ? 5 : 0)
         let threshold = isShield
            ? item.system.hp?.brokenThreshold ?? Math.floor(maxHp / 2)
            : Math.floor(maxHp / 2)

         if (showInventoryUI) {
            let displayString = `
                    <span style="font-size: 0.85em; color: grey; margin-left: 8px; display: inline-flex; align-items: center;">
                        (HP: <span class="durability-edit" data-item-id="${item.id}" data-flag-key="currentHp" contenteditable="true">${currentHp}</span> / 
                        <span class="durability-edit" data-item-id="${item.id}" data-flag-key="maxHp" contenteditable="true">${maxHp}</span> | 
                        HD: <span class="durability-edit" data-item-id="${item.id}" data-flag-key="hardness" contenteditable="true">${hardness}</span>)
                        
                        <span style="margin-left: 14px; display: inline-flex; align-items: center; gap: 6px;">
                            <a class="damage-hammer inv-hammer" data-item-id="${item.id}" title="Strike Item"><i class="fa-solid fa-hammer-crash"></i></a>
                            <span class="inv-damage-edit" data-item-id="${item.id}" contenteditable="true" style="display: inline-block; min-width: 16px; text-align: center;" title="Damage Amount">0</span>
                            <input type="checkbox" class="inv-ignore-box" data-item-id="${item.id}" title="Ignore Hardness" style="margin: 0; width: 14px; height: 14px; cursor: pointer;">
                        </span>
                    </span>
                `

            nameElement.append(displayString)

            let mButton = isShield
               ? ""
               : `<a class="assign-material" data-item-id="${item.id}" title="Assign Material" style="margin-right: 8px; font-size: 1.1em;"><i class="fa-solid fa-m"></i></a>`
            let carryToggle = itemRow.find(".item-carry-type")

            if (mButton) {
               if (carryToggle.length > 0) {
                  carryToggle.before(mButton)
               } else {
                  itemRow.find(".item-controls").prepend(mButton)
               }
            }
         }

         if (maxHp > 0) {
            if (currentHp <= 0) {
               let skullIcon = `<i class="fa-solid fa-skull" style="color: #555; margin-right: 6px;" title="Destroyed"></i>`
               nameElement.prepend(skullIcon)
               itemRow.css({ opacity: "0.5", filter: "grayscale(100%)" })
            } else if (currentHp <= threshold) {
               let brokenIcon = `<i class="fa-solid fa-heart-crack" style="color: #a83232; margin-right: 6px;" title="Broken"></i>`
               nameElement.prepend(brokenIcon)
            }
         }
      } else if (showInventoryUI) {
         let addIcon = `<a class="add-durability" data-item-id="${item.id}" title="Track Durability"><i class="fa-solid fa-shield-exclamation"></i></a>`
         nameElement.append(addIcon)
      }
   })

   attachDurabilityListeners(html, actor)
})
