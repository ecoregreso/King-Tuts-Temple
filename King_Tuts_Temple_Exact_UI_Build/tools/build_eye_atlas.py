#!/usr/bin/env python3
"""Rebuild the stable 35-frame Eye of Horus atlas from eye_animation.zip.
Development dependency: Pillow. The playable game does not require Python.
"""
from pathlib import Path
import sys,json,math,io,re,hashlib,zipfile
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
SIZE=384;SRC_CROP=640;PAD=2;STEP=SIZE+2*PAD;PER_PAGE=25;COLS=5

def main(zip_path):
 output=ROOT/'assets/animations/eye';output.mkdir(parents=True,exist_ok=True)
 with zipfile.ZipFile(zip_path) as z:
  names=sorted((n for n in z.namelist() if re.fullmatch(r'anim_\d{4}\.png',Path(n).name)),key=lambda n:int(Path(n).stem.split('_')[1]))
  expected=[f'anim_{i:04}.png' for i in range(5,40)]
  if [Path(n).name for n in names]!=expected:raise ValueError('Expected precisely 35 eye frames anim_0005.png to anim_0039.png')
  frames=[];trace=[]
  for n in names:
   raw=z.read(n);im=Image.open(io.BytesIO(raw)).convert('RGBA')
   if im.size!=(1024,1024):raise ValueError('Eye frame needs to be 1024×1024: '+n)
   bb=im.getchannel('A').getbbox()
   if not bb:raise ValueError('Empty frame: '+n)
   cx,cy=(bb[0]+bb[2])/2,(bb[1]+bb[3])/2;x=round(cx-SRC_CROP/2);y=round(cy-SRC_CROP/2)
   crop=(x,y,x+SRC_CROP,y+SRC_CROP)
   if min(x,y)<0 or max(crop[2:])>1024:raise ValueError('Source cropped outside original canvas: '+n)
   frame=im.crop(crop).resize((SIZE,SIZE),Image.Resampling.LANCZOS);bounds=frame.getchannel('A').getbbox()
   if min(bounds[0],bounds[1],SIZE-bounds[2],SIZE-bounds[3])<7:raise ValueError('Clip too tight: '+n)
   frames.append(frame)
   trace.append({'source':Path(n).name,'originalOpaqueBounds':list(bb),'originalCenter':[round(cx,2),round(cy,2)],'sourceCrop':list(crop),'repackedAlphaBounds':list(bounds),'sha256':hashlib.sha256(raw).hexdigest()})
  pages=[];frame_records=[]
  for start in range(0,len(frames),PER_PAGE):
   group=frames[start:start+PER_PAGE];cols=min(COLS,len(group));rows=math.ceil(len(group)/cols)
   page=Image.new('RGBA',(cols*STEP,rows*STEP),(0,0,0,0))
   for j,im in enumerate(group):
    x=(j%cols)*STEP+PAD;y=(j//cols)*STEP+PAD
    page.paste(im,(x,y));frame_records.append({'page':len(pages),'x':x,'y':y,'w':SIZE,'h':SIZE,'source':Path(names[start+j]).name})
   local=f'assets/animations/eye/page-{len(pages)}.png';page.save(ROOT/local,optimize=True)
   pages.append({'image':local,'width':page.width,'height':page.height})
  atlas={'version':1,'fps':30,'loop':'pingpong','frameCount':35,'frameSize':SIZE,'sourceCropSize':SRC_CROP,'alignment':'per-frame-alpha-center; fixed 640px crop and 384px output with constant scale','pages':pages,'frames':frame_records}
  (output/'atlas.json').write_text(json.dumps(atlas,indent=2)+'\n')
  (output/'ALIGNMENT_MANIFEST.json').write_text(json.dumps({'sourceArchive':zip_path.name,'sourceArchiveSha256':hashlib.sha256(zip_path.read_bytes()).hexdigest(),'sourceFrames':trace},indent=2)+'\n')
  (ROOT/'eye-data.js').write_text('/* Normalized Eye of Horus animation, constant size/pivot */\nwindow.KEMET_EYE_DATA='+json.dumps(atlas,separators=(',',':'))+';\n')
  print(f'Saved {len(frames)} aligned eye frames to {len(pages)} lossless alpha atlas pages')
if __name__=='__main__':
 if len(sys.argv)!=2:raise SystemExit('Usage: python3 tools/build_eye_atlas.py /path/to/eye_animation.zip')
 main(Path(sys.argv[1]))
