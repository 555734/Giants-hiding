import {createHash} from 'node:crypto';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
const root='public/assets/surfaces';await mkdir(root,{recursive:true});
const manifest=[];
async function get(url){const r=await fetch(url,{headers:{'User-Agent':'GiantsHiding-PV/0.2 (github.com/555734/Giants-hiding)'}});if(!r.ok)throw Error(url+': '+r.status);return r;}
async function save(name,url){let b;try{b=await readFile(root+'/'+name)}catch{b=Buffer.from(await(await get(url)).arrayBuffer());await writeFile(root+'/'+name,b)}manifest.push({name,url,sha256:createHash('sha256').update(b).digest('hex')});console.log('Surface:',name,b.length);}
for(const [name,id]of [['stone','castle_wall_slates'],['wood','wood_planks_dirt'],['roof','roof_tiles_14'],['plaster','plastered_stone_wall']]){
 for(const [out,key]of [['color','diff'],['normal','nor_gl'],['roughness','rough']]){
  await save(name+'-'+out+'.jpg','https://dl.polyhaven.org/file/ph-assets/Textures/jpg/2k/'+id+'/'+id+'_'+key+'_2k.jpg');
 }
}
await save('sky.hdr','https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/2k/kloofendal_48d_partly_cloudy_2k.hdr');
await save('water-normal.jpg','https://raw.githubusercontent.com/mrdoob/three.js/r186/examples/textures/waternormals.jpg');
await writeFile(root+'/manifest.json',JSON.stringify(manifest,null,2));
