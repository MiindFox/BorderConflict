import {
  BuildableUnit,
  BuildMenus,
  Gold,
  PlayerBuildableUnitType,
  UnitType,
} from "@openfront/engine-api/game/GameTypes";
import { renderNumber } from "@openfront/engine-lib/Format";
import { EventBus } from "@openfront/shared/EventBus";
import { html, LitElement } from "lit";
import { customElement } from "lit/decorators.js";
import { Controller } from "../../Controller";
import { ToggleStructureEvent } from "../../InputHandler";
import { UIState } from "../../UIState";
import { UserSettings } from "../../UserSettings";
import { translateText } from "../../Utils";
import { GameView } from "../../view";
import {
  atomBombIcon,
  cityIcon,
  defensePostIcon,
  factoryIcon,
  goldCoinIcon,
  hydrogenBombIcon,
  mirvIcon,
  missileSiloIcon,
  portIcon,
  samLauncherIcon,
  warshipIcon,
} from "../HotbarIcons";
import { TutorialHighlight, TutorialHighlightEvent } from "../Tutorial";

@customElement("unit-display")
export class UnitDisplay extends LitElement implements Controller {
  public game: GameView;
  public eventBus: EventBus;
  public uiState: UIState;
  private playerBuildables: BuildableUnit[] | null = null;
  private keybinds: Record<string, { value: string; key: string }> = {};
  private _cities = 0;
  private _warships = 0;
  private _factories = 0;
  private _missileSilo = 0;
  private _port = 0;
  private _defensePost = 0;
  private _samLauncher = 0;
  private allDisabled = false;
  private _hoveredUnit: PlayerBuildableUnitType | null = null;
  private _hoveredRect: DOMRect | null = null;
  private _hoveredInfo: {
    unitType: PlayerBuildableUnitType;
    structureKey: string;
    hotkey: string;
  } | null = null;
  private tutorialHighlight: PlayerBuildableUnitType | null = null;

  createRenderRoot() {
    return this;
  }

  init() {
    const config = this.game.config();
    const userSettings = new UserSettings();

    this.keybinds = userSettings.parsedUserKeybinds();

    this.allDisabled = BuildMenus.types.every((u) => config.isUnitDisabled(u));

    const highlightUnits: Partial<
      Record<TutorialHighlight, PlayerBuildableUnitType>
    > = {
      city: UnitType.City,
      port: UnitType.Port,
      defense_post: UnitType.DefensePost,
      factory: UnitType.Factory,
      warship: UnitType.Warship,
      silo: UnitType.MissileSilo,
      atom: UnitType.AtomBomb,
      hydrogen: UnitType.HydrogenBomb,
      mirv: UnitType.MIRV,
      sam: UnitType.SAMLauncher,
    };
    this.eventBus.on(TutorialHighlightEvent, (e) => {
      this.tutorialHighlight = (e.target && highlightUnits[e.target]) ?? null;
      this.requestUpdate();
    });
    this.requestUpdate();
  }

  private cost(item: UnitType): Gold {
    for (const bu of this.playerBuildables ?? []) {
      if (bu.type === item) {
        return bu.cost;
      }
    }
    return 0n;
  }

  private canBuild(item: UnitType): boolean {
    if (this.game?.config().isUnitDisabled(item)) return false;
    const player = this.game?.myPlayer();
    switch (item) {
      case UnitType.AtomBomb:
      case UnitType.HydrogenBomb:
      case UnitType.MIRV:
        return (
          this.cost(item) <= (player?.gold() ?? 0n) &&
          (player?.units(UnitType.MissileSilo).length ?? 0) > 0
        );
      case UnitType.Warship:
        return (
          this.cost(item) <= (player?.gold() ?? 0n) &&
          (player?.units(UnitType.Port).length ?? 0) > 0
        );
      default:
        return this.cost(item) <= (player?.gold() ?? 0n);
    }
  }

  tick() {
    const player = this.game?.myPlayer();
    if (!player) return;
    player.buildables(undefined, BuildMenus.types).then((buildables) => {
      this.playerBuildables = buildables;
    });
    this._cities = player.totalUnitLevels(UnitType.City);
    this._missileSilo = player.totalUnitLevels(UnitType.MissileSilo);
    this._port = player.totalUnitLevels(UnitType.Port);
    this._defensePost = player.totalUnitLevels(UnitType.DefensePost);
    this._samLauncher = player.totalUnitLevels(UnitType.SAMLauncher);
    this._factories = player.totalUnitLevels(UnitType.Factory);
    this._warships = player.totalUnitLevels(UnitType.Warship);
    this.requestUpdate();
  }

  render() {
    const myPlayer = this.game?.myPlayer();
    if (
      !this.game ||
      !myPlayer ||
      this.game.inSpawnPhase() ||
      !myPlayer.isAlive()
    ) {
      return null;
    }
    if (this.allDisabled) {
      return null;
    }

    return html`
      <div
        class="border-t border-[#222e24] px-1.5 py-0.5 w-full bg-[#0c120d]/90 font-mono"
      >
        <div
          class="flex items-center justify-center gap-1.5 min-[1200px]:gap-2 flex-nowrap max-w-full overflow-x-auto py-0.5"
        >
          <!-- Groupe Économie -->
          <div
            class="flex items-center gap-1 bg-[#121813] px-1.5 py-0.5 rounded-lg border border-[#2b3a2d] shadow-inner shrink-0"
          >
            <span
              class="text-xs select-none text-emerald-400 font-bold px-0.5 hidden min-[1300px]:inline"
              title="Économie"
              >🏙️</span
            >
            ${this.renderUnitItem(
              cityIcon,
              this._cities,
              UnitType.City,
              "city",
              this.keybinds["buildCity"]?.key ?? "1",
            )}
            ${this.renderUnitItem(
              factoryIcon,
              this._factories,
              UnitType.Factory,
              "factory",
              this.keybinds["buildFactory"]?.key ?? "2",
            )}
            ${this.renderUnitItem(
              portIcon,
              this._port,
              UnitType.Port,
              "port",
              this.keybinds["buildPort"]?.key ?? "3",
            )}
          </div>

          <div
            class="hidden sm:block w-[1.5px] h-6 bg-[#2b3a2d] shrink-0"
          ></div>

          <!-- Groupe Défense -->
          <div
            class="flex items-center gap-1 bg-[#121813] px-1.5 py-0.5 rounded-lg border border-[#2b3a2d] shadow-inner shrink-0"
          >
            <span
              class="text-xs select-none text-emerald-400 font-bold px-0.5 hidden min-[1300px]:inline"
              title="Défense"
              >🛡️</span
            >
            ${this.renderUnitItem(
              defensePostIcon,
              this._defensePost,
              UnitType.DefensePost,
              "defense_post",
              this.keybinds["buildDefensePost"]?.key ?? "4",
            )}
            ${this.renderUnitItem(
              samLauncherIcon,
              this._samLauncher,
              UnitType.SAMLauncher,
              "sam_launcher",
              this.keybinds["buildSamLauncher"]?.key ?? "6",
            )}
            ${this.renderUnitItem(
              warshipIcon,
              this._warships,
              UnitType.Warship,
              "warship",
              this.keybinds["buildWarship"]?.key ?? "7",
            )}
          </div>

          <div
            class="hidden sm:block w-[1.5px] h-6 bg-[#2b3a2d] shrink-0"
          ></div>

          <!-- Groupe Stratégique -->
          <div
            class="flex items-center gap-1 bg-[#121813] px-1.5 py-0.5 rounded-lg border border-[#2b3a2d] shadow-inner shrink-0"
          >
            <span
              class="text-xs select-none text-amber-400 font-bold px-0.5 hidden min-[1300px]:inline"
              title="Stratégique"
              >🚀</span
            >
            ${this.renderUnitItem(
              missileSiloIcon,
              this._missileSilo,
              UnitType.MissileSilo,
              "missile_silo",
              this.keybinds["buildMissileSilo"]?.key ?? "5",
            )}
            ${this.renderUnitItem(
              atomBombIcon,
              null,
              UnitType.AtomBomb,
              "atom_bomb",
              this.keybinds["buildAtomBomb"]?.key ?? "8",
            )}
            ${this.renderUnitItem(
              hydrogenBombIcon,
              null,
              UnitType.HydrogenBomb,
              "hydrogen_bomb",
              this.keybinds["buildHydrogenBomb"]?.key ?? "9",
            )}
            ${this.renderUnitItem(
              mirvIcon,
              null,
              UnitType.MIRV,
              "mirv",
              this.keybinds["buildMIRV"]?.key ?? "0",
            )}
          </div>
        </div>
      </div>
      ${this.renderFloatingTooltip()}
    `;
  }

  private renderFloatingTooltip() {
    if (!this._hoveredInfo || !this._hoveredRect) return null;
    const { unitType, structureKey, hotkey } = this._hoveredInfo;
    const rect = this._hoveredRect;
    const itemCost = this.cost(unitType);
    const bottomPos = Math.max(80, window.innerHeight - rect.top + 12);
    const centerX = rect.left + rect.width / 2;
    const leftPos = Math.max(160, Math.min(window.innerWidth - 160, centerX));

    return html`
      <div
        class="fixed text-slate-100 text-center w-max max-w-[320px] text-xs bg-[#121813]/98 border-2 border-[#2b3a2d] rounded-xl p-3 z-[99999] shadow-[0_16px_40px_rgba(0,0,0,0.95)] pointer-events-none font-mono"
        style="bottom: ${bottomPos}px; left: ${leftPos}px; transform: translateX(-50%); border-top: 3px solid #10b981;"
      >
        <div class="font-bold text-sm text-emerald-300 mb-1 flex items-center justify-center gap-1.5">
          <span>${translateText("unit_type." + structureKey)}</span>
          <span class="px-1.5 py-0.2 rounded bg-[#0a0f0c] text-emerald-400 border border-[#2b3a2d] text-[10px]">
            [${hotkey}]
          </span>
        </div>
        <div class="px-1 py-1 text-slate-300 leading-relaxed text-[11.5px]">
          ${translateText("build_menu.desc." + structureKey)}
        </div>
        ${unitType === UnitType.Warship
          ? html`<div
              class="mt-1 px-2 py-1 text-[10.5px] text-emerald-300 border-t border-[#2b3a2d] font-bold"
            >
              ⇧ ${translateText("build_menu.warship_shift_hint")}
            </div>`
          : null}
        <div
          class="flex items-center justify-center gap-1.5 mt-2 pt-1.5 border-t border-[#2b3a2d] font-bold text-amber-300 text-xs"
        >
          <img src=${goldCoinIcon} width="14" height="14" />
          <span class="tabular-nums">Coût : ${renderNumber(itemCost)} Or</span>
        </div>
      </div>
    `;
  }

  private renderUnitItem(
    icon: string,
    number: number | null,
    unitType: PlayerBuildableUnitType,
    structureKey: string,
    hotkey: string,
  ) {
    if (this.game.config().isUnitDisabled(unitType)) {
      return html``;
    }
    const selected = this.uiState.ghostStructure === unitType;
    const displayHotkey = hotkey
      .replace("Digit", "")
      .replace("Key", "")
      .toUpperCase();
    const itemCost = this.cost(unitType);
    const canAfford = itemCost <= (this.game?.myPlayer()?.gold() ?? 0n);

    return html`
      <div
        class="flex flex-col items-center relative"
        @mouseenter=${(e: MouseEvent) => {
          const target = e.currentTarget as HTMLElement;
          this._hoveredUnit = unitType;
          this._hoveredRect = target.getBoundingClientRect();
          this._hoveredInfo = {
            unitType,
            structureKey,
            hotkey: displayHotkey,
          };
          switch (unitType) {
            case UnitType.AtomBomb:
            case UnitType.HydrogenBomb:
              this.eventBus?.emit(
                new ToggleStructureEvent([
                  UnitType.MissileSilo,
                  UnitType.SAMLauncher,
                ]),
              );
              break;
            case UnitType.Warship:
              this.eventBus?.emit(new ToggleStructureEvent([UnitType.Port]));
              break;
            default:
              this.eventBus?.emit(new ToggleStructureEvent([unitType]));
          }
          this.requestUpdate();
        }}
        @mouseleave=${() => {
          this._hoveredUnit = null;
          this._hoveredRect = null;
          this._hoveredInfo = null;
          this.eventBus?.emit(new ToggleStructureEvent(null));
          this.requestUpdate();
        }}
      >
        <div
          class="${this.canBuild(unitType)
            ? ""
            : "opacity-40"} border rounded-md px-1.5 py-0.5 flex items-center gap-1.5 cursor-pointer transition-all duration-150 shadow-sm h-7
             ${selected
            ? "border-green-400 bg-[#1e3825] shadow-[0_0_10px_rgba(34,197,94,0.6)] -translate-y-0.5 text-white"
            : "border-[#2b3a2d] bg-[#18231a] hover:bg-[#202e22] hover:border-amber-400/60 text-slate-100"}
             ${this.tutorialHighlight === unitType ? "tutorial-highlight" : ""}"
          @click=${() => {
            if (selected) {
              this.uiState.ghostStructure = null;
            } else if (this.canBuild(unitType)) {
              this.uiState.ghostStructure = unitType;
            }
            this.requestUpdate();
          }}
        >
          <div
            class="px-1 py-0.2 text-[9px] font-mono font-bold rounded bg-[#0a0f0c] text-emerald-300 border border-[#2b3a2d]"
          >
            ${displayHotkey}
          </div>
          <div class="flex items-center gap-1">
            <img
              src=${icon}
              alt=${structureKey}
              class="align-middle size-4 shrink-0"
            />
            ${number !== null
              ? html`<span class="text-xs font-mono font-bold tabular-nums"
                  >${renderNumber(number)}</span
                >`
              : null}
          </div>
          <div
            class="flex items-center gap-0.5 text-[10px] font-mono font-bold tabular-nums ${canAfford
              ? "text-amber-300"
              : "text-slate-500"}"
          >
            <img src=${goldCoinIcon} width="11" height="11" class="shrink-0" />
            <span>${renderNumber(itemCost)}</span>
          </div>
        </div>
      </div>
    `;
  }
}
