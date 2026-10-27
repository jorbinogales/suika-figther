"""Synthesises the launcher/menu audio (original, royalty free): a sci-fi ambient loop + UI navigation sounds.
Output: public/assets/menu/*.wav  (python tools/gen_menu_audio.py)"""
import numpy as np, wave, pathlib
from scipy.signal import butter, lfilter

SR = 32000
OUT = pathlib.Path(__file__).resolve().parents[1] / "public/assets/menu"; OUT.mkdir(parents=True, exist_ok=True)
rng = np.random.default_rng(7)

def mix(*xs):
    n = max(len(x) for x in xs); return sum(np.pad(x, (0, n - len(x))) for x in xs)

def save(name, x, peak=0.89):
    x = np.asarray(x, dtype=np.float64); x = x / (np.max(np.abs(x)) + 1e-9) * peak
    with wave.open(str(OUT / name), "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((x * 32767).astype("<i2").tobytes())

def lp(x, f, o=2): b, a = butter(o, f / (SR / 2), "low"); return lfilter(b, a, x)
def hp(x, f, o=2): b, a = butter(o, f / (SR / 2), "high"); return lfilter(b, a, x)
def t_(d): return np.arange(int(SR * d)) / SR
def env(n, a=0.005, r=0.1):
    e = np.ones(n); na, nr = max(1, int(a * SR)), max(1, int(r * SR)); e[:na] = np.linspace(0, 1, na); e[-nr:] *= np.linspace(1, 0, nr); return e
def saw(f, t): return 2 * ((f * t) % 1) - 1
def square(f, t): return np.sign(np.sin(2 * np.pi * f * t))
def sine(f, t): return np.sin(2 * np.pi * f * t)
def sweep(f0, f1, d, shape=sine):
    t = t_(d); f = f0 * (f1 / f0) ** (t / d); ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) if shape is sine else np.sign(np.sin(ph)) if shape is square else 2 * ((ph / (2 * np.pi)) % 1) - 1

# ------------------------------------------------ music loop ------------------------------------------------
BPM = 100; beat = 60 / BPM; bars = 16; total = bars * 4 * beat; N = int(total * SR)
mus = np.zeros(N)
def add(x, start):
    s = int(start * SR); e = min(N, s + len(x))
    if s < N: mus[s:e] += x[:e - s]
hz = lambda m: 440 * 2 ** ((m - 69) / 12)
prog = [(57, [0, 3, 7, 10]), (53, [0, 4, 7, 11]), (48, [0, 4, 7, 11]), (55, [0, 4, 7, 10])]   # Am7 Fmaj7 Cmaj7 G7
for bar in range(bars):
    root, ch = prog[(bar // 2) % 4]; t0 = bar * 4 * beat
    if bar % 2 == 0:   # pad: two bars per chord, detuned saws with slow filter swell
        d = 8 * beat; t = t_(d); pad = np.zeros(len(t))
        for iv in ch:
            for det in (-0.12, 0.0, 0.14): pad += saw(hz(root + 12 + iv) * (1 + det * 0.01), t)
        sw = 0.35 + 0.65 * np.sin(np.pi * t / d) ** 2; pad = lp(pad, 1400, 2) * env(len(t), 1.2, 1.5) * 0.045 * (0.6 + 0.4 * sw)
        add(pad, t0)
    # sub bass pulse on eighths
    for i in range(8):
        d = beat / 2; t = t_(d); add((sine(hz(root - 12), t) + 0.3 * sine(hz(root), t)) * env(len(t), 0.004, d * 0.7) * (0.55 if i % 2 == 0 else 0.35), t0 + i * d)
    # arpeggio 16ths with a pattern, plucky triangle-ish + slight echo
    pat = [0, 2, 1, 3, 2, 1, 3, 2, 0, 2, 1, 3, 2, 3, 1, 2]
    for i in range(16):
        if bar < 4 and i % 2: continue   # intro: sparser
        d = beat / 4; t = t_(d * 3); m = root + 24 + ch[pat[i]]; n = saw(hz(m), t) * 0.5 + square(hz(m), t) * 0.25
        n = lp(n, 3200) * env(len(t), 0.002, d * 2.8) * 0.07 * (0.8 + 0.2 * np.sin(bar / 2)); add(n, t0 + i * d); add(n * 0.35, t0 + i * d + beat * 0.75)
    # hats & kick-ish from bar 4
    if bar >= 4:
        for i in range(8):
            d = beat / 2; hat = hp(rng.normal(0, 1, int(SR * 0.04)), 7000) * env(int(SR * 0.04), 0.001, 0.035) * 0.05; add(hat, t0 + i * d + (d / 2 if i % 2 else 0) * 0)
        for q in (0, 2):
            t = t_(0.18); k = sweep(110, 42, 0.18) * env(len(t), 0.001, 0.15) * 0.5; add(k, t0 + q * beat)
    if bar % 4 == 3:   # riser into the next phrase
        d = 4 * beat; t = t_(d); r = hp(rng.normal(0, 1, len(t)), 1500) * (t / d) ** 2 * 0.06; add(r, t0)
# soft delay for space and seamless loop: wrap the tail around to the start
fb = np.zeros(N)
for k, g in ((int(beat * 0.75 * SR), 0.28), (int(beat * 1.5 * SR), 0.15)): fb += np.roll(mus, k) * g
mus = mus + lp(fb, 4000)
fade = int(0.02 * SR); mus[:fade] *= np.linspace(0, 1, fade); mus[-fade:] *= np.linspace(1, 0, fade)
save("music_launcher.wav", mus, 0.7)
print("menu audio ->", OUT, sorted(p.name for p in OUT.iterdir()))
