/**
 * 离屏渲染目标（FBO）：让 GPU 画到一张纹理而不是屏幕。
 *
 * 两个附件的选型依据是"会不会被采样"：
 *   颜色附件用纹理     —— Pass 2 要采样它，必须是纹理。RGBA8 表示每像素 4 字节。
 *   深度附件用 renderbuffer —— Pass 1 画球体需要深度测试，但深度数据不需要被采样，
 *                             用 renderbuffer 比纹理更省内存。
 */
export default function createRenderTarget(gl, width, height) {
  const framebuffer = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);

  const colorTexture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, colorTexture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);   // 后处理必须用 CLAMP，
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);   // 否则边缘会采到对面的像素
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, colorTexture, 0);

  const depthBuffer = gl.createRenderbuffer();
  gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer);
  gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, width, height);
  gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthBuffer);

  if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
    throw new Error('帧缓冲不完整');
  }
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  return { framebuffer, colorTexture, depthBuffer, width, height };
}

/** 释放离屏目标占用的三个 GL 对象。窗口尺寸变化时必须先释放再重建，否则显存会一路涨。 */
export function disposeRenderTarget(gl, target) {
  if (!target) return;
  gl.deleteFramebuffer(target.framebuffer);
  gl.deleteTexture(target.colorTexture);
  gl.deleteRenderbuffer(target.depthBuffer);
}
