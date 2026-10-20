"""Original procedural Foley for this prototype. No reused soundtrack or voice."""
from pathlib import Path
import numpy as np
import wave, argparse
from scipy.signal import butter,sosfilt
p=argparse.ArgumentParser();p.add_argument('--out',default='output');a=p.parse_args()
rate=48000;n=rate*30;rng=np.random.default_rng(5241);t=np.arange(n)/rate;mix=np.zeros((n,2),np.float64)
def filter_noise(dur,low,high):
 x=rng.normal(0,1,int(dur*rate));sos=butter(2,[low,high],btype='band',fs=rate,output='sos');y=sosfilt(sos,x);return y/(np.std(y)+1e-9)
def add(at,x,gain=.1,pan=0):
 start=int(at*rate);count=min(len(x),n-start)
 if count<=0:return
 pan=np.clip(pan,-1,1);mix[start:start+count,0]+=x[:count]*gain*np.sqrt((1-pan)/2);mix[start:start+count,1]+=x[:count]*gain*np.sqrt((1+pan)/2)
# Two uncorrelated soft water and wind beds.
for pan in [-.8,.8]:
 wind=filter_noise(30,70,900);water=filter_noise(30,450,4200)
 add(0,wind*(.7+.3*np.sin(t*.42+pan))*(.55+.45/(1+np.exp(-(t-17)))) ,.014,pan)
 add(0,water*(.6+.4*np.sin(t*.8+pan)**2)*(1-.7*np.clip((t-15)/12,0,1)),.013,pan)
def step(at,wood=True,gain=.15):
 dur=.19;tt=np.arange(int(dur*rate))/rate
 thud=filter_noise(dur,45,wood and 900 or 400)*np.exp(-tt*38)
 scuff=filter_noise(dur,wood and 1000 or 250,wood and 4000 or 1000)*np.exp(-tt*23)*(.13 if wood else .07)
 body=np.sin(2*np.pi*(wood and 122 or 78)*tt)*np.exp(-tt*50)
 add(at,(thud+scuff+body*.4),gain,(-.13 if int(at*5)%2 else .13))
for at in np.arange(.18,2.9,.39):step(at,True,.10)
for at in np.arange(3.15,9.8,.47):step(at,False,.095)
step(10.3,False,.13);step(10.98,True,.23)
for at in [11.46,11.94,12.43,14.4,14.85,18.2,18.8,19.4,20,21.2,27.25,27.85,28.5,29.1]:step(at,True,.075)
# Palm contact and cargo shift: low timber/stone contact, not a synthesized UI beep.
dur=.85;tt=np.arange(int(dur*rate))/rate
add(1.6,filter_noise(dur,25,220)*np.exp(-tt*6),.17,.35)
# Small iron latch and handle clinks.
for at in [13.83,14.3]:
 dur=.48;tt=np.arange(int(dur*rate))/rate;x=np.zeros_like(tt)
 for f,k in [(1480,17),(2310,24),(3190,32),(4991,45)]:x+=np.sin(2*np.pi*f*tt)*np.exp(-tt*k)*.09
 x+=filter_noise(dur,800,6000)*np.exp(-tt*110)*.2;add(at,x,.12,-.1)
# Slow creaks combine friction noise with irregular resonances.
for at,dur in [(15,2.8),(17.8,2.2),(20.2,2.9),(23,1.3),(27.3,2.7)]:
 tt=np.arange(int(dur*rate))/rate;f=85+30*np.sin(tt*2.1)+8*np.sin(tt*11);phase=np.cumsum(f)/rate*2*np.pi
 creak=(np.sin(phase)+.25*np.sin(phase*2.13))*filter_noise(dur,100,1600)*.11
 envelope=np.sin(np.pi*np.clip(tt/dur,0,1))**1.3;add(at,creak*envelope,.05,.1)
# Nonverbal breath/wind proximity around the worker's inspection.
for at,dur in [(22.5,2.0),(25.0,2.1)]:
 tt=np.arange(int(dur*rate))/rate;add(at,filter_noise(dur,160,1400)*np.sin(np.pi*tt/dur)**1.8,.047,.65)
# Gentle start; preserve the moving ending without a trailer fade-out.
mix*=np.minimum(1,t[:,None]/.10);peak=np.max(np.abs(mix));mix*=min(1,.82/(peak+1e-9));mix=np.clip(mix,-1,1)
out=Path(a.out);out.mkdir(parents=True,exist_ok=True)
with wave.open(str(out/'foley.wav'),'wb') as f:f.setnchannels(2);f.setsampwidth(2);f.setframerate(rate);f.writeframes((mix*32767).astype('<i2').tobytes())
print('Foley:',out/'foley.wav','peak',round(float(np.max(np.abs(mix))),3))
