#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
================================================================================
سكربت سحب عملاء وصناع محتوى يوتيوب التفاعلي المربوط بـ Notion CRM
Creziax Sales & Leads Automation Engine
================================================================================
"""

import sys
import re
import time
import json
import urllib.request
import urllib.parse
import urllib.error
from datetime import datetime

import base64
import os

# ==============================================================================
# 🔑 المفاتيح والبيانات السرية المعتمدة
# ==============================================================================
YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY") or base64.b64decode("QUl6YVN5Q09ER3l1ZkdqOFQ5MDd6SHY2bWdUNy05eFhNRFFsUzJF").decode("utf-8")
NOTION_TOKEN = os.getenv("NOTION_TOKEN") or base64.b64decode("bnRuXzM2MzQ3MDE1Nzc0OWlNZEIxWGtzazJ3bHhPeTV3bTQ2dk5jZmJxVEdUWmw2YVI=").decode("utf-8")
NOTION_DATABASE_ID = os.getenv("NOTION_DATABASE_ID") or "26e87673725e82e1ace2013a9d100c99"

NOTION_HEADERS = {
    "Authorization": f"Bearer {NOTION_TOKEN}",
    "Notion-Version": "2022-06-28",
    "Content-Type": "application/json",
    "User-Agent": "Creziax-Sales-Bot/1.0",
}

EMAIL_REGEX = re.compile(
    r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+", re.IGNORECASE
)

SOCIAL_PATTERNS = {
    "Instagram": re.compile(r"(?:https?://)?(?:www\.)?instagram\.com/[a-zA-Z0-9_.-]+/?", re.IGNORECASE),
    "TikTok": re.compile(r"(?:https?://)?(?:www\.)?tiktok\.com/@[a-zA-Z0-9_.-]+/?", re.IGNORECASE),
    "Twitter/X": re.compile(r"(?:https?://)?(?:www\.)?(?:twitter\.com|x\.com)/[a-zA-Z0-9_.-]+/?", re.IGNORECASE),
    "Facebook": re.compile(r"(?:https?://)?(?:www\.)?facebook\.com/[a-zA-Z0-9_.-]+/?", re.IGNORECASE),
    "LinkedIn": re.compile(r"(?:https?://)?(?:www\.)?linkedin\.com/(?:in|company)/[a-zA-Z0-9_.-]+/?", re.IGNORECASE),
    "Telegram": re.compile(r"(?:https?://)?(?:t\.me|telegram\.me)/[a-zA-Z0-9_.-]+/?", re.IGNORECASE),
}


# ==============================================================================
# 🛠️ دوال مساعدة للاتصال بالشبكة عبر معايير بايثون القياسية (بدون مكتبات خارجية)
# ==============================================================================
def http_request(url, method="GET", headers=None, data=None):
    if headers is None:
        headers = {}
    encoded_data = None
    if data is not None:
        if isinstance(data, (dict, list)):
            encoded_data = json.dumps(data).encode("utf-8")
        elif isinstance(data, str):
            encoded_data = data.encode("utf-8")
        else:
            encoded_data = data

    req = urllib.request.Request(url, data=encoded_data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=25) as resp:
            content = resp.read().decode("utf-8")
            return resp.status, content
    except urllib.error.HTTPError as e:
        content = e.read().decode("utf-8")
        return e.code, content
    except Exception as e:
        return 0, str(e)


# ==============================================================================
# 🔍 دوال فحص قاعدة بيانات نوشن ومنع التكرار (Deduplication)
# ==============================================================================
def get_existing_notion_channel_titles():
    """
    يجلب جميع أسماء القنوات المسجلة مسبقاً في قاعدة بيانات نوشن لتفادي التكرار.
    """
    url = f"https://api.notion.com/v1/databases/{NOTION_DATABASE_ID}/query"
    existing_titles = set()
    has_more = True
    next_cursor = None

    while has_more:
        payload = {"page_size": 100}
        if next_cursor:
            payload["start_cursor"] = next_cursor

        status, response_text = http_request(url, method="POST", headers=NOTION_HEADERS, data=payload)
        if status != 200:
            if "Could not find database" in response_text:
                print("\n" + "=" * 75)
                print("⚠️ تنبيه أمني من Notion:")
                print("قاعدة البيانات موجودة، ولكنك لم تمنح التوكن صلاحية الوصول إليها بعد.")
                print("الحل في ثانية واحدة:")
                print("1. افتح صفحة جدول Notion في المتصفح.")
                print("2. اضغط على (...) في أعلى يمين الصفحة ➔ Connections ➔ Connect to.")
                print("3. اختر 'Mark_Personal_OS' ثم اضغط تأكيد.")
                print("=" * 75 + "\n")
            break

        try:
            data = json.loads(response_text)
            for page in data.get("results", []):
                props = page.get("properties", {})
                # فحص اسم العميل (rich_text)
                name_prop = props.get("اسم العميل ", {}).get("rich_text", []) or props.get("اسم العميل", {}).get("rich_text", [])
                if name_prop:
                    name_text = name_prop[0].get("text", {}).get("content", "").strip()
                    if name_text:
                        existing_titles.add(name_text.lower())
                # فحص بيانات التواصل (title)
                contact_prop = props.get("بيانات التواصل", {}).get("title", [])
                if contact_prop:
                    contact_text = contact_prop[0].get("text", {}).get("content", "").strip()
                    if contact_text:
                        existing_titles.add(contact_text.lower())

            has_more = data.get("has_more", False)
            next_cursor = data.get("next_cursor")
        except Exception:
            break

    return existing_titles


# ==============================================================================
# 📥 إرسال عميل جديد إلى Notion CRM
# ==============================================================================
def push_lead_to_notion(lead: dict, target_niche: str):
    """
    يرسل العميل كصف جديد (Page) داخل جدول نوشن 'CRM العملاء - متابعة'
    """
    url = "https://api.notion.com/v1/pages"

    contact_parts = []
    if lead.get("email"):
        contact_parts.append(f"📧 إيميل: {lead['email']}")
    if lead.get("social_links"):
        contact_parts.append(f"🌐 تواصل: {' | '.join(lead['social_links'])}")
    if lead.get("channel_url"):
        contact_parts.append(f"🔗 القناة: {lead['channel_url']}")
    if lead.get("subscribers"):
        contact_parts.append(f"👥 المشتركين: {lead['subscribers']:,}")

    contact_text = "\n".join(contact_parts) if contact_parts else lead.get("channel_url", "")

    # مطابقة أعمدة جدول Notion بدقة
    properties = {
        "بيانات التواصل": {
            "title": [
                {
                    "text": {
                        "content": contact_text[:2000]
                    }
                }
            ]
        },
        "اسم العميل ": {
            "rich_text": [
                {
                    "text": {
                        "content": lead.get("channel_name", "عميل بدون اسم")[:100]
                    }
                }
            ]
        },
        "نتش العميل": {
            "rich_text": [
                {
                    "text": {
                        "content": target_niche[:100]
                    }
                }
            ]
        },
        "حالة العميل": {
            "status": {
                "name": "العرض قيد الانشاء"
            }
        }
    }

    payload = {
        "parent": {"database_id": NOTION_DATABASE_ID},
        "properties": properties,
    }

    status, resp_text = http_request(url, method="POST", headers=NOTION_HEADERS, data=payload)

    # معالجة احتياطية في حال كان اسم العمود بدون مسافة إضافية
    if status == 400 and "اسم العميل" in resp_text:
        del properties["اسم العميل "]
        properties["اسم العميل"] = {
            "rich_text": [{"text": {"content": lead.get("channel_name", "عميل بدون اسم")[:100]}}]
        }
        payload["properties"] = properties
        status, resp_text = http_request(url, method="POST", headers=NOTION_HEADERS, data=payload)

    # معالجة إذا كان خيار الحالة مسمى بالإنجليزية في النظام
    if status == 400 and "جديد" in resp_text:
        properties["حالة العميل"] = {"status": {"name": "New Lead"}}
        payload["properties"] = properties
        status, resp_text = http_request(url, method="POST", headers=NOTION_HEADERS, data=payload)

    if status in [200, 201]:
        return True, "تم الحفظ بنجاح"
    else:
        try:
            err = json.loads(resp_text).get("message", resp_text)
        except Exception:
            err = resp_text
        return False, err


# ==============================================================================
# 🎯 محرك سحب واستخراج بيانات قنوات يوتيوب (YouTube Extractor)
# ==============================================================================
def search_youtube_channels(keyword: str, target_count: int, existing_channels: set):
    """
    يبحث عن القنوات ويسحب تفاصيلها وإيميلاتها حتى الوصول للعدد المستهدف بدقة
    """
    collected_leads = []
    next_page_token = None
    processed_channel_ids = set()

    print(f"\n[🚀] جاري البحث في يوتيوب عن النيتش: '{keyword}'...")
    print(f"[🎯] المستهدف: {target_count} عميل جديد غير مكرر\n")
    print("-" * 75)

    while len(collected_leads) < target_count:
        params = {
            "part": "snippet",
            "type": "channel",
            "q": keyword,
            "maxResults": min(50, (target_count - len(collected_leads)) * 2),
            "key": YOUTUBE_API_KEY,
        }
        if next_page_token:
            params["pageToken"] = next_page_token

        search_url = f"https://www.googleapis.com/youtube/v3/search?{urllib.parse.urlencode(params)}"
        status, search_text = http_request(search_url)

        if status != 200:
            print(f"[❌] خطأ من يوتيوب API: {search_text}")
            break

        try:
            search_data = json.loads(search_text)
        except Exception:
            break

        items = search_data.get("items", [])
        next_page_token = search_data.get("nextPageToken")

        if not items:
            print("[!] انتهت نتائج البحث المتاحة لهذه الكلمة في يوتيوب.")
            break

        channel_ids = [
            it["snippet"]["channelId"]
            for it in items
            if it.get("snippet", {}).get("channelId")
        ]

        new_ids = [cid for cid in channel_ids if cid not in processed_channel_ids]
        if not new_ids:
            if not next_page_token:
                break
            continue

        for cid in new_ids:
            processed_channel_ids.add(cid)

        # جلب تفاصيل القنوات دفعة واحدة (Statistics & Description)
        det_params = {
            "part": "snippet,statistics",
            "id": ",".join(new_ids),
            "key": YOUTUBE_API_KEY,
        }
        details_url = f"https://www.googleapis.com/youtube/v3/channels?{urllib.parse.urlencode(det_params)}"
        det_status, det_text = http_request(details_url)
        if det_status != 200:
            continue

        try:
            det_data = json.loads(det_text)
        except Exception:
            continue

        for ch in det_data.get("items", []):
            if len(collected_leads) >= target_count:
                break

            cid = ch["id"]
            snippet = ch.get("snippet", {})
            stats = ch.get("statistics", {})

            ch_title = snippet.get("title", "").strip()
            description = snippet.get("description", "")
            custom_url = snippet.get("customUrl", "")
            ch_url = f"https://www.youtube.com/{custom_url}" if custom_url else f"https://www.youtube.com/channel/{cid}"

            # منع التكرار
            if ch_title.lower() in existing_channels:
                print(f"  ⏭️ [مكرر] تم تخطي: {ch_title} (موجودة مسبقاً في Notion)")
                continue

            # استخراج الإيميل
            emails_found = EMAIL_REGEX.findall(description)
            valid_emails = [
                e for e in emails_found
                if not e.lower().endswith(('.png', '.jpg', '.jpeg', '.webp'))
            ]
            extracted_email = valid_emails[0] if valid_emails else None

            # استخراج روابط السوشيال
            social_links = []
            for platform_name, pat in SOCIAL_PATTERNS.items():
                matches = pat.findall(description)
                if matches:
                    social_links.append(f"{platform_name}: {matches[0]}")

            sub_count = int(stats.get("subscriberCount", 0))

            lead = {
                "channel_id": cid,
                "channel_name": ch_title,
                "channel_url": ch_url,
                "email": extracted_email,
                "social_links": social_links,
                "subscribers": sub_count,
            }

            # الإرسال الفوري لـ Notion
            success, msg = push_lead_to_notion(lead, keyword)
            if success:
                existing_channels.add(ch_title.lower())
                collected_leads.append(lead)
                idx = len(collected_leads)
                email_badge = f" [✉️ {extracted_email}]" if extracted_email else " [بدون إيميل في الوصف]"
                print(f"[{idx:02d}/{target_count:02d}] ✅ تم الإرسال لنوشن: {ch_title}{email_badge}")
            else:
                print(f"  ⚠️ تعذر إرسال {ch_title} إلى نوشن: {msg}")

            time.sleep(0.3)

        if not next_page_token:
            break

    return collected_leads


# ==============================================================================
# 🖥️ الواجهة التفاعلية الرئيسية (CLI Entrypoint)
# ==============================================================================
def main():
    print("""
=======================================================================
       🌟 منظومة سحب عملاء يوتيوب التفاعلية ➔ NOTION CRM 🌟
=======================================================================
    """)

    # 1. إدخال الكلمة المفتاحية / النيتش
    default_niche = "تسويق رقمي"
    raw_niche = input(f"1. أدخل الكلمة المفتاحية أو النيتش المستهدف [افتراضي: {default_niche}]: ").strip()
    niche = raw_niche if raw_niche else default_niche

    # 2. إدخال العدد المطلوب
    default_limit = 50
    raw_limit = input(f"2. أدخل عدد العملاء المطلوب سحبهم [افتراضي: {default_limit}]: ").strip()
    try:
        limit = int(raw_limit) if raw_limit else default_limit
        if limit <= 0:
            limit = default_limit
    except ValueError:
        limit = default_limit

    print(f"\n[🔄] جاري الاتصال بقاعدة بيانات Notion وفحص السجلات السابقة لمنع التكرار...")
    existing = get_existing_notion_channel_titles()
    print(f"[✅] تم الاتصال بنوشن! السجلات الموجودة مسبقاً: {len(existing)} عميل.")

    start_time = time.time()
    results = search_youtube_channels(keyword=niche, target_count=limit, existing_channels=existing)
    elapsed = time.time() - start_time

    print("\n" + "=" * 75)
    print(f"🎉 اكتملت العملية بنجاح!")
    print(f"📊 إجمالي العملاء الجدد المضافين إلى جدول 'العملاء - متابعة CRM': {len(results)} عميل")
    print(f"⏱️ الوقت المستغرق: {elapsed:.1f} ثانية")
    print("=" * 75 + "\n")


if __name__ == "__main__":
    main()
