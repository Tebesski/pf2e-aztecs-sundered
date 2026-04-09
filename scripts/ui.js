import {
   materialStats,
   armorPropertyMap,
   weaponPropertyMap,
   dmgIcons,
} from "./constants.js"
import { getDefaultDurability } from "./logic.js"

export const openMaterialDialog = async (item, isNewItem) => {
   let materialOptions = Object.entries(materialStats).map(
      ([keyName, values]) => ({
         key: keyName,
         name: game.i18n.localize(
            `pf2e-aztecs-sundered.material-stats.${keyName}.name`,
         ),
         hd: values.hd,
         hp: values.hp,
         bt: Math.floor(values.hp / 2),
      }),
   )

   let dialogContent = await renderTemplate(
      "modules/pf2e-aztecs-sundered/templates/material-dialog.hbs",
      {
         options: materialOptions,
         hpLabel: game.i18n.localize(
            "pf2e-aztecs-sundered.sheet-text.hp-short",
         ),
         hdLabel: game.i18n.localize(
            "pf2e-aztecs-sundered.sheet-text.hd-short",
         ),
         btLabel: game.i18n.localize(
            "pf2e-aztecs-sundered.sheet-text.bt-short",
         ),
      },
   )

   new Dialog({
      title: game.i18n.localize("pf2e-aztecs-sundered.dialog.material.title"),
      content: dialogContent,
      render: (html) => {
         const selectElement = html.find("#mat-select")
         const descriptionElement = html.find("#mat-desc")
         const updateDescription = () => {
            let examplesText = game.i18n.localize(
               `pf2e-aztecs-sundered.material-stats.${selectElement.val()}.examples`,
            )
            descriptionElement.text(
               `${game.i18n.localize("pf2e-aztecs-sundered.dialog.material.common-examples")}: ${examplesText}`,
            )
         }
         selectElement.on("change", updateDescription)
         updateDescription()
      },
      buttons: {
         apply: {
            icon: '<i class="fa-solid fa-hammer"></i>',
            label: game.i18n.localize(
               "pf2e-aztecs-sundered.dialog.material.apply-material",
            ),
            callback: async (html) => {
               let selectedKey = html.find("#mat-select").val()
               let materialData = materialStats[selectedKey]
               let isDefaultType =
                  item.type === "armor" || item.type === "weapon"
               let hasDurabilityFlags =
                  item.getFlag("world", "maxHp") !== undefined
               let defaultDurabilityStats = getDefaultDurability(item)

               let oldMaximumHp = hasDurabilityFlags
                  ? item.getFlag("world", "maxHp")
                  : isDefaultType
                    ? defaultDurabilityStats.maxHp
                    : 1

               let oldCurrentHp = hasDurabilityFlags
                  ? item.getFlag("world", "currentHp")
                  : isDefaultType
                    ? defaultDurabilityStats.maxHp
                    : 0

               if (oldMaximumHp <= 0) oldMaximumHp = 1

               let newMaximumHp = materialData.hp
               let newCurrentHp = isNewItem
                  ? materialData.hp
                  : Math.round((oldCurrentHp / oldMaximumHp) * newMaximumHp)

               await item.update({
                  "flags.world.maxHp": newMaximumHp,
                  "flags.world.currentHp": newCurrentHp,
                  "flags.world.hardness": materialData.hd,
                  "flags.world.assignedMaterial": selectedKey,
               })
            },
         },
      },
      default: "apply",
   }).render(true)
}

export const launchNPCDialog = async (item, isDestroyedStatus = false) => {
   return new Promise(async (resolve) => {
      const isArmorItem = item.type === "armor"
      const itemRunes = item.system.runes || {}

      let activeArmorProperties = []
      let activeWeaponProperties = []

      if (isArmorItem && itemRunes.property) {
         itemRunes.property.forEach((propertyString) => {
            if (armorPropertyMap[propertyString])
               activeArmorProperties.push({
                  key: propertyString,
                  label: game.i18n.localize(
                     `pf2e-aztecs-sundered.armor-property.${propertyString}.label`,
                  ),
               })
         })
      } else if (!isArmorItem && itemRunes.property) {
         itemRunes.property.forEach((propertyString) => {
            if (weaponPropertyMap[propertyString])
               activeWeaponProperties.push({
                  key: propertyString,
                  label: game.i18n.localize(
                     `pf2e-aztecs-sundered.weapon-property.${propertyString}.label`,
                  ),
               })
         })
      }

      let dialogContent = await renderTemplate(
         "modules/pf2e-aztecs-sundered/templates/npc-dialog.hbs",
         {
            item,
            isDestroyed: isDestroyedStatus,
            isArmor: isArmorItem,
            runes: itemRunes,
            activeArmorProps: activeArmorProperties,
            activeWeaponProps: activeWeaponProperties,
            hasResilient: itemRunes.resilient > 0,
            hasStriking: itemRunes.striking > 0,
         },
      )

      new Dialog({
         title: `${game.i18n.localize("pf2e-aztecs-sundered.dialog.npc.title")}: ${item.name}`,
         content: dialogContent,
         render: (html) => {
            if (isDestroyedStatus) {
               const htmlContext = $(html[0] ?? html)
               const fullDestructionCheckbox = htmlContext.find(
                  "#npc-full-destruction",
               )
               const otherDialogInputs = htmlContext
                  .find("input")
                  .not("#npc-full-destruction")

               const toggleInputsState = () => {
                  let isBoxChecked = fullDestructionCheckbox.is(":checked")
                  otherDialogInputs.prop("disabled", isBoxChecked)
                  otherDialogInputs
                     .closest(".form-group")
                     .css("opacity", isBoxChecked ? "0.4" : "1")
               }
               fullDestructionCheckbox.on("change", toggleInputsState)
               toggleInputsState()
            }
         },
         buttons: {
            apply: {
               icon: '<i class="fas fa-check"></i>',
               label: game.i18n.localize(
                  "pf2e-aztecs-sundered.dialog.npc.apply-penalties",
               ),
               callback: (html) => {
                  const htmlContext = $(html[0] ?? html)
                  let chosenActiveProperties = []
                  let applyFullDestruction = isDestroyedStatus
                     ? htmlContext.find("#npc-full-destruction").is(":checked")
                     : false

                  if (isArmorItem) {
                     htmlContext
                        .find(".npc-armor-prop:checked")
                        .each((index, element) =>
                           chosenActiveProperties.push(element.dataset.prop),
                        )
                     resolve({
                        isArmor: true,
                        acPenalty:
                           parseInt(
                              htmlContext.find("#npc-ac-penalty").val(),
                           ) || 0,
                        suppressResilient: htmlContext
                           .find("#npc-resilient-penalty")
                           .is(":checked"),
                        resilientVal: itemRunes.resilient || 0,
                        activeProps: chosenActiveProperties,
                        fullDestruction: applyFullDestruction,
                     })
                  } else {
                     htmlContext
                        .find(".npc-weapon-prop:checked")
                        .each((index, element) =>
                           chosenActiveProperties.push(element.dataset.prop),
                        )
                     resolve({
                        isArmor: false,
                        wPenalty:
                           parseInt(
                              htmlContext.find("#npc-weapon-penalty").val(),
                           ) || 0,
                        suppressStriking: htmlContext
                           .find("#npc-striking-penalty")
                           .is(":checked"),
                        strikingVal: itemRunes.striking || 0,
                        activeProps: chosenActiveProperties,
                        fullDestruction: applyFullDestruction,
                     })
                  }
               },
            },
         },
         default: "apply",
         close: () => resolve(null),
      }).render(true)
   })
}

export const launchSunderMacro = async (
   actor,
   attackerData = { rawDamage: 0, parsedDamage: [] },
) => {
   const inventoryItems = actor.items
      .filter((itemData) =>
         ["weapon", "armor", "shield"].includes(itemData.type),
      )
      .map((itemData) => {
         const isShieldItem = itemData.type === "shield"
         return {
            id: itemData.id,
            name: itemData.name,
            img: itemData.img,
            isShield: isShieldItem,
            hasFlags: itemData.getFlag("world", "maxHp") !== undefined,
            currentHp: isShieldItem
               ? (itemData.system.hp?.value ?? 0)
               : (itemData.getFlag("world", "currentHp") ?? 10),
            maximumHp: isShieldItem
               ? (itemData.system.hp?.max ?? 0)
               : (itemData.getFlag("world", "maxHp") ?? 10),
            hardness: isShieldItem
               ? (itemData.system.hardness ?? 0)
               : (itemData.getFlag("world", "hardness") ?? 5),
         }
      })

   if (inventoryItems.length === 0)
      return ui.notifications.warn(
         game.i18n.localize("pf2e-aztecs-sundered.notifications.no-items"),
      )

   let corrosiveDamageAmount = 0
   if (attackerData.isCorrosive) {
      let corrosiveRoll = await new Roll(attackerData.corrosiveDice).evaluate({
         async: true,
      })
      corrosiveDamageAmount = corrosiveRoll.total
   }

   let formattedDamageInstances = attackerData.parsedDamage.map(
      (damageItem) => {
         return {
            ...damageItem,
            iconData: dmgIcons[damageItem.type] || {
               icon: "fa-droplet",
               color: "#555",
            },
         }
      },
   )

   let dialogContent = await renderTemplate(
      "modules/pf2e-aztecs-sundered/templates/sunder-dialog.hbs",
      {
         items: inventoryItems,
         rawDamage: attackerData.rawDamage,
         isRazing: attackerData.isRazing,
         razingDamage: attackerData.razingDamage,
         isCorrosive: attackerData.isCorrosive,
         corrosiveDmg: corrosiveDamageAmount,
         corrosiveDice: attackerData.corrosiveDice,
         isAdamantine: attackerData.isAdamantine,
         isHighGrade: attackerData.adamantineGrade === "high",
         persistentData: attackerData.persistentData,
         parsedDamage: formattedDamageInstances,
         hasParsedDamage: formattedDamageInstances.length > 0,
      },
   )

   new Dialog({
      title: game.i18n.format("pf2e-aztecs-sundered.dialog.sunder.title", {
         actorName: actor.name,
      }),
      content: dialogContent,
      render: (html) => {
         const updateDialogPreview = () => {
            const selectedItemData = inventoryItems.find(
               (item) => item.id === html.find("#item-select").val(),
            )
            const baseRawDamage = parseInt(html.find("#raw-damage").val()) || 0
            const razingDamageAmount =
               parseInt(html.find("#razing-dmg").val()) || 0
            const extraCorrosiveDamage =
               parseInt(html.find("#corrosive-dmg").val()) || 0
            const ignoreHardnessAmount =
               parseInt(html.find("#ignore-hd").val()) || 0
            const customResistanceAmount =
               parseInt(html.find("#custom-res").val()) || 0
            const useAdamantineLogic = html
               .find("#use-adamantine")
               .is(":checked")
            const adamantineHardnessThreshold =
               parseInt(html.find("#adamantine-hd").val()) || 0

            html.find("#adamantine-hd").prop("disabled", !useAdamantineLogic)
            html.find("#item-icon-preview").attr("src", selectedItemData.img)

            let startingHardness = selectedItemData.hardness
            if (
               useAdamantineLogic &&
               startingHardness <= adamantineHardnessThreshold
            )
               startingHardness = Math.floor(startingHardness / 2)

            const finalEffectiveHardness = Math.max(
               0,
               startingHardness - ignoreHardnessAmount,
            )
            const calculatedNetDamage = Math.max(
               0,
               baseRawDamage +
                  razingDamageAmount +
                  extraCorrosiveDamage -
                  finalEffectiveHardness -
                  customResistanceAmount,
            )

            html.find("#eff-hd").text(finalEffectiveHardness)
            html.find("#net-dmg").text(calculatedNetDamage)
            html
               .find("#rem-hp")
               .text(
                  `${Math.max(0, selectedItemData.currentHp - calculatedNetDamage)} / ${selectedItemData.maximumHp}`,
               )
         }

         html.find(".dmg-toggle").on("change", () => {
            let updatedRawDamage = 0
            html.find(".dmg-toggle:checked").each((index, element) => {
               updatedRawDamage +=
                  attackerData.parsedDamage[$(element).data("idx")].value
            })
            html.find("#raw-damage").val(updatedRawDamage)
            updateDialogPreview()
         })
         html.find("input, select").on("input change", updateDialogPreview)
         updateDialogPreview()
      },
      buttons: {
         sunder: {
            icon: '<i class="fas fa-hammer"></i>',
            label: game.i18n.localize(
               "pf2e-aztecs-sundered.dialog.sunder.apply-damage",
            ),
            callback: async (html) => {
               const targetItemId = html.find("#item-select").val()
               const targetItemObject = actor.items.get(targetItemId)
               const targetItemData = inventoryItems.find(
                  (item) => item.id === targetItemId,
               )

               const baseRawDamage =
                  parseInt(html.find("#raw-damage").val()) || 0
               const razingDamageAmount =
                  parseInt(html.find("#razing-dmg").val()) || 0
               const extraCorrosiveDamage =
                  parseInt(html.find("#corrosive-dmg").val()) || 0
               const ignoreHardnessAmount =
                  parseInt(html.find("#ignore-hd").val()) || 0
               const customResistanceAmount =
                  parseInt(html.find("#custom-res").val()) || 0
               const useAdamantineLogic = html
                  .find("#use-adamantine")
                  .is(":checked")
               const adamantineHardnessThreshold =
                  parseInt(html.find("#adamantine-hd").val()) || 0

               let startingHardness = targetItemData.hardness
               if (
                  useAdamantineLogic &&
                  startingHardness <= adamantineHardnessThreshold
               )
                  startingHardness = Math.floor(startingHardness / 2)

               const finalEffectiveHardness = Math.max(
                  0,
                  startingHardness - ignoreHardnessAmount,
               )
               const totalIncomingDamage =
                  baseRawDamage + razingDamageAmount + extraCorrosiveDamage
               const calculatedNetDamage = Math.max(
                  0,
                  totalIncomingDamage -
                     finalEffectiveHardness -
                     customResistanceAmount,
               )
               const newCalculatedHitPoints = Math.max(
                  0,
                  targetItemData.currentHp - calculatedNetDamage,
               )

               let targetItemUpdates = {}
               if (targetItemData.isShield)
                  targetItemUpdates["system.hp.value"] = newCalculatedHitPoints
               else {
                  targetItemUpdates["flags.world.currentHp"] =
                     newCalculatedHitPoints
                  if (!targetItemData.hasFlags) {
                     targetItemUpdates["flags.world.maxHp"] =
                        targetItemData.maximumHp
                     targetItemUpdates["flags.world.hardness"] =
                        targetItemData.hardness
                  }
               }
               await targetItemObject.update(targetItemUpdates)

               if (
                  html.find("#apply-persistent").is(":checked") &&
                  attackerData.persistentData
               ) {
                  await actor.createEmbeddedDocuments("Item", [
                     {
                        type: "effect",
                        name: game.i18n.format(
                           "pf2e-aztecs-sundered.effect.persistent-damage.name",
                           { itemName: targetItemObject.name },
                        ),
                        img: targetItemData.img,
                        system: {
                           description: {
                              value: game.i18n.format(
                                 "pf2e-aztecs-sundered.effect.persistent-damage.desc",
                                 {
                                    formula:
                                       attackerData.persistentData.formula,
                                    type: attackerData.persistentData.type,
                                 },
                              ),
                           },
                           tokenIcon: { show: true },
                           duration: { value: 1, unit: "unlimited" },
                        },
                        flags: {
                           "pf2e-aztecs-sundered": {
                              isPersistentItemDamage: true,
                              itemId: targetItemId,
                              formula: attackerData.persistentData.formula,
                              type: attackerData.persistentData.type,
                           },
                        },
                     },
                  ])
               }

               let damageBreakdownString = ""
               html.find(".dmg-toggle:checked").each((index, element) => {
                  let damageInstance =
                     attackerData.parsedDamage[$(element).data("idx")]
                  damageBreakdownString += ` <span style="display:inline-block; border:1px solid #777; padding:1px 4px; border-radius:3px; font-size:0.85em;">${damageInstance.value} ${damageInstance.type}</span>`
               })

               const headerTitle = game.i18n.format(
                  "pf2e-aztecs-sundered.chat.sunder.header",
                  { itemName: targetItemObject.name },
               )
               const rawIncomingLabel = game.i18n.localize(
                  "pf2e-aztecs-sundered.chat.sunder.raw-incoming",
               )
               const effHardnessLabel = game.i18n.localize(
                  "pf2e-aztecs-sundered.chat.sunder.eff-hardness",
               )
               const netDamageLabel = game.i18n.localize(
                  "pf2e-aztecs-sundered.chat.sunder.net-damage",
               )
               const currentHpLabel = game.i18n.localize(
                  "pf2e-aztecs-sundered.chat.sunder.current-hp",
               )

               ChatMessage.create({
                  user: game.user.id,
                  speaker: ChatMessage.getSpeaker({
                     actor: game.user.character || null,
                  }),
                  content: `<div class="pf2e chat-card"><header class="card-header flexrow"><img src="${targetItemObject.img}" title="${targetItemObject.name}" width="36" height="36"/><h3>${headerTitle}</h3></header><div class="card-content" style="margin-top: 5px;"><div><strong>${rawIncomingLabel}:</strong> ${totalIncomingDamage} ${damageBreakdownString}</div><div><strong>${effHardnessLabel}:</strong> ${finalEffectiveHardness}</div><div style="font-size: 1.1em; margin: 4px 0;"><strong>${netDamageLabel}:</strong> <span style="color: #d9534f;">${calculatedNetDamage}</span></div><div style="text-align: center; margin-top: 5px;">${currentHpLabel}: <strong>${newCalculatedHitPoints} / ${targetItemData.maximumHp}</strong></div></div></div>`,
               })
            },
         },
      },
      default: "sunder",
   }).render(true)
}

export const launchPersistentItemDamageDialog = async (actor, effectItem) => {
   let itemFlags = effectItem.flags["pf2e-aztecs-sundered"]
   let targetItemObject = actor.items.get(itemFlags.itemId)
   if (!targetItemObject) return await effectItem.delete()

   let isShieldItem = targetItemObject.type === "shield"
   let itemMaximumHp = isShieldItem
      ? (targetItemObject.system.hp?.max ?? 0)
      : (targetItemObject.getFlag("world", "maxHp") ?? 10)
   let itemCurrentHp = isShieldItem
      ? (targetItemObject.system.hp?.value ?? 0)
      : (targetItemObject.getFlag("world", "currentHp") ?? 10)
   let itemBaseHardness = isShieldItem
      ? (targetItemObject.system.hardness ?? 0)
      : (targetItemObject.getFlag("world", "hardness") ?? 5)

   let cleanRollFormula =
      String(itemFlags.formula || "1d6")
         .split(/[pP\[]/)[0]
         .replace(/[^\d\+\-\*\/\(\)d]/gi, "")
         .trim() || "1d6"
   let persistentDamageRoll = await new Roll(cleanRollFormula).evaluate({
      async: true,
   })

   let dialogContent = await renderTemplate(
      "modules/pf2e-aztecs-sundered/templates/persistent-dialog.hbs",
      {
         item: targetItemObject,
         dmg: persistentDamageRoll.total,
         flags: itemFlags,
         cleanFormula: cleanRollFormula,
         baseHd: itemBaseHardness,
         initialNetDmg: Math.max(
            0,
            persistentDamageRoll.total - itemBaseHardness,
         ),
         initialNewHp: Math.max(
            0,
            itemCurrentHp -
               Math.max(0, persistentDamageRoll.total - itemBaseHardness),
         ),
         maxHp: itemMaximumHp,
      },
   )

   new Dialog({
      title: game.i18n.format("pf2e-aztecs-sundered.dialog.persistent.title", {
         actorName: actor.name,
      }),
      content: dialogContent,
      render: (html) => {
         const updatePersistentPreview = () => {
            let effectiveHardness = Math.max(
               0,
               itemBaseHardness -
                  (parseInt(html.find("#pers-ignore-hd").val()) || 0),
            )
            let calculatedNetDamage = Math.max(
               0,
               persistentDamageRoll.total -
                  effectiveHardness -
                  (parseInt(html.find("#pers-custom-res").val()) || 0),
            )

            html.find("#pers-eff-hd").text(effectiveHardness)
            html.find("#pers-net-dmg").text(calculatedNetDamage)
            html
               .find("#pers-rem-hp")
               .text(
                  `${Math.max(0, itemCurrentHp - calculatedNetDamage)} / ${itemMaximumHp}`,
               )
         }
         html.find("input").on("input change", updatePersistentPreview)
      },
      buttons: {
         damage: {
            icon: '<i class="fas fa-hammer"></i>',
            label: game.i18n.localize(
               "pf2e-aztecs-sundered.dialog.persistent.apply-damage",
            ),
            callback: async (html) => {
               let effectiveHardness = Math.max(
                  0,
                  itemBaseHardness -
                     (parseInt(html.find("#pers-ignore-hd").val()) || 0),
               )
               let calculatedNetDamage = Math.max(
                  0,
                  persistentDamageRoll.total -
                     effectiveHardness -
                     (parseInt(html.find("#pers-custom-res").val()) || 0),
               )
               let newCalculatedHitPoints = Math.max(
                  0,
                  itemCurrentHp - calculatedNetDamage,
               )

               let targetItemUpdates = {}
               if (isShieldItem)
                  targetItemUpdates["system.hp.value"] = newCalculatedHitPoints
               else
                  targetItemUpdates["flags.world.currentHp"] =
                     newCalculatedHitPoints
               await targetItemObject.update(targetItemUpdates)

               let chatContent = game.i18n.format(
                  "pf2e-aztecs-sundered.chat.persistent.content",
                  {
                     itemName: targetItemObject.name,
                     damage: calculatedNetDamage,
                     type: itemFlags.type,
                     currentHp: newCalculatedHitPoints,
                     maxHp: itemMaximumHp,
                  },
               )

               ChatMessage.create({
                  user: game.user.id,
                  speaker: ChatMessage.getSpeaker({ actor }),
                  content: chatContent,
               })
            },
         },
         end: {
            icon: '<i class="fas fa-times"></i>',
            label: game.i18n.localize(
               "pf2e-aztecs-sundered.dialog.persistent.end-effect",
            ),
            callback: async () => {
               await effectItem.delete()
               ui.notifications.info(
                  game.i18n.format(
                     "pf2e-aztecs-sundered.notifications.persistent-ended",
                     { itemName: targetItemObject.name },
                  ),
               )
            },
         },
      },
      default: "damage",
   }).render(true)
}

export const launchRepairDialog = async (itemObject) => {
   let itemActor = itemObject.actor
   if (!itemActor)
      return ui.notifications.warn(
         game.i18n.localize(
            "pf2e-aztecs-sundered.notifications.no-actor-repair",
         ),
      )
   if (!itemActor.skills?.crafting)
      return ui.notifications.warn(
         game.i18n.localize(
            "pf2e-aztecs-sundered.notifications.no-crafting-skill",
         ),
      )

   let isShieldItem = itemObject.type === "shield"
   let currentHitPoints = isShieldItem
      ? (itemObject.system.hp?.value ?? 0)
      : (itemObject.getFlag("world", "currentHp") ?? 10)
   let maximumHitPoints = isShieldItem
      ? (itemObject.system.hp?.max ?? 0)
      : (itemObject.getFlag("world", "maxHp") ?? 10)

   if (currentHitPoints >= maximumHitPoints)
      return ui.notifications.info(
         game.i18n.localize(
            "pf2e-aztecs-sundered.notifications.fully-repaired",
         ) || "This item is already at maximum HP.",
      )

   let craftingRank = itemActor.skills.crafting.rank ?? 0
   let healingValues = [0, 10, 25, 50, 90]
   let criticalHealingValues = [0, 20, 50, 100, 180]
   let repairDifficultyClass = 15

   const rankNames = [
      game.i18n.localize("pf2e-aztecs-sundered.ranks.untrained"),
      game.i18n.localize("pf2e-aztecs-sundered.ranks.trained"),
      game.i18n.localize("pf2e-aztecs-sundered.ranks.expert"),
      game.i18n.localize("pf2e-aztecs-sundered.ranks.master"),
      game.i18n.localize("pf2e-aztecs-sundered.ranks.legendary"),
   ]

   if (itemObject.system.level?.value !== undefined) {
      const standardDifficultyClasses = [
         14, 15, 16, 18, 19, 20, 22, 23, 24, 26, 27, 28, 30, 31, 32, 34, 35, 36,
         38, 39, 40, 42, 44, 46, 48, 50,
      ]
      repairDifficultyClass =
         standardDifficultyClasses[
            Math.max(0, Math.min(25, itemObject.system.level.value))
         ]
   }

   let dialogContent = await renderTemplate(
      "modules/pf2e-aztecs-sundered/templates/repair-dialog.hbs",
      {
         item: itemObject,
         rankName: rankNames[craftingRank],
         dc: repairDifficultyClass,
         baseHeal: healingValues[craftingRank],
         critHeal: criticalHealingValues[craftingRank],
      },
   )

   new Dialog({
      title: game.i18n.format("pf2e-aztecs-sundered.dialog.repair.title", {
         itemName: itemObject.name,
      }),
      content: dialogContent,
      buttons: {
         repair: {
            icon: '<i class="fas fa-dice-d20"></i>',
            label: game.i18n.localize(
               "pf2e-aztecs-sundered.dialog.repair.roll",
            ),
            callback: async (html, event) => {
               let finalDifficultyClass =
                  parseInt(html.find("#repair-dc").val()) || 15
               itemActor.skills.crafting.roll({
                  dc: { value: finalDifficultyClass },
                  event: event,
                  callback: async (rollResult, outcomeType) => {
                     if (!outcomeType) {
                        let degreeOfSuccess =
                           rollResult.total >= finalDifficultyClass + 10
                              ? 3
                              : rollResult.total >= finalDifficultyClass
                                ? 2
                                : rollResult.total <= finalDifficultyClass - 10
                                  ? 0
                                  : 1
                        if (rollResult.terms[0].results[0].result === 20)
                           degreeOfSuccess = Math.min(3, degreeOfSuccess + 1)
                        if (rollResult.terms[0].results[0].result === 1)
                           degreeOfSuccess = Math.max(0, degreeOfSuccess - 1)

                        outcomeType =
                           degreeOfSuccess === 3
                              ? "criticalSuccess"
                              : degreeOfSuccess === 2
                                ? "success"
                                : degreeOfSuccess === 0
                                  ? "criticalFailure"
                                  : "failure"
                     }

                     let amountHealed =
                        outcomeType === "criticalSuccess"
                           ? criticalHealingValues[craftingRank]
                           : outcomeType === "success"
                             ? healingValues[craftingRank]
                             : outcomeType === "criticalFailure"
                               ? -5
                               : 0
                     let newlyCalculatedHitPoints =
                        amountHealed > 0
                           ? Math.min(
                                maximumHitPoints,
                                currentHitPoints + amountHealed,
                             )
                           : Math.max(0, currentHitPoints + amountHealed)

                     let targetItemUpdates = {}
                     if (isShieldItem)
                        targetItemUpdates["system.hp.value"] =
                           newlyCalculatedHitPoints
                     else {
                        targetItemUpdates["flags.world.currentHp"] =
                           newlyCalculatedHitPoints
                        if (
                           itemObject.getFlag("world", "maxHp") === undefined
                        ) {
                           targetItemUpdates["flags.world.maxHp"] =
                              maximumHitPoints
                           targetItemUpdates["flags.world.hardness"] = 5
                        }
                     }
                     await itemObject.update(targetItemUpdates)

                     let outcomeColor =
                        outcomeType === "criticalSuccess"
                           ? "green"
                           : outcomeType === "success"
                             ? "blue"
                             : outcomeType === "criticalFailure"
                               ? "red"
                               : "gray"

                     let outcomeTextMap = {
                        criticalSuccess: game.i18n.localize(
                           "pf2e-aztecs-sundered.outcomes.critical-success",
                        ),
                        success: game.i18n.localize(
                           "pf2e-aztecs-sundered.outcomes.success",
                        ),
                        failure: game.i18n.localize(
                           "pf2e-aztecs-sundered.outcomes.failure",
                        ),
                        criticalFailure: game.i18n.localize(
                           "pf2e-aztecs-sundered.outcomes.critical-failure",
                        ),
                     }

                     let rolledFallback = game.i18n.localize(
                        "pf2e-aztecs-sundered.outcomes.rolled",
                     )
                     let repairHeader = game.i18n.format(
                        "pf2e-aztecs-sundered.chat.repair.header",
                        { itemName: itemObject.name },
                     )
                     let amountText =
                        amountHealed !== 0
                           ? game.i18n.format(
                                amountHealed > 0
                                   ? "pf2e-aztecs-sundered.chat.repair.healed"
                                   : "pf2e-aztecs-sundered.chat.repair.damaged",
                                {
                                   amount: Math.abs(
                                      newlyCalculatedHitPoints -
                                         currentHitPoints,
                                   ),
                                },
                             )
                           : game.i18n.localize(
                                "pf2e-aztecs-sundered.chat.repair.no-hp-restored",
                             )
                     let currentHpLabel = game.i18n.localize(
                        "pf2e-aztecs-sundered.chat.repair.current-hp",
                     )

                     ChatMessage.create({
                        user: game.user.id,
                        speaker: ChatMessage.getSpeaker({
                           actor: itemActor || null,
                        }),
                        content: `<div class="pf2e chat-card"><header class="card-header flexrow"><img src="${itemObject.img}" title="${itemObject.name}" width="36" height="36"/><h3>${repairHeader}</h3></header><div class="card-content" style="margin-top: 5px;"><div style="color: ${outcomeColor}; font-weight: bold; font-size: 1.1em; text-align: center; margin: 4px 0;">${outcomeTextMap[outcomeType] || rolledFallback}</div><div>${amountText}</div><div style="text-align: center; margin-top: 5px;">${currentHpLabel}: <strong>${newCalculatedHitPoints} / ${maximumHitPoints}</strong></div></div></div>`,
                     })
                  },
               })
            },
         },
      },
      default: "repair",
   }).render(true)
}
