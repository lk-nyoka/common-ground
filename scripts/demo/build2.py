"""Long demo with a moving camera.

Each scene is composed at 4K (background, the app clip inside a phone, the bezel), then a virtual
camera (ffmpeg zoompan) eases between focus points logged while recording, and the result is
scaled to 1080p. Captions go on after the camera so they don't move.

Usage: python3 build2.py [only_scene_id ...]
"""
import json, os, subprocess, sys

V = '/tmp/claude-0/video2'
S = json.load(open(f'{V}/script.json'))
G = json.load(open(f'{V}/geometry.json'))
W, H = G['W'], G['H']
C, L, O = f'{V}/clips', f'{V}/layers', f'{V}/scenes'
os.makedirs(O, exist_ok=True)
PAPER = '0xF4F3F8'
FPS = 30
ONLY = set(sys.argv[1:])
VOL = json.load(open('/tmp/claude-0/vo/lines.json'))
VO_AT = {'hook': 0.4, 'title': 0.4, 'end': 0.5}


def dur(path):
    return float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path]).decode().strip())


def focus(name):
    return json.load(open(f'{C}/{name}.focus.json'))


def target_for(box, phone_rect, scale_css):
    """Camera target (cx, cy, z) that frames a focus box with some room around it."""
    px, py, pw, ph = phone_rect
    if box is None:  # pull back to the full frame: headline and phone
        return (W / 2, H / 2, 1.0)
    bx = px + box['x'] * scale_css
    by = py + box['y'] * scale_css
    bw = box['width'] * scale_css
    bh = box['height'] * scale_css
    hc = max(bh * 1.4, (bw * 1.35) * H / W, 860)
    return (bx + bw / 2, by + bh / 2, min(2.6, max(1.0, H / hc)))


def smooth_expr(keys, idx):
    """Piecewise eased expression of time T for keys [(t, (cx, cy, z))]."""
    t0, v0 = keys[0]
    expr = f'{v0[idx]:.2f}'
    # Build from the end backwards: if(lt(T,t_i), <before>, <transition or after>)
    parts = []
    for i in range(1, len(keys)):
        ti, vi = keys[i]
        tn = keys[i + 1][0] if i + 1 < len(keys) else ti + 10
        Lr = max(0.35, min(0.9, (tn - ti) * 0.8))
        parts.append((ti, Lr, keys[i - 1][1][idx], vi[idx]))
    tail = f'{keys[-1][1][idx]:.2f}'
    for ti, Lr, a, b in reversed(parts):
        p = f'((T-{ti:.3f})/{Lr:.3f})'
        ease = f'({a:.2f}+({b - a:.2f})*{p}*{p}*(3-2*{p}))'
        tail = f'if(lt(T,{ti:.3f}),{a:.2f},if(lt(T,{ti + Lr:.3f}),{ease},{tail}))'
    return tail.replace('T', '(in/30)')


def camera(keys):
    z = smooth_expr(keys, 2)
    cx = smooth_expr(keys, 0)
    cy = smooth_expr(keys, 1)
    return (f"zoompan=z='{z}':x='max(0,min(iw-iw/zoom,{cx}-iw/zoom/2))':y='max(0,min(ih-ih/zoom,{cy}-ih/zoom/2))'"
            f":d=1:s=1920x1080:fps={FPS}")


def build(s):
    sid, kind = s['id'], s['kind']
    out = f'{O}/{sid}.mp4'
    inputs, fc = [], []

    def still(path, D):
        inputs.extend(['-loop', '1', '-framerate', str(FPS), '-t', f'{D:.3f}', '-i', path])
        return len(inputs) // 8 - 1 if False else None

    n = 0

    def add(args):
        nonlocal n
        inputs.extend(args)
        n += 1
        return n - 1

    if kind == 'phone':
        k = s.get('speed', 1.0)
        cd = dur(f"{C}/{s['clip']}.mp4")
        D = cd / k + 0.6
        g = G['one']
        i_bg = add(['-loop', '1', '-framerate', str(FPS), '-t', f'{D:.3f}', '-i', f"{L}/bg_{sid}.png"])
        i_c = add(['-i', f"{C}/{s['clip']}.mp4"])
        i_bz = add(['-loop', '1', '-framerate', str(FPS), '-t', f'{D:.3f}', '-i', f'{L}/bezel1.png'])
        fc.append(f"[{i_c}:v]setpts=(PTS-STARTPTS)/{k},fps={FPS},scale={g['w']}:{g['h']}:flags=lanczos,tpad=stop_mode=clone:stop_duration={D:.3f}[c]")
        fc.append(f"[{i_bg}:v][c]overlay={g['x']}:{g['y']}:shortest=1[v1];[v1][{i_bz}:v]overlay=0:0[canvas]")
        rect = (g['x'], g['y'], g['w'], g['h'])
        sc = g['w'] / 390
        keys = [(0.0, (W / 2, H / 2, 1.0)), (1.6, target_for(None, rect, sc))]
        for f in focus(s['clip'])['focus']:
            t = max(1.8, f['t'] / k + 0.15)
            keys.append((t, target_for(f['box'], rect, sc)))
        keys.append((max(keys[-1][0] + 0.8, D - 1.4), target_for(None, rect, sc)))
    elif kind == 'two':
        k = s.get('speed', 1.0)
        a, b = s['clips']
        fa, fb = focus(a), focus(b)
        off = fb['start'] - fa['start']  # seconds B started after A
        D = dur(f'{C}/{a}.mp4') / k + 0.6
        g = G['two']
        i_bg = add(['-loop', '1', '-framerate', str(FPS), '-t', f'{D:.3f}', '-i', f"{L}/bg_{sid}.png"])
        i_a = add(['-i', f'{C}/{a}.mp4'])
        i_b = add(['-i', f'{C}/{b}.mp4'])
        i_bz = add(['-loop', '1', '-framerate', str(FPS), '-t', f'{D:.3f}', '-i', f'{L}/bezel2.png'])
        align = f"tpad=start_mode=clone:start_duration={off:.3f}," if off > 0 else (f"trim=start={-off:.3f},setpts=PTS-STARTPTS," if off < 0 else '')
        fc.append(f"[{i_a}:v]setpts=(PTS-STARTPTS)/{k},fps={FPS},scale={g['w']}:{g['h']}:flags=lanczos,tpad=stop_mode=clone:stop_duration={D:.3f}[ca]")
        fc.append(f"[{i_b}:v]{align}setpts=(PTS-STARTPTS)/{k},fps={FPS},scale={g['w']}:{g['h']}:flags=lanczos,tpad=stop_mode=clone:stop_duration={D:.3f}[cb]")
        p0, p1 = g['list']
        fc.append(f"[{i_bg}:v][ca]overlay={p0['x']}:{p0['y']}:shortest=1[v1];[v1][cb]overlay={p1['x']}:{p1['y']}:shortest=1[v2];[v2][{i_bz}:v]overlay=0:0[canvas]")
        sc = g['w'] / 390
        rects = [(p0['x'], p0['y'], g['w'], g['h']), (p1['x'], p1['y'], g['w'], g['h'])]
        both = ((p0['x'] + p1['x'] + g['w']) / 2, p0['y'] + g['h'] / 2, H / (g['h'] * 1.25))
        keys = [(0.0, (W / 2, H / 2, 1.0)), (1.6, both)]
        events = [(f['t'], 0, f['box']) for f in fa['focus']] + [(f['t'] + off, 1, f['box']) for f in fb['focus']]
        for t, ph, box in sorted(events):
            t = max(1.8, t / k + 0.15)
            if t > D - 1.0:
                continue
            keys.append((t, both if box is None else target_for(box, rects[ph], sc)))
        keys.append((max(keys[-1][0] + 0.8, D - 1.4), both))
    else:
        D = s['dur']
        i_bg = add(['-loop', '1', '-framerate', str(FPS), '-t', f'{D:.3f}', '-i', f"{L}/bg_{sid}.png"])
        if kind == 'hook':
            i_b = add(['-loop', '1', '-framerate', str(FPS), '-t', f'{D:.3f}', '-i', f"{L}/bg_{sid}_b.png"])
            fc.append(f"[{i_b}:v]format=rgba,fade=t=in:st=3.3:d=0.4:alpha=1[hb];[{i_bg}:v][hb]overlay=0:0[canvas]")
        else:
            fc.append(f"[{i_bg}:v]null[canvas]")
        keys = [(0.0, (W / 2, H / 2, 1.0)), (0.01, (W / 2, H / 2, 1.0)), (D, (W / 2, H / 2, 1.06))]

    # Keep keyframes in time order and at least 0.3 s apart.
    clean = []
    for t, v in keys:
        if clean and t < clean[-1][0] + 0.3:
            t = clean[-1][0] + 0.3
        if t < D:
            clean.append((t, v))
    fc.append(f"[canvas]{camera(clean)}[cam]")
    last = 'cam'
    if s.get('vo'):
        i_cap = add(['-loop', '1', '-framerate', str(FPS), '-t', f'{D:.3f}', '-i', f"{L}/cap_{sid}.png"])
        at = VO_AT.get(sid, 0.9)
        until = min(D - 0.35, at + VOL[sid] + 0.8)
        fc.append(f"[{i_cap}:v]format=rgba,fade=t=in:st={at - 0.15:.3f}:d=0.25:alpha=1,fade=t=out:st={until:.3f}:d=0.3:alpha=1[cap];[cam][cap]overlay=0:0[cc]")
        last = 'cc'
    fc.append(f"[{last}]trim=duration={D:.3f},fade=t=in:st=0:d=0.3:color={PAPER},fade=t=out:st={D - 0.3:.3f}:d=0.3:color={PAPER},format=yuv420p[out]")
    if s.get('vo'):
        i_a = add(['-i', f'/tmp/claude-0/vo/line_{sid}.wav'])
        ms = int(VO_AT.get(sid, 0.9) * 1000)
        fc.append(f"[{i_a}:a]aresample=48000,aformat=channel_layouts=stereo,adelay={ms}|{ms},apad=whole_dur={D:.3f},atrim=duration={D:.3f}[aout]")
    else:
        i_a = add(['-f', 'lavfi', '-t', f'{D:.3f}', '-i', 'anullsrc=r=48000:cl=stereo'])
        fc.append(f"[{i_a}:a]anull[aout]")
    script = f'{O}/{sid}.filter'
    open(script, 'w').write(';\n'.join(fc))
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', *inputs, '-filter_complex_script', script, '-map', '[out]', '-map', '[aout]', '-r', str(FPS), '-c:a', 'aac', '-b:a', '192k', '-ar', '48000',
                    '-c:v', 'libx264', '-crf', '17', '-preset', 'medium', '-t', f'{D:.3f}', out], check=True)
    print('scene', sid, f'{D:.1f}s', len(clean), 'camera keys', flush=True)
    return out


outs = []
for s in S:
    if ONLY and s['id'] not in ONLY:
        outs.append(f"{O}/{s['id']}.mp4")
        continue
    outs.append(build(s))
open(f'{O}/list.txt', 'w').write(''.join(f"file '{x}'\n" for x in outs))
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', f'{O}/list.txt', '-c', 'copy', f'{V}/demo.mp4'], check=True)
print('total', round(dur(f'{V}/demo.mp4'), 1))
