import { createProgram } from '../compile/compile.js';
import { POST_VERT, POST_FRAG } from '../gl/gl.js';
import { createFullscreenTriangle } from '../utils/fullscreen-triangle.js';

/**
 * 后处理 Pass：把 Pass 1 画出来的离屏纹理加工一遍，铺满屏幕。
 *
 * 三个效果都不改变几何，只改颜色：色差、暗角、灰度。
 * 强度参数 uPostAmount 归零时，着色器直接输出原图 —— 也就是 L3 的画面；
 * 于是「L3 直出」与「L4 后处理」共用同一条渲染路径，可以随时对照。
 * 一般参数可以在控制台里调（__l4.postPass.setParams({ vignette: 0 })）。
 */
export default function createPostPass(gl, { vignette = 0.65, aberration = 0.004 } = {}) {
  const program = createProgram(gl, POST_VERT, POST_FRAG);

  // 不要假设全屏三角形的属性位置一定是 0，查出来更稳妥
  const aPosition = gl.getAttribLocation(program, 'aPosition');
  const fullscreenVao = createFullscreenTriangle(gl, aPosition);

  const uniforms = {
    uScene: gl.getUniformLocation(program, 'uScene'),
    uResolution: gl.getUniformLocation(program, 'uResolution'),
    uVignette: gl.getUniformLocation(program, 'uVignette'),
    uAberration: gl.getUniformLocation(program, 'uAberration'),
    uPostAmount: gl.getUniformLocation(program, 'uPostAmount'),
  };

  let params = { vignette, aberration };

  // 逐帧变化的量单独管理，不走 setParams，免得每帧构造一次对象
  let amount = 1;

  function draw(sceneTexture, width, height) {
    gl.useProgram(program);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, sceneTexture);
    gl.uniform1i(uniforms.uScene, 0);
    gl.uniform2f(uniforms.uResolution, width, height);
    gl.uniform1f(uniforms.uVignette, params.vignette);
    gl.uniform1f(uniforms.uAberration, params.aberration);
    gl.uniform1f(uniforms.uPostAmount, amount);

    gl.bindVertexArray(fullscreenVao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindVertexArray(null);
  }

  return {
    draw,
    /** 0 = 直出（等价 L3 的画面），1 = 完整后处理链。由开关逐帧驱动，带缓动。 */
    setAmount(value) { amount = value; },
    setParams(next) { params = { ...params, ...next }; },
    getParams() { return { ...params, amount }; },
  };
}
