import {
  DOCTRINE_BRANCHES,
  DoctrineBranchId,
  MEDAL_DEFINITIONS,
  MedalId,
  MEGASTRUCTURE_DEFINITIONS,
  TALENT_DEFINITIONS,
  TalentDefinition,
  WORLD_EVENTS_CATALOG,
} from "@openfront/engine-lib/configuration/HexaFrontSystems";
import { html, nothing } from "lit";
import { customElement, state } from "lit/decorators.js";
import {
  COMMANDER_UPDATED_EVENT,
  commanderStore,
  getCommanderRankTitle,
  MAX_COMMANDER_LEVEL,
  xpRequiredForLevel,
} from "./CommanderStore";
import { BaseModal } from "./components/BaseModal";
import { modalHeader } from "./components/ui/ModalHeader";
import { showToast } from "./Utils";

@customElement("doctrines-modal")
export class DoctrinesModal extends BaseModal {
  protected routerName = "doctrines";

  @state() private currentView: "doctrines" | "events" | "medals" = "doctrines";
  @state() private profile = commanderStore.getProfile();

  private handleCommanderUpdated = () => {
    this.profile = commanderStore.getProfile();
  };

  override connectedCallback() {
    super.connectedCallback();
    window.addEventListener(
      COMMANDER_UPDATED_EVENT,
      this.handleCommanderUpdated,
    );
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener(
      COMMANDER_UPDATED_EVENT,
      this.handleCommanderUpdated,
    );
  }

  protected override renderHeaderSlot() {
    return modalHeader({
      title: "DOCTRINES TACTIQUES & ÉVÉNEMENTS MONDIAUX",
      onBack: () => this.close(),
      ariaLabel: "Retour",
    });
  }

  private handleUpgradeTalent(talent: TalentDefinition) {
    const ok = commanderStore.upgradeTalent(talent.id);
    if (ok) {
      const newRank = commanderStore.getTalentRank(talent.id);
      showToast(
        `${talent.icon} ${talent.name} amélioré au Rang ${newRank}/3 !`,
        "green",
        2000,
      );
    }
  }

  private handleSimulateXp() {
    const res = commanderStore.addXp(550);
    if (res.leveledUp) {
      showToast(
        `🎉 Promotion ! Niveau ${res.newLevel} atteint (+1 Point de Doctrine)`,
        "green",
        2500,
      );
    } else {
      showToast(`⚡ +550 XP Tactique ajoutés au dossier`, "green", 1800);
    }
  }

  private handleResetTalents() {
    commanderStore.resetTalents();
    showToast("🔄 Arbre des Doctrines réinitialisé !", "green", 2000);
  }

  private handlePreset(branch: DoctrineBranchId) {
    commanderStore.applyPresetBranch(branch);
    const info = DOCTRINE_BRANCHES.find((b) => b.id === branch);
    showToast(
      `${info?.icon ?? "⚔️"} Spécialisation ${info?.name ?? ""} appliquée !`,
      "green",
      2000,
    );
  }

  protected override renderBody() {
    const rankInfo = getCommanderRankTitle(this.profile.level);
    const xpNeeded = xpRequiredForLevel(this.profile.level);
    const xpPct =
      this.profile.level >= MAX_COMMANDER_LEVEL
        ? 100
        : Math.min(100, Math.round((this.profile.xp / xpNeeded) * 100));
    const availablePoints = commanderStore.getAvailablePoints();
    const spentPoints = commanderStore.getSpentPoints();

    return html`
      <div class="p-4 sm:p-6 space-y-6 text-slate-100">
        <!-- COMMANDER PROFILE HEADER CARD -->
        <div
          class="relative overflow-hidden rounded-2xl border border-cyan-400/25 bg-slate-900/90 p-5 shadow-xl"
        >
          <div
            class="flex flex-col lg:flex-row lg:items-center justify-between gap-4"
          >
            <!-- Left: Rank & Level -->
            <div class="flex items-center gap-4">
              <div
                class="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-cyan-400/40 bg-cyan-500/10 text-3xl shadow-inner"
              >
                ${rankInfo.badge}
              </div>
              <div>
                <div class="flex items-center gap-2 flex-wrap">
                  <span
                    class="rounded-full bg-cyan-500/20 border border-cyan-400/40 px-2.5 py-0.5 text-xs font-extrabold uppercase tracking-wider text-cyan-300"
                  >
                    NIVEAU ${this.profile.level}
                  </span>
                  <span
                    class="text-sm font-bold uppercase tracking-widest"
                    style="color: ${rankInfo.color}"
                  >
                    ${rankInfo.title}
                  </span>
                </div>
                <h2 class="mt-1 text-xl font-black tracking-tight text-white">
                  Quartier Général de Commandement BorderConflict
                </h2>
                <div class="mt-2 w-full max-w-md">
                  <div class="flex justify-between text-xs text-slate-300 mb-1">
                    <span
                      >Expérience de Compte :
                      <strong class="text-cyan-300">${this.profile.xp}</strong>
                      / ${xpNeeded} XP</span
                    >
                    <span class="font-bold text-cyan-400">${xpPct}%</span>
                  </div>
                  <div
                    class="h-2.5 w-full overflow-hidden rounded-full bg-slate-800 border border-white/10"
                  >
                    <div
                      class="h-full bg-gradient-to-r from-cyan-400 via-sky-500 to-indigo-500 transition-all duration-300"
                      style="width: ${xpPct}%"
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Right: Doctrine Points & Actions -->
            <div class="flex flex-wrap items-center gap-3">
              <div
                class="flex items-center gap-3 rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-2.5"
              >
                <span class="text-2xl">💠</span>
                <div>
                  <div
                    class="text-[11px] font-bold uppercase tracking-wider text-amber-300/90"
                  >
                    Points de Doctrine
                  </div>
                  <div class="text-lg font-black text-white">
                    <span class="text-amber-400">${availablePoints}</span>
                    disponibles
                    <span class="text-xs font-normal text-slate-400"
                      >(${spentPoints} investis)</span
                    >
                  </div>
                </div>
              </div>

              <button
                type="button"
                @click=${this.handleResetTalents}
                ?disabled=${spentPoints === 0}
                class="cursor-pointer rounded-xl border border-rose-400/30 bg-rose-500/15 hover:bg-rose-500/25 disabled:opacity-40 px-3.5 py-2.5 text-xs font-extrabold uppercase tracking-wider text-rose-200 transition-all active:scale-95"
              >
                🔄 Réinitialiser
              </button>
            </div>
          </div>
        </div>

        <!-- NAVIGATION TABS -->
        <div class="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
          <div class="flex flex-wrap gap-2">
            <button
              type="button"
              @click=${() => (this.currentView = "doctrines")}
              class="cursor-pointer rounded-xl px-4 py-2.5 text-xs sm:text-sm font-extrabold uppercase tracking-wider transition-all ${this
                .currentView === "doctrines"
                ? "bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/25"
                : "bg-slate-800/80 text-slate-300 hover:bg-slate-700/80"}"
            >
              🌳 Arbre de Talents (${spentPoints}/${this.profile.level})
            </button>
            <button
              type="button"
              @click=${() => (this.currentView = "events")}
              class="cursor-pointer rounded-xl px-4 py-2.5 text-xs sm:text-sm font-extrabold uppercase tracking-wider transition-all ${this
                .currentView === "events"
                ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/25"
                : "bg-slate-800/80 text-slate-300 hover:bg-slate-700/80"}"
            >
              🌍 Événements Mondiaux (${WORLD_EVENTS_CATALOG.length})
            </button>
            <button
              type="button"
              @click=${() => (this.currentView = "medals")}
              class="cursor-pointer rounded-xl px-4 py-2.5 text-xs sm:text-sm font-extrabold uppercase tracking-wider transition-all ${this
                .currentView === "medals"
                ? "bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/25"
                : "bg-slate-800/80 text-slate-300 hover:bg-slate-700/80"}"
            >
              🎖️ Médailles & Mégastructures (${this.profile.unlockedMedals.length}/${MEDAL_DEFINITIONS.length})
            </button>
          </div>

          ${this.currentView === "doctrines"
            ? html`
                <div class="flex items-center gap-1.5 flex-wrap">
                  <span class="text-xs text-slate-400 mr-1 font-semibold"
                    >Presets rapides :</span
                  >
                  ${DOCTRINE_BRANCHES.map(
                    (b) => html`
                      <button
                        type="button"
                        @click=${() => this.handlePreset(b.id)}
                        class="cursor-pointer rounded-lg border border-white/10 bg-slate-800/90 hover:bg-slate-700 px-2.5 py-1 text-xs font-bold text-slate-200 transition-colors"
                      >
                        ${b.icon} ${b.name}
                      </button>
                    `,
                  )}
                </div>
              `
            : nothing}
        </div>

        ${this.currentView === "doctrines"
          ? this.renderDoctrineTree(availablePoints)
          : this.currentView === "events"
            ? this.renderWorldEventsCatalog()
            : this.renderMedalsAndMegastructures()}
      </div>
    `;
  }

  private renderDoctrineTree(availablePoints: number) {
    const mods = commanderStore.getActiveModifiers();

    return html`
      <!-- 4-BRANCH TALENT GRID -->
      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        ${DOCTRINE_BRANCHES.map((branch) => {
          const talents = TALENT_DEFINITIONS.filter(
            (t) => t.branch === branch.id,
          ).sort((a, b) => a.tier - b.tier);

          const branchPoints = talents.reduce(
            (acc, t) => acc + commanderStore.getTalentRank(t.id),
            0,
          );

          return html`
            <div
              class="flex flex-col rounded-2xl border border-white/10 bg-slate-900/75 p-4 shadow-lg"
              style="border-top: 3px solid ${branch.accentHex}"
            >
              <!-- Branch Header -->
              <div class="mb-4 flex items-start justify-between">
                <div>
                  <div class="flex items-center gap-2">
                    <span class="text-2xl">${branch.icon}</span>
                    <h3 class="text-base font-black uppercase tracking-wide text-white">
                      ${branch.name}
                    </h3>
                  </div>
                  <p class="mt-1 text-xs text-slate-400 leading-snug">
                    ${branch.subtitle}
                  </p>
                </div>
                <span
                  class="rounded-lg bg-white/5 border border-white/10 px-2 py-0.5 text-xs font-extrabold"
                  style="color: ${branch.accentHex}"
                >
                  ${branchPoints}/9
                </span>
              </div>

              <!-- Branch Talents (Tiers 1 -> 2 -> 3) -->
              <div class="space-y-3 flex-1">
                ${talents.map((talent, idx) => {
                  const rank = commanderStore.getTalentRank(talent.id);
                  const unlocked = commanderStore.canUnlockTalent(talent.id);
                  const canUpgrade =
                    unlocked && rank < talent.maxRank && availablePoints > 0;
                  const isMaxed = rank >= talent.maxRank;

                  return html`
                    ${idx > 0
                      ? html`
                          <div class="flex justify-center -my-1">
                            <div
                              class="h-3 w-0.5 ${unlocked
                                ? "bg-cyan-400"
                                : "bg-slate-700"}"
                            ></div>
                          </div>
                        `
                      : nothing}
                    <div
                      class="relative rounded-xl border p-3.5 transition-all ${isMaxed
                        ? "border-amber-400/50 bg-amber-500/10"
                        : rank > 0
                          ? "border-cyan-400/50 bg-cyan-500/10"
                          : unlocked
                            ? "border-white/15 bg-slate-800/75 hover:border-white/30"
                            : "border-white/5 bg-slate-950/60 opacity-55"}"
                    >
                      <div class="flex items-start justify-between gap-2">
                        <div class="flex items-center gap-2.5">
                          <div
                            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-slate-900 text-xl"
                          >
                            ${talent.icon}
                          </div>
                          <div>
                            <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              Palier ${talent.tier}
                            </div>
                            <div class="text-sm font-extrabold text-white">
                              ${talent.name}
                            </div>
                          </div>
                        </div>

                        <!-- Rank Pips -->
                        <div class="flex items-center gap-1">
                          ${[1, 2, 3].map(
                            (pip) => html`
                              <span
                                class="h-2.5 w-2.5 rounded-full border ${rank >=
                                pip
                                  ? "bg-cyan-400 border-cyan-200 shadow-sm shadow-cyan-400"
                                  : "bg-slate-800 border-slate-600"}"
                              ></span>
                            `,
                          )}
                        </div>
                      </div>

                      <p class="mt-2 text-xs text-slate-300 leading-relaxed">
                        ${rank > 0
                          ? talent.rankDescriptions[rank - 1]
                          : talent.shortDesc}
                      </p>

                      ${rank > 0 && rank < 3
                        ? html`
                            <div class="mt-1 text-[11px] text-cyan-300/90">
                              Prochain rang : ${talent.rankDescriptions[rank]}
                            </div>
                          `
                        : nothing}

                      <div class="mt-3 flex items-center justify-between">
                        <span class="text-[11px] font-bold text-slate-400">
                          Rang ${rank} / ${talent.maxRank}
                        </span>
                        ${isMaxed
                          ? html`
                              <span
                                class="rounded-lg bg-amber-500/20 border border-amber-400/40 px-2.5 py-1 text-[11px] font-extrabold uppercase text-amber-300"
                              >
                                ★ Maîtrisé
                              </span>
                            `
                          : html`
                              <button
                                type="button"
                                ?disabled=${!canUpgrade}
                                @click=${() => this.handleUpgradeTalent(talent)}
                                class="cursor-pointer rounded-lg px-3 py-1 text-xs font-extrabold uppercase tracking-wider transition-all ${canUpgrade
                                  ? "bg-cyan-500 text-slate-950 hover:bg-cyan-400 shadow-md shadow-cyan-500/20"
                                  : "bg-slate-800 text-slate-500 cursor-not-allowed"}"
                              >
                                ${!unlocked
                                  ? "🔒 Verrouillé"
                                  : availablePoints <= 0
                                    ? "0 Point"
                                    : "+ Améliorer"}
                              </button>
                            `}
                      </div>
                    </div>
                  `;
                })}
              </div>
            </div>
          `;
        })}
      </div>

      <!-- ACTIVE DOCTRINE SUMMARY BAR -->
      <div
        class="rounded-2xl border border-white/10 bg-slate-900/90 p-4 flex flex-wrap items-center justify-between gap-3"
      >
        <div class="text-xs font-extrabold uppercase tracking-wider text-cyan-400">
          ⚡ Micro-Bonus Tactiques Actifs (Équilibrés Compétitif) :
        </div>
        <div class="flex flex-wrap gap-2 text-xs">
          <span class="rounded-lg bg-slate-800 px-2.5 py-1 text-slate-200">
            ⚔️ Vitesse d'attaque :
            <strong class="text-cyan-300"
              >+${Number(((mods.attackSpeedMult - 1) * 100).toFixed(1))}%</strong
            >
          </span>
          <span class="rounded-lg bg-slate-800 px-2.5 py-1 text-slate-200">
            🚩 Troupes départ :
            <strong class="text-cyan-300"
              >+${Number(((mods.startManpowerMult - 1) * 100).toFixed(1))}%</strong
            >
          </span>
          <span class="rounded-lg bg-slate-800 px-2.5 py-1 text-slate-200">
            🏰 Puissance Défense :
            <strong class="text-cyan-300"
              >+${Number(((mods.defensePostStrengthMult - 1) * 100).toFixed(1))}%</strong
            >
          </span>
          <span class="rounded-lg bg-slate-800 px-2.5 py-1 text-slate-200">
            🚢 Or Commercial :
            <strong class="text-amber-300"
              >+${Number(((mods.tradeAndTrainGoldMult - 1) * 100).toFixed(1))}%</strong
            >
          </span>
          <span class="rounded-lg bg-slate-800 px-2.5 py-1 text-slate-200">
            🏙️ Capacité Villes :
            <strong class="text-amber-300"
              >+${Number(((mods.cityCapacityMult - 1) * 100).toFixed(1))}%</strong
            >
          </span>
          <span class="rounded-lg bg-slate-800 px-2.5 py-1 text-slate-200">
            ☢️ Coût Silos/Bombes :
            <strong class="text-purple-300"
              >-${Number(((1 - mods.nukeAndSiloCostMult) * 100).toFixed(1))}%</strong
            >
          </span>
        </div>
      </div>
    `;
  }

  private renderWorldEventsCatalog() {
    return html`
      <div class="space-y-4">
        <div
          class="rounded-2xl border border-indigo-400/30 bg-indigo-950/30 p-4 text-xs sm:text-sm text-indigo-100 leading-relaxed"
        >
          <strong class="text-indigo-300 uppercase tracking-wider"
            >🌍 Système d'Événements Mondiaux Dynamiques :</strong
          >
          Au cours de chaque partie, le monde de BorderConflict traverse des crises
          géopolitiques, économiques et climatiques déterministes. Un
          <strong>radar prévisionnel vous avertit 10 secondes avant</strong>
          chaque événement, et l'intensité augmente avec le
          <strong>Niveau de Tension Mondiale (I → II → III)</strong> !
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          ${WORLD_EVENTS_CATALOG.map(
            (ev) => html`
              <div
                class="rounded-2xl border border-white/10 bg-slate-900/80 p-4 shadow-md flex flex-col justify-between"
                style="border-left: 4px solid ${ev.accentColor}"
              >
                <div>
                  <div class="flex items-start justify-between gap-2">
                    <div class="flex items-center gap-2.5">
                      <span class="text-2xl">${ev.icon}</span>
                      <div>
                        <span
                          class="text-[10px] font-extrabold uppercase tracking-widest"
                          style="color: ${ev.accentColor}"
                        >
                          ${ev.categoryLabel}
                        </span>
                        <h4 class="text-base font-black text-white">
                          ${ev.name}
                        </h4>
                      </div>
                    </div>
                    <span
                      class="rounded-md bg-white/5 border border-white/10 px-2 py-0.5 text-[10px] font-bold text-slate-300"
                    >
                      Tension Min. ${ev.minEscalationTier}
                    </span>
                  </div>

                  <p class="mt-2 text-xs text-slate-300 leading-relaxed">
                    ${ev.lore}
                  </p>

                  <div class="mt-3 flex flex-wrap gap-1.5">
                    ${ev.modifierBadges.map(
                      (badge) => html`
                        <span
                          class="rounded-lg bg-slate-800 border border-white/10 px-2.5 py-1 text-[11px] font-bold text-cyan-200"
                        >
                          ${badge}
                        </span>
                      `,
                    )}
                  </div>
                </div>

                <div class="mt-3 pt-2.5 border-t border-white/10 space-y-1">
                  ${ev.pulseDescription
                    ? html`
                        <div class="text-[11px] font-bold text-amber-300">
                          ⚡ Impulsion (5s) : ${ev.pulseDescription}
                        </div>
                      `
                    : nothing}
                  <div class="text-[11px] text-slate-400 italic">
                    💡 Conseil : ${ev.strategicTip}
                  </div>
                </div>
              </div>
            `,
          )}
        </div>
      </div>
    `;
  }

  private handleEquipMedal(medalId: MedalId) {
    const next =
      this.profile.equippedMedal === medalId ? null : medalId;
    commanderStore.equipMedal(next);
    if (next) {
      const def = MEDAL_DEFINITIONS.find((m) => m.id === next);
      showToast(`🎖️ Médaille équipée : ${def?.name ?? ""}`, "green", 2000);
    } else {
      showToast("Médaille déséquipée", "green", 1500);
    }
  }

  private renderMedalsAndMegastructures() {
    const p = this.profile;

    return html`
      <div class="space-y-6">
        <!-- CAREER STATS STRIP -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div class="rounded-xl border border-cyan-500/25 bg-slate-900/90 p-3.5 text-center">
            <div class="text-2xl font-black text-cyan-300">${p.victories}</div>
            <div class="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              🏆 Victoires
            </div>
          </div>
          <div class="rounded-xl border border-indigo-500/25 bg-slate-900/90 p-3.5 text-center">
            <div class="text-2xl font-black text-indigo-300">${p.gamesPlayed}</div>
            <div class="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              ⚔️ Parties Jouées
            </div>
          </div>
          <div class="rounded-xl border border-emerald-500/25 bg-slate-900/90 p-3.5 text-center">
            <div class="text-2xl font-black text-emerald-300">
              ${p.directivesCompleted}
            </div>
            <div class="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              🎯 Directives Accomplies
            </div>
          </div>
          <div class="rounded-xl border border-amber-500/25 bg-slate-900/90 p-3.5 text-center">
            <div class="text-2xl font-black text-amber-300">
              ${p.worldEventsSurvived}
            </div>
            <div class="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              🌪️ Crises Survécues
            </div>
          </div>
        </div>

        <!-- STRATEGIC MEGASTRUCTURES SECTION -->
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="text-sm sm:text-base font-black uppercase tracking-wider text-amber-300">
              🏛️ Mégastructures de Suprématie (Actives en Partie)
            </h3>
            <span class="text-xs text-slate-400">
              S'activent automatiquement dès que vous atteignez le seuil de bâtiments en partie
            </span>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-3">
            ${MEGASTRUCTURE_DEFINITIONS.map(
              (m) => html`
                <div
                  class="rounded-xl border border-white/10 bg-slate-900/85 p-3.5 flex flex-col justify-between"
                  style="border-top: 3px solid ${m.accentColor}"
                >
                  <div>
                    <div class="flex items-center gap-2">
                      <span class="text-2xl">${m.icon}</span>
                      <div class="text-xs font-black uppercase text-white leading-tight">
                        ${m.name}
                      </div>
                    </div>
                    <div class="mt-2 text-[11px] font-semibold text-slate-300">
                      Condition : <span class="text-white">${m.requirementDesc}</span>
                    </div>
                  </div>
                  <div class="mt-2.5 pt-2 border-t border-white/10 text-[11px] font-bold text-cyan-300">
                    ⚡ ${m.effectDesc}
                  </div>
                </div>
              `,
            )}
          </div>
        </div>

        <!-- WAR MEDALS & ACHIEVEMENTS SECTION -->
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="text-sm sm:text-base font-black uppercase tracking-wider text-cyan-300">
              🎖️ Médailles de Guerre & Hauts Faits (${p.unlockedMedals.length}/${MEDAL_DEFINITIONS.length})
            </h3>
            <span class="text-xs text-slate-400">
              Cliquez sur une médaille débloquée pour l'afficher sur votre bannière d'accueil
            </span>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            ${MEDAL_DEFINITIONS.map((medal) => {
              const unlocked = p.unlockedMedals.includes(medal.id);
              const equipped = p.equippedMedal === medal.id;
              return html`
                <div
                  class="rounded-xl border p-3.5 transition-all flex flex-col justify-between ${equipped
                    ? "border-amber-400 bg-amber-500/15 shadow-[0_0_20px_rgba(245,158,11,0.25)]"
                    : unlocked
                      ? "border-cyan-400/40 bg-slate-900/90 hover:border-cyan-300"
                      : "border-white/10 bg-slate-950/70 opacity-60"}"
                >
                  <div>
                    <div class="flex items-start justify-between gap-2">
                      <div class="flex items-center gap-2.5">
                        <div
                          class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-slate-900 text-2xl"
                        >
                          ${medal.icon}
                        </div>
                        <div>
                          <span
                            class="text-[10px] font-black uppercase tracking-wider"
                            style="color: ${medal.rarityColor}"
                          >
                            ● ${medal.rarity}
                          </span>
                          <div class="text-sm font-black text-white">
                            ${medal.name}
                          </div>
                        </div>
                      </div>
                      <span
                        class="rounded-md bg-cyan-500/15 border border-cyan-400/30 px-2 py-0.5 text-[10px] font-extrabold text-cyan-300"
                      >
                        +${medal.xpBonus} XP
                      </span>
                    </div>
                    <p class="mt-2 text-xs text-slate-300 leading-relaxed">
                      ${medal.description}
                    </p>
                  </div>

                  <div class="mt-3 pt-2 border-t border-white/10 flex items-center justify-between">
                    <span
                      class="text-[11px] font-bold ${unlocked
                        ? "text-emerald-400"
                        : "text-slate-500"}"
                    >
                      ${unlocked ? "✅ Débloquée" : "🔒 Verrouillée"}
                    </span>
                    ${unlocked
                      ? html`
                          <button
                            type="button"
                            @click=${() => this.handleEquipMedal(medal.id)}
                            class="cursor-pointer rounded-lg px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wider transition-all ${equipped
                              ? "bg-amber-400 text-slate-950"
                              : "bg-slate-800 hover:bg-cyan-500/25 text-cyan-200 border border-cyan-400/30"}"
                          >
                            ${equipped ? "★ Équipée" : "Équiper"}
                          </button>
                        `
                      : nothing}
                  </div>
                </div>
              `;
            })}
          </div>
        </div>
      </div>
    `;
  }
}
