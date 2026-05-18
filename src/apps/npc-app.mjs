const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api
import { armorPropertyMap, weaponPropertyMap } from "../constants.mjs"

export class NpcPenaltyApp extends HandlebarsApplicationMixin(ApplicationV2) {
   constructor(options = {}) {
      super(options)
      this.item = options.item
      this.isDestroyed = options.isDestroyed || false
      this.resolveCallback = options.resolve
      this.resolved = false

      this.isArmor = this.item.type === "armor"
      this.itemRunes = this.item.system.runes || {}
   }

   static DEFAULT_OPTIONS = {
      id: "npc-penalty-app",
      classes: ["pf2e"],
      position: { width: 450, height: "auto" },
      window: { title: "pf2e-aztecs-sundered.dialog.npc.app-title" },
      actions: {
         apply: this._onApply,
      },
   }

   static PARTS = {
      main: {
         template: "modules/pf2e-aztecs-sundered/templates/npc-dialog.hbs",
      },
   }

   async _prepareContext(options) {
      let activeArmorProps = []
      let activeWeaponProps = []

      if (this.isArmor && this.itemRunes.property) {
         this.itemRunes.property.forEach((prop) => {
            if (armorPropertyMap[prop])
               activeArmorProps.push({
                  key: prop,
                  label: game.i18n.localize(
                     `pf2e-aztecs-sundered.armor-property.${prop}.label`,
                  ),
               })
         })
      } else if (!this.isArmor && this.itemRunes.property) {
         this.itemRunes.property.forEach((prop) => {
            if (weaponPropertyMap[prop])
               activeWeaponProps.push({
                  key: prop,
                  label: game.i18n.localize(
                     `pf2e-aztecs-sundered.weapon-property.${prop}.label`,
                  ),
               })
         })
      }

      this.options.window.title = `${game.i18n.localize("pf2e-aztecs-sundered.dialog.npc.title")}: ${this.item.name}`

      return {
         item: this.item,
         isDestroyed: this.isDestroyed,
         isArmor: this.isArmor,
         runes: this.itemRunes,
         activeArmorProps,
         activeWeaponProps,
         hasResilient: this.itemRunes.resilient > 0,
         hasStriking: this.itemRunes.striking > 0,
      }
   }

   _onRender(context, options) {
      super._onRender(context, options)
      const el = this.element

      if (this.isDestroyed) {
         const fullDestCheckbox = el.querySelector("#npc-full-destruction")
         const otherInputs = el.querySelectorAll(
            "input:not(#npc-full-destruction)",
         )

         const toggleInputs = () => {
            let isChecked = fullDestCheckbox.checked
            otherInputs.forEach((input) => {
               input.disabled = isChecked
               const group = input.closest(".form-group")
               if (group) group.style.opacity = isChecked ? "0.4" : "1"
            })
         }
         fullDestCheckbox.addEventListener("change", toggleInputs)
         toggleInputs()
      }
   }

   static async _onApply(event, target) {
      const el = this.element
      let chosenProps = []
      let fullDestruction = this.isDestroyed
         ? el.querySelector("#npc-full-destruction")?.checked
         : false

      let resultData = null

      if (this.isArmor) {
         el.querySelectorAll(".npc-armor-prop:checked").forEach((input) =>
            chosenProps.push(input.dataset.prop),
         )
         resultData = {
            isArmor: true,
            acPenalty:
               parseInt(el.querySelector("#npc-ac-penalty")?.value) || 0,
            suppressResilient:
               el.querySelector("#npc-resilient-penalty")?.checked || false,
            resilientVal: this.itemRunes.resilient || 0,
            activeProps: chosenProps,
            fullDestruction,
         }
      } else {
         el.querySelectorAll(".npc-weapon-prop:checked").forEach((input) =>
            chosenProps.push(input.dataset.prop),
         )
         resultData = {
            isArmor: false,
            wPenalty:
               parseInt(el.querySelector("#npc-weapon-penalty")?.value) || 0,
            suppressStriking:
               el.querySelector("#npc-striking-penalty")?.checked || false,
            strikingVal: this.itemRunes.striking || 0,
            activeProps: chosenProps,
            fullDestruction,
         }
      }

      this.resolved = true
      if (this.resolveCallback) this.resolveCallback(resultData)
      this.close()
   }

   _onClose() {
      if (!this.resolved && this.resolveCallback) this.resolveCallback(null)
      super._onClose()
   }
}
