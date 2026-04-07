import {
   materialStats,
   armorPropertyMap,
   weaponPropertyMap,
} from "./constants.js"

import { getDefaultDurability } from "./logic.js"

export const openMaterialDialog = (item, isNew) => {
   let hpLabel = game.i18n.localize("pf2e-aztecs-sundered.sheet-text.hp-short")
   let hdLabel = game.i18n.localize("pf2e-aztecs-sundered.sheet-text.hd-short")
   let btLabel = game.i18n.localize("pf2e-aztecs-sundered.sheet-text.bt-short")

   let options = Object.entries(materialStats)
      .map(([k, v]) => {
         let matName = game.i18n.localize(
            `pf2e-aztecs-sundered.material-stats.${k}.name`,
         )
         return `<option value="${k}">${matName} (${hdLabel}: ${
            v.hd
         } | ${hpLabel}: ${v.hp} | ${btLabel}: ${Math.floor(
            v.hp / 2,
         )})</option>`
      })
      .join("")

   let content = `
        <div class="form-group">
            <label>${game.i18n.localize(
               "pf2e-aztecs-sundered.dialog.material.select",
            )}</label>
            <div class="form-fields">
                <select id="mat-select" style="width: 100%;">${options}</select>
            </div>
        </div>
        <div id="mat-desc" style="margin-top: 12px; font-style: italic; color: #666; text-align: center; min-height: 40px;"></div>
    `

   new Dialog({
      title: game.i18n.localize("pf2e-aztecs-sundered.dialog.material.title"),
      content: content,
      render: (html) => {
         const select = html.find("#mat-select")
         const desc = html.find("#mat-desc")
         const updateDesc = () => {
            let key = select.val()
            let examples = game.i18n.localize(
               `pf2e-aztecs-sundered.material-stats.${key}.examples`,
            )
            desc.text(
               `${game.i18n.localize(
                  "pf2e-aztecs-sundered.dialog.material.common-examples",
               )}: ` + examples,
            )
         }
         select.on("change", updateDesc)
         updateDesc()
      },
      buttons: {
         apply: {
            icon: '<i class="fa-solid fa-hammer"></i>',
            label: game.i18n.localize(
               "pf2e-aztecs-sundered.dialog.material.apply-material",
            ),
            callback: async (html) => {
               let key = html.find("#mat-select").val()
               let mat = materialStats[key]

               let isDefaultType =
                  item.type === "armor" || item.type === "weapon"
               let hasFlags = item.getFlag("world", "maxHp") !== undefined

               let defaultStats = getDefaultDurability(item)
               let oldMax = hasFlags
                  ? item.getFlag("world", "maxHp")
                  : isDefaultType
                    ? defaultStats.maxHp
                    : 1
               let oldCur = hasFlags
                  ? item.getFlag("world", "currentHp")
                  : isDefaultType
                    ? defaultStats.maxHp
                    : 0

               if (oldMax <= 0) oldMax = 1

               let newMax = mat.hp
               let newCur = isNew
                  ? mat.hp
                  : Math.round((oldCur / oldMax) * newMax)

               await item.update({
                  "flags.world.maxHp": newMax,
                  "flags.world.currentHp": newCur,
                  "flags.world.hardness": mat.hd,
                  "flags.world.assignedMaterial": key,
               })
            },
         },
      },
      default: "apply",
   }).render(true)
}

export const launchNPCDialog = (item, isDestroyed = false) => {
   return new Promise((resolve) => {
      const isArmor = item.type === "armor"
      const runes = item.system.runes || {}
      let content = `<div style="margin-bottom: 10px;">${game.i18n.format(
         "pf2e-aztecs-sundered.dialog.npc.select-penalty",
         { itemName: item.name },
      )}.</div>`

      if (isDestroyed) {
         content += `
            <div class="form-group" style="background: rgba(255,0,0,0.1); padding: 5px; border: 1px solid red; margin-bottom: 10px;">
               <label style="color: darkred;">${game.i18n.localize(
                  "pf2e-aztecs-sundered.dialog.npc.penalties.full-destruction",
               )}</label>
               <div class="form-fields">
                  <input type="checkbox" id="npc-full-destruction" checked>
               </div>
            </div>
         `
      }

      if (isArmor) {
         content += `
                <div class="form-group">
                    <label>${game.i18n.localize(
                       "pf2e-aztecs-sundered.dialog.npc.penalties.ac",
                    )}</label>
                    <div class="form-fields">
                        <input type="number" id="npc-ac-penalty" value="-2">
                    </div>
                </div>
            `
         if (runes.resilient > 0) {
            content += `
                    <div class="form-group">
                        <label>${game.i18n.localize(
                           "pf2e-aztecs-sundered.dialog.npc.penalties.resilient",
                        )} (+${runes.resilient})</label>
                        <div class="form-fields">
                            <input type="checkbox" id="npc-resilient-penalty" checked>
                        </div>
                    </div>
                `
         }
         if (runes.property && runes.property.length > 0) {
            runes.property.forEach((prop) => {
               const mapped = armorPropertyMap[prop]
               if (mapped) {
                  content += `
                            <div class="form-group">
                                <label>${game.i18n.localize(
                                   `pf2e-aztecs-sundered.armor-property.${prop}.label`,
                                )}</label>
                                <div class="form-fields">
                                    <input type="checkbox" class="npc-armor-prop" data-prop="${prop}" checked>
                                </div>
                            </div>
                        `
               }
            })
         }
      } else {
         content += `
                <div class="form-group">
                    <label>${game.i18n.localize(
                       "pf2e-aztecs-sundered.dialog.npc.penalties.attack-damage",
                    )}</label>
                    <div class="form-fields">
                        <input type="number" id="npc-weapon-penalty" value="-2">
                    </div>
                </div>
            `
         if (runes.striking > 0) {
            content += `
                    <div class="form-group">
                        <label>${game.i18n.localize(
                           "pf2e-aztecs-sundered.dialog.npc.penalties.striking",
                        )}</label>
                        <div class="form-fields">
                            <input type="checkbox" id="npc-striking-penalty" checked>
                        </div>
                    </div>
                `
         }
         if (runes.property && runes.property.length > 0) {
            runes.property.forEach((prop) => {
               const mapped = weaponPropertyMap[prop]
               if (mapped) {
                  content += `
                            <div class="form-group">
                                <label>${game.i18n.localize(
                                   `pf2e-aztecs-sundered.weapon-property.${prop}.label`,
                                )}</label>
                                <div class="form-fields">
                                    <input type="checkbox" class="npc-weapon-prop" data-prop="${prop}" checked>
                                </div>
                            </div>
                        `
               }
            })
         }
      }

      new Dialog({
         title: `${game.i18n.localize(
            "pf2e-aztecs-sundered.dialog.npc.title",
         )}: ${item.name}`,
         content: content,
         render: (html) => {
            if (isDestroyed) {
               const $html = $(html[0] ?? html)
               const fullDestruct = $html.find("#npc-full-destruction")
               const otherInputs = $html
                  .find("input")
                  .not("#npc-full-destruction")

               const toggleInputs = () => {
                  let isChecked = fullDestruct.is(":checked")
                  otherInputs.prop("disabled", isChecked)
                  if (isChecked) {
                     otherInputs.closest(".form-group").css("opacity", "0.4")
                  } else {
                     otherInputs.closest(".form-group").css("opacity", "1")
                  }
               }

               fullDestruct.on("change", toggleInputs)
               toggleInputs()
            }
         },
         buttons: {
            apply: {
               icon: '<i class="fas fa-check"></i>',
               label: game.i18n.localize(
                  "pf2e-aztecs-sundered.dialog.npc.apply-penalties",
               ),
               callback: (html) => {
                  const $html = $(html[0] ?? html)
                  let activeProps = []
                  let fullDestruction = isDestroyed
                     ? $html.find("#npc-full-destruction").is(":checked")
                     : false

                  if (isArmor) {
                     $html
                        .find(".npc-armor-prop:checked")
                        .each((i, el) => activeProps.push(el.dataset.prop))
                     resolve({
                        isArmor: true,
                        acPenalty:
                           parseInt($html.find("#npc-ac-penalty").val()) || 0,
                        suppressResilient: $html
                           .find("#npc-resilient-penalty")
                           .is(":checked"),
                        resilientVal: runes.resilient || 0,
                        activeProps: activeProps,
                        fullDestruction: fullDestruction,
                     })
                  } else {
                     $html
                        .find(".npc-weapon-prop:checked")
                        .each((i, el) => activeProps.push(el.dataset.prop))
                     resolve({
                        isArmor: false,
                        wPenalty:
                           parseInt($html.find("#npc-weapon-penalty").val()) ||
                           0,
                        suppressStriking: $html
                           .find("#npc-striking-penalty")
                           .is(":checked"),
                        strikingVal: runes.striking || 0,
                        activeProps: activeProps,
                        fullDestruction: fullDestruction,
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
   attackerData = { rawDamage: 0 },
) => {
   const items = actor.items
      .filter((i) => ["weapon", "armor", "shield"].includes(i.type))
      .map((i) => {
         const isShield = i.type === "shield"
         const hasFlags = i.getFlag("world", "maxHp") !== undefined

         let curHp = isShield
            ? (i.system.hp?.value ?? 0)
            : (i.getFlag("world", "currentHp") ?? 10)
         let maxHp = isShield
            ? (i.system.hp?.max ?? 0)
            : (i.getFlag("world", "maxHp") ?? 10)
         let hd = isShield
            ? (i.system.hardness ?? 0)
            : (i.getFlag("world", "hardness") ?? 5)

         return {
            id: i.id,
            name: i.name,
            img: i.img,
            isShield: isShield,
            hasFlags: hasFlags,
            hp: curHp,
            max: maxHp,
            hd: hd,
         }
      })

   if (items.length === 0)
      return ui.notifications.warn(
         game.i18n.localize("pf2e-aztecs-sundered.notifications.no-items"),
      )

   let itemOptions = items
      .map(
         (i) =>
            `<option value="${i.id}">${i.name} (HP: ${i.hp}/${i.max} | HD: ${i.hd})</option>`,
      )
      .join("")

   // Process Corrosive Damage Roll dynamically
   let corrosiveDmg = 0
   if (attackerData.isCorrosive) {
      let roll = await new Roll(attackerData.corrosiveDice).evaluate({
         async: true,
      })
      corrosiveDmg = roll.total
   }

   let isHighGrade = attackerData.adamantineGrade === "high"

   let content = `
    <div style="display: flex; flex-direction: column; gap: 10px;">
        <div class="form-group" style="display: flex; align-items: center; gap: 10px;">
            <img id="item-icon-preview" src="${items[0].img}" style="width: 40px; height: 40px; border: 1px solid #444; border-radius: 4px;">
            <div style="flex: 1;">
                <label>Select Item</label>
                <select id="item-select" style="width: 100%;">${itemOptions}</select>
            </div>
        </div>
        <div class="form-group">
            <label>Raw Damage</label>
            <input type="number" id="raw-damage" value="${attackerData.rawDamage}">
        </div>
        
        ${
           attackerData.isRazing
              ? `
        <div class="form-group">
            <label style="color: var(--color-pf-secondary);"><i class="fa-solid fa-burst"></i> Razing Trait Damage</label>
            <input type="number" id="razing-dmg" value="${attackerData.razingDamage}" disabled>
        </div>`
              : `<input type="hidden" id="razing-dmg" value="0">`
        }

        ${
           attackerData.isCorrosive
              ? `
        <div class="form-group">
            <label style="color: var(--color-border-acid);"><i class="fa-solid fa-vial"></i> Corrosive Rune (Acid)</label>
            <input type="number" id="corrosive-dmg" value="${corrosiveDmg}" disabled title="Rolled ${attackerData.corrosiveDice}">
        </div>`
              : `<input type="hidden" id="corrosive-dmg" value="0">`
        }

        <div class="form-group">
            <label>Ignore Hardness</label>
            <input type="number" id="ignore-hd" value="0">
        </div>
        <div class="form-group">
            <label>Custom Resistance</label>
            <input type="number" id="custom-res" value="0" title="Additional damage reduction after Hardness">
        </div>
        <hr>
        <div class="form-group" style="display: flex; justify-content: space-between; align-items: center;">
            <label>Attacker uses Adamantine Weapon?</label>
            <input type="checkbox" id="use-adamantine" ${attackerData.isAdamantine ? "checked" : ""}>
        </div>
        <div class="form-group">
            <label>Adamantine Grade</label>
            <select id="adamantine-hd" ${attackerData.isAdamantine ? "" : "disabled"} style="width: 100%;">
                <option value="14" ${isHighGrade ? "" : "selected"}>Standard-Grade: 14</option>
                <option value="17" ${isHighGrade ? "selected" : ""}>High-Grade: 17</option>
            </select>
        </div>
        <hr>
        <div id="sunder-preview" style="text-align: center; padding: 8px; background: rgba(0,0,0,0.15); border-radius: 5px;">
            <div>Effective Hardness: <strong id="eff-hd">${items[0].hd}</strong></div>
            <div>Damage to HP: <strong id="net-dmg" style="color: #d9534f;">0</strong></div>
            <div>Remaining HP: <strong id="rem-hp">${items[0].hp} / ${items[0].max}</strong></div>
        </div>
    </div>`

   new Dialog({
      title: `Sunder: ${actor.name}`,
      content: content,
      render: (html) => {
         const update = () => {
            const itemId = html.find("#item-select").val()
            const itemData = items.find((i) => i.id === itemId)
            const rawDmg = parseInt(html.find("#raw-damage").val()) || 0
            const razingDmg = parseInt(html.find("#razing-dmg").val()) || 0
            const corrDmg = parseInt(html.find("#corrosive-dmg").val()) || 0
            const ignoreHd = parseInt(html.find("#ignore-hd").val()) || 0
            const customRes = parseInt(html.find("#custom-res").val()) || 0
            const isAdamantine = html.find("#use-adamantine").is(":checked")
            const adamantineHd =
               parseInt(html.find("#adamantine-hd").val()) || 0

            html.find("#adamantine-hd").prop("disabled", !isAdamantine)
            html.find("#item-icon-preview").attr("src", itemData.img)

            let baseHd = itemData.hd
            if (isAdamantine && baseHd <= adamantineHd)
               baseHd = Math.floor(baseHd / 2)

            const effectiveHd = Math.max(0, baseHd - ignoreHd)
            const totalIncomingDamage = rawDmg + razingDmg + corrDmg
            const netDmg = Math.max(
               0,
               totalIncomingDamage - effectiveHd - customRes,
            )
            const remHp = Math.max(0, itemData.hp - netDmg)

            html.find("#eff-hd").text(effectiveHd)
            html.find("#net-dmg").text(netDmg)
            html.find("#rem-hp").text(remHp + " / " + itemData.max)
         }
         html.find("input, select").on("input change", update)
         update()
      },
      buttons: {
         sunder: {
            icon: '<i class="fas fa-hammer"></i>',
            label: "Apply Damage",
            callback: async (html) => {
               const itemId = html.find("#item-select").val()
               const item = actor.items.get(itemId)
               const itemData = items.find((i) => i.id === itemId)

               const rawDmg = parseInt(html.find("#raw-damage").val()) || 0
               const razingDmg = parseInt(html.find("#razing-dmg").val()) || 0
               const corrDmg = parseInt(html.find("#corrosive-dmg").val()) || 0
               const ignoreHd = parseInt(html.find("#ignore-hd").val()) || 0
               const customRes = parseInt(html.find("#custom-res").val()) || 0
               const isAdamantine = html.find("#use-adamantine").is(":checked")
               const adamantineHd =
                  parseInt(html.find("#adamantine-hd").val()) || 0

               let baseHd = itemData.hd
               if (isAdamantine && baseHd <= adamantineHd)
                  baseHd = Math.floor(baseHd / 2)

               const effectiveHd = Math.max(0, baseHd - ignoreHd)
               const totalIncomingDamage = rawDmg + razingDmg + corrDmg
               const netDmg = Math.max(
                  0,
                  totalIncomingDamage - effectiveHd - customRes,
               )
               const newHp = Math.max(0, itemData.hp - netDmg)

               let updates = {}
               if (itemData.isShield) {
                  updates["system.hp.value"] = newHp
               } else {
                  updates["flags.world.currentHp"] = newHp
                  if (!itemData.hasFlags) {
                     updates["flags.world.maxHp"] = itemData.max
                     updates["flags.world.hardness"] = itemData.hd
                  }
               }

               await item.update(updates)

               ChatMessage.create({
                  user: game.user.id,
                  speaker: ChatMessage.getSpeaker({
                     actor: game.user.character || null,
                  }),
                  content: `Sundered <strong>${actor.name}'s ${item.name}</strong> for ${netDmg} damage.<br>Remaining HP: ${newHp} / ${itemData.max}.`,
               })
            },
         },
      },
      default: "sunder",
   }).render(true)
}
