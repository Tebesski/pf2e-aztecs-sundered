import { armorPropertyMap, weaponPropertyMap } from "./constants.js"

export const processItemDamage = async (item, damage, ignoreHardness) => {
   let isDefaultType = item.type === "armor" || item.type === "weapon"
   let hasFlags = item.getFlag("world", "maxHp") !== undefined
   let currentHp = hasFlags
      ? item.getFlag("world", "currentHp")
      : isDefaultType
      ? 10
      : 0
   let hardness = hasFlags
      ? item.getFlag("world", "hardness")
      : isDefaultType
      ? 5
      : 0

   if (ignoreHardness) {
      new Dialog({
         title: "Ignore Hardness",
         content: `
                <div class="form-group">
                    <label>Amount of Hardness to ignore:</label>
                    <div class="form-fields">
                        <input type="number" id="ignored-val" value="0" autofocus>
                    </div>
                </div>
                <div style="text-align: center; margin-top: 10px; font-size: 1.1em;">
                    Projected Damage to HP: <strong id="dynamic-damage-preview">${Math.max(
                       0,
                       damage - hardness
                    )}</strong>
                </div>
            `,
         render: (html) => {
            html.find("#ignored-val").on("input", (e) => {
               let ignored = parseInt(e.target.value) || 0
               let effectiveHardness = Math.max(0, hardness - ignored)
               let finalDamage = Math.max(0, damage - effectiveHardness)
               html.find("#dynamic-damage-preview").text(finalDamage)
            })
         },
         buttons: {
            apply: {
               icon: '<i class="fa-solid fa-hammer-crash"></i>',
               label: "Strike",
               callback: async (html) => {
                  let ignored = parseInt(html.find("#ignored-val").val()) || 0
                  let effectiveHardness = Math.max(0, hardness - ignored)
                  let finalDamage = Math.max(0, damage - effectiveHardness)
                  let newHp = Math.max(0, currentHp - finalDamage)
                  let updates = { "flags.world.currentHp": newHp }
                  if (!hasFlags) {
                     updates["flags.world.maxHp"] = 10
                     updates["flags.world.hardness"] = 5
                  }
                  await item.update(updates)
               },
            },
         },
         default: "apply",
      }).render(true)
   } else {
      let finalDamage = Math.max(0, damage - hardness)
      let newHp = Math.max(0, currentHp - finalDamage)
      let updates = { "flags.world.currentHp": newHp }
      if (!hasFlags) {
         updates["flags.world.maxHp"] = 10
         updates["flags.world.hardness"] = 5
      }
      await item.update(updates)
   }
}

export const applyNPCArmorPenalties = async (item, choices) => {
   let rules = []

   if (choices.acPenalty !== 0) {
      rules.push({
         key: "FlatModifier",
         selector: "ac",
         value: choices.acPenalty,
         slug: "broken-armor-penalty",
         label: `Broken Armour`,
      })
   }

   if (choices.suppressResilient && choices.resilientVal > 0) {
      rules.push({
         key: "FlatModifier",
         selector: "saving-throw",
         value: -choices.resilientVal,
         slug: "broken-resilient",
         label: `Broken Resilient Rune`,
      })
   }

   choices.activeProps.forEach((prop) => {
      let map = armorPropertyMap[prop]
      if (map.type === "skill") {
         rules.push({
            key: "FlatModifier",
            selector: map.skill,
            value: map.value,
            slug: `broken-${prop}`,
            label: `Broken ${prop} Rune`,
         })
      } else if (map.type === "resistance") {
         rules.push({
            key: "Weakness",
            type: map.element,
            value: Math.abs(map.value),
            slug: `broken-${prop}`,
            label: `Broken ${prop} Rune`,
         })
      }
   })

   let effectData = {
      name: `Broken ${item.name}`,
      type: "effect",
      img: item.img || "icons/svg/hazard.svg",
      system: {
         description: {
            value: `Mechanical penalties applied for a broken ${item.name}.`,
         },
         rules: rules,
      },
      flags: { "pf2e-aztecs-sundered": { brokenItemId: item.id } },
   }

   await item.actor.createEmbeddedDocuments("Item", [effectData])
}

export const removeNPCArmorPenalties = async (item) => {
   let effects = item.actor.items.filter(
      (i) =>
         i.type === "effect" &&
         i.flags?.["pf2e-aztecs-sundered"]?.brokenItemId === item.id
   )
   let ids = effects.map((e) => e.id)
   if (ids.length > 0) {
      await item.actor.deleteEmbeddedDocuments("Item", ids)
   }
}

export const applyNPCWeaponPenalties = async (item, choices) => {
   let linkedStrikes = item.actor.items.filter(
      (i) => i.type === "melee" && i.flags?.pf2e?.linkedWeapon === item.id
   )
   let needsRecreation =
      (choices.suppressStriking && choices.strikingVal > 0) ||
      choices.activeProps.length > 0
   let currentStrikeIds = linkedStrikes.map((s) => s.id)
   let strikeBackups = []
   let newStrikesData = []

   if (needsRecreation && linkedStrikes.length > 0) {
      for (let strike of linkedStrikes) {
         strikeBackups.push(strike.toObject())
         let newData = strike.toObject()
         newData.name = `Broken ${newData.name}`

         let sDamageRolls = newData.system.damageRolls || {}

         if (choices.suppressStriking && choices.strikingVal > 0) {
            for (let key in sDamageRolls) {
               if (sDamageRolls[key].damage) {
                  sDamageRolls[key].damage = sDamageRolls[key].damage.replace(
                     /(\d+)d(\d+)/,
                     (match, p1, p2) => {
                        let newDice = Math.max(
                           1,
                           parseInt(p1) - choices.strikingVal
                        )
                        return `${newDice}d${p2}`
                     }
                  )
               }
            }
         }

         choices.activeProps.forEach((prop) => {
            let map = weaponPropertyMap[prop]
            for (let key in sDamageRolls) {
               if (sDamageRolls[key].damageType === map.element) {
                  delete sDamageRolls[key]
               }
            }
         })

         newData.system.damageRolls = sDamageRolls
         newStrikesData.push(newData)
      }

      await item.actor.deleteEmbeddedDocuments("Item", currentStrikeIds)
      let createdStrikes = await item.actor.createEmbeddedDocuments(
         "Item",
         newStrikesData
      )
      currentStrikeIds = createdStrikes.map((s) => s.id)

      await item.update({
         "flags.world.strikeBackups": strikeBackups,
         "flags.world.brokenStrikeIds": currentStrikeIds,
      })
   }

   let rules = []
   let predicate = currentStrikeIds.map((id) => `item:id:${id}`)
   if (predicate.length > 0) predicate = [{ or: predicate }]

   if (choices.wPenalty !== 0 && predicate.length > 0) {
      rules.push({
         key: "FlatModifier",
         selector: "attack",
         value: choices.wPenalty,
         predicate: predicate,
         slug: `broken-weapon-atk`,
         label: `Broken Weapon`,
      })
      rules.push({
         key: "FlatModifier",
         selector: "damage",
         value: choices.wPenalty,
         predicate: predicate,
         slug: `broken-weapon-dmg`,
         label: `Broken Weapon`,
      })
   }

   let effectData = {
      name: `Broken ${item.name}`,
      type: "effect",
      img: item.img || "icons/svg/hazard.svg",
      system: {
         description: {
            value: `Mechanical penalties applied for a broken ${item.name}.`,
         },
         rules: rules,
      },
      flags: { "pf2e-aztecs-sundered": { brokenItemId: item.id } },
   }

   await item.actor.createEmbeddedDocuments("Item", [effectData])
}

export const removeNPCWeaponPenalties = async (item) => {
   let effects = item.actor.items.filter(
      (i) =>
         i.type === "effect" &&
         i.flags?.["pf2e-aztecs-sundered"]?.brokenItemId === item.id
   )
   let ids = effects.map((e) => e.id)
   if (ids.length > 0) {
      await item.actor.deleteEmbeddedDocuments("Item", ids)
   }

   let strikeBackups = item.getFlag("world", "strikeBackups")
   let brokenStrikeIds = item.getFlag("world", "brokenStrikeIds")

   if (strikeBackups && brokenStrikeIds) {
      let toDelete = brokenStrikeIds.filter((id) => item.actor.items.has(id))
      if (toDelete.length > 0) {
         await item.actor.deleteEmbeddedDocuments("Item", toDelete)
      }

      await item.actor.createEmbeddedDocuments("Item", strikeBackups)

      await item.update({
         "flags.world.-=strikeBackups": null,
         "flags.world.-=brokenStrikeIds": null,
      })
   }
}
