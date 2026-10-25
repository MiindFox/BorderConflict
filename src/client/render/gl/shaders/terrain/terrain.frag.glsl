#version 300 es
precision highp float;

// RGBA8 terrain. Alpha is a water mask written by encodeTerrainTile:
//   255 = land, 128 = shoreline water, 0 = deep water.
uniform sampler2D uTerrain;
uniform float uTime;      // seconds — animates the ocean
uniform vec2  uMapSize;   // map size in tiles

in vec2 vUV;
out vec4 fragColor;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}

bool isLandAt(ivec2 c) {
  c = clamp(c, ivec2(0), ivec2(uMapSize) - 1);
  return texelFetch(uTerrain, c, 0).a > 0.75;
}

void main() {
  vec4 t = texture(uTerrain, vUV);
  vec3 col = t.rgb;

  if (t.a < 0.75) {
    vec2 wp = vUV * uMapSize;  // world position in tiles

    // --- 1. Living open water: slow swell + drifting caustic glints ---
    float swell = sin(wp.x * 0.045 + wp.y * 0.03 + uTime * 0.55)
                * sin(wp.y * 0.05 - wp.x * 0.02 - uTime * 0.4);
    col *= 1.0 + swell * 0.035;

    float n1 = vnoise(wp * 0.09 + vec2(uTime * 0.06, uTime * 0.035));
    float n2 = vnoise(wp * 0.13 - vec2(uTime * 0.045, -uTime * 0.05));
    float caustic = smoothstep(0.90, 1.0, 1.0 - abs(n1 - n2) * 2.2);
    col += vec3(0.55, 0.75, 1.0) * caustic * 0.07;

    // --- 2. Coastal foam lapping the shoreline ---
    if (t.a > 0.25) {
      ivec2 tc = ivec2(floor(wp));
      vec2 f = fract(wp);
      // Distance (in tile fraction) from this pixel to the nearest land edge.
      float d = 2.0;
      if (isLandAt(tc + ivec2(-1, 0))) d = min(d, f.x);
      if (isLandAt(tc + ivec2( 1, 0))) d = min(d, 1.0 - f.x);
      if (isLandAt(tc + ivec2(0, -1))) d = min(d, f.y);
      if (isLandAt(tc + ivec2(0,  1))) d = min(d, 1.0 - f.y);
      if (isLandAt(tc + ivec2(-1, -1))) d = min(d, length(f));
      if (isLandAt(tc + ivec2( 1, -1))) d = min(d, length(vec2(1.0 - f.x, f.y)));
      if (isLandAt(tc + ivec2(-1,  1))) d = min(d, length(vec2(f.x, 1.0 - f.y)));
      if (isLandAt(tc + ivec2( 1,  1))) d = min(d, length(1.0 - f));

      // Waves roll in and out with a phase varying along the coast.
      float phase = vnoise(wp * 0.12) * 6.2831853;
      float wave = 0.5 + 0.5 * sin(uTime * 1.4 + phase);
      float reach = mix(0.25, 0.85, wave);
      float foam = 1.0 - smoothstep(reach - 0.22, reach, d);
      // Broken, bubbly foam texture.
      float bubbles = vnoise(wp * 3.0 + vec2(uTime * 0.4, -uTime * 0.3));
      foam *= 0.55 + 0.45 * bubbles;
      // Bright crest line at the wave front.
      float crest = (1.0 - smoothstep(0.0, 0.08, abs(d - reach))) * wave;

      col = mix(col, vec3(0.93, 0.97, 1.0), clamp(foam * 0.45 + crest * 0.35, 0.0, 0.7));
    }
  }

  fragColor = vec4(col, 1.0);
}
