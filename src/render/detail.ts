import * as T from 'three';
/** Rest-pose material coordinates keep the detail attached to animated skin. */
export type SkinMaps={map:T.Texture;normalMap:T.Texture;roughnessMap:T.Texture};
export function skinMaterial(maps?:SkinMaps){
 const mat=new T.MeshPhysicalMaterial({color:maps?0xffefe3:0xbc8b72,roughness:.8,metalness:0,clearcoat:.08,clearcoatRoughness:.65,...maps});mat.normalScale.setScalar(.32);
 mat.onBeforeCompile=s=>{
  s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 skinP; varying vec3 skinN;').replace('#include <begin_vertex>','#include <begin_vertex>\nskinP=position;skinN=normal;');
  s.fragmentShader=s.fragmentShader.replace('#include <common>',`#include <common>
  varying vec3 skinP; varying vec3 skinN;
  vec2 skinUV(){vec3 n=abs(skinN);if(n.y>n.x&&n.y>n.z)return skinP.xz/.08;if(n.x>n.z)return skinP.zy/.08;return skinP.xy/.08;}
  float sh(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453123);}
  float sn(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(sh(i),sh(i+vec3(1,0,0)),f.x),mix(sh(i+vec3(0,1,0)),sh(i+vec3(1,1,0)),f.x),f.y),mix(mix(sh(i+vec3(0,0,1)),sh(i+vec3(1,0,1)),f.x),mix(sh(i+vec3(0,1,1)),sh(i+vec3(1,1,1)),f.x),f.y),f.z);}
  float skinRelief(vec3 p){float pore=sn(p*780.);float lines=pow(abs(sin(p.x*145.+sn(p*65.)*5.)),20.);return pore*.00017+lines*.00020;}
  `);
  s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
  float mottling=sn(skinP*80.);float freckles=smoothstep(.80,.90,sn(skinP*255.));
  diffuseColor.rgb*=mix(vec3(.95,.94,.92),vec3(1.02,1.01,.99),mottling);
  diffuseColor.rgb*=1.-freckles*.06;
  `);

  if(maps)for(const key of ['map_fragment','normal_fragment_begin','normal_fragment_maps','roughnessmap_fragment']as const){
   const chunk=T.ShaderChunk[key].replaceAll('vMapUv','skinUV()').replaceAll('vNormalMapUv','skinUV()').replaceAll('vRoughnessMapUv','skinUV()');s.fragmentShader=s.fragmentShader.replace('#include <'+key+'>',chunk);
  }
 };mat.customProgramCacheKey=()=> 'worker-skin-v3';return mat;
}
export function clothMaterial(texture:T.Texture,giant:boolean,trousers=false){
 const mat=new T.MeshStandardMaterial({color:trousers?(giant?0x55504a:0x5e503f):(giant?0x9c9688:0x304b5e),map:texture,bumpMap:texture,bumpScale:.0004,roughness:.94});
 mat.onBeforeCompile=s=>{
  s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 clothP;').replace('#include <begin_vertex>','#include <begin_vertex>\nclothP=position;');
  s.fragmentShader=s.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 clothP;').replace('#include <color_fragment>',`#include <color_fragment>
   float fold=.5+.5*sin(clothP.y*82.+sin(clothP.x*35.)*2.+clothP.z*23.);
   float dirt=.5+.5*sin(clothP.y*19.+clothP.x*29.)*sin(clothP.z*27.);
   diffuseColor.rgb*=.89+.11*fold;diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(.68,.62,.53),dirt*.18);
  `);
 };mat.customProgramCacheKey=()=> 'cloth-v2';return mat;
}
