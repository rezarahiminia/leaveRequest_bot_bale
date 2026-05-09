# راهنمای سریع نصب و راه‌اندازی 🚀

## مرحله ۱: نصب Node.js
اگر Node.js ندارید، از سایت رسمی دانلود و نصب کنید:
https://nodejs.org/

بررسی نصب:
```bash
node --version
npm --version
```

## مرحله ۲: نصب MySQL
اگر MySQL ندارید، یکی از گزینه‌های زیر را نصب کنید:
- MySQL Server: https://dev.mysql.com/downloads/
- XAMPP: https://www.apachefriends.org/
- WAMP: https://www.wampserver.com/

## مرحله ۳: ساخت بات در بله

1. به بله بروید و [@BotFather](https://ble.ir/botfather) را باز کنید
2. دستور `/newbot` را ارسال کنید
3. نام بات را وارد کنید (مثال: Leave Manager Bot)
4. نام کاربری بات را وارد کنید (باید به bot ختم شود، مثال: leave_manager_bot)
5. توکن ارائه شده را کپی کنید

## مرحله ۴: راه‌اندازی پروژه

### الف) نصب وابستگی‌ها
```bash
npm install
```

### ب) تنظیم فایل محیطی
فایل `.env` را باز کرده و اطلاعات زیر را وارد کنید:
```env
BOT_TOKEN=توکن_بات_خود_را_اینجا_قرار_دهید
DB_PASSWORD=رمز_دیتابیس_خود
```

### ج) ایجاد دیتابیس

#### گزینه ۱: از طریق خط فرمان MySQL
```bash
mysql -u root -p < setup.sql
```

#### گزینه ۲: از طریق phpMyAdmin (XAMPP/WAMP)
1. به phpMyAdmin بروید (معمولاً http://localhost/phpmyadmin)
2. یک دیتابیس جدید به نام `bale_leave_bot` ایجاد کنید
3. دیتابیس را انتخاب کنید
4. به تب SQL بروید
5. محتویات فایل `setup.sql` را کپی و paste کنید
6. دکمه Go را بزنید

#### گزینه ۳: از طریق MySQL Workbench
1. MySQL Workbench را باز کنید
2. به دیتابیس متصل شوید
3. File > Open SQL Script > setup.sql را انتخاب کنید
4. دکمه Execute را بزنید

## مرحله ۵: اجرای بات

```bash
npm start
```

اگر همه چیز درست باشد، باید پیام‌های زیر را ببینید:
```
🤖 Starting Bale Leave Bot...
✅ Database connected successfully
✅ Bot authenticated: نام_بات_شما
🔄 Polling started...
```

## مرحله ۶: تست بات

1. به بله بروید
2. بات خود را جستجو کنید
3. دستور `/start` را ارسال کنید
4. از دستورات موجود استفاده کنید

## مشکلات رایج ❗

### خطای "Cannot find module"
```bash
npm install
```

### خطای اتصال به دیتابیس
- مطمئن شوید MySQL در حال اجرا است
- رمز عبور در `.env` را بررسی کنید
- در Windows: XAMPP یا WAMP را اجرا کنید

### خطای احراز هویت بات
- توکن بات را در `.env` بررسی کنید
- فاصله اضافی قبل یا بعد از توکن نداشته باشید

### خطای Permission در ساخت دیتابیس
از user با دسترسی کافی استفاده کنید یا:
```sql
GRANT ALL PRIVILEGES ON bale_leave_bot.* TO 'root'@'localhost';
FLUSH PRIVILEGES;
```

## نکات مهم 💡

1. **توکن بات را محرمانه نگه دارید**
2. **فایل `.env` را commit نکنید**
3. **قبل از اجرای اصلی، تست کنید**
4. **پشتیبان منظم از دیتابیس بگیرید**

## دستورات مفید 📝

```bash
# نصب وابستگی‌ها
npm install

# اجرای بات
npm start

# اجرای بات در حالت توسعه (با restart خودکار)
npm run dev

# بررسی نسخه Node.js
node --version

# بررسی نسخه npm
npm --version
```

## راه‌های ارتباطی 📞

اگر به مشکل خوردید:
1. فایل README.md را مطالعه کنید
2. از بخش عیب‌یابی استفاده کنید
3. مستندات بله را بررسی کنید: https://docs.bale.ai/

---

**موفق باشید! 🎉**
