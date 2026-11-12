"""Builds seamless ping-pong loops of the champion videos: forward, then the same clip in reverse (no visible cut when it loops).
Reads public/assets/champvideos/<key>.mp4 and writes public/assets/champvideos/loop/<key>.mp4 (the originals stay untouched).
Needs:  python -m pip install imageio-ffmpeg     Run:  python tools/make_pingpong.py [key ...]"""
import pathlib, subprocess, sys
import imageio_ffmpeg

SRC = pathlib.Path(__file__).resolve().parent.parent / "public/assets/champvideos"
OUT = SRC / "loop"; OUT.mkdir(exist_ok=True)
ff = imageio_ffmpeg.get_ffmpeg_exe()
keys = sys.argv[1:] or sorted(p.stem for p in SRC.glob("*.mp4"))
for k in keys:
    src, dst = SRC / f"{k}.mp4", OUT / f"{k}.mp4"
    # forward + reversed copy; the first / last frame of the reverse part are dropped so the turning points do not stall
    flt = "[0:v]split[a][b];[b]reverse,trim=start_frame=1,setpts=PTS-STARTPTS[r];[a][r]concat=n=2:v=1:a=0,format=yuv420p[v]"
    r = subprocess.run([ff, "-y", "-loglevel", "error", "-i", str(src), "-filter_complex", flt, "-map", "[v]", "-an", "-c:v", "libx264", "-crf", "22", "-preset", "medium", "-movflags", "+faststart", str(dst)], capture_output=True, text=True)
    print(k, "ok" if r.returncode == 0 else "ERROR " + r.stderr[-300:], f"{dst.stat().st_size // 1024} KB" if dst.exists() else "")
