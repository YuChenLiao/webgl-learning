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