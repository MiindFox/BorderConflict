import { html, LitElement, type PropertyValues } from "lit";
import { customElement, query, state } from "lit/decorators.js";
import { commanderStore, COMMANDER_UPDATED_EVENT } from "../CommanderStore";
import { UserSettings } from "../UserSettings";
import { showToast } from "../Utils";
import "./CurrencyDisplay";

const PRESET_ICONS = [
  {
    name: "Tête de Mort Nucléaire",
    svg: `<svg viewBox="0 0 100 100" fill="#22d3ee"><path d="M50 15 C30 15 20 28 20 45 C20 58 28 66 32 72 L32 82 L42 82 L42 75 L46 75 L46 82 L54 82 L54 75 L58 75 L58 82 L68 82 L68 72 C72 66 80 58 80 45 C80 28 70 15 50 15 Z M35 48 C30 48 30 40 35 40 C40 40 40 48 35 48 Z M65 48 C60 48 60 40 65 40 C70 40 70 48 65 48 Z M50 55 L45 64 L55 64 Z"/></svg>`,
  },
  {
    name: "Aigle Impérial",
    svg: `<svg viewBox="0 0 100 100" fill="#f59e0b"><path d="M50 10 L44 25 L30 20 L36 34 L18 35 L30 46 L10 56 L30 60 L20 78 L38 72 L36 90 L50 78 L64 90 L62 72 L80 78 L70 60 L90 56 L70 46 L82 35 L64 34 L70 20 L56 25 Z"/></svg>`,
  },
  {
    name: "Foudre Plasma",
    svg: `<svg viewBox="0 0 100 100" fill="#ec4899"><polygon points="56,5 18,52 46,52 38,95 82,42 54,42"/></svg>`,
  },
  {
    name: "Symbole Biohazard",
    svg: `<svg viewBox="0 0 100 100" fill="#10b981"><circle cx="50" cy="50" r="12"/><path d="M50 20 A22 22 0 0 0 32 30 A24 24 0 1 1 68 30 A22 22 0 0 0 50 20 Z M26 62 A22 22 0 0 0 42 70 A24 24 0 1 1 20 40 A22 22 0 0 0 26 62 Z M74 62 A22 22 0 0 0 80 40 A24 24 0 1 1 58 70 A22 22 0 0 0 74 62 Z"/></svg>`,
  },
  {
    name: "Étoile Suprême",
    svg: `<svg viewBox="0 0 100 100" fill="#38bdf8"><polygon points="50,5 64,36 98,36 70,57 81,91 50,70 19,91 30,57 2,36 36,36"/></svg>`,
  },
];

const TERRITORY_SWATCHES = [
  { name: "Cobalt", color: "#2563eb", border: "#60a5fa" },
  { name: "Crimson", color: "#dc2626", border: "#f87171" },
  { name: "Émeraude", color: "#059669", border: "#34d399" },
  { name: "Solaire", color: "#d97706", border: "#fbbf24" },
  { name: "Néon", color: "#7c3aed", border: "#c084fc" },
  { name: "Furtif", color: "#334155", border: "#94a3b8" },
];

@customElement("custom-skin-studio")
export class CustomSkinStudio extends LitElement {
  createRenderRoot() {
    return this;
  }

  @query("#previewCanvas") private canvas!: HTMLCanvasElement;
  @query("#fileInput") private fileInput!: HTMLInputElement;

  @state() private currentImage: HTMLImageElement | null = null;
  @state() private imageScale = 1.0;
  @state() private imageOpacity = 0.9;
  @state() private imageRotation = 0;
  @state() private imageOffsetX = 0;
  @state() private imageOffsetY = 0;
  @state() private selectedBlendMode: GlobalCompositeOperation = "source-over";
  @state() private territoryColorIndex = 0;
  @state() private isSaving = false;
  @state() private isDragging = false;
  @state() private dragStartX = 0;
  @state() private dragStartY = 0;

  private userSettings = new UserSettings();

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener(COMMANDER_UPDATED_EVENT, this.onProfileUpdated);
    // Load existing custom skin if present
    const existingUrl = commanderStore.getCustomSkinUrl();
    if (existingUrl) {
      this.loadImageFromUrl(existingUrl);
    } else {
      // Load first preset by default
      this.loadSvgPreset(PRESET_ICONS[0].svg);
    }
  }

  disconnectedCallback() {
    window.removeEventListener(COMMANDER_UPDATED_EVENT, this.onProfileUpdated);
    super.disconnectedCallback();
  }

  private onProfileUpdated = () => {
    this.requestUpdate();
  };

  protected firstUpdated(_changed: PropertyValues) {
    super.firstUpdated(_changed);
    this.redrawCanvas();
  }

  private loadImageFromUrl(url: string) {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      this.currentImage = img;
      this.redrawCanvas();
    };
    img.src = url;
  }

  private loadSvgPreset(svgMarkup: string) {
    const blob = new Blob([svgMarkup], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      this.currentImage = img;
      URL.revokeObjectURL(url);
      this.redrawCanvas();
    };
    img.src = url;
  }

  private onFileChange(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast("Veuillez sélectionner un fichier image valide (PNG, JPG, WEBP).", "red");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast("L'image ne doit pas dépasser 5 Mo.", "red");
      return;
    }

    const reader = new FileReader();
    reader.onload = (readEv) => {
      const dataUrl = readEv.target?.result as string;
      const img = new Image();
      img.onload = () => {
        this.currentImage = img;
        this.imageOffsetX = 0;
        this.imageOffsetY = 0;
        this.imageScale = 1.0;
        this.redrawCanvas();
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }

  private redrawCanvas() {
    if (!this.canvas) return;
    const ctx = this.canvas.getContext("2d");
    if (!ctx) return;

    const w = this.canvas.width;
    const h = this.canvas.height;
    ctx.clearRect(0, 0, w, h);

    const swatch = TERRITORY_SWATCHES[this.territoryColorIndex];

    // 1. Draw Simulated In-Game Territory Ground
    ctx.fillStyle = "#090d16";
    ctx.fillRect(0, 0, w, h);

    // Subtle Hexagonal territory borders
    ctx.save();
    ctx.strokeStyle = swatch.border;
    ctx.lineWidth = 2.5;
    ctx.globalAlpha = 0.45;

    const hexRadius = 45;
    const hexHeight = hexRadius * Math.sqrt(3);
    for (let y = 0; y < h + hexHeight; y += hexHeight) {
      for (let x = 0; x < w + hexRadius * 3; x += hexRadius * 3) {
        this.drawHexagon(ctx, x, y, hexRadius);
        this.drawHexagon(ctx, x + hexRadius * 1.5, y + hexHeight / 2, hexRadius);
      }
    }
    ctx.stroke();
    ctx.restore();

    // Territory Color Tint Glow
    const gradient = ctx.createRadialGradient(w / 2, h / 2, 40, w / 2, h / 2, w / 1.8);
    gradient.addColorStop(0, swatch.color + "99");
    gradient.addColorStop(0.7, swatch.color + "44");
    gradient.addColorStop(1, swatch.color + "11");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    // 2. Draw Custom Player Image
    if (this.currentImage) {
      ctx.save();
      ctx.translate(w / 2 + this.imageOffsetX, h / 2 + this.imageOffsetY);
      ctx.rotate((this.imageRotation * Math.PI) / 180);
      ctx.globalAlpha = Math.max(0.1, Math.min(1, this.imageOpacity));
      ctx.globalCompositeOperation = this.selectedBlendMode;

      const imgAspect = this.currentImage.width / this.currentImage.height;
      let drawW = (w * 0.7) * this.imageScale;
      let drawH = drawW / imgAspect;

      ctx.drawImage(this.currentImage, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore();
    }

    // 3. Tactical Reticle / Frame Overlay
    ctx.save();
    ctx.strokeStyle = "rgba(6, 182, 212, 0.4)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([8, 8]);
    ctx.strokeRect(20, 20, w - 40, h - 40);

    // Corner targeting marks
    const cl = 20;
    ctx.strokeStyle = "#06b6d4";
    ctx.lineWidth = 3;
    ctx.setLineDash([]);
    // Top-left
    ctx.beginPath();
    ctx.moveTo(15, 15 + cl);
    ctx.lineTo(15, 15);
    ctx.lineTo(15 + cl, 15);
    // Top-right
    ctx.moveTo(w - 15 - cl, 15);
    ctx.lineTo(w - 15, 15);
    ctx.lineTo(w - 15, 15 + cl);
    // Bottom-left
    ctx.moveTo(15, h - 15 - cl);
    ctx.lineTo(15, h - 15);
    ctx.lineTo(15 + cl, h - 15);
    // Bottom-right
    ctx.moveTo(w - 15 - cl, h - 15);
    ctx.lineTo(w - 15, h - 15);
    ctx.lineTo(w - 15, h - 15 - cl);
    ctx.stroke();

    ctx.restore();
  }

  private drawHexagon(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i;
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }

  // Interactive Dragging on Canvas
  private onMouseDown(e: MouseEvent) {
    this.isDragging = true;
    this.dragStartX = e.clientX - this.imageOffsetX;
    this.dragStartY = e.clientY - this.imageOffsetY;
  }

  private onMouseMove(e: MouseEvent) {
    if (!this.isDragging) return;
    this.imageOffsetX = e.clientX - this.dragStartX;
    this.imageOffsetY = e.clientY - this.dragStartY;
    this.redrawCanvas();
  }

  private onMouseUp() {
    this.isDragging = false;
  }

  private onTouchStart(e: TouchEvent) {
    if (e.touches.length === 1) {
      this.isDragging = true;
      this.dragStartX = e.touches[0].clientX - this.imageOffsetX;
      this.dragStartY = e.touches[0].clientY - this.imageOffsetY;
    }
  }

  private onTouchMove(e: TouchEvent) {
    if (!this.isDragging || e.touches.length !== 1) return;
    this.imageOffsetX = e.touches[0].clientX - this.dragStartX;
    this.imageOffsetY = e.touches[0].clientY - this.dragStartY;
    this.redrawCanvas();
  }

  private onTouchEnd() {
    this.isDragging = false;
  }

  // Baking Final High-Res 1024x1024 PNG for WebGL Skin Atlas
  private generateHighResTexture(): string {
    const offscreen = document.createElement("canvas");
    offscreen.width = 1024;
    offscreen.height = 1024;
    const ctx = offscreen.getContext("2d");
    if (!ctx || !this.currentImage) return "";

    const w = 1024;
    const h = 1024;
    ctx.clearRect(0, 0, w, h);

    ctx.save();
    const ratio = w / this.canvas.width;
    ctx.translate(w / 2 + this.imageOffsetX * ratio, h / 2 + this.imageOffsetY * ratio);
    ctx.rotate((this.imageRotation * Math.PI) / 180);
    ctx.globalAlpha = Math.max(0.1, Math.min(1, this.imageOpacity));
    ctx.globalCompositeOperation = this.selectedBlendMode;

    const imgAspect = this.currentImage.width / this.currentImage.height;
    let drawW = (w * 0.75) * this.imageScale;
    let drawH = drawW / imgAspect;

    ctx.drawImage(this.currentImage, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();

    return offscreen.toDataURL("image/png");
  }

  private async handleSaveAndEquip() {
    if (!this.currentImage) {
      showToast("Veuillez importer ou sélectionner une image avant de sauvegarder.", "red");
      return;
    }

    const hasUnlocked = commanderStore.hasCustomSkinUnlocked();
    if (!hasUnlocked) {
      showToast("Veuillez débloquer la Forge de Skin pour sauvegarder votre skin.", "red");
      return;
    }

    this.isSaving = true;
    try {
      const dataUrl = this.generateHighResTexture();
      const profile = commanderStore.getProfile();
      const email = profile.email || "";
      const publicId = profile.username || "cmd";

      const res = await fetch("/api/custom-skin/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          publicId,
          imageBase64: dataUrl,
        }),
      });

      const data = await res.json();
      if (!data.ok) {
        showToast(data.error || "Erreur lors de la sauvegarde du skin.", "red");
        return;
      }

      // Equip skin locally & save to commanderStore
      const skinName = `custom_${publicId}`;
      commanderStore.setCustomSkin(data.skinUrl, skinName);
      this.userSettings.setSelectedPatternName(`skin:${skinName}`);

      showToast("🎉 Skin de Territoire forgé et équipé avec succès ! Vos troupes arborent votre emblème !", "green");
    } catch (e: any) {
      showToast("Erreur de communication avec le serveur.", "red");
    } finally {
      this.isSaving = false;
    }
  }

  private async handleBuyPassStripe() {
    const profile = commanderStore.getProfile();
    let email = profile.email;
    if (!email) {
      email = window.prompt("Entrez votre adresse email pour la confirmation Stripe :", "") || "";
    }
    if (!email || !email.includes("@")) {
      showToast("Adresse email requise pour le paiement Stripe.", "red");
      return;
    }

    try {
      const res = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bundleId: "custom_skin_pass",
          email: email.trim().toLowerCase(),
        }),
      });

      const data = await res.json();
      if (data.ok && data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        showToast(data.error || "Impossible d'initialiser Stripe.", "red");
      }
    } catch {
      showToast("Erreur réseau avec Stripe.", "red");
    }
  }

  private async handleUnlockWithPlutonium() {
    const profile = commanderStore.getProfile();
    if (profile.plutonium < 750) {
      showToast(`Plutonium insuffisant : 750 requis (vous avez ${profile.plutonium} Plutonium).`, "red");
      return;
    }

    if (!window.confirm("Débloquer la Forge de Skin à vie pour 750 Plutonium ?")) {
      return;
    }

    commanderStore.addCurrency(-750, 0);
    const publicId = profile.username || "cmd";
    commanderStore.setCustomSkin(
      commanderStore.getCustomSkinUrl() || "",
      `custom_${publicId}`
    );
    showToast("🎉 Forge de Skin débloquée pour 750 Plutonium ! Vous pouvez maintenant sauvegarder.", "green");
    this.requestUpdate();
  }

  render() {
    const hasUnlocked = commanderStore.hasCustomSkinUnlocked();
    const isVip = commanderStore.isVipActive();
    const profile = commanderStore.getProfile();

    return html`
      <div class="w-full flex flex-col gap-6 p-4 md:p-6 text-slate-100 font-sans select-none">
        <!-- Header Banner -->
        <div class="rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-cyan-950/40 via-slate-900/90 to-purple-950/40 p-5 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4">
          <div class="space-y-1 text-center md:text-left">
            <div class="flex items-center justify-center md:justify-start gap-2">
              <span class="text-3xl">🎨</span>
              <h2 class="text-xl font-black uppercase tracking-wider text-cyan-300">
                Atelier & Forge de Skin de Territoire
              </h2>
              <span class="rounded bg-cyan-400 text-slate-950 text-[10px] font-black px-2 py-0.5 uppercase tracking-widest">
                HD 1024×1024
              </span>
            </div>
            <p class="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Importez votre propre logo, emblème ou illustration pour remplacer les motifs standards en jeu.
              Votre image sera <strong class="text-cyan-300">projetée en temps réel sur l'ensemble de votre territoire</strong> et visible par tous les joueurs adverses !
            </p>
          </div>

          <!-- Unlocked Status Badge -->
          <div class="shrink-0">
            ${hasUnlocked
              ? html`
                  <div class="rounded-xl border border-emerald-500/40 bg-emerald-950/40 px-4 py-2 text-center shadow-lg">
                    <span class="text-xs font-black uppercase text-emerald-300 tracking-wider flex items-center gap-1.5">
                      <span>👑</span>
                      <span>${isVip ? "Avantage VIP Actif" : "Forge Débloquée à Vie"}</span>
                    </span>
                    <span class="block text-[10px] text-emerald-400/80">Création & sauvegardes illimitées</span>
                  </div>
                `
              : html`
                  <div class="rounded-xl border border-amber-500/40 bg-amber-950/40 px-4 py-2 text-center shadow-lg">
                    <span class="text-xs font-black uppercase text-amber-300 tracking-wider flex items-center gap-1.5">
                      <span>🔒</span>
                      <span>Forge Verrouillée</span>
                    </span>
                    <span class="block text-[10px] text-amber-400/80">3,99 € · 750 Plutonium · ou VIP</span>
                  </div>
                `}
          </div>
        </div>

        <!-- Main Studio Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <!-- Left: Interactive Canvas Viewport (7 Cols) -->
          <div class="lg:col-span-7 flex flex-col items-center gap-4 bg-slate-900/90 border border-white/10 rounded-2xl p-5 shadow-xl relative overflow-hidden">
            <div class="w-full flex items-center justify-between">
              <span class="text-xs font-mono font-black text-cyan-400 uppercase tracking-widest flex items-center gap-1.5">
                <span>🛰️ APERÇU DE COMBAT EN DIRECT</span>
              </span>
              <span class="text-[11px] text-slate-400">
                Faites glisser la souris sur le terrain pour déplacer
              </span>
            </div>

            <!-- Canvas Element -->
            <div class="relative w-full max-w-[460px] aspect-square rounded-2xl overflow-hidden shadow-2xl border-2 border-cyan-500/30 cursor-grab active:cursor-grabbing">
              <canvas
                id="previewCanvas"
                width="600"
                height="600"
                class="w-full h-full block"
                @mousedown=${this.onMouseDown}
                @mousemove=${this.onMouseMove}
                @mouseup=${this.onMouseUp}
                @mouseleave=${this.onMouseUp}
                @touchstart=${this.onTouchStart}
                @touchmove=${this.onTouchMove}
                @touchend=${this.onTouchEnd}
              ></canvas>
            </div>

            <!-- Territory Background Color Switcher -->
            <div class="w-full flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/10">
              <span class="text-xs font-bold text-slate-300">Couleur d'équipe simulée :</span>
              <div class="flex items-center gap-2">
                ${TERRITORY_SWATCHES.map(
                  (swatch, idx) => html`
                    <button
                      type="button"
                      @click=${() => {
                        this.territoryColorIndex = idx;
                        this.redrawCanvas();
                      }}
                      title=${swatch.name}
                      style="background-color: ${swatch.color}; border-color: ${this.territoryColorIndex === idx ? '#ffffff' : swatch.border};"
                      class="w-7 h-7 rounded-full border-2 transition-all shadow-md ${this.territoryColorIndex === idx
                        ? 'scale-125 shadow-[0_0_12px_#ffffff]'
                        : 'opacity-70 hover:opacity-100 hover:scale-110'}"
                    ></button>
                  `
                )}
              </div>
            </div>
          </div>

          <!-- Right: Controls & Import Options (5 Cols) -->
          <div class="lg:col-span-5 flex flex-col justify-between gap-5 bg-slate-900/90 border border-white/10 rounded-2xl p-5 shadow-xl">
            <div class="space-y-4">
              <!-- File Upload Action -->
              <div>
                <label class="block text-xs font-mono font-black text-cyan-400 uppercase tracking-widest mb-2">
                  1. Importer Votre Image
                </label>
                <input
                  id="fileInput"
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  class="hidden"
                  @change=${this.onFileChange}
                />
                <button
                  type="button"
                  @click=${() => this.fileInput.click()}
                  class="w-full cursor-pointer rounded-xl border-2 border-dashed border-cyan-500/40 hover:border-cyan-400 bg-cyan-950/20 hover:bg-cyan-950/40 p-4 transition-all flex flex-col items-center justify-center gap-1 group text-center"
                >
                  <span class="text-2xl group-hover:scale-110 transition-transform">📁</span>
                  <span class="text-xs font-bold text-cyan-300">Sélectionner une Image (PNG, JPG, WEBP)</span>
                  <span class="text-[10px] text-slate-400">Glissez ou parcourez · Résolution max conseillée : 1024×1024</span>
                </button>
              </div>

              <!-- Quick Tactical Presets -->
              <div>
                <label class="block text-xs font-mono font-black text-slate-400 uppercase tracking-widest mb-1.5">
                  Ou choisir un insigne pré-configuré :
                </label>
                <div class="grid grid-cols-5 gap-2">
                  ${PRESET_ICONS.map(
                    (p) => html`
                      <button
                        type="button"
                        @click=${() => this.loadSvgPreset(p.svg)}
                        title=${p.name}
                        class="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-white/10 hover:border-cyan-400/50 transition-all flex items-center justify-center hover:scale-105 active:scale-95"
                      >
                        <div class="w-7 h-7 flex items-center justify-center">
                          ${html([p.svg] as any)}
                        </div>
                      </button>
                    `
                  )}
                </div>
              </div>

              <!-- Sliders: Zoom, Opacity, Rotation -->
              <div class="space-y-3 pt-3 border-t border-white/10">
                <label class="block text-xs font-mono font-black text-cyan-400 uppercase tracking-widest">
                  2. Ajuster le Rendu Tactique
                </label>

                <!-- Zoom -->
                <div>
                  <div class="flex justify-between text-xs text-slate-300 font-medium mb-1">
                    <span>Échelle / Zoom :</span>
                    <span class="font-mono text-cyan-400">${Math.round(this.imageScale * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.3"
                    max="2.5"
                    step="0.05"
                    .value=${String(this.imageScale)}
                    @input=${(e: Event) => {
                      this.imageScale = parseFloat((e.target as HTMLInputElement).value);
                      this.redrawCanvas();
                    }}
                    class="w-full accent-cyan-400 cursor-pointer"
                  />
                </div>

                <!-- Opacity -->
                <div>
                  <div class="flex justify-between text-xs text-slate-300 font-medium mb-1">
                    <span>Opacité :</span>
                    <span class="font-mono text-cyan-400">${Math.round(this.imageOpacity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="1.0"
                    step="0.05"
                    .value=${String(this.imageOpacity)}
                    @input=${(e: Event) => {
                      this.imageOpacity = parseFloat((e.target as HTMLInputElement).value);
                      this.redrawCanvas();
                    }}
                    class="w-full accent-cyan-400 cursor-pointer"
                  />
                </div>

                <!-- Rotation -->
                <div>
                  <div class="flex justify-between text-xs text-slate-300 font-medium mb-1">
                    <span>Rotation :</span>
                    <span class="font-mono text-cyan-400">${this.imageRotation}°</span>
                  </div>
                  <input
                    type="range"
                    min="-180"
                    max="180"
                    step="5"
                    .value=${String(this.imageRotation)}
                    @input=${(e: Event) => {
                      this.imageRotation = parseInt((e.target as HTMLInputElement).value, 10);
                      this.redrawCanvas();
                    }}
                    class="w-full accent-cyan-400 cursor-pointer"
                  />
                </div>

                <!-- Fusion Mode Selector -->
                <div>
                  <div class="flex justify-between text-xs text-slate-300 font-medium mb-1">
                    <span>Mode d'incrustation sur le terrain :</span>
                  </div>
                  <select
                    .value=${this.selectedBlendMode}
                    @change=${(e: Event) => {
                      this.selectedBlendMode = (e.target as HTMLSelectElement).value as GlobalCompositeOperation;
                      this.redrawCanvas();
                    }}
                    class="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-cyan-400"
                  >
                    <option value="source-over">Standard (Couleurs Directes)</option>
                    <option value="overlay">Incrustation Tactique (Fusion avec le Terrain)</option>
                    <option value="screen">Éclat Holographique / Néon</option>
                    <option value="multiply">Camouflage Sombre / Ombré</option>
                  </select>
                </div>
              </div>
            </div>

            <!-- Bottom Unlock / Save Action -->
            <div class="pt-4 border-t border-white/10 space-y-3">
              ${hasUnlocked
                ? html`
                    <button
                      type="button"
                      @click=${this.handleSaveAndEquip}
                      ?disabled=${this.isSaving}
                      class="w-full cursor-pointer rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 py-3.5 text-xs font-black uppercase tracking-wider text-slate-950 transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
                    >
                      <span>${this.isSaving ? "⏳ FORGE EN COURS..." : "⚔️ FORGER & ÉQUIPER CE SKIN EN JEU"}</span>
                    </button>
                  `
                : html`
                    <div class="space-y-2">
                      <div class="text-[11px] font-bold text-slate-400 text-center uppercase tracking-wider">
                        Options de déblocage de la Forge :
                      </div>

                      <button
                        type="button"
                        @click=${this.handleBuyPassStripe}
                        class="w-full cursor-pointer rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 py-2.5 text-xs font-black uppercase tracking-wider text-slate-950 transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
                      >
                        <span>💳 Débloquer à Vie · 3,99 € (Stripe)</span>
                      </button>

                      <div class="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          @click=${this.handleUnlockWithPlutonium}
                          class="cursor-pointer rounded-xl bg-slate-800 hover:bg-slate-700 border border-cyan-500/40 py-2 text-[11px] font-extrabold uppercase tracking-wider text-cyan-300 transition-all shadow-sm flex items-center justify-center gap-1.5"
                        >
                          <span>750</span>
                          <plutonium-icon .size=${14}></plutonium-icon>
                          <span>Plutonium</span>
                        </button>

                        <button
                          type="button"
                          @click=${() => this.dispatchEvent(new CustomEvent("switch-tab", { detail: { key: "bundles" }, bubbles: true, composed: true }))}
                          class="cursor-pointer rounded-xl bg-slate-800 hover:bg-slate-700 border border-amber-400/40 py-2 text-[11px] font-extrabold uppercase tracking-wider text-amber-300 transition-all shadow-sm flex items-center justify-center gap-1.5"
                        >
                          <span>👑 VIP 2,99 €/m</span>
                        </button>
                      </div>
                    </div>
                  `}
            </div>
          </div>
        </div>
      </div>
    `;
  }
}
