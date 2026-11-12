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
# Yonaiker
clip("yon_atk", "GUNSupr_Silenced Pistol Fire Short_01.wav"); clip("yon_p1", "MECHClik_Mine Deploy_02.wav", 0, 0.25); clip("yon_p2", "GUNMech_Mechanical_12.wav")
clip("yon_p3", "SCIEnrg_Energy Orb_05.wav", 0, 1.2, 0.3); clip("yon_ult", "Raise Stone Pillar Long.wav", 0, 1.8, 0.5)
# Junior
clip("jr_p1", "Blade Metal Impact Recoil 01.wav", 0, 1.0, 0.3); clip("jr_p2", "WHOOSH_ARM_SWING_01_WIDE.wav"); clip("jr_p3", "GUNArtl_Grenade Launcher Fire_05.wav", 0, 0.9, 0.3)
clip("jr_ult", "EXPLDsgn_Implode_15.wav", 0, 2.4, 0.6); clip("jr_atk", "PUNCH_CLEAN_HEAVY_10.wav")

# ---- bosses (real 24-bit recordings, only trimmed / pitched / layered) ----
def pitch(x, r):   # r < 1 = lower and longer (bigger creature)
    from fractions import Fraction
    q = Fraction(r).limit_denominator(20); return resample_poly(x, q.denominator, q.numerator)
def boss(out, srcs, fade=0.15, gain=1.0, tail=None):   # srcs: [(file, rate, start_s, end_s, level, offset_s)] layered together
    sr0 = 48000; parts = []
    for f, r, a, b, lv, off in srcs:
        sr, x = load(FIND(f)); x = x[int(a * sr):int((b if b else len(x) / sr) * sr)]; x = pitch(x, r) if r != 1 else x
        if sr != sr0: x = resample_poly(x, sr0, sr)
        parts.append((x * lv, int(off * sr0)))
    y = np.zeros(max(len(x) + o for x, o in parts))
    for x, o in parts: y[o:o + len(x)] += x
    if tail: y = y[:int(tail * sr0)]
    n = min(len(y), int(fade * sr0)); y[-n:] *= np.linspace(1, 0, n); y[:64] *= np.linspace(0, 1, 64); save24(out + ".wav", y * gain, sr0)
B1, B2 = "CREAMnstr_Beast Vocalisation_09.wav", "ANMLBat_Creature Vocalisation_01.wav"
boss("boss_roar_1", [(B1, 0.7, 0, None, 1.0, 0), (B2, 0.5, 0, None, 0.5, 0.05)], 0.3)
boss("boss_roar_2", [(B1, 0.55, 0, None, 1.0, 0), (B1, 0.8, 0, None, 0.4, 0.1)], 0.3)
boss("boss_roar_3", [(B2, 0.45, 0, None, 1.0, 0), (B1, 0.65, 0.2, None, 0.6, 0.1)], 0.3)
boss("boss_pound_1", [("04_Impact_Heavy.wav.wav", 0.6, 0, 1.6, 1.0, 0), ("EXPLDsgn_Explosion Rumble Distorted_01.wav", 0.7, 0, 1.4, 0.45, 0.03)], 0.4)
boss("boss_pound_2", [("06_Impact_Object_Drop.wav.wav", 0.6, 0, 1.8, 1.0, 0), ("Impact Asteroid Debris Tail_03.wav", 0.7, 0, 1.6, 0.5, 0.02)], 0.4)
# captain alarm: two-tone real "lock on" beep alternating (24-bit source, no synthesis)
LK = "UIBeep_Lock On_05.wav"; boss("boss_alarm", [(LK, 0.75 if i % 2 == 0 else 1.0, 0, None, 1.0, i * 0.42) for i in range(4)], 0.15, tail=1.7)
# giant robot
boss("mecha_servo", [("Servo Charge Spin Down Combined_04.wav", 0.8, 0, None, 1.0, 0)], 0.3)
boss("mecha_mg", [("GUNMech_Arm Weapon Rattle_10.wav", 1, 0, None, 1.0, 0), ("GUNMech_Mechanical_12.wav", 0.7, 0, None, 0.6, 0.02)], 0.05)
boss("mecha_flame", [("Thruster Ignite Oneshot_02.wav", 0.8, 0, 3.0, 1.0, 0)], 0.5)
boss("mecha_step", [("MECHClik_Mine Deploy_02.wav", 0.5, 0, None, 0.9, 0), ("04_Impact_Heavy.wav.wav", 0.5, 0, 1.2, 0.8, 0)], 0.3)
print("custom 24-bit clips:", len(list(OUT.glob("*.wav"))))
