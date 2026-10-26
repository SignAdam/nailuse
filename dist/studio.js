import * as THREE from './assets/three.module.js';
import {OrbitControls} from './assets/OrbitControls.js';
import {GLTFLoader} from './assets/GLTFLoader.js';
import {bakeHand,nailFrame,fitNaturalNail,smoothNail} from './hand-surface.js';
let handSurface,frames=[];const nailCache=new Map();
const $=s=>document.querySelector(s);
const shapes=['Carré court','Squoval','Ovale','Amande courte','Amande longue','Ballerine / Coffin','Stiletto','Carré long'];
const styles=['French classique','Micro French','French coloré','French chrome','Milky nude','Chrome / Glacé','Cat-eye','Aura','Jelly','Nude','Rouge classique','Bordeaux','Noir','Pastel','Baby boomer','Nail art minimaliste','Nail art Y2K','Strass & 3D','Animal print','Dessins / Motifs'];
const skins=['Très clair','Clair','Medium clair','Medium','Medium foncé','Foncé'], skinColors=['#ffe3d1','#e8bea4','#c9987a','#a17153','#79533c','#51362d'];
const colors=['#e5b6c2','#f1d9d0','#fff5ef','#cb7c99','#e74883','#bc1630','#59172b','#161015','#b9a0d7','#b5ccbf','#967450','#b8bac9'];
const colorNames=['Rose nude','Rose laiteux','Blanc porcelaine','Vieux rose','Rose pop','Rouge cerise','Bordeaux','Noir profond','Lilas','Pistache','Bronze','Argent'];
const lengths=['Courts','Medium','Longs','Extra longs'];
let state={shape:7,style:0,skin:2,color:colors[0],length:2,finish:'Brillant'},tabName='shape',hand,skinMaterial,nails=[],renderer,camera,controls,scene,photo=false,ready=false;const skinTone={value:new THREE.Color(skinColors[2])};
function swatches(){return `<h3 class="field-title">Votre carnation <span>${skins[state.skin]}</span></h3><div class="skin-row">${skinColors.map((c,i)=>`<button class="swatch ${state.skin===i?'active':''}" style="--swatch:${c}" aria-label="${skins[i]}" aria-pressed="${state.skin===i}" data-skin="${i}"></button>`).join('')}</div>`}
function render(){
 const s=$('#settings');
 if(tabName==='shape')s.innerHTML=swatches()+`<h3 class="field-title">La forme parfaite <span>8 possibilités</span></h3><div class="shape-grid">${shapes.map((n,i)=>`<button class="shape-card ${state.shape===i?'active':''}" aria-pressed="${state.shape===i}" data-shape="${i}"><div class="nail-thumb" style="--pos:${-172-i*47}px -15px"></div>${n}</button>`).join('')}</div><div class="length"><h3 class="field-title">Un peu, beaucoup… <span>${lengths[state.length]}</span></h3><div class="length-options">${lengths.map((n,i)=>`<button class="${i===state.length?'active':''}" data-length="${i}" aria-pressed="${i===state.length}">${n}</button>`).join('')}</div></div>`;
 if(tabName==='color')s.innerHTML=swatches()+`<h3 class="field-title">Trouvez votre nuance</h3><div class="colors">${colors.map((c,i)=>`<button class="swatch color-choice ${state.color===c?'active':''}" style="--swatch:${c}" data-color="${c}" aria-label="${colorNames[i]}" aria-pressed="${state.color===c}"></button>`).join('')}</div><p class="color-names">${colorNames[colors.indexOf(state.color)]||'Votre couleur personnalisée'}</p><label class="color-custom">Une envie précise ? <input type="color" id="custom-color" aria-label="Couleur personnalisée" value="${state.color}"></label><h3 class="field-title">Le fini</h3><div class="finish-options">${['Brillant','Satiné','Mat'].map(n=>`<button data-finish="${n}" aria-pressed="${state.finish===n}" class="${state.finish===n?'active':''}">${n}</button>`).join('')}</div>`;
 if(tabName==='style')s.innerHTML=`<h3 class="field-title">Le petit supplément d’âme <span>20 styles</span></h3><div class="style-grid">${styles.map((n,i)=>`<button class="style-card ${i===state.style?'active':''}" data-style="${i}" aria-pressed="${i===state.style}"><div class="style-thumb" style="--pos:${-256-(i%10)*57}px ${i<10?-206:-286}px"></div>${n}</button>`).join('')}</div><p class="color-names" style="margin:18px 0">${styles[state.style]} — ${state.finish.toLowerCase()}</p>`;
 $('#combination').textContent=shapes[state.shape]+' · '+styles[state.style];
 s.querySelectorAll('[data-skin],[data-shape],[data-length],[data-color],[data-finish],[data-style]').forEach(b=>b.onclick=()=>{for(const k of ['skin','shape','length','color','finish','style'])if(b.dataset[k]!==undefined){state[k]=['color','finish'].includes(k)?b.dataset[k]:+b.dataset[k];if(k==='shape')state.length=[0,1,1,1,2,2,3,2][state.shape];if(k==='style'&&[10,11,12,13].includes(state.style))state.color=colors[{10:5,11:6,12:7,13:8}[state.style]];}render();updateModel()});
 if($('#custom-color'))$('#custom-color').oninput=e=>{state.color=e.target.value;updateModel()};
}
document.querySelectorAll('[data-tab]').forEach((b,i,all)=>{b.onclick=()=>{tabName=b.dataset.tab;all.forEach(x=>x.setAttribute('aria-selected',x===b));render()};b.onkeydown=e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();const next=all[(i+(e.key==='ArrowRight'?1:2))%3];next.focus();next.click()}}});
function showResult(){ $('#studio').hidden=true;$('#result').hidden=false;$('#result-summary').innerHTML=[['Forme',shapes[state.shape]],['Longueur',lengths[state.length]],['Style',styles[state.style]],['Couleur',colorNames[colors.indexOf(state.color)]||state.color],['Finition',state.finish],['Carnation',skins[state.skin]]].map(([k,v])=>`<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');$('#studio-nav').classList.remove('nav-active');$('#result-nav').classList.add('nav-active');window.scrollTo({top:80,behavior:'smooth'})}
function showStudio(){ $('#studio').hidden=false;$('#result').hidden=true;$('#studio-nav').classList.add('nav-active');$('#result-nav').classList.remove('nav-active');requestAnimationFrame(resize)}
$('#show-result').onclick=showResult;$('#result-nav').onclick=showResult;for(const id of ['back-studio','return-3d','studio-nav'])$('#'+id).onclick=showStudio;
$('#reset').onclick=()=>{state={shape:7,style:0,skin:2,color:colors[0],length:2,finish:'Brillant'};render();updateModel();view('back')};
render();
function nailTexture(){const c=document.createElement('canvas');c.width=256;c.height=512;const x=c.getContext('2d');x.fillStyle=state.style===2?'#e5b6c2':state.color;x.fillRect(0,0,256,512);const style=state.style;
 if(style<=3){x.fillStyle=style===2?state.color:style===3?'#d4c1de':'#fff9f3';x.beginPath();x.moveTo(0,0);x.lineTo(256,0);x.lineTo(256,style===1?38:130);x.quadraticCurveTo(128,style===1?90:280,0,style===1?38:130);x.fill()}
 if(style===4){x.fillStyle='#f8e5de';x.globalAlpha=.7;x.fillRect(0,0,256,512);x.globalAlpha=1}
 if(style===5||style===6){const g=x.createLinearGradient(0,0,256,100);g.addColorStop(0,style===6?'#160f20':'#d6bde6');g.addColorStop(.44,state.color);g.addColorStop(.5,'#fff1f7');g.addColorStop(.57,style===6?'#c268be':'#a9bcd7');g.addColorStop(1,style===6?'#130c18':state.color);x.fillStyle=g;x.fillRect(0,0,256,512)}
 if(style===7){const g=x.createRadialGradient(128,240,0,128,240,180);g.addColorStop(0,'#fb78a4');g.addColorStop(1,state.color);x.fillStyle=g;x.fillRect(0,0,256,512)}
 if(style===14){const g=x.createLinearGradient(0,0,0,512);g.addColorStop(0,'#fffaf5');g.addColorStop(.32,'#f8e8e8');g.addColorStop(1,state.color);x.fillStyle=g;x.fillRect(0,0,256,512)}
 if(style===15){x.strokeStyle='#d4b976';x.lineWidth=5;x.beginPath();x.moveTo(80,0);x.bezierCurveTo(260,190,-20,300,190,512);x.stroke();for(let y=60;y<500;y+=150){x.fillStyle='#f6e3a6';x.beginPath();x.arc(130,y,8,0,Math.PI*2);x.fill()}}
 if(style===16||style===17){for(let i=0;i<12;i++){const px=35+(i*71)%190,py=35+(i*137)%460;x.fillStyle=i%2?'#ded8e7':'#fcf9f8';x.beginPath();x.arc(px,py,style===17?12:6,0,Math.PI*2);x.fill();x.strokeStyle='#938a9f';x.lineWidth=2;x.stroke()}}
 if(style===18){x.fillStyle='#bd7c45';x.fillRect(0,0,256,512);for(let i=0;i<21;i++){const px=(i*71)%256,py=(i*137)%512;x.strokeStyle='#261717';x.lineWidth=13;x.beginPath();x.ellipse(px,py,22,30,i,0,Math.PI*1.65);x.stroke()}}
 if(style===19){x.strokeStyle='#df326b';x.lineWidth=10;for(let y=80;y<500;y+=170){x.beginPath();x.moveTo(128,y-35);x.lineTo(128,y+35);x.moveTo(93,y);x.lineTo(163,y);x.stroke();x.fillStyle='#fff9f6';x.beginPath();x.arc(128,y,9,0,Math.PI*2);x.fill()}}
 const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;return texture}
function updateModel(){
 if(!ready)return;skinTone.value.set(skinColors[state.skin]);
 for(const n of nails){n.traverse(o=>{if(o!==n)o.geometry?.dispose();o.material?.map?.dispose();o.material?.dispose()});n.parent.remove(n)}nails=[];
 const texture=nailTexture();texture.anisotropy=renderer.capabilities.getMaxAnisotropy();
 for(const frame of frames){const key=frame.name+':'+state.shape+':'+state.length;
  if(!nailCache.has(key))nailCache.set(key,smoothNail(frame,state.shape,state.length));
  const geometry=nailCache.get(key),mat=new THREE.MeshPhysicalMaterial({map:texture.clone(),roughness:state.finish==='Mat'?.63:state.finish==='Satiné'?.29:.16,metalness:[3,5,6].includes(state.style)?.72:0,clearcoat:state.finish==='Mat'?.08:1,clearcoatRoughness:.065,envMapIntensity:1.25,ior:1.46,transparent:state.style===8,opacity:state.style===8?.76:1});mat.map.needsUpdate=true;
  const mesh=new THREE.Mesh(geometry,mat);scene.add(mesh);nails.push(mesh);
  if(state.style===17){const pos=geometry.attributes.position;for(let i=0;i<3;i++){const gem=new THREE.Mesh(new THREE.IcosahedronGeometry(frame.width*.06,1),new THREE.MeshPhysicalMaterial({color:'#f4dbe9',metalness:.5,roughness:.06}));gem.position.fromBufferAttribute(pos,22*41+10+i*10).addScaledVector(frame.normal,.005);mesh.add(gem)}}
 }texture.dispose();if(photo)view('back');
}
function resize(){if(!renderer)return;const r=$('#scene').getBoundingClientRect();if(!r.width||!r.height)return;renderer.setSize(r.width,r.height);camera.aspect=r.width/r.height;camera.updateProjectionMatrix()}
function view(kind){if(!ready&&kind!=='photo')return;photo=kind==='photo';$('#reference').hidden=!photo;$('#view-label').textContent=photo?'Aperçu de référence':'MODÈLE 3D · 360°';document.querySelectorAll('.view-buttons button').forEach(b=>b.classList.toggle('active',b.id===(photo?'photo-view':'view-'+kind)));if(!photo){const target=new THREE.Vector3(0,1.34,.32);camera.position.copy(target).add(new THREE.Vector3(...({back:[4.8,.15,.5],side:[.45,.3,4.8],palm:[-4.8,.15,-.2]}[kind]||[4.8,.15,.5])));controls.target.copy(target);controls.update()}}
for(const kind of ['back','side','palm'])$('#view-'+kind).onclick=()=>view(kind);$('#photo-view').onclick=()=>view('photo');$('#reset-view').onclick=()=>view('back');
function zoom(k){if(!ready)return;if(photo)view('back');const delta=camera.position.clone().sub(controls.target).multiplyScalar(k);delta.clampLength(2,6);camera.position.copy(controls.target).add(delta);controls.update()}
$('#zoom-in').onclick=()=>zoom(.85);$('#zoom-out').onclick=()=>zoom(1.15);$('#scene').onkeydown=e=>{if(!ready)return;if(e.key==='+'||e.key==='=')zoom(.9);else if(e.key==='-')zoom(1.1);else if(e.key.startsWith('Arrow')){e.preventDefault();const v=camera.position.clone().sub(controls.target);v.applyAxisAngle(new THREE.Vector3(0,e.key==='ArrowUp'||e.key==='ArrowDown'?0:1,e.key==='ArrowUp'||e.key==='ArrowDown'?1:0),e.key==='ArrowLeft'||e.key==='ArrowUp'?.15:-.15);camera.position.copy(controls.target).add(v);controls.update()}};
async function init(){try{$('#load-message').textContent='Votre main prend place…';scene=new THREE.Scene();renderer=new THREE.WebGLRenderer({alpha:true,antialias:true});renderer.setPixelRatio(Math.min(3,Math.max(2,devicePixelRatio)));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;$('#scene').prepend(renderer.domElement);camera=new THREE.PerspectiveCamera(38,1,.01,100);controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.enablePan=false;controls.minDistance=2;controls.maxDistance=6;
scene.add(new THREE.HemisphereLight('#fff5ef','#5e4754',.9));
const light=new THREE.DirectionalLight('#fff3e8',2.6);light.position.set(4,5,3);scene.add(light);
const fill=new THREE.DirectionalLight('#e4ddeb',.8);fill.position.set(-3,2,-3);scene.add(fill);
const envScene=new THREE.Scene();envScene.background=new THREE.Color('#303038');
for(const [position,size,intensity]of [[[4,2,2],[1.2,5,.1],5],[[-2,3,-3],[2,4,.1],3],[[0,6,0],[5,.1,3],2]]){const card=new THREE.Mesh(new THREE.BoxGeometry(...size),new THREE.MeshBasicMaterial({color:new THREE.Color().setScalar(intensity)}));card.position.set(...position);card.lookAt(0,1,0);envScene.add(card)}
const pmrem=new THREE.PMREMGenerator(renderer);const environment=pmrem.fromScene(envScene,.025);scene.environment=environment.texture;pmrem.dispose();envScene.traverse(o=>{o.geometry?.dispose();o.material?.dispose()});
const gltf=await new GLTFLoader().loadAsync('assets/hand.glb');hand=gltf.scene;
const mixer=new THREE.AnimationMixer(hand);mixer.clipAction(gltf.animations[0]).play();mixer.setTime(.10);hand.updateMatrixWorld(true);
handSurface=bakeHand(hand);scene.add(handSurface);frames=[['thumb',.18],['index',.155],['middle',.164],['ring',.145],['pinky',.115]].map(([name,width])=>fitNaturalNail(handSurface,nailFrame(hand,name,width)));
const skinMap=await new THREE.TextureLoader().loadAsync('assets/skin-refined.png');skinMap.flipY=false;skinMap.colorSpace=THREE.SRGBColorSpace;
skinMaterial=new THREE.MeshPhysicalMaterial({map:skinMap,roughness:.62,metalness:0,envMapIntensity:.28,bumpMap:skinMap,bumpScale:.0008,clearcoat:.045,clearcoatRoughness:.65});handSurface.material=skinMaterial;
skinMaterial.map.anisotropy=renderer.capabilities.getMaxAnisotropy();skinMaterial.map.needsUpdate=true;
skinMaterial.onBeforeCompile=shader=>{shader.uniforms.skinTone=skinTone;shader.fragmentShader='uniform vec3 skinTone;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
float skinLum = max(dot(diffuseColor.rgb, vec3(0.2126,0.7152,0.0722)),0.006);
vec3 skinChroma = diffuseColor.rgb / skinLum;
vec3 neighborhood = (texture2D(map, vMapUv + vec2(.004,0.)).rgb + texture2D(map,vMapUv-vec2(.004,0.)).rgb + texture2D(map,vMapUv+vec2(0.,.004)).rgb + texture2D(map,vMapUv-vec2(0.,.004)).rgb) * .25;
float skinLow = max(dot(neighborhood,vec3(.2126,.7152,.0722)),.025);
float skinDetail = clamp(1.0 + (skinLum-skinLow)/skinLow * 1.1,.65,1.35);
diffuseColor.rgb = skinTone * (.86 + .32 * (skinLow/.34 - 1.0)) * skinDetail * mix(vec3(1.0),skinChroma,.10);
`)};
ready=true;updateModel();view('back');$('#load-message').textContent='';resize();new ResizeObserver(resize).observe($('#scene'));renderer.setAnimationLoop(()=>{controls.update();if(!$('#studio').hidden&&!photo)renderer.render(scene,camera)});
}catch(e){$('#load-message').textContent='La 3D n’a pas pu se charger. Rechargez la page pour réessayer.';$('#view-label').textContent='Photo de référence';console.error(e)}}
init();
const context=document.modelContext;if(context?.registerTool){const lifecycle=new AbortController();try{Promise.resolve(context.registerTool({name:'configure_manicure',description:'Modifier les choix visibles dans le studio Nailuse. Les photos finales sont des références fixes.',inputSchema:{type:'object',properties:{shape:{type:'integer',minimum:0,maximum:7},style:{type:'integer',minimum:0,maximum:19},skin:{type:'integer',minimum:0,maximum:5},length:{type:'integer',minimum:0,maximum:3},color:{type:'string',pattern:'^#[0-9a-fA-F]{6}$'}},additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute(input){if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Configuration invalide');const limits={shape:7,style:19,skin:5,length:3};for(const [k,v]of Object.entries(input)){if(k==='color'){if(typeof v!=='string'||!/^#[0-9a-fA-F]{6}$/.test(v))throw Error('Couleur invalide')}else if(!(k in limits)||!Number.isInteger(v)||v<0||v>limits[k])throw Error('Choix invalide')}Object.assign(state,input);showStudio();render();updateModel();return {...state}}},{signal:lifecycle.signal})).catch(()=>{});window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true})}catch{}}
