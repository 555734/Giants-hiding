import * as T from 'three';
/** Opaque eye surface with anatomical iris proportions and a corneal highlight. */
export function anatomicalEye(){
 const gaze={value:new T.Vector2()};
 const m=new T.MeshPhysicalMaterial({color:0xe2d9c9,roughness:.24,metalness:0,ior:1.38,specularIntensity:.48,clearcoat:.65,clearcoatRoughness:.10});
 m.name='Anatomical eye';m.userData.gaze=gaze;
 m.onBeforeCompile=shader=>{
  shader.uniforms.eyeGaze=gaze;
  shader.vertexShader='varying vec2 eyeUv;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <uv_vertex>','#include <uv_vertex>\neyeUv=uv;');
  shader.fragmentShader='varying vec2 eyeUv;uniform vec2 eyeGaze;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`
   vec2 eyeAngle=vec2((eyeUv.x-.5)*6.2831853,(eyeUv.y-.5)*3.14159265)-eyeGaze;
   float radius=length(eyeAngle),theta=atan(eyeAngle.y,eyeAngle.x);
   float fibre=.5+.24*sin(theta*79.+sin(radius*91.)*1.8)+.15*sin(theta*139.+radius*143.);
   vec3 iris=mix(vec3(.075,.052,.028),vec3(.24,.19,.10),clamp(fibre,0.,1.));
   iris*=1.-.55*smoothstep(.29,.365,radius);
   iris=mix(vec3(.007,.009,.008),iris,smoothstep(.122,.145,radius));
   vec3 sclera=vec3(.72,.68,.59)*(1.-.13*smoothstep(.40,.90,radius));
   diffuseColor.rgb=mix(iris,sclera,smoothstep(.355,.375,radius));
  `);
 };
 m.customProgramCacheKey=()=> 'anatomical-eye-v5';return m;
}
/** Preserve photographed pores while separating dry skin from glossy eyes. */
export function scannedSkin(source:T.MeshStandardMaterial){
 const m=new T.MeshPhysicalMaterial();T.MeshStandardMaterial.prototype.copy.call(m,source);
 // MeshStandardMaterial.copy does not initialise the physical fields.
 m.roughness=.97;m.ior=1.38;m.specularIntensity=.32;m.specularColor.set(0xffe5cf);m.clearcoat=0;
 m.normalScale.setScalar(.55);m.envMapIntensity=.65;
 return m;
}
