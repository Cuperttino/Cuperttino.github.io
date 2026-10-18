#!/usr/bin/env python3
"""Fetch Apple Newsroom feeds (RSS or Atom) and write data used by the site."""
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

def local_name(tag: str) -> str:
    return tag.rsplit("}", 1)[-1].lower()

def child_text(node: ET.Element, *names: str) -> str:
    wanted = set(names)
    for child in node:
        if local_name(child.tag) in wanted:
            return clean(child.text)
    return ""

def entry_url(node: ET.Element) -> str:
    for child in node:
        if local_name(child.tag) == "link":
            href = clean(child.attrib.get("href"))
            if href:
                return href
            if clean(child.text):
                return clean(child.text)
    return ""

def fetch() -> bytes:
    request = urllib.request.Request(
        FEED_URL,
        headers={"User-Agent": "Cupertino RSS updater/1.0 (+https://github.com/Santirdrgz/cupertino.github.io)"},
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        return response.read()

def formatted_date(value: str) -> str:
    if not value:
        return "Reciente"
    try:
        return parsedate_to_datetime(value).astimezone(timezone.utc).strftime("%d %b %Y").upper()
    except (TypeError, ValueError, IndexError):
        return value

def main() -> None:
    root = ET.fromstring(fetch())
    candidates = [node for node in root.iter() if local_name(node.tag) in {"item", "entry"}]
    items = []
    for node in candidates[:MAX_ITEMS]:
        title = child_text(node, "title")
        url = entry_url(node)
        summary = child_text(node, "description", "summary", "content")
        published = child_text(node, "pubdate", "published", "updated", "date")
        if title and url:
            items.append({"title": title, "url": url, "summary": summary, "date": formatted_date(published)})
    if not items:
        raise RuntimeError("Apple Newsroom feed returned no usable entries.")
    OUTPUT.write_text(json.dumps({
        "updated_at": datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z"),
        "source": FEED_URL,
        "items": items,
    }, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

if __name__ == "__main__":
    main()
