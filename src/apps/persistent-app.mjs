const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api

export class PersistentItemDamageApp extends HandlebarsApplicationMixin(
   ApplicationV2,
) {
   constructor(options = {}) {
      super(options)
      this.actor = options.actor
      this.effectItem = options.effectItem
      this.itemFlags = this.effectItem.flags["pf2e-aztecs-sundered"] || {}
      this.targetItem = this.actor.items.get(this.itemFlags.itemId)
   }

   static DEFAULT_OPTIONS = {
      id: "persistent-item-damage-app",
      classes: ["pf2e"],
      position: { width: 450, height: "auto" },
      window: { title: "pf2e-aztecs-sundered.dialog.persistent.app-title" },
      actions: {
         damage: this._onDamage,
         recovery: this._onRecovery,
         end: this._onEnd,
      },
   }

   static PARTS = {
      main: {
         template:
            "modules/pf2e-aztecs-sundered/templates/persistent-dialog.hbs",
      },
   }

   _getAdjustedDamage(baseDamage) {
      const immunities = this.targetItem.getFlag("world", "immunities") || []
      const weaknesses = this.targetItem.getFlag("world", "weaknesses") || []
      const resistances = this.targetItem.getFlag("world", "resistances") || []
      const type = this.itemFlags.type || "fire"

      let val = baseDamage
      const isImmune = immunities.some(
         (imm) => imm.toLowerCase() === type.toLowerCase(),
      )
      if (isImmune) return 0

      const activeWeaknesses = weaknesses.filter(
         (w) => w.type.toLowerCase() === type.toLowerCase(),
      )
      if (activeWeaknesses.length > 0) {
         val += Math.max(...activeWeaknesses.map((w) => w.value))
      }

      const activeResistances = resistances.filter(
         (r) => r.type.toLowerCase() === type.toLowerCase(),
      )
      if (activeResistances.length > 0) {
         val = Math.max(
            0,
            val - Math.max(...activeResistances.map((r) => r.value)),
         )
      }

      return val
   }

   async _prepareContext(options) {
      if (!this.targetItem) {
         await this.effectItem.delete()
         this.close()
         return {}
      }

      this.isShield = this.targetItem.type === "shield"
      this.maxHp = this.isShield
         ? (this.targetItem.system.hp?.max ?? 0)
         : (this.targetItem.getFlag("world", "maxHp") ?? 10)
      this.currentHp = this.isShield
         ? (this.targetItem.system.hp?.value ?? 0)
         : (this.targetItem.getFlag("world", "currentHp") ?? 10)
      this.baseHd = this.isShield
         ? (this.targetItem.system.hardness ?? 0)
         : (this.targetItem.getFlag("world", "hardness") ?? 5)

      this.cleanFormula =
         String(this.itemFlags.formula || "1d6")
            .split(/[pP\[]/)[0]
            .replace(/[^\d\+\-\*\/\(\)d]/gi, "")
            .trim() || "1d6"
      const roll = await new Roll(this.cleanFormula).evaluate()
      this.dmgTotal = roll.total

      let adjustedDmg = this._getAdjustedDamage(this.dmgTotal)
      let initialNetDmg = Math.max(0, adjustedDmg - this.baseHd)

      this.options.window.title = game.i18n.format(
         "pf2e-aztecs-sundered.dialog.persistent.title",
         { actorName: this.actor.name },
      )

      return {
         item: this.targetItem,
         dmg: adjustedDmg,
         flags: this.itemFlags,
         cleanFormula: this.cleanFormula,
         baseHd: this.baseHd,
         initialNetDmg: initialNetDmg,
         initialNewHp: Math.max(0, this.currentHp - initialNetDmg),
         maxHp: this.maxHp,
      }
   }

   _onRender(context, options) {
      super._onRender(context, options)
      const el = this.element

      const updatePreview = () => {
         let effHd = Math.max(
            0,
            this.baseHd -
               (parseInt(el.querySelector("#pers-ignore-hd")?.value) || 0),
         )
         let adjustedDmg = this._getAdjustedDamage(this.dmgTotal)
         let netDmg = Math.max(0, adjustedDmg - effHd)

         if (el.querySelector("#pers-eff-hd"))
            el.querySelector("#pers-eff-hd").textContent = effHd
         if (el.querySelector("#pers-net-dmg"))
            el.querySelector("#pers-net-dmg").textContent = netDmg
         if (el.querySelector("#pers-rem-hp"))
            el.querySelector("#pers-rem-hp").textContent =
               `${Math.max(0, this.currentHp - netDmg)} / ${this.maxHp}`
      }

      el.querySelectorAll("input").forEach((input) => {
         input.addEventListener("input", updatePreview)
         input.addEventListener("change", updatePreview)
      })
   }

   async _applyDamageCalculation() {
      const el = this.element
      let effHd = Math.max(
         0,
         this.baseHd -
            (parseInt(el.querySelector("#pers-ignore-hd")?.value) || 0),
      )
      let adjustedDmg = this._getAdjustedDamage(this.dmgTotal)
      let netDmg = Math.max(0, adjustedDmg - effHd)
      let newHp = Math.max(0, this.currentHp - netDmg)

      let updates = {}
      if (this.isShield) updates["system.hp.value"] = newHp
      else updates["flags.world.currentHp"] = newHp
      await this.targetItem.update(updates)

      let chatContent = game.i18n.format(
         "pf2e-aztecs-sundered.chat.persistent.content",
         {
            itemName: this.targetItem.name,
            damage: netDmg,
            type: this.itemFlags.type,
            currentHp: newHp,
            maxHp: this.maxHp,
         },
      )

      ChatMessage.create({
         user: game.user.id,
         speaker: ChatMessage.getSpeaker({ actor: this.actor }),
         content: chatContent,
      })
   }

   static async _onDamage(event, target) {
      await this._applyDamageCalculation()
      this.close()
   }

   static async _onRecovery(event, target) {
      await this._applyDamageCalculation()

      const dc =
         parseInt(this.element.querySelector("#pers-recovery-dc")?.value) || 15
      const roll = await new Roll("1d20").evaluate()
      const success = roll.total >= dc

      const checkLabel = game.i18n.localize(
         "pf2e-aztecs-sundered.chat.persistent.recovery-check",
      )
      const successMsg = game.i18n.localize(
         "pf2e-aztecs-sundered.chat.persistent.recovery-success",
      )
      const failureMsg = game.i18n.localize(
         "pf2e-aztecs-sundered.chat.persistent.recovery-failure",
      )

      await roll.toMessage({
         speaker: ChatMessage.getSpeaker({ actor: this.actor }),
         flavor: `<strong>${checkLabel}</strong> vs DC ${dc}<br>${success ? `<span style='color:green;'>${successMsg}</span>` : `<span style='color:darkred;'>${failureMsg}</span>`}`,
      })

      if (success) await this.effectItem.delete()
      this.close()
   }

   static async _onEnd(event, target) {
      await this.effectItem.delete()
      ui.notifications.info(
         game.i18n.format(
            "pf2e-aztecs-sundered.notifications.persistent-ended",
            {
               itemName: this.targetItem.name,
            },
         ),
      )
      this.close()
   }
}
