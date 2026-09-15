// ---------- 1. 着色器源码 ----------
export const VERT = `#version 300 es
in vec3 aPosition;      // 顶点位置（局部空间）
in vec3 aColor;         // 顶点颜色
out vec3 vColor;        // 传给片元着色器，会被插值
void main() {
  vColor = aColor;
  gl_Position = vec4(aPosition, 1.0);   // 这里直接用局部坐标充当裁剪空间坐标
}`;

export const FRAG = `#version 300 es
precision highp float;  // 片元着色器必须声明默认精度
in vec3 vColor;
out vec4 outColor;
void main() {
  outColor = vec4(vColor, 1.0);
}`;