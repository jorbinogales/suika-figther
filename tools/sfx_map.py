"""Sound assignment table (imported by build_sfx.py). Champion sounds: ONE distinct file per basic attack / ability, never repeated.
Generic sounds only use files that no champion sound took."""
import glob, pathlib

def build(K, RV, RP, OG, SND, short_yells):
    used = set()
    def pick(*files):
        out = []
        for f in files:
            f = f[0] if isinstance(f, list) else f
            assert f, "missing source file"
            assert f not in used, "DUPLICATE sound file: " + f
            used.add(f); out.append(f)
        return out
    def free(lst):
        r = [f for f in lst if f not in used]
        used.update(r); return r
    CU = lambda n: str(pathlib.Path(__file__).parent / 'custom_sfx' / (n + '.wav'))   # 24-bit recordings built by make_custom_sfx.py
    KP = lambda pat: K("impact-sounds", pat); KS = lambda pat: K("sci-fi-sounds", pat)
    KI = lambda pat: K("interface-sounds", pat); KR = lambda pat: K("rpg-audio", pat)
    SW = lambda n: sorted(glob.glob(str(SND / f"OpenGameArt/swishes/swishes/swish-{n}.wav")))
    KB = lambda pat: sorted(glob.glob(str(SND / f"OpenGameArt/keyboard/{pat}")))
    CR = lambda n: sorted(glob.glob(str(SND / f"OpenGameArt/crunch/crunch.{n}.ogg")))
    yells = short_yells("*yell*.wav", 1.6, 12)

    S = {
     # ---- basic attacks ----
     "atk_leandro": pick(str(pathlib.Path(__file__).parent / "custom_sfx/atk_leandro.wav")),   # AI prompt bolt: arcane bolt recording (tools/make_custom_sfx.py)
     "atk_xeviche": pick(KP("impactPunch_heavy_000.ogg")),                            # heavy punch
     "atk_jorbi": pick(KP("impactPunch_medium_001.ogg")),
     "atk_jorbi_crit": pick(KP("impactPunch_heavy_002.ogg"), KP("impactMetal_heavy_001.ogg")),
     "atk_axel": pick(SW(3), KP("impactPlate_light_000.ogg")),                        # laptop thrown
     "atk_julio_slow": pick(CU("julio_slow"), SW(5)),                            # careful pen drawing, then flick
     "atk_julio_fast": pick(CU("julio_fast"), SW(6)),                            # quick scribble
     "atk_luis": pick(KP("impactPunch_medium_003.ogg")),
     "atk_hector": pick(KP("impactPunch_heavy_004.ogg")),
     "atk_eliud": pick(SW(9)),                                                        # egg lobbed
     "atk_eliud_hen": pick(KR("knifeSlice2.ogg"), SW(10)),                            # lance thrust
     # ---- Leandro ----
     "a_leandro_p1": pick(RP("30_Earth_02.wav"), KR("creak2.ogg")),                   # cacti bursting out of the ground
     "a_leandro_p2": pick(RP("46_Poison_01.wav"), SW(2)),                             # poisoned contract thrown
     "a_leandro_p3": pick(KP("impactSoft_heavy_001.ogg"), KR("dropLeather.ogg")),     # tyres thumping down
     "a_leandro_ult": pick(RV("RV_Arcane_Charge_01.wav")),                            # bots deployed
     # ---- Xeviche ----
     "a_xeviche_p1": pick(KP("impactTin_medium_000.ogg"), SW(4)),                     # giant lego flung
     "a_xeviche_p2": pick(CR(1), CR(3)),                                              # eating the arepa
     "a_xeviche_p3": pick(RP("17_Def_buff_01.wav"), KR("metalClick.ogg")),            # setup piece clicks in
     "a_xeviche_ult": pick(CU("xeviche_ult"), KP("impactMining_000.ogg")),   # earthquake slam
     # ---- Jorbi ----
     "a_jorbi_p1": pick(KR("handleCoins.ogg"), SW(7)),                                # money
     "a_jorbi_p2": pick(RP("48_Speed_up_02.wav")),                                    # dash
     "a_jorbi_ult": pick(RP("16_Atk_buff_04.wav"), yells[0:1]),                       # flex + roar
     # ---- Axel ----
     "a_axel_p1": pick(KB("Human Typing/human_vel-005.wav"), CU("axel_type")),   # typing the malware
     "ev_axel_virus": pick(CU("axel_virus")), "ev_axel_trojan": pick(CU("axel_trojan")), "ev_axel_worm": pick(CU("axel_worm")),
     "a_axel_p2": pick(RP("02_Heal_02.wav"), KR("bookFlip1.ogg")),                    # reading manga + healing
     "a_axel_p3": pick(KR("handleCoins2.ogg"), CU("axel_shield")),             # haggling + shield
     "a_axel_ult": pick(yells[1:2], RP("45_Charge_05.wav")),                          # shouting
     # ---- Julio ----
     "a_julio_p1": pick(RP("22_Water_02.wav"), SW(8)),                                # S stroke of ink
     "a_julio_p2": pick(RP("26_Swim_Submerged_02.wav"), RP("25_Wind_01.wav")),        # ink wave dash
     "a_julio_p3": pick(CU("julio_ink"), KP("impactSoft_medium_000.ogg")),        # ink puddle
     "a_julio_ult": pick(KP("impactGlass_light_000.ogg")),                            # ink rain
     "ev_julio_inkpop": pick(KP("impactGlass_medium_001.ogg")), "ev_julio_dropland": pick(CU("julio_drop")),
     # ---- Luis ----
     "a_luis_p1": pick(RP("88_Teleport_02.wav"), CU("luis_drones")),     # drones launched
     "a_luis_p2": pick(CU("luis_cloak"), KR("cloth2.ogg")),                       # stealth cloak
     "a_luis_p3": pick(CU("luis_static")),            # static field
     "a_luis_ult": pick(RV("RV_Lightning_Zap_01.wav"), CU("luis_glitch")),         # mind takeover
     # ---- Hector ----
     "a_hector_p1": pick(RP("39_Absorb_04.wav"), KR("bookClose.ogg")),                  # protein shake
     "a_hector_p2": pick(KR("metalPot2.ogg"), KP("impactMetal_medium_001.ogg")), "ev_hector_chain": pick(KP("impactMetal_medium_003.ogg"), KR("metalPot3.ogg")),   # chains
     "a_hector_p3": pick(KP("impactPlate_medium_000.ogg"), KR("beltHandle1.ogg")),      # strapping on protection
     "atk_yonaiker": pick(CU("yon_atk")), "a_yonaiker_p1": pick(CU("yon_p1")), "a_yonaiker_p2": pick(CU("yon_p2")), "a_yonaiker_p3": pick(CU("yon_p3")), "a_yonaiker_ult": pick(CU("yon_ult")),
     "atk_junior": pick(CU("jr_atk")), "a_junior_p1": pick(CU("jr_p1")), "a_junior_p2": pick(CU("jr_p2")), "a_junior_p3": pick(CU("jr_p3")), "a_junior_ult": pick(CU("jr_ult")),
     "a_hector_ult": pick(CU("hector_bike")),    # bike + fire
     # ---- Eliud ----
     "a_eliud_p1": pick(OG("fuse.ogg")), "ev_eliud_boom": pick(OG("dynamite.wav")),   # grenade egg: fuse, then boom
     "a_eliud_p2": pick(KP("impactSoft_medium_001.ogg"), KP("impactPlank_medium_000.ogg")), "ev_eliud_trapboom": pick(RV("RV_Fire_Burst_01.wav")),
     "a_eliud_p3": pick(SW(11), KR("drawKnife1.ogg")), "ev_eliud_spear_stick": pick(KP("impactWood_heavy_000.ogg")), "ev_eliud_pickup": pick(KR("metalLatch.ogg")),
     "a_eliud_ult": pick(KP("impactWood_heavy_002.ogg")), "ev_eliud_pkg_land": pick(KP("impactWood_heavy_003.ogg")), "ev_eliud_pkg_open": pick(RV("RV_Stinger_ChestOpen.wav")),
     "ev_eliud_hen": pick(OG("chicken/Chicken Sound Effect.ogg"), CU("eliud_boom")),
    }
    AN = lambda sub, n: sorted(glob.glob(str(SND / f"Announcer/{sub}/{n}")))
    S.update({   # announcer: kill streaks (Salatiel, CC-BY-SA 4.0) + TTS lines generated locally
     "ann_first": pick(AN("Salatiel", "firstblood.wav")), "ann_2": pick(AN("Salatiel", "doublekill.wav")), "ann_3": pick(AN("Salatiel", "triplekill.wav")),
     "ann_4": pick(AN("Salatiel", "quadruplekill.wav")), "ann_5": pick(AN("Salatiel", "quintuplekill.wav")),
     "ann_minions": pick(AN("tts", "minions_spawned.wav")), "ann_goodluck": pick(AN("tts", "good_luck.wav")),
    })
    # ElevenLabs announcer lines (tools/gen_announcer.py). Optional: if a file is missing the game falls back to the older announcer sounds
    for f in sorted(glob.glob(str(SND / "ElevenLabs/v_*.mp3"))):
        S[pathlib.Path(f).stem] = pick(f)
    for f in sorted(glob.glob(str(SND / "ElevenLabs/r_*.wav"))):   # robot-side announcer
        S[pathlib.Path(f).stem] = pick(f)
    G = {
     "punch": KP("impactPunch_medium_*.ogg"), "punch_heavy": KP("impactPunch_heavy_*.ogg"),
     "slash": RP("22_Slash_04.wav") + RP("03_Claw_03.wav"), "hit_flesh": RP("15_Impact_flesh_02.wav") + RP("61_Hit_03.wav") + RP("77_flesh_02.wav"),
     "hit_metal": KP("impactMetal_light_*.ogg"), "hit_heavy": KP("impactMetal_heavy_*.ogg"), "block": RP("39_Block_03.wav") + KP("impactPlate_heavy_*.ogg"),
     "whoosh": RP("56_Attack_03.wav") + RP("35_Miss_Evade_02.wav"),
     "laser": [CU(f"laser_{i}") for i in (1, 2, 3, 4)], "laser_big": [CU("laser_big_1"), CU("laser_big_2")], "shot": [CU(f"shot_{i}") for i in (1, 2, 3)],
     "cannon": OG("cannon_fire.ogg"), "cannon_hit": OG("cannon_hit.ogg") + OG("cannon_hit_wall.ogg"),
     "explosion": [CU("explosion_1"), CU("explosion_2")], "explosion_big": RP("04_Fire_explosion_04_medium.wav"), "nexus_destroy": OG("ship_destroyed.ogg"),
     "buff": RP("13_Ice_explosion_01.wav"), "debuff": RP("21_Debuff_01.wav"), "stun": KP("impactBell_heavy_*.ogg"),
     "levelup": RV("RV_Stinger_LevelUp.wav"), "champ_death": RP("69_Enemy_death_01.wav"), "death_soft": KP("impactSoft_heavy_*.ogg"),
     "minion_grunt": sorted(glob.glob(str(SND / "OpenGameArt/yelling/yelling sounds/3grunt*.wav"))), "minion_yell": short_yells("*yell*.wav", 1.8, 12),
     "robot_beep": [CU("beep_1"), CU("beep_2"), CU("beep_3")], "step": KP("footstep_grass_*.ogg"),
     "ui_click": [CU("ui_click_1"), CU("ui_click_2")], "ui_hover": RP("001_Hover_01.wav"), "ui_confirm": RP("013_Confirm_03.wav") + RV("RV_UI_Confirm.wav"),
     "ui_error": RP("033_Denied_03.wav"), "ui_back": [CU("ui_back_1")], "ui_open": RV("RV_UI_MenuOpen.wav"), "ui_pause": RP("092_Pause_04.wav"),
     "ui_unpause": RP("098_Unpause_04.wav"), "ui_upgrade": RP("070_Equip_10.wav") + [CU("ui_confirm_x")], "ui_announce": RP("55_Encounter_02.wav"),
     "ui_victory": RP("84_Win_01.wav") + RP("30_Revive_03.wav"), "ui_defeat": RP("029_Decline_09.wav"), "ui_select": [CU("ui_select_1"), CU("ui_select_2")],
     "thunder": RP("18_Thunder_02.wav"), "ice": RV("RV_Ice_Shatter_02.wav"), "fire": RP("04_Fire_explosion_04_medium.wav"),
    }
    for name, files in G.items():
        got = free(files)
        if got: S[name] = got
        else: print("skipped generic (files already used by a champion sound):", name)
    S["music_game"] = pick(OG("heartfelt-battle_loop.ogg")); S["music_menu"] = pick(OG("dungeon_ambient.ogg"))
    return S
