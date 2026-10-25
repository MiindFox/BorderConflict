import { html, LitElement, nothing } from "lit";
import { customElement, state } from "lit/decorators.js";

interface BootLog {
  id: number;
  text: string;
  type: "normal" | "amber" | "success" | "cyan" | "alert";
  timestamp: string;
}

class RetroBootAudio {
  private ctx: AudioContext | null = null;
  public enabled = true;

  private initCtx() {
    if (!this.ctx && typeof AudioContext !== "undefined") {
      try {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext;
        this.ctx = new AudioCtx();
      } catch {}
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
  }

  playKeyClick() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(
        750 + Math.random() * 500,
        this.ctx.currentTime,
      );
      gain.gain.setValueAtTime(0.03, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        this.ctx.currentTime + 0.025,
      );
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.03);
    } catch {}
  }

  playChirp() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(1200, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(
        2200,
        this.ctx.currentTime + 0.08,
      );
      gain.gain.setValueAtTime(0.06, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        this.ctx.currentTime + 0.09,
      );
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.095);
    } catch {}
  }

  playAccessGranted() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const notes = [523, 659, 784, 1046];
      notes.forEach((freq, i) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, this.ctx!.currentTime + i * 0.06);
        gain.gain.setValueAtTime(0.06, this.ctx!.currentTime + i * 0.06);
        gain.gain.exponentialRampToValueAtTime(
          0.001,
          this.ctx!.currentTime + i * 0.06 + 0.14,
        );
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(this.ctx!.currentTime + i * 0.06);
        osc.stop(this.ctx!.currentTime + i * 0.06 + 0.15);
      });
    } catch {}
  }
}

@customElement("retro-terminal-boot")
export class RetroTerminalBoot extends LitElement {
  @state() private logs: BootLog[] = [];
  @state() private isComplete = false;
  @state() private soundEnabled = true;
  @state() private progressPercent = 0;
  @state() private showBanner = false;

  private audio = new RetroBootAudio();
  private timer: number | null = null;
  private animFrame: number | null = null;

  createRenderRoot() {
    // Render in light DOM so tailwind and root CRT styling apply effortlessly
    return this;
  }

  connectedCallback() {
    super.connectedCallback();

    // Check if session already played boot or if URL is direct game join
    const search = window.location.search || "";
    const isDirectGame =
      search.includes("join=") ||
      search.includes("requeue") ||
      search.includes("game=");

    const alreadyBooted = sessionStorage.getItem("bc_boot_sequence_done");
    if (alreadyBooted === "1" || isDirectGame) {
      this.remove();
      return;
    }

    this.startSequence();
    window.addEventListener("keydown", this.handleKeyDown);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.timer) window.clearTimeout(this.timer);
    if (this.animFrame) window.cancelAnimationFrame(this.animFrame);
    window.removeEventListener("keydown", this.handleKeyDown);
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === " " || e.key === "Enter" || e.key === "Escape") {
      this.skip();
    }
  };

  private startSequence() {
    const rawSteps: Array<{
      delay: number;
      text: string;
      type: BootLog["type"];
    }> = [
      {
        delay: 80,
        text: "DEFENSE LOGISTICS AGENCY // NORAD TACTICAL NET-OS v4.19",
        type: "cyan",
      },
      {
        delay: 240,
        text: "TERMINAL 0x7F // HARDWARE ID: BF-2026-X9 // STRATEGIC MAINFRAME",
        type: "normal",
      },
      {
        delay: 420,
        text: "MEMORY INTEGRITY CHECK: 64 MB BUFFER ......... [ OK - NO PARITY FAULT ]",
        type: "normal",
      },
      {
        delay: 620,
        text: "CRYPTOGRAPHIC COPROCESSOR (TYPE-1 / NSA) ..... [ INITIALIZED ]",
        type: "normal",
      },
      {
        delay: 840,
        text: "SECURITY CLEARANCE: LEVEL 5 // TOP SECRET // STRICTLY CONFIDENTIAL",
        type: "amber",
      },
      {
        delay: 1100,
        text: "ESTABLISHING QUANTUM SATELLITE UPLINK ........ [ LINK ESTABLISHED ]",
        type: "success",
      },
      {
        delay: 1350,
        text: "GEOPOLITICAL RADAR SENSORS (5 NODES) ......... [ CONFLICT ACTIVE - THREAT LVL 4 ]",
        type: "amber",
      },
      {
        delay: 1600,
        text: "WARHEAD SILOS & DEFENSE GRIDS TELEMETRY ...... [ SYNCHRONIZED ]",
        type: "normal",
      },
      {
        delay: 1850,
        text: "DEPLOYING TACTICAL COMBAT SUITE: BORDER CONFLICT...",
        type: "alert",
      },
    ];

    let currentStep = 0;
    const scheduleNext = () => {
      if (currentStep >= rawSteps.length) {
        this.showBanner = true;
        this.audio.playChirp();
        this.animateProgress();
        return;
      }

      const step = rawSteps[currentStep];
      const now = new Date();
      const ts = `${now.getHours().toString().padStart(2, "0")}:${now
        .getMinutes()
        .toString()
        .padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}.${(
        now.getMilliseconds() % 100
      )
        .toString()
        .padStart(2, "0")}`;

      this.logs = [
        ...this.logs,
        {
          id: currentStep,
          text: step.text,
          type: step.type,
          timestamp: ts,
        },
      ];

      this.audio.playKeyClick();
      currentStep++;

      const nextDelay = currentStep < rawSteps.length ? 170 : 250;
      this.timer = window.setTimeout(scheduleNext, nextDelay);
    };

    this.timer = window.setTimeout(scheduleNext, 100);
  }

  private animateProgress() {
    let p = 0;
    const interval = window.setInterval(() => {
      p += 10;
      this.progressPercent = Math.min(100, p);
      this.audio.playKeyClick();

      if (p >= 100) {
        window.clearInterval(interval);
        this.isComplete = true;
        this.audio.playAccessGranted();

        this.timer = window.setTimeout(() => {
          this.dismiss();
        }, 650);
      }
    }, 45);
  }

  public skip() {
    if (this.timer) window.clearTimeout(this.timer);
    this.progressPercent = 100;
    this.isComplete = true;
    this.dismiss();
  }

  private dismiss() {
    sessionStorage.setItem("bc_boot_sequence_done", "1");
    const container = this.querySelector(
      "#retro-boot-overlay",
    ) as HTMLElement | null;
    if (container) {
      container.style.transition =
        "opacity 0.45s ease-out, transform 0.45s cubic-bezier(0.16, 1, 0.3, 1), filter 0.45s ease-out";
      container.style.opacity = "0";
      container.style.transform = "scale(1.04)";
      container.style.filter = "brightness(1.8) contrast(1.2)";
    }
    window.setTimeout(() => {
      this.remove();
    }, 480);
  }

  private toggleSound(e: Event) {
    e.stopPropagation();
    this.soundEnabled = !this.soundEnabled;
    this.audio.enabled = this.soundEnabled;
  }

  render() {
    return html`
      <div
        id="retro-boot-overlay"
        @click=${() => this.skip()}
        class="fixed inset-0 z-[100000] bg-[#050a06] text-[#4ade80] font-mono select-none overflow-hidden flex flex-col justify-between p-3 sm:p-6 md:p-10 cursor-pointer"
        style="box-shadow: inset 0 0 100px rgba(0, 0, 0, 0.95), inset 0 0 40px rgba(34, 197, 94, 0.15);"
      >
        <!-- CRT Scanline & Phosphor Overlay -->
        <div
          class="absolute inset-0 pointer-events-none crt-scanlines opacity-50 z-20"
        ></div>
        <div
          class="absolute inset-0 pointer-events-none z-10"
          style="background: radial-gradient(circle at center, transparent 55%, rgba(0, 0, 0, 0.85) 100%);"
        ></div>

        <!-- Top Header Navigation / Confidential Stamp -->
        <div
          class="relative z-30 flex items-start justify-between gap-3 border-b-2 border-[#2b3a2d] pb-2 sm:pb-3"
        >
          <div class="space-y-0.5">
            <div
              class="flex items-center gap-2 text-[10px] sm:text-xs font-black tracking-widest text-emerald-400 uppercase"
            >
              <span
                class="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-ping"
              ></span>
              <span>DEFENSE INTELLIGENCE AGENCY // SECURE TERMINAL</span>
            </div>
            <div
              class="text-[9px] sm:text-[11px] text-amber-400 font-bold tracking-wider"
            >
              CLASSIFICATION: LEVEL-5 // TOP SECRET // NOFORN // STRICTLY
              RESTRICTED
            </div>
          </div>

          <div class="flex items-center gap-2 shrink-0">
            <button
              type="button"
              @click=${this.toggleSound}
              class="px-2 py-1 rounded bg-[#101a12] border border-[#2b3a2d] hover:border-emerald-500 text-[10px] text-slate-300 font-bold transition-all"
              title="Activer/Couper le son rétro"
            >
              ${this.soundEnabled ? "🔊 SON: ON" : "🔇 SON: OFF"}
            </button>

            <button
              type="button"
              @click=${(e: Event) => {
                e.stopPropagation();
                this.skip();
              }}
              class="px-2.5 py-1 rounded bg-amber-500/20 border border-amber-400/80 hover:bg-amber-500/30 text-[10px] sm:text-xs font-extrabold text-amber-300 tracking-wider uppercase animate-pulse transition-all shadow-[0_0_12px_rgba(245,158,11,0.3)]"
            >
              PASSER >>
            </button>
          </div>
        </div>

        <!-- Main Terminal Body: Real-time Military Boot Log -->
        <div
          class="relative z-30 flex-1 my-3 sm:my-5 overflow-y-auto pr-1 space-y-1 sm:space-y-1.5 font-mono text-[11px] sm:text-[13px] leading-snug"
        >
          ${this.logs.map((log) => {
            let textColor = "text-emerald-400";
            if (log.type === "amber") textColor = "text-amber-300 font-bold";
            if (log.type === "success")
              textColor = "text-[#4ade80] font-black";
            if (log.type === "cyan") textColor = "text-cyan-300 font-bold";
            if (log.type === "alert")
              textColor = "text-rose-400 font-extrabold animate-pulse";

            return html`
              <div class="flex items-start gap-2">
                <span class="text-slate-500 text-[10px] sm:text-xs shrink-0"
                  >[${log.timestamp}]</span
                >
                <span class="${textColor} break-words">${log.text}</span>
              </div>
            `;
          })}
          ${this.showBanner
            ? html`
                <div
                  class="mt-3 pt-3 border-t border-[#1e2d21] space-y-2 animate-fadeIn"
                >
                  <!-- Tactical ASCII Emblem -->
                  <pre
                    class="text-[7.5px] sm:text-[10px] md:text-[12px] font-black leading-none text-emerald-400 font-mono select-none overflow-x-hidden"
                  >
╔═══════════════════════════════════════════════════════════════════╗
║   ██████╗  ██████╗ ██████╗ ██████╗ ███████╗██████╗                ║
║   ██╔══██╗██╔═══██╗██╔══██╗██╔══██╗██╔════╝██╔══██╗               ║
║   ██████╔╝██║   ██║██████╔╝██║  ██║█████╗  ██████╔╝               ║
║   ██╔══██╗██║   ██║██╔══██╗██║  ██║██╔══╝  ██╔══██╗               ║
║   ██████╔╝╚██████╔╝██║  ██║██████╔╝███████╗██║  ██║               ║
║   ╚═════╝  ╚═════╝ ╚═╝  ╚═╝╚═════╝ ╚══════╝╚═╝  ╚═╝               ║
║             >>> BORDER CONFLICT // TACTICAL NET <<<               ║
╚═══════════════════════════════════════════════════════════════════╝
                  </pre>
                </div>
              `
            : nothing}
        </div>

        <!-- Bottom Footer: Progress Bar, Clearance & Status -->
        <div
          class="relative z-30 border-t-2 border-[#2b3a2d] pt-2 sm:pt-3 space-y-2"
        >
          <div
            class="flex items-center justify-between text-[10px] sm:text-xs font-bold font-mono"
          >
            <span
              class="${this.isComplete
                ? "text-emerald-300 font-black animate-pulse"
                : "text-amber-300"}"
            >
              ${this.isComplete
                ? "✓ ACCÈS ACCORDÉ // BIENVENUE, GÉNÉRAL."
                : "CHARGEMENT DU SYSTÈME STRATÉGIQUE..."}
            </span>
            <span class="text-emerald-400 font-mono font-black"
              >${this.progressPercent}%</span
            >
          </div>

          <!-- Progress Bar -->
          <div
            class="h-2 sm:h-2.5 w-full rounded bg-[#060e08] border border-[#2b3a2d] overflow-hidden"
          >
            <div
              class="h-full bg-gradient-to-r from-[#14532d] via-[#22c55e] to-[#4ade80] transition-all duration-100 shadow-[0_0_10px_rgba(34,197,94,0.7)]"
              style="width: ${this.progressPercent}%"
            ></div>
          </div>

          <div
            class="flex items-center justify-between text-[9px] sm:text-[10px] text-slate-400"
          >
            <span>TACTICAL OS PROTOCOL: ACTIVE</span>
            <span class="text-amber-400/90 font-bold"
              >ESPACE / CLIC POUR ENTRER DIRECTEMENT</span
            >
          </div>
        </div>
      </div>
    `;
  }
}
