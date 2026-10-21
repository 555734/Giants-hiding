import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {anatomicalEye,scannedSkin} from './portrait';
type Actor={unit:T.Group;root:T.Group;bones:Record<string,T.Bone>;isGiant:boolean};
let weave:T.CanvasTexture|undefined;
function fabric(){
 if(weave)return weave;
 const c=document.createElement('canvas');c.width=c.height=256;const g=c.getContext('2d')!;g.fillStyle='#b5afa3';g.fillRect(0,0,256,256);
 for(let n=0;n<256;n+=3){g.strokeStyle=n%2?'rgba(43,37,28,.04)':'rgba(244,231,206,.05)';g.lineWidth=1;g.beginPath();g.moveTo(n,0);g.lineTo(n,256);g.stroke();g.beginPath();g.moveTo(0,n);g.lineTo(256,n);g.stroke();}
 weave=new T.CanvasTexture(c);weave.colorSpace=T.SRGBColorSpace;weave.wrapS=weave.wrapT=T.RepeatWrapping;weave.repeat.set(7,7);weave.anisotropy=8;return weave;
}
let leatherMaps:T.Texture[]=[];
export async function loadWorkwearSurfaces(){
 leatherMaps=await Promise.all(['color','normal','roughness'].map(slot=>new T.TextureLoader().loadAsync('./assets/surfaces/brown_leather-'+slot+'.jpg')));
 leatherMaps.forEach((map,i)=>{map.wrapS=map.wrapT=T.RepeatWrapping;map.anisotropy=8;if(i===0)map.colorSpace=T.SRGBColorSpace;});
}
export function fitWorkwear(actor:Actor){
 const giant=actor.isGiant,dye=giant?0x827866:0x536d80;
 actor.unit.traverse(o=>{if(!(o as T.Mesh).isMesh)return;const mesh=o as T.Mesh;
  const materials=(Array.isArray(mesh.material)?mesh.material:[mesh.material]).map(source=>{
   if(/Anatomical eye/i.test(source.name))return anatomicalEye();
   const skin=!/Worker |Travel |Work |Rolled sleeve|Jacket seams|Linen collar|Horn buttons|Scanned hair|Fitted jacket collar/i.test(source.name);
   const m=skin?scannedSkin(source as T.MeshStandardMaterial):(source as T.MeshStandardMaterial).clone();
   if(/Worker eyes/i.test(source.name)){const eye=new T.MeshPhysicalMaterial();T.MeshStandardMaterial.prototype.copy.call(eye,source);eye.roughness=.18;eye.normalScale.setScalar(.08);eye.ior=1.38;eye.specularIntensity=.5;eye.clearcoat=.45;eye.clearcoatRoughness=.10;return eye;}
   if(/Worker skin/i.test(m.name))return scannedSkin(source as T.MeshStandardMaterial);
   if(/Worker linen|Worker waistcoat|Worker trousers/i.test(m.name)){m.color.set(0xe5d6bb);m.roughness=.94;}
   if(/Worker boots/i.test(m.name)){m.color.set(0x79624a);m.roughness=.82;}
   if(/Travel coat/i.test(m.name)){m.color.set(0x8c9296);m.roughness=.96;}
   if(/Work jacket/i.test(m.name)){m.color.set(dye);m.roughness=1;}
   if(/Work trousers/i.test(m.name)){
    m.color.set(giant?0xb1a087:0xae9675);m.roughness=1;
    m.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',T.ShaderChunk.map_fragment.replace('diffuseColor *= sampledDiffuseColor;','sampledDiffuseColor.rgb=vec3(dot(sampledDiffuseColor.rgb,vec3(.299,.587,.114)))*1.65;diffuseColor *= sampledDiffuseColor;'));};
    m.customProgramCacheKey=()=> 'neutral-work-trousers';
   }
   if(/Work boots/i.test(m.name)){m.color.set(0x3d3026);m.map=null;m.roughness=.86;}
   if(/Rolled sleeve|Fitted jacket collar/i.test(m.name)){m.color.set(dye).multiplyScalar(.52);m.roughness=.96;m.metalness=0;if(typeof document!=='undefined'){fabric();m.map=null;m.bumpMap=weave!;m.bumpScale=.0005;}}
   if(/Jacket seams/i.test(m.name)){m.color.set(giant?0x5a5143:0x394e5f);m.roughness=.95;}
   if(/Linen collar/i.test(m.name)){m.color.set(0xb9b09a);m.roughness=.96;}
   if(/Horn buttons/i.test(m.name)){m.color.set(0x40372d);m.roughness=.6;}
   if(/Scanned hair/i.test(m.name)){m.color.set(giant?0x8d8276:0x625b54);m.roughness=.94;m.normalScale.setScalar(.4);}
   if(/Work wrist cuff/i.test(m.name)){m.color.set(0x493c30);m.map=null;m.roughness=.86;}
   return m;
  });mesh.material=Array.isArray(mesh.material)?materials:materials[0];
 });
 if(typeof document==='undefined')return;
 const leather=new T.MeshStandardMaterial({color:0xb39b7d,map:leatherMaps[0],normalMap:leatherMaps[1],roughnessMap:leatherMaps[2],normalScale:new T.Vector2(.45,.45),roughness:.88});
 leather.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',T.ShaderChunk.map_fragment.replace('diffuseColor *= sampledDiffuseColor;','sampledDiffuseColor.rgb=pow(sampledDiffuseColor.rgb,vec3(.55));diffuseColor *= sampledDiffuseColor;'));};leather.customProgramCacheKey=()=> 'worn-tan-leather';
 const iron=new T.MeshStandardMaterial({color:0x5c4b36,metalness:.65,roughness:.7});
 function attach(geo:T.BufferGeometry,mat:T.Material,pos:T.Vector3,bone:string,q?:T.Quaternion){
  const mesh=new T.Mesh(geo,mat);mesh.position.copy(pos);if(q)mesh.quaternion.copy(q);actor.unit.add(mesh);mesh.castShadow=mesh.receiveShadow=true;actor.root.updateMatrixWorld(true);actor.bones[bone].attach(mesh);return mesh;
 }
 const v=(x:number,y:number,z:number)=>new T.Vector3(x,y,z);
 if(!giant){
  const bagGeo=new RoundedBoxGeometry(.28,.30,.115,5,.026),bp=bagGeo.getAttribute('position');
  for(let i=0;i<bp.count;i++){const x=bp.getX(i),y=bp.getY(i),z=bp.getZ(i);bp.setXYZ(i,x*(1+.035*Math.sin(y*41)),y,z+Math.sin(x*37+y*31)*.0025);}bagGeo.computeVertexNormals();
  const bag=attach(bagGeo,leather,v(.14,1.16,-.19),'spine001');bag.rotation.z+=.12;
  attach(new RoundedBoxGeometry(.29,.13,.025,3,.012),leather,v(.14,1.255,-.25),'spine001');
  const piping=new T.CatmullRomCurve3([v(.018,1.28,-.253),v(.01,1.04,-.253),v(.14,1.012,-.253),v(.27,1.04,-.253),v(.275,1.28,-.253)]);
  attach(new T.TubeGeometry(piping,40,.003,5,false),leather,v(0,0,0),'spine001');
  attach(new T.BoxGeometry(.055,.035,.015),iron,v(.14,1.21,-.272),'spine001');
  const strap=new T.CatmullRomCurve3([v(-.13,1.66,-.04),v(-.17,1.56,-.16),v(.01,1.36,-.23),v(.15,1.14,-.26)]);
  const positions:number[]=[],indices:number[]=[];
  for(let i=0;i<=24;i++){
   const p=strap.getPoint(i/24),t=strap.getTangent(i/24),across=v(-t.y,t.x,0).normalize().multiplyScalar(.017);
   positions.push(...p.clone().sub(across).toArray(),...p.clone().add(across).toArray());
   if(i<24){const a=i*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}
  }
  const ribbon=new T.BufferGeometry();ribbon.setAttribute('position',new T.Float32BufferAttribute(positions,3));ribbon.setIndex(indices);ribbon.computeVertexNormals();
  const strapLeather=leather.clone();strapLeather.side=T.DoubleSide;attach(ribbon,strapLeather,v(0,0,0),'spine002');

 }
}
