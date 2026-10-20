import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {Character} from './characters';
import {refineBody} from './refine';
import type {State} from '../simulation/game';
import {smooth} from '../simulation/replay';
type RigContract={aliases:Record<string,string>;height:number;source:string};
const v=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
function worldQ(o:T.Object3D,q:T.Quaternion){o.quaternion.copy(o.parent!.getWorldQuaternion(new T.Quaternion()).invert().multiply(q));o.updateWorldMatrix(false,true);}
function frame(finger:T.Vector3,normal:T.Vector3){const y=finger.clone().normalize(),z=normal.clone().cross(y).normalize(),x=y.clone().cross(z).normalize();return new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(x,y,z))}
export class ScannedCharacter implements Character{
 root=new T.Group();unit=new T.Group();bones:Record<string,T.Bone>={};rest=new Map<string,{q:T.Quaternion;p:T.Vector3}>();head!:T.Object3D;headRest=new T.Quaternion();footRest:Record<string,T.Quaternion>={};body!:T.SkinnedMesh;shadow:T.Mesh;handOffsets:Record<string,T.Quaternion>={};isGiant=false;poseState?:State;headOffset=new T.Quaternion();fingerAxes:Record<string,T.Vector3>={};
 constructor(source:T.Group,contract:RigContract,height:number,giant:boolean){
  this.isGiant=giant;this.root.name=giant?'scanned-giant-worker':'scanned-human-player';this.root.add(this.unit);this.unit.scale.setScalar(height/contract.height);
  const rig=clone(source);this.unit.add(rig);
  rig.traverse(o=>{if((o as T.Bone).isBone){const b=o as T.Bone;this.bones[b.name]=b;this.rest.set(b.name,{q:b.quaternion.clone(),p:b.position.clone()});}
   if((o as T.Mesh).isMesh){const mesh=o as T.Mesh;mesh.castShadow=mesh.receiveShadow=true;mesh.frustumCulled=false;if((o as T.SkinnedMesh).isSkinnedMesh){this.body=o as T.SkinnedMesh;if(giant)mesh.geometry=refineBody(mesh.geometry,1);}
    const materials=Array.isArray(mesh.material)?mesh.material:[mesh.material];for(const material of materials){const m=material as T.MeshStandardMaterial;if(m.map)m.map.anisotropy=8;if(m.normalMap)m.normalScale.setScalar(.65);m.envMapIntensity=.7;}
   }});
  for(const [alias,name]of Object.entries(contract.aliases)){if(!this.bones[name])throw Error('Scanned rig missing '+name);this.bones[alias]=this.bones[name];}
  for(const name of ['spine','spine001','spine002','spine003','spine004','thighL','shinL','footL','thighR','shinR','footR','upper_armL','forearmL','handL','upper_armR','forearmR','handR'])if(!this.bones[name])throw Error('Missing required alias: '+name);
  this.head=this.bones.spine004;this.headRest.copy(this.head.quaternion);
  this.root.updateMatrixWorld(true);
  this.headOffset.copy(this.head.getWorldQuaternion(new T.Quaternion()));
  for(const side of ['L','R']){
   this.footRest[side]=this.bones['foot'+side].getWorldQuaternion(new T.Quaternion());
   const hand=this.bones['hand'+side],middle=this.bones['f_middle01'+side],index=this.bones['f_index01'+side],pinky=this.bones['f_pinky01'+side];
   const hp=hand.getWorldPosition(v()),finger=middle.getWorldPosition(v()).sub(hp).normalize();
   const across=index.getWorldPosition(v()).sub(pinky.getWorldPosition(v())).normalize(),palm=across.clone().cross(finger).normalize();if(palm.z<0)palm.negate();
   const physical=frame(finger,palm);this.handOffsets[side]=physical.invert().multiply(hand.getWorldQuaternion(new T.Quaternion()));
   const axis=finger.clone().cross(palm).normalize();for(const name of ['f_index','f_middle','f_ring','f_pinky','thumb'])for(const segment of ['01','02','03']){const key=name+segment+side,b=this.bones[key];if(b)this.fingerAxes[key]=axis.clone().applyQuaternion(b.getWorldQuaternion(new T.Quaternion()).invert());}
  }
  this.shadow=new T.Mesh(new T.CircleGeometry(height*.16,24),new T.MeshBasicMaterial({color:0x172526,transparent:true,opacity:giant?.11:.24,depthWrite:false}));this.shadow.rotation.x=-Math.PI/2;
 }
 resetPose=Character.prototype.resetPose;local=Character.prototype.local;legs=Character.prototype.legs;
 bendSpine(angle:number){
  const axis=v(1,0,0).applyQuaternion(this.root.getWorldQuaternion(new T.Quaternion()));
  for(const name of ['spine001','spine002','spine003']){const b=this.bones[name];worldQ(b,new T.Quaternion().setFromAxisAngle(axis,angle/3).multiply(b.getWorldQuaternion(new T.Quaternion())));}
 }
 updatePlayer(s:State){
  this.root.position.set(s.x,s.y,s.z);this.root.rotation.y=s.yaw;this.resetPose();
  const speed=Math.hypot(s.vx,s.vz),moving=speed>.08,phase=s.distance/1.04*Math.PI*2,wave=moving?Math.sin(phase):0;
  const interact=s.t>=12.8&&s.t<14.4?smooth(12.8,13.15,s.t)*(1-smooth(14.05,14.4,s.t)):0;
  const down=s.crouch+interact*.15+s.grip*.1,hip=this.bones.spine,hp=hip.getWorldPosition(v());hp.y-=down;
  if(moving&&s.grounded)hp.y+=Math.cos(phase*2)*.012;
  hip.position.copy(hip.parent!.worldToLocal(hp));this.root.updateMatrixWorld(true);
  this.bendSpine(s.crouch*.55+s.grip*.12+interact*.65+(moving?.06:0));
  const foot=(side:number)=>{
   const u=((s.distance/1.04+(side>0?.5:0))%1+1)%1,swing=u>=.5;
   const a=swing?(u-.5)*2:u*2;
   const z=moving?(swing?-.26+.52*a:.26-.52*a):0;
   const y=!s.grounded?.22:moving&&swing?Math.sin(a*Math.PI)*.13:0;
   return this.local(side*.12,.075+y,z);
  };
  this.legs(foot(1),foot(-1),this.local(0,.5,1.2));
  for(const side of ['L','R']){
   const sign=side==='L'?1:-1;let target=this.local(sign*.23,.92-down*.6,.08-wave*.2*sign);
   if(s.grip>.1)target.lerp(v(s.x+sign*.22,s.cargoY+.86,2.95+s.cargoZ),s.grip);
   if(interact>.1)target.lerp(v(4.35+sign*.12,s.cargoY+.35,2.4+s.cargoZ),interact);
   if(s.crouch>.2)target=this.local(sign*.20,.38,.34);
   this.arm(side,target,this.local(sign*.34,.45-down*.15,.08));
  }
  this.shadow.position.set(s.x,s.onCargo?s.cargoY+.012:4.012,s.z);this.shadow.visible=s.y<6||s.onCargo;
 }
 updateGiant(s:State){
  this.poseState=s;Character.prototype.updateGiant.call(this,s);
  for(const finger of ['f_index','f_middle','f_ring','f_pinky','thumb'])for(const segment of ['01','02','03']){
   const key=finger+segment+'R',b=this.bones[key];if(b&&this.fingerAxes[key])b.quaternion.copy(this.rest.get(b.name)!.q).multiply(new T.Quaternion().setFromAxisAngle(this.fingerAxes[key],segment==='01'?.95:segment==='02'?1.3:.7));
  }
  this.head.quaternion.copy(this.headRest);this.root.updateMatrixWorld(true);
  if(s.inspect>.01){const target=v(s.x,s.cargoY+.55,s.z+1.6),pivot=new T.Object3D();pivot.position.copy(this.head.getWorldPosition(v()));pivot.lookAt(target);
   const desired=pivot.quaternion.multiply(this.headOffset),current=this.head.getWorldQuaternion(new T.Quaternion());worldQ(this.head,current.slerp(desired,s.inspect*.8));}
 }

 arm(side:string,target:T.Vector3,pole:T.Vector3,handQ?:T.Quaternion){
  if(this.isGiant&&side==='R'&&this.poseState){const s=this.poseState;target=v(2.15,s.cargoY-3.4,4.8+s.cargoZ);handQ=frame(v(0,1,0),v(1,0,0));}
  Character.prototype.arm.call(this,side,target,pole,handQ?handQ.clone().multiply(this.handOffsets[side]):undefined);
 }
}
export async function loadScannedCharacters(scene:T.Scene){
 const response=await fetch('./assets/scanned-actor.json');if(!response.ok)throw Error('Download/prepare the licensed scanned actor before running this version.');
 const contract=await response.json() as RigContract,asset=await new GLTFLoader().loadAsync('./assets/scanned-actor.glb');
 const human=new ScannedCharacter(asset.scene,contract,1.7,false),giant=new ScannedCharacter(asset.scene,contract,60,true);
 scene.add(human.root,giant.root,human.shadow);
 const ray=new T.Raycaster();let supportSurfaceY:number|null=null;
 return{human,giant,get supportSurfaceY(){return supportSurfaceY;},update(s:Parameters<Character['updatePlayer']>[0]){giant.updateGiant(s);human.updatePlayer(s);supportSurfaceY=null;
  if(s.grounded&&!s.onCargo&&s.z>-3.3&&s.z<3.3){giant.root.updateMatrixWorld(true);ray.set(v(s.x,s.y+1,s.z),v(0,-1,0));ray.far=3;const hits=ray.intersectObject(giant.root,true);if(hits.length)supportSurfaceY=hits[0].point.y;}
 }};
}
