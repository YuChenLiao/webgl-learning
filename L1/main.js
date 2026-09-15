import createProgram from "./compile/compile.js";
import { VERT, FRAG } from "./gl/gl.js";

const canvas = document.getElementById('gl');
const gl = canvas.getContext('webgl2', { alpha: false, antialias: true });
if (!gl) throw new Error('当前环境不支持 WebGL 2');


const program = createProgram(gl, VERT, FRAG);
gl.useProgram(program);

// ---------- 3. 顶点数据：每顶点 6 个 float（位置 xyz + 颜色 rgb）----------
const STRIDE = 6 * 4;
const vertices = new Float32Array([
  //   x      y     z      r      g      b
  0.0, 0.6, 0.0, 1.0, 0.35, 0.25,
  -0.6, -0.4, 0.0, 0.25, 0.6, 1.0,
  0.6, -0.4, 0.0, 1.0, 0.85, 0.25,
]);

const vao = gl.createVertexArray();
gl.bindVertexArray(vao);

const vbo = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

const aPosition = gl.getAttribLocation(program, 'aPosition');
const aColor = gl.getAttribLocation(program, 'aColor');

gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, STRIDE, 0);
gl.enableVertexAttribArray(aPosition);
gl.vertexAttribPointer(aColor, 3, gl.FLOAT, false, STRIDE, 12);
gl.enableVertexAttribArray(aColor);

gl.bindVertexArray(null);

// ---------- 4. 尺寸与视口 ----------
function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(canvas.clientWidth * dpr);
  canvas.height = Math.floor(canvas.clientHeight * dpr);
  gl.viewport(0, 0, canvas.width, canvas.height);
}
window.addEventListener('resize', resize);
resize();

// ---------- 5. 渲染 ----------
function render() {
  gl.clearColor(0.043, 0.051, 0.063, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.bindVertexArray(vao);
  gl.drawArrays(gl.TRIANGLES, 0, 3);   // 从第 0 个顶点开始画 3 个
  requestAnimationFrame(render);
}
render();