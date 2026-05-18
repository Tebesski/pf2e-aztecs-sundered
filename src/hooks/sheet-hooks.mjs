import { physicalTypes } from "../constants.mjs"
import { getDefaultDurability } from "../logic.mjs"

export function registerSheetHooks() {
   Hooks.on("renderItemSheet", (app, htmlElement) => {
      const item = app.document
      if (!physicalTypes.includes(item.type)) return
      const html = $(htmlElement[0] ?? htmlElement)

      let priceGroup = html.find(".form-group.price")
      if (priceGroup.length) {
         let configHtml = `
         <hr>
<div class="form-group durability-config-group">
              <div class="form-fields">
                  <a class="open-durability-config" style="cursor: pointer;"><i class="fa-solid fa-helmet-battle"></i> ${game.i18n.localize("pf2e-aztecs-sundered.sheet-text.durability-config")}</a>
              </div>
          </div>`
         priceGroup.after(configHtml)

         html
            .find(".open-durability-config")
            .off("click")
            .on("click", async (e) => {
               e.preventDefault()
               const { DurabilityApp } =
                  await import("../apps/durability-app.mjs")
               new DurabilityApp({ item }).render(true)
            })
      }

      if (item.type === "weapon" || item.type === "armor") {
         let preciousMaterialCheckbox = `<div class="form-group"><label>${game.i18n.localize("pf2e-aztecs-sundered.sheet-text.use-precious")}</label><input type="checkbox" name="flags.world.usePreciousMaterial" data-dtype="Boolean" ${item.getFlag("world", "usePreciousMaterial") !== false ? "checked" : ""}></div>`
         let specificSystemInput = html.find('input[name="system.specific"]')
         let materialTypeSelect = html.find(
            'select[name="system.material.type"]',
         )

         if (specificSystemInput.length > 0)
            specificSystemInput
               .closest(".form-group")
               .after(preciousMaterialCheckbox)
         else if (materialTypeSelect.length > 0)
            materialTypeSelect
               .closest(".form-group")
               .after(preciousMaterialCheckbox)
         else
            html
               .find('.tab[data-tab="details"]')
               .append(preciousMaterialCheckbox)
      }
   })

   Hooks.on("renderActorSheet", (app, htmlElement) => {
      const actor = app.actor
      if (
         !actor ||
         !["character", "npc", "familiar", "vehicle", "loot"].includes(
            actor.type,
         )
      )
         return

      const isGM = game.user.isGM
      const showMain = game.settings.get(
         "pf2e-aztecs-sundered",
         "showInventoryUI",
      )
      const showMainPlayers = game.settings.get(
         "pf2e-aztecs-sundered",
         "showInventoryUI_players",
      )

      if (!isGM && !showMainPlayers) return
      if (isGM && !showMain) return

      const showSunder =
         game.settings.get("pf2e-aztecs-sundered", "showDamageButtonUI") &&
         (isGM ||
            game.settings.get(
               "pf2e-aztecs-sundered",
               "showDamageButtonUI_players",
            ))
      const showRepair =
         game.settings.get("pf2e-aztecs-sundered", "showRepairButtonUI") &&
         (isGM ||
            game.settings.get(
               "pf2e-aztecs-sundered",
               "showRepairButtonUI_players",
            ))
      const showTrack =
         game.settings.get(
            "pf2e-aztecs-sundered",
            "showTrackDurabilityButtonUI",
         ) &&
         (isGM ||
            game.settings.get(
               "pf2e-aztecs-sundered",
               "showTrackDurabilityButtonUI_players",
            ))

      const html = $(htmlElement[0] ?? htmlElement)
      const inventoryItems =
         actor.inventory?.contents ||
         actor.items.filter((i) => physicalTypes.includes(i.type))

      inventoryItems.forEach((item) => {
         let isShield = item.type === "shield"
         let isDefaultType =
            item.type === "armor" || item.type === "weapon" || isShield
         let hasDurabilityFlags = item.getFlag("world", "maxHp") !== undefined
         let defaultDurabilityStats = getDefaultDurability(item)

         let itemRow = html.find(`[data-item-id="${item.id}"]`)
         let nameElement = itemRow.find(".item-name h4").first()
         if (nameElement.length === 0)
            nameElement = itemRow.find(".name").first()

         if (!nameElement.length) return

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

            let tooltip = `${game.i18n.localize("pf2e-aztecs-sundered.sheet-text.open-durability-config")}<br>${game.i18n.localize("pf2e-aztecs-sundered.sheet-text.hp")}: ${currentHitPoints} / ${maximumHitPoints}<br>${game.i18n.localize("pf2e-aztecs-sundered.sheet-text.hardness")}: ${itemHardness}`

            let iconHtml = `<span style="display: inline-flex; align-items: center; gap: 4px; margin-left: 6px;">
                <a class="aztec-action-btn" data-aztec-action="durability" data-item-id="${item.id}" data-tooltip="${tooltip.replace(/"/g, "&quot;")}"><i class="fa-solid fa-helmet-battle"></i></a>`

            if (showSunder) {
               iconHtml += `\n<a class="aztec-action-btn" data-aztec-action="sunder" data-item-id="${item.id}" data-tooltip="${game.i18n.localize("pf2e-aztecs-sundered.sheet-text.strike-item").replace(/"/g, "&quot;")}"><i class="fa-solid fa-hammer-crash"></i></a>`
            }
            if (showRepair) {
               iconHtml += `\n<a class="aztec-action-btn" data-aztec-action="repair" data-item-id="${item.id}" data-tooltip="${game.i18n.localize("pf2e-aztecs-sundered.sheet-text.repair-item").replace(/"/g, "&quot;")}"><i class="fa-solid fa-wrench"></i></a>`
            }
            iconHtml += `</span>`
            nameElement.append(iconHtml)

            if (maximumHitPoints > 0) {
               if (currentHitPoints <= 0) {
                  nameElement.prepend(
                     `<i class="fa-solid fa-skull" style="color: #555;" data-tooltip="${game.i18n.localize("pf2e-aztecs-sundered.status.destroyed")}"></i>`,
                  )
                  nameElement.css({ opacity: "0.5", filter: "grayscale(100%)" })
                  itemRow
                     .find(".item-image")
                     .first()
                     .css({ opacity: "0.5", filter: "grayscale(100%)" })
               } else if (currentHitPoints <= brokenThreshold) {
                  nameElement.prepend(
                     `<i class="fa-solid fa-heart-crack" style="color: #a83232;" data-tooltip="${game.i18n.localize("pf2e-aztecs-sundered.status.broken")}"></i>`,
                  )
               }
            }
         } else if (showTrack) {
            let tooltip =
               game.i18n.localize(
                  "pf2e-aztecs-sundered.sheet-text.track-durability",
               ) || "Track Durability"

            let iconHtml = `
                <span style="display: inline-flex; align-items: center; gap: 4px; margin-left: 6px;">
                    <a class="aztec-action-btn" data-aztec-action="durability" data-item-id="${item.id}" data-tooltip="${tooltip.replace(/"/g, "&quot;")}"><i class="fa-solid fa-shield-exclamation"></i></a>
                </span>
            `
            nameElement.append(iconHtml)
         }
      })

      html.off("click", "[data-aztec-action]")
      html.on("click", "[data-aztec-action]", async (e) => {
         e.preventDefault()
         e.stopPropagation()

         const action = e.currentTarget.dataset.aztecAction
         const itemId = e.currentTarget.dataset.itemId
         const item = actor.items.get(itemId)
         if (!item) return

         if (action === "durability") {
            const { DurabilityApp } = await import("../apps/durability-app.mjs")
            new DurabilityApp({ item }).render(true)
         } else if (action === "sunder") {
            const { SunderApp } = await import("../apps/sunder-app.mjs")
            new SunderApp({
               actor,
               attackerData: { rawDamage: 0, parsedDamage: [] },
               preselectedItemId: item.id,
            }).render(true)
         } else if (action === "repair") {
            const { RepairApp } = await import("../apps/repair-app.mjs")
            new RepairApp({ item }).render(true)
         }
      })
   })
}
