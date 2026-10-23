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
        class="fixed inset-0 bg-black/30 backdrop-blur-[4px] z-[9998] transition-all duration-300 ${isVisible
          ? "opacity-100 visible"
          : "opacity-0 invisible"}"
      ></div>
      <div
        class="fixed top-1/2 left-1/2 bg-slate-950/90 backdrop-blur-xl border border-cyan-500/20 p-6 rounded-2xl z-[9999] shadow-[0_0_40px_rgba(6,182,212,0.2)] text-white w-[400px] text-center transition-all duration-300 -translate-x-1/2 ${isVisible
          ? "opacity-100 visible -translate-y-1/2"
          : "opacity-0 invisible -translate-y-[48%]"}"
      >
        <div
          class="text-xs font-medium tracking-wider uppercase text-white/40 mb-4"
        >
          ${translateText("main.copyright")}
        </div>
        <p
          class="text-xl font-bold tracking-wider text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 px-4 py-3 rounded-xl"
        >
          ${translateText("game_starting_modal.title")}
        </p>
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
