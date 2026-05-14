#!/usr/bin/env python3
"""Download and extract the Kenney assets used by this static game collection.

The script intentionally extracts only a small, curated subset of each pack so
the GitHub Pages site stays light-weight.  All source packs are CC0 assets from
https://kenney.nl/assets.
"""

from __future__ import annotations

import argparse
import json
import shutil
import sys
import tempfile
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from zipfile import ZipFile


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "assets" / "kenney"
USER_AGENT = "Mozilla/5.0 (Kenney asset fetcher for static GitHub Pages games)"


@dataclass(frozen=True)
class Asset:
    key: str
    source: str
    dest: str
    kind: str = "image"


@dataclass(frozen=True)
class Pack:
    slug: str
    title: str
    page: str
    download: str
    assets: tuple[Asset, ...]


PACKS: tuple[Pack, ...] = (
    Pack(
        "space-shooter-remastered",
        "Space Shooter Remastered",
        "https://kenney.nl/assets/space-shooter-remastered",
        "https://kenney.nl/media/pages/assets/space-shooter-remastered/c1af063983-1774771931/kenney_space-shooter-remastered.zip",
        (
            Asset("space.bg", "Backgrounds/darkPurple.png", "bg-dark-purple.png"),
            Asset("space.player", "PNG/playerShip1_blue.png", "player-ship-blue.png"),
            Asset("space.enemy.black", "PNG/Enemies/enemyBlack1.png", "enemy-black-1.png"),
            Asset("space.enemy.red", "PNG/Enemies/enemyRed3.png", "enemy-red-3.png"),
            Asset("space.meteor.brown", "PNG/Meteors/meteorBrown_big1.png", "meteor-brown-big-1.png"),
            Asset("space.meteor.grey", "PNG/Meteors/meteorGrey_big2.png", "meteor-grey-big-2.png"),
            Asset("space.laser", "PNG/Lasers/laserBlue01.png", "laser-blue-01.png"),
            Asset("space.power.bolt", "PNG/Power-ups/powerupBlue_bolt.png", "power-bolt.png"),
            Asset("space.power.shield", "PNG/Power-ups/powerupBlue_shield.png", "power-shield.png"),
            Asset("space.star.gold", "PNG/Power-ups/star_gold.png", "star-gold.png"),
            Asset("space.sfx.laser", "Bonus/sfx_laser1.ogg", "sfx-laser.ogg", "audio"),
            Asset("space.sfx.score", "Bonus/sfx_twoTone.ogg", "sfx-score.ogg", "audio"),
            Asset("space.sfx.lose", "Bonus/sfx_lose.ogg", "sfx-lose.ogg", "audio"),
        ),
    ),
    Pack(
        "platformer-art-deluxe",
        "Platformer Art Deluxe",
        "https://kenney.nl/assets/platformer-art-deluxe",
        "https://kenney.nl/media/pages/assets/platformer-art-deluxe/749ae05a41-1677696393/kenney_platformer-art-deluxe.zip",
        (
            Asset("platform.player.stand", "Base pack/Player/p1_stand.png", "player-stand.png"),
            Asset("platform.player.jump", "Base pack/Player/p1_jump.png", "player-jump.png"),
            Asset("platform.player.walk1", "Base pack/Player/p1_walk/PNG/p1_walk01.png", "player-walk-01.png"),
            Asset("platform.player.walk2", "Base pack/Player/p1_walk/PNG/p1_walk05.png", "player-walk-05.png"),
            Asset("platform.player.walk3", "Base pack/Player/p1_walk/PNG/p1_walk09.png", "player-walk-09.png"),
            Asset("platform.tile.grass.mid", "Base pack/Tiles/grassMid.png", "tile-grass-mid.png"),
            Asset("platform.tile.grass.center", "Base pack/Tiles/grassCenter.png", "tile-grass-center.png"),
            Asset("platform.tile.grass.left", "Base pack/Tiles/grassLeft.png", "tile-grass-left.png"),
            Asset("platform.tile.grass.right", "Base pack/Tiles/grassRight.png", "tile-grass-right.png"),
            Asset("platform.tile.dirt", "Base pack/Tiles/dirtMid.png", "tile-dirt-mid.png"),
            Asset("platform.coin", "Base pack/Items/coinGold.png", "coin-gold.png"),
            Asset("platform.gem.blue", "Base pack/Items/gemBlue.png", "gem-blue.png"),
            Asset("platform.gem.green", "Base pack/Items/gemGreen.png", "gem-green.png"),
            Asset("platform.flag", "Base pack/Items/flagYellow2.png", "flag-yellow.png"),
            Asset("platform.spikes", "Base pack/Items/spikes.png", "spikes.png"),
            Asset("platform.cloud", "Base pack/Items/cloud1.png", "cloud-1.png"),
            Asset("platform.enemy.slime", "Extra animations and enemies/Enemy sprites/slime.png", "slime.png"),
            Asset("platform.enemy.slime.walk", "Extra animations and enemies/Enemy sprites/slime_walk.png", "slime-walk.png"),
        ),
    ),
    Pack(
        "top-down-tanks-remastered",
        "Top-down Tanks Remastered",
        "https://kenney.nl/assets/top-down-tanks-remastered",
        "https://kenney.nl/media/pages/assets/top-down-tanks-remastered/bf8a4ac6dc-1774771973/kenney_top-down-tanks-remastered.zip",
        (
            Asset("tank.player", "PNG/Default size/tank_blue.png", "tank-blue.png"),
            Asset("tank.enemy.red", "PNG/Default size/tank_red.png", "tank-red.png"),
            Asset("tank.enemy.green", "PNG/Default size/tank_green.png", "tank-green.png"),
            Asset("tank.enemy.dark", "PNG/Default size/tank_dark.png", "tank-dark.png"),
            Asset("tank.bullet.blue", "PNG/Default size/bulletBlue1.png", "bullet-blue.png"),
            Asset("tank.bullet.red", "PNG/Default size/bulletRed1.png", "bullet-red.png"),
            Asset("tank.tile.grass", "PNG/Default size/tileGrass1.png", "tile-grass-1.png"),
            Asset("tank.crate", "PNG/Default size/crateWood.png", "crate-wood.png"),
            Asset("tank.barrel", "PNG/Default size/barrelRed_top.png", "barrel-red-top.png"),
            Asset("tank.sandbag", "PNG/Default size/sandbagBeige.png", "sandbag-beige.png"),
            Asset("tank.explosion", "PNG/Default size/explosion1.png", "explosion-1.png"),
        ),
    ),
    Pack(
        "racing-pack",
        "Racing Pack",
        "https://kenney.nl/assets/racing-pack",
        "https://kenney.nl/media/pages/assets/racing-pack/b27a2ace7a-1677662443/kenney_racing-pack.zip",
        (
            Asset("racer.car.red", "PNG/Cars/car_red_1.png", "car-red-1.png"),
            Asset("racer.car.blue", "PNG/Cars/car_blue_1.png", "car-blue-1.png"),
            Asset("racer.road.straight", "PNG/Tiles/Asphalt road/road_asphalt22.png", "road-asphalt-22.png"),
            Asset("racer.road.corner", "PNG/Tiles/Asphalt road/road_asphalt01.png", "road-asphalt-01.png"),
            Asset("racer.cone", "PNG/Objects/cone_straight.png", "cone-straight.png"),
            Asset("racer.oil", "PNG/Objects/oil.png", "oil.png"),
            Asset("racer.barrier", "PNG/Objects/barrier_red.png", "barrier-red.png"),
            Asset("racer.tree", "PNG/Objects/tree_small.png", "tree-small.png"),
        ),
    ),
    Pack(
        "puzzle-pack-2",
        "Puzzle Pack 2",
        "https://kenney.nl/assets/puzzle-pack-2",
        "https://kenney.nl/media/pages/assets/puzzle-pack-2/848ff5c698-1677667476/kenney_puzzle-pack-2.zip",
        (
            Asset("match.back", "PNG/Back tiles/BackTile_05.png", "back-tile-05.png"),
            Asset("match.blue", "PNG/Tiles blue/tileBlue_01.png", "tile-blue-01.png"),
            Asset("match.green", "PNG/Tiles green/tileGreen_01.png", "tile-green-01.png"),
            Asset("match.red", "PNG/Tiles red/tileRed_01.png", "tile-red-01.png"),
            Asset("match.yellow", "PNG/Tiles yellow/tileYellow_01.png", "tile-yellow-01.png"),
            Asset("match.orange", "PNG/Tiles orange/tileOrange_01.png", "tile-orange-01.png"),
            Asset("match.pink", "PNG/Tiles pink/tilePink_01.png", "tile-pink-01.png"),
            Asset("match.coin", "PNG/Coins/coin_01.png", "coin-01.png"),
        ),
    ),
    Pack(
        "playing-cards-pack",
        "Playing Cards Pack",
        "https://kenney.nl/assets/playing-cards-pack",
        "https://kenney.nl/media/pages/assets/playing-cards-pack/08ea695cb6-1677495915/kenney_playing-cards-pack.zip",
        (
            Asset("memory.back", "PNG/Cards (large)/card_back.png", "card-back.png"),
            Asset("memory.hearts.a", "PNG/Cards (large)/card_hearts_A.png", "card-hearts-a.png"),
            Asset("memory.hearts.k", "PNG/Cards (large)/card_hearts_K.png", "card-hearts-k.png"),
            Asset("memory.diamonds.q", "PNG/Cards (large)/card_diamonds_Q.png", "card-diamonds-q.png"),
            Asset("memory.diamonds.10", "PNG/Cards (large)/card_diamonds_10.png", "card-diamonds-10.png"),
            Asset("memory.spades.k", "PNG/Cards (large)/card_spades_K.png", "card-spades-k.png"),
            Asset("memory.spades.07", "PNG/Cards (large)/card_spades_07.png", "card-spades-07.png"),
            Asset("memory.clubs.02", "PNG/Cards (large)/card_clubs_02.png", "card-clubs-02.png"),
            Asset("memory.clubs.j", "PNG/Cards (large)/card_clubs_J.png", "card-clubs-j.png"),
            Asset("memory.joker.red", "PNG/Cards (large)/card_joker_red.png", "card-joker-red.png"),
            Asset("memory.joker.black", "PNG/Cards (large)/card_joker_black.png", "card-joker-black.png"),
        ),
    ),
    Pack(
        "ui-pack-sci-fi",
        "UI Pack - Sci-Fi",
        "https://kenney.nl/assets/ui-pack-sci-fi",
        "https://kenney.nl/media/pages/assets/ui-pack-sci-fi/d83f166279-1724181109/kenney_ui-pack-space-expansion.zip",
        (
            Asset("ui.font.future", "Font/Kenney Future.ttf", "kenney-future.ttf", "font"),
            Asset("ui.bar", "PNG/Blue/Default/bar_round_gloss_large.png", "bar-round-gloss-large.png"),
            Asset("ui.button", "PNG/Blue/Default/button_square_header_large_rectangle.png", "button-header-large.png"),
        ),
    ),
)


def download(url: str, dest: Path) -> None:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=60) as response, dest.open("wb") as fh:
        shutil.copyfileobj(response, fh)


def extract(force: bool = False) -> dict[str, dict[str, str]]:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    manifest: dict[str, dict[str, str]] = {"assets": {}, "packs": {}}
    with tempfile.TemporaryDirectory(prefix="kenney-assets-") as tmp:
        tmp_path = Path(tmp)
        for pack in PACKS:
            print(f"Fetching {pack.title}...")
            zip_path = tmp_path / f"{pack.slug}.zip"
            download(pack.download, zip_path)
            pack_dir = OUT_DIR / pack.slug
            pack_dir.mkdir(parents=True, exist_ok=True)
            with ZipFile(zip_path) as zf:
                names = set(zf.namelist())
                for asset in pack.assets:
                    if asset.source not in names:
                        raise FileNotFoundError(f"{asset.source!r} not found in {pack.title}")
                    dest = pack_dir / asset.dest
                    if force or not dest.exists():
                        with zf.open(asset.source) as src, dest.open("wb") as dst:
                            shutil.copyfileobj(src, dst)
                    rel = dest.relative_to(ROOT).as_posix()
                    manifest["assets"][asset.key] = {
                        "path": rel,
                        "kind": asset.kind,
                        "pack": pack.slug,
                    }
            manifest["packs"][pack.slug] = {
                "title": pack.title,
                "page": pack.page,
                "download": pack.download,
                "license": "Creative Commons CC0 1.0 Universal",
                "credit": "Kenney.nl",
            }
    (OUT_DIR / "manifest.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    write_license(manifest)
    return manifest


def write_license(manifest: dict[str, dict[str, str]]) -> None:
    lines = [
        "# Kenney asset licenses",
        "",
        "This project uses selected assets from [Kenney](https://kenney.nl/assets).",
        "Kenney assets listed here are released under Creative Commons CC0 1.0 Universal.",
        "Attribution is not required, but credit is appreciated: thank you, Kenney!",
        "",
        "## Packs",
        "",
    ]
    for pack in PACKS:
        lines.extend(
            [
                f"### {pack.title}",
                f"- Page: {pack.page}",
                f"- Download used by asset script: {pack.download}",
                "- License: Creative Commons CC0 1.0 Universal",
                "",
            ]
        )
    (OUT_DIR / "LICENSES.md").write_text("\n".join(lines), encoding="utf-8")


def verify() -> int:
    manifest_path = OUT_DIR / "manifest.json"
    if not manifest_path.exists():
        print("Missing assets/kenney/manifest.json. Run the script without --verify first.", file=sys.stderr)
        return 1
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    missing: list[str] = []
    for key, item in manifest["assets"].items():
        path = ROOT / item["path"]
        if not path.exists() or path.stat().st_size == 0:
            missing.append(f"{key}: {item['path']}")
    if missing:
        print("Missing or empty assets:", file=sys.stderr)
        for item in missing:
            print(f"  - {item}", file=sys.stderr)
        return 1
    print(f"Verified {len(manifest['assets'])} Kenney assets.")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--force", action="store_true", help="overwrite existing extracted files")
    parser.add_argument("--verify", action="store_true", help="verify extracted files and exit")
    args = parser.parse_args()
    if args.verify:
        return verify()
    manifest = extract(force=args.force)
    print(f"Extracted {len(manifest['assets'])} curated assets to {OUT_DIR.relative_to(ROOT)}")
    return verify()


if __name__ == "__main__":
    raise SystemExit(main())
