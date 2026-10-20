import {readFile,readdir} from 'node:fs/promises';
const repo=process.env.GITHUB_REPOSITORY,token=process.env.GH_TOKEN,branch='pv-previews';
if(!repo||!token)throw Error('GitHub repository/token missing');
async function api(path,data,method='POST'){
 const r=await fetch('https://api.github.com/repos/'+repo+'/'+path,{method,headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'},...(data?{body:JSON.stringify(data)}:{})});
 if(!r.ok)throw Error(path+': '+r.status+' '+await r.text());return r.status===204?{}:r.json();
}
const frames=(await readdir('output')).filter(n=>/^frame-.*\.jpg$/.test(n)).sort();
const tree=[];
for(const name of frames){const b=await readFile('output/'+name);const blob=await api('git/blobs',{content:b.toString('base64'),encoding:'base64'});tree.push({path:'previews/'+name,mode:'100644',type:'blob',sha:blob.sha});
 const encoded=await api('git/blobs',{content:b.toString('base64'),encoding:'utf-8'});tree.push({path:'previews/'+name+'.b64',mode:'100644',type:'blob',sha:encoded.sha});}
try{
 const data=await readFile('output/stills-telemetry.json','utf8'),b=await api('git/blobs',{content:data,encoding:'utf-8'});
 tree.push({path:'previews/telemetry.json',mode:'100644',type:'blob',sha:b.sha});
}catch(e){if(e.code!=='ENOENT')throw e;}
const manifest={source:process.env.PV_SOURCE_SHA||process.env.GITHUB_SHA,run:process.env.PV_SOURCE_RUN||process.env.GITHUB_RUN_ID,frames};
const mb=await api('git/blobs',{content:JSON.stringify(manifest,null,2),encoding:'utf-8'});tree.push({path:'previews/manifest.json',mode:'100644',type:'blob',sha:mb.sha});
const t=await api('git/trees',{tree}),commit=await api('git/commits',{message:'Rendered reference-comparison frames '+process.env.GITHUB_SHA,tree:t.sha,parents:[]});
const existing=await fetch('https://api.github.com/repos/'+repo+'/git/ref/heads/'+branch,{headers:{Authorization:'Bearer '+token}});
if(existing.status===404)await api('git/refs',{ref:'refs/heads/'+branch,sha:commit.sha});
else if(existing.ok)await api('git/refs/heads/'+branch,{sha:commit.sha,force:true},'PATCH');
else throw Error('Cannot read preview branch: '+existing.status);
console.log('Preview commit',commit.sha,'from source',manifest.source);
