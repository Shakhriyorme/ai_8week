"""
Shahriyor AI Tracker — Telegram Bot
=====================================
Vazifalar:
  • /start → "Salom Shahriyor" + asosiy menyuni ko'rsat
  • /stats → so'nggi 14 kunlik statistika
  • Har kuni soat 20:00 da — kirish tekshiruvi.
    Agar 1 kundan ko'p kirmagan bo'lsa → eslatma yuboradi.
  • Har yakshanba — haftalik yig'indi hisobot

O'rnatish:
  pip install python-telegram-bot==20.7 apscheduler supabase python-dotenv

Ishga tushirish:
  python telegram_bot.py
"""

import asyncio
import json
import os
import logging
from datetime import datetime, timedelta, timezone
from pathlib import Path

from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import (
    Application,
    CommandHandler,
    CallbackQueryHandler,
    ContextTypes,
)
from apscheduler.schedulers.asyncio import AsyncIOScheduler

# ── Logging ─────────────────────────────────────────────────────────────────
logging.basicConfig(
    format="%(asctime)s │ %(levelname)s │ %(message)s",
    level=logging.INFO,
)
log = logging.getLogger(__name__)

# ── Config ───────────────────────────────────────────────────────────────────
BOT_TOKEN   = "8111549447:AAGHlXSW976KsuKgYeA--juiQra4C4sg0mY"
OWNER_NAME  = "Shahriyor"
PLATFORM_URL = "file:///C:/Users/ASUS/Downloads/files/index.html"   # local yoki deploy URL

# Chat ID — /start bosganda avtomatik saqlanadi (data.json)
DATA_FILE = Path(__file__).parent / "bot_data.json"


# ── Ma'lumotlarni saqlash ────────────────────────────────────────────────────
def load_data() -> dict:
    if DATA_FILE.exists():
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {"chat_id": None, "last_visit": None, "logs": []}


def save_data(data: dict):
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def record_visit():
    """Platformaga kirish vaqtini qayd etish (ixtiyoriy endpoint orqali chaqirish mumkin)."""
    data = load_data()
    data["last_visit"] = datetime.now(timezone.utc).isoformat()
    save_data(data)


# ── Supabase integratsiyasi (ixtiyoriy) ─────────────────────────────────────
def get_supabase_stats() -> dict | None:
    """
    Agar supabase o'rnatilgan bo'lsa — real statslarni qaytaradi.
    Aks holda — sinov ma'lumotlari.
    """
    try:
        from supabase import create_client
        url = os.getenv("SUPABASE_URL", "")
        key = os.getenv("SUPABASE_KEY", "")
        if not url or not key:
            raise ValueError("Supabase credentials topilmadi")

        sb = create_client(url, key)
        two_weeks_ago = (datetime.now(timezone.utc) - timedelta(days=14)).isoformat()

        res = sb.table("daily_logs") \
                 .select("*") \
                 .gte("date", two_weeks_ago) \
                 .order("date") \
                 .execute()
        logs = res.data or []

        total_hours  = sum(r.get("hours", 0) for r in logs)
        total_tasks  = sum(r.get("tasks_completed", 0) for r in logs)
        total_days   = len(logs)
        avg_diff     = (sum(r.get("difficulty", 3) for r in logs) / total_days) if total_days else 0

        return {
            "days"       : total_days,
            "hours"      : round(total_hours, 1),
            "tasks"      : total_tasks,
            "avg_diff"   : round(avg_diff, 1),
            "last_14_logs": logs[-5:],          # so'nggi 5 yozuv
        }
    except Exception as e:
        log.warning(f"Supabase ulanmadi: {e}  →  test ma'lumotlar ishlatilmoqda")
        return None


def build_stats_message() -> str:
    stats = get_supabase_stats()
    now_str = datetime.now().strftime("%d.%m.%Y")

    if stats:
        recent_lines = ""
        for r in stats["last_14_logs"]:
            date  = r.get("date", "?")[:10]
            hrs   = r.get("hours", 0)
            tasks = r.get("tasks_completed", 0)
            recent_lines += f"  • {date} — {hrs}h, {tasks} ta topshiriq\n"

        return (
            f"📊 *So'nggi 14 kunlik statistika*\n"
            f"_{now_str} holatiga ko'ra_\n\n"
            f"📅 Faol kunlar   : *{stats['days']}* / 14\n"
            f"⏱ Jami soat      : *{stats['hours']}h*\n"
            f"✅ Jami topshiriq : *{stats['tasks']}*\n"
            f"🔥 O'rtacha qiyinlik: *{stats['avg_diff']} / 5*\n\n"
            f"📋 *So'nggi yozuvlar:*\n{recent_lines}"
            f"\n🚀 Davom et, {OWNER_NAME}\\!"
        )
    else:
        # Sinov rejimi
        return (
            f"📊 *So'nggi 14 kunlik statistika* _(sinov rejimi)_\n"
            f"_{now_str} holatiga ko'ra_\n\n"
            f"📅 Faol kunlar   : *9* / 14\n"
            f"⏱ Jami soat      : *87h*\n"
            f"✅ Jami topshiriq : *43*\n"
            f"🔥 O'rtacha qiyinlik: *3.8 / 5*\n\n"
            f"💡 Supabase ulanganda real ma'lumotlar ko'rinadi\\.\n"
            f"\n🚀 Davom et, {OWNER_NAME}\\!"
        )


# ── /start handler ───────────────────────────────────────────────────────────
async def cmd_start(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    chat_id = update.effective_chat.id

    # Chat ID ni saqlash
    data = load_data()
    data["chat_id"]     = chat_id
    data["last_visit"]  = datetime.now(timezone.utc).isoformat()
    save_data(data)

    keyboard = InlineKeyboardMarkup([
        [InlineKeyboardButton("📊 Statistika (14 kun)", callback_data="stats")],
        [InlineKeyboardButton("✅ Bugun kirdim",        callback_data="checkin")],
        [InlineKeyboardButton("ℹ️ Yordam",              callback_data="help")],
    ])

    await update.message.reply_text(
        f"👋 Salom, *{OWNER_NAME}*\\!\n\n"
        f"Men sening shaxsiy AI Tracker botingman\\.\n"
        f"Har kuni kuzatib boraman — o'rganish, topshiriqlar, streak\\.\n\n"
        f"Quyidagi tugmalardan foydalan 👇",
        parse_mode="MarkdownV2",
        reply_markup=keyboard,
    )
    log.info(f"/start → chat_id={chat_id} saqlandi")


# ── /stats handler ───────────────────────────────────────────────────────────
async def cmd_stats(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    msg = await update.message.reply_text("⏳ Statistika yuklanmoqda...")
    text = build_stats_message()
    await msg.edit_text(text, parse_mode="MarkdownV2")


# ── /checkin handler ─────────────────────────────────────────────────────────
async def cmd_checkin(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    record_visit()
    await update.message.reply_text(
        f"✅ *Kirish qayd etildi\\!*\n"
        f"_{datetime.now().strftime('%d.%m.%Y %H:%M')}_\n\n"
        f"Streak davom etyapti 🔥 Zo'r, {OWNER_NAME}\\!",
        parse_mode="MarkdownV2",
    )


# ── Inline tugma handlerlari ─────────────────────────────────────────────────
async def on_button(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()

    if query.data == "stats":
        text = build_stats_message()
        await query.message.reply_text(text, parse_mode="MarkdownV2")

    elif query.data == "checkin":
        record_visit()
        await query.message.reply_text(
            f"✅ *Kirish qayd etildi\\!*\n"
            f"_{datetime.now().strftime('%d.%m.%Y %H:%M')}_\n\n"
            f"Streak davom etyapti 🔥",
            parse_mode="MarkdownV2",
        )

    elif query.data == "help":
        await query.message.reply_text(
            "📌 *Mavjud buyruqlar:*\n\n"
            "/start — botni qayta ishga tushir\n"
            "/stats — 14 kunlik statistika\n"
            "/checkin — bugun kirdim deb belgilash\n\n"
            "🔔 Avtomatik eslatmalar:\n"
            "  • Har kuni 20:00 — kirish tekshiruvi\n"
            "  • Har yakshanba — haftalik hisobot",
            parse_mode="MarkdownV2",
        )


# ── Avtomatik eslatma (har kuni 20:00) ──────────────────────────────────────
async def daily_reminder_job(app: Application):
    data = load_data()
    chat_id = data.get("chat_id")
    if not chat_id:
        log.info("daily_reminder: chat_id yo'q — /start bosilmagan")
        return

    last_visit_str = data.get("last_visit")
    if last_visit_str:
        last_visit = datetime.fromisoformat(last_visit_str)
        if last_visit.tzinfo is None:
            last_visit = last_visit.replace(tzinfo=timezone.utc)
        hours_since = (datetime.now(timezone.utc) - last_visit).total_seconds() / 3600
    else:
        hours_since = 999

    if hours_since >= 24:
        days_away = int(hours_since // 24)
        keyboard = InlineKeyboardMarkup([
            [InlineKeyboardButton("✅ Hozir kirdim", callback_data="checkin")],
            [InlineKeyboardButton("📊 Statistika",  callback_data="stats")],
        ])
        await app.bot.send_message(
            chat_id=chat_id,
            text=(
                f"⚠️ *{OWNER_NAME}, {days_away} kundan beri kelmading\\!*\n\n"
                f"Streak xavf ostida 🔥\n"
                f"Platformaga kir va bugungi darsni boshla\\.\n\n"
                f"_Har bir kun o'tkazib yuborish seni maqsaddan uzoqlashtiradi\\._"
            ),
            parse_mode="MarkdownV2",
            reply_markup=keyboard,
        )
        log.info(f"Eslatma yuborildi → chat_id={chat_id} ({days_away} kun yo'q)")
    else:
        log.info(f"daily_reminder: {OWNER_NAME} so'nggi {hours_since:.1f} soat ichida kirgan — eslatma shart emas")


# ── Haftalik hisobot (har yakshanba 20:00) ───────────────────────────────────
async def weekly_report_job(app: Application):
    data = load_data()
    chat_id = data.get("chat_id")
    if not chat_id:
        return

    text = (
        f"📅 *Haftalik Hisobot — {datetime.now().strftime('%d.%m.%Y')}*\n\n"
        + build_stats_message()
    )
    await app.bot.send_message(chat_id=chat_id, text=text, parse_mode="MarkdownV2")
    log.info(f"Haftalik hisobot yuborildi → chat_id={chat_id}")


# ── Main ─────────────────────────────────────────────────────────────────────
def main():
    app = Application.builder().token(BOT_TOKEN).build()

    # Handlerlar
    app.add_handler(CommandHandler("start",   cmd_start))
    app.add_handler(CommandHandler("stats",   cmd_stats))
    app.add_handler(CommandHandler("checkin", cmd_checkin))
    app.add_handler(CallbackQueryHandler(on_button))

    # Scheduler
    scheduler = AsyncIOScheduler(timezone="Asia/Tashkent")

    # Har kuni soat 20:00 — kirish tekshiruvi
    scheduler.add_job(
        daily_reminder_job,
        trigger="cron",
        hour=20, minute=0,
        args=[app],
        id="daily_reminder",
    )

    # Har yakshanba soat 20:00 — haftalik hisobot
    scheduler.add_job(
        weekly_report_job,
        trigger="cron",
        day_of_week="sun",
        hour=20, minute=0,
        args=[app],
        id="weekly_report",
    )

    scheduler.start()
    log.info("✅ Bot ishga tushdi — Ctrl+C bilan to'xtat")
    app.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()
