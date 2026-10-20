import * as T from 'three';
import {refineBody,tailorBody} from './refine';
import {skinMaterial,clothMaterial,type SkinMaps} from './detail';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import type {State} from '../simulation/game';
import {smooth} from '../simulation/replay';
const v=(x=0,y=0,z=0)=>new T.Vector3(x,y,z),up=v(0,1,0),q=new T.Quaternion();
const qWorld=(o:T.Object3D,w:T.Quaternion)=>{const pq=o.parent!.getWorldQuaternion(new T.Quaternion());o.quaternion.copy(pq.invert().multiply(w));o.updateWorldMatrix(false,true)};
function aim(bone:T.Bone,child:T.Bone,target:T.Vector3){
 const a=bone.getWorldPosition(v()),d=child.getWorldPosition(v()).sub(a).normalize(),to=target.clone().sub(a).normalize();
 const delta=new T.Quaternion().setFromUnitVectors(d,to);qWorld(bone,delta.multiply(bone.getWorldQuaternion(new T.Quaternion())));
}
function ik(a:T.Bone,b:T.Bone,c:T.Bone,target:T.Vector3,pole:T.Vector3){
 const start=a.getWorldPosition(v()),mid=b.getWorldPosition(v()),end=c.getWorldPosition(v()),la=start.distanceTo(mid),lb=mid.distanceTo(end),dir=target.clone().sub(start),distance=dir.length();
 dir.normalize();const d=T.MathUtils.clamp(distance,Math.abs(la-lb)+.0001,la+lb-.001),cos=T.MathUtils.clamp((la*la+d*d-lb*lb)/(2*la*d),-1,1);
 const side=pole.clone().sub(start);side.addScaledVector(dir,-side.dot(dir));if(side.lengthSq()<.0001)side.copy(v(0,0,1).cross(dir));side.normalize();
 const elbow=start.clone().addScaledVector(dir,la*cos).addScaledVector(side,la*Math.sqrt(1-cos*cos));
 aim(a,b,elbow);aim(b,c,start.clone().addScaledVector(dir,d));
}
function palmQuaternion(finger:T.Vector3,normal:T.Vector3){const y=finger.clone().normalize(),z=normal.clone().cross(y).normalize(),x=y.clone().cross(z).normalize();return new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(x,y,z))}
export class Character{
 root=new T.Group();unit=new T.Group();bones:Record<string,T.Bone>={};rest=new Map<string,{q:T.Quaternion;p:T.Vector3}>();head!:T.Group;headRest=new T.Quaternion();footRest:Record<string,T.Quaternion>={};body!:T.SkinnedMesh;shadow:T.Mesh;
 constructor(base:T.Group,headGeo:T.BufferGeometry,headMat:T.Material|T.Material[],height:number,giant:boolean,cloth:T.Texture,skin?:SkinMaps){
  this.root.name=giant?'giant-worker':'human-player';this.root.add(this.unit);this.unit.scale.setScalar(height/1.94459);
  const correction=new T.Group();correction.rotation.y=-Math.PI/2;correction.position.y=.996932;this.unit.add(correction);
  const rig=clone(base);correction.add(rig);
  rig.traverse(o=>{if((o as T.Bone).isBone){const b=o as T.Bone;this.bones[b.name]=b;this.rest.set(b.name,{q:b.quaternion.clone(),p:b.position.clone()})}if((o as T.SkinnedMesh).isSkinnedMesh)this.body=o as T.SkinnedMesh});
  const geo=this.body.geometry.clone(),pos=geo.getAttribute('position'),idx=geo.getIndex()!,skinIndices=geo.getAttribute('skinIndex'),weights=geo.getAttribute('skinWeight');
  const newIndex:number[]=[],byMaterial:number[][]=[[],[],[],[]];
  for(let i=0;i<idx.count;i+=3){
   const ids=[idx.getX(i),idx.getX(i+1),idx.getX(i+2)],y=ids.reduce((s,j)=>s+pos.getY(j),0)/3+.996932;
   if(y>1.642)continue;
   let hand=0,forearm=0;for(const j of ids)for(let k=0;k<4;k++){const name=this.body.skeleton.bones[skinIndices.getComponent(j,k)]?.name??'';const w=weights.getComponent(j,k);if(/hand|f_|thumb/.test(name))hand+=w;if(/forearm/.test(name))forearm+=w}
   let mat=y<.32?3:y<.96?2:1;if(hand>.7||(giant&&forearm>1.3))mat=0;
   byMaterial[mat].push(...ids);
  }
  geo.clearGroups();for(let material=0;material<4;material++){const start=newIndex.length;newIndex.push(...byMaterial[material]);geo.addGroup(start,byMaterial[material].length,material)}geo.setIndex(newIndex);
  this.body.geometry=tailorBody(refineBody(geo,giant?2:1));this.body.material=[
   skinMaterial(skin),
   clothMaterial(cloth,giant),
   clothMaterial(cloth,giant,true),
   new T.MeshStandardMaterial({color:0x352b24,roughness:.7})
  ];this.body.castShadow=this.body.receiveShadow=true;this.body.frustumCulled=false;
  this.head=new T.Group();this.head.position.set(0,1.69,.015);this.unit.add(this.head);
  const h=new T.Mesh(headGeo,headMat);h.scale.setScalar(.06);h.castShadow=h.receiveShadow=true;this.head.add(h);
  this.root.updateMatrixWorld(true);this.bones.spine004.attach(this.head);this.headRest.copy(this.head.quaternion);
  for(const side of ['L','R'])this.footRest[side]=this.bones['foot'+side].getWorldQuaternion(new T.Quaternion());
  const accessory=(geometry:T.BufferGeometry,material:T.Material,p:T.Vector3,bone:string)=>{const o=new T.Mesh(geometry,material);o.position.copy(p);o.castShadow=o.receiveShadow=true;this.unit.add(o);this.root.updateMatrixWorld(true);this.bones[bone].attach(o);return o};
  accessory(new T.CapsuleGeometry(.058,.11,6,12),(this.body.material as T.Material[])[0],v(0,1.63,0),'spine004');
  const leather=new T.MeshStandardMaterial({color:giant?0x433527:0x876c48,roughness:.88});
  accessory(new T.CylinderGeometry(.164,.15,.075,16),leather,v(0,.98,0),'spine');
  if(!giant){
   accessory(new RoundedBoxGeometry(.29,.32,.13,3,.04),leather,v(.12,1.10,-.21),'spine001');
   const strap=accessory(new T.BoxGeometry(.032,.59,.045),leather,v(.02,1.32,-.19),'spine002');strap.rotation.z=.3;
   const scarf=accessory(new T.TorusGeometry(.115,.034,8,20),new T.MeshStandardMaterial({color:0xd4cbb7,roughness:1}),v(0,1.60,0),'spine003');scarf.rotation.x=Math.PI/2;
  }else{
   accessory(new T.TorusGeometry(.113,.012,6,24),leather,v(0,1.61,0),'spine003').rotation.x=Math.PI/2;
  }
  // A real jacket front and boots complement the displaced, skinned clothing shell.
  const darkCloth=(this.body.material as T.Material[])[1];
  for(const side of [-1,1]){
   const lapel=accessory(new RoundedBoxGeometry(.075,.26,.025,3,.008),darkCloth,v(side*.065,1.46,.16),'spine003');lapel.rotation.z=side*-.27;
  }
  for(let y=1.07;y<1.48;y+=.085){const button=accessory(new T.SphereGeometry(.009,8,6),leather,v(.012,y,.177),y<1.25?'spine001':'spine002');button.scale.z=.4;}
  const hairGeo=new T.SphereGeometry(.13,32,20),hp=hairGeo.getAttribute('position'),hi=hairGeo.getIndex()!,keepHair:number[]=[];
  for(let i=0;i<hi.count;i+=3){const ids=[hi.getX(i),hi.getX(i+1),hi.getX(i+2)];if(ids.every(j=>hp.getY(j)>-.085&&!(hp.getZ(j)>.04&&hp.getY(j)<.025)))keepHair.push(...ids)}hairGeo.setIndex(keepHair);
  const hair=new T.Mesh(hairGeo,new T.MeshStandardMaterial({color:giant?0x302820:0x211f1a,roughness:.96,bumpMap:cloth,bumpScale:.001}));
  hair.position.set(0,.13,-.035);hair.scale.set(1,1,1.1);hair.castShadow=true;this.head.add(hair);
  this.shadow=new T.Mesh(new T.CircleGeometry(height*.16,24),new T.MeshBasicMaterial({color:0x172526,transparent:true,opacity:giant?.11:.24,depthWrite:false}));this.shadow.rotation.x=-Math.PI/2;
 }
 resetPose(){this.head.quaternion.copy(this.headRest);for(const [n,p]of this.rest){this.bones[n].quaternion.copy(p.q);this.bones[n].position.copy(p.p)}this.root.updateMatrixWorld(true)}
 local(x:number,y:number,z:number){return this.root.localToWorld(v(x,y,z))}
 bendSpine(angle:number){for(const n of ['spine001','spine002','spine003'])this.bones[n].quaternion.multiply(new T.Quaternion().setFromAxisAngle(v(1,0,0),angle/3));this.root.updateMatrixWorld(true)}
 legs(left:T.Vector3,right:T.Vector3,poles:T.Vector3){
  for(const [side,target]of [['L',left],['R',right]] as const){ik(this.bones['thigh'+side],this.bones['shin'+side],this.bones['foot'+side],target,poles);const turn=new T.Quaternion().setFromAxisAngle(up,this.root.rotation.y);qWorld(this.bones['foot'+side],turn.multiply(this.footRest[side]))}
 }
 arm(side:string,target:T.Vector3,pole:T.Vector3,handQ?:T.Quaternion){ik(this.bones['upper_arm'+side],this.bones['forearm'+side],this.bones['hand'+side],target,pole);if(handQ)qWorld(this.bones['hand'+side],handQ)}
 updatePlayer(s:State){
  this.root.position.set(s.x,s.y,s.z);this.root.rotation.y=s.yaw;this.resetPose();
  const speed=Math.hypot(s.vx,s.vz),moving=speed>.08,phase=s.t*7.2,wave=moving?Math.sin(phase):0,lift=moving?.13:0;
  const interact=s.t>=12.8&&s.t<14.4?smooth(12.8,13.15,s.t)*(1-smooth(14.05,14.4,s.t)):0;
  const down=s.crouch+interact*.15+s.grip*.1;
  this.bones.spine.position.y-=down/(1.7/1.94459);this.bendSpine(s.crouch*.55+s.grip*.12+interact*.65);
  const airborne=!s.grounded;
  const foot=(side:number)=>this.local(side*.12,.075+(airborne?.2:Math.max(0,Math.sin(phase+(side>0?0:Math.PI))))*lift,airborne?-.12:wave*.23*side);
  this.legs(foot(1),foot(-1),this.local(0,.5,1.2));
  for(const side of ['L','R']){
   const sign=side==='L'?1:-1;
   let target=this.local(sign*.23,.92-down*.6,.08-wave*.2*sign);
   if(s.grip>.1)target.lerp(v(s.x+sign*.22,s.cargoY+.86,2.95+s.cargoZ),s.grip);
   if(interact>.1)target.lerp(v(4.35+sign*.12,s.cargoY+.35,2.4+s.cargoZ),interact);
   if(s.crouch>.2)target=this.local(sign*.20,.38,.34);
   this.arm(side,target,this.local(sign*.34,.45-down*.15,.08));
  }
  this.shadow.position.set(s.x,s.onCargo?s.cargoY+.012:4.012,s.z);this.shadow.visible=s.y<6||s.onCargo;
 }
 updateGiant(s:State){
  const a=s.giantRise,inspect=s.inspect,ret=s.handRetreat;
  this.root.position.set(-19+9*a-7*inspect,-28*(1-a)-6*inspect,12);this.root.rotation.y=Math.PI/2;this.resetPose();
  this.bendSpine(1.12*(1-a)+.23*a+.68*inspect);
  this.legs(v(-22+5*a,2.1,6),v(-23+5*a,2.1,18),v(-2,7,12));
  for(const side of ['L','R']){this.bones['forearm'+side].position.multiplyScalar(1.25);this.bones['hand'+side].position.multiplyScalar(1.25)}this.root.updateMatrixWorld(true);
  const left=v(-11*ret,3.80+2.5*(1-smooth(0,2.2,s.t))+12*ret+18*a,3.45);
  this.arm('L',left,v(-16,11,0),palmQuaternion(v(0,0,-1),v(0,-1,0)));
  const right=v(2.15,s.cargoY-.25,6.1+s.cargoZ);
  this.arm('R',right,v(-17,15,24),palmQuaternion(v(0,0,-1),v(1,.2,0)));
  // The same five fingers curl around the outside handle; the left fingers stay open while supporting the player.
  for(const side of ['L','R'])for(const finger of ['f_index','f_middle','f_ring','f_pinky','thumb'])for(const segment of ['01','02','03']){
   const b=this.bones[finger+segment+side];if(b)b.quaternion.multiply(new T.Quaternion().setFromAxisAngle(v(1,0,0),side==='R'?.7:(ret*.2)));
   if(side==='L'&&ret<.01&&finger!=='thumb'){const next=this.bones[finger+(segment==='01'?'02':segment==='02'?'03':'')+side];if(next&&segment!=='03')aim(b,next,b.getWorldPosition(v()).add(v(0,0,-3)));}
  }
  if(inspect>.01){
   const hp=this.head.getWorldPosition(v());const target=v(s.x,s.cargoY+.55,s.z+1.6);
   const pivot=new T.Object3D();pivot.position.copy(hp);pivot.lookAt(target);const desired=pivot.quaternion;const current=this.head.getWorldQuaternion(new T.Quaternion());qWorld(this.head,current.slerp(desired,inspect*.8));
  }
 }
}
export async function loadCharacters(scene:T.Scene,cloth:T.Texture){
 const loader=new GLTFLoader(),tl=new T.TextureLoader();
 const [base,hg,col,normal]=await Promise.all([loader.loadAsync('./assets/human-base.glb'),loader.loadAsync('./assets/LeePerrySmith.glb'),tl.loadAsync('./assets/face-albedo-open.jpg'),tl.loadAsync('./assets/Infinite-Level_02_Tangent_SmoothUV.jpg')]);col.colorSpace=T.SRGBColorSpace;col.flipY=normal.flipY=true;col.anisotropy=4;
 let headGeo!:T.BufferGeometry;hg.scene.traverse(o=>{if((o as T.Mesh).isMesh)headGeo=(o as T.Mesh).geometry});
 const positions=headGeo.getAttribute('position'),uv=headGeo.getAttribute('uv'),indices=headGeo.getIndex(),kept:number[]=[],eyeIndices:number[]=[];
 const count=indices?indices.count:positions.count;for(let n=0;n<count;n+=3){const a=indices?indices.getX(n):n,b=indices?indices.getX(n+1):n+1,c=indices?indices.getX(n+2):n+2;if((positions.getY(a)+positions.getY(b)+positions.getY(c))/3>=-1.05){const eye=[a,b,c].every(i=>uv.getY(i)>.90&&(uv.getX(i)<.10||uv.getX(i)>.90));(eye?eyeIndices:kept).push(a,b,c)}}headGeo=headGeo.clone();headGeo.setIndex([...kept,...eyeIndices]);headGeo.clearGroups();headGeo.addGroup(0,kept.length,0);headGeo.addGroup(kept.length,eyeIndices.length,1);
 const eyeAmount={value:0};
 const eyeMat=new T.MeshStandardMaterial({map:col,normalMap:normal,normalScale:new T.Vector2(.65,.65),roughness:.68,color:0xffead7});
 eyeMat.onBeforeCompile=shader=>{shader.uniforms.eyeAmount=eyeAmount;
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 eyeSource;').replace('#include <begin_vertex>','#include <begin_vertex>\neyeSource=position;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 eyeSource;\nuniform float eyeAmount;').replace('#include <color_fragment>',`#include <color_fragment>
   vec2 eyeUV=(eyeSource.xy-vec2(sign(eyeSource.x)*.69,1.45))/vec2(.28,.23);
   float rad=length(eyeUV);float iris=(1.-smoothstep(.76,.90,rad))*smoothstep(1.5,1.7,eyeSource.z);
   float pupil=1.-smoothstep(.30,.38,rad);float streak=.025*sin(atan(eyeUV.y,eyeUV.x)*42.);
   vec3 eyeColor=mix(vec3(.74,.76,.72),vec3(.17+streak,.080+streak,.032),iris);
   eyeColor=mix(eyeColor,vec3(.008),pupil*iris);
   diffuseColor.rgb=mix(diffuseColor.rgb,eyeColor,eyeAmount);
  `);
 };
 const headMat=new T.MeshStandardMaterial({map:col,normalMap:normal,normalScale:new T.Vector2(.65,.65),roughness:.68,color:0xffead7});
 const skinTextures=await Promise.all(['color','normal','roughness'].map(k=>tl.loadAsync('./assets/surfaces/skin-'+k+'.jpg')));
 skinTextures.forEach((t,i)=>{t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=8;if(i===0)t.colorSpace=T.SRGBColorSpace;});
 const skin:SkinMaps={map:skinTextures[0],normalMap:skinTextures[1],roughnessMap:skinTextures[2]};
 const human=new Character(base.scene,headGeo,headMat,1.7,false,cloth,skin),giant=new Character(base.scene,headGeo,[headMat,eyeMat],60,true,cloth,skin);scene.add(human.root,giant.root,human.shadow);
 return{human,giant,update(s:State){eyeAmount.value=s.inspect;human.updatePlayer(s);giant.updateGiant(s)}};
}
