import * as T from 'three';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {GTAOPass} from 'three/addons/postprocessing/GTAOPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {upgradeSurfaces} from './render/physical';
import {seeded} from './render/materials';
import {Game} from './simulation/game';
import {smooth} from './simulation/replay';
import {buildWorld} from './render/world';
import {loadScannedCharacters} from './render/scanned';
const params=new URLSearchParams(location.search),capture=params.has('capture');
if(capture)document.body.classList.add('capture');
async function start(){
 const renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance',preserveDrawingBuffer:capture});
 renderer.setPixelRatio(capture?1:Math.min(devicePixelRatio,1.5));renderer.setSize(innerWidth,innerHeight);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
 document.body.prepend(renderer.domElement);
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(58,innerWidth/innerHeight,.06,1200);
 scene.add(new T.HemisphereLight(0xe2e7e9,0x8a8275,1.45));
 const sun=new T.DirectionalLight(0xfff0dc,1.9);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-28;sun.shadow.camera.right=28;sun.shadow.camera.top=35;sun.shadow.camera.bottom=-28;sun.shadow.camera.near=1;sun.shadow.camera.far=170;sun.shadow.bias=-.0003;sun.shadow.normalBias=.035;sun.shadow.radius=3;scene.add(sun,sun.target);
 const waterNormal=await new T.TextureLoader().loadAsync('./assets/surfaces/water-normal.jpg');waterNormal.wrapS=waterNormal.wrapT=T.RepeatWrapping;
 const world=buildWorld(scene,waterNormal);await upgradeSurfaces(renderer,scene,world.materials);
 const actors=await loadScannedCharacters(scene,params.has('review')),game=new Game();await game.init();
 const composer=new EffectComposer(renderer);composer.addPass(new RenderPass(scene,camera));
 // Fixed noise seed: distributed ranges must use the same spatial AO pattern.
 const random=Math.random;let ao:GTAOPass;
 try{Math.random=seeded(2177);ao=new GTAOPass(scene,camera,Math.round(innerWidth*.5),Math.round(innerHeight*.5));}finally{Math.random=random;}
 ao.updateGtaoMaterial({radius:.62,thickness:.8,distanceExponent:1.5,distanceFallOff:1,scale:1,samples:8,screenSpaceRadius:false});ao.blendIntensity=.85;composer.addPass(ao);ao.setSize(Math.round(innerWidth*.5),Math.round(innerHeight*.5));
 composer.addPass(new OutputPass());
 let paused=false,manual=false,lookX=0,lookY=0,drag=false,lastX=0,lastY=0;
 const keys=new Set<string>();
 function draw(){
  const s=game.state;world.update(s);actors.update(s);
  let angle=.19*smooth(17,21,s.t)-.35*smooth(21,24,s.t)+.43*smooth(27,30,s.t)+lookX;
  const close=smooth(19,24,s.t),back=5.3-2.0*close,camHeight=2.15-.4*close+lookY,viewY=s.y+actors.human.groundOffset;
  camera.position.set(s.x-Math.sin(angle)*back,viewY+camHeight,s.z-Math.cos(angle)*back);
  camera.lookAt(s.x+Math.sin(angle)*3.0+1.2*close,viewY+1.10-.2*close,s.z+Math.cos(angle)*3.0);
  sun.target.position.set(s.x,s.y+1,s.z);sun.position.set(s.x-35,s.y+66,s.z-35);sun.target.updateMatrixWorld();
  composer.render(1/60);
 }
 const diagnostics=()=>({state:{...game.state},events:game.events,supportSurfaceY:actors.supportSurfaceY,visualGroundOffset:actors.human.groundOffset,render:renderer.info.render,playerFeet:actors.human.bones.footL.getWorldPosition(new T.Vector3()).toArray(),leftHand:actors.giant.bones.handL.getWorldPosition(new T.Vector3()).toArray(),head:actors.giant.head.getWorldPosition(new T.Vector3()).toArray(),camera:camera.position.toArray()});
 const frame=(time:number)=>{
  if(time+1/120<game.state.t)game.reset();while(game.state.t+1/120<time)game.step();draw();return diagnostics();
 };
 Object.assign(window,{__PV:{ready:true,frame,diagnostics,reset:()=>{game.reset();draw()},jpeg:(time:number,quality=.93)=>{frame(time);return renderer.domElement.toDataURL('image/jpeg',quality).split(',')[1]},png:(time:number)=>{frame(time);return renderer.domElement.toDataURL('image/png').split(',')[1]}}});
 document.getElementById('loading')!.remove();draw();
 window.addEventListener('resize',()=>{renderer.setSize(innerWidth,innerHeight);composer.setSize(innerWidth,innerHeight);ao.setSize(Math.round(innerWidth*.5),Math.round(innerHeight*.5));camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();draw()});
 window.addEventListener('keydown',e=>{keys.add(e.code);if(e.code==='KeyP'){manual=!manual;game.state.mode=manual?'explore':'replay'}if(e.code==='KeyR'){game.reset();paused=false;manual=false}if(e.code==='Space'&&!manual){paused=!paused;e.preventDefault()}});
 window.addEventListener('keyup',e=>keys.delete(e.code));
 renderer.domElement.addEventListener('pointerdown',e=>{drag=true;lastX=e.clientX;lastY=e.clientY;renderer.domElement.setPointerCapture(e.pointerId)});
 renderer.domElement.addEventListener('pointerup',()=>drag=false);
 renderer.domElement.addEventListener('pointermove',e=>{if(drag){lookX-=(e.clientX-lastX)*.004;lookY=T.MathUtils.clamp(lookY+(e.clientY-lastY)*.005,-.4,3);lastX=e.clientX;lastY=e.clientY;draw()}});
 if(!capture){let last=performance.now(),acc=0;const tick=(now:number)=>{acc+=Math.min((now-last)/1000,.1);last=now;if(!paused){while(acc>=1/60){
   if(manual){const x=Number(keys.has('KeyD'))-Number(keys.has('KeyA')),z=Number(keys.has('KeyW'))-Number(keys.has('KeyS')),d=Math.max(1,Math.hypot(x,z));game.step(1/60,{x:x/d*2,z:z/d*2,jump:keys.has('Space'),crouch:keys.has('KeyC'),grip:keys.has('KeyG'),interact:keys.has('KeyE')})}else game.step();acc-=1/60
  }}else acc=0;draw();requestAnimationFrame(tick)};requestAnimationFrame(tick)}
}
start().catch(e=>{document.getElementById('error')!.textContent=String(e.stack??e);console.error(e)});
