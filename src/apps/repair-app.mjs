const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api

export class RepairApp extends HandlebarsApplicationMixin(ApplicationV2) {
   constructor(options = {}) {
      super(options)
      this.item = options.item
      this.actor = this.item?.actor
   }

   static DEFAULT_OPTIONS = {
      id: "repair-app",
      classes: ["pf2e"],
      position: { width: 400, height: "auto" },
      window: { title: "pf2e-aztecs-sundered.sheet-text.repair-item" },
      actions: {
         repair: this._onRepair,
      },
   }

   static PARTS = {
      main: {
         template: "modules/pf2e-aztecs-sundered/templates/repair-dialog.hbs",
      },
   }

   _getHealingValues(rank) {
      let healingValues = this.hasCraftersEyepiece
         ? [10, 20, 30, 40, 50]
         : [5, 10, 15, 20, 25]
      let criticalHealingValues = this.hasCraftersEyepiece
         ? [15, 30, 45, 60, 75]
         : [10, 20, 30, 40, 50]
      return {
         baseHeal: healingValues[rank] || 0,
         critHeal: criticalHealingValues[rank] || 0,
      }
   }

   async _prepareContext(options) {
      if (!this.actor) {
         ui.notifications.warn(
            game.i18n.localize(
               "pf2e-aztecs-sundered.notifications.no-actor-repair",
            ),
         )
         return this.close()
      }
      if (!this.actor.skills?.crafting) {
         ui.notifications.warn(
            game.i18n.localize(
               "pf2e-aztecs-sundered.notifications.no-crafting-skill",
            ),
         )
         return this.close()
      }

      let isShieldItem = this.item.type === "shield"
      let currentHitPoints = isShieldItem
         ? (this.item.system.hp?.value ?? 0)
         : (this.item.getFlag("world", "currentHp") ?? 10)
      let maximumHitPoints = isShieldItem
         ? (this.item.system.hp?.max ?? 0)
         : (this.item.getFlag("world", "maxHp") ?? 10)

      if (currentHitPoints >= maximumHitPoints) {
         ui.notifications.info(
            game.i18n.localize(
               "pf2e-aztecs-sundered.notifications.fully-repaired",
            ) || "This item is already at maximum HP.",
         )
         return this.close()
      }

      let baseCraftingRank = this.actor.skills.crafting.rank ?? 0
      let repairDifficultyClass = 15

      this.hasCraftersEyepiece = this.actor.items.some(
         (i) =>
            i.type === "equipment" &&
            i.name.includes("Crafter's Eyepiece") &&
            i.system.equipped?.invested === true,
      )

      const rankNames = [
         game.i18n.localize("pf2e-aztecs-sundered.ranks.untrained") ||
            "Untrained",
         game.i18n.localize("pf2e-aztecs-sundered.ranks.trained") || "Trained",
         game.i18n.localize("pf2e-aztecs-sundered.ranks.expert") || "Expert",
         game.i18n.localize("pf2e-aztecs-sundered.ranks.master") || "Master",
         game.i18n.localize("pf2e-aztecs-sundered.ranks.legendary") ||
            "Legendary",
      ]

      let ranks = rankNames.map((label, index) => ({
         value: index,
         label: label,
         selected: index === baseCraftingRank,
      }))

      if (this.item.system.level?.value !== undefined) {
         const standardDifficultyClasses = [
            14, 15, 16, 18, 19, 20, 22, 23, 24, 26, 27, 28, 30, 31, 32, 34, 35,
            36, 38, 39, 40, 42, 44, 46, 48, 50,
         ]
         repairDifficultyClass =
            standardDifficultyClasses[
               Math.max(0, Math.min(25, this.item.system.level.value))
            ]
      }

      this.itemBaseHardness = isShieldItem
         ? (this.item.system.hardness ?? 0)
         : (this.item.getFlag("world", "hardness") ?? 5)
      this.currentHitPoints = currentHitPoints
      this.maximumHitPoints = maximumHitPoints

      let { baseHeal, critHeal } = this._getHealingValues(baseCraftingRank)

      let restoresInfo = game.i18n.format(
         "pf2e-aztecs-sundered.dialog.repair.restores-info",
         { baseHeal, critHeal },
      )
      if (restoresInfo.includes("dialog.repair.restores-info")) {
         restoresInfo = `(Default success restores ${baseHeal} HP. Crit restores ${critHeal} HP)`
      }

      return {
         item: this.item,
         ranks: ranks,
         dc: repairDifficultyClass,
         restoresInfo: restoresInfo,
         currentHp: currentHitPoints,
         maximumHp: maximumHitPoints,
      }
   }

   _onRender(context, options) {
      super._onRender(context, options)
      const el = this.element

      const rankSelect = el.querySelector("#repair-rank")
      const infoSpan = el.querySelector("#repair-restores-info")

      rankSelect.addEventListener("change", () => {
         let selectedRank = parseInt(rankSelect.value) || 0
         let { baseHeal, critHeal } = this._getHealingValues(selectedRank)

         let updatedInfo = game.i18n.format(
            "pf2e-aztecs-sundered.dialog.repair.restores-info",
            { baseHeal, critHeal },
         )
         if (updatedInfo.includes("dialog.repair.restores-info"))
            updatedInfo = `(Default success restores ${baseHeal} HP. Crit restores ${critHeal} HP)`
         infoSpan.textContent = updatedInfo
      })
   }

   static async _onRepair(event, target) {
      const el = this.element
      let finalDifficultyClass =
         parseInt(el.querySelector("#repair-dc").value) || 15
      let selectedRank = parseInt(el.querySelector("#repair-rank").value) || 0

      let { baseHeal, critHeal } = this._getHealingValues(selectedRank)

      this.actor.skills.crafting.roll({
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

            let amountHealed = 0
            if (outcomeType === "criticalSuccess") amountHealed = critHeal
            else if (outcomeType === "success") amountHealed = baseHeal
            else if (outcomeType === "criticalFailure") {
               let critFailRoll = await new Roll("2d6").evaluate()
               let damage = Math.max(
                  0,
                  critFailRoll.total - this.itemBaseHardness,
               )
               amountHealed = -damage
            }

            let newlyCalculatedHitPoints =
               amountHealed > 0
                  ? Math.min(
                       this.maximumHitPoints,
                       this.currentHitPoints + amountHealed,
                    )
                  : Math.max(0, this.currentHitPoints + amountHealed)

            let isShieldItem = this.item.type === "shield"
            let targetItemUpdates = {}

            if (isShieldItem)
               targetItemUpdates["system.hp.value"] = newlyCalculatedHitPoints
            else {
               targetItemUpdates["flags.world.currentHp"] =
                  newlyCalculatedHitPoints
               if (this.item.getFlag("world", "maxHp") === undefined) {
                  targetItemUpdates["flags.world.maxHp"] = this.maximumHitPoints
                  targetItemUpdates["flags.world.hardness"] = 5
               }
            }
            await this.item.update(targetItemUpdates)

            let outcomeColor =
               outcomeType === "criticalSuccess"
                  ? "green"
                  : outcomeType === "success"
                    ? "blue"
                    : outcomeType === "criticalFailure"
                      ? "red"
                      : "gray"
            let outcomeTextMap = {
               criticalSuccess:
                  game.i18n.localize(
                     "pf2e-aztecs-sundered.outcomes.critical-success",
                  ) || "Critical Success",
               success:
                  game.i18n.localize("pf2e-aztecs-sundered.outcomes.success") ||
                  "Success",
               failure:
                  game.i18n.localize("pf2e-aztecs-sundered.outcomes.failure") ||
                  "Failure",
               criticalFailure:
                  game.i18n.localize(
                     "pf2e-aztecs-sundered.outcomes.critical-failure",
                  ) || "Critical Failure",
            }
            let rolledFallback =
               game.i18n.localize("pf2e-aztecs-sundered.outcomes.rolled") ||
               "Rolled"

            let titleBase = game.i18n.format(
               "pf2e-aztecs-sundered.chat.repair.header",
               { itemName: this.item.name },
            )
            if (titleBase.includes("chat.repair.header"))
               titleBase = `Repairing ${this.item.name}`

            let amountText =
               amountHealed !== 0
                  ? game.i18n.format(
                       amountHealed > 0
                          ? "pf2e-aztecs-sundered.chat.repair.healed"
                          : "pf2e-aztecs-sundered.chat.repair.damaged",
                       {
                          amount: Math.abs(
                             newlyCalculatedHitPoints - this.currentHitPoints,
                          ),
                       },
                    )
                  : game.i18n.localize(
                       "pf2e-aztecs-sundered.chat.repair.no-hp-restored",
                    ) || "No HP restored"

            if (amountText.includes("chat.repair")) {
               amountText =
                  amountHealed > 0
                     ? `Restored ${Math.abs(newlyCalculatedHitPoints - this.currentHitPoints)} HP`
                     : `Damaged ${Math.abs(newlyCalculatedHitPoints - this.currentHitPoints)} HP`
            }

            let currentHpLabel =
               game.i18n.localize(
                  "pf2e-aztecs-sundered.chat.repair.current-hp",
               ) || "Current HP"

            ChatMessage.create({
               user: game.user.id,
               speaker: ChatMessage.getSpeaker({ actor: this.actor || null }),
               content: `<div class=\"pf2e chat-card\"><header class=\"card-header flexrow\"><img src=\"${this.item.img}\" title=\"${this.item.name}\" width=\"36\" height=\"36\"/><h3>${titleBase}</h3></header><div class=\"card-content\" style=\"margin-top: 5px;\"><div style=\"color: ${outcomeColor}; font-weight: bold; font-size: 1.1em; text-align: center; margin: 4px 0;\">${outcomeTextMap[outcomeType] || rolledFallback}</div><div>${amountText}</div><div style=\"text-align: center; margin-top: 5px;\">${currentHpLabel}: <strong>${newlyCalculatedHitPoints} / ${this.maximumHitPoints}</strong></div></div></div>`,
            })
         },
      })
      this.close()
   }
}
