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

  private handleOpenMedalsTab = () => {
    this.currentView = "medals";
  };

  private handleOpenTalentsTab = () => {
    this.currentView = "doctrines";
  };

  override connectedCallback() {
    super.connectedCallback();
    window.addEventListener(
      COMMANDER_UPDATED_EVENT,
      this.handleCommanderUpdated,
    );
    window.addEventListener("open-medals-tab", this.handleOpenMedalsTab);
    window.addEventListener("open-talents-tab", this.handleOpenTalentsTab);
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener(
      COMMANDER_UPDATED_EVENT,
      this.handleCommanderUpdated,
    );
    window.removeEventListener("open-medals-tab", this.handleOpenMedalsTab);
    window.removeEventListener("open-talents-tab", this.handleOpenTalentsTab);
  }

  protected override renderHeaderSlot() {
    return modalHeader({
      title: "TALENTS TACTIQUES & MÉDAILLES DE GUERRE",
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
        `🎉 Promotion ! Niveau ${res.newLevel} atteint (+1 Point de Talent)`,
        "green",
        2500,
      );
    } else {
      showToast(`⚡ +550 XP Tactique ajoutés au dossier`, "green", 1800);
    }
  }

  private handleResetTalents() {
    commanderStore.resetTalents();
    showToast("🔄 Arbre des Talents réinitialisé !", "green", 2000);
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
      <div class="p-4 sm:p-6 space-y-6 text-[#cbd5e1]">
        <!-- COMMANDER PROFILE HEADER CARD -->
        <div
          class="relative overflow-hidden rounded-xl border-2 border-[#2b3a2d] bg-[#121813] p-4 sm:p-5 shadow-[0_4px_16px_rgba(0,0,0,0.6)]"
        >
          <div
            class="flex flex-col lg:flex-row lg:items-center justify-between gap-4"
          >
            <!-- Left: Rank & Level -->
            <div class="flex items-center gap-4">
              <div
                class="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border-2 border-[#3b4e3e] bg-[#18231a] text-3xl shadow-inner"
              >
                ${rankInfo.badge}
              </div>
              <div>
                <div class="flex items-center gap-2 flex-wrap">
                  <span
                    class="rounded bg-[#1a291d] border border-[#4ade80]/40 px-2 py-0.5 text-xs font-mono font-bold uppercase tracking-wider text-[#4ade80]"
                  >
                    NIVEAU ${this.profile.level}
                  </span>
                  <span
                    class="text-xs sm:text-sm font-mono font-bold uppercase tracking-wider text-amber-300"
                  >
                    ${rankInfo.title}
                  </span>
                </div>
                <h2
                  class="mt-1 text-base sm:text-lg font-mono font-bold tracking-tight text-white"
                >
                  CENTRE DE COMMANDEMENT DES TALENTS
                </h2>
                <div class="mt-2 w-full max-w-md">
                  <div
                    class="flex justify-between text-xs font-mono text-[#8fa382] mb-1"
                  >
                    <span
                      >XP :
                      <strong class="text-amber-300">${this.profile.xp}</strong>
                      / ${xpNeeded} XP</span
                    >
                    <span class="font-bold text-[#4ade80]">${xpPct}%</span>
                  </div>
                  <div
                    class="h-2.5 w-full overflow-hidden rounded bg-[#0b100c] border border-[#2b3a2d]"
                  >
                    <div
                      class="h-full bg-gradient-to-r from-[#166534] via-[#22c55e] to-[#4ade80] transition-all duration-300"
                      style="width: ${xpPct}%"
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Right: Talent Points & Actions -->
            <div class="flex flex-wrap items-center gap-3">
              <div
                class="flex items-center gap-3 rounded-lg border-2 border-amber-500/40 bg-[#211a0a] px-3.5 py-2 shadow-inner"
              >
                <span class="text-2xl">⚡</span>
                <div>
                  <div
                    class="text-[11px] font-mono font-bold uppercase tracking-wider text-amber-400"
                  >
                    POINTS DE TALENT
                  </div>
                  <div class="text-base font-mono font-bold text-white">
                    <span class="text-amber-300">${availablePoints}</span>
                    <span class="text-xs font-normal text-amber-200/70"
                      >DISPONIBLES</span
                    >
                    <span class="text-[10px] font-normal text-[#8fa382]"
                      >(${spentPoints} investis)</span
                    >
                  </div>
                </div>
              </div>

              <button
                type="button"
                @click=${this.handleResetTalents}
                ?disabled=${spentPoints === 0}
                class="retro-metal-btn cursor-pointer rounded border border-[#ef4444]/40 hover:border-[#ef4444] disabled:opacity-40 px-3 py-2 text-[11px] font-mono font-bold uppercase tracking-wider text-rose-300 transition-all active:scale-95"
              >
                🔄 RÉINITIALISER
              </button>
            </div>
          </div>
        </div>

        <!-- NAVIGATION TABS -->
        <div
          class="flex flex-wrap items-center justify-between gap-3 border-b-2 border-[#2b3a2d] pb-3"
        >
          <div class="flex flex-wrap gap-2">
            <button
              type="button"
              @click=${() => (this.currentView = "doctrines")}
              class="retro-metal-btn cursor-pointer rounded px-3 py-1.5 text-xs font-mono font-bold uppercase tracking-tight whitespace-nowrap transition-all ${this
                .currentView === "doctrines"
                ? "ring-2 ring-amber-400 text-amber-200 brightness-110 shadow-[0_0_10px_rgba(245,158,11,0.4)]"
                : "text-[#8fa382] hover:text-white"}"
            >
              🌳 ARBRE TALENTS (${spentPoints}/${this.profile.level})
            </button>
            <button
              type="button"
              @click=${() => (this.currentView = "events")}
              class="retro-metal-btn cursor-pointer rounded px-3 py-1.5 text-xs font-mono font-bold uppercase tracking-tight whitespace-nowrap transition-all ${this
                .currentView === "events"
                ? "ring-2 ring-amber-400 text-amber-200 brightness-110 shadow-[0_0_10px_rgba(245,158,11,0.4)]"
                : "text-[#8fa382] hover:text-white"}"
            >
              🌍 ÉVÉNEMENTS (${WORLD_EVENTS_CATALOG.length})
            </button>
            <button
              type="button"
              @click=${() => (this.currentView = "medals")}
              class="retro-metal-btn cursor-pointer rounded px-3 py-1.5 text-xs font-mono font-bold uppercase tracking-tight whitespace-nowrap transition-all ${this
                .currentView === "medals"
                ? "ring-2 ring-amber-400 text-amber-200 brightness-110 shadow-[0_0_10px_rgba(245,158,11,0.4)]"
                : "text-[#8fa382] hover:text-white"}"
            >
              🎖️ MÉDAILLES & MEGASTRUCTURES
              (${this.profile.unlockedMedals
                .length}/${MEDAL_DEFINITIONS.length})
            </button>
          </div>

          ${this.currentView === "doctrines"
            ? html`
                <div class="flex items-center gap-1.5 flex-wrap">
                  <span
                    class="text-[11px] font-mono text-[#8fa382] mr-1 uppercase"
                    >Presets :</span
                  >
                  ${DOCTRINE_BRANCHES.map(
                    (b) => html`
                      <button
                        type="button"
                        @click=${() => this.handlePreset(b.id)}
                        class="retro-metal-btn cursor-pointer rounded px-2 py-1 text-[11px] font-mono font-bold text-amber-200/90 hover:text-amber-100 transition-colors whitespace-nowrap"
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
      <!-- 2x2 BRANCH TALENT GRID (Spacious 2 Columns) -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
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
              class="flex flex-col rounded-xl border-2 border-[#2b3a2d] bg-[#141d16] p-4 shadow-xl"
              style="border-top: 4px solid ${branch.accentHex}"
            >
              <!-- Branch Header -->
              <div
                class="mb-2 flex items-center justify-between gap-3 border-b border-[#2b3a2d] pb-2.5"
              >
                <div class="flex items-center gap-2.5 min-w-0">
                  <span class="text-2xl shrink-0">${branch.icon}</span>
                  <h3
                    class="text-sm sm:text-base font-bold uppercase tracking-wider text-white font-mono whitespace-nowrap"
                  >
                    ${branch.name}
                  </h3>
                </div>
                <span
                  class="shrink-0 rounded bg-[#0c120d] border border-[#3b4c3d] px-2.5 py-1 text-xs font-mono font-bold text-amber-300 shadow-inner"
                >
                  ${branchPoints} / 9
                </span>
              </div>
              <p class="mb-3.5 text-xs text-[#8fa382] font-mono leading-snug">
                ${branch.subtitle}
              </p>

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
                                ? "bg-[#22c55e]"
                                : "bg-[#2b3a2d]"}"
                            ></div>
                          </div>
                        `
                      : nothing}
                    <div
                      class="relative rounded-lg border-2 p-3 transition-all ${isMaxed
                        ? "border-amber-400/60 bg-[#242111]"
                        : rank > 0
                          ? "border-[#22c55e]/60 bg-[#162519]"
                          : unlocked
                            ? "border-[#2b3a2d] bg-[#18231a] hover:border-[#3d5240]"
                            : "border-[#1e271f] bg-[#0f1510] opacity-50"}"
                    >
                      <div class="flex items-start justify-between gap-2">
                        <div class="flex items-center gap-2.5 min-w-0 flex-1">
                          <div
                            class="flex h-9 w-9 shrink-0 items-center justify-center rounded border border-[#2b3a2d] bg-[#0c120d] text-lg"
                          >
                            ${talent.icon}
                          </div>
                          <div class="min-w-0 flex-1">
                            <div
                              class="text-[9.5px] font-mono font-bold uppercase tracking-wider text-[#8fa382]"
                            >
                              PALIER ${talent.tier}
                            </div>
                            <div
                              class="text-[12px] sm:text-[13px] font-mono font-bold text-white leading-tight break-words"
                            >
                              ${talent.name}
                            </div>
                          </div>
                        </div>

                        <!-- Rank Pips -->
                        <div class="flex items-center gap-1 shrink-0 pt-1">
                          ${[1, 2, 3].map(
                            (pip) => html`
                              <span
                                class="h-2 w-2 rounded-full border ${rank >= pip
                                  ? "bg-[#22c55e] border-[#86efac] shadow-[0_0_6px_rgba(34,197,94,0.8)]"
                                  : "bg-[#141d16] border-[#2b3a2d]"}"
                              ></span>
                            `,
                          )}
                        </div>
                      </div>

                      <p
                        class="mt-2 text-[11px] font-mono text-[#cbd5e1] leading-relaxed"
                      >
                        ${rank > 0
                          ? talent.rankDescriptions[rank - 1]
                          : talent.shortDesc}
                      </p>

                      ${rank > 0 && rank < 3
                        ? html`
                            <div
                              class="mt-1.5 text-[10.5px] font-mono font-bold text-[#4ade80] leading-snug"
                            >
                              SUIVANT : ${talent.rankDescriptions[rank]}
                            </div>
                          `
                        : nothing}

                      <div
                        class="mt-3 flex items-center justify-between gap-2 pt-2 border-t border-[#202c22]"
                      >
                        <span
                          class="text-[10.5px] font-mono font-bold text-[#8fa382]"
                        >
                          RANG ${rank} / ${talent.maxRank}
                        </span>
                        ${isMaxed
                          ? html`
                              <span
                                class="rounded bg-amber-500/20 border border-amber-400/40 px-2 py-0.5 text-[10px] font-mono font-bold uppercase text-amber-300"
                              >
                                ★ MAÎTRISÉ
                              </span>
                            `
                          : html`
                              <button
                                type="button"
                                ?disabled=${!canUpgrade}
                                @click=${() => this.handleUpgradeTalent(talent)}
                                class="retro-metal-btn cursor-pointer rounded px-2.5 py-1 text-[10.5px] font-mono font-bold uppercase tracking-wider transition-all ${canUpgrade
                                  ? "text-amber-300 hover:text-white border-amber-400/50"
                                  : "text-[#556758] border-[#202b22] opacity-50 cursor-not-allowed"}"
                              >
                                ${!unlocked
                                  ? "🔒 BLOQUÉ"
                                  : availablePoints <= 0
                                    ? "0 POINT"
                                    : "+ AMÉLIORER"}
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
        class="rounded-xl border-2 border-[#2b3a2d] bg-[#121813] p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-lg"
      >
        <div
          class="text-xs font-mono font-bold uppercase tracking-wider text-amber-300"
        >
          ⚡ BONUS TACTIQUES ACTIFS (COMMANDEMENT) :
        </div>
        <div class="flex flex-wrap gap-2 text-xs">
          <span
            class="rounded border border-[#2b3a2d] bg-[#18231a] px-2.5 py-1 text-[#cbd5e1] font-mono"
          >
            ⚔️ ATTAQUE :
            <strong class="text-[#4ade80]"
              >+${Number(
                ((mods.attackSpeedMult - 1) * 100).toFixed(1),
              )}%</strong
            >
          </span>
          <span
            class="rounded border border-[#2b3a2d] bg-[#18231a] px-2.5 py-1 text-[#cbd5e1] font-mono"
          >
            🚩 DÉPART :
            <strong class="text-[#4ade80]"
              >+${Number(
                ((mods.startManpowerMult - 1) * 100).toFixed(1),
              )}%</strong
            >
          </span>
          <span
            class="rounded border border-[#2b3a2d] bg-[#18231a] px-2.5 py-1 text-[#cbd5e1] font-mono"
          >
            🏰 DÉFENSE :
            <strong class="text-[#4ade80]"
              >+${Number(
                ((mods.defensePostStrengthMult - 1) * 100).toFixed(1),
              )}%</strong
            >
          </span>
          <span
            class="rounded border border-[#2b3a2d] bg-[#18231a] px-2.5 py-1 text-[#cbd5e1] font-mono"
          >
            🚢 COMMERCE :
            <strong class="text-amber-300"
              >+${Number(
                ((mods.tradeAndTrainGoldMult - 1) * 100).toFixed(1),
              )}%</strong
            >
          </span>
          <span
            class="rounded border border-[#2b3a2d] bg-[#18231a] px-2.5 py-1 text-[#cbd5e1] font-mono"
          >
            🏙️ CAPACITÉ :
            <strong class="text-amber-300"
              >+${Number(
                ((mods.cityCapacityMult - 1) * 100).toFixed(1),
              )}%</strong
            >
          </span>
          <span
            class="rounded border border-[#2b3a2d] bg-[#18231a] px-2.5 py-1 text-[#cbd5e1] font-mono"
          >
            ☢️ SILOS/BOMBES :
            <strong class="text-purple-300"
              >-${Number(
                ((1 - mods.nukeAndSiloCostMult) * 100).toFixed(1),
              )}%</strong
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
          class="rounded-xl border-2 border-[#2b3a2d] bg-[#141d16] p-4 text-xs font-mono text-[#cbd5e1] leading-relaxed shadow-lg"
        >
          <strong
            class="text-amber-300 font-mono font-bold uppercase tracking-wider block mb-1"
            >🌍 SYSTÈME D'ÉVÉNEMENTS MONDIAUX DYNAMIQUES :</strong
          >
          Au cours de chaque partie, le monde traverse des crises géopolitiques,
          économiques et climatiques déterministes. Un
          <strong>radar prévisionnel vous avertit 10 secondes avant</strong>
          chaque événement, et l'intensité augmente avec le
          <strong>Niveau de Tension Mondiale (I → II → III)</strong> !
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          ${WORLD_EVENTS_CATALOG.map(
            (ev) => html`
              <div
                class="rounded-xl border-2 border-[#2b3a2d] bg-[#141d16] p-4 shadow-md flex flex-col justify-between"
                style="border-left: 4px solid ${ev.accentColor}"
              >
                <div>
                  <div class="flex items-start justify-between gap-2">
                    <div class="flex items-center gap-2.5 min-w-0 flex-1">
                      <span class="text-2xl shrink-0">${ev.icon}</span>
                      <div class="min-w-0 flex-1">
                        <span
                          class="text-[10px] font-mono font-bold uppercase tracking-widest"
                          style="color: ${ev.accentColor}"
                        >
                          ${ev.categoryLabel}
                        </span>
                        <h4
                          class="text-xs sm:text-sm font-mono font-bold text-white truncate"
                        >
                          ${ev.name}
                        </h4>
                      </div>
                    </div>
                    <span
                      class="shrink-0 rounded bg-[#0c120d] border border-[#2b3a2d] px-2 py-0.5 text-[10px] font-mono text-[#8fa382]"
                    >
                      TENSION MIN. ${ev.minEscalationTier}
                    </span>
                  </div>

                  <p
                    class="mt-2 text-xs font-mono text-[#cbd5e1] leading-relaxed"
                  >
                    ${ev.lore}
                  </p>

                  <div class="mt-3 flex flex-wrap gap-1.5">
                    ${ev.modifierBadges.map(
                      (badge) => html`
                        <span
                          class="rounded border border-[#2b3a2d] bg-[#18231a] px-2 py-0.5 text-[10.5px] font-mono font-bold text-[#4ade80]"
                        >
                          ${badge}
                        </span>
                      `,
                    )}
                  </div>
                </div>

                <div class="mt-3 pt-2.5 border-t border-[#2b3a2d] space-y-1">
                  ${ev.pulseDescription
                    ? html`
                        <div
                          class="text-[11px] font-mono font-bold text-amber-300"
                        >
                          ⚡ IMPULSION (5s) : ${ev.pulseDescription}
                        </div>
                      `
                    : nothing}
                  <div class="text-[11px] font-mono text-[#8fa382] italic">
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
    const next = this.profile.equippedMedal === medalId ? null : medalId;
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
          <div
            class="rounded-xl border-2 border-[#2b3a2d] bg-[#141d16] p-3 text-center"
          >
            <div class="text-xl sm:text-2xl font-mono font-bold text-[#4ade80]">
              ${p.victories}
            </div>
            <div
              class="text-[10px] sm:text-[11px] font-mono font-bold uppercase tracking-wider text-[#8fa382] mt-1"
            >
              🏆 VICTOIRES
            </div>
          </div>
          <div
            class="rounded-xl border-2 border-[#2b3a2d] bg-[#141d16] p-3 text-center"
          >
            <div class="text-xl sm:text-2xl font-mono font-bold text-amber-300">
              ${p.gamesPlayed}
            </div>
            <div
              class="text-[10px] sm:text-[11px] font-mono font-bold uppercase tracking-wider text-[#8fa382] mt-1"
            >
              ⚔️ PARTIES JOUÉES
            </div>
          </div>
          <div
            class="rounded-xl border-2 border-[#2b3a2d] bg-[#141d16] p-3 text-center"
          >
            <div class="text-xl sm:text-2xl font-mono font-bold text-[#22c55e]">
              ${p.directivesCompleted}
            </div>
            <div
              class="text-[10px] sm:text-[11px] font-mono font-bold uppercase tracking-wider text-[#8fa382] mt-1"
            >
              🎯 DIRECTIVES
            </div>
          </div>
          <div
            class="rounded-xl border-2 border-[#2b3a2d] bg-[#141d16] p-3 text-center"
          >
            <div class="text-xl sm:text-2xl font-mono font-bold text-amber-300">
              ${p.worldEventsSurvived}
            </div>
            <div
              class="text-[10px] sm:text-[11px] font-mono font-bold uppercase tracking-wider text-[#8fa382] mt-1"
            >
              🌪️ CRISES SURVÉCUES
            </div>
          </div>
        </div>

        <!-- STRATEGIC MEGASTRUCTURES SECTION -->
        <div class="space-y-3">
          <div class="flex items-center justify-between flex-wrap gap-2">
            <h3
              class="text-xs sm:text-sm font-mono font-bold uppercase tracking-wider text-amber-300 flex items-center gap-2"
            >
              <span>🏛️</span>
              <span>MÉGASTRUCTURES DE SUPRÉMATIE</span>
            </h3>
            <span class="text-[11px] font-mono text-[#8fa382]">
              S'activent dès le seuil de bâtiments requis
            </span>
          </div>
          <div
            class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3"
          >
            ${MEGASTRUCTURE_DEFINITIONS.map(
              (m) => html`
                <div
                  class="rounded-xl border-2 border-[#2b3a2d] bg-[#141d16] p-3 flex flex-col justify-between shadow-md"
                  style="border-top: 3px solid ${m.accentColor}"
                >
                  <div>
                    <div class="flex items-start gap-2.5">
                      <span
                        class="text-2xl shrink-0 p-1 rounded bg-[#0c120d] border border-[#2b3a2d]"
                        >${m.icon}</span
                      >
                      <div class="min-w-0 flex-1">
                        <div
                          class="text-xs sm:text-[13px] font-mono font-bold uppercase text-white leading-snug break-words"
                        >
                          ${m.name}
                        </div>
                      </div>
                    </div>
                    <div
                      class="mt-2.5 px-2 py-1.5 rounded bg-[#0c120d] border border-[#232f25] text-[11px] font-mono leading-snug text-[#8fa382]"
                    >
                      <span class="text-[#f59e0b] font-bold">Requis :</span>
                      <span class="text-slate-200 ml-1 font-semibold"
                        >${m.requirementDesc}</span
                      >
                    </div>
                  </div>
                  <div
                    class="mt-3 pt-2 border-t border-[#2b3a2d] text-[11.5px] font-mono font-bold text-[#4ade80] leading-snug"
                  >
                    ⚡ ${m.effectDesc}
                  </div>
                </div>
              `,
            )}
          </div>
        </div>

        <!-- WAR MEDALS & ACHIEVEMENTS SECTION -->
        <div class="space-y-3">
          <div class="flex items-center justify-between flex-wrap gap-2">
            <h3
              class="text-xs sm:text-sm font-mono font-bold uppercase tracking-wider text-[#4ade80] flex items-center gap-2"
            >
              <span>🎖️</span>
              <span
                >MÉDAILLES DE GUERRE
                (${p.unlockedMedals.length}/${MEDAL_DEFINITIONS.length})</span
              >
            </h3>
            <span class="text-[11px] font-mono text-[#8fa382]">
              Cliquez pour équiper sur votre profil
            </span>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            ${MEDAL_DEFINITIONS.map((medal) => {
              const unlocked = p.unlockedMedals.includes(medal.id);
              const equipped = p.equippedMedal === medal.id;
              const isSecretLocked = medal.secret && !unlocked;

              const displayIcon = isSecretLocked ? "🔒" : medal.icon;
              const displayName = isSecretLocked ? "OPÉRATION CLASSIFIÉE" : medal.name;
              const displayRarity = isSecretLocked ? "SECRET DÉFENSE" : medal.rarity;
              const displayRarityColor = isSecretLocked ? "#f43f5e" : medal.rarityColor;
              const displayXp = isSecretLocked ? "+??? XP" : `+${medal.xpBonus} XP`;
              const displayDesc = isSecretLocked
                ? "Dossier confidentiel QG. Remplissez des conditions secrètes héroïques au combat pour déclassifier ce haut fait."
                : medal.description;

              return html`
                <div
                  class="rounded-xl border-2 p-3 transition-all flex flex-col justify-between ${equipped
                    ? "border-amber-400 bg-[#242111] shadow-[0_0_15px_rgba(245,158,11,0.3)]"
                    : isSecretLocked
                      ? "border-red-900/50 bg-[#170a0a] hover:border-red-500/50 shadow-inner"
                      : unlocked
                        ? "border-[#2b3a2d] bg-[#141d16] hover:border-[#4ade80]/50"
                        : "border-[#1e271f] bg-[#0f1510] opacity-50"}"
                >
                  <div>
                    <div class="flex items-start justify-between gap-2">
                      <div class="flex items-center gap-2.5 min-w-0 flex-1">
                        <div
                          class="flex h-10 w-10 shrink-0 items-center justify-center rounded border ${isSecretLocked
                            ? "border-red-900/60 bg-[#250d0d] text-red-400 text-xl"
                            : "border-[#2b3a2d] bg-[#0c120d] text-2xl"}"
                        >
                          ${displayIcon}
                        </div>
                        <div class="min-w-0 flex-1">
                          <span
                            class="text-[10px] font-mono font-bold uppercase tracking-wider"
                            style="color: ${displayRarityColor}"
                          >
                            ● ${displayRarity}
                          </span>
                          <div
                            class="text-xs sm:text-[13px] font-mono font-bold ${isSecretLocked
                              ? "text-red-300 tracking-wider"
                              : "text-white"} break-words"
                          >
                            ${displayName}
                          </div>
                        </div>
                      </div>
                      <span
                        class="shrink-0 rounded px-2 py-0.5 text-[10px] font-mono font-bold ${isSecretLocked
                          ? "bg-[#2b1111] border border-red-500/30 text-red-400"
                          : "bg-[#1a291d] border border-[#22c55e]/30 text-[#4ade80]"}"
                      >
                        ${displayXp}
                      </span>
                    </div>
                    <p
                      class="mt-2 text-xs font-mono leading-relaxed ${isSecretLocked
                        ? "text-red-200/70 italic"
                        : "text-[#cbd5e1]"}"
                    >
                      ${displayDesc}
                    </p>
                  </div>

                  <div
                    class="mt-3 pt-2 border-t ${isSecretLocked
                      ? "border-red-900/40"
                      : "border-[#2b3a2d]"} flex items-center justify-between"
                  >
                    <span
                      class="text-[10.5px] font-mono font-bold ${isSecretLocked
                        ? "text-red-400 font-pixel"
                        : unlocked
                          ? "text-[#4ade80]"
                          : "text-[#556758]"}"
                    >
                      ${isSecretLocked
                        ? "🔒 CLASSIFIÉ QG"
                        : unlocked
                          ? "✅ DÉBLOQUÉE"
                          : "🔒 BLOQUÉE"}
                    </span>
                    ${unlocked
                      ? html`
                          <button
                            type="button"
                            @click=${() => this.handleEquipMedal(medal.id)}
                            class="retro-metal-btn cursor-pointer rounded px-2.5 py-1 text-[10px] font-mono font-bold uppercase tracking-wider transition-all ${equipped
                              ? "ring-1 ring-amber-400 text-amber-300"
                              : "text-[#8fa382] hover:text-white"}"
                          >
                            ${equipped ? "★ ÉQUIPÉE" : "ÉQUIPER"}
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
