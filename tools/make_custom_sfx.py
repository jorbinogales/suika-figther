"""Builds the hand-edited sounds: real 24-bit recordings (Shapeforms free pack, Noxis sci-fi weapons, RuneVault) trimmed, faded and
converted to 24-bit mono WAV -> tools/custom_sfx/*.wav. Nothing is synthesised. Run before build_sfx.py:  python tools/make_custom_sfx.py"""
import numpy as np, glob, pathlib, wave
from scipy.io import wavfile
from scipy.signal import resample_poly
SND = pathlib.Path(__file__).resolve().parents[2] / "resources/sounds"; OUT = pathlib.Path(__file__).parent / "custom_sfx"; OUT.mkdir(exist_ok=True)
FIND = lambda name: next(p for p in SND.rglob(name) if "__MACOSX" not in str(p))

def load(f):
    sr, x = wavfile.read(f); x = x.astype(np.float64)
    x /= {np.dtype("int16"): 32768, np.dtype("int32"): 2 ** 31}.get(wavfile.read(f)[1].dtype, 1)
    x = x.mean(axis=1) if x.ndim > 1 else x
    if sr > 48000: x = resample_poly(x, 1, sr // 48000 if sr % 48000 == 0 else 2); sr = 48000
    return sr, x
def save24(name, x, sr, peak=0.9):
    x = x / (np.abs(x).max() + 1e-9) * peak; v = np.clip(np.round(x * 8388607), -8388608, 8388607).astype("<i4")
    raw = np.frombuffer(v.tobytes(), dtype=np.uint8).reshape(-1, 4)[:, :3].tobytes()
    with wave.open(str(OUT / name), "wb") as w: w.setnchannels(1); w.setsampwidth(3); w.setframerate(sr); w.writeframes(raw)

def clip(out, src, a=0.0, b=None, fade=0.08, gain=1.0, layers=()):
    sr, x = load(FIND(src)); y = x[int(a * sr):int((b if b else len(x) / sr) * sr)].copy()
    for s2, off, g in layers:   # extra recordings mixed on top
        sr2, z = load(FIND(s2)); z = z[:len(y)] * g; y[int(off * sr):int(off * sr) + len(z)] += z[:max(0, len(y) - int(off * sr))]
    n = min(len(y), int(fade * sr)); y[-n:] *= np.linspace(1, 0, n); y[:64] *= np.linspace(0, 1, 64)
    save24(out + ".wav", y * gain, sr)

# ---- projectiles / explosions / robots (replace the retro Kenney synth sounds) ----
clip("laser_1", "LASRGun_Plasma Rifle Fire_03.wav", 0, 0.55); clip("laser_2", "LASRGun_Classic Blaster A Fire_03.wav", 0, 0.5)
clip("laser_3", "LASRGun_Particle Compressor Fire_01.wav", 0, 0.5); clip("laser_4", "LASRGun_Ion Pistol C Burst_02.wav", 0, 0.9)
clip("laser_big_1", "LASRGun_Electron Impeller Fire_07.wav", 0, 1.2, 0.25); clip("laser_big_2", "LASRGun_Electron Impeller Charged Fire_02.wav", 0, 1.2, 0.25)
clip("shot_1", "GUNSupr_Silenced Pistol Fire Short_01.wav"); clip("shot_2", "GUNPis_Pistol Fire Longer Tail_05.wav", 0, 0.55, 0.2); clip("shot_3", "GUNAuto_Assault Rifle A Fire_01.wav")
clip("explosion_1", "EXPLDsgn_Explosion Impact_14.wav", 0, 1.3, 0.3); clip("explosion_2", "EXPLDsgn_Explosion Rumble Distorted_01.wav", 0, 1.6, 0.4)
clip("beep_1", "UIBeep_Lock On_05.wav"); clip("beep_2", "BEEP_Targeting Loop_06.wav", 0, 0.5); clip("beep_3", "FUI Ping Triplet Echo.wav", 0, 0.6)
# ---- interface ----
clip("ui_click_1", "Holographic Tap Interaction.wav", 0, 0.3, 0.1); clip("ui_click_2", "FUI Button Beep Clean.wav", 0, 0.3, 0.1)
clip("ui_select_1", "FUI Navigation Tone Stereo Flutter.wav", 0, 0.42); clip("ui_select_2", "High-Tech Gadget Activate.wav", 0, 0.5)
clip("ui_back_1", "Future Hologram Turn Off_02.wav", 0, 0.5); clip("ui_confirm_x", "Holographic Interaction-32.wav", 0, 1.0, 0.3)
# ---- champions ----
clip("xeviche_ult", "04_Impact_Heavy.wav.wav", 0, 1.6, 0.4)
clip("axel_type", "Old Terminal Computing-3.wav", 0, 0.8); clip("axel_virus", "Electric Glitch_01.wav"); clip("axel_trojan", "09_Weapon_Impact_Metal.wav.wav", 0, 1.3, 0.3)
clip("axel_worm", "LIQImpt_Goo Splatter_09.wav"); clip("axel_shield", "SCIEnrg_Shield Activate Deactivate_02.wav", 0, 1.8, 0.4)
clip("julio_ink", "PUNCH_SQUELCH_HEAVY_01.wav"); clip("julio_drop", "Rotate Stone 03.wav"); clip("julio_slow", "CLOTHING_MATERIAL_MOVEMENT_01.wav"); clip("julio_fast", "HIGH_SNAP_02.wav")
clip("luis_drones", "MOTRSrvo_Plasma Rifle Arm_01.wav"); clip("luis_cloak", "WHOOSH_AIRY_FLUTTER_01.wav")
clip("luis_static", "Static Glitch Short.wav", layers=[("Telemetry Ticker Loop-2.wav", 0.05, 0.5)]); clip("luis_glitch", "Audio Jack Noise Triplet_01.wav")
clip("hector_bike", "Thruster Ignite Oneshot_02.wav", 0, 2.0, 0.5, layers=[("Spacecraft Vehicle Fly By 05.wav", 0.2, 0.7)])
clip("eliud_boom", "Impact Asteroid Debris Tail_03.wav", 0, 1.0, 0.3)
print("custom 24-bit clips:", len(list(OUT.glob("*.wav"))))
