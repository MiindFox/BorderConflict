import { LitElement, html } from "lit";
import { customElement, state } from "lit/decorators.js";
import { translateText } from "./Utils";

@customElement("game-starting-modal")
export class GameStartingModal extends LitElement {
  @state()
  isVisible = false;

  createRenderRoot() {
    return this;
  }

  render() {
    const isVisible = this.isVisible;
    return html`
      <div
        class="fixed inset-0 z-[9999] flex items-center justify-center p-4 transition-all duration-300 ${isVisible
          ? "opacity-100 visible bg-black/60 backdrop-blur-[6px] pointer-events-auto"
          : "opacity-0 invisible pointer-events-none"}"
      >
        <div
          class="relative bg-[#121813]/98 border-2 border-[#2b3a2d] p-6 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.95),inset_0_1px_0_rgba(255,255,255,0.08)] text-slate-100 w-[90vw] max-w-[440px] text-center font-mono overflow-hidden transition-all duration-300 ${isVisible
            ? "scale-100 translate-y-0 opacity-100"
            : "scale-95 translate-y-2 opacity-0"}"
        >
          <!-- Corner tactical screws -->
          <div class="crt-screw crt-screw-tl hidden sm:block"></div>
          <div class="crt-screw crt-screw-tr hidden sm:block"></div>
          <div class="crt-screw crt-screw-bl hidden sm:block"></div>
          <div class="crt-screw crt-screw-br hidden sm:block"></div>

          <div
            class="text-[11px] font-mono font-bold tracking-widest uppercase text-amber-400/80 mb-3 flex items-center justify-center gap-1.5"
          >
            <span
              class="inline-block size-1.5 rounded-full bg-amber-400 animate-pulse"
            ></span>
            <span>${translateText("main.copyright")}</span>
          </div>

          <div
            class="relative bg-[#0a0e0b] border-2 border-[#2b3a2d] p-4 rounded-xl shadow-[inset_0_2px_8px_rgba(0,0,0,0.9)] overflow-hidden"
          >
            <!-- CRT Scanlines overlay -->
            <div
              class="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:100%_3px] pointer-events-none"
            ></div>

            <p
              class="relative z-10 text-lg sm:text-xl font-mono font-black tracking-wide text-emerald-400 drop-shadow-[0_0_12px_rgba(34,197,94,0.5)]"
            >
              > ${translateText("game_starting_modal.title")}
            </p>

            <div
              class="relative z-10 mt-3 flex items-center justify-center gap-2 text-xs text-emerald-300/80 font-mono"
            >
              <span
                class="inline-block size-2 rounded-full bg-emerald-400 animate-ping"
              ></span>
              <span class="tracking-widest uppercase text-[10px]"
                >INITIALISATION DU THÉÂTRE D'OPÉRATIONS</span
              >
            </div>

            <div
              class="relative z-10 mt-2.5 h-2 w-full rounded-md bg-[#0e1410] border border-[#2b3a2d] overflow-hidden"
            >
              <div
                class="h-full bg-gradient-to-r from-[#183520] via-[#22c55e] to-[#4ade80] animate-pulse w-full"
              >
                <div
                  class="w-full h-full opacity-30 bg-[repeating-linear-gradient(90deg,transparent,transparent_6px,#000_6px,#000_8px)]"
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  show() {
    this.isVisible = true;
    this.requestUpdate();
  }

  hide() {
    this.isVisible = false;
    this.requestUpdate();
  }
}
