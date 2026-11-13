from PIL import Image
from pathlib import Path
import numpy as np, shutil, sys
root=Path(r'D:\mycowork\game\art'); cand=root/'review_8dir/josue_style_v2_candidates'
unit,anim,n=sys.argv[1],sys.argv[2],int(sys.argv[3]); dirs=['e'] if anim=='death' else ['s','se','e','ne','n']; out=root/'raw'/unit; out.mkdir(exist_ok=True,parents=True)
for d in dirs:
 path=cand/f'{unit}_{anim}_{d}.png'
 if not path.exists(): print('MISSING',path); continue
 im=Image.open(path).convert('RGB'); a=np.array(im); mask=~((a[:,:,0]>205)&(a[:,:,2]>195)&(a[:,:,1]<75)); w,h=im.size; counts=mask.sum(axis=0); cuts=[0]
 for k in range(1,n):
  center=round(w*k/n); lo=max(cuts[-1]+1,center-round(w/n*.22)); hi=min(w,center+round(w/n*.22)); cuts.append(lo+int(np.argmin(counts[lo:hi])))
 cuts.append(w); frames=[]
 for i in range(n):
  x0,x1=cuts[i:i+2]; ys,xs=np.where(mask[:,x0:x1]);
  if len(xs)==0: raise ValueError(f'empty frame {unit} {anim} {d} {i}')
  box=(max(0,x0+int(xs.min())-2),max(0,int(ys.min())-2),min(w,x0+int(xs.max())+3),min(h,int(ys.max())+3)); ar=np.array(im.crop(box)); mag=(ar[:,:,0]>205)&(ar[:,:,2]>195)&(ar[:,:,1]<75); ar[mag]=[255,0,255]; frames.append(Image.fromarray(ar))
 targetw,targeth=(420,379) if unit=='josue' else (307,230); scale=min(targetw/max(f.width for f in frames),targeth/max(f.height for f in frames)); sheet=Image.new('RGB',(n*512,512),(255,0,255))
 for i,f in enumerate(frames):
  f=f.resize((max(1,round(f.width*scale)),max(1,round(f.height*scale))),Image.Resampling.NEAREST); sheet.paste(f,(i*512+(512-f.width)//2,456-f.height))
 sheet.save(out/(f'{anim}.png' if anim=='death' else f'{anim}_{d}.png'))
if anim!='death' and all((out/f'{anim}_{d}.png').exists() for d in dirs):
 shutil.copy2(out/f'{anim}_e.png',out/f'{anim}.png'); contact=Image.new('RGB',(n*256,1280))
 for i,d in enumerate(dirs): contact.paste(Image.open(out/f'{anim}_{d}.png').resize((n*256,256),Image.Resampling.NEAREST),(0,256*i))
 contact.save(root/f'review_8dir/{unit}_{anim}.png')
print('processed',unit,anim)
