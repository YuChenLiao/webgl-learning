import { mat4 } from 'gl-matrix';

export default class OrbitCamera {
  constructor(canvas, target = [0, 0, 0]) {
    this.canvas = canvas;
    this.target = target;
    this.distance = 5;
    this.theta = 0;             // 水平角，绕 Y 轴
    this.phi = Math.PI / 2;     // 极角，0 = 正上方
    this.dragging = false;
    this.lastX = 0;
    this.lastY = 0;
    this.bind();
  }

  bind() {
    const c = this.canvas;
    c.addEventListener('pointerdown', (e) => {
      this.dragging = true;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
      c.setPointerCapture(e.pointerId);      // 拖出画布仍能收到事件
    });
    c.addEventListener('pointermove', (e) => {
      if (!this.dragging) return;
      const dx = e.clientX - this.lastX;
      const dy = e.clientY - this.lastY;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
      this.theta -= dx * 0.008;
      this.phi -= dy * 0.008;
      const eps = 0.02;                      // 限制极角，避免在极点处翻转
      this.phi = Math.max(eps, Math.min(Math.PI - eps, this.phi));
    });
    c.addEventListener('pointerup', (e) => {
      this.dragging = false;
      c.releasePointerCapture(e.pointerId);
    });
    c.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.distance *= Math.exp(e.deltaY * 0.001);   // 指数缩放，手感均匀
      this.distance = Math.max(1.6, Math.min(30, this.distance));
    }, { passive: false });
  }

  /** 球坐标 → 世界坐标 */
  getPosition() {
    const sinPhi = Math.sin(this.phi);
    return [
      this.target[0] + this.distance * sinPhi * Math.sin(this.theta),
      this.target[1] + this.distance * Math.cos(this.phi),
      this.target[2] + this.distance * sinPhi * Math.cos(this.theta),
    ];
  }

  update(viewMatrix) {
    mat4.lookAt(viewMatrix, this.getPosition(), this.target, [0, 1, 0]);
  }
}