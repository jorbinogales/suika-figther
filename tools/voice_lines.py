"""Champion voices: which ElevenLabs voice each champion uses and what it says. Used by tools/gen_voices.py (generates the mp3 files and the README).
Events per champion: select (when the player locks the champion in), death, meet (first time it sees an enemy champion), p1 / p2 / p3 / ult (one line per ability),
plus p1b / p2b / p3b / ultb for Leandro's second-branch abilities and sb_p1 / sb_p2 / sb_p3 for Maduro's Super Bigote form.
Voices come from the voice library of the project's ElevenLabs account (no voice cloning of real people)."""

VOICES = {   # champion -> (voice_id, voice name in the library, style / why this voice, voice settings override)
    'leandro':  ('UlfHrayvmPwBsB6iRxRH', 'Leandro', 'Voz generada en español latino: tono tecnológico y sarcástico, el "ingeniero de IA".', {}),
    'xeviche':  ('zSPJ694fdnzmEKl5n9wI', 'carlos', 'Voz masculina joven, natural y enérgica en español latino: fresco y bromista como el ceviche.', {}),
    'jorbi':    ('SIpDYvpsUzCaJ0WmnSA8', 'Joseph Corona - Clear and Professional', 'Voz venezolana clara y segura: el programador con acento de casa.', {}),
    'axel':     ('GxkcfDcHhI1xatMjkEAC', 'Zemus', 'Voz juvenil, fresca y un poco melancólica: el "kun" tímido que ayuda.', {}),
    'julio':    ('GLTzATUtINGy37b1y7gn', 'Benji - Warm & Deep Spanish Storyteller', 'Voz cálida y profunda de narrador: el artista de la tinta.', {}),
    'luis':     ('lr39dERdpNg6kPUtWZTO', 'Alejandro - Horror y Misterio', 'Voz grave de misterio: el hacker que aparece desde las sombras.', {}),
    'eliud':    ('OLmSqlYzB06EIKJRy5b0', 'Murdock - Deep and commanding voice', 'Voz profunda y autoritaria: el guerrero de los huevos.', {}),
    'hector':   ('nFcvfxkh4Fldtkn096yh', 'Erick - Cinematic Storyteller', 'Voz cinematográfica y épica: el ciclista cibernético.', {}),
    'yonaiker': ('VXZKNah1ssrzM8c81OiY', 'Santiago - Gravelly and commanding', 'Voz rasposa de veterano: el soldado de apoyo.', {}),
    'junior':   ('gnOUdvJjUt7U06eNRlqE', 'RTS Soldado Raso (es-latam)', 'Voz joven y entusiasta de soldado raso: golpea primero y pregunta después.', {}),
    'maduro':   ('7GCLDRn3tm42Ra1CZCPL', 'George', 'Voz profesional de español latino, tono de discurso. Es una voz genérica de la biblioteca: NO imita ni clona a la persona real.', {}),
    'diosa':    ('Y11rBAl8on4Ba9ZpY3DY', 'Jennifer-Warm Colombian', 'Voz femenina cálida y segura con acento colombiano: la diva de las cámaras.', {}),
}

from voice_lines2 import LINES   # dialogues (up to 3 variants per event) live in tools/voice_lines2.py
