/**
 * 覆盖全屏的三角形：3 个顶点比两个三角形更省一次图元装配，且没有对角线接缝。
 * 顶点直接写在裁剪空间，所以不需要任何矩阵变换。
 *
 * @param attribLocation 顶点属性的位置。必须由调用方用 getAttribLocation 查出来传进来，
 *                       不要假设它一定是 0（方案里的属性编号由链接器决定）。
 */
export function createFullscreenTriangle(gl, attribLocation) {
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);

  const vbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1, -1,   // 左下
     3, -1,   // 右下：故意画出 [-1,1]，超出部分会被 GPU 自动裁掉
    -1,  3,   // 左上
  ]), gl.STATIC_DRAW);

  gl.vertexAttribPointer(attribLocation, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(attribLocation);

  gl.bindVertexArray(null);
  return vao;
}
