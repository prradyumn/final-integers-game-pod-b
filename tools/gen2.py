import base64, json, os, sys, urllib.request, mimetypes
KEY=os.environ['GK']; MODEL=os.environ.get('GMODEL','gemini-3-pro-image')
OUT=sys.argv[1]; REFS=sys.argv[2:]
PROMPT=sys.stdin.read()
parts=[]
for r in REFS:
    mt=mimetypes.guess_type(r)[0] or 'image/png'
    parts.append({"inlineData":{"mimeType":mt,"data":base64.b64encode(open(r,'rb').read()).decode()}})
parts.append({"text":PROMPT})
body={"contents":[{"parts":parts}],
      "generationConfig":{"responseModalities":["IMAGE"],
        "imageConfig":{"aspectRatio":os.environ.get('AR','16:9'),
                       "imageSize":os.environ.get('IMGSIZE','4K')}}}
req=urllib.request.Request(f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent?key={KEY}",
   data=json.dumps(body).encode(),headers={"Content-Type":"application/json"})
try: r=json.load(urllib.request.urlopen(req,timeout=420))
except urllib.error.HTTPError as e: print("HTTP",e.code,e.read().decode()[:500]); raise SystemExit(1)
c=(r.get('candidates') or [{}])[0]
n=0
for p in c.get('content',{}).get('parts',[]):
    if p.get('inlineData'):
        open(OUT,'wb').write(base64.b64decode(p['inlineData']['data']))
        print("wrote",os.path.basename(OUT),os.path.getsize(OUT)//1024,"KB"); n+=1
    elif p.get('text'): print("note:",p['text'][:160])
if not n: print("no image; finishReason=",c.get('finishReason')); raise SystemExit(1)
