const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api
import { dmgIcons, physicalTypes } from "../constants.mjs"

export class SunderApp extends HandlebarsApplicationMixin(ApplicationV2) {
   constructor(options = {}) {
      super(options)
      this.actor = options.actor
      this.attackerData = foundry.utils.deepClone(
         options.attackerData || {
            rawDamage: 0,
            parsedDamage: [],
            rollOptions: [],
         },
      )
      this.preselectedItemId = options.preselectedItemId || ""
      this.persistentDataProcessed = false

      this.inventoryItems = this.actor.items
         .filter((i) => physicalTypes.includes(i.type))
         .map((i) => {
            const isShield = i.type === "shield"
            return {
               id: i.id,
               name: i.name,
               img: i.img,
               currentHp: isShield
                  ? (i.system.hp?.value ?? 0)
                  : (i.getFlag("world", "currentHp") ?? 10),
               maximumHp: isShield
                  ? (i.system.hp?.max ?? 0)
                  : (i.getFlag("world", "maxHp") ?? 10),
               hardness: isShield
                  ? (i.system.hardness ?? 0)
                  : (i.getFlag("world", "hardness") ?? 5),
               type: i.type,
               itemRef: i,
            }
         })
   }

   static DEFAULT_OPTIONS = {
      id: "sunder-app",
      classes: ["pf2e"],
      position: { width: 420, height: "auto" },
      window: { title: "pf2e-aztecs-sundered.sheet-text.sunder-item" },
      actions: {
         addDamage: this._onAddDamage,
         removeDamage: this._onRemoveDamage,
         applyDamage: this._onApplyDamage,
      },
   }

   static PARTS = {
      main: {
         template: "modules/pf2e-aztecs-sundered/templates/sunder-dialog.hbs",
      },
   }

   async _prepareContext(options) {
      const damageTypes = Object.entries(CONFIG.PF2E.damageTypes || {})
         .map(([key, label]) => ({
            key,
            label: game.i18n.localize(label),
         }))
         .sort((a, b) => a.label.localeCompare(b.label))

      let items = [...this.inventoryItems]
      if (this.preselectedItemId) {
         items = items.sort((a, b) =>
            a.id === this.preselectedItemId
               ? -1
               : b.id === this.preselectedItemId
                 ? 1
                 : 0,
         )
      }
      if (this.attackerData.isCorrosive && !this.attackerData.corrosiveDmg) {
         let corrosiveRoll = await new Roll(
            this.attackerData.corrosiveDice || "1d6",
         ).evaluate()
         this.attackerData.corrosiveDmg = corrosiveRoll.total
      }

      if (
         this.attackerData.persistentData &&
         this.attackerData.persistentData.formula &&
         !this.persistentDataProcessed
      ) {
         this.persistentDataProcessed = true
         let formula = String(this.attackerData.persistentData.formula)
         let parts = formula.split("d")
         let count = parseInt(parts[0]) || 1
         let die = parts[1] ? `d${parts[1]}` : ""
         let type = this.attackerData.persistentData.type || "fire"

         const alreadyExists = this.attackerData.parsedDamage.some(
            (d) =>
               d.isPersistent &&
               d.value === count &&
               d.die === die &&
               d.type === type,
         )
         if (!alreadyExists) {
            this.attackerData.parsedDamage.push({
               value: count,
               die: die,
               type: type,
               isPersistent: true,
            })
         }
      }

      const parsedDamage = (this.attackerData.parsedDamage || []).map((d) => {
         const iconData = dmgIcons[d.type] || {
            icon: "fa-shield-halved",
            color: "#444",
         }
         return { ...d, iconData, die: d.die || "" }
      })

      return {
         items,
         damageTypes,
         parsedDamage,
         rawDamage: this.attackerData.rawDamage || 0,
         isRazing: this.attackerData.isRazing || false,
         razingDamage: this.attackerData.razingDamage || 0,
         isCorrosive: this.attackerData.isCorrosive || false,
         corrosiveDmg: this.attackerData.corrosiveDmg || 0,
         corrosiveDice: this.attackerData.corrosiveDice || "",
         isAdamantine: this.attackerData.isAdamantine || false,
         isHighGrade: this.attackerData.adamantineGrade === "high",
         persistentData: this.attackerData.persistentData || null,
      }
   }

   _onRender(context, options) {
      super._onRender(context, options)
      const el = this.element

      el.querySelectorAll(".damage-row select.dmg-type").forEach((select) => {
         const selectedValue = select.dataset.selected
         if (selectedValue) select.value = selectedValue
      })

      if (!el.querySelector(".apply-damage-btn")) {
         const btn = document.createElement("button")
         btn.type = "button"
         btn.className = "apply-damage-btn"
         btn.style.marginTop = "10px"
         btn.dataset.action = "applyDamage"
         btn.innerHTML = `<i class="fa-solid fa-hammer"></i> ${game.i18n.localize("pf2e-aztecs-sundered.dialog.sunder.apply-damage")}`
         el.appendChild(btn)
      }

      const inputs = el.querySelectorAll(
         "#item-select, .dmg-val, .dmg-count, .dmg-die, #ignore-hd, #use-adamantine, #adamantine-hd",
      )
      inputs.forEach((input) => {
         input.addEventListener("change", () => this.calculatePreview())
         input.addEventListener("input", () => this.calculatePreview())
      })

      el.addEventListener("change", (event) => {
         const target = event.target
         if (target.classList.contains("dmg-type")) {
            const row = target.closest(".damage-row")
            const icon = row?.querySelector(".dmg-icon")
            const currentType = target.value
            if (icon) {
               const iconData = dmgIcons[currentType] || {
                  icon: "fa-shield-halved",
                  color: "#444",
               }
               icon.className = `fa-solid ${iconData.icon} dmg-icon`
               icon.style.color = iconData.color
            }
            target.dataset.selected = currentType
            this.calculatePreview()
         }

         if (target.classList.contains("dmg-category")) {
            const row = target.closest(".damage-row")
            const normalCont = row?.querySelector(".normal-input-container")
            const persCont = row?.querySelector(".persistent-input-container")
            const isPersistent = target.value === "persistent"

            if (normalCont && persCont) {
               normalCont.style.display = isPersistent ? "none" : "block"
               persCont.style.display = isPersistent ? "flex" : "none"
            }
            this.calculatePreview()
         }
      })

      const itemSelect = el.querySelector("#item-select")
      itemSelect?.addEventListener("change", () => {
         const matchedItem = this.inventoryItems.find(
            (i) => i.id === itemSelect.value,
         )
         const imgPreview = el.querySelector("#item-icon-preview")
         if (matchedItem && imgPreview) imgPreview.src = matchedItem.img
      })

      this.calculatePreview()
   }

   _appliesToInstance(iwrType, dmgType, rollOptions = []) {
      const options = rollOptions.map((o) => o.toLowerCase())
      const type = iwrType.toLowerCase()
      const dmg = dmgType.toLowerCase()

      if (type === dmg) return true
      if (
         type === "physical" &&
         ["bludgeoning", "piercing", "slashing", "untyped"].includes(dmg)
      )
         return true
      if (
         type === "energy" &&
         ["acid", "cold", "electricity", "fire", "sonic", "force"].includes(dmg)
      )
         return true

      if (
         options.includes(type) ||
         options.includes(`item:material:${type}`) ||
         options.includes(`item:trait:${type}`) ||
         options.includes(`damage:type:${type}`)
      ) {
         return true
      }
      return false
   }

   _applyIWR(val, type, immunities, weaknesses, resistances, rollOptions) {
      if (
         immunities.some((imm) =>
            this._appliesToInstance(imm, type, rollOptions),
         )
      )
         return 0

      let finalVal = val
      if (finalVal > 0) {
         const activeWeaknesses = weaknesses.filter((w) =>
            this._appliesToInstance(w.type, type, rollOptions),
         )
         if (activeWeaknesses.length > 0) {
            finalVal += Math.max(...activeWeaknesses.map((w) => w.value))
         }

         const activeResistances = resistances.filter((r) =>
            this._appliesToInstance(r.type, type, rollOptions),
         )
         if (activeResistances.length > 0) {
            finalVal = Math.max(
               0,
               finalVal - Math.max(...activeResistances.map((r) => r.value)),
            )
         }
      }
      return finalVal
   }

   calculatePreview() {
      const el = this.element
      if (!el) return

      const itemSelect = el.querySelector("#item-select")
      const targetItemData = this.inventoryItems.find(
         (i) => i.id === itemSelect?.value,
      )
      if (!targetItemData) return

      const itemRef = targetItemData.itemRef
      const immunities = itemRef.getFlag("world", "immunities") || []
      const weaknesses = itemRef.getFlag("world", "weaknesses") || []
      const resistances = itemRef.getFlag("world", "resistances") || []
      const rollOptions = this.attackerData.rollOptions || []

      const iwrDisplay = el.querySelector("#item-iwr-display")
      if (iwrDisplay) {
         let htmlContent = ""
         if (immunities.length > 0) {
            const labels = immunities
               .map((imm) =>
                  game.i18n.localize(CONFIG.PF2E.immunityTypes?.[imm] || imm),
               )
               .join(", ")
            htmlContent += `<div><strong>${game.i18n.localize("pf2e-aztecs-sundered.dialog.durability.immunities")}:</strong> ${labels}</div>`
         }
         if (weaknesses.length > 0) {
            const labels = weaknesses
               .map(
                  (w) =>
                     `${game.i18n.localize(CONFIG.PF2E.weaknessTypes?.[w.type] || w.type)} ${w.value}`,
               )
               .join(", ")
            htmlContent += `<div><strong>${game.i18n.localize("pf2e-aztecs-sundered.dialog.durability.weaknesses")}:</strong> ${labels}</div>`
         }
         if (resistances.length > 0) {
            const labels = resistances
               .map(
                  (r) =>
                     `${game.i18n.localize(CONFIG.PF2E.resistanceTypes?.[r.type] || r.type)} ${r.value}`,
               )
               .join(", ")
            htmlContent += `<div><strong>${game.i18n.localize("pf2e-aztecs-sundered.dialog.durability.resistances")}:</strong> ${labels}</div>`
         }

         if (htmlContent) {
            iwrDisplay.innerHTML = htmlContent
            iwrDisplay.style.display = "flex"
         } else {
            iwrDisplay.style.display = "none"
         }
      }

      let totalInstanceDamage = 0
      let totalPersistentDamageRows = []

      el.querySelectorAll(".damage-row").forEach((row) => {
         const typeSelect = row.querySelector(".dmg-type")
         const catSelect = row.querySelector(".dmg-category")
         if (!typeSelect || !catSelect) return

         const type = typeSelect.value
         const isPersistent = catSelect.value === "persistent"
         let val = 0
         let formulaStr = ""

         if (isPersistent) {
            const countInput = row.querySelector(".dmg-count")
            const dieSelect = row.querySelector(".dmg-die")
            let count = parseInt(countInput?.value) || 1
            let die = dieSelect?.value || ""
            formulaStr = die ? `${count}${die}` : `${count}`
            val = count
         } else {
            const valInput = row.querySelector(".dmg-val")
            val = parseInt(valInput?.value) || 0
         }

         val = this._applyIWR(
            val,
            type,
            immunities,
            weaknesses,
            resistances,
            rollOptions,
         )

         if (isPersistent) {
            if (val > 0)
               totalPersistentDamageRows.push({ type, formula: formulaStr })
         } else {
            totalInstanceDamage += val
         }
      })

      const persLine = el.querySelector("#persistent-preview-line")
      const persVal = el.querySelector("#pers-preview-val")
      if (totalPersistentDamageRows.length > 0) {
         if (persLine) persLine.style.display = "block"
         if (persVal) {
            persVal.textContent = totalPersistentDamageRows
               .map(
                  (r) =>
                     `${r.formula} ${game.i18n.localize(CONFIG.PF2E.damageTypes[r.type] || r.type)}`,
               )
               .join(", ")
         }
      } else {
         if (persLine) persLine.style.display = "none"
      }

      const razingDmg = parseInt(el.querySelector("#razing-dmg")?.value) || 0
      const corrosiveDmg =
         parseInt(el.querySelector("#corrosive-dmg")?.value) || 0
      const ignoreHd = parseInt(el.querySelector("#ignore-hd")?.value) || 0

      let netDamageSum = totalInstanceDamage + razingDmg
      let baseHardness = Number(targetItemData.hardness) || 0

      const useAdamantine = el.querySelector("#use-adamantine")?.checked
      const adamantineSelect = el.querySelector("#adamantine-hd")
      if (adamantineSelect) adamantineSelect.disabled = !useAdamantine

      if (useAdamantine) {
         const adamantineThreshold =
            parseInt(el.querySelector("#adamantine-hd")?.value) || 14
         if (baseHardness < adamantineThreshold) baseHardness = 0
      }

      let effectiveHardness = Math.max(0, baseHardness - ignoreHd)
      let finalDmgToHp =
         Math.max(0, netDamageSum - effectiveHardness) + corrosiveDmg
      let remainingHp = Math.max(0, targetItemData.currentHp - finalDmgToHp)

      const effHdElement = el.querySelector("#eff-hd")
      const netDmgElement = el.querySelector("#net-dmg")
      const remHpElement = el.querySelector("#rem-hp")

      if (effHdElement) effHdElement.textContent = effectiveHardness
      if (netDmgElement) netDmgElement.textContent = finalDmgToHp
      if (remHpElement)
         remHpElement.textContent = `${remainingHp} / ${targetItemData.maximumHp}`
   }

   static async _onAddDamage(event, target) {
      const el = this.element
      const currentInstances = []
      el.querySelectorAll(".damage-row").forEach((row) => {
         const typeSelect = row.querySelector(".dmg-type")
         const catSelect = row.querySelector(".dmg-category")
         if (!typeSelect || !catSelect) return

         const isPersistent = catSelect.value === "persistent"
         if (isPersistent) {
            currentInstances.push({
               value: parseInt(row.querySelector(".dmg-count")?.value) || 1,
               die: row.querySelector(".dmg-die")?.value || "",
               type: typeSelect.value,
               isPersistent: true,
            })
         } else {
            currentInstances.push({
               value: parseInt(row.querySelector(".dmg-val")?.value) || 0,
               die: "",
               type: typeSelect.value,
               isPersistent: false,
            })
         }
      })

      currentInstances.push({
         value: 0,
         die: "",
         type: "untyped",
         isPersistent: false,
      })
      this.attackerData.parsedDamage = currentInstances
      this.attackerData.isAdamantine =
         el.querySelector("#use-adamantine")?.checked || false
      this.attackerData.adamantineGrade =
         el.querySelector("#adamantine-hd")?.value === "17"
            ? "high"
            : "standard"
      this.render(true)
   }

   static async _onRemoveDamage(event, target) {
      const row = target.closest(".damage-row")
      if (row) row.remove()
      this.calculatePreview()
   }

   static async _onApplyDamage(event, target) {
      const el = this.element
      const itemSelect = el.querySelector("#item-select")
      const targetItemData = this.inventoryItems.find(
         (i) => i.id === itemSelect?.value,
      )
      if (!targetItemData) return

      const finalDmgToHp =
         parseInt(el.querySelector("#net-dmg").textContent) || 0
      const newHp = Math.max(0, targetItemData.currentHp - finalDmgToHp)

      const itemRef = targetItemData.itemRef
      const isShield = itemRef.type === "shield"

      if (isShield) {
         await itemRef.update({ "system.hp.value": newHp })
      } else {
         await itemRef.update({ "flags.world.currentHp": newHp })
      }

      const immunities = itemRef.getFlag("world", "immunities") || []
      const weaknesses = itemRef.getFlag("world", "weaknesses") || []
      const resistances = itemRef.getFlag("world", "resistances") || []
      const rollOptions = this.attackerData.rollOptions || []
      const persistentEffectsToCreate = []

      el.querySelectorAll(".damage-row").forEach((row) => {
         const typeSelect = row.querySelector(".dmg-type")
         const catSelect = row.querySelector(".dmg-category")
         if (!typeSelect || !catSelect) return

         if (catSelect.value === "persistent") {
            const countInput = row.querySelector(".dmg-count")
            const dieSelect = row.querySelector(".dmg-die")
            let count = parseInt(countInput?.value) || 1
            let die = dieSelect?.value || ""
            const type = typeSelect.value

            let val = this._applyIWR(
               count,
               type,
               immunities,
               weaknesses,
               resistances,
               rollOptions,
            )

            if (val > 0) {
               let formulaStr = die ? `${count}${die}` : `${count}`
               persistentEffectsToCreate.push({ type, formula: formulaStr })
            }
         }
      })

      if (persistentEffectsToCreate.length > 0 && this.actor) {
         const itemsToCreate = persistentEffectsToCreate.map((eff) => {
            return {
               name: game.i18n.format(
                  "pf2e-aztecs-sundered.effect.persistent-damage.name",
                  { itemName: itemRef.name },
               ),
               type: "effect",
               img: "systems/pf2e/icons/conditions/persistent-damage.webp",
               flags: {
                  "pf2e-aztecs-sundered": {
                     itemId: itemRef.id,
                     formula: eff.formula,
                     type: eff.type,
                     isPersistentDamage: true,
                  },
               },
            }
         })
         await this.actor.createEmbeddedDocuments("Item", itemsToCreate)
      }

      const chatContent = game.i18n.format(
         "pf2e-aztecs-sundered.chat.sunder.content",
         {
            itemName: itemRef.name,
            damage: finalDmgToHp,
            currentHp: newHp,
            maxHp: targetItemData.maximumHp,
         },
      )

      ChatMessage.create({
         user: game.user.id,
         speaker: ChatMessage.getSpeaker({ actor: this.actor || null }),
         content: chatContent,
      })
      this.close()
   }
}
