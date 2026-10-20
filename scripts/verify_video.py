from pathlib import Path
import subprocess,json,argparse
from PIL import Image,ImageDraw,ImageFont
p=argparse.ArgumentParser();p.add_argument('--out',default='output');a=p.parse_args();out=Path(a.out);video=out/'giants-hiding-pv-30s.mp4'
probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(video)]))
v=next(x for x in probe['streams'] if x['codec_type']=='video');audio=next(x for x in probe['streams'] if x['codec_type']=='audio')
assert v['codec_name']=='h264';assert audio['codec_name']=='aac';assert abs(float(probe['format']['duration'])-30)<.08
assert int(v['width'])==1920 and int(v['height'])==1080
assert v['r_frame_rate']=='60/1';assert int(v['nb_frames'])==1800
subprocess.run(['ffmpeg','-hide_banner','-v','error','-i',str(video),'-f','null','-'],check=True)
thumb=384;h=216;sheet=Image.new('RGB',(thumb*3,(h+24)*10),(20,29,33));draw=ImageDraw.Draw(sheet)
for beat in range(10):
 for col,fraction in enumerate([.2,.5,.8]):
  t=beat*3+fraction*3;dest=out/f'qa-{beat+1:02d}-{col}.jpg'
  subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-ss',str(t),'-i',str(video),'-frames:v','1','-vf',f'scale={thumb}:{h}','-q:v','2',str(dest)],check=True)
  with Image.open(dest) as im:sheet.paste(im,(thumb*col,(h+24)*beat))
  draw.text((thumb*col+8,(h+24)*beat+h+4),f'{t:04.1f}s  /  beat {beat+1:02d}',fill=(228,233,228))
sheet.save(out/'motion-sheet.jpg',quality=88)
report={'duration':float(probe['format']['duration']),'width':v['width'],'height':v['height'],'frames':v['nb_frames'],'fps':v['r_frame_rate'],'video':v['codec_name'],'audio':audio['codec_name'],'bytes':video.stat().st_size,'full_decode':'passed','motion_sheet':'motion-sheet.jpg'}
(out/'verification.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))
