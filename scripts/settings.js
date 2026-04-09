const forceStateSync = foundry.utils.debounce(async () => {
   const updates = []
   for (let actor of game.actors) {
      for (let item of actor.items) {
         if (item.type === "armor" || item.type === "weapon") {
            let maxHp = item.getFlag("world", "maxHp")
            let currentHp = item.getFlag("world", "currentHp")
            if (maxHp && currentHp <= Math.floor(maxHp / 2)) {
               updates.push(
                  item.update({ "flags.world.durabilitySync": Date.now() }),
               )
            }
         }
      }
   }
   await Promise.all(updates)
}, 500)

export const registerSettings = () => {
   game.settings.register("pf2e-aztecs-sundered", "showInventoryUI", {
      name: "pf2e-aztecs-sundered.settings.showInventoryUI.name",
      hint: "pf2e-aztecs-sundered.settings.showInventoryUI.hint",
      scope: "world",
      config: true,
      type: Boolean,
      default: true,
      requiresReload: true,
   })

   game.settings.register("pf2e-aztecs-sundered", "showInventoryUI_players", {
      name: "pf2e-aztecs-sundered.settings.showForPlayers.name",
      hint: "pf2e-aztecs-sundered.settings.showForPlayers.hint",
      scope: "world",
      config: true,
      type: Boolean,
      default: true,
      requiresReload: true,
   })

   game.settings.register("pf2e-aztecs-sundered", "showDamageButtonUI", {
      name: "pf2e-aztecs-sundered.settings.showDamageButtonUI.name",
      hint: "pf2e-aztecs-sundered.settings.showDamageButtonUI.hint",
      scope: "world",
      config: true,
      type: Boolean,
      default: true,
      requiresReload: true,
   })

   game.settings.register(
      "pf2e-aztecs-sundered",
      "showDamageButtonUI_players",
      {
         name: "pf2e-aztecs-sundered.settings.showForPlayers.name",
         hint: "pf2e-aztecs-sundered.settings.showForPlayers.hint",
         scope: "world",
         config: true,
         type: Boolean,
         default: true,
         requiresReload: true,
      },
   )

   game.settings.register(
      "pf2e-aztecs-sundered",
      "showAssignMaterialButtonUI",
      {
         name: "pf2e-aztecs-sundered.settings.showAssignMaterialButtonUI.name",
         hint: "pf2e-aztecs-sundered.settings.showAssignMaterialButtonUI.hint",
         scope: "world",
         config: true,
         type: Boolean,
         default: true,
         requiresReload: true,
      },
   )

   game.settings.register(
      "pf2e-aztecs-sundered",
      "showAssignMaterialButtonUI_players",
      {
         name: "pf2e-aztecs-sundered.settings.showForPlayers.name",
         hint: "pf2e-aztecs-sundered.settings.showForPlayers.hint",
         scope: "world",
         config: true,
         type: Boolean,
         default: true,
         requiresReload: true,
      },
   )

   game.settings.register(
      "pf2e-aztecs-sundered",
      "showTrackDurabilityButtonUI",
      {
         name: "pf2e-aztecs-sundered.settings.showTrackDurabilityButtonUI.name",
         hint: "pf2e-aztecs-sundered.settings.showTrackDurabilityButtonUI.hint",
         scope: "world",
         config: true,
         type: Boolean,
         default: false,
         requiresReload: true,
      },
   )

   game.settings.register(
      "pf2e-aztecs-sundered",
      "showTrackDurabilityButtonUI_players",
      {
         name: "pf2e-aztecs-sundered.settings.showForPlayers.name",
         hint: "pf2e-aztecs-sundered.settings.showForPlayers.hint",
         scope: "world",
         config: true,
         type: Boolean,
         default: false,
         requiresReload: true,
      },
   )

   game.settings.register("pf2e-aztecs-sundered", "showRepairButtonUI", {
      name: "pf2e-aztecs-sundered.settings.showRepairButtonUI.name",
      hint: "pf2e-aztecs-sundered.settings.showRepairButtonUI.hint",
      scope: "world",
      config: true,
      type: Boolean,
      default: true,
      requiresReload: true,
   })

   game.settings.register(
      "pf2e-aztecs-sundered",
      "showRepairButtonUI_players",
      {
         name: "pf2e-aztecs-sundered.settings.showForPlayers.name",
         hint: "pf2e-aztecs-sundered.settings.showForPlayers.hint",
         scope: "world",
         config: true,
         type: Boolean,
         default: true,
         requiresReload: true,
      },
   )

   game.settings.register("pf2e-aztecs-sundered", "enableArmourPenalty", {
      name: "pf2e-aztecs-sundered.settings.enableArmourPenalty.name",
      hint: "pf2e-aztecs-sundered.settings.enableArmourPenalty.hint",
      scope: "world",
      config: true,
      type: Boolean,
      default: true,
      onChange: forceStateSync,
   })

   game.settings.register("pf2e-aztecs-sundered", "armourPenaltyLight", {
      name: "pf2e-aztecs-sundered.settings.armourPenaltyLight.name",
      hint: "pf2e-aztecs-sundered.settings.armourPenaltyLight.hint",
      scope: "world",
      config: true,
      type: Number,
      default: -1,
      onChange: forceStateSync,
   })

   game.settings.register("pf2e-aztecs-sundered", "armourPenaltyMedium", {
      name: "pf2e-aztecs-sundered.settings.armourPenaltyMedium.name",
      hint: "pf2e-aztecs-sundered.settings.armourPenaltyMedium.hint",
      scope: "world",
      config: true,
      type: Number,
      default: -2,
      onChange: forceStateSync,
   })

   game.settings.register("pf2e-aztecs-sundered", "armourPenaltyHeavy", {
      name: "pf2e-aztecs-sundered.settings.armourPenaltyHeavy.name",
      hint: "pf2e-aztecs-sundered.settings.armourPenaltyHeavy.hint",
      scope: "world",
      config: true,
      type: Number,
      default: -3,
      onChange: forceStateSync,
   })

   game.settings.register("pf2e-aztecs-sundered", "laminarPenaltyReduction", {
      name: "pf2e-aztecs-sundered.settings.laminarPenaltyReduction.name",
      hint: "pf2e-aztecs-sundered.settings.laminarPenaltyReduction.hint",
      scope: "world",
      config: true,
      type: Number,
      default: -1,
      onChange: forceStateSync,
   })

   game.settings.register("pf2e-aztecs-sundered", "enableWeaponPenalty", {
      name: "pf2e-aztecs-sundered.settings.enableWeaponPenalty.name",
      hint: "pf2e-aztecs-sundered.settings.enableWeaponPenalty.hint",
      scope: "world",
      config: true,
      type: Boolean,
      default: true,
      onChange: forceStateSync,
   })

   game.settings.register("pf2e-aztecs-sundered", "weaponPenaltyAmount", {
      name: "pf2e-aztecs-sundered.settings.weaponPenaltyAmount.name",
      hint: "pf2e-aztecs-sundered.settings.weaponPenaltyAmount.hint",
      scope: "world",
      config: true,
      type: Number,
      default: -2,
      onChange: forceStateSync,
   })

   game.settings.register("pf2e-aztecs-sundered", "suppressArmourPotency", {
      name: "pf2e-aztecs-sundered.settings.suppressArmourPotency.name",
      hint: "pf2e-aztecs-sundered.settings.suppressArmourPotency.hint",
      scope: "world",
      config: true,
      type: Boolean,
      default: true,
      onChange: forceStateSync,
   })

   game.settings.register("pf2e-aztecs-sundered", "suppressArmourResilient", {
      name: "pf2e-aztecs-sundered.settings.suppressArmourResilient.name",
      hint: "pf2e-aztecs-sundered.settings.suppressArmourResilient.hint",
      scope: "world",
      config: true,
      type: Boolean,
      default: true,
      onChange: forceStateSync,
   })

   game.settings.register("pf2e-aztecs-sundered", "suppressArmourProperty", {
      name: "pf2e-aztecs-sundered.settings.suppressArmourProperty.name",
      hint: "pf2e-aztecs-sundered.settings.suppressArmourProperty.hint",
      scope: "world",
      config: true,
      type: Boolean,
      default: true,
      onChange: forceStateSync,
   })

   game.settings.register("pf2e-aztecs-sundered", "suppressWeaponPotency", {
      name: "pf2e-aztecs-sundered.settings.suppressWeaponPotency.name",
      hint: "pf2e-aztecs-sundered.settings.suppressWeaponPotency.hint",
      scope: "world",
      config: true,
      type: Boolean,
      default: true,
      onChange: forceStateSync,
   })

   game.settings.register("pf2e-aztecs-sundered", "suppressWeaponStriking", {
      name: "pf2e-aztecs-sundered.settings.suppressWeaponStriking.name",
      hint: "pf2e-aztecs-sundered.settings.suppressWeaponStriking.hint",
      scope: "world",
      config: true,
      type: Boolean,
      default: true,
      onChange: forceStateSync,
   })

   game.settings.register("pf2e-aztecs-sundered", "suppressWeaponProperty", {
      name: "pf2e-aztecs-sundered.settings.suppressWeaponProperty.name",
      hint: "pf2e-aztecs-sundered.settings.suppressWeaponProperty.hint",
      scope: "world",
      config: true,
      type: Boolean,
      default: true,
      onChange: forceStateSync,
   })

   game.settings.register("pf2e-aztecs-sundered", "restrictPreciousMaterial", {
      name: "pf2e-aztecs-sundered.settings.restrictPreciousMaterial.name",
      hint: "pf2e-aztecs-sundered.settings.restrictPreciousMaterial.hint",
      scope: "world",
      config: true,
      type: Boolean,
      default: false,
   })

   game.settings.register("pf2e-aztecs-sundered", "injectSunderButton", {
      name: "pf2e-aztecs-sundered.settings.injectSunderButton.name",
      hint: "pf2e-aztecs-sundered.settings.injectSunderButton.hint",
      scope: "world",
      config: true,
      type: Boolean,
      default: true,
   })

   game.settings.register("pf2e-aztecs-sundered", "allowPlayersSunderButton", {
      name: "pf2e-aztecs-sundered.settings.allowPlayersSunderButton.name",
      hint: "pf2e-aztecs-sundered.settings.allowPlayersSunderButton.hint",
      scope: "world",
      config: true,
      type: Boolean,
      default: false,
   })
}

Hooks.on("renderSettingsConfig", (app, htmlData) => {
   const html = htmlData instanceof HTMLElement ? htmlData : htmlData[0]

   const toggleUIDependencies = () => {
      const showInventoryUI = html.querySelector(
         'input[name="pf2e-aztecs-sundered.showInventoryUI"]',
      )
      const showInventoryUIPlayers = html.querySelector(
         'input[name="pf2e-aztecs-sundered.showInventoryUI_players"]',
      )

      const showDamageUI = html.querySelector(
         'input[name="pf2e-aztecs-sundered.showDamageButtonUI"]',
      )
      const showDamageUIPlayers = html.querySelector(
         'input[name="pf2e-aztecs-sundered.showDamageButtonUI_players"]',
      )

      const showMaterialUI = html.querySelector(
         'input[name="pf2e-aztecs-sundered.showAssignMaterialButtonUI"]',
      )
      const showMaterialUIPlayers = html.querySelector(
         'input[name="pf2e-aztecs-sundered.showAssignMaterialButtonUI_players"]',
      )

      const showTrackUI = html.querySelector(
         'input[name="pf2e-aztecs-sundered.showTrackDurabilityButtonUI"]',
      )
      const showTrackUIPlayers = html.querySelector(
         'input[name="pf2e-aztecs-sundered.showTrackDurabilityButtonUI_players"]',
      )

      const showRepairUI = html.querySelector(
         'input[name="pf2e-aztecs-sundered.showRepairButtonUI"]',
      )
      const showRepairUIPlayers = html.querySelector(
         'input[name="pf2e-aztecs-sundered.showRepairButtonUI_players"]',
      )

      if (!showInventoryUI) return

      const setDisplay = (element, isVisible) => {
         if (element && element.closest(".form-group")) {
            element.closest(".form-group").style.display = isVisible
               ? ""
               : "none"
         }
      }

      let isMainOn = showInventoryUI.checked

      setDisplay(showInventoryUIPlayers, isMainOn)

      showDamageUI.disabled = !isMainOn
      showMaterialUI.disabled = !isMainOn
      showTrackUI.disabled = !isMainOn
      showRepairUI.disabled = !isMainOn

      setDisplay(showDamageUIPlayers, isMainOn && showDamageUI.checked)
      setDisplay(showMaterialUIPlayers, isMainOn && showMaterialUI.checked)
      setDisplay(showTrackUIPlayers, isMainOn && showTrackUI.checked)
      setDisplay(showRepairUIPlayers, isMainOn && showRepairUI.checked)
   }

   const toggleDependencies = () => {
      const armourPotency = html.querySelector(
         'input[name="pf2e-aztecs-sundered.suppressArmourPotency"]',
      )
      const armourResilient = html.querySelector(
         'input[name="pf2e-aztecs-sundered.suppressArmourResilient"]',
      )
      const armourProperty = html.querySelector(
         'input[name="pf2e-aztecs-sundered.suppressArmourProperty"]',
      )

      if (armourPotency && armourResilient && armourProperty) {
         if (armourPotency.checked) {
            armourResilient.disabled = true
            armourResilient.checked = false
            armourProperty.disabled = true
            armourProperty.checked = false
         } else {
            armourResilient.disabled = false
            armourProperty.disabled = false
         }
      }

      const weaponPotency = html.querySelector(
         'input[name="pf2e-aztecs-sundered.suppressWeaponPotency"]',
      )
      const weaponStriking = html.querySelector(
         'input[name="pf2e-aztecs-sundered.suppressWeaponStriking"]',
      )
      const weaponProperty = html.querySelector(
         'input[name="pf2e-aztecs-sundered.suppressWeaponProperty"]',
      )

      if (weaponPotency && weaponStriking && weaponProperty) {
         if (weaponPotency.checked) {
            weaponStriking.disabled = true
            weaponStriking.checked = false
            weaponProperty.disabled = true
            weaponProperty.checked = false
         } else {
            weaponStriking.disabled = false
            weaponProperty.disabled = false
         }
      }
   }

   toggleUIDependencies()
   toggleDependencies()

   html.addEventListener("change", (e) => {
      if (e.target.name.startsWith("pf2e-aztecs-sundered.show")) {
         toggleUIDependencies()
      } else if (
         e.target.name === "pf2e-aztecs-sundered.suppressArmourPotency" ||
         e.target.name === "pf2e-aztecs-sundered.suppressWeaponPotency"
      ) {
         toggleDependencies()
      }
   })
})
