# Bale Leave Bot — ربات ثبت مرخصی

ربات مدیریت مرخصی ساعتی و روزانه برای پیام‌رسان **بله (Bale)**.
تاریخ‌ها به تقویم شمسی نمایش داده می‌شوند.

---

## ساختار پروژه

```
LeaveBot/
├── app.js                   ← نقطه ورود — فقط startup و polling
├── src/
│   ├── config/
│   │   └── index.js         ← همه ثابت‌ها و متغیرهای محیطی
│   ├── db/
│   │   └── index.js         ← لایه دسترسی به پایگاه داده (فقط SQL اینجاست)
│   ├── sessions.js          ← نگهداری وضعیت مکالمه چندمرحله‌ای در حافظه
│   ├── handlers/
│   │   ├── router.js        ← مسیریاب — هیچ منطق کسب‌وکاری ندارد
│   │   ├── helpers.js       ← ابزارهای مشترک بین هندلرها
│   │   ├── start.js         ← /start  +  دریافت شماره تماس
│   │   ├── hourly.js        ← فلوی مرخصی ساعتی (۲ مرحله)
│   │   ├── daily.js         ← فلوی مرخصی روزانه (۲ مرحله)
│   │   ├── list.js          ← /list
│   │   ├── summary.js       ← /summary
│   │   └── cancel.js        ← /cancel
│   └── utils/
│       ├── bot.js           ← wrapper روی Bale HTTP API
│       ├── date.js          ← تبدیل تاریخ شمسی/میلادی
│       └── logger.js        ← لاگر ساده با سطح‌بندی
├── setup.sql                ← اسکریپت ساخت جداول پایگاه داده
├── .env                     ← متغیرهای محیطی (در git قرار نمی‌گیرد)
├── .env.example             ← نمونه env
└── package.json
```

---

## پیش‌نیازها

| ابزار    | نسخه پیشنهادی |
|---------|--------------|
| Node.js | >= 18        |
| MySQL   | 5.7 یا 8.x   |


---

## نصب

### ۱. نصب وابستگی‌ها

```bash
npm install
```

### ۲. ساخت پایگاه داده

```bash
C:\xampp\mysql\bin\mysql.exe -u root -e "CREATE DATABASE IF NOT EXISTS bale_leave_bot CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
C:\xampp\mysql\bin\mysql.exe -u root bale_leave_bot < setup.sql
```

### ۳. تنظیم فایل env

```bash
copy .env.example .env
```

سپس `.env` را ویرایش کنید:

```env
BOT_TOKEN=your_bale_bot_token_here

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=bale_leave_bot

# optional: debug | info | warn | error  (default: info)
LOG_LEVEL=info
```

### ۴. اجرای ربات

```bash
# production
node app.js

# development (hot-reload)
node --watch app.js
```

---

## دستورات ربات

| دستور      | عملکرد                                       |
|-----------|----------------------------------------------|
| `/start`  | شروع / منوی اصلی (اولین بار: دریافت شماره) |
| `/hourly` | ثبت مرخصی ساعتی — تاریخ امروز خودکار است    |
| `/daily`  | ثبت مرخصی روزانه — تاریخ شمسی + تعداد روز  |
| `/list`   | نمایش آخرین ۱۰ مرخصی                         |
| `/summary`| آمار کلی مرخصی‌ها                             |
| `/cancel` | لغو عملیات جاری                               |

---

## فلوی مرخصی ساعتی

```
کاربر  →  /hourly
ربات   →  ساعت شروع؟  (فرمت: HH:MM)
کاربر  →  09:30
ربات   →  چند ساعت؟
کاربر  →  2
ربات   →  ✅ ثبت شد!
           👤 نام: علی محمدی
           📅 تاریخ: 19 اردیبهشت 1405
           🕐 از: 09:30  تا: 11:30
           ⏱ مدت: 2 ساعت
           🆔 شناسه: 12
```

## فلوی مرخصی روزانه

```
کاربر  →  /daily
ربات   →  از چه تاریخی؟  (فرمت: 1405/02/20)
کاربر  →  1405/02/25
ربات   →  چند روز؟  (مثال: 1 یا 0.5)
کاربر  →  2
ربات   →  ✅ ثبت شد!
           👤 نام: علی محمدی
           📅 از تاریخ: 25 اردیبهشت 1405
           📆 تعداد روز: 2
           🆔 شناسه: 13
```

---

## متغیرهای محیطی

| متغیر         | اجباری | پیش‌فرض      | توضیح                          |
|--------------|--------|-------------|--------------------------------|
| `BOT_TOKEN`  | بله    | —           | توکن ربات از @BotFather        |
| `DB_HOST`    | خیر    | `localhost` | آدرس MySQL                     |
| `DB_PORT`    | خیر    | `3306`      | پورت MySQL                     |
| `DB_USER`    | خیر    | `root`      | نام کاربری MySQL               |
| `DB_PASSWORD`| خیر    | `""`        | رمز عبور MySQL                 |
| `DB_NAME`    | بله    | —           | نام پایگاه داده                |
| `LOG_LEVEL`  | خیر    | `info`      | سطح لاگ: debug/info/warn/error |

---

## عیب‌یابی

| پیام خطا                          | راه‌حل                                              |
|----------------------------------|----------------------------------------------------|
| `Missing required env variable`  | فایل `.env` را بررسی کنید                          |
| `Database connection failed`     | XAMPP MySQL را در حال اجرا بودن چک کنید           |
| `Bot authentication failed`      | `BOT_TOKEN` را بررسی کنید                          |
| `Unhandled error in handleMessage`| خطای handler را در لاگ‌ها دنبال کنید             |
