import { createProgram } from '../compile/compile.js';
import { POST_VERT, POST_FRAG } from '../gl/gl.js';
import { createFullscreenTriangle } from '../utils/fullscreen-triangle.js';

/**
 * 后处理 Pass：把 Pass 1 画出来的离屏纹理加工一遍，铺满屏幕。
 *
 * 三个效果都不改变几何，只改颜色：色差、暗角、灰度。
 * 参数可以在运行时调（控制台里 __l4.postPass.setParams({ vignette: 0 })），
 * 这是理解每一项在做什么最快的办法。
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
  };

  let params = { vignette, aberration };

  function draw(sceneTexture, width, height) {
    gl.useProgram(program);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, sceneTexture);
    gl.uniform1i(uniforms.uScene, 0);
    gl.uniform2f(uniforms.uResolution, width, height);
    gl.uniform1f(uniforms.uVignette, params.vignette);
    gl.uniform1f(uniforms.uAberration, params.aberration);

    gl.bindVertexArray(fullscreenVao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindVertexArray(null);
  }

  return {
    draw,
    setParams(next) { params = { ...params, ...next }; },
    getParams() { return { ...params }; },
  };
}
