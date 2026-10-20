import * as T from 'three';
import {Water} from 'three/addons/objects/Water.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {materials,seeded} from './materials';
import type {State} from '../simulation/game';
import {detailedCargo,hoistChains} from './cargo';
import {smooth} from '../simulation/replay';
const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
export function buildWorld(scene:T.Scene,waterNormal?:T.Texture){
 const m=materials(),r=seeded(1217),windowPlane=new T.PlaneGeometry(1,1),box=new T.BoxGeometry(1,1,1),cylinder=new T.CylinderGeometry(1,1,1,16);
 // City mouldings use twelve-triangle blocks; close cargo keeps its authored bevels.
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
 const archShape=new T.Shape();archShape.moveTo(-.5,-.65);archShape.lineTo(.5,-.65);archShape.lineTo(.5,.18);archShape.absarc(0,.18,.5,0,Math.PI,false);archShape.lineTo(-.5,-.65);
 const archGeometry=new T.ShapeGeometry(archShape,8);
 // The water lane remains open all the way to the wall. Buildings are individual volumes, not an image plane.
 b('ground',m.stone,0,-3,60,900,5,900);
 b('quay',m.stone,-20,1,-12,32,6,40);b('quay',m.stone,29,1,-2,24,6,60);
 b('quay',m.stone,-18,1,132,14,6,260);b('quay',m.stone,24,1,140,14,6,240);
 for(let side of [-1,1])for(let z=-12;z<285;z+=6)b('embankment',m.stone,side<0?-10:17.5,2,z,1.4,6,5.95);
 // Background land supports the city; the canal itself stays open.
 const cityHeight=(x:number,z:number)=>4+Math.max(0,z-55)*.055+14*Math.exp(-((x+155)*(x+155)/14400+(z-165)*(z-165)/40000));
 for(const [left,right]of [[-250,-25],[31,250]]){
  const terrain=new T.PlaneGeometry(right-left,365,36,52);terrain.rotateX(-Math.PI/2);const p=terrain.getAttribute('position');
  for(let i=0;i<p.count;i++){const x=p.getX(i)+(left+right)/2,z=p.getZ(i)+157.5;p.setXYZ(i,x,cityHeight(x,z)-.35,z);}terrain.computeVertexNormals();
  const land=new T.Mesh(terrain,m.stone);land.receiveShadow=true;scene.add(land);
 }
 // Starting quay and loading dock.
 for(let z=-17;z<-3;z+=.32)b('dock',m.wood,0,3.85,z,4.7,.3,.295);
 for(let x of [-2.1,2.1])for(let z=-16;z<=-4;z+=3){b('posts',m.wood,x,3.25,z,.3,3.5,.3);b('bolts',m.iron,x,4.04,z,.36,.08,.4)}
 for(let z=-4.2;z<.2;z+=.32)b('dock',m.wood,5.3,3.85,z,5.8,.3,.295);
 for(let x of [3.0,7.6])for(let z of [-4,-.2])b('posts',m.wood,x,2.0,z,.4,5.5,.4);
 for(let z=-16;z<-5;z+=3.5)b('rail',m.wood,2.0,4.85,z,.16,.16,3.3);
 function house(x:number,z:number,w:number,d:number,h:number){
  const starts=new Map([...buckets].map(([key,b])=>[key,b.matrices.length]));
  const rise=cityHeight(x,z)-4,rotation=(r()-.5)*.18+(r()>.75?Math.PI/2:0);
  b('foundations',m.stone,x,3.25,z,w+.12,1.5,d+.12);

  const detailed=x*x+z*z<125*125;
  const tint=new T.Color().setHSL(.075+r()*.045,.06+r()*.12,.86+r()*.12);
  const plastered=r()>.13;b(plastered?'house-plaster':'house',plastered?m.plaster:m.stone,x,4+h/2,z,w,h,d,0,tint);
  inst('roofs',roofGeometry,m.roof,x,4+h,z,w+1,1.5+w*.25,d+.9,0,new T.Color().setHSL(.045+r()*.035,.27,.78+r()*.19));
  b('eaves',m.wood,x,4+h-.12,z,w+.25,.2,d+.25);
  const floors=Math.max(1,Math.floor(h/3.2));
  for(let floor=0;floor<floors;floor++){
   const y=5.6+floor*3.05;
   if(detailed&&floor>0)b('storey-cornice',m.cream,x,y-1.25,z,w+.16,.11,d+.16);
   for(let xx=x-w/2+1;xx<x+w/2-.5;xx+=1.9)for(let sign of [-1,1]){
    inst('windows',archGeometry,m.window,xx,y,z+sign*(d/2+.027),.78,.95,1,sign>0?0:Math.PI);
    if(detailed){b('windowframe',m.cream,xx,y-.65,z+sign*(d/2+.08),.95,.1,.15);
    b('shutter',m.wood,xx-.47,y,z+sign*(d/2+.1),.18,1.3,.08);
    b('shutter',m.wood,xx+.47,y,z+sign*(d/2+.1),.18,1.3,.08);}
   }
   for(let zz=z-d/2+1;zz<z+d/2-.5;zz+=2.1)for(let sign of [-1,1]){
    inst('windows',archGeometry,m.window,x+sign*(w/2+.027),y,zz,.73,.95,1,sign>0?Math.PI/2:-Math.PI/2);
    if(detailed)b('windowframe',m.cream,x+sign*(w/2+.06),y-.65,zz,.15,.1,.85)
   }
  }
  if(detailed){
   for(const sign of [-1,1]){
    for(const dx of [-w/2+.13,w/2-.13])for(let yy=4.6;yy<4+h;yy+=.65)b('corner-stones',m.cream,x+dx,yy,z+sign*(d/2+.045),.30,.30,.11);
    b('upper-cornice',m.cream,x,4+h-.26,z+sign*(d/2+.10),w+.3,.18,.22);
    if(r()>.4){const bx=x+(r()-.5)*w*.35,yy=8.0,zz=z+sign*(d/2+.6);
     b('balcony-stone',m.cream,bx,yy,zz,2.1,.16,1.1);
     for(const dx of [-.95,-.6,-.2,.2,.6,.95])b('balcony-iron',m.iron,bx+dx,yy+.5,zz+sign*.5,.035,.85,.035);
     b('balcony-iron',m.iron,bx,yy+.92,zz+sign*.5,2.05,.045,.045);
    }
   }
  }
  b('door',m.wood,x,5.1,z-d/2-.07,.95,2.2,.12);
  if(r()>.3)b('chimney',m.stone,x+w*.25,5+h+w*.2,z+d*.2,.65,2.5,.8);
  if(h>8&&r()>.6){b('balcony',m.wood,x,8.3,z-d/2-.7,w*.5,.25,1.4);b('balcony',m.iron,x,9,z-d/2-1.35,w*.5,.8,.07)}
  const transform=new T.Matrix4().makeTranslation(x,rise,z).multiply(new T.Matrix4().makeRotationY(rotation)).multiply(new T.Matrix4().makeTranslation(-x,0,-z));
  for(const [key,bucket]of buckets)for(let i=starts.get(key)??0;i<bucket.matrices.length;i++)bucket.matrices[i].premultiply(transform);

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
  b('wall',m.stone,x,50,335,15.05,100,13,0,new T.Color(.80+r()*.09,.80+r()*.08,.77+r()*.08));
  for(const yy of [16,38,62,83,99])b('wall-belt',m.cream,x,yy,327.8,15.1,.7,1.6);b('wallbuttress',m.stone,x,43,327,3.5,86,5);
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
 // A tall dock gantry connects the load to visible hoist lines.
 for(const x of [2.97,6.53]){b('hoist-gantry',m.wood,x,65.0,6.3,.48,.62,4.2);b('hoist-gantry-iron',m.iron,x,65,4.6,.68,.82,.7);}
 for(const x of [-6,15]){b('hoist-piers',m.wood,x,33,9,1.0,64,1.0);b('hoist-piers',m.iron,x,5,9,1.25,.6,1.25);}
 b('hoist-crossbeam',m.wood,4.5,65,9,23,.95,1.1);
 crane(9,-1,14);crane(-12,24,18);crane(19,60,21);crane(-13,143,26);crane(15,303,51);
 for(let k=0;k<30;k++){
  const x=3+r()*4,z=-5-r()*9;
  if(k%2===0){inst('barrels',new T.CylinderGeometry(.32,.4,1,14),m.wood,x,4.5,z,1,1,1);for(let y of [4.15,4.75])inst('barrelbands',new T.CylinderGeometry(.34,.34,.07,14),m.iron,x,y,z,1,1,1)}
  else{b('crates',m.wood,x,4.45,z,.8,.9,.85);b('crateband',m.iron,x,4.46,z,.85,.09,.9)}
 }
 // Small distant workers establish human scale.
 const personMat=new T.MeshStandardMaterial({color:0x4b5253,roughness:1});
 for(let k=0;k<48;k++){const z=20+r()*250,x=r()>.5?19.5:-12.5;inst('people',new T.CapsuleGeometry(.18,.8,3,5),personMat,x,4.65,z,1,1,1);inst('heads',new T.SphereGeometry(.14,6,4),m.cream,x,5.35,z,1,1,1)}
 // Timber work barges, seats and mooring lines give the canal a human scale.
 function barge(x:number,z:number,length:number){
  const rows=24,cols=12,positions:number[]=[],uv:number[]=[],indices:number[]=[];
  const width=(zz:number)=>1.2*Math.sqrt(Math.max(.08,1-Math.pow(zz/(length*.55),2)));
  for(let row=0;row<=rows;row++){const zz=(row/rows-.5)*length;for(let col=0;col<=cols;col++){const a=col/cols*Math.PI;positions.push(x+Math.cos(a)*width(zz),.85-Math.sin(a)*.95,z+zz);uv.push(col/cols,row/rows*length/2);}}
  for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){const a=row*(cols+1)+col,c=a+cols+1;indices.push(a,c,a+1,a+1,c,c+1);}
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();
  const outer=new T.Mesh(geo,m.wood);outer.castShadow=outer.receiveShadow=true;scene.add(outer);
  const innerGeo=geo.clone(),ii=innerGeo.getIndex()!,nn=innerGeo.getAttribute('normal');
  for(let i=0;i<ii.count;i+=3){const b=ii.getX(i+1);ii.setX(i+1,ii.getX(i+2));ii.setX(i+2,b);}for(let i=0;i<nn.count;i++)nn.setXYZ(i,-nn.getX(i),-nn.getY(i),-nn.getZ(i));
  const inner=new T.Mesh(innerGeo,m.wood);inner.receiveShadow=true;scene.add(inner);
  for(const side of [-1,1]){const points:T.Vector3[]=[];for(let row=0;row<=rows;row++){const zz=(row/rows-.5)*length;points.push(V(x+side*width(zz),.85,z+zz));}const rim=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points),32,.055,6,false),m.wood);rim.castShadow=true;scene.add(rim);}
  for(let zz of [-length*.27,0,length*.27])b('boat-seats',m.wood,x,.62,z+zz,width(zz)*1.85,.12,.32);
  b('boat-cargo',m.wood,x,.95,z-length*.15,1.1,.75,.8);
  const bank=x>0?17.6:-10.4;
  const rope=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3([V(x,.86,z+length*.35),V((x+bank)*.5,1.6,z+length*.4),V(bank,4.1,z+length*.42)]),24,.025,5,false),m.rope);scene.add(rope);
 }
 barge(13.8,27,8);barge(-7.8,87,9);barge(13.7,159,7);
 for(const data of buckets.values()){
  const mesh=new T.InstancedMesh(data.geometry,data.mat,data.matrices.length);for(let i=0;i<data.matrices.length;i++){mesh.setMatrixAt(i,data.matrices[i]);mesh.setColorAt(i,data.colors[i])}mesh.receiveShadow=true;mesh.castShadow=true;mesh.computeBoundingSphere();scene.add(mesh)
 }
 // Cargo is a single persistent group and kinematic support.
 const {cargo,latch,latchLever}=detailedCargo(m);scene.add(cargo);const chains=hoistChains(scene,m);
 // Dynamic ripples and glints, rendered in the same world space as the docks.
 const waterMat=new T.ShaderMaterial({uniforms:{time:{value:0},sunDir:{value:V(-.5,.8,.2)}},vertexShader:`varying vec3 wp;void main(){wp=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(wp,1.);}`,fragmentShader:`varying vec3 wp;uniform float time;uniform vec3 sunDir;float wave(vec2 p){return sin(p.x*2.+p.y*.4+time*.8)*.3+sin(p.y*4.-p.x*.7-time)*.16+sin(p.x*11.+p.y*7.+time*1.6)*.04;}void main(){vec2 p=wp.xz;float a=wave(p);vec3 n=normalize(vec3(wave(p+vec2(.03,0.))-a,.16,wave(p+vec2(0.,.03))-a));vec3 v=normalize(cameraPosition-wp);float fres=pow(1.-max(dot(n,v),0.),3.);float gl=pow(max(dot(reflect(-normalize(sunDir),n),v),0.),110.);vec3 c=mix(vec3(.045,.135,.16),vec3(.30,.43,.46),fres);c+=vec3(.85,.77,.57)*gl*.9;c+=.012*sin(p.x*12.+a*7.);gl_FragColor=vec4(c,1.);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>}`});
 const water=waterNormal?new Water(new T.PlaneGeometry(1000,1000),{textureWidth:512,textureHeight:512,waterNormals:waterNormal,sunDirection:V(-.5,.8,-.5).normalize(),sunColor:0xffead3,waterColor:0x163438,distortionScale:1.7,fog:true}):new T.Mesh(new T.PlaneGeometry(1000,1000),waterMat);
 water.rotation.x=-Math.PI/2;water.position.y=.1;scene.add(water);
 // Haze, clouds and birds keep distance legible.
 scene.background=new T.Color(0xb2c3ca);scene.fog=new T.FogExp2(0xb8c1c2,.0025);
 const sky=new T.Mesh(new T.SphereGeometry(950,24,12),new T.ShaderMaterial({side:T.BackSide,depthWrite:false,vertexShader:`varying vec3 p;void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`varying vec3 p;float hash(vec2 q){return fract(sin(dot(q,vec2(127.1,311.7)))*43758.5453);}float noise(vec2 q){vec2 i=floor(q),f=fract(q);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}void main(){vec3 d=normalize(p);float h=max(d.y,0.);vec3 c=mix(vec3(.68,.75,.77),vec3(.25,.39,.53),pow(h,.6));vec2 uv=d.xz/max(d.y+.2,.12)*2.5;float n=noise(uv)*.55+noise(uv*2.1)*.3+noise(uv*4.5)*.15;float cloud=smoothstep(.48,.72,n)*smoothstep(0.,.18,h);c=mix(c,vec3(.87,.87,.81),cloud*.8);gl_FragColor=vec4(c,1.);}` }));if(!waterNormal)scene.add(sky);
 const cloudMat=new T.MeshBasicMaterial({color:0xf2ede0,transparent:true,opacity:.15,depthWrite:false});
 for(let k=0;k<(waterNormal?0:20);k++){const cloud=new T.Mesh(new T.SphereGeometry(1,12,6),cloudMat);cloud.position.set((r()-.5)*1200,150+r()*100,(r()-.5)*700);cloud.scale.set(70+r()*80,8+r()*12,25+r()*35);scene.add(cloud)}
 const birds:T.Mesh[]=[];const birdGeo=new T.BufferGeometry();birdGeo.setAttribute('position',new T.Float32BufferAttribute([-.6,0,0,0,.1,.2,.6,0,0,0,.1,.2,0,0,-.3,-.1,0,0],3));birdGeo.computeVertexNormals();
 for(let k=0;k<10;k++){const bird=new T.Mesh(birdGeo,new T.MeshBasicMaterial({color:0x354449,side:T.DoubleSide}));bird.position.set(-10+k*7,40+k*1.3,45+k*4);scene.add(bird);birds.push(bird)}
 return{cargo,latch,materials:m,update(s:State){cargo.position.set(4.75,s.cargoY,4.5+s.cargoZ);cargo.rotation.z=Math.sin(s.t*.8)*.002*s.giantRise;chains.update(s.cargoY,s.cargoZ);latchLever.rotation.x=-1.3*smooth(13.7,14,s.t)*Number(s.unlatched);waterMat.uniforms.time.value=s.t;if(waterNormal)(water.material as T.ShaderMaterial).uniforms.time.value=s.t*.65;birds.forEach((o,i)=>{o.position.x=-10+i*7+Math.sin(s.t*.18+i)*15;o.position.z=55+i*4-s.t*.7;o.rotation.z=Math.sin(s.t*4+i)*.2})}};
}
