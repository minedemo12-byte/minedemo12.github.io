// 使用 ESM 從 CDN 匯入 Three.js
import * as THREE from 'https://unpkg.com/three@0.158.0/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.158.0/examples/jsm/controls/OrbitControls.js?module';
import { GLTFLoader } from 'https://unpkg.com/three@0.158.0/examples/jsm/loaders/GLTFLoader.js?module';

// defer canvas lookup (module may run before DOM ready)
let canvas = null;
let renderer, scene, camera, controls, mesh, light1, light2;
let waveEnabled = true;
let lightingEnabled = true;
let t = 0;

// 建立離屏畫布作為花紋材質來源
const patternCanvas = document.createElement('canvas');
patternCanvas.width = 512; patternCanvas.height = 512;
const pctx = patternCanvas.getContext('2d');

function drawPattern(type, c1, c2){
  const w = patternCanvas.width, h = patternCanvas.height;
  // 背景
  pctx.fillStyle = c1; pctx.fillRect(0,0,w,h);
  pctx.fillStyle = c2; pctx.strokeStyle = c2;
  if(type === 'stripes'){
    for(let i=0;i<20;i++){
      const y = i * (h/20);
      pctx.fillRect(0,y, w, (h/40));
    }
  }else if(type === 'checks'){
    for(let i=0;i<10;i++){
      for(let j=0;j<10;j++){
        if((i+j)%2===0) pctx.fillRect(i*(w/10), j*(h/10), w/10, h/10);
      }
    }
  }else if(type === 'dots'){
    for(let i=0;i<100;i++){
      const x = Math.random()*w, y = Math.random()*h, r = 6 + Math.random()*10;
      pctx.beginPath(); pctx.arc(x,y,r,0,Math.PI*2); pctx.fill();
    }
  } else { /* solid */ }
}

function init(){
  // ensure canvas exists (module might run before DOM)
  if(!canvas) canvas = document.getElementById('glcanvas');
  if(!canvas){
    console.error('init(): <canvas id="glcanvas"> not found.');
    return;
  }
  renderer = new THREE.WebGLRenderer({canvas, antialias:true, preserveDrawingBuffer:true});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  resize();
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b0e14);
  camera = new THREE.PerspectiveCamera(45, canvas.clientWidth/canvas.clientHeight, 0.1, 100);
  camera.position.set(0, 0.6, 2.5);

  // 燈光
  light1 = new THREE.DirectionalLight(0xffffff, 1.2);
  light1.position.set(2, 3, 4);
  scene.add(light1);
  light2 = new THREE.AmbientLight(0xffffff, 0.8);
  scene.add(light2);

  // 載入 glTF T-shirt 模型
  const loader = new GLTFLoader();
  loader.load('assets/tshirt.glb', (gltf) => {
    mesh = gltf.scene;
    console.log('✓ T-shirt model loaded', mesh);
    mesh.scale.set(1.2, 1.2, 1.2);
    mesh.position.set(0, 0.2, 0);
    
    // Create texture once
    const patternTex = new THREE.CanvasTexture(patternCanvas);
    patternTex.wrapS = patternTex.wrapT = THREE.RepeatWrapping;
    patternTex.repeat.set(1.6, 1.6);
    
    // 將紋理貼到模型所有材質
    mesh.traverse((node) => {
      if (node.isMesh) {
        console.log('  - Found mesh:', node.name);
        // Replace with compatible MeshPhongMaterial
        node.material = new THREE.MeshPhongMaterial({
          map: patternTex,
          side: THREE.DoubleSide,
          shininess: 30
        });
        node.castShadow = true;
        node.receiveShadow = true;
      }
    });
    
    scene.add(mesh);
    animate();
  }, undefined, (error) => {
    console.error('❌ Failed to load T-shirt model:', error.message || error);
  });

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.autoRotate = false;
  controls.target.set(0, 1.7, 0);
  controls.update();
}

function animate(){
  requestAnimationFrame(animate);
  t += 0.01;
  
  if(waveEnabled && mesh && mesh.isMesh === false){
    // glTF 模型的波動效果
    mesh.traverse((node) => {
      if(node.isMesh && node.geometry.attributes.position){
        const pos = node.geometry.attributes.position;
        for(let i=0; i<pos.count; i++){
          const x = pos.getX(i);
          const y = pos.getY(i);
          const z = Math.sin(x*2 + t)*0.02 + Math.cos(y*3 + t*1.2)*0.02;
          pos.setZ(i, z);
        }
        pos.needsUpdate = true;
        node.geometry.computeVertexNormals();
      }
    });
  }
  
  light1.intensity = lightingEnabled ? 1.2 : 0.0;
  light2.intensity = lightingEnabled ? 0.8 : 0.0;
  controls.update();
  if(renderer && camera) renderer.render(scene, camera);
}

function resize(){
  const rect = canvas.getBoundingClientRect();
  const w = rect.width, h = rect.height;
  if(!renderer) return;
  // update pixel ratio in case DPR changed (e.g. external monitor)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(w, h, false);
}

window.addEventListener('resize', ()=>{
  const rect = canvas.getBoundingClientRect();
  camera.aspect = rect.width/rect.height; camera.updateProjectionMatrix();
  resize();
});

// ---- UI 綁定 ----
const upload = document.getElementById('upload');
const patternSel = document.getElementById('pattern');
const color1 = document.getElementById('color1');
const color2 = document.getElementById('color2');
const wave = document.getElementById('wave');
const lighting = document.getElementById('lighting');
const dl = document.getElementById('download');
const resetBtn = document.getElementById('reset');
const slider = document.getElementById('slider');
const beforeImg = document.getElementById('beforeImg');
const afterImg = document.getElementById('afterImg');

// --------- 設計師資料（示範用） ----------
const designers = [
  { id:1, name:'陳小白', styles:['極簡','中性'], bio:'善於簡約剪裁與永續面料', rating:4.8, avatar:'assets/designer1.jpg' },
  { id:2, name:'李設計', styles:['街頭','印花'], bio:'大膽用色與印花設計', rating:4.6, avatar:'assets/designer2.jpg' },
  { id:3, name:'王復古', styles:['復古','手作'], bio:'擅長復古元素與洗舊處理', rating:4.7, avatar:'assets/designer3.jpg' },
  { id:4, name:'吳可愛', styles:['可愛','插畫'], bio:'插畫印花、年輕市場專家', rating:4.5, avatar:'assets/designer4.jpg' }
];

function recommendDesigners(query, maxResults=4){
  if(!query || !query.trim()) return designers.slice(0, maxResults);
  const q = query.trim().toLowerCase();
  const scored = designers.map(d=>{
    const matchCount = d.styles.reduce((acc,s)=> acc + (s.toLowerCase().includes(q) || q.includes(s.toLowerCase()) ? 1 : 0), 0);
    const textMatch = (d.name + ' ' + d.bio).toLowerCase().includes(q) ? 0.5 : 0;
    return { d, score: matchCount + textMatch };
  });
  return scored.filter(s=>s.score>0)
    .sort((a,b)=> (b.score - a.score) || (b.d.rating - a.d.rating))
    .slice(0, maxResults).map(s=>s.d);
}

function renderDesignerCards(container, list){
  container.innerHTML = '';
  if(!list || list.length===0){ container.innerHTML = '<div style="color:var(--muted)">未找到符合設計師</div>'; return; }
  list.forEach(d=>{
    const card = document.createElement('div');
    card.className = 'designer-card';
    card.innerHTML = `
      <img src="${d.avatar}" alt="${d.name}" class="designer-avatar" onerror="this.style.opacity=.6" />
      <div class="designer-info">
        <strong>${d.name}</strong>
        <div class="designer-styles">${d.styles.join(' • ')}</div>
        <div class="designer-bio">${d.bio}</div>
      </div>
      <div style="margin-top:6px; text-align: right; margin-right: 15px"><button class="view-profile" data-id="${d.id}">選擇設計師</button></div>
    `;
    container.appendChild(card);
    card.querySelector('.view-profile').addEventListener('click', ()=> showDesignerProfile(d));
  });
}

function showDesignerProfile(d){
  const w = window.open('', '_blank', 'width=520,height=420');
  w.document.write(`<body style="font-family:system-ui;padding:16px;background:#0e1116;color:#eaeaea">
    <div style="display:flex;gap:12px;align-items:flex-start">
      <img src="${d.avatar}" alt="${d.name}" style="width:120px;height:120px;object-fit:cover;border-radius:8px;border:1px solid rgba(255,255,255,.04)"/>
      <div>
        <h2 style="margin:0">${d.name}</h2>
        <div style="color:#9aa;margin:.4rem 0">${d.styles.join(' • ')}</div>
        <p style="max-width:380px">${d.bio}</p>
        <div>評分: ${d.rating.toFixed(1)}</div>
      </div>
    </div>
  </body>`);
}

// UI 綁定：推薦按鈕（若元素存在）
const recommendBtn = document.getElementById('recommendBtn');
const designerQuery = document.getElementById('designerQuery');
const designersContainer = document.getElementById('designersContainer');
if(recommendBtn && designerQuery && designersContainer){
  recommendBtn.addEventListener('click', ()=>{
    const q = designerQuery.value;
    const results = recommendDesigners(q, 6);
    renderDesignerCards(designersContainer, results);
  });
  designerQuery.addEventListener('keyup', (e)=>{ if(e.key==='Enter') recommendBtn.click(); });
  // 初始化熱門
  renderDesignerCards(designersContainer, designers.slice(0,4));
}

// 初始化內容
(function(){
  document.getElementById('year').textContent = new Date().getFullYear();
  drawPattern('solid', color1.value, color2.value);
  init();
  updateTextureFromPattern();
})();

