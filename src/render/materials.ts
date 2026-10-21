import * as T from 'three';
export function seeded(seed=42){return()=>{seed=(Math.imul(seed,1664525)+1013904223)|0;return(seed>>>0)/4294967296}}
function canvasTexture(kind:'stone'|'wood'|'roof'|'cloth'){
 const c=document.createElement('canvas');c.width=c.height=1024;const g=c.getContext('2d')!,r=seeded(1234);g.fillStyle='#8d8474';g.fillRect(0,0,1024,1024);
 if(kind==='stone'){
  g.fillStyle='#77776e';g.fillRect(0,0,1024,1024);
  for(let row=-1;row<9;row++)for(let col=-1;col<6;col++){
   const x=col*205+(row%2)*102,y=row*128,v=Math.floor(169+r()*45);g.fillStyle=`rgb(${v+7},${v+4},${v-6})`;g.fillRect(x+3,y+3,199,122);
   g.strokeStyle='rgba(240,235,210,.18)';g.strokeRect(x+5,y+5,195,118);
   for(let k=0;k<25;k++){g.fillStyle=`rgba(66,65,55,${r()*.1})`;g.beginPath();g.ellipse(x+r()*200,y+r()*125,r()*34+3,r()*10+2,0,0,7);g.fill()}
  }
 }else if(kind==='wood'){
  g.fillStyle='#81705c';g.fillRect(0,0,1024,1024);
  for(let j=0;j<8;j++){
   const v=70+r()*40;g.fillStyle=`rgb(${v+41},${v+22},${v})`;g.fillRect(0,j*128+2,1024,124);
   for(let k=0;k<80;k++){const y=j*128+r()*126;g.strokeStyle=`rgba(${r()>.5?'230,216,172':'28,21,17'},${r()*.25})`;g.lineWidth=r()*2+1;g.beginPath();g.moveTo(0,y);for(let x=0;x<=1024;x+=32)g.lineTo(x,y+Math.sin(x/100+j)*r()*5);g.stroke()}
   g.strokeStyle='#514435';g.lineWidth=3;g.strokeRect(0,j*128,1024,128)
  }
 }else if(kind==='roof'){
  g.fillStyle='#743f30';g.fillRect(0,0,1024,1024);
  for(let y=0;y<1024;y+=64)for(let x=-32;x<1024;x+=64){const v=110+r()*45;g.fillStyle=`rgb(${v+30},${v-14},${v-27})`;g.fillRect(x+(y%128?32:0)+3,y+2,60,59);g.fillStyle='rgba(240,164,97,.16)';g.fillRect(x+(y%128?32:0)+5,y+4,8,55);g.fillStyle='rgba(18,12,9,.3)';g.fillRect(x+(y%128?32:0)+55,y+3,6,59)}
 }else{
  g.fillStyle='#dedbd1';g.fillRect(0,0,1024,1024);for(let i=0;i<1024;i+=3){g.strokeStyle='rgba(70,65,55,.1)';g.beginPath();g.moveTo(i,0);g.lineTo(i,1024);g.stroke();g.beginPath();g.moveTo(0,i);g.lineTo(1024,i);g.stroke()}
 }
 for(let k=0;k<85000;k++){const v=r()>.5?250:15;g.fillStyle=`rgba(${v},${v},${v},${r()*.07})`;g.fillRect(r()*1024,r()*1024,1+r()*2,1+r()*2)}
 const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.anisotropy=4;return tex;
}
export function materials(){
 const stoneTex=canvasTexture('stone'),woodTex=canvasTexture('wood'),roofTex=canvasTexture('roof'),clothTex=canvasTexture('cloth');clothTex.repeat.set(6,6);
 const stone=new T.MeshStandardMaterial({color:0xe4dcc7,map:stoneTex,bumpMap:stoneTex,bumpScale:.12,roughness:.95});
 const wood=new T.MeshStandardMaterial({color:0xd9c19a,map:woodTex,bumpMap:woodTex,bumpScale:.04,roughness:.86});
 const roof=new T.MeshStandardMaterial({color:0xbb927e,map:roofTex,bumpMap:roofTex,bumpScale:.075,roughness:.93});
 const iron=new T.MeshStandardMaterial({color:0x655b4f,metalness:.65,roughness:.68});
 const rope=new T.MeshStandardMaterial({color:0x9e8c62,roughness:1});
 const window=new T.MeshStandardMaterial({color:0x1c292d,roughness:.48,metalness:.15});
 const cream=new T.MeshStandardMaterial({color:0xd9ccb0,roughness:.95});
 const plaster=new T.MeshStandardMaterial({color:0xd8cdb6,roughness:.94});
 const leaf=new T.MeshStandardMaterial({color:0x4f6042,roughness:1});
 const wall=stone.clone();
 return{wall,stone,wood,roof,plaster,iron,rope,window,cream,leaf,clothTex};
}
