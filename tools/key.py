import subprocess, zlib, struct, sys
SRC, DST, W, H = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4])

raw = subprocess.run(['ffmpeg','-v','error','-i',SRC,'-vf',f'scale={W}:{H}:flags=lanczos',
                      '-f','rawvideo','-pix_fmt','rgba','-'],
                     capture_output=True, check=True).stdout
buf = bytearray(raw)

# "magenta-ness": the key colour is the only thing in the picture where red and
# blue are both high and green is not. JPEG softens the edge, so the cut is a
# ramp rather than a threshold, and anything partly keyed gets its magenta
# fringe pulled back out — otherwise the window edge keeps a purple halo.
HARD, SOFT = 58, 18
x0=y0=10**9; x1=y1=-1          # fully-keyed only: the opening itself
rows_hit = {}
for i in range(0, len(buf), 4):
    r, g, b = buf[i], buf[i+1], buf[i+2]
    lo = r if r < b else b
    # Magenta is the ONLY colour here with BOTH red and blue high at once, so
    # requiring that as well as the red/blue-over-green gap is what keeps a
    # deep red (Pari's hair bows) from being eaten: red has a low blue, so it
    # never clears the floor no matter how far it sits above green.
    m = lo - g
    if m <= SOFT or lo < 120:
        continue
    p = (i >> 2); x = p % W; y = p // W
    if m >= HARD:
        buf[i+3] = 0
        if x < x0: x0 = x
        if x > x1: x1 = x
        if y < y0: y0 = y
        if y > y1: y1 = y
        rows_hit[y] = rows_hit.get(y, 0) + 1
    else:
        buf[i+3] = int(255 * (HARD - m) / (HARD - SOFT))
        cap = g + 18
        if r > cap: buf[i] = cap
        if b > cap: buf[i+2] = cap

rows = bytearray()
for y in range(H):
    rows.append(0)
    rows += buf[y*W*4:(y+1)*W*4]
def chunk(tag, data):
    return struct.pack('>I', len(data)) + tag + data + struct.pack('>I', zlib.crc32(tag+data) & 0xffffffff)
png = (b'\x89PNG\r\n\x1a\n'
       + chunk(b'IHDR', struct.pack('>IIBBBBB', W, H, 8, 6, 0, 0, 0))
       + chunk(b'IDAT', zlib.compress(bytes(rows), 6)) + chunk(b'IEND', b''))
open(DST,'wb').write(png)
# the opening is a rectangle; trust only rows that are substantially keyed,
# so a stray speck of magenta elsewhere cannot stretch the measurement
wide = max(rows_hit.values()) if rows_hit else 0
solid = [y for y, n in rows_hit.items() if n > wide * 0.6]
if solid: y0, y1 = min(solid), max(solid)
print(f'window opening: x {x0} y {y0} -> {x1} {y1}   ({x1-x0+1} x {y1-y0+1})  aspect {(x1-x0+1)/(y1-y0+1):.3f}')
print(f'as fractions  : x {x0/W:.4f} y {y0/H:.4f} w {(x1-x0+1)/W:.4f} h {(y1-y0+1)/H:.4f}')
