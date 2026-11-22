#!/usr/bin/env python3
"""
Seeds complete demo properties into a LOCAL backend through the admin API (never through SQL), so every
row, file and status history entry is created exactly as the dashboard would create it.

Each property gets every wizard field, unit types, amenities, nearby places, generated photos (PNG), a
PDF brochure, MP4 videos (rendered with make_demo_video.swift; macOS) and optional external video links,
then goes through the workflow (submit, legal review, approve, publish or reject).

Re-runnable: a property whose name already exists is skipped. Dev data only: it refuses non-local APIs
unless --allow-remote is given. Standard library only.

Usage (backend running with the dev profile, AUTH_COOKIE_SECURE=false):
    SEED_ADMIN_EMAIL=admin@example.com python3 scripts/demo-data/seed_demo_properties.py
Options: --api URL, --email, --no-video-files, --video-url URL (repeatable; https YouTube/Vimeo).
The password is read from SEED_ADMIN_PASSWORD or asked for.
"""

from __future__ import annotations

import argparse
import getpass
import http.cookiejar
import json
import os
import shutil
import struct
import subprocess
import sys
import tempfile
import textwrap
import urllib.error
import urllib.parse
import urllib.request
import uuid
import zlib
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
REQUIRED_PERMISSIONS = [
    "ADMIN_PANEL_ACCESS",
    "PROPERTY_CREATE",
    "PROPERTY_CREATE_WITHOUT_SUBSCRIPTION",
    "PROPERTY_LIST_ANY",
    "PROPERTY_VIEW_ANY",
    "PROPERTY_UPDATE_ANY",
    "PROPERTY_REVIEW",
    "PROPERTY_PUBLISH",
    "PROPERTY_LEGAL_REVIEW",
]

# ---------------------------------------------------------------------------------------------------
# Demo data (fictional companies, contacts and RERA numbers; emails use the reserved example.com domain)
# ---------------------------------------------------------------------------------------------------

def unit(name, kind, price, beds, baths, area_min, area_max, parking, unit_="sq_ft", **extra):
    body = {
        "apartmentName": name,
        "apartmentType": kind,
        "startingPrice": price,
        "currency": "INR",
        "bedrooms": beds,
        "bathrooms": baths,
        "balconies": extra.pop("balconies", 2),
        "carParking": parking,
        "areaMin": area_min,
        "areaMax": area_max,
        "carpetArea": round(area_min * 0.78, 2),
        "builtUpArea": round(area_min * 0.9, 2),
        "superBuiltUpArea": area_max,
        "balconyArea": round(area_min * 0.06, 2),
        "areaUnit": unit_,
        "description": f"{name}: well-lit layout with cross ventilation and modular kitchen.",
        "highlights": extra.pop("highlights", ["Vastu compliant", "Modular kitchen"]),
    }
    body.update(extra)
    return body


PROPERTIES = [
    {
        "outcome": "published",
        "hue": 0.58,
        "details": {
            "propertyType": "apartment",
            "projectName": "Aurum Skyline Residences",
            "builderCompanyName": "Aurum Developers Pvt Ltd",
            "reraNumber": "P51800054321",
            "gstNumber": "27AABCA1234D1Z5",
            "projectEmail": "sales.skyline@example.com",
            "projectPhone": "98200 11223",
        },
        "location": {
            "projectAddress": "Plot 7, Hiranandani Gardens, Central Avenue",
            "city": "Mumbai",
            "locality": "Powai",
            "pincode": "400076",
            "state": "Maharashtra",
            "landmark": "Opposite Powai Lake promenade",
            "latitude": 19.1176,
            "longitude": 72.9060,
        },
        "units": [
            unit("2 BHK Lake View", "2bhk", 21500000, 2, 2, 980, 1120, 1),
            unit("3 BHK Signature", "3bhk", 32500000, 3, 3, 1420, 1610, 2),
            unit("Sky Penthouse", "penthouse", 78000000, 4, 5, 3200, 3650, 3,
                 highlights=["Private terrace", "Double-height living"]),
        ],
        "info": {
            "totalTowersBlocks": 3,
            "totalUnitsFlats": 412,
            "projectStatus": "under_construction",
            "landArea": 4.2,
            "landAreaUnit": "acre",
            "possessionStartDate": "2027-09-01",
            "possessionEndDate": "2028-03-31",
            "projectDescription": (
                "Three 42-storey towers overlooking Powai Lake, with a 1.5-acre podium garden, "
                "a 50 m infinity pool and a clubhouse. Walking distance to the Hiranandani business "
                "district, schools and hospitals."
            ),
            "projectHighlights": ["Lake-facing homes", "IGBC Gold pre-certified", "EV charging", "3-tier security"],
        },
        "nearby": [
            ("Hiranandani Hospital", "hospital", 1.2),
            ("Podar International School", "school", 0.8),
            ("R City Mall", "shopping_mall", 4.5),
            ("Kanjurmarg Metro Station", "metro_station", 3.1),
            ("Chhatrapati Shivaji Maharaj International Airport", "airport", 9.4),
        ],
        "videos": 2,
    },
    {
        "outcome": "approved",
        "hue": 0.30,
        "details": {
            "propertyType": "villa",
            "projectName": "Verdant Greens Villas",
            "builderCompanyName": "Verdant Homes LLP",
            "reraNumber": "PRM/KA/RERA/1251/446/PR/240117/006543",
            "gstNumber": "29AAGFV5678K1Z2",
            "projectEmail": "hello.verdant@example.com",
            "projectPhone": "99001 44556",
        },
        "location": {
            "projectAddress": "Survey No. 112, Varthur Main Road",
            "city": "Bengaluru",
            "locality": "Whitefield",
            "pincode": "560066",
            "state": "Karnataka",
            "landmark": "Near Varthur Lake",
            "latitude": 12.9698,
            "longitude": 77.7500,
        },
        "units": [
            unit("Garden Villa", "3bhk", 38500000, 3, 4, 2400, 2650, 2, highlights=["Private garden"]),
            unit("Grand Villa", "4bhk", 52500000, 4, 5, 3300, 3700, 3, highlights=["Home theatre room"]),
        ],
        "info": {
            "totalTowersBlocks": 0,
            "totalUnitsFlats": 96,
            "projectStatus": "ready_to_move",
            "landArea": 18,
            "landAreaUnit": "acre",
            "possessionStartDate": "2026-01-01",
            "possessionEndDate": "2026-06-30",
            "projectDescription": (
                "A gated community of 96 independent villas set around a central forest park, "
                "with a clubhouse, tennis courts and cycling tracks. Ready to move in."
            ),
            "projectHighlights": ["Ready to move", "Private gardens", "Rainwater harvesting"],
        },
        "nearby": [
            ("Manipal Hospital Whitefield", "hospital", 3.4),
            ("Inventure Academy", "school", 5.2),
            ("Phoenix Marketcity", "shopping_mall", 6.8),
            ("Whitefield Railway Station", "railway_station", 4.1),
        ],
        "videos": 1,
    },
    {
        "outcome": "pending",
        "hue": 0.62,
        "details": {
            "propertyType": "apartment",
            "projectName": "Lakeshore Heights",
            "builderCompanyName": "Sahyadri Constructions",
            "reraNumber": "P52100067890",
            "gstNumber": "27AAKCS9012M1Z8",
            "projectEmail": "enquiry.lakeshore@example.com",
            "projectPhone": "98500 77889",
        },
        "location": {
            "projectAddress": "S. No. 45, Baner-Pashan Link Road",
            "city": "Pune",
            "locality": "Baner",
            "pincode": "411045",
            "state": "Maharashtra",
            "landmark": "Near Baner Hill",
            "latitude": 18.5590,
            "longitude": 73.7868,
        },
        "units": [
            unit("1 BHK Smart", "1bhk", 5800000, 1, 1, 520, 610, 0, balconies=1),
            unit("2 BHK Classic", "2bhk", 8900000, 2, 2, 860, 980, 1),
            unit("3 BHK Premium", "3bhk", 12900000, 3, 3, 1250, 1390, 2),
        ],
        "info": {
            "totalTowersBlocks": 5,
            "totalUnitsFlats": 640,
            "projectStatus": "upcoming",
            "landArea": 6.5,
            "landAreaUnit": "acre",
            "possessionStartDate": "2029-06-01",
            "possessionEndDate": "2029-12-31",
            "projectDescription": (
                "Five towers of efficient homes beside the Baner hills, with a jogging track, "
                "co-working lounge and a supermarket inside the campus."
            ),
            "projectHighlights": ["Hill views", "Co-working lounge", "Solar-powered common areas"],
        },
        "nearby": [
            ("Jupiter Hospital", "hospital", 2.6),
            ("The Orchid School", "school", 1.4),
            ("Balewadi High Street", "shopping_mall", 2.2),
            ("Pune Airport", "airport", 21.0),
        ],
        "videos": 1,
    },
    {
        "outcome": "pending",
        "hue": 0.72,
        "details": {
            "propertyType": "commercial",
            "projectName": "Crescent Business Bay",
            "builderCompanyName": "Crescent Realty Ltd",
            "reraNumber": "RC/REP/HARERA/GGM/812/544/2025/35",
            "gstNumber": "06AACCC3456P1Z1",
            "projectEmail": "leasing.crescent@example.com",
            "projectPhone": "98110 22334",
        },
        "location": {
            "projectAddress": "Sector 65, Golf Course Extension Road",
            "city": "Gurugram",
            "locality": "Golf Course Extension",
            "pincode": "122102",
            "state": "Haryana",
            "landmark": "Next to Sector 65 metro (proposed)",
            "latitude": 28.3953,
            "longitude": 77.0694,
        },
        "units": [
            unit("Retail Shop", "1bhk", 9500000, 0, 1, 450, 620, 1, balconies=0,
                 highlights=["High street frontage"]),
            unit("Office Suite", "2bhk", 18500000, 0, 2, 1200, 1500, 2, balconies=0,
                 highlights=["Plug-and-play"]),
        ],
        "info": {
            "totalTowersBlocks": 2,
            "totalUnitsFlats": 220,
            "projectStatus": "under_construction",
            "landArea": 22000,
            "landAreaUnit": "sq_m",
            "possessionStartDate": "2027-12-01",
            "possessionEndDate": "2028-06-30",
            "projectDescription": (
                "Grade-A office suites above a two-level retail high street, with 24x7 power backup, "
                "a food court and ample basement parking."
            ),
            "projectHighlights": ["Grade-A offices", "High street retail", "LEED Platinum design"],
        },
        "nearby": [
            ("Artemis Hospital", "hospital", 6.0),
            ("Sector 55-56 Metro Station", "metro_station", 4.8),
            ("Indira Gandhi International Airport", "airport", 24.0),
        ],
        "videos": 1,
    },
    {
        "outcome": "rejected",
        "reason": "The RERA certificate does not match the project name. Upload the correct certificate.",
        "hue": 0.10,
        "details": {
            "propertyType": "villa",
            "projectName": "Palm Meadows Enclave",
            "builderCompanyName": "Deccan Palm Builders",
            "reraNumber": "P02400005678",
            "gstNumber": "36AADFD7890Q1Z4",
            "projectEmail": "info.palmmeadows@example.com",
            "projectPhone": "98490 55667",
        },
        "location": {
            "projectAddress": "Plot 21, Narsingi-Kokapet Road",
            "city": "Hyderabad",
            "locality": "Kokapet",
            "pincode": "500075",
            "state": "Telangana",
            "landmark": "Near Kokapet Financial District",
            "latitude": 17.3940,
            "longitude": 78.3360,
        },
        "units": [
            unit("Courtyard Villa", "4bhk", 41000000, 4, 4, 3000, 3400, 2, highlights=["Central courtyard"]),
        ],
        "info": {
            "totalTowersBlocks": 0,
            "totalUnitsFlats": 54,
            "projectStatus": "under_construction",
            "landArea": 9.5,
            "landAreaUnit": "acre",
            "possessionStartDate": "2027-03-01",
            "possessionEndDate": "2027-09-30",
            "projectDescription": (
                "Fifty-four courtyard villas inspired by Deccan architecture, with a palm-lined "
                "boulevard, an amphitheatre and an organic farm."
            ),
            "projectHighlights": ["Courtyard homes", "Organic farm", "Amphitheatre"],
        },
        "nearby": [
            ("Continental Hospitals", "hospital", 4.2),
            ("Oakridge International School", "school", 3.0),
            ("Rajiv Gandhi International Airport", "airport", 28.0),
        ],
        "videos": 1,
    },
    {
        "outcome": "published",
        "hue": 0.50,
        "details": {
            "propertyType": "apartment",
            "projectName": "Riverfront Signature",
            "builderCompanyName": "Sabarmati Infra Projects",
            "reraNumber": "PR/GJ/AHMEDABAD/AHMEDABAD CITY/AUDA/RAA12345/010125",
            "gstNumber": "24AAJCS2468R1Z6",
            "projectEmail": "sales.riverfront@example.com",
            "projectPhone": "98250 88990",
        },
        "location": {
            "projectAddress": "Opp. Sabarmati Riverfront, Ashram Road",
            "city": "Ahmedabad",
            "locality": "Usmanpura",
            "pincode": "380013",
            "state": "Gujarat",
            "landmark": "Near Gandhi Bridge",
            "latitude": 23.0395,
            "longitude": 72.5660,
        },
        # Areas in square metres, so the dashboard's sq.ft conversion is exercised.
        "units": [
            unit("2 BHK River", "2bhk", 9800000, 2, 2, 95, 110, 1, unit_="sq_m"),
            unit("3 BHK River", "3bhk", 14500000, 3, 3, 140, 162, 2, unit_="sq_m"),
        ],
        "info": {
            "totalTowersBlocks": 2,
            "totalUnitsFlats": 180,
            "projectStatus": "completed",
            "landArea": 12000,
            "landAreaUnit": "sq_m",
            "possessionStartDate": "2025-10-01",
            "possessionEndDate": "2026-02-28",
            "projectDescription": (
                "Completed riverfront apartments with uninterrupted views of the Sabarmati, a sky "
                "lounge on the 22nd floor and direct access to the riverfront promenade."
            ),
            "projectHighlights": ["River views", "Sky lounge", "Completed project"],
        },
        "nearby": [
            ("Sterling Hospital", "hospital", 3.5),
            ("Ahmedabad Railway Station", "railway_station", 4.0),
            ("Riverfront Bus Stop", "bus_stop", 0.3),
        ],
        "videos": 1,
    },
]

# ---------------------------------------------------------------------------------------------------
# Generated media
# ---------------------------------------------------------------------------------------------------

def hsv(h: float, s: float, v: float) -> tuple[int, int, int]:
    i = int(h * 6) % 6
    f = h * 6 - int(h * 6)
    p, q, t = v * (1 - s), v * (1 - f * s), v * (1 - (1 - f) * s)
    r, g, b = [(v, t, p), (q, v, p), (p, v, t), (p, q, v), (t, p, v), (v, p, q)][i]
    return int(r * 255), int(g * 255), int(b * 255)


class Canvas:
    """Tiny RGB raster with rectangles, gradients and discs; encodes to PNG."""

    def __init__(self, width: int, height: int):
        self.width, self.height = width, height
        self.rows = [bytearray(width * 3) for _ in range(height)]

    def gradient(self, top, bottom, y0=0, y1=None):
        y1 = self.height if y1 is None else y1
        for y in range(y0, y1):
            k = (y - y0) / max(1, y1 - y0 - 1)
            color = bytes(int(a + (b - a) * k) for a, b in zip(top, bottom))
            self.rows[y][:] = color * self.width

    def rect(self, x0, y0, x1, y1, color):
        x0, x1 = max(0, int(x0)), min(self.width, int(x1))
        y0, y1 = max(0, int(y0)), min(self.height, int(y1))
        if x1 <= x0:
            return
        line = bytes(color) * (x1 - x0)
        for y in range(y0, y1):
            self.rows[y][x0 * 3:x1 * 3] = line

    def disc(self, cx, cy, radius, color):
        for y in range(int(cy - radius), int(cy + radius) + 1):
            dy = y - cy
            if 0 <= y < self.height and abs(dy) <= radius:
                half = int((radius * radius - dy * dy) ** 0.5)
                self.rect(cx - half, y, cx + half, y + 1, color)

    def png(self) -> bytes:
        raw = b"".join(b"\x00" + bytes(row) for row in self.rows)

        def chunk(kind: bytes, data: bytes) -> bytes:
            return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data))

        header = struct.pack(">IIBBBBB", self.width, self.height, 8, 2, 0, 0, 0)
        return b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", header) + chunk(b"IDAT", zlib.compress(raw, 6)) + chunk(b"IEND", b"")


W, H = 960, 600


def exterior(hue: float, seed: int) -> bytes:
    c = Canvas(W, H)
    c.gradient(hsv(hue, 0.45, 0.95), hsv((hue + 0.05) % 1, 0.2, 1.0), 0, 470)
    c.gradient(hsv(0.3, 0.35, 0.55), hsv(0.3, 0.4, 0.4), 470, H)
    c.disc(780 - seed * 40, 110, 46, (255, 236, 170))
    x = 40
    for i in range(7):
        w = 90 + (i * 37 + seed * 13) % 60
        h = 180 + (i * 71 + seed * 29) % 230
        body = hsv(hue, 0.18, 0.30 + 0.06 * (i % 3))
        c.rect(x, 470 - h, x + w, 470, body)
        for wy in range(470 - h + 14, 460, 26):
            for wx in range(x + 10, x + w - 14, 20):
                lit = (wx + wy + i) % 3 != 0
                c.rect(wx, wy, wx + 10, wy + 14, (255, 222, 140) if lit else hsv(hue, 0.2, 0.55))
        x += w + 18
    return c.png()


def interior(hue: float, seed: int) -> bytes:
    c = Canvas(W, H)
    c.gradient(hsv((hue + 0.08) % 1, 0.08, 0.96), hsv((hue + 0.08) % 1, 0.12, 0.85), 0, 400)
    c.gradient((150, 112, 80), (110, 80, 58), 400, H)
    for i in range(3):  # windows
        x = 120 + i * 260
        c.rect(x, 70, x + 200, 320, (240, 240, 240))
        c.rect(x + 8, 78, x + 192, 312, hsv(0.58, 0.35, 0.95))
        c.rect(x + 98, 78, x + 102, 312, (240, 240, 240))
    c.rect(220, 360, 740, 470, hsv(hue, 0.35, 0.45))  # sofa
    c.rect(200, 330, 760, 380, hsv(hue, 0.35, 0.55))
    c.rect(380, 500, 580, 520, (90, 60, 40))  # table
    c.disc(150 + seed * 30, 300, 40, (60, 140, 80))  # plant
    c.rect(140 + seed * 30, 330, 160 + seed * 30, 400, (120, 80, 50))
    return c.png()


def pool(hue: float, seed: int) -> bytes:
    c = Canvas(W, H)
    c.gradient(hsv(0.57, 0.5, 0.95), hsv(0.55, 0.2, 1.0), 0, 260)
    c.rect(0, 260, W, 330, (232, 222, 200))
    c.gradient(hsv(0.52, 0.65, 0.85), hsv(0.55, 0.75, 0.6), 330, 560)
    for y in range(350, 560, 34):
        c.rect(0, y, W, y + 3, hsv(0.52, 0.3, 0.98))
    c.rect(0, 560, W, H, (232, 222, 200))
    for i in range(4):
        x = 90 + i * 220
        c.rect(x, 280, x + 120, 300, hsv(hue, 0.5, 0.8))  # loungers
        c.disc(x + 140, 200, 50, (70, 150, 90))
        c.rect(x + 136, 230, x + 144, 280, (120, 90, 60))
    return c.png()


def garden(hue: float, seed: int) -> bytes:
    c = Canvas(W, H)
    c.gradient(hsv(0.28, 0.45, 0.75), hsv(0.3, 0.55, 0.55))
    c.rect(0, 280, W, 330, (220, 205, 175))  # path
    c.rect(450, 0, 500, H, (220, 205, 175))
    for i in range(14):
        cx = (i * 137 + seed * 61) % W
        cy = 60 + (i * 89) % 480
        c.disc(cx, cy, 34 + i % 3 * 8, hsv(0.3, 0.6, 0.35 + 0.05 * (i % 4)))
    c.rect(560, 380, 860, 540, hsv(hue, 0.25, 0.85))  # clubhouse roof
    c.rect(580, 400, 840, 520, hsv(hue, 0.15, 0.95))
    return c.png()


SCENES = [("Exterior view", exterior), ("Living room", interior), ("Swimming pool", pool), ("Landscaped gardens", garden)]


def brochure_pdf(prop: dict) -> bytes:
    """A one-page PDF with the project's key facts."""
    d, loc, info = prop["details"], prop["location"], prop["info"]
    lines = [
        (20, d["projectName"]),
        (12, f"By {d['builderCompanyName']}  |  RERA {d['reraNumber']}"),
        (12, f"{loc['projectAddress']}, {loc['locality']}, {loc['city']} {loc['pincode']}"),
        (12, ""),
    ] + [(12, line) for line in textwrap.wrap(info["projectDescription"], 80)] + [
        (12, ""),
    ] + [(12, f"- {u['apartmentName']}: from Rs {u['startingPrice']:,}") for u in prop["units"]] + [
        (12, ""),
        (10, "Demo brochure generated for development data. Not a real offer."),
    ]

    def esc(text: str) -> str:
        return text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")

    y = 780
    ops = []
    for size, text in lines:
        ops.append(f"BT /F1 {size} Tf 56 {y} Td ({esc(text)}) Tj ET")
        y -= size + 10
    stream = "\n".join(ops).encode("latin-1", "replace")
    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
        b"<< /Length " + str(len(stream)).encode() + b" >>\nstream\n" + stream + b"\nendstream",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    ]
    out = bytearray(b"%PDF-1.4\n")
    offsets = []
    for number, body in enumerate(objects, start=1):
        offsets.append(len(out))
        out += f"{number} 0 obj\n".encode() + body + b"\nendobj\n"
    xref = len(out)
    out += f"xref\n0 {len(objects) + 1}\n0000000000 65535 f \n".encode()
    out += b"".join(f"{offset:010d} 00000 n \n".encode() for offset in offsets)
    out += f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n".encode()
    return bytes(out)


class VideoMaker:
    """Compiles make_demo_video.swift once, then renders one MP4 per call. None when unavailable."""

    def __init__(self, workdir: Path):
        self.binary = None
        if sys.platform != "darwin" or not shutil.which("swiftc"):
            print("  (MP4 videos skipped: needs macOS with swiftc)")
            return
        binary = workdir / "make_demo_video"
        print("  Compiling the video renderer (once, ~15 s)...")
        result = subprocess.run(
            ["swiftc", "-O", str(SCRIPT_DIR / "make_demo_video.swift"), "-o", str(binary)],
            capture_output=True, text=True,
        )
        if result.returncode != 0:
            print("  (MP4 videos skipped: compile failed)\n" + result.stderr[-800:])
            return
        self.binary = binary
        self.workdir = workdir

    def render(self, hue: float, name: str) -> bytes | None:
        if not self.binary:
            return None
        out = self.workdir / f"{name}.mp4"
        subprocess.run([str(self.binary), str(out), f"{hue:.3f}", "6"], check=True)
        return out.read_bytes()


# ---------------------------------------------------------------------------------------------------
# Admin API client (cookie session + CSRF, as the dashboard)
# ---------------------------------------------------------------------------------------------------

class ApiError(Exception):
    pass


class AdminApi:
    def __init__(self, base: str):
        self.base = base.rstrip("/")
        self.jar = http.cookiejar.CookieJar()
        self.opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(self.jar))
        self.csrf_token = None

    def _send(self, method, path, body=None, headers=None, retry=True):
        data, all_headers = None, {"Accept": "application/json", **(headers or {})}
        if isinstance(body, (dict, list)):
            data = json.dumps(body).encode()
            all_headers["Content-Type"] = "application/json"
        elif isinstance(body, tuple):  # (content type, bytes)
            all_headers["Content-Type"], data = body
        if method != "GET":
            if not self.csrf_token:
                self.fetch_csrf()
            all_headers["X-XSRF-TOKEN"] = self.csrf_token
        request = urllib.request.Request(self.base + path, data=data, method=method, headers=all_headers)
        try:
            with self.opener.open(request, timeout=120) as response:
                raw = response.read()
                return json.loads(raw) if raw else None
        except urllib.error.HTTPError as error:
            raw = error.read().decode("utf-8", "replace")
            problem = {}
            try:
                problem = json.loads(raw)
            except ValueError:
                pass
            code = problem.get("code") or problem.get("errorCode") or ""
            if retry and error.code == 403 and "csrf" in (code + raw).lower():
                self.fetch_csrf()
                return self._send(method, path, body, headers, retry=False)
            if retry and error.code == 401 and not path.endswith(("/login", "/refresh")):
                self._send("POST", "/api/v1/admin/refresh", retry=False)
                return self._send(method, path, body, headers, retry=False)
            detail = problem.get("detail") or raw[:300]
            errors = problem.get("errors")
            raise ApiError(f"{method} {path} -> {error.code} {detail}{f' {errors}' if errors else ''}") from None

    def fetch_csrf(self):
        request = urllib.request.Request(self.base + "/api/v1/admin/csrf", headers={"Accept": "application/json"})
        with self.opener.open(request, timeout=30) as response:
            self.csrf_token = json.loads(response.read())["token"]

    def get(self, path, params=None):
        query = f"?{urllib.parse.urlencode(params)}" if params else ""
        return self._send("GET", path + query)

    def login(self, email, password):
        self.fetch_csrf()
        result = self._send("POST", "/api/v1/admin/login", {"identifier": email, "password": password})
        # Login rotates the session; take a fresh CSRF token for the writes that follow.
        self.fetch_csrf()
        return result["user"]

    def write(self, method, path, body=None, version=None, extra_headers=None):
        headers = dict(extra_headers or {})
        if version is not None:
            headers["If-Match"] = f'"{version}"'
        return self._send(method, path, body, headers)

    def upload(self, path, version, fields: dict, filename: str, content_type: str, content: bytes):
        boundary = uuid.uuid4().hex
        parts = []
        for name, value in fields.items():
            parts.append(f'--{boundary}\r\nContent-Disposition: form-data; name="{name}"\r\n\r\n{value}\r\n'.encode())
        parts.append(
            f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="{filename}"\r\n'
            f"Content-Type: {content_type}\r\n\r\n".encode() + content + b"\r\n"
        )
        parts.append(f"--{boundary}--\r\n".encode())
        return self.write("POST", path, (f"multipart/form-data; boundary={boundary}", b"".join(parts)), version)


# ---------------------------------------------------------------------------------------------------
# Seeding
# ---------------------------------------------------------------------------------------------------

BASE = "/api/v1/admin/properties"


def exists(api: AdminApi, name: str) -> bool:
    page = api.get(BASE, {"search": name, "size": 100, "deleted": "include"})
    return any(item["projectName"] == name for item in page["content"])


def seed_one(api: AdminApi, prop: dict, amenity_ids: list[int], videos: VideoMaker, video_urls: list[str]):
    name = prop["details"]["projectName"]
    if exists(api, name):
        print(f"- {name}: already exists, skipped")
        return
    print(f"- {name}")
    created = api.write("POST", BASE, prop["details"], extra_headers={"Idempotency-Key": f"demo-seed-{uuid.uuid4()}"})
    pid, version = created["id"], created["version"]
    path = f"{BASE}/{pid}"

    def step(method, sub, body):
        nonlocal version
        result = api.write(method, path + sub, body, version)
        version = result["version"]
        return result

    step("PATCH", "/steps/2", prop["location"])
    step("PUT", "/apartments", {"apartments": prop["units"]})
    step("PATCH", "/steps/4", prop["info"])
    picks = amenity_ids[(pid % 3):][:8] or amenity_ids[:8]
    step("PUT", "/amenities", {"amenityIds": picks})
    step("PUT", "/nearby-places", {"places": [
        {"placeName": n, "placeType": t, "distanceKm": km} for n, t, km in prop["nearby"]
    ]})

    hue = prop["hue"]
    for index, (title, draw) in enumerate(SCENES):
        result = api.upload(path + "/media", version, {"mediaType": "photo", "title": title, **({"primary": "true"} if index == 0 else {})},
                            f"photo-{index + 1}.png", "image/png", draw(hue, index))
        version = result["version"]
    result = api.upload(path + "/media", version, {"mediaType": "brochure", "title": f"{name} brochure"},
                        "brochure.pdf", "application/pdf", brochure_pdf(prop))
    version = result["version"]
    for index in range(prop.get("videos", 1)):
        clip = videos.render((hue + index * 0.07) % 1, f"{pid}-{index}")
        if clip:
            result = api.upload(path + "/media", version, {"mediaType": "video", "title": f"Walkthrough {index + 1}"},
                                f"walkthrough-{index + 1}.mp4", "video/mp4", clip)
            version = result["version"]
    for url in video_urls:
        version = step("POST", "/media", {"mediaType": "video", "url": url, "title": "Project film"})["version"]

    # Workflow.
    outcome = prop["outcome"]
    version = api.write("POST", path + "/submit", None, version)["version"]
    if outcome in ("approved", "published"):
        version = api.write("PATCH", path + "/legal-status", {"status": "approved"}, version)["version"]
        version = api.write("PATCH", path + "/status", {"action": "approve"}, version)["version"]
    if outcome == "published":
        version = api.write("POST", path + "/publish", None, version)["version"]
    if outcome == "rejected":
        version = api.write("PATCH", path + "/legal-status",
                            {"status": "rejected", "reason": "RERA certificate mismatch."}, version)["version"]
        version = api.write("PATCH", path + "/status", {"action": "reject", "reason": prop["reason"]}, version)["version"]
    print(f"    id {pid}: {outcome}")


def main() -> int:
    parser = argparse.ArgumentParser(description="Seed complete demo properties into a local backend.")
    parser.add_argument("--api", default=os.environ.get("SEED_API", "http://localhost:8080"))
    parser.add_argument("--email", default=os.environ.get("SEED_ADMIN_EMAIL"))
    parser.add_argument("--no-video-files", action="store_true", help="do not render and upload MP4 files")
    parser.add_argument("--video-url", action="append", default=[], help="external https YouTube/Vimeo link to add to every property")
    parser.add_argument("--allow-remote", action="store_true", help="allow an API that is not on localhost")
    args = parser.parse_args()

    host = urllib.parse.urlparse(args.api).hostname or ""
    if host not in ("localhost", "127.0.0.1", "::1") and not args.allow_remote:
        print(f"Refusing to seed demo data into {args.api}: not a local API (use --allow-remote).")
        return 2
    email = args.email or input("Admin email: ").strip()
    password = os.environ.get("SEED_ADMIN_PASSWORD") or getpass.getpass("Admin password: ")

    api = AdminApi(args.api)
    try:
        user = api.login(email, password)
    except (ApiError, urllib.error.URLError) as error:
        print(f"Sign-in failed: {error}")
        return 1
    missing = [p for p in REQUIRED_PERMISSIONS if p not in user.get("permissions", [])]
    if missing:
        print(f"{email} lacks permissions needed to seed: {', '.join(missing)}")
        return 1
    print(f"Signed in as {user.get('fullName') or email}.")

    amenity_ids = [a["id"] for a in api.get(f"{BASE}/amenities")]
    if not amenity_ids:
        print("No active amenities in the catalog; at least one is required to submit a property.")
        return 1

    with tempfile.TemporaryDirectory(prefix="demo-seed-") as tmp:
        videos = VideoMaker(Path(tmp)) if not args.no_video_files else VideoMaker.__new__(VideoMaker)
        if args.no_video_files:
            videos.binary = None
        failures = 0
        for prop in PROPERTIES:
            try:
                seed_one(api, prop, amenity_ids, videos, args.video_url)
            except ApiError as error:
                failures += 1
                print(f"    FAILED: {error}")
    print("Done." if not failures else f"Done with {failures} failure(s).")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
