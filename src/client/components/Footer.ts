import { assetUrl } from "@openfront/shared/AssetUrls";
import { LitElement, html } from "lit";
import { customElement, state } from "lit/decorators.js";
import { composeVersionDisplay, desktopVersion } from "../DesktopShell";
import { currentGameVersion } from "../GameVersion";
import "./SteamWishlistButton";

@customElement("page-footer")
export class Footer extends LitElement {
  // Per instance, not at module scope: currentGameVersion reads
  // BOOTSTRAP_CONFIG, which the server injects into the page and which is not
  // guaranteed to exist at the moment this module is first imported.
  private readonly gameVersion = currentGameVersion();

  // Starts as the game version alone and gains the shell version once the
  // bridge answers, so the line is never blank while that call is in flight.
  @state() private versionLabel = this.gameVersion;

  createRenderRoot() {
    return this;
  }

  connectedCallback() {
    super.connectedCallback();
    // desktopVersion() resolves null off the desktop shell and on its own
    // timeout, so this can only ever leave the label as-is or extend it.
    void desktopVersion().then((shellVersion) => {
      this.versionLabel = composeVersionDisplay(this.gameVersion, shellVersion);
    });
  }

  render() {
    return html`
      <footer
        class="[.in-game_&]:hidden bg-[#161d17] border-t-2 border-[#0e130f] py-2 px-4 text-zinc-400 font-terminal text-[13px] w-full shrink-0 relative z-50 flex flex-wrap items-center justify-between gap-2 select-none"
      >
        <div class="flex items-center gap-2">
          <span class="size-2 rounded-full led-green-on"></span>
          <span class="text-green-400 font-bold tracking-wider uppercase"
            >LIAISON QG : OPÉRATIONNELLE</span
          >
          <span class="text-zinc-600">|</span>
          <span class="footer-version text-zinc-400">
            ${this.versionLabel}
          </span>
        </div>

        <div class="flex items-center gap-4 text-xs font-retro">
          <a
            href="/terms-of-service.html"
            data-i18n="main.terms_of_service"
            target="_blank"
            class="hover:text-amber-300 transition-colors uppercase text-[10px]"
          ></a>
          <span class="text-zinc-600">•</span>
          <a
            href="/privacy-policy.html"
            data-i18n="main.privacy_policy"
            target="_blank"
            class="hover:text-amber-300 transition-colors uppercase text-[10px]"
          ></a>
        </div>

        <!-- Single instance: translateText() resolves the active language via
             document.querySelector("lang-selector"), so a second one would
             shadow it. -->
        <lang-selector class="relative right-0"></lang-selector>
      </footer>
    `;
  }
}
