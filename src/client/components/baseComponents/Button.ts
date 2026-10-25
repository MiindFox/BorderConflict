import { LitElement, TemplateResult, html, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import { translateText } from "../../Utils";

type ButtonVariant = "primary" | "secondary" | "danger" | "warning" | "ghost";
type ButtonSize = "xs" | "sm" | "md" | "lg";
type ButtonWidth = "auto" | "block" | "blockDesktop" | "fill";
type IconPosition = "left" | "right" | "only";

@customElement("o-button")
export class OButton extends LitElement {
  @property() title = "";
  @property() translationKey = "";
  @property() variant: ButtonVariant = "primary";
  @property() size: ButtonSize = "md";
  @property() width: ButtonWidth = "auto";
  @property() iconPosition: IconPosition = "left";
  @property({ attribute: false }) icon?: TemplateResult;
  @property({ type: Boolean }) disable = false;
  @property({ type: Boolean }) submit = false;
  @property({ type: Boolean }) uppercase = true;

  createRenderRoot() {
    return this;
  }

  private readonly BASE =
    "font-retro font-bold tracking-wide rounded-lg border " +
    "transition-all duration-150 transform active:translate-y-0.5 " +
    "outline-none text-center whitespace-normal break-words leading-tight overflow-hidden relative cursor-pointer " +
    "disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:opacity-50";

  private variantClasses(): string {
    switch (this.variant) {
      case "primary":
        return "bg-gradient-to-b from-[#dc2626] via-[#b91c1c] to-[#881337] hover:from-[#ef4444] hover:to-[#991b1b] border-t-2 border-l-2 border-r-2 border-b-2 border-t-[#f87171] border-l-[#ef4444] border-r-[#450a0a] border-b-[#280505] shadow-[0_0_16px_rgba(220,38,38,0.45)] text-white";
      case "secondary":
        return "bg-gradient-to-b from-[#3d4b3f] via-[#29342b] to-[#1a221b] hover:from-[#4d5e50] hover:to-[#222c23] border-t-2 border-l-2 border-r-2 border-b-2 border-t-[#617464] border-l-[#4d5d50] border-r-[#101611] border-b-[#0b0e0c] shadow-[0_2px_4px_rgba(0,0,0,0.6)] text-[#e2e8f0] hover:text-white";
      case "danger":
        return "bg-gradient-to-b from-[#b91c1c] to-[#7f1d1d] hover:from-[#dc2626] hover:to-[#991b1b] border-t-2 border-l-2 border-r-2 border-b-2 border-t-[#f87171] border-l-[#ef4444] border-r-[#450a0a] border-b-[#280505] text-white shadow-md";
      case "warning":
        return "bg-gradient-to-b from-[#d97706] to-[#92400e] hover:from-[#f59e0b] hover:to-[#b45309] border-t-2 border-l-2 border-r-2 border-b-2 border-t-[#fde68a] border-l-[#fbbf24] border-r-[#78350f] border-b-[#451a03] text-stone-900 shadow-md";
      case "ghost":
        return "bg-transparent hover:bg-[#22c55e]/15 border-transparent hover:border-[#22c55e]/40 text-[#4ade80] hover:text-[#86efac]";
    }
  }

  private sizeClasses(): string {
    if (this.iconPosition === "only") {
      switch (this.size) {
        case "xs":
          return "w-6 h-6 text-xs";
        case "sm":
          return "w-8 h-8 text-sm";
        case "md":
          return "w-10 h-10 text-base";
        case "lg":
          return "w-12 h-12 text-lg";
      }
    }
    switch (this.size) {
      case "xs":
        return "py-1 px-2 text-xs";
      case "sm":
        return "py-1.5 px-3 text-sm";
      case "md":
        return "py-3 px-4 text-base lg:text-lg";
      case "lg":
        return "py-4 px-6 text-lg lg:text-xl";
    }
  }

  private widthClasses(): string {
    switch (this.width) {
      case "auto":
        return "inline-flex items-center justify-center gap-2";
      case "block":
        return "flex w-full items-center justify-center gap-2";
      case "blockDesktop":
        return "flex w-full items-center justify-center gap-2 lg:w-1/2 lg:mx-auto";
      case "fill":
        return "flex w-full h-full items-center justify-center gap-2";
    }
  }

  render() {
    const label =
      this.translationKey === ""
        ? this.title
        : translateText(this.translationKey);
    const iconOnly = this.iconPosition === "only";
    const casing = this.uppercase ? "uppercase" : "normal-case";
    const classes = `${this.BASE} ${casing} ${this.variantClasses()} ${this.sizeClasses()} ${this.widthClasses()}`;

    return html`
      <button
        class=${classes}
        ?disabled=${this.disable}
        type=${this.submit ? "submit" : "button"}
        aria-label=${iconOnly ? label : nothing}
      >
        ${this.icon && this.iconPosition !== "right" ? this.icon : nothing}
        ${iconOnly ? nothing : html`<span class="min-w-0">${label}</span>`}
        ${this.icon && this.iconPosition === "right" ? this.icon : nothing}
      </button>
    `;
  }
}
