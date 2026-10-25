import { LitElement, PropertyValues, html } from "lit";
import { customElement, property, query, state } from "lit/decorators.js";
import { documentStylesSheet } from "./SharedStyles";

export type OModalTab = { key: string; label: string };

@customElement("o-modal")
export class OModal extends LitElement {
  static styles = [documentStylesSheet()];

  @state() public isModalOpen = false;

  @query("[data-modal-scroll]") private scrollContainer?: HTMLElement;

  static openCount = 0;

  @property({ type: Boolean })
  public inline = false;

  @property({ type: Boolean })
  public alwaysMaximized = false;

  @property({ type: Boolean })
  public hideCloseButton = false;

  @property({ type: String })
  public title = "";

  @property({ type: Boolean })
  public hideHeader = false;

  @property({ type: String })
  public maxWidth = "";

  @property({ type: Array })
  public tabs: OModalTab[] = [];

  @property({ type: String })
  public activeTab = "";

  @property({ attribute: false })
  public onTabChange?: (key: string) => void;

  public onClose?: () => void;

  public open() {
    if (!this.isModalOpen) {
      if (!this.inline) {
        OModal.openCount = OModal.openCount + 1;
        if (OModal.openCount === 1) document.body.style.overflow = "hidden";
      }
      this.isModalOpen = true;
    }
  }

  public close() {
    if (this.isModalOpen) {
      this.isModalOpen = false;
      this.onClose?.();
      if (!this.inline) {
        OModal.openCount = Math.max(0, OModal.openCount - 1);
        if (OModal.openCount === 0) document.body.style.overflow = "";
      }
    }
  }

  protected updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    // A tab opened directly (a link, the last tab used) may sit past the edge
    // of a scrolled tab row: scroll the row, and only the row, to it.
    // scrollIntoView would also scroll the modal's content and the page.
    if (!changed.has("activeTab") || !this.activeTab) return;
    const row = this.renderRoot.querySelector<HTMLElement>('[role="tablist"]');
    if (row === null || row.scrollWidth <= row.clientWidth) return;
    const tab = [...row.querySelectorAll<HTMLElement>('[role="tab"]')].find(
      (t) => t.dataset.key === this.activeTab,
    );
    if (tab === undefined) return;
    const rowBox = row.getBoundingClientRect();
    const tabBox = tab.getBoundingClientRect();
    if (tabBox.left < rowBox.left) {
      row.scrollLeft += tabBox.left - rowBox.left;
    } else if (tabBox.right > rowBox.right) {
      row.scrollLeft += tabBox.right - rowBox.right;
    }
  }

  public getScrollTop(): number {
    return this.scrollContainer?.scrollTop ?? 0;
  }

  public setScrollTop(scrollTop: number): void {
    if (this.scrollContainer) {
      this.scrollContainer.scrollTop = scrollTop;
    }
  }

  disconnectedCallback() {
    // Ensure global counter is decremented if this modal is removed while open.
    if (this.isModalOpen && !this.inline) {
      OModal.openCount = Math.max(0, OModal.openCount - 1);
      if (OModal.openCount === 0) document.body.style.overflow = "";
    }
    super.disconnectedCallback();
  }

  private handleTabClick(key: string) {
    this.onTabChange?.(key);
  }

  private renderTabs() {
    return html`
      <div
        role="tablist"
        class="flex flex-nowrap overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden border-b-2 border-[#2b3a2d] bg-[#141d16] px-3 py-2 gap-2 shrink-0 select-none"
      >
        ${this.tabs.map((tab) => {
          const active = this.activeTab === tab.key;
          return html`
            <button
              type="button"
              role="tab"
              data-key=${tab.key}
              aria-selected=${active}
              class="retro-metal-btn shrink-0 whitespace-nowrap px-3 py-1.5 text-[10px] sm:text-[11px] font-retro font-bold uppercase transition-all rounded flex items-center gap-2 cursor-pointer ${active
                ? "ring-2 ring-amber-400 text-amber-200 brightness-110 shadow-[0_0_8px_rgba(245,158,11,0.4)]"
                : "text-[#8fa382] hover:text-white"}"
              @click=${() => this.handleTabClick(tab.key)}
            >
              <span
                class="size-2 rounded-full ${active
                  ? "led-green-on"
                  : "led-off"}"
              ></span>
              <span>${tab.label}</span>
            </button>
          `;
        })}
      </div>
    `;
  }

  render() {
    const shouldRender = this.isModalOpen || this.inline;
    if (!shouldRender) {
      return html``;
    }

    const backdropClass = this.inline
      ? "relative z-10 w-full h-full flex items-center justify-center p-1 sm:p-2.5 overflow-hidden"
      : "fixed inset-0 z-[9999] bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-hidden";

    const wrapperClass = this.inline
      ? "crt-chassis relative flex flex-col w-full h-full max-w-[940px] rounded-xl border-4 sm:border-6 border-[#1a231b] bg-[#121813] shadow-[0_0_40px_rgba(0,0,0,0.95)] overflow-hidden"
      : `crt-chassis relative flex flex-col w-full h-full lg:w-[92%] lg:max-w-[960px] lg:h-[88vh] border-4 sm:border-8 border-[#1a231b] rounded-xl bg-[#121813] shadow-[0_0_50px_rgba(0,0,0,0.95)] overflow-hidden ${
          this.alwaysMaximized ? "h-auto" : ""
        }`;
    const wrapperStyle = this.maxWidth ? `max-width: ${this.maxWidth};` : "";

    const hasTabs = this.tabs.length > 0;
    const sectionClass =
      "relative flex-1 min-h-0 flex flex-col text-[#8fa382] bg-[#0c120e] rounded-lg border border-[#2b3a2d] overflow-hidden";

    return html`
      <aside
        class="${backdropClass}"
        @click=${this.inline ? null : () => this.close()}
      >
        <div
          @click=${(e: Event) => e.stopPropagation()}
          class="${wrapperClass}"
          style="${wrapperStyle}"
        >
          <!-- 4 Corner Screws -->
          <div class="crt-screw crt-screw-tl hidden sm:block"></div>
          <div class="crt-screw crt-screw-tr hidden sm:block"></div>
          <div class="crt-screw crt-screw-bl hidden sm:block"></div>
          <div class="crt-screw crt-screw-br hidden sm:block"></div>
          ${this.inline || this.hideCloseButton
            ? html``
            : html`<button
                type="button"
                class="retro-red-btn absolute top-3.5 right-3.5 z-30 size-7 rounded flex items-center justify-center font-pixel text-xs text-white font-bold cursor-pointer"
                title="Fermer le sous-menu"
                @click=${() => this.close()}
              >
                ✕
              </button>`}
          ${!this.hideHeader && this.title
            ? html`<div
                class="px-5 py-3 text-base sm:text-lg font-pixel uppercase tracking-widest text-amber-200 bg-[#162017] border-b-2 border-[#2b3a2d] flex items-center gap-2.5 glow-amber"
              >
                <span class="size-2 rounded-full led-green-on"></span>
                <span>${this.title}</span>
              </div>`
            : html``}
          <section class="${sectionClass}">
            <slot name="header"></slot>
            ${hasTabs ? this.renderTabs() : html``}
            <div data-modal-scroll class="flex-1 min-h-0 overflow-y-auto">
              <slot></slot>
            </div>
          </section>
        </div>
      </aside>
    `;
  }
}
