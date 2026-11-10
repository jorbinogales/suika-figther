"""Generates the champion voice lines with the ElevenLabs API into public/assets/voice/<champion>/<event>.mp3, the index public/assets/voice/voices.json
and the README art/VOICES.md (one unique voice per champion). Voices and lines live in tools/voice_lines.py.
Setup: game/.env.local with ELEVENLABS_API_KEY=...   (the same key as tools/gen_announcer.py)
Run:   python tools/gen_voices.py            (skips lines that already exist)
       python tools/gen_voices.py --only leandro,maduro      --force to regenerate      --readme to only rewrite the index and the README
Cost:  ~8,000 characters for the whole roster (1 credit per character)."""
import os, sys, json, pathlib, urllib.request, urllib.error
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from voice_lines import VOICES, LINES

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / 'public/assets/voice'
MODEL = os.environ.get('ELEVENLABS_VOICE_MODEL', 'eleven_v3')   # eleven_v3 understands expression tags such as [laughs] / [shouting]
SETTINGS = {'stability': 0.35, 'similarity_boost': 0.8, 'style': 0.5, 'use_speaker_boost': True}
EVENT_NAMES = {'select': 'Al seleccionar el campeón', 'death': 'Al morir', 'meet': 'Al encontrarse con un campeón enemigo', 'p1': 'Q', 'p2': 'F', 'p3': 'E', 'ult': 'R',
               'p1b': 'Q (2ª versión)', 'p2b': 'F (2ª versión)', 'p3b': 'E (2ª versión)', 'ultb': 'R (2ª versión)', 'sb_p1': 'Q (Súper Bigote)', 'sb_p2': 'F (Súper Bigote)', 'sb_p3': 'E (Súper Bigote)', 'atk': 'Al atacar (de vez en cuando)'}

def load_env():
    f = ROOT / '.env.local'
    if f.exists():
        for line in f.read_text(encoding='utf-8').splitlines():
            if '=' in line and not line.strip().startswith('#'):
                k, v = line.split('=', 1); os.environ.setdefault(k.strip(), v.strip().strip('"'))

def tts(key, voice, text, settings):
    body = json.dumps({'text': text, 'model_id': MODEL, 'voice_settings': {**SETTINGS, **settings}}).encode()
    req = urllib.request.Request(f'https://api.elevenlabs.io/v1/text-to-speech/{voice}?output_format=mp3_44100_128', data=body,
                                 headers={'xi-api-key': key, 'Content-Type': 'application/json', 'Accept': 'audio/mpeg'})
    for n in range(4):   # the connection sometimes times out: retry
        try: return urllib.request.urlopen(req, timeout=60).read()
        except urllib.error.HTTPError: raise
        except Exception as ex:
            if n == 3: raise
            print('retry', n + 1, type(ex).__name__)

def write_index_and_readme():
    idx = {c: sorted(f'{e}_{n}' for e, ls in LINES[c].items() for n in range(1, len(ls) + 1) if (OUT / c / f'{e}_{n}.mp3').exists()) for c in LINES}
    (OUT / 'voices.json').write_text(json.dumps(idx, indent=1), encoding='utf-8')
    md = ['# Voces de los campeones (ElevenLabs)', '',
          'Cada campeón tiene **una voz única** de la biblioteca de la cuenta de ElevenLabs del proyecto. Los archivos están en `public/assets/voice/<campeón>/<evento>.mp3` y se generan con `python tools/gen_voices.py`.',
          'Las voces y los diálogos se editan en `tools/voice_lines.py` (todos los diálogos son cortos). Modelo: `' + MODEL + '`.', '',
          '> Nota: no se clonan ni se imitan voces de personas reales. Para los personajes basados en personas conocidas (p. ej. Maduro) se usa una voz genérica de la biblioteca con el tono del personaje.', '',
          '| Campeón | Voz (nombre en ElevenLabs) | voice_id | Estilo |', '|---|---|---|---|']
    for c, (vid, name, style, _) in VOICES.items(): md.append(f'| {c} | {name} | `{vid}` | {style} |')
    md += ['', '## Diálogos', '', 'Eventos: al seleccionar el campeón, al morir, al encontrarse con un campeón enemigo, al atacar (Maduro y Diosa) y hasta 3 frases por cada habilidad (se elige una al azar). Los diálogos llevan etiquetas de expresión de eleven_v3.', '']
    for c, lines in LINES.items():
        md += [f'### {c}', '', '| Evento | Diálogo |', '|---|---|'] + [f'| {EVENT_NAMES.get(e, e)} | ' + ' <br> '.join(t) + ' |' for e, t in lines.items()] + ['']
    (ROOT / 'art/VOICES.md').write_text('\n'.join(md), encoding='utf-8')

def main():
    load_env(); key = os.environ.get('ELEVENLABS_API_KEY')
    force = '--force' in sys.argv; only = set(sys.argv[sys.argv.index('--only') + 1].split(',')) if '--only' in sys.argv else None
    OUT.mkdir(parents=True, exist_ok=True)
    if '--readme' not in sys.argv:
        if not key: sys.exit('Missing ELEVENLABS_API_KEY in game/.env.local')
        for c, lines in LINES.items():
            if only and c not in only: continue
            vid, _, _, st = VOICES[c]; (OUT / c).mkdir(exist_ok=True)
            for e, variants in lines.items():
              for n, text in enumerate(variants, 1):
                f = OUT / c / f'{e}_{n}.mp3'
                if f.exists() and not force: continue
                try: audio = tts(key, vid, text, st)
                except urllib.error.HTTPError as ex: sys.exit(f'ElevenLabs error {ex.code} on {c}/{e}: {ex.read().decode()[:300]}')
                f.write_bytes(audio); print('ok', c, f'{e}_{n}', len(audio) // 1024, 'KB')
    write_index_and_readme(); print('index + README written')

if __name__ == '__main__':
    main()
