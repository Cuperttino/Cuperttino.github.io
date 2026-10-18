#!/usr/bin/env python3
"""Fetch Apple Newsroom RSS and write the lightweight data used by the site."""
from __future__ import annotations

import html
import json
import re
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path

FEED_URL = "https://www.apple.com/newsroom/rss-feed.rss"
OUTPUT = Path("news.json")
MAX_ITEMS = 24

def clean(value: str | None) -> str:
    value = html.unescape(value or "")
    value = re.sub(r"<[^>]+>", " ", value)
    return re.sub(r"\s+", " ", value).strip()

def fetch() -> bytes:
    request = urllib.request.Request(
        FEED_URL,
        headers={"User-Agent": "Cupertino RSS updater/1.0 (+https://github.com/Santirdrgz/cupertino.github.io)"},
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        return response.read()

def formatted_date(value: str | None) -> str:
    if not value:
        return "Reciente"
    try:
        return parsedate_to_datetime(value).astimezone(timezone.utc).strftime("%d %b %Y").upper()
    except (TypeError, ValueError, IndexError):
        return clean(value)

def main() -> None:
    root = ET.fromstring(fetch())
    items = []
    for node in root.findall("./channel/item")[:MAX_ITEMS]:
        title = clean(node.findtext("title"))
        url = clean(node.findtext("link"))
        summary = clean(node.findtext("description"))
        if title and url:
            items.append({
                "title": title,
                "url": url,
                "summary": summary,
                "date": formatted_date(node.findtext("pubDate")),
            })
    if not items:
        raise RuntimeError("Apple Newsroom RSS returned no usable items.")
    OUTPUT.write_text(json.dumps({
        "updated_at": datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z"),
        "source": FEED_URL,
        "items": items,
    }, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

if __name__ == "__main__":
    main()
