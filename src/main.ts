import * as T from 'three';
import {Game} from './simulation/game';
import {smooth} from './simulation/replay';
import {buildWorld} from './render/world';
import {loadCharacters} from './render/characters';
const params=new URLSearchParams(location.search),capture=params.has('capture');
if(capture)document.body.classList.add('capture');
async function start(){
 const renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance',preserveDrawingBuffer:capture});
 renderer.setPixelRatio(capture?1:Math.min(devicePixelRatio,1.5));renderer.setSize(innerWidth,innerHeight);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
 document.body.prepend(renderer.domElement);
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(58,innerWidth/innerHeight,.06,1200);
 scene.add(new T.HemisphereLight(0xd7e4ed,0x77705c,2.0));
 const sun=new T.DirectionalLight(0xffe0b0,3.0);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-28;sun.shadow.camera.right=28;sun.shadow.camera.top=35;sun.shadow.camera.bottom=-28;sun.shadow.camera.near=1;sun.shadow.camera.far=170;sun.shadow.bias=-.0003;sun.shadow.normalBias=.035;sun.shadow.radius=3;scene.add(sun,sun.target);
 const world=buildWorld(scene),actors=await loadCharacters(scene,world.materials.clothTex),game=new Game();await game.init();
 let paused=false,manual=false,lookX=0,lookY=0,drag=false,lastX=0,lastY=0;
 const keys=new Set<string>();
 function draw(){
  const s=game.state;world.update(s);actors.update(s);
  let angle=.19*smooth(17,21,s.t)-.35*smooth(21,24,s.t)+.43*smooth(27,30,s.t)+lookX;
  const back=5.3,camHeight=2.15+lookY;
  camera.position.set(s.x-Math.sin(angle)*back,s.y+camHeight,s.z-Math.cos(angle)*back);
  camera.lookAt(s.x+Math.sin(angle)*3.0,s.y+1.10,s.z+Math.cos(angle)*3.0);
  sun.target.position.set(s.x,s.y+1,s.z);sun.position.set(s.x-35,s.y+66,s.z-35);sun.target.updateMatrixWorld();
  renderer.render(scene,camera);
 }
 const diagnostics=()=>({state:{...game.state},events:game.events,render:renderer.info.render,playerFeet:actors.human.bones.footL.getWorldPosition(new T.Vector3()).toArray(),leftHand:actors.giant.bones.handL.getWorldPosition(new T.Vector3()).toArray(),head:actors.giant.head.getWorldPosition(new T.Vector3()).toArray(),camera:camera.position.toArray()});
 const frame=(time:number)=>{
  if(time+1/120<game.state.t)game.reset();while(game.state.t+1/120<time)game.step();draw();return diagnostics();
 };
 Object.assign(window,{__PV:{ready:true,frame,diagnostics,reset:()=>{game.reset();draw()},jpeg:(time:number,quality=.93)=>{frame(time);return renderer.domElement.toDataURL('image/jpeg',quality).split(',')[1]},png:(time:number)=>{frame(time);return renderer.domElement.toDataURL('image/png').split(',')[1]}}});
 document.getElementById('loading')!.remove();draw();
 window.addEventListener('resize',()=>{renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();draw()});
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
