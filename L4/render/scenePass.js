import { mat3, mat4 } from 'gl-matrix';

import { createProgram } from '../compile/compile.js';
import { VERT, FRAG } from '../gl/gl.js';
import createSphereGeometry from '../utils/ball.js';

/**
 * 场景 Pass：把带光照的球体画进「当前已经绑定好的帧缓冲」。
 *
 * 它刻意不管三件事，全部交给调用方编排：不清屏、不绑定帧缓冲、不设置视口。
 * 因为这三件事回答的是「这一帧画到哪里」——画到离屏纹理还是直接画到屏幕，
 * 对场景 Pass 本身是透明的。这正是 L4 能复用 L3 全部绘制代码的原因。
 */
export default function createScenePass(gl, { canvas, camera, baseTexture }) {
  const program = createProgram(gl, VERT, FRAG);

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

  // ---------- uniform 位置只在创建时查一次，不要放进每帧循环 ----------
  const uniforms = {
    uModelMatrix: gl.getUniformLocation(program, 'uModelMatrix'),
    uViewProjectionMatrix: gl.getUniformLocation(program, 'uViewProjectionMatrix'),
    uNormalMatrix: gl.getUniformLocation(program, 'uNormalMatrix'),
    uBaseMap: gl.getUniformLocation(program, 'uBaseMap'),
    uLightPos: gl.getUniformLocation(program, 'uLightPos'),
    uLightColor: gl.getUniformLocation(program, 'uLightColor'),
    uCameraPos: gl.getUniformLocation(program, 'uCameraPos'),
    uAmbientColor: gl.getUniformLocation(program, 'uAmbientColor'),
  };

  // 复用同一批矩阵对象，避免每帧新建
  const model = mat4.create(), view = mat4.create(), projection = mat4.create();
  const viewProjection = mat4.create();
  const normalMatrix = mat3.create();

  // 光源绕场景做圆周运动，便于观察光照变化
  const lightPos = [0, 3, 3];

  function draw(time) {
    const t = time * 0.001;
    lightPos[0] = Math.sin(t * 0.9) * 4;
    lightPos[2] = Math.cos(t * 0.9) * 4;

    mat4.identity(model);

    camera.update(view);
    // 离屏尺寸按画布等比缩放，所以宽高比直接取画布的
    mat4.perspective(projection, Math.PI / 4, canvas.width / canvas.height, 0.1, 100);
    mat4.multiply(viewProjection, projection, view);

    mat3.normalFromMat4(normalMatrix, model);   // 模型矩阵 3x3 的逆转置

    gl.useProgram(program);
    gl.uniformMatrix4fv(uniforms.uModelMatrix, false, model);
    gl.uniformMatrix4fv(uniforms.uViewProjectionMatrix, false, viewProjection);
    gl.uniformMatrix3fv(uniforms.uNormalMatrix, false, normalMatrix);
    gl.uniform3fv(uniforms.uLightPos, lightPos);
    gl.uniform3f(uniforms.uLightColor, 1.0, 0.96, 0.9);
    // 注意：OrbitCamera.update() 只写视图矩阵、不返回位置，相机位置要单独取。
    // 手册的写法是 const cameraPos = camera.update(view)，那是手册版相机的约定。
    gl.uniform3fv(uniforms.uCameraPos, camera.getPosition());
    gl.uniform3f(uniforms.uAmbientColor, 0.06, 0.07, 0.09);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, baseTexture);
    gl.uniform1i(uniforms.uBaseMap, 0);

    gl.bindVertexArray(vao);
    gl.drawElements(gl.TRIANGLES, indexCount, gl.UNSIGNED_SHORT, 0);
    gl.bindVertexArray(null);
  }

  return { draw };
}
