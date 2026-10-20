import * as T from 'three';
/** Rest-pose material coordinates keep the detail attached to animated skin. */
export function skinMaterial(){
 const mat=new T.MeshPhysicalMaterial({color:0xbc8b72,roughness:.58,metalness:0,clearcoat:.08,clearcoatRoughness:.65});
 mat.onBeforeCompile=s=>{
  s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 skinP;').replace('#include <begin_vertex>','#include <begin_vertex>\nskinP=position;');
  s.fragmentShader=s.fragmentShader.replace('#include <common>',`#include <common>
  varying vec3 skinP;
  float sh(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453123);}
  float sn(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(sh(i),sh(i+vec3(1,0,0)),f.x),mix(sh(i+vec3(0,1,0)),sh(i+vec3(1,1,0)),f.x),f.y),mix(mix(sh(i+vec3(0,0,1)),sh(i+vec3(1,0,1)),f.x),mix(sh(i+vec3(0,1,1)),sh(i+vec3(1,1,1)),f.x),f.y),f.z);}
  float skinRelief(vec3 p){float pore=sn(p*780.);float lines=pow(abs(sin(p.x*145.+sn(p*65.)*5.)),20.);return pore*.00017+lines*.00020;}
  `);
  s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
  float mottling=sn(skinP*42.);float freckles=smoothstep(.75,.85,sn(skinP*255.));
  diffuseColor.rgb*=mix(vec3(.86,.81,.76),vec3(1.08,1.02,.96),mottling);
  diffuseColor.rgb*=1.-freckles*.16;
  `).replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
  vec3 dp1=dFdx(-vViewPosition),dp2=dFdy(-vViewPosition);
  vec3 r1=cross(dp2,normal),r2=cross(normal,dp1);
  float determinant=dot(dp1,r1),height=skinRelief(skinP);
  vec3 grad=sign(determinant)*(dFdx(height)*r1+dFdy(height)*r2);
  normal=normalize(abs(determinant)*normal-grad*18.);
  `);
 };mat.customProgramCacheKey=()=> 'worker-skin-v2';return mat;
}
export function clothMaterial(texture:T.Texture,giant:boolean,trousers=false){
 const mat=new T.MeshStandardMaterial({color:trousers?(giant?0x55504a:0x5e503f):(giant?0x9c9688:0x304b5e),map:texture,bumpMap:texture,bumpScale:.0016,roughness:.94});
 mat.onBeforeCompile=s=>{
  s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 clothP;').replace('#include <begin_vertex>','#include <begin_vertex>\nclothP=position;');
  s.fragmentShader=s.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 clothP;').replace('#include <color_fragment>',`#include <color_fragment>
   float fold=.5+.5*sin(clothP.y*82.+sin(clothP.x*35.)*2.+clothP.z*23.);
   float dirt=.5+.5*sin(clothP.y*19.+clothP.x*29.)*sin(clothP.z*27.);
   diffuseColor.rgb*=.89+.11*fold;diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(.68,.62,.53),dirt*.18);
  `);
 };mat.customProgramCacheKey=()=> 'cloth-v2';return mat;
}
