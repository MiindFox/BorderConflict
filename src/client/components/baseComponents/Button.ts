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
    "font-bold tracking-wider rounded-xl border " +
    "transition-all duration-200 transform hover:-translate-y-0.5 active:translate-y-0 " +
    "outline-none text-center whitespace-normal break-words leading-tight overflow-hidden relative " +
    "disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:opacity-60";

  private variantClasses(): string {
    switch (this.variant) {
      case "primary":
        return "bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 border-cyan-400/30 shadow-[0_4px_16px_rgba(6,182,212,0.28)] hover:shadow-[0_6px_22px_rgba(6,182,212,0.45)] text-white disabled:from-slate-700 disabled:to-slate-800 disabled:border-white/10 disabled:shadow-none disabled:text-slate-400";
      case "secondary":
        return "bg-slate-800/85 hover:bg-slate-700/90 border-white/15 hover:border-cyan-400/40 text-slate-100 shadow-sm disabled:bg-slate-900 disabled:border-white/5 disabled:text-slate-500";
      case "danger":
        return "bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 border-rose-400/30 shadow-[0_4px_14px_rgba(244,63,94,0.28)] text-white disabled:from-red-950 disabled:to-red-900 disabled:text-slate-400";
      case "warning":
        return "bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 border-amber-300/40 shadow-[0_4px_14px_rgba(245,158,11,0.28)] text-slate-950 disabled:from-yellow-950 disabled:to-amber-950 disabled:text-slate-400";
      case "ghost":
        return "bg-transparent hover:bg-cyan-500/10 border-transparent hover:border-cyan-400/25 text-cyan-400 hover:text-cyan-300 disabled:text-slate-600 disabled:hover:bg-transparent";
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
