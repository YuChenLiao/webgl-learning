// ① 着色器：照抄下面的 GLSL 内容，包进反引号即可（无需 Vite、无需插件、无需 .glsl 文件）
export const VERT = `#version 300 es
in vec3 aPosition;
in vec3 aNormal;
in vec2 aUv;
uniform mat4 uModelMatrix;
uniform mat4 uViewProjectionMatrix;
uniform mat3 uNormalMatrix;
out vec3 vWorldPos;
out vec3 vNormal;
out vec2 vUv;
void main() {
  vec4 worldPos = uModelMatrix * vec4(aPosition, 1.0);
  vWorldPos = worldPos.xyz;
  vNormal = uNormalMatrix * aNormal;
  vUv = aUv;
  gl_Position = uViewProjectionMatrix * worldPos;
}`;

export const FRAG = `#version 300 es
precision highp float;
in vec3 vWorldPos;
in vec3 vNormal;
in vec2 vUv;
uniform sampler2D uBaseMap;
uniform vec3 uLightPos;
uniform vec3 uLightColor;
uniform vec3 uCameraPos;
uniform vec3 uAmbientColor;
out vec4 outColor;

void main() {
  vec3 albedo = texture(uBaseMap, vUv).rgb;

  vec3 N = normalize(vNormal);
  vec3 L = normalize(uLightPos - vWorldPos);
  vec3 V = normalize(uCameraPos - vWorldPos);
  vec3 H = normalize(L + V);

  float dist = length(uLightPos - vWorldPos);
  float atten = 1.0 / (1.0 + 0.15 * dist + 0.02 * dist * dist);   // 距离衰减

  float diff = max(dot(N, L), 0.0);                        // 漫反射
  float spec = pow(max(dot(N, H), 0.0), 96.0);             // 高光，指数越大越锐
  float rim = pow(1.0 - max(dot(N, V), 0.0), 2.5);         // 边缘光

  vec3 color = albedo * (uAmbientColor + uLightColor * diff * atten)
             + uLightColor * spec * atten * 0.8
             + vec3(0.35, 0.55, 0.9) * rim * 0.4;

  outColor = vec4(pow(color, vec3(1.0 / 2.2)), 1.0);       // 伽马编码后输出
}
`;

export const POST_VERT = `#version 300 es
in vec2 aPosition;
out vec2 vUv;
void main() {
  vUv = aPosition * 0.5 + 0.5;        // 裁剪空间 [-1,1] → 纹理坐标 [0,1]
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

export const POST_FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uScene;
uniform vec2 uResolution;
uniform float uVignette;      // 暗角强度
uniform float uAberration;    // 色差强度
uniform float uPostAmount;    // 0 = 直通（等价于 L3 直接渲染），1 = 完整后处理链

out vec4 outColor;

void main() {
  vec2 uv = vUv;

  // 先原样采一份，作为「直出」的基准。uPostAmount 为 0 时输出它就等于 L3 的画面。
  vec3 base = texture(uScene, uv).rgb;

  // ---- 径向色差：R/G/B 三个通道按不同缩放采样 ----
  vec2 dir = uv - 0.5;
  float r = texture(uScene, uv - dir * uAberration).r;
  float g = texture(uScene, uv).g;
  float b = texture(uScene, uv + dir * uAberration).b;
  vec3 color = vec3(r, g, b);

  // ---- 暗角：距离中心越远越暗 ----
  // 手册写的是 smoothstep(0.85, 0.25, d)，但 GLSL ES 3.00 规定
  // smoothstep 在 edge0 >= edge1 时结果是 undefined，各驱动不一定一致。
  // 下面这个写法与它逐点等价（smooth(t) = 1 - smooth(1 - t)），且规范安全。
  float d = length(dir);
  float vignette = 1.0 - smoothstep(0.25, 0.85, d);
  color *= mix(1.0, vignette, uVignette);

  // ---- 灰度混合（示例：饱和度 0.75，保留一点颜色）----
  float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
  color = mix(color, vec3(luma), 0.25);

  // 在「后处理结果」与「直通原图」之间插值：0 直出、1 全效果，中间值是切换时的过渡
  outColor = vec4(mix(base, color, uPostAmount), 1.0);
}`;
