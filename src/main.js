import gsap from 'gsap';
import * as THREE from 'three';
import './style.css';
// 引入 OrbitControls 用于鼠标拖动视角
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// ==========================================
// 1. 场景初始化 (Scene Setup)
// ==========================================
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0c10); // 深色科技背景
scene.fog = new THREE.FogExp2(0x0b0c10, 0.02);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(20, 20, 30);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// 灯光
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);
const dirLight = new THREE.DirectionalLight(0xffffff, 1);
dirLight.position.set(10, 20, 10);
dirLight.castShadow = true;
scene.add(dirLight);

// ==========================================
// 2. 硬件建模 (Hardware Layer)
// ==========================================

// 辅助函数：创建标签文字（这里为了简化用 Canvas 贴图，实际可用 HTML Overlay）
function createLabel(text, position) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = 256; canvas.height = 64;
  ctx.fillStyle = 'rgba(0,0,0,0)'; // 透明背景
  ctx.font = 'Bold 40px Arial';
  ctx.fillStyle = 'white';
  ctx.textAlign = 'center';
  ctx.fillText(text, 128, 48);

  const texture = new THREE.CanvasTexture(canvas);
  const spriteMat = new THREE.SpriteMaterial({ map: texture });
  const sprite = new THREE.Sprite(spriteMat);
  sprite.position.copy(position);
  sprite.scale.set(6, 1.5, 1);
  scene.add(sprite);
}

// A. Global Memory (HBM) - 底部大板
const hbmGeo = new THREE.BoxGeometry(20, 0.5, 10);
const hbmMat = new THREE.MeshLambertMaterial({ color: 0x2c3e50 });
const hbm = new THREE.Mesh(hbmGeo, hbmMat);
hbm.position.set(0, 0, 10); // 放在近处
hbm.receiveShadow = true;
scene.add(hbm);
createLabel("Global Memory (HBM)", new THREE.Vector3(0, 2, 12));

// B. Unified Buffer (UB) - 中间高速缓存
const ubGeo = new THREE.BoxGeometry(10, 0.5, 6);
const ubMat = new THREE.MeshLambertMaterial({ color: 0x34495e });
const ub = new THREE.Mesh(ubGeo, ubMat);
ub.position.set(0, 0, 0);
ub.receiveShadow = true;
scene.add(ub);
createLabel("Unified Buffer (UB)", new THREE.Vector3(0, 2, 2));

// C. Vector Unit (Compute) - 远处计算核
const vectorGeo = new THREE.BoxGeometry(4, 1, 4);
const vectorMat = new THREE.MeshStandardMaterial({
  color: 0x45a29e,
  emissive: 0x1f2833,
  emissiveIntensity: 0.5,
  roughness: 0.2,  // 增加一点金属质感
  metalness: 0.8
});
const vectorUnit = new THREE.Mesh(vectorGeo, vectorMat);
vectorUnit.position.set(0, 0.5, -8);
scene.add(vectorUnit);
createLabel("Vector Unit", new THREE.Vector3(0, 3, -8));

// 连接线 (Bus)
const busGeo = new THREE.PlaneGeometry(2, 24);
const busMat = new THREE.MeshBasicMaterial({ color: 0x66fcf1, transparent: true, opacity: 0.1 });
const bus = new THREE.Mesh(busGeo, busMat);
bus.rotation.x = -Math.PI / 2;
bus.position.set(0, 0.05, 1); // 略高于地面
scene.add(bus);

// ==========================================
// 3. 数据块生成 (Data Layer)
// ==========================================

const TILE_SIZE = 0.8;
function createDataBlock(color, xOffset, name) {
  const geo = new THREE.BoxGeometry(TILE_SIZE, TILE_SIZE, TILE_SIZE);
  const mat = new THREE.MeshPhongMaterial({ color: color });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.name = name;
  // 初始位置：在 HBM 上
  mesh.position.set(xOffset, 1, 10);
  scene.add(mesh);
  return mesh;
}

// 创建输入 Tensor A (绿色) 和 B (蓝色)
const tensorA = createDataBlock(0x2ecc71, -2, "TensorA"); // Green
const tensorB = createDataBlock(0x3498db, 2, "TensorB");  // Blue

// 创建输出 Tensor C (金色)，初始隐藏
const tensorC = createDataBlock(0xf1c40f, 0, "TensorC");  // Gold
tensorC.visible = false;
tensorC.scale.set(0, 0, 0); // 初始缩放为0

// ==========================================
// 4. 动画编排 (GSAP Timeline)
// ==========================================

const tl = gsap.timeline({ paused: true });

// Step 1: Data Copy (HBM -> UB)
// 模拟 GM 到 UB 的搬运指令 (Data Move)
tl.to([tensorA.position, tensorB.position], {
  z: 0, // 移动到 UB 的 Z轴位置
  duration: 1.5,
  ease: "power2.inOut",
  stagger: 0.2 // A 和 B 稍微错开一点时间移动
});

// Step 2: Compute Prep (UB -> Vector Unit)
// 数据进入计算单元
tl.to([tensorA.position, tensorB.position], {
  z: -8, // 移动到 Vector Unit
  y: 1.5, // 稍微抬高进入核心
  duration: 1,
  ease: "power1.in"
});

// Step 3: Calculation (The "Add" Op)
// 核心闪烁，模拟计算
tl.to(vectorUnit.material, {
  emissiveIntensity: 2,
  color: 0xffffff,
  duration: 0.1,
  yoyo: true,
  repeat: 3,
  onStart: () => { console.log("Computing Add(A, B)...") }
});

// 计算完成瞬间：A/B 消失，C 出现
tl.add(() => {
  tensorA.visible = false;
  tensorB.visible = false;
  tensorC.position.set(0, 1.5, -8); // C 出现在计算单元
  tensorC.visible = true;
}, ">"); // ">" 紧接着上一步

// C 膨胀出现
tl.to(tensorC.scale, { x: 1, y: 1, z: 1, duration: 0.2 });

// Step 4: Write Back (Vector -> UB -> HBM)
// 先回到 UB
tl.to(tensorC.position, {
  z: 0,
  y: 1,
  duration: 1,
  ease: "power1.out"
});

// 再回到 HBM
tl.to(tensorC.position, {
  z: 10,
  duration: 1.5,
  ease: "power2.inOut"
});

// ==========================================
// 5. UI 与 渲染循环
// ==========================================

// 添加 HTML UI
const appDiv = document.querySelector('#app');
appDiv.innerHTML = `
    <div id="info">
        <h1>CANN 算子可视化 DEMO</h1>
        <p>Op: Add (Vector Calculation)</p>
    </div>
    <div class="controls">
        <button id="btn-play">Run Pipeline</button>
        <button id="btn-reset">Reset</button>
    </div>
`;

document.getElementById('btn-play').addEventListener('click', () => {
  if (!tl.isActive()) tl.play();
});

document.getElementById('btn-reset').addEventListener('click', () => {
  tl.pause(0); // 回到时间轴起点
  tensorA.visible = true;
  tensorB.visible = true;
  tensorC.visible = false;
  tensorC.scale.set(0, 0, 0);
  // 重置发光颜色
  vectorUnit.material.emissiveIntensity = 0.5;
  vectorUnit.material.color.setHex(0x45a29e);
});

// 渲染 Loop
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();

// 窗口自适应
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});