import * as T from 'three';
import {HDRLoader} from 'three/addons/loaders/HDRLoader.js';
/** Metre-space projection prevents a 100m wall from stretching one brick photograph. */
function metreUV(mat:T.MeshStandardMaterial,metres:number){
 mat.onBeforeCompile=s=>{
  s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 surfaceP; varying vec3 surfaceN;').replace('#include <project_vertex>',`#include <project_vertex>
  vec4 sp=vec4(transformed,1.);
  #ifdef USE_INSTANCING
  sp=instanceMatrix*sp;
  #endif
  surfaceP=(modelMatrix*sp).xyz;
  surfaceN=inverseTransformDirection(transformedNormal,viewMatrix);
  `);
  s.fragmentShader=s.fragmentShader.replace('#include <common>',`#include <common>
  varying vec3 surfaceP; varying vec3 surfaceN;
  vec2 realUV(){vec3 n=abs(normalize(surfaceN)); if(n.y>n.x&&n.y>n.z)return surfaceP.xz/${metres.toFixed(3)}; if(n.x>n.z)return surfaceP.zy/${metres.toFixed(3)};return surfaceP.xy/${metres.toFixed(3)};}
  `);
  s.fragmentShader=s.fragmentShader.replaceAll('vMapUv','realUV()').replaceAll('vNormalMapUv','realUV()').replaceAll('vRoughnessMapUv','realUV()');
 };
 mat.customProgramCacheKey=()=> 'metre-projection-'+metres;mat.needsUpdate=true;
}
export async function upgradeSurfaces(renderer:T.WebGLRenderer,scene:T.Scene,m:any){
 const loader=new T.TextureLoader();const tex=async(name:string,color=false)=>{const t=await loader.loadAsync('./assets/surfaces/'+name);t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());if(color)t.colorSpace=T.SRGBColorSpace;return t};
 for(const [name,metres]of [['stone',2.5],['wood',2],['roof',2]]as const){
  const mat=m[name] as T.MeshStandardMaterial;
  [mat.map,mat.normalMap,mat.roughnessMap]=await Promise.all([tex(name+'-color.jpg',true),tex(name+'-normal.jpg'),tex(name+'-roughness.jpg')]);
  mat.bumpMap=null;mat.color.set(name==='stone'?0xd9d5ca:name==='wood'?0xbda585:0xb6aaa0);mat.roughness=1;mat.normalScale.setScalar(name==='stone'?.85:.7);metreUV(mat,metres);
 }
 const hdr=await new HDRLoader().loadAsync('./assets/surfaces/sky.hdr');hdr.mapping=T.EquirectangularReflectionMapping;
 const pmrem=new T.PMREMGenerator(renderer);scene.environment=pmrem.fromEquirectangular(hdr).texture;scene.environmentIntensity=.6;pmrem.dispose();
 // Keep the photographed sky but hide its source landscape below the medieval skyline.
 scene.background=hdr;scene.backgroundRotation.y=2.4;scene.backgroundIntensity=.85;scene.backgroundBlurriness=.025;
 const normal=await tex('water-normal.jpg');return{waterNormal:normal};
}
