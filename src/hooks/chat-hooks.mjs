export function registerChatHooks() {
   Hooks.on("renderChatMessageHTML", (message, htmlElement, data) => {
      if (!game.settings.get("pf2e-aztecs-sundered", "injectSunderButton"))
         return
      if (
         !game.user.isGM &&
         !game.settings.get("pf2e-aztecs-sundered", "allowPlayersSunderButton")
      )
         return
      if (!message.isDamageRoll) return

      if (
         message.flags?.pf2e?.context?.options?.includes("splash-damage") ||
         (message.flavor &&
            message.flavor.toLowerCase().includes("splash damage roll"))
      )
         return

      const domElement =
         htmlElement instanceof HTMLElement ? htmlElement : htmlElement[0]

      let parsedDamage = []
      let persistentData = null
      let totalDamage = 0

      if (message.rolls && Array.isArray(message.rolls)) {
         message.rolls.forEach((roll) => {
            if (roll.instances && Array.isArray(roll.instances)) {
               roll.instances.forEach((inst) => {
                  let flavorStr = String(
                     inst.options?.flavor || "",
                  ).toLowerCase()
                  let formulaStr = String(inst.formula || "").toLowerCase()

                  let isPersistent =
                     inst.persistent ||
                     flavorStr.includes("persistent") ||
                     formulaStr.includes("persistent")

                  if (isPersistent) {
                     let rawFormula =
                        inst.head?.expression || inst.formula || "1d6"
                     let cleanFormula = String(rawFormula)
                        .split(/[pP\[]/)[0]
                        .replace(/[^\d\+\-\*\/\(\)d]/gi, "")
                        .trim()
                     let parsedType =
                        inst.type ||
                        flavorStr
                           .replace("persistent", "")
                           .replace(/[^a-z]/g, "")
                           .trim() ||
                        "damage"
                     persistentData = {
                        formula: cleanFormula || "1d6",
                        type: parsedType,
                     }
                  } else {
                     let parsedType =
                        inst.type ||
                        flavorStr.replace(/[^a-z]/g, "").trim() ||
                        "untyped"
                     parsedDamage.push({
                        type: parsedType,
                        value: inst.total,
                        selected: true,
                     })
                     totalDamage += inst.total
                  }
               })
            } else if (roll.total) {
               parsedDamage.push({
                  type: "untyped",
                  value: roll.total,
                  selected: true,
               })
               totalDamage += roll.total
            }
         })
      }

      let rollOptions = message.flags?.pf2e?.context?.options || []

      let attackerData = {
         rawDamage: totalDamage,
         parsedDamage: parsedDamage,
         isAdamantine: false,
         adamantineGrade: null,
         isCorrosive: false,
         corrosiveDice: "",
         isRazing: false,
         razingDamage: 0,
         persistentData: persistentData,
         rollOptions: rollOptions,
      }

      let weapon = message.item
      if (weapon && weapon.type === "weapon") {
         if (weapon.system.material?.type === "adamantine") {
            attackerData.isAdamantine = true
            attackerData.adamantineGrade = weapon.system.material.grade
         }

         let traits = weapon.system.traits?.value || []
         if (traits.includes("razing")) {
            let strikingTier = weapon.system.runes?.striking || 0
            attackerData.isRazing = true
            attackerData.razingDamage = (1 + strikingTier) * 2
         }

         let isCrit =
            message.flags?.pf2e?.context?.options?.includes("critical-hit") ||
            (message.flavor &&
               message.flavor.toLowerCase().includes("critical"))
         if (isCrit) {
            let propertyRunes = weapon.system.runes?.property || []
            let isGreater = propertyRunes.includes("greaterCorrosive")
            let isStandard = propertyRunes.includes("corrosive")

            if (isGreater || isStandard) {
               attackerData.isCorrosive = true
               attackerData.corrosiveDice = isGreater ? "6d6" : "3d6"
            }
         }
      }

      let btnHtml = `
         <button type="button" class="sunder-chat-btn" title="${game.i18n.localize("pf2e-aztecs-sundered.sheet-text.strike-item")}">
            <i class="fa-solid fa-hammer-crash fa-fw" inert=""></i>
            <span class="label">${game.i18n.localize("pf2e-aztecs-sundered.chat.sunder-button-label")}</span>
         </button>
      `

      const damageAppContainer = domElement.querySelector(".damage-application")
      if (damageAppContainer) {
         damageAppContainer.insertAdjacentHTML("beforeend", btnHtml)
      }

      domElement.addEventListener(
         "click",
         async (event) => {
            let btn = event.target.closest(".sunder-chat-btn")
            if (!btn) return

            event.preventDefault()
            event.stopPropagation()

            let targetActor =
               Array.from(game.user.targets)[0]?.actor ||
               canvas.tokens.controlled[0]?.actor

            if (!targetActor)
               return ui.notifications.warn(
                  game.i18n.localize(
                     "pf2e-aztecs-sundered.notifications.no-target",
                  ),
               )

            const { SunderApp } = await import("../apps/sunder-app.mjs")
            new SunderApp({ actor: targetActor, attackerData }).render(true)
         },
         true,
      )
   })
}
