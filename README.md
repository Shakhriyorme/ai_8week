# AI/ML Engineer — 8-Week Mission Tracker

Shahriyor uchun shaxsiy o'quv platformasi. 8 hafta ichida AI/ML muhandisi bo'lish yo'l xaritasi, progress tracker va Telegram bot.

## Loyiha tuzilmasi

```
files/
├── index.html          # Asosiy 8-haftalik yo'l xaritasi sahifasi
├── dashboard.html      # Progress dashboard (Supabase + Chart.js)
├── telegram_bot.py     # Telegram eslatma boti
├── bot_data.json       # Bot ma'lumotlari (chat_id, loglar)
└── js/
    ├── app.js          # Asosiy ilovaning mantiqiy qismi
    ├── db-bootstrap.js # Ma'lumotlar bazasini ishga tushirish
    ├── openai.js       # OpenAI integratsiyasi
    └── supabase-client.js  # Supabase ulanishi
```

## Xususiyatlar

- **8-haftalik yo'l xaritasi** — har hafta uchun vazifalar, maqsadlar va resurslar
- **Progress Dashboard** — Supabase orqali real-time statistika va grafiklar
- **Telegram Bot** — kunlik eslatmalar va haftalik hisobotlar

## Telegram Bot

Bot quyidagi funksiyalarni bajaradi:

| Buyruq | Tavsif |
|--------|--------|
| `/start` | Botni ishga tushirish va menyuni ko'rsatish |
| `/stats` | So'nggi 14 kunlik statistika |

**Avtomatik eslatmalar:**
- Har kuni **20:00** da — 1 kundan ortiq kirmagan bo'lsa eslatma
- Har **yakshanba** — haftalik yig'indi hisobot

## O'rnatish

### 1. Kerakli kutubxonalarni o'rnatish

```bash
pip install python-telegram-bot==20.7 apscheduler supabase python-dotenv
```

### 2. Bot tokenini sozlash

`telegram_bot.py` faylida `BOT_TOKEN` o'zgaruvchisini yangilang:

```python
BOT_TOKEN = "your-telegram-bot-token"
```

### 3. Botni ishga tushirish

```bash
python telegram_bot.py
```

### 4. Dashboard

`dashboard.html` faylini brauzerda oching yoki Supabase konfiguratsiyasini `js/supabase-client.js` da sozlang.

## Texnologiyalar

- **Frontend:** HTML, CSS, JavaScript (vanilla)
- **Backend:** Python, python-telegram-bot
- **Ma'lumotlar bazasi:** Supabase
- **Jadvallashtirish:** APScheduler
- **Grafiklar:** Chart.js

## Maqsad

8 hafta ichida quyidagi sohalarni o'zlashtirish:

1. Python va ML asoslari
2. Deep Learning (PyTorch)
3. Kompyuter ko'rishi (CV)
4. NLP va LLM
5. MLOps va deployment
6. Loyiha va portfolio
