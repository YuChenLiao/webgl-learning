/**
 * @param radius 半径
 * @param segments 经线分段数
 * @param rings 纬线分段数
 * 顶点数 = (segments + 1) * (rings + 1)
 */
export default function createSphereGeometry(radius = 1, segments = 48, rings = 32) {
  const positions = [], normals = [], uvs = [], indices = [];

  for (let y = 0; y <= rings; y++) {
    const v = y / rings;                 // 0 → 1，从北极到南极
    const phi = v * Math.PI;
    const sinPhi = Math.sin(phi), cosPhi = Math.cos(phi);

    for (let x = 0; x <= segments; x++) {
      const u = x / segments;            // 0 → 1，绕一圈
      const theta = u * Math.PI * 2;
      const sinTheta = Math.sin(theta), cosTheta = Math.cos(theta);

      // 单位球面上的点就是法线方向
      const nx = sinPhi * cosTheta;
      const ny = cosPhi;
      const nz = sinPhi * sinTheta;

      positions.push(nx * radius, ny * radius, nz * radius);
      normals.push(nx, ny, nz);
      uvs.push(u, 1 - v);                // v 翻转，让纹理正立
    }
  }

  const stride = segments + 1;
  for (let y = 0; y < rings; y++) {
    for (let x = 0; x < segments; x++) {
      const a = y * stride + x;
      const b = a + stride;
      indices.push(a, a + 1, b);         // 逆时针绕序，法线朝外
      indices.push(a + 1, b + 1, b);
    }
  }
  return { positions, normals, uvs, indices };
}