import createProgram from "./compile/compile.js";
import { VERT, FRAG } from "./gl/gl.js";

const canvas = document.getElementById('gl');
const gl = canvas.getContext('webgl2', { alpha: false, antialias: true });
if (!gl) throw new Error('当前环境不支持 WebGL 2');


const program = createProgram(gl, VERT, FRAG);
gl.useProgram(program);