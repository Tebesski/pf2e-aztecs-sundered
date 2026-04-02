const forceStateSync = foundry.utils.debounce(async () => {
   const updates = []
   for (let actor of game.actors) {
      for (let item of actor.items) {
         if (item.type === "armor" || item.type === "weapon") {
            let maxHp = item.getFlag("world", "maxHp")
            let currentHp = item.getFlag("world", "currentHp")
            if (maxHp && currentHp <= Math.floor(maxHp / 2)) {
               updates.push(
                  item.update({ "flags.world.durabilitySync": Date.now() })
               )
            }
         }
      }
   }
   await Promise.all(updates)
}, 500)

export const registerSettings = () => {
   game.settings.register("pf2e-aztecs-sundered", "showInventoryUI", {
      name: "Show Inventory Interface",
      hint: "Display the durability tracking numbers and damage controls directly on the main inventory rows.",
      scope: "client",
      config: true,
      type: Boolean,
      default: false,
      requiresReload: true,
   })

   game.settings.register("pf2e-aztecs-sundered", "enableArmourPenalty", {
      name: "Enable Broken Armour Penalties",
      hint: "Apply a status penalty to armour class when defensive gear drops below the broken threshold.",
      scope: "world",
      config: true,
      type: Boolean,
      default: true,
      onChange: forceStateSync,
   })

   game.settings.register("pf2e-aztecs-sundered", "armourPenaltyLight", {
      name: "Light Armour Penalty",
      hint: "The penalty amount applied to broken light armour.",
      scope: "world",
      config: true,
      type: Number,
      default: -1,
      onChange: forceStateSync,
   })

   game.settings.register("pf2e-aztecs-sundered", "armourPenaltyMedium", {
      name: "Medium Armour Penalty",
      hint: "The penalty amount applied to broken medium armour.",
      scope: "world",
      config: true,
      type: Number,
      default: -2,
      onChange: forceStateSync,
   })

   game.settings.register("pf2e-aztecs-sundered", "armourPenaltyHeavy", {
      name: "Heavy Armour Penalty",
      hint: "The penalty amount applied to broken heavy armour.",
      scope: "world",
      config: true,
      type: Number,
      default: -3,
      onChange: forceStateSync,
   })

   game.settings.register("pf2e-aztecs-sundered", "enableWeaponPenalty", {
      name: "Enable Broken Weapon Penalties",
      hint: "Apply an item penalty to attack and damage rolls when a weapon drops below the broken threshold.",
      scope: "world",
      config: true,
      type: Boolean,
      default: true,
      onChange: forceStateSync,
   })

   game.settings.register("pf2e-aztecs-sundered", "weaponPenaltyAmount", {
      name: "Weapon Penalty Amount",
      hint: "The specific numeric penalty applied to broken weapons.",
      scope: "world",
      config: true,
      type: Number,
      default: -2,
      onChange: forceStateSync,
   })

   game.settings.register("pf2e-aztecs-sundered", "suppressArmourPotency", {
      name: "Suppress Armour Potency",
      hint: "Disable fundamental runes on broken armour. Note: This feature conflicts with Automatic Bonus Progression.",
      scope: "world",
      config: true,
      type: Boolean,
      default: true,
      onChange: forceStateSync,
   })

   game.settings.register("pf2e-aztecs-sundered", "suppressArmourResilient", {
      name: "Suppress Armour Resiliency",
      hint: "Disable resilient runes on broken armour. Automatically disabled if Potency is suppressed.",
      scope: "world",
      config: true,
      type: Boolean,
      default: true,
      onChange: forceStateSync,
   })

   game.settings.register("pf2e-aztecs-sundered", "suppressArmourProperty", {
      name: "Suppress Armour Properties",
      hint: "Disable property runes on broken armour. Automatically disabled if Potency is suppressed.",
      scope: "world",
      config: true,
      type: Boolean,
      default: true,
      onChange: forceStateSync,
   })

   game.settings.register("pf2e-aztecs-sundered", "suppressWeaponPotency", {
      name: "Suppress Weapon Potency",
      hint: "Disable fundamental runes on broken weapons. Note: This feature conflicts with Automatic Bonus Progression.",
      scope: "world",
      config: true,
      type: Boolean,
      default: true,
      onChange: forceStateSync,
   })

   game.settings.register("pf2e-aztecs-sundered", "suppressWeaponStriking", {
      name: "Suppress Weapon Striking",
      hint: "Disable striking runes on broken weapons. Automatically disabled if Potency is suppressed.",
      scope: "world",
      config: true,
      type: Boolean,
      default: true,
      onChange: forceStateSync,
   })

   game.settings.register("pf2e-aztecs-sundered", "suppressWeaponProperty", {
      name: "Suppress Weapon Properties",
      hint: "Disable property runes on broken weapons. Automatically disabled if Potency is suppressed.",
      scope: "world",
      config: true,
      type: Boolean,
      default: true,
      onChange: forceStateSync,
   })

   game.settings.register("pf2e-aztecs-sundered", "restrictPreciousMaterial", {
      name: "Restrict Precious Material Durability",
      hint: "Apply precious material statistics only if the base item is less durable than the material.",
      scope: "world",
      config: true,
      type: Boolean,
      default: false,
   })
}

Hooks.on("renderSettingsConfig", (app, htmlData) => {
   const html = htmlData instanceof HTMLElement ? htmlData : htmlData[0]

   const toggleDependencies = () => {
      const armourPotency = html.querySelector(
         'input[name="pf2e-aztecs-sundered.suppressArmourPotency"]'
      )
      const armourResilient = html.querySelector(
         'input[name="pf2e-aztecs-sundered.suppressArmourResilient"]'
      )
      const armourProperty = html.querySelector(
         'input[name="pf2e-aztecs-sundered.suppressArmourProperty"]'
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
         'input[name="pf2e-aztecs-sundered.suppressWeaponPotency"]'
      )
      const weaponStriking = html.querySelector(
         'input[name="pf2e-aztecs-sundered.suppressWeaponStriking"]'
      )
      const weaponProperty = html.querySelector(
         'input[name="pf2e-aztecs-sundered.suppressWeaponProperty"]'
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

   toggleDependencies()

   html.addEventListener("change", (e) => {
      if (
         e.target.name === "pf2e-aztecs-sundered.suppressArmourPotency" ||
         e.target.name === "pf2e-aztecs-sundered.suppressWeaponPotency"
      ) {
         toggleDependencies()
      }
   })
})
