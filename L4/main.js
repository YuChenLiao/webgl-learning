import { mat4, mat3 } from 'gl-matrix';

import OrbitCamera from './utils/camera.js'
import { createProgram } from './compile/compile.js';
import createSphereGeometry from './utils/ball.js';
import { createFullscreenTriangle } from './utils/fullscreen-triangle.js';
import { VERT, FRAG, POST_FRAG, POST_VERT } from './gl/gl.js';

const canvas = document.getElementById('gl');
const gl = canvas.getContext('webgl2', { alpha: false, antialias: true });
if (!gl) throw new Error('当前环境不支持 WebGL 2');

// ---- 尺寸与视口 ----
function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(canvas.clientWidth * dpr);
  canvas.height = Math.floor(canvas.clientHeight * dpr);
  gl.viewport(0, 0, canvas.width, canvas.height);
}
window.addEventListener('resize', resize);
resize();

// ---- 渲染状态 ----
gl.enable(gl.DEPTH_TEST);    // 球体要正确遮挡，必须开深度测试
gl.enable(gl.CULL_FACE);

// L4 有两个 program：program 画场景（L3 的），postProgram 做后处理
const postProgram = createProgram(POST_VERT, POST_FRAG);

// 不要假设全屏三角形的属性位置一定是 0，查出来更稳妥
const aFullscreenPos = gl.getAttribLocation(postProgram, 'aPosition');
const rts = [];    // 两个 render target 可做乒乓（模糊来回采样时用）
function resizeTargets() {
  rts.forEach((rt) => {
    gl.deleteFramebuffer(rt.framebuffer);
    gl.deleteTexture(rt.colorTexture);
    gl.deleteRenderbuffer(rt.depthBuffer);
  });
  rts.length = 0;
  // 离屏分辨率可以低于屏幕，后处理对分辨率不敏感时能省大量填充率
  rts.push(createRenderTarget(gl, canvas.width, canvas.height));
  rts.push(createRenderTarget(gl, canvas.width, canvas.height));
}

const fullscreenVao = createFullscreenTriangle(gl);

function renderFrame(time) {
  // ---------- Pass 1：场景 → 离屏纹理 ----------
  gl.bindFramebuffer(gl.FRAMEBUFFER, rts[0].framebuffer);
  gl.viewport(0, 0, rts[0].width, rts[0].height);
  gl.enable(gl.DEPTH_TEST);
  gl.clearColor(0.043, 0.051, 0.063, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  renderScene(time);                    // 前面案例里的球体绘制

  // ---------- Pass 2：后处理 → 屏幕 ----------
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.disable(gl.DEPTH_TEST);            // 全屏绘制不需要深度
  gl.disable(gl.CULL_FACE);             // 全屏三角形的绕序无所谓，但关掉更保险
  gl.clear(gl.COLOR_BUFFER_BIT);

  gl.useProgram(postProgram);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, rts[0].colorTexture);
  gl.uniform1i(postUniforms.uScene, 0);
  gl.uniform2f(postUniforms.uResolution, canvas.width, canvas.height);
  gl.uniform1f(postUniforms.uVignette, 0.65);
  gl.uniform1f(postUniforms.uAberration, 0.004);

  gl.bindVertexArray(fullscreenVao);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
}

const postUniforms = {
  uScene: gl.getUniformLocation(postProgram, 'uScene'),
  uResolution: gl.getUniformLocation(postProgram, 'uResolution'),
  uVignette: gl.getUniformLocation(postProgram, 'uVignette'),
  uAberration: gl.getUniformLocation(postProgram, 'uAberration'),
};

const program = createProgram(gl, VERT, FRAG);

gl.useProgram(program);

const geometry = createSphereGeometry(1.4, 64, 40);
// 顶点数 = (64 + 1) × (40 + 1) = 2665，索引数 = 64 × 40 × 6 = 15360
// 2665 < 65535，所以索引可以用 Uint16

// ---------- 交错成一个数组：[x, y, z, nx, ny, nz, u, v] ----------
const FLOATS_PER_VERTEX = 8;
const STRIDE = FLOATS_PER_VERTEX * 4;             // 32 字节
const vertexCount = geometry.positions.length / 3;
const interleaved = new Float32Array(vertexCount * FLOATS_PER_VERTEX);

for (let i = 0; i < vertexCount; i++) {
  const o = i * FLOATS_PER_VERTEX;
  interleaved[o] = geometry.positions[i * 3];
  interleaved[o + 1] = geometry.positions[i * 3 + 1];
  interleaved[o + 2] = geometry.positions[i * 3 + 2];
  interleaved[o + 3] = geometry.normals[i * 3];
  interleaved[o + 4] = geometry.normals[i * 3 + 1];
  interleaved[o + 5] = geometry.normals[i * 3 + 2];
  interleaved[o + 6] = geometry.uvs[i * 2];
  interleaved[o + 7] = geometry.uvs[i * 2 + 1];
}

// ---------- VAO：一次记录全部属性绑定 ----------
const vao = gl.createVertexArray();
gl.bindVertexArray(vao);

const vbo = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
gl.bufferData(gl.ARRAY_BUFFER, interleaved, gl.STATIC_DRAW);

// 用 getAttribLocation 动态查询，而不是硬编码 0/1/2
const aPosition = gl.getAttribLocation(program, 'aPosition');
const aNormal = gl.getAttribLocation(program, 'aNormal');
const aUv = gl.getAttribLocation(program, 'aUv');

gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, STRIDE, 0);    // 位置：偏移 0
gl.enableVertexAttribArray(aPosition);
gl.vertexAttribPointer(aNormal, 3, gl.FLOAT, false, STRIDE, 12);     // 法线：偏移 12 字节
gl.enableVertexAttribArray(aNormal);
gl.vertexAttribPointer(aUv, 2, gl.FLOAT, false, STRIDE, 24);         // UV：偏移 24 字节
gl.enableVertexAttribArray(aUv);

const ebo = gl.createBuffer();
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ebo);
gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(geometry.indices), gl.STATIC_DRAW);

gl.bindVertexArray(null);      // 解绑，避免后续误改状态

const indexCount = geometry.indices.length;

// ---------- 程序化棋盘格纹理（免外部图片依赖）----------
function createCheckerTexture(size = 512, cells = 12) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const cell = size / cells;
  for (let y = 0; y < cells; y++) {
    for (let x = 0; x < cells; x++) {
      ctx.fillStyle = (x + y) % 2 === 0 ? '#e8e6e1' : '#2f3a3d';
      ctx.fillRect(x * cell, y * cell, cell, cell);
    }
  }
  // 加两条彩色标记，方便观察球体旋转与 UV 分布
  ctx.fillStyle = '#c2410c';
  ctx.fillRect(0, 0, size, cell);
  ctx.fillStyle = '#0e7490';
  ctx.fillRect(0, 0, cell, size);

  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);   // 图片原点在左上，纹理原点在左下
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);   // 球面横向绕一圈，用 REPEAT 接缝更自然
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.bindTexture(gl.TEXTURE_2D, null);
  return texture;
}

const texture = createCheckerTexture();

const camera = new OrbitCamera(canvas, [0, 0, 0]);

const uModel = gl.getUniformLocation(program, 'uModelMatrix');
const uViewProjection = gl.getUniformLocation(program, 'uViewProjectionMatrix');
const uNormalMatrix = gl.getUniformLocation(program, 'uNormalMatrix');
const uLightPos = gl.getUniformLocation(program, 'uLightPos');
const uLightColor = gl.getUniformLocation(program, 'uLightColor');
const uCameraPos = gl.getUniformLocation(program, 'uCameraPos');
const uAmbientColor = gl.getUniformLocation(program, 'uAmbientColor');

const model = mat4.create(), view = mat4.create(), projection = mat4.create();
const viewProjection = mat4.create();
const normalMatrix = mat3.create();



// 光源绕场景做圆周运动，便于观察光照变化
const lightPos = [0, 3, 3];

function render(time) {
  const t = time * 0.001;
  lightPos[0] = Math.sin(t * 0.9) * 4;
  lightPos[2] = Math.cos(t * 0.9) * 4;

  mat4.identity(model);

  camera.update(view);
  mat4.perspective(projection, Math.PI / 4, canvas.width / canvas.height, 0.1, 100);
  mat4.multiply(viewProjection, projection, view);

  mat3.normalFromMat4(normalMatrix, model);   // 模型矩阵 3x3 的逆转置

  gl.clearColor(0.043, 0.051, 0.063, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  gl.useProgram(program);
  gl.uniformMatrix4fv(uModel, false, model);
  gl.uniformMatrix4fv(uViewProjection, false, viewProjection);
  gl.uniformMatrix3fv(uNormalMatrix, false, normalMatrix);
  gl.uniform3fv(uLightPos, lightPos);
  gl.uniform3f(uLightColor, 1.0, 0.96, 0.9);
  gl.uniform3fv(uCameraPos, camera.getPosition());    // 高光与边缘光都依赖相机位置
  gl.uniform3f(uAmbientColor, 0.06, 0.07, 0.09);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.uniform1i(gl.getUniformLocation(program, 'uBaseMap'), 0);

  gl.bindVertexArray(vao);
  gl.drawElements(gl.TRIANGLES, indexCount, gl.UNSIGNED_SHORT, 0);

  requestAnimationFrame(render);
}
requestAnimationFrame(render);