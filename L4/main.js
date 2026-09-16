import OrbitCamera from './utils/camera.js';
import createCheckerTexture from './utils/checkerTexture.js';
import createRenderTarget, { disposeRenderTarget } from './render/renderTarget.js';
import createScenePass from './render/scenePass.js';
import createPostPass from './render/postPass.js';

const canvas = document.getElementById('gl');
const gl = canvas.getContext('webgl2', { alpha: false, antialias: true });
if (!gl) throw new Error('当前环境不支持 WebGL 2');

// 离屏渲染倍率：1 = 与画布同分辨率。后处理对分辨率不敏感时降到 0.5，
// 填充率直接省掉四分之三 —— 这是 L4 最容易被忽略的一档性能开关。
const OFFSCREEN_SCALE = 1;

// ---- 尺寸 ----
// 分辨率由 canvas.width/height 决定（物理像素），CSS 的 width/height 只决定显示尺寸。
function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(canvas.clientWidth * dpr);
  canvas.height = Math.floor(canvas.clientHeight * dpr);
  gl.viewport(0, 0, canvas.width, canvas.height);
}

// ---- 资源装配 ----
const baseTexture = createCheckerTexture(gl);
const camera = new OrbitCamera(canvas, [0, 0, 0]);
const scenePass = createScenePass(gl, { canvas, camera, baseTexture });
const postPass = createPostPass(gl, { vignette: 0.65, aberration: 0.004 });

// 离屏目标（L4 相对 L3 的第一处新增）。
// 只建一个：L4 的后处理是单级链，不需要乒乓。真要做两级模糊时，
// 把这里改成数组、再多建一个，在两个 Pass 之间交替读写即可。
let sceneTarget = null;

function resizeTargets() {
  disposeRenderTarget(gl, sceneTarget);   // 先释放旧的，否则每次 resize 都泄一整套显存
  const w = Math.max(1, Math.floor(canvas.width * OFFSCREEN_SCALE));
  const h = Math.max(1, Math.floor(canvas.height * OFFSCREEN_SCALE));
  sceneTarget = createRenderTarget(gl, w, h);
}

function onResize() {
  resize();
  resizeTargets();                        // 离屏纹理必须跟着重建，否则尺寸不匹配、画面错位
}

// ---- 启动 ----
resize();                                 // 先把 canvas 尺寸定下来，离屏目标要按它创建
window.addEventListener('resize', onResize);
resizeTargets();

function renderFrame(time) {
  // ---------- Pass 1：场景 → 离屏纹理 ----------
  gl.bindFramebuffer(gl.FRAMEBUFFER, sceneTarget.framebuffer);
  gl.viewport(0, 0, sceneTarget.width, sceneTarget.height);
  gl.enable(gl.DEPTH_TEST);   // 球体要正确遮挡，必须开深度测试
  gl.enable(gl.CULL_FACE);    // 每帧都得重设：Pass 2 会把它关掉，而 GL 状态是全局的
  gl.clearColor(0.043, 0.051, 0.063, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  scenePass.draw(time);

  // ---------- Pass 2：后处理 → 屏幕 ----------
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.disable(gl.DEPTH_TEST);  // 全屏绘制不需要深度；开着可能被整块丢弃，屏幕一片黑
  gl.disable(gl.CULL_FACE);   // 全屏三角形的绕序无所谓，关掉更保险
  gl.clear(gl.COLOR_BUFFER_BIT);
  postPass.draw(sceneTarget.colorTexture, canvas.width, canvas.height);

  requestAnimationFrame(renderFrame);
}
requestAnimationFrame(renderFrame);

// 调试入口：控制台里可以实时调后处理参数，观察每一项的作用
window.__l4 = {
  gl, scenePass, postPass, camera,
  setPostParams: (p) => postPass.setParams(p),
};
