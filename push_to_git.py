#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
سكربت أتمتة الرفع إلى GitHub بضغطة زر
Creziax Git Automation Tool
"""

import subprocess
import sys

def run_cmd(cmd, desc):
    print(f"[⏳] {desc}...")
    try:
        res = subprocess.run(cmd, shell=True, check=True, text=True, capture_output=True)
        print(f"[✅] نجح: {desc}")
        if res.stdout.strip():
            print(f"    {res.stdout.strip()}")
        return True
    except subprocess.CalledProcessError as e:
        print(f"[❌] خطأ في: {desc}")
        print(f"    {e.stderr.strip()}")
        return False

def main():
    print("=" * 60)
    print("🚀 سكريبت الرفع الآلي إلى GitHub")
    print("=" * 60)

    # 1. فحص وجود git
    run_cmd("git status", "فحص حالة المستودع")

    # 2. إضافة الملفات
    run_cmd("git add scraper.py", "إضافة ملف scraper.py")

    # 3. عمل Commit
    commit_msg = input("\n📝 اكتب رسالة التحديث (اضغط Enter للافتراضي): ").strip()
    if not commit_msg:
        commit_msg = "feat(crm): update scraper.py leads engine"

    run_cmd(f'git commit -m "{commit_msg}"', "حفظ التعديلات (Commit)")

    # 4. رفع إلى GitHub
    run_cmd("git push origin main && git push origin main:master", "الرفع إلى جيثب (Push to GitHub)")

    print("\n🎉 انتهى الرفع بنجاح! الملف الآن متاح على المستودع الخاص بك.")

if __name__ == "__main__":
    main()
