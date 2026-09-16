/**
 * 程序化棋盘格纹理（免外部图片依赖）。
 * 额外画两条彩色标记，方便观察球体旋转与 UV 分布。
 */
export default function createCheckerTexture(gl, size = 512, cells = 12) {
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
