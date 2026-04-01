import {
   materialStats,
   armorPropertyMap,
   weaponPropertyMap,
} from "./constants.js"

export const openMaterialDialog = (item, isNew) => {
   let options = Object.entries(materialStats)
      .map(
         ([k, v]) =>
            `<option value="${k}">${v.name} (HD: ${v.hd} | HP: ${
               v.hp
            } | BT: ${Math.floor(v.hp / 2)})</option>`
      )
      .join("")

   let content = `
        <div class="form-group">
            <label>${game.i18n.localize('pf2e-aztecs-sundered.dialog.material.select')}</label>
            <div class="form-fields">
                <select id="mat-select" style="width: 100%;">${options}</select>
            </div>
        </div>
        <div id="mat-desc" style="margin-top: 12px; font-style: italic; color: #666; text-align: center; min-height: 40px;"></div>
    `

   new Dialog({
      title: game.i18n.localize('pf2e-aztecs-sundered.dialog.material.title'),
      content: content,
      render: (html) => {
         const select = html.find("#mat-select")
         const desc = html.find("#mat-desc")
         const updateDesc = () => {
            let key = select.val()
            desc.text(`${game.i18n.localize('pf2e-aztecs-sundered.dialog.material.common-examples')}: ` + materialStats[key].examples)
         }
         select.on("change", updateDesc)
         updateDesc()
      },
      buttons: {
         apply: {
            icon: '<i class="fa-solid fa-hammer"></i>',
            label: "pf2e-aztecs-sundered.dialog.material.apply-material",
            callback: async (html) => {
               let key = html.find("#mat-select").val()
               let mat = materialStats[key]

               let isDefaultType =
                  item.type === "armor" || item.type === "weapon"
               let hasFlags = item.getFlag("world", "maxHp") !== undefined

               let oldMax = hasFlags
                  ? item.getFlag("world", "maxHp")
                  : isDefaultType
                  ? 10
                  : 1
               let oldCur = hasFlags
                  ? item.getFlag("world", "currentHp")
                  : isDefaultType
                  ? 10
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
               })
            },
         },
      },
      default: "apply",
   }).render(true)
}

export const launchNPCDialog = (item) => {
   return new Promise((resolve) => {
      const isArmor = item.type === "armor"
      const runes = item.system.runes || {}
      let content = `<div style="margin-bottom: 10px;">${game.i18n.format('pf2e-aztecs-sundered.dialog.npc.select-penalty', {itemName: item.name})}.</div>`

      if (isArmor) {
         content += `
                <div class="form-group">
                    <label>${game.i18n.localize('pf2e-aztecs-sundered.dialog.npc.penalties.ac')}</label>
                    <div class="form-fields">
                        <input type="number" id="npc-ac-penalty" value="-2">
                    </div>
                </div>
            `
         if (runes.resilient > 0) {
            content += `
                    <div class="form-group">
                        <label>${game.i18n.localize('pf2e-aztecs-sundered.dialog.npc.penalties.resilient')} (+${runes.resilient})</label>
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
                                <label>${game.i18n.localize(`pf2e-aztecs-sundered.armor-property.${prop}.label`)}</label>
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
                    <label>${game.i18n.localize('pf2e-aztecs-sundered.dialog.npc.penalties.attack-damage')}</label>
                    <div class="form-fields">
                        <input type="number" id="npc-weapon-penalty" value="-2">
                    </div>
                </div>
            `
         if (runes.striking > 0) {
            content += `
                    <div class="form-group">
                        <label>${game.i18n.localize('pf2e-aztecs-sundered.dialog.npc.penalties.striking')}</label>
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
                                <label>${mapped.label}</label>
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
         title: `${game.i18n.localize('pf2e-aztecs-sundered.dialog.npc.title')}: ${item.name}`,
         content: content,
         buttons: {
            apply: {
               icon: '<i class="fas fa-check"></i>',
               label: "pf2e-aztecs-sundered.dialog.npc.apply-penalties",
               callback: (html) => {
                  const $html = $(html[0] ?? html)
                  let activeProps = []
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
