import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {anatomicalEye,scannedSkin} from './portrait';
type Actor={unit:T.Group;root:T.Group;bones:Record<string,T.Bone>;isGiant:boolean};
let weave:T.CanvasTexture|undefined;
function fabric(){
 if(weave)return weave;
 const c=document.createElement('canvas');c.width=c.height=256;const g=c.getContext('2d')!;g.fillStyle='#b5afa3';g.fillRect(0,0,256,256);
 for(let n=0;n<256;n+=3){g.strokeStyle=n%2?'rgba(43,37,28,.16)':'rgba(244,231,206,.22)';g.lineWidth=1;g.beginPath();g.moveTo(n,0);g.lineTo(n,256);g.stroke();g.beginPath();g.moveTo(0,n);g.lineTo(256,n);g.stroke();}
 weave=new T.CanvasTexture(c);weave.colorSpace=T.SRGBColorSpace;weave.wrapS=weave.wrapT=T.RepeatWrapping;weave.repeat.set(9,9);weave.anisotropy=4;return weave;
}
export function fitWorkwear(actor:Actor){
 const giant=actor.isGiant,dye=giant?0x827866:0x536d80;
 actor.unit.traverse(o=>{if(!(o as T.Mesh).isMesh)return;const mesh=o as T.Mesh;
  const materials=(Array.isArray(mesh.material)?mesh.material:[mesh.material]).map(source=>{
   if(/Anatomical eye/i.test(source.name))return anatomicalEye();
   const skin=!/Work |Rolled sleeve|Jacket seams|Linen collar|Horn buttons/i.test(source.name);
   const m=skin?scannedSkin(source as T.MeshStandardMaterial):(source as T.MeshStandardMaterial).clone();
   if(/Work jacket/i.test(m.name)){m.color.set(dye);m.roughness=1;}
   if(/Work trousers/i.test(m.name)){
    m.color.set(giant?0xb1a087:0xae9675);m.roughness=1;
    m.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',T.ShaderChunk.map_fragment.replace('diffuseColor *= sampledDiffuseColor;','sampledDiffuseColor.rgb=vec3(dot(sampledDiffuseColor.rgb,vec3(.299,.587,.114)))*1.65;diffuseColor *= sampledDiffuseColor;'));};
    m.customProgramCacheKey=()=> 'neutral-work-trousers';
   }
   if(/Work boots/i.test(m.name)){m.color.set(0x3d3026);m.map=null;m.roughness=.86;}
   if(/Rolled sleeve/i.test(m.name)){m.color.set(dye);m.roughness=.96;m.metalness=0;if(typeof document!=='undefined'){m.map=fabric();m.bumpMap=weave!;m.bumpScale=.0005;}}
   if(/Jacket seams/i.test(m.name)){m.color.set(giant?0x5a5143:0x394e5f);m.roughness=.95;}
   if(/Linen collar/i.test(m.name)){m.color.set(0xb9b09a);m.roughness=.96;}
   if(/Horn buttons/i.test(m.name)){m.color.set(0x40372d);m.roughness=.6;}
   return m;
  });mesh.material=Array.isArray(mesh.material)?materials:materials[0];
 });
 if(typeof document==='undefined')return;
 const cloth=new T.MeshStandardMaterial({color:dye,map:fabric(),bumpMap:weave,bumpScale:.0015,roughness:.96});
 const leather=new T.MeshStandardMaterial({color:0x6e4c30,map:fabric(),roughness:.89});
 const iron=new T.MeshStandardMaterial({color:0x5c4b36,metalness:.65,roughness:.7});
 function attach(geo:T.BufferGeometry,mat:T.Material,pos:T.Vector3,bone:string,q?:T.Quaternion){
  const mesh=new T.Mesh(geo,mat);mesh.position.copy(pos);if(q)mesh.quaternion.copy(q);actor.unit.add(mesh);mesh.castShadow=mesh.receiveShadow=true;actor.root.updateMatrixWorld(true);actor.bones[bone].attach(mesh);return mesh;
 }
 const v=(x:number,y:number,z:number)=>new T.Vector3(x,y,z);
 if(!giant){
  const bag=attach(new RoundedBoxGeometry(.27,.30,.105,4,.025),leather,v(.14,1.16,-.19),'spine001');bag.rotation.z+=.12;
  attach(new RoundedBoxGeometry(.29,.13,.025,3,.012),leather,v(.14,1.255,-.25),'spine001');
  attach(new T.BoxGeometry(.055,.035,.015),iron,v(.14,1.21,-.272),'spine001');
  const strap=new T.CatmullRomCurve3([v(-.13,1.66,-.04),v(-.17,1.56,-.16),v(.01,1.36,-.23),v(.15,1.14,-.26)]);
  attach(new T.TubeGeometry(strap,24,.018,5,false),leather,v(0,0,0),'spine002');

 }
}
