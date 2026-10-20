import * as T from 'three';
import {Water} from 'three/addons/objects/Water.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {materials,seeded} from './materials';
import type {State} from '../simulation/game';
import {smooth} from '../simulation/replay';
const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
export function buildWorld(scene:T.Scene,waterNormal?:T.Texture){
 const m=materials(),r=seeded(1217),windowPlane=new T.PlaneGeometry(1,1),box=new RoundedBoxGeometry(1,1,1,2,.018),cylinder=new T.CylinderGeometry(1,1,1,16);
 const buckets=new Map<string,{geometry:T.BufferGeometry;mat:T.Material;matrices:T.Matrix4[];colors:T.Color[]}>();
 const obj=new T.Object3D();
 function inst(key:string,geo:T.BufferGeometry,mat:T.Material,x:number,y:number,z:number,sx:number,sy:number,sz:number,ry=0,col?:T.Color){
  if(!buckets.has(key))buckets.set(key,{geometry:geo,mat,matrices:[],colors:[]});const b=buckets.get(key)!;obj.position.set(x,y,z);obj.rotation.set(0,ry,0);obj.scale.set(sx,sy,sz);obj.updateMatrix();b.matrices.push(obj.matrix.clone());b.colors.push(col??new T.Color(1,1,1));
 }
 const b=(key:string,mat:T.Material,x:number,y:number,z:number,sx:number,sy:number,sz:number,ry=0,c?:T.Color)=>inst(key,box,mat,x,y,z,sx,sy,sz,ry,c);
 function roofGeo(){
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute([
   -.5,0,-.5, 0,1,-.5, -.5,0,.5, 0,1,-.5,0,1,.5,-.5,0,.5,
   0,1,-.5,.5,0,-.5,.5,0,.5,0,1,-.5,.5,0,.5,0,1,.5,
   -.5,0,-.5,.5,0,-.5,0,1,-.5, -.5,0,.5,0,1,.5,.5,0,.5
  ],3));g.setAttribute('uv',new T.Float32BufferAttribute([0,0,1,0,0,1,1,0,1,1,0,1,0,0,1,0,1,1,0,0,1,1,0,1,0,0,1,0,.5,1,0,0,.5,1,1,0],2));g.computeVertexNormals();return g;
 }
 const roofGeometry=roofGeo();
 // The water lane remains open all the way to the wall. Buildings are individual volumes, not an image plane.
 b('ground',m.stone,0,-3,60,900,5,900);
 b('quay',m.stone,-20,1,-12,32,6,40);b('quay',m.stone,29,1,-2,24,6,60);
 b('quay',m.stone,-18,1,132,14,6,260);b('quay',m.stone,24,1,140,14,6,240);
 for(let side of [-1,1])for(let z=-12;z<285;z+=6)b('embankment',m.stone,side<0?-10:17.5,2,z,1.4,6,5.95);
 // Starting quay and loading dock.
 for(let z=-17;z<-3;z+=.32)b('dock',m.wood,0,3.85,z,4.7,.3,.295);
 for(let x of [-2.1,2.1])for(let z=-16;z<=-4;z+=3){b('posts',m.wood,x,3.25,z,.3,3.5,.3);b('bolts',m.iron,x,4.04,z,.36,.08,.4)}
 for(let z=-4.2;z<.2;z+=.32)b('dock',m.wood,5.3,3.85,z,5.8,.3,.295);
 for(let x of [3.0,7.6])for(let z of [-4,-.2])b('posts',m.wood,x,2.0,z,.4,5.5,.4);
 for(let z=-16;z<-5;z+=3.5)b('rail',m.wood,2.0,4.85,z,.16,.16,3.3);
 function house(x:number,z:number,w:number,d:number,h:number){
  const detailed=x*x+z*z<95*95;
  const tint=new T.Color().setHSL(.09+r()*.035,.1+r()*.08,.72+r()*.2);
  const plastered=r()>.28;b(plastered?'house-plaster':'house',plastered?m.plaster:m.stone,x,4+h/2,z,w,h,d,0,tint);
  inst('roofs',roofGeometry,m.roof,x,4+h,z,w+1,1.5+w*.25,d+.9,0,new T.Color().setHSL(.055+r()*.025,.25,.62+r()*.3));
  b('eaves',m.wood,x,4+h-.12,z,w+.25,.2,d+.25);
  const floors=Math.max(1,Math.floor(h/3.2));
  for(let floor=0;floor<floors;floor++){
   const y=5.6+floor*3.05;
   for(let xx=x-w/2+1;xx<x+w/2-.5;xx+=1.9)for(let sign of [-1,1]){
    inst('windows',windowPlane,m.window,xx,y,z+sign*(d/2+.025),.68,1.2,1,sign>0?0:Math.PI);
    if(detailed){b('windowframe',m.cream,xx,y-.65,z+sign*(d/2+.08),.95,.1,.15);
    b('shutter',m.wood,xx-.47,y,z+sign*(d/2+.1),.18,1.3,.08);
    b('shutter',m.wood,xx+.47,y,z+sign*(d/2+.1),.18,1.3,.08);}
   }
   for(let zz=z-d/2+1;zz<z+d/2-.5;zz+=2.1)for(let sign of [-1,1]){
    inst('windows',windowPlane,m.window,x+sign*(w/2+.025),y,zz,.65,1.2,1,sign>0?Math.PI/2:-Math.PI/2);
    if(detailed)b('windowframe',m.cream,x+sign*(w/2+.06),y-.65,zz,.15,.1,.85)
   }
  }
  b('door',m.wood,x,5.1,z-d/2-.07,.95,2.2,.12);
  if(r()>.3)b('chimney',m.stone,x+w*.25,5+h+w*.2,z+d*.2,.65,2.5,.8);
  if(h>8&&r()>.6){b('balcony',m.wood,x,8.3,z-d/2-.7,w*.5,.25,1.4);b('balcony',m.iron,x,9,z-d/2-1.35,w*.5,.8,.07)}
 }
 for(let z=14;z<310;z+=15){
  for(let x=-220;x<=220;x+=15){
   if(x>-14&&x<20)continue;if(x>-45&&x<-10&&z<32)continue;
   const xx=x+(r()-.5)*6,zz=z+(r()-.5)*6,w=7+r()*5,d=7+r()*4,h=6+r()*13;
   house(xx,zz,w,d,h);
   if(r()>.92){inst('tree',new T.IcosahedronGeometry(1,1),m.leaf,xx+7,9,zz,3,4,3)}
  }
 }
 // Monumental perimeter wall with buttresses and merlons.
 for(let x=-285;x<=285;x+=15){
  b('wall',m.stone,x,50,335,15.05,100,13);b('wallbuttress',m.stone,x,43,327,3.5,86,5);
  for(let dx=-6;dx<=6;dx+=4)b('merlon',m.stone,x+dx,102,335,2.2,4,13.5);
  if(Math.abs(x)%45===0){b('tower',m.stone,x,54,332,11,108,19);b('towercap',m.cream,x,108,332,12,1.2,20)}
 }
 for(let side of [-1,1])for(let z=-40;z<=335;z+=20){b('sidewall',m.stone,side*255,50,z,12,100,20);b('sidebuttress',m.stone,side*247,43,z,6,86,3.5);b('sidecap',m.cream,side*255,101,z,13,2,20)}
 // Belfries and roofs break up the skyline.
 for(const [x,z,h] of [[52,71,39],[-67,124,48],[92,199,52],[-130,249,58]]){
  b('belfry',m.stone,x,4+h/2,z,9,h,9);b('belfrycap',m.cream,x,h-2,z,10,1,10);
  for(let d of [-2,2]){b('belfrywindow',m.window,x+d,h-5,z-4.55,1.2,5,.1);b('belfrywindow',m.window,x-4.55,h-5,z+d,.1,5,1.2)}
  inst('steeples',new T.ConeGeometry(1,1,4),m.roof,x,h+6,z,8,12,8,Math.PI/4);
 }
 function bridge(z:number){
  const shape=new T.Shape();shape.moveTo(-13,0);shape.lineTo(-13,7);shape.lineTo(20,7);shape.lineTo(20,0);shape.lineTo(14,0);shape.bezierCurveTo(10.5,7,-3.5,7,-7,0);shape.lineTo(-13,0);
  const geo=new T.ExtrudeGeometry(shape,{depth:4,bevelEnabled:false,curveSegments:18});const mesh=new T.Mesh(geo,m.stone);mesh.position.set(0,0,z);mesh.castShadow=mesh.receiveShadow=true;scene.add(mesh);
  for(let side of [0,4]){b('bridgebarrier',m.stone,3.5,7.5,z+side,33,1,.4);b('bridgerail',m.cream,3.5,8.1,z+side,34,.22,.6)}
 }
 for(let z of [47,106,184,261])bridge(z);
 // Rope cranes and grounded small props; none is attached to the moving tray.
 function crane(x:number,z:number,height=17){
  b('crane',m.wood,x,4+height/2,z,.65,height,.7);
  const beam=new T.Mesh(new T.BoxGeometry(.45,.45,height*.8),m.wood);beam.position.set(x,4+height*.76,z+height*.21);beam.rotation.x=-.7;beam.castShadow=true;scene.add(beam);
  inst('cranespool',cylinder,m.wood,x,6,z+.1,.7,1.1,.7);
  b('craneline',m.rope,x,7+height*.38,z+height*.53,.045,height*.57,.045)
 }
 crane(9,-1,14);crane(-12,24,18);crane(19,60,21);crane(-13,143,26);crane(15,303,51);
 for(let k=0;k<30;k++){
  const x=3+r()*4,z=-5-r()*9;
  if(k%2===0){inst('barrels',new T.CylinderGeometry(.32,.4,1,14),m.wood,x,4.5,z,1,1,1);for(let y of [4.15,4.75])inst('barrelbands',new T.CylinderGeometry(.34,.34,.07,14),m.iron,x,y,z,1,1,1)}
  else{b('crates',m.wood,x,4.45,z,.8,.9,.85);b('crateband',m.iron,x,4.46,z,.85,.09,.9)}
 }
 // Small distant workers establish human scale.
 const personMat=new T.MeshStandardMaterial({color:0x4b5253,roughness:1});
 for(let k=0;k<48;k++){const z=20+r()*250,x=r()>.5?19.5:-12.5;inst('people',new T.CapsuleGeometry(.18,.8,3,5),personMat,x,4.65,z,1,1,1);inst('heads',new T.SphereGeometry(.14,6,4),m.cream,x,5.35,z,1,1,1)}
 for(const data of buckets.values()){
  const mesh=new T.InstancedMesh(data.geometry,data.mat,data.matrices.length);for(let i=0;i<data.matrices.length;i++){mesh.setMatrixAt(i,data.matrices[i]);mesh.setColorAt(i,data.colors[i])}mesh.receiveShadow=true;mesh.castShadow=true;mesh.computeBoundingSphere();scene.add(mesh)
 }
 // Cargo is a single persistent group and kinematic support.
 const cargo=new T.Group();cargo.name='one-cargo-tray';scene.add(cargo);
 const add=(geo:T.BufferGeometry,mat:T.Material,x:number,y:number,z:number,parent:T.Object3D=cargo)=>{const o=new T.Mesh(geo,mat);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;parent.add(o);return o};
 for(let x=-1.85;x<2;x+=.3)add(new RoundedBoxGeometry(.28,.24,7,2,.015),m.wood,x,-.12,0);
 for(let z of [-3.1,0,3.1])add(new T.BoxGeometry(4.15,.24,.2),m.iron,0,-.3,z);
 for(let y=0;y<3;y++)for(let x=-1;x<=1;x++)add(new RoundedBoxGeometry(.82,.42,3.25,3,.025),m.wood,x*.85,.23+y*.43,.32);
 for(let x of [-1.45,1.45]){add(new T.BoxGeometry(.14,1.58,.14),m.wood,x,.7,-1.55);add(new T.BoxGeometry(.16,1.55,.16),m.wood,x,.7,2.6)}
 add(new T.BoxGeometry(3.15,.16,.16),m.wood,0,.84,-1.55);
 for(let z of [-.6,1.9]){const curve=new T.CatmullRomCurve3([V(-1.47,.12,z),V(-1.46,1.4,z),V(0,1.43,z),V(1.46,1.4,z),V(1.47,.12,z)]);add(new T.TubeGeometry(curve,20,.045,6,false),m.rope,0,0,0)}
 const latch=add(new T.BoxGeometry(.15,.24,.6),m.iron,-.4,.17,-2.1);const latchLever=new T.Group();latchLever.position.set(-.4,.25,-2.1);cargo.add(latchLever);add(new T.BoxGeometry(.09,.38,.1),m.iron,0,.16,0,latchLever);
 for(let x of [-2.3,2.3]){add(new T.BoxGeometry(.18,.2,4.5),m.iron,x,-.2,.3);for(let z of [-1.8,2.4])add(new T.BoxGeometry(.7,.17,.18),m.iron,x>0?2.02:-2.02,-.2,z)}
 // Dynamic ripples and glints, rendered in the same world space as the docks.
 const waterMat=new T.ShaderMaterial({uniforms:{time:{value:0},sunDir:{value:V(-.5,.8,.2)}},vertexShader:`varying vec3 wp;void main(){wp=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(wp,1.);}`,fragmentShader:`varying vec3 wp;uniform float time;uniform vec3 sunDir;float wave(vec2 p){return sin(p.x*2.+p.y*.4+time*.8)*.3+sin(p.y*4.-p.x*.7-time)*.16+sin(p.x*11.+p.y*7.+time*1.6)*.04;}void main(){vec2 p=wp.xz;float a=wave(p);vec3 n=normalize(vec3(wave(p+vec2(.03,0.))-a,.16,wave(p+vec2(0.,.03))-a));vec3 v=normalize(cameraPosition-wp);float fres=pow(1.-max(dot(n,v),0.),3.);float gl=pow(max(dot(reflect(-normalize(sunDir),n),v),0.),110.);vec3 c=mix(vec3(.045,.135,.16),vec3(.30,.43,.46),fres);c+=vec3(.85,.77,.57)*gl*.9;c+=.012*sin(p.x*12.+a*7.);gl_FragColor=vec4(c,1.);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>}`});
 const water=waterNormal?new Water(new T.PlaneGeometry(1000,1000),{textureWidth:512,textureHeight:512,waterNormals:waterNormal,sunDirection:V(-.5,.8,-.5).normalize(),sunColor:0xffead3,waterColor:0x163438,distortionScale:1.7,fog:true}):new T.Mesh(new T.PlaneGeometry(1000,1000),waterMat);
 water.rotation.x=-Math.PI/2;water.position.y=.1;scene.add(water);
 // Haze, clouds and birds keep distance legible.
 scene.background=new T.Color(0xb2c3ca);scene.fog=new T.FogExp2(0xb2c3ca,.0019);
 const sky=new T.Mesh(new T.SphereGeometry(950,24,12),new T.ShaderMaterial({side:T.BackSide,depthWrite:false,vertexShader:`varying vec3 p;void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`varying vec3 p;float hash(vec2 q){return fract(sin(dot(q,vec2(127.1,311.7)))*43758.5453);}float noise(vec2 q){vec2 i=floor(q),f=fract(q);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}void main(){vec3 d=normalize(p);float h=max(d.y,0.);vec3 c=mix(vec3(.68,.75,.77),vec3(.25,.39,.53),pow(h,.6));vec2 uv=d.xz/max(d.y+.2,.12)*2.5;float n=noise(uv)*.55+noise(uv*2.1)*.3+noise(uv*4.5)*.15;float cloud=smoothstep(.48,.72,n)*smoothstep(0.,.18,h);c=mix(c,vec3(.87,.87,.81),cloud*.8);gl_FragColor=vec4(c,1.);}` }));if(!waterNormal)scene.add(sky);
 const cloudMat=new T.MeshBasicMaterial({color:0xf2ede0,transparent:true,opacity:.15,depthWrite:false});
 for(let k=0;k<(waterNormal?0:20);k++){const cloud=new T.Mesh(new T.SphereGeometry(1,12,6),cloudMat);cloud.position.set((r()-.5)*1200,150+r()*100,(r()-.5)*700);cloud.scale.set(70+r()*80,8+r()*12,25+r()*35);scene.add(cloud)}
 const birds:T.Mesh[]=[];const birdGeo=new T.BufferGeometry();birdGeo.setAttribute('position',new T.Float32BufferAttribute([-.6,0,0,0,.1,.2,.6,0,0,0,.1,.2,0,0,-.3,-.1,0,0],3));birdGeo.computeVertexNormals();
 for(let k=0;k<10;k++){const bird=new T.Mesh(birdGeo,new T.MeshBasicMaterial({color:0x354449,side:T.DoubleSide}));bird.position.set(-10+k*7,40+k*1.3,45+k*4);scene.add(bird);birds.push(bird)}
 return{cargo,latch,materials:m,update(s:State){cargo.position.set(4.75,s.cargoY,4.5+s.cargoZ);cargo.rotation.z=Math.sin(s.t*.8)*.003*s.giantRise;latchLever.rotation.x=-1.3*smooth(13.7,14,s.t)*Number(s.unlatched);waterMat.uniforms.time.value=s.t;if(waterNormal)(water.material as T.ShaderMaterial).uniforms.time.value=s.t*.65;birds.forEach((o,i)=>{o.position.x=-10+i*7+Math.sin(s.t*.18+i)*15;o.position.z=55+i*4-s.t*.7;o.rotation.z=Math.sin(s.t*4+i)*.2})}};
}
