import { armorPropertyMap, weaponPropertyMap } from "./constants.js"

export const processItemDamage = async (item, damage, ignoreHardness) => {
   let isShield = item.type === "shield"
   let isDefaultType =
      item.type === "armor" || item.type === "weapon" || isShield
   let hasFlags = item.getFlag("world", "maxHp") !== undefined

   let currentHp = isShield
      ? item.system.hp?.value ?? 0
      : hasFlags
      ? item.getFlag("world", "currentHp")
      : isDefaultType
      ? 10
      : 0
   let hardness = isShield
      ? item.system.hardness ?? 0
      : hasFlags
      ? item.getFlag("world", "hardness")
      : isDefaultType
      ? 5
      : 0

   const applyDamage = async (finalDamage) => {
      let newHp = Math.max(0, currentHp - finalDamage)
      let updates = {}
      if (isShield) {
         updates["system.hp.value"] = newHp
      } else {
         updates["flags.world.currentHp"] = newHp
         if (!hasFlags) {
            updates["flags.world.maxHp"] = 10
            updates["flags.world.hardness"] = 5
         }
      }
      await item.update(updates)
   }

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
                  await applyDamage(finalDamage)
               },
            },
         },
         default: "apply",
      }).render(true)
   } else {
      let finalDamage = Math.max(0, damage - hardness)
      await applyDamage(finalDamage)
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
         label: `Broken Armor`,
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
   let strikeIds = linkedStrikes.map((s) => "item:id:" + s.id)
   let predicate = strikeIds.length > 0 ? [{ or: strikeIds }] : []
   let rules = []

   if (choices.wPenalty !== 0) {
      rules.push({
         key: "FlatModifier",
         selector: ["attack", "damage"],
         value: choices.wPenalty,
         predicate: predicate,
         slug: `broken-weapon-penalty`,
         label: `Broken Weapon`,
      })
   }

   if (choices.suppressStriking && choices.strikingVal > 0) {
      rules.push({
         key: "DamageAlteration",
         mode: "add",
         property: "dice-number",
         selectors: ["strike-damage"],
         value: -choices.strikingVal,
         predicate: predicate,
         slug: `broken-striking-rune`,
         label: `Broken Striking Rune`,
      })
   }

   choices.activeProps.forEach((prop) => {
      let map = weaponPropertyMap[prop]
      if (map && map.element) {
         rules.push({
            key: "DamageDice",
            selector: "strike-damage",
            damageType: map.element,
            diceNumber: -1,
            predicate: predicate,
            slug: `broken-${prop}-rune`,
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
}
