#version 300 es
precision highp float;
precision highp usampler2D;

uniform usampler2D uTileTex;
uniform sampler2D uPalette;
uniform sampler2D uBorderTex;     // RGBA8 — border flags from BorderComputePass
uniform sampler2D uDefenseCoverageTex; // R8 — 1.0 = defended by same-owner post
uniform sampler2D uAffiliation;   // 256×2 RGBA8 — affiliation colors (row 0 = border)
uniform vec2 uMapSize;
uniform int uAltView;
uniform float uHighlightBrighten;
uniform float uDefenseCheckerDarken;
uniform float uEmbargoTintRatio;
uniform float uFriendlyTintRatio;
uniform vec3 uEmbargoTint;
uniform vec3 uFriendlyTint;
uniform float uTime;

in vec2 vWorldPos;
out vec4 fragColor;

void main() {
  ivec2 tc = ivec2(floor(vWorldPos));
  if (tc.x < 0 || tc.y < 0 || tc.x >= int(uMapSize.x) || tc.y >= int(uMapSize.y)) discard;

  uint raw = texelFetch(uTileTex, tc, 0).r;
  uint owner = raw & uint(OWNER_MASK);

  // Read pre-computed border flags from BorderComputePass
  vec4 borderData = texelFetch(uBorderTex, tc, 0);
  float borderType = borderData.r;      // 0=interior, ~0.5=normal, ~1.0=highlight
  float combatFrontline = borderData.g; // 0.0=none, ~0.75=rival enemy, ~1.0=embargo war
  bool defense = texelFetch(uDefenseCoverageTex, tc, 0).r > 0.5; // same-owner defense post nearby
  float relation = borderData.a;        // 0.0=neutral, ~0.5=friendly, ~1.0=embargo

  bool isBorder = borderType > 0.25;
  bool isHighlightBorder = borderType > 0.75;

  // --- Border stamp: full-brightness border color ---
  if (isBorder && owner != 0u) {
    vec3 bc;
    if (uAltView != 0) {
      // Alt-view: pure affiliation color from palette row 0
      bc = texelFetch(uAffiliation, ivec2(int(owner), 0), 0).rgb;
    } else {
      float u = (float(owner) + 0.5) / float(PALETTE_SIZE);
      bc = texture(uPalette, vec2(u, 0.75)).rgb;
      if (isHighlightBorder) {
        bc = mix(bc, vec3(1.0), uHighlightBrighten);
      }
      // Relationship tint (applied BEFORE defense checkerboard, matching game)
      if (relation > 0.75) {
        bc = mix(bc, uEmbargoTint, uEmbargoTintRatio);
      } else if (relation > 0.25) {
        bc = mix(bc, uFriendlyTint, uFriendlyTintRatio);
      }

      // =========================================================================
      // VFX OPTION 2 : BOUCLIER ÉNERGÉTIQUE DE DÉFENSE (Defense Shield Forcefield)
      // =========================================================================
      if (defense) {
        bool checker = ((tc.x + tc.y) & 1) == 1;

        // Vague de phase énergétique se propageant le long du périmètre fortifié
        float shieldWave = sin((float(tc.x + tc.y) * 0.7) - uTime * 4.0);
        float shieldSweep = smoothstep(0.35, 1.0, shieldWave) * 0.45;

        // Teinte cyan-émeraude du champ de force militaire
        vec3 shieldColor = vec3(0.2, 0.95, 0.85);

        // Nœuds énergétiques pulsés sur les cellules émettrices de la grille
        float emitterPulse = 0.5 + 0.5 * sin(uTime * 3.8 + float(tc.x * 3 + tc.y * 5) * 0.45);
        if (checker) {
          bc *= uDefenseCheckerDarken;
        } else {
          bc = mix(bc, shieldColor, 0.32 * emitterPulse);
        }

        // Balayage d'onde lumineuse de bouclier sur l'ensemble de la frontière fortifiée
        bc += shieldColor * (shieldSweep * 0.35);
      }

      // =========================================================================
      // VFX OPTION 1 : LIGNE DE FRONT DE COMBAT & ÉTINCELLES (Active Combat Frontline)
      // =========================================================================
      if (combatFrontline > 0.5) {
        // Horloge quantifiée à haute fréquence (18 fps) pour crépitements électriques rétro CRT
        float sparkTick = floor(uTime * 18.0);
        vec2 p = vec2(tc);
        float sparkHash = fract(sin(dot(p, vec2(127.1, 311.7)) + sparkTick * 43.17) * 43758.5453);

        // Onde de tension électrique parcourant la zone de friction frontalière
        float tensionHum = sin((p.x * 2.3 - p.y * 1.9) * 0.45 + uTime * 6.5) * 0.5 + 0.5;

        if (combatFrontline > 0.85) {
          // --- FRONT EN GUERRE OUVERT / EMBARGO (Alerte rouge & étincelles violentes) ---
          float alertStrobe = sin(uTime * 8.0) * 0.5 + 0.5;
          bc = mix(bc, vec3(1.0, 0.15, 0.08), 0.22 + 0.28 * alertStrobe);

          if (sparkHash > 0.80) {
            float sparkStrength = (sparkHash - 0.80) / 0.20;
            vec3 sparkColor = mix(vec3(1.0, 0.85, 0.25), vec3(1.0, 1.0, 1.0), sparkStrength);
            bc = mix(bc, sparkColor, 0.65 + 0.35 * sparkStrength);
          } else {
            bc += vec3(0.25, 0.08, 0.0) * tensionHum;
          }
        } else {
          // --- LIGNE DE FRONT RIVALE / FFA (Arcs électriques cyan/or & crépitement) ---
          if (sparkHash > 0.84) {
            float sparkStrength = (sparkHash - 0.84) / 0.16;
            vec3 sparkColor = mix(vec3(0.35, 0.85, 1.0), vec3(1.0, 1.0, 1.0), sparkStrength);
            bc = mix(bc, sparkColor, 0.60 + 0.40 * sparkStrength);
          } else {
            bc += vec3(0.12, 0.22, 0.32) * (tensionHum * 0.45);
          }
        }
      }
    }
    fragColor = vec4(bc, 1.0);
    return;
  }

  discard;
}
