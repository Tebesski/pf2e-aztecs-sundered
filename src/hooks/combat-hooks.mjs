export function registerCombatHooks() {
   Hooks.on("updateCombat", async (combat, updateData) => {
      if (
         !game.user.isGM ||
         (!("turn" in updateData) && !("round" in updateData))
      )
         return

      let currentCombatant = combat.combatant
      if (!currentCombatant || !currentCombatant.actor) return

      const persistentEffects = currentCombatant.actor.items.filter(
         (item) =>
            item.type === "effect" &&
            item.flags?.["pf2e-aztecs-sundered"]?.isPersistentDamage,
      )

      if (persistentEffects.length > 0) {
         const { PersistentItemDamageApp } =
            await import("../apps/persistent-app.mjs")
         for (const effectItem of persistentEffects) {
            new PersistentItemDamageApp({
               actor: currentCombatant.actor,
               effectItem,
            }).render(true)
         }
      }
   })
}
