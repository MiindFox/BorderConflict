import { LitElement, html } from "lit";
import { customElement } from "lit/decorators.js";

@customElement("main-layout")
export class MainLayout extends LitElement {
  private _initialChildren: Node[] = [];

  createRenderRoot() {
    return this;
  }

  connectedCallback() {
    if (this._initialChildren.length === 0 && this.childNodes.length > 0) {
      this._initialChildren = Array.from(this.childNodes);
    }
    super.connectedCallback();
  }

  render() {
    return html`
      <main
        class="relative [.in-game_&]:hidden flex flex-col flex-1 min-h-0 w-full h-full overflow-hidden"
      >
        <div class="w-full h-full flex flex-col flex-1 min-h-0 overflow-hidden">
          ${this._initialChildren}
        </div>
      </main>
    `;
  }
}
