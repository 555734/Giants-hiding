import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {seeded} from './materials';
const v=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
export function detailedCargo(m:any){
 const cargo=new T.Group();cargo.name='one-cargo-tray';
 const random=seeded(7462),batches=new Map<T.Material,T.BufferGeometry[]>(),o=new T.Object3D();
 const iron=m.iron.clone() as T.MeshStandardMaterial;iron.color.set(0x514437);iron.metalness=.65;iron.roughness=.78;
 const end=m.wood.clone() as T.MeshStandardMaterial;end.onBeforeCompile=()=>{};end.customProgramCacheKey=()=> 'timber-endgrain';
 // An actual cut end: concentric, irregular growth rings and radial drying checks.
 const c=document.createElement('canvas');c.width=c.height=512;const g=c.getContext('2d')!;
 g.fillStyle='#776351';g.fillRect(0,0,512,512);
 for(let n=2;n<68;n++){g.strokeStyle=n%3?'rgba(39,29,19,.32)':'rgba(192,163,119,.25)';g.lineWidth=1+random()*2;g.beginPath();for(let k=0;k<=120;k++){const a=k/120*Math.PI*2,rad=n*5+Math.sin(a*7+n)*2+Math.sin(a*3)*5;const x=240+Math.cos(a)*rad,y=278+Math.sin(a)*rad*.86;k?g.lineTo(x,y):g.moveTo(x,y);}g.stroke();}
 for(let n=0;n<14;n++){const a=random()*Math.PI*2;g.strokeStyle='rgba(30,23,17,.7)';g.lineWidth=1+random()*2;g.beginPath();g.moveTo(240+Math.cos(a)*80,278+Math.sin(a)*80);g.lineTo(240+Math.cos(a+.03)*400,278+Math.sin(a+.03)*400);g.stroke();}
 const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;end.map=tex;end.normalMap=null;end.roughnessMap=null;end.bumpMap=tex;end.bumpScale=.012;end.color.set(0xd6c8af);end.needsUpdate=true;
 const dark=new T.MeshStandardMaterial({color:0x29231e,roughness:1});
 function add(geo:T.BufferGeometry,mat:T.Material,x=0,y=0,z=0,rx=0,ry=0,rz=0){
  o.position.set(x,y,z);o.rotation.set(rx,ry,rz);o.scale.set(1,1,1);o.updateMatrix();geo.applyMatrix4(o.matrix);
  if(!geo.getAttribute('uv'))geo.setAttribute('uv',new T.Float32BufferAttribute(new Float32Array(geo.getAttribute('position').count*2),2));
  if(geo.index)geo=geo.toNonIndexed();
  // Every baked primitive has the same attribute layout.
  for(const key of Object.keys(geo.attributes))if(!['position','normal','uv'].includes(key))geo.deleteAttribute(key);
  const a=batches.get(mat)??[];a.push(geo);batches.set(mat,a);
 }
 function timber(w:number,h:number,d:number,x:number,y:number,z:number,turn=0){
  const geo=new RoundedBoxGeometry(w,h,d,3,Math.min(.035,h*.09)),p=geo.getAttribute('position');
  for(let i=0;i<p.count;i++){const xx=p.getX(i),yy=p.getY(i),zz=p.getZ(i);p.setXYZ(i,xx+Math.sin(zz*9+yy*17)*.005,yy+Math.sin(zz*8+xx*13)*.006,zz);}
  geo.computeVertexNormals();add(geo,m.wood,x,y,z,0,turn,(random()-.5)*.009);
  for(const s of [-1,1])add(new T.PlaneGeometry(w*.95,h*.9),end,x+Math.sin(turn)*s*(d/2+.003),y,z+Math.cos(turn)*s*(d/2+.003),0,turn+(s<0?Math.PI:0));
  // Long splits and worn edge splinters remain visible in a close third-person view.
  for(let n=0;n<2;n++){
   const a=(random()-.5)*w*.7,len=d*(.15+random()*.3);
   add(new T.BoxGeometry(.004+random()*.004,.002,len),dark,x+a,y+h/2+.002,z+(random()-.5)*(d-len));
  }
 }
 function rope(points:T.Vector3[],radius=.035){
  const curve=new T.CatmullRomCurve3(points),length=curve.getLength(),segments=Math.max(20,Math.ceil(length*20));
  const frames=curve.computeFrenetFrames(segments,false);
  for(let strand=0;strand<3;strand++){
   const path:T.Vector3[]=[];
   for(let i=0;i<=segments;i++){const angle=i/segments*length*24+strand*Math.PI*2/3;
    path.push(curve.getPointAt(i/segments).addScaledVector(frames.normals[i],Math.cos(angle)*radius*.42).addScaledVector(frames.binormals[i],Math.sin(angle)*radius*.42));}
   add(new T.TubeGeometry(new T.CatmullRomCurve3(path),segments,radius*.49,5,false),m.rope);
  }
 }
 function bolt(x:number,y:number,z:number,front=false){
  add(new T.CylinderGeometry(.034,.037,.035,6),iron,x,y,z,front?Math.PI/2:0);
  add(new T.TorusGeometry(.044,.006,4,12),iron,x,y+(front?0:-.011),z+(front?-.011:0),front?0:Math.PI/2);
 }
 // The support top and escape path retain their original dimensions.
 for(let i=0;i<13;i++){const x=-1.84+i*.306;timber(.289,.24,6.98-(i%3)*.025,x,-.12,(random()-.5)*.015);for(const z of [-3.12,0,3.12])bolt(x,.008,z);}
 for(const z of [-3.12,0,3.12])timber(4.10,.25,.30,0,-.35,z);
 for(const x of [-1.9,1.9])add(new T.BoxGeometry(.09,.12,6.65),iron,x,-.10,0);
 for(let row=0;row<3;row++)for(let col=0;col<3;col++){
  const x=(col-1)*.85+(random()-.5)*.022,y=.23+row*.43,z=.32+(random()-.5)*.045;
  timber(.81,.405,3.18+random()*.12,x,y,z);
 }
 for(const x of [-1.45,1.45])for(const z of [-1.55,2.6]){
  timber(.15,1.58,.18,x,.7,z);
  for(const y of [.22,.9]){add(new T.BoxGeometry(.23,.08,.21),iron,x,y,z);bolt(x,y,z-.12,true);}
 }
 timber(3.15,.17,.21,0,.84,-1.55);
 for(const x of [-1.25,1.25]){add(new T.BoxGeometry(.15,.36,.055),iron,x,.83,-1.68);for(const y of [.72,.96])bolt(x,y,-1.717,true);}
 for(const z of [-.62,1.9])for(let n=0;n<3;n++)rope([v(-1.47,.04,z+n*.065),v(-1.46,1.39,z+n*.065),v(-.7,1.45,z+n*.065),v(.7,1.44,z+n*.065),v(1.47,1.38,z+n*.065),v(1.47,.04,z+n*.065)],.025);
 // Corner slings and knots join the same moving load, with clear handholds at its sides.
 for(const x of [-1.78,1.78]){
  rope([v(x,-.2,-2.9),v(x,1.2,-1.8),v(x,2.6,.1),v(x,1.8,1.6),v(x,-.2,2.9)],.037);
  for(const z of [-2.9,2.9])for(let n=0;n<4;n++)add(new T.TorusGeometry(.12,.025,5,16),m.rope,x,.04+n*.042,z,Math.PI/2);
  add(new T.TorusGeometry(.17,.045,6,20),iron,x,2.65,.1);
 }
 // A loose coil and tail on the forward deck.
 const coil:T.Vector3[]=[];for(let i=0;i<=160;i++){const a=i/160*Math.PI*8,rad=.13+i/160*.16;coil.push(v(-1.25+Math.cos(a)*rad,.045+i/160*.035,-2.55+Math.sin(a)*rad));}rope(coil,.016);
 rope([coil.at(-1)!,v(-.85,.03,-2.58),v(-.62,.03,-2.9)],.016);
 for(const x of [-2.3,2.3]){add(new T.BoxGeometry(.16,.18,4.5),iron,x,-.19,.3);for(const z of [-1.8,2.4]){add(new T.BoxGeometry(.7,.16,.18),iron,x>0?2.02:-2.02,-.2,z);bolt(x,.0,z);}}
 for(const [mat,geos]of batches){const geometry=mergeGeometries(geos,false);if(!geometry)throw Error('Cargo geometry merge failed');const mesh=new T.Mesh(geometry,mat);mesh.castShadow=mesh.receiveShadow=true;cargo.add(mesh);for(const geo of geos)geo.dispose();}
 const latch=new T.Mesh(new T.BoxGeometry(.15,.24,.6),iron);latch.position.set(-.4,.17,-2.1);latch.castShadow=true;cargo.add(latch);
 const latchLever=new T.Group();latchLever.position.set(-.4,.25,-2.1);cargo.add(latchLever);
 const lever=new T.Mesh(new T.CylinderGeometry(.027,.033,.38,10),iron);lever.position.y=.16;latchLever.add(lever);
 const knob=new T.Mesh(new T.SphereGeometry(.065,12,8),m.wood);knob.position.y=.35;latchLever.add(knob);
 return{cargo,latch,latchLever};
}
export function hoistChains(scene:T.Scene,m:any){
 const geo=new T.TorusGeometry(.12,.028,5,12),links=new T.InstancedMesh(geo,m.iron,260),o=new T.Object3D();links.castShadow=true;links.frustumCulled=false;scene.add(links);
 return{update(cargoY:number,cargoZ:number){for(let side=0;side<2;side++)for(let n=0;n<130;n++){
  const y=65-n*.48,visible=y>=cargoY+2.7;o.position.set(4.75+(side?1.78:-1.78),y,4.6+cargoZ);
  o.rotation.set(0,n%2?Math.PI/2:0,0);o.scale.set(visible?1:0,visible?1.8:0,visible?1:0);o.updateMatrix();links.setMatrixAt(side*130+n,o.matrix);
 }links.instanceMatrix.needsUpdate=true;}};
}
