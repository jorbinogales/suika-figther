"""Generates the epic announcer voice lines with the ElevenLabs API (Spanish) into resources/sounds/ElevenLabs/*.mp3, then rebuilds the game sounds.
Setup (once): create game/.env.local with   ELEVENLABS_API_KEY=your_key   (optional: ELEVENLABS_VOICE_ID=...   ELEVENLABS_MODEL=eleven_multilingual_v2)
Run: python tools/gen_announcer.py            (skips lines that already exist; --force regenerates, --only name1,name2 does a few)
Cost: ~18 short lines (~550 characters in total)."""
import os, sys, json, pathlib, urllib.request, urllib.error, subprocess

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT.parent / "resources/sounds/ElevenLabs"

LINES = {   # event name -> what the announcer says. eleven_v3 audio tags ([shouting], [excited]...) drive the emotion; CAPS + "!" add force
 "v_welcome":     "[dramatic, deep voice] Bienvenidos, campeones, al campo de batalla... [pause] [shouting] ¡QUE COMIENCE EL COMBATE! ¡MUCHO ÉXITO!",
 "v_minions":     "[excited] ¡LOS MINIONS HAN SIDO DESPLEGADOS!",
 "v_firstblood":  "[shouting] ¡PRIMERA SANGRE!",
 "v_2":           "[shouting] ¡ASESINATO DOBLE!",
 "v_3":           "[shouting, intense] ¡ASESINATO TRÍPLE!",
 "v_4":           "[shouting, intense] ¡ASESINATO CUÁDRUPLE!",
 "v_5":           "[screaming, epic] ¡ASESINATO QUÍNTUPLE! [shouting] ¡ERES IMPARABLE!",
 "v_kill_you":    "[excited, shouting] ¡HAS ELIMINADO A UN CAMPEÓN ENEMIGO!",
 "v_kill_ally":   "[excited] ¡UN ALIADO HA ELIMINADO A UN CAMPEÓN ENEMIGO!",
 "v_enemy_down":  "[intense] ¡UN CAMPEÓN ENEMIGO HA CAÍDO!",
 "v_you_died":    "[dramatic, somber] Has sido eliminado...",
 "v_ally_down":   "[serious, intense] Un aliado ha caído.",
 "v_suicide":     "[laughing] ¡Un campeón se ha eliminado a sí mismo! [shouting] ¡INCREÍBLE!",
 "v_tower_enemy": "[shouting, excited] ¡UNA TORRE ENEMIGA HA CAÍDO!",
 "v_tower_ally":  "[intense, worried] ¡Una de tus torres ha sido destruida!",
 "v_nexus_win":   "[screaming, epic] ¡EL NEXO ENEMIGO HA CAÍDO! [shouting] ¡VICTORIA!",
 "v_nexus_lose":  "[dramatic, somber] Tu nexo ha sido destruido... [serious] Derrota.",
 "v_surrender":   "[serious] Rendición aceptada.",
}
ROBOT_LINES = {   # announcer heard when you play on the RED (robot) side: aggressive, threatening, with a robotic voice effect
 "r_welcome":     "[menacing, cold] Iniciando protocolo de combate... [growling] ¡NO HABRÁ PIEDAD PARA LOS HUMANOS! ¡QUE COMIENCE LA DESTRUCCIÓN!",
 "r_minions":     "[menacing] ¡UNIDADES DE ASALTO DESPLEGADAS! ¡EXTERMINAD!",
 "r_firstblood":  "[growling, shouting] ¡PRIMERA BAJA! ¡LA SANGRE HUMANA ES ACEITE!",
 "r_2":           "[growling, shouting] ¡DOBLE ELIMINACIÓN!",
 "r_3":           "[growling, shouting, intense] ¡TRÍPLE ELIMINACIÓN!",
 "r_4":           "[roaring, intense] ¡CUÁDRUPLE ELIMINACIÓN!",
 "r_5":           "[roaring, furious] ¡QUÍNTUPLE ELIMINACIÓN! ¡NADA PUEDE DETENERNOS!",
 "r_kill_you":    "[menacing, shouting] ¡OBJETIVO ELIMINADO! ¡SIGUIENTE!",
 "r_kill_ally":   "[menacing] ¡UN ALIADO HA DESTRUIDO AL ENEMIGO!",
 "r_enemy_down":  "[growling] ¡ENEMIGO DESTRUIDO!",
 "r_you_died":    "[cold, angry] Unidad destruida... [growling] ¡VOLVERÁS!",
 "r_ally_down":   "[cold] Unidad aliada destruida.",
 "r_suicide":     "[mocking, cold] ¡Un campeón se ha autodestruido! [laughing] ¡PATÉTICO!",
 "r_tower_enemy": "[growling, shouting] ¡TORRE ENEMIGA ANIQUILADA!",
 "r_tower_ally":  "[angry, menacing] ¡NUESTRA TORRE HA CAÍDO! ¡VENGANZA!",
 "r_nexus_win":   "[roaring, furious] ¡EL NEXO HUMANO HA CAÍDO! ¡LAS MÁQUINAS HAN GANADO!",
 "r_nexus_lose":  "[cold, furious] Nexo destruido... [growling] ¡FALLO CRÍTICO!",
 "r_surrender":   "[cold] Rendición aceptada.",
}
ROBOT_VOICES = ["Harry - Fierce Warrior", "Santiago - Gravelly and commanding"]

def robotize(pcm_bytes, sr=24000):
    """metallic robot effect: ring modulation + light bit-crush, returns int16 numpy array"""
    import numpy as np
    x = np.frombuffer(pcm_bytes, dtype="<i2").astype(np.float32) / 32768.0
    t = np.arange(len(x)) / float(sr)
    y = 0.5 * x + 0.5 * x * np.sin(2 * np.pi * 48 * t)                  # ring mod (dalek-style)
    y = 0.75 * y + 0.25 * np.roll(y, int(sr * 0.005))                                  # tiny metallic comb
    y = np.round(y * 48) / 48                                              # bit crush
    y = np.tanh(y * 2.2) / np.tanh(2.2)                                    # aggressive saturation
    y = y / max(1e-6, np.abs(y).max()) * 0.95
    return (y * 32767).astype("<i2")

PREFERRED = ["Santiago - Gravelly and commanding", "Erick - Cinematic Storyteller", "Charlie - Deep, Confident, Energetic", "Harry - Fierce Warrior"]   # epic / commanding voices (full names as listed in the account)

def load_env():
    p = ROOT / ".env.local"
    if p.exists():
        for line in p.read_text(encoding="utf8").splitlines():
            if "=" in line and not line.strip().startswith("#"):
                k, v = line.split("=", 1); os.environ.setdefault(k.strip(), v.strip().strip('"'))

def api(path, key, data=None, accept="application/json"):
    req = urllib.request.Request("https://api.elevenlabs.io" + path, data=json.dumps(data).encode() if data else None,
                                 headers={"xi-api-key": key, "Content-Type": "application/json", "Accept": accept})
    return urllib.request.urlopen(req, timeout=120).read()

def main():
    load_env()
    key = os.environ.get("ELEVENLABS_API_KEY")
    if not key:
        sys.exit("Missing ELEVENLABS_API_KEY. Create game/.env.local with the line: ELEVENLABS_API_KEY=your_key")
    force = "--force" in sys.argv
    only = set(sys.argv[sys.argv.index("--only") + 1].split(",")) if "--only" in sys.argv else None
    voice = os.environ.get("ELEVENLABS_VOICE_ID")
    if not voice:
        vs = json.loads(api("/v1/voices", key))["voices"]
        by = {v["name"].strip(): v["voice_id"] for v in vs}
        voice = next((by[n] for n in PREFERRED if n in by), vs[0]["voice_id"])
        print("voice:", next(v["name"] for v in vs if v["voice_id"] == voice), voice, "(set ELEVENLABS_VOICE_ID to choose another)")
    OUT.mkdir(parents=True, exist_ok=True)
    model = os.environ.get("ELEVENLABS_MODEL", "eleven_v3")
    for name, text in LINES.items():
        f = OUT / f"{name}.mp3"
        if (only and name not in only) or (f.exists() and not force): continue
        body = {"text": text, "model_id": model, "voice_settings": {"stability": 0.0, "similarity_boost": 0.85, "style": 0.8, "use_speaker_boost": True}}
        try:
            audio = api(f"/v1/text-to-speech/{voice}?output_format=mp3_44100_128", key, body, accept="audio/mpeg")
        except urllib.error.HTTPError as e:
            sys.exit(f"ElevenLabs error {e.code} on {name}: {e.read().decode()[:300]}")
        f.write_bytes(audio); print("ok", name, len(audio) // 1024, "KB")
    # ---- robot side announcer ----
    rvoice = os.environ.get("ELEVENLABS_ROBOT_VOICE_ID")
    if not rvoice:
        vs = json.loads(api("/v1/voices", key))["voices"]; by = {v["name"].strip(): v["voice_id"] for v in vs}
        rvoice = next((by[n] for n in ROBOT_VOICES if n in by), voice)
    import wave
    for name, text in ROBOT_LINES.items():
        f = OUT / f"{name}.wav"
        if (only and name not in only) or (f.exists() and not force): continue
        body = {"text": text, "model_id": model, "voice_settings": {"stability": 0.0, "similarity_boost": 0.8, "style": 1.0, "use_speaker_boost": True}}
        try:
            raw = api(f"/v1/text-to-speech/{rvoice}?output_format=pcm_24000", key, body, accept="audio/pcm")
        except urllib.error.HTTPError as e:
            sys.exit(f"ElevenLabs error {e.code} on {name}: {e.read().decode()[:300]}")
        pcm = robotize(raw)
        with wave.open(str(f), "wb") as w: w.setnchannels(1); w.setsampwidth(2); w.setframerate(24000); w.writeframes(pcm.tobytes())
        print("ok", name, round(len(pcm) / 24000, 1), "s")
    subprocess.run([sys.executable, str(ROOT / "tools/build_sfx.py")], check=False)

if __name__ == "__main__":
    main()
