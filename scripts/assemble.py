from pathlib import Path
import subprocess,json,math
out=Path('output');parts=out/'parts';paths=sorted(parts.glob('part-*.mp4'));assert len(paths)==10,paths
samples=[json.loads((parts/f'capture-telemetry-{n:02d}.json').read_text()) for n in range(10)]
for previous,current in zip(samples,samples[1:]):
 a,b=previous[-1],current[0];assert b['frame']==a['frame']+1
 sa,sb=a['state'],b['state'];assert abs(sb['t']-sa['t']-1/60)<1e-8
 assert math.dist([sa[k]for k in ['x','y','z']],[sb[k]for k in ['x','y','z']])<.12
 assert math.dist(a['camera'],b['camera'])<.2
(out/'concat.txt').write_text(''.join("file '"+str(p.resolve())+"'\n" for p in paths))
subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-f','concat','-safe','0','-i',str(out/'concat.txt'),'-i',str(out/'foley.wav'),'-map','0:v','-map','1:a','-c:v','copy','-c:a','aac','-b:a','192k','-t','30','-metadata','title=Giants Hiding — Harbour Escape PV v0.1','-metadata','comment=Head scan: Lee Perry-Smith / Infinite-Realities, CC BY 3.0. Body: orange juice games, CC0. Adapted meshes, eye albedo and poses. Full credits: github.com/555734/Giants-hiding/blob/main/docs/CREDITS.txt','-movflags','+faststart',str(out/'giants-hiding-pv-30s.mp4')],check=True)
(out/'capture-telemetry.json').write_text(json.dumps([p for s in samples for p in s],indent=2))
print('Assembled 1800 consecutive frames; all chunk-boundary state and camera checks passed.')
