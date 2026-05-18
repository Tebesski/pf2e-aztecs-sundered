const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api
import { materialStats } from "../constants.mjs"

export class DurabilityApp extends HandlebarsApplicationMixin(ApplicationV2) {
   constructor(options = {}) {
      super(options)
      this.item = options.item
      this.updateHookId = Hooks.on("updateItem", (item) => {
         if (item.id === this.item.id) this.render()
      })
   }

   async close(options) {
      Hooks.off("updateItem", this.updateHookId)
      return super.close(options)
   }

   static DEFAULT_OPTIONS = {
      id: "durability-config-app",
      classes: ["pf2e"],
      position: { width: 350, height: "auto" },
      window: { title: "pf2e-aztecs-sundered.dialog.durability.config-title" },
      actions: {
         save: this._onSave,
         repair: this._onRepair,
         sunder: this._onSunder,
      },
   }

   static PARTS = {
      main: {
         template:
            "modules/pf2e-aztecs-sundered/templates/durability-dialog.hbs",
      },
   }

   async _prepareContext(options) {
      const isShieldItem = this.item.type === "shield"
      const isDefaultType =
         this.item.type === "armor" ||
         this.item.type === "weapon" ||
         isShieldItem
      const hasDurabilityFlags =
         this.item.getFlag("world", "maxHp") !== undefined
      const isTracked = isDefaultType || hasDurabilityFlags

      let currentHp = isShieldItem
         ? (this.item.system.hp?.value ?? 0)
         : (this.item.getFlag("world", "currentHp") ?? 10)
      let maxHp = isShieldItem
         ? (this.item.system.hp?.max ?? 0)
         : (this.item.getFlag("world", "maxHp") ?? 10)
      let hardness = isShieldItem
         ? (this.item.system.hardness ?? 0)
         : (this.item.getFlag("world", "hardness") ?? 5)
      let assignedMaterial =
         this.item.getFlag("world", "assignedMaterial") || ""

      let materialOptions = Object.entries(materialStats).map(
         ([keyName, values]) => ({
            key: keyName,
            name: game.i18n.localize(
               `pf2e-aztecs-sundered.material-stats.${keyName}.name`,
            ),
            selected: keyName === assignedMaterial,
         }),
      )

      const pf2eConfig = CONFIG.PF2E || {}

      const getLocalizedOptions = (configObj) => {
         if (!configObj) return []
         return Object.entries(configObj)
            .map(([key, locKey]) => ({
               key,
               label: game.i18n.localize(locKey),
            }))
            .sort((a, b) => a.label.localeCompare(b.label))
      }

      let immunityOptions = getLocalizedOptions(pf2eConfig.immunityTypes)
      let weaknessOptions = getLocalizedOptions(pf2eConfig.weaknessTypes)
      let resistanceOptions = getLocalizedOptions(pf2eConfig.resistanceTypes)

      let storedImmunities = this.item.getFlag("world", "immunities") || []
      let storedWeaknesses = this.item.getFlag("world", "weaknesses") || []
      let storedResistances = this.item.getFlag("world", "resistances") || []

      let immunities = storedImmunities.map((i) => ({
         type: i,
         label: game.i18n.localize(pf2eConfig.immunityTypes?.[i] || i),
      }))
      let weaknesses = storedWeaknesses.map((w) => ({
         type: w.type,
         value: w.value,
         label: game.i18n.localize(
            pf2eConfig.weaknessTypes?.[w.type] || w.type,
         ),
      }))
      let resistances = storedResistances.map((r) => ({
         type: r.type,
         value: r.value,
         label: game.i18n.localize(
            pf2eConfig.resistanceTypes?.[r.type] || r.type,
         ),
      }))

      this.options.window.title = `Durability: ${this.item.name}`

      return {
         currentHp,
         maxHp,
         hardness,
         bt: Math.floor(maxHp / 2),
         materialOptions,
         isTracked,
         immunityOptions,
         weaknessOptions,
         resistanceOptions,
         immunities,
         weaknesses,
         resistances,
      }
   }

   _onRender(context, options) {
      super._onRender(context, options)
      const el = this.element

      if (!el.querySelector(".durability-save-btn")) {
         const btn = document.createElement("button")
         btn.type = "button"
         btn.className = "durability-save-btn"
         btn.style.marginTop = "10px"
         btn.dataset.action = "save"
         btn.innerHTML = `<i class="fa-solid fa-save"></i> ${game.i18n.localize("pf2e-aztecs-sundered.dialog.durability.save")}`
         el.querySelector(".aztec-durability-summary")?.appendChild(btn) ||
            el.appendChild(btn)
      }

      const currHpInput = el.querySelector("#dur-curr-hp")
      const maxHpInput = el.querySelector("#dur-max-hp")
      const hdInput = el.querySelector("#dur-hd")
      const btSpan = el.querySelector("#dur-bt")
      const matSelect = el.querySelector("#dur-mat-select")

      maxHpInput?.addEventListener("input", () => {
         let max = parseInt(maxHpInput.value) || 0
         if (btSpan) btSpan.textContent = Math.floor(max / 2)
      })

      matSelect?.addEventListener("change", () => {
         let selectedMat = materialStats[matSelect.value]
         if (selectedMat) {
            let oldMax = parseInt(maxHpInput?.value) || 1
            let oldCurr = parseInt(currHpInput?.value) || 0
            if (oldMax <= 0) oldMax = 1

            let newMax = selectedMat.hp
            let newCurr = Math.round((oldCurr / oldMax) * newMax)

            if (maxHpInput) maxHpInput.value = newMax
            if (currHpInput) currHpInput.value = newCurr
            if (hdInput) hdInput.value = selectedMat.hd
            if (btSpan) btSpan.textContent = Math.floor(newMax / 2)
         }
      })

      const setupIWRSelect = (selectId, listId, rowClass, hasValue) => {
         const select = el.querySelector(`#${selectId}`)
         const list = el.querySelector(`#${listId}`)
         if (!select || !list) return

         select.addEventListener("change", () => {
            let type = select.value
            if (!type) return

            if (list.querySelector(`.${rowClass}[data-type="${type}"]`)) {
               select.value = ""
               return ui.notifications.warn(
                  game.i18n.localize(
                     "pf2e-aztecs-sundered.notifications.trait-assigned",
                  ),
               )
            }

            let label = select.options[select.selectedIndex].text
            let row = document.createElement("div")
            row.className = `iwr-row ${rowClass}`
            row.dataset.type = type
            row.style.cssText =
               "display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.1); padding: 4px 8px; border-radius: 3px; font-size: 0.9em;"

            if (hasValue) {
               row.innerHTML = `<span>${label}</span><span style="display: flex; align-items: center; gap: 6px;"><input type="number" class="iwr-value" value="5" style="width: 45px; height: 22px; text-align: center;"><a class="remove-iwr" style="color: #d9534f; cursor: pointer;"><i class="fa-solid fa-trash"></i></a></span>`
            } else {
               row.innerHTML = `<span>${label}</span><a class="remove-iwr" style="color: #d9534f; cursor: pointer;"><i class="fa-solid fa-trash"></i></a>`
            }

            row.querySelector(".remove-iwr")?.addEventListener("click", () =>
               row.remove(),
            )
            list.appendChild(row)
            select.value = ""
         })
      }

      setupIWRSelect(
         "dur-add-immunity",
         "dur-immunities-list",
         "immunity-row",
         false,
      )
      setupIWRSelect(
         "dur-add-weakness",
         "dur-weaknesses-list",
         "weakness-row",
         true,
      )
      setupIWRSelect(
         "dur-add-resistance",
         "dur-resistances-list",
         "resistance-row",
         true,
      )

      el.querySelectorAll(".remove-iwr").forEach((btn) =>
         btn.addEventListener("click", (e) =>
            e.currentTarget.closest(".iwr-row").remove(),
         ),
      )
   }

   static async _onSave(event, target) {
      const el = this.element
      const isShieldItem = this.item.type === "shield"
      let newCurrentHp = parseInt(el.querySelector("#dur-curr-hp")?.value) || 0
      let newMaxHp = parseInt(el.querySelector("#dur-max-hp")?.value) || 0
      let newHardness = parseInt(el.querySelector("#dur-hd")?.value) || 0
      let newMat = el.querySelector("#dur-mat-select")?.value

      let immunities = []
      el.querySelectorAll(".immunity-row").forEach((row) =>
         immunities.push(row.dataset.type),
      )

      let weaknesses = []
      el.querySelectorAll(".weakness-row").forEach((row) => {
         weaknesses.push({
            type: row.dataset.type,
            value: parseInt(row.querySelector(".iwr-value")?.value) || 0,
         })
      })

      let resistances = []
      el.querySelectorAll(".resistance-row").forEach((row) => {
         resistances.push({
            type: row.dataset.type,
            value: parseInt(row.querySelector(".iwr-value")?.value) || 0,
         })
      })

      let updates = {
         "flags.world.immunities": immunities,
         "flags.world.weaknesses": weaknesses,
         "flags.world.resistances": resistances,
      }

      if (isShieldItem) {
         updates["system.hp.value"] = newCurrentHp
         updates["system.hp.max"] = newMaxHp
         updates["system.hardness"] = newHardness
      } else {
         updates["flags.world.currentHp"] = newCurrentHp
         updates["flags.world.maxHp"] = newMaxHp
         updates["flags.world.hardness"] = newHardness
      }

      if (newMat) {
         updates["flags.world.assignedMaterial"] = newMat
         await this.item.update(updates)
      } else {
         await this.item.update(updates)
         if (this.item.getFlag("world", "assignedMaterial") !== undefined) {
            await this.item.unsetFlag("world", "assignedMaterial")
         }
      }
      this.close()
   }

   static async _onRepair(event, target) {
      const { RepairApp } = await import("./repair-app.mjs")
      new RepairApp({ item: this.item }).render(true)
   }

   static async _onSunder(event, target) {
      const { SunderApp } = await import("./sunder-app.mjs")
      new SunderApp({
         actor: this.item.actor,
         attackerData: { rawDamage: 0, parsedDamage: [] },
         preselectedItemId: this.item.id,
      }).render(true)
   }
}
