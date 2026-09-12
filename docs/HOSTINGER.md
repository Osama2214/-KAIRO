# نقل الموقع بالكامل إلى Hostinger — الدراسة الفنية

سؤال: هل يمكن وضع كل شيء (الدومين + السيرفر + قاعدة البيانات + الصور) في مكان واحد على Hostinger؟
الجواب المختصر: **نعم، ممكن** — لكنه يتطلّب تعديلات في الكود، وليس مجرّد رفع ملفات.

**تاريخ التحرير:** 12 سبتمبر 2026

---

## ١. ما الذي يشغّل الموقع اليوم

| القطعة | المستخدم حاليًا | هل تنتقل لـ Hostinger؟ |
|---|---|---|
| الاستضافة | Vercel | ✅ نعم (Node.js hosting أو VPS) |
| قاعدة البيانات | Neon (PostgreSQL سحابي) | ✅ نعم، لكن **يتطلّب تعديل كود** |
| الصور | Cloudflare R2 (348 ملف / 145 ميجا) | ✅ نعم، مع تعديل بسيط |
| الإيميل | Gmail App Password | ✅ نعم (Hostinger يوفّر بريدًا وSMTP) |
| الدومين | دومين Vercel المؤقت | ✅ نعم |

الموقع مبني على **Next.js 16** بـ App Router: فيه Server Components، و API routes، وتحسين صور، وكاش على مستوى السيرفر (`unstable_cache` و `revalidateTag`). لذلك **لا يمكن** تحويله إلى موقع HTML ثابت يُرفع على استضافة عادية — لا بد من عملية Node.js تعمل باستمرار.

---

## ٢. خيارا Hostinger

Hostinger يدعم Node.js بطريقتين ([المصدر](https://www.hostinger.com/support/node-js-hosting-options-at-hostinger/)):

### أ) Managed Node.js / Web Apps — متاح على خطط **Business** و**Cloud**

- الرفع من GitHub مباشرة أو برفع ملف مضغوط
- Hostinger يتعرّف على Next.js تلقائيًا
- إصدارات Node المدعومة: 18 / 20 / 22 / 24 — المشروع يحتاج **20 أو أعلى**
- لا تدير السيرفر ولا الـ Nginx ولا SSL

**العيب الحاسم:** الخطط المشتركة في Hostinger تعطي **MySQL** وليس **PostgreSQL**. والموقع مبني بالكامل على PostgreSQL (أعمدة `JSONB`، واستعلامات `jsonb_to_recordset`، و`ON CONFLICT`). التحويل إلى MySQL ليس تبديل سطر — بل إعادة كتابة طبقة البيانات كلها.

### ب) VPS — الخيار العملي لو أردت كل شيء عندك

- root كامل: تثبّت Node + **PostgreSQL** + Nginx + PM2
- قاعدة البيانات نفس النوع الحالي → **تعديل كود أقل بكثير**
- الصور تُخزَّن على قرص السيرفر مباشرة
- المقابل: أنت مسؤول عن التحديثات والنسخ الاحتياطي والأمان والمراقبة

**التوصية:** إن كان الهدف "كل شيء في مكان واحد وتحت يد العميل" فالمسار هو **VPS**، أو **Business/Cloud + إبقاء قاعدة البيانات على Neon** (مجاني في الخطة الأساسية ولا يحتاج أي تعديل كود).

---

## ٣. التعديلات البرمجية المطلوبة

### ٣.١ قاعدة البيانات: من Neon إلى PostgreSQL عادي

**10 ملفات** تستورد `@neondatabase/serverless`:

```
src/config/adminConfig.ts      src/lib/mediaStore.ts
src/lib/adminSecurityStore.ts  src/lib/orderStore.ts
src/lib/couponEngine.ts        src/lib/otpStore.ts
src/lib/couponStore.ts         src/lib/rateLimit.ts
src/lib/storefrontDataStore.ts src/lib/userStore.ts
```

مكتبة Neon تتحدّث عبر HTTP، وPostgreSQL العادي يحتاج اتصال TCP بمكتبة `pg`. الفرق في الاستدعاء:

```ts
// الحالي (Neon)
import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL);
const rows = await sql`SELECT * FROM kairo_orders WHERE id = ${id}`;

// البديل (PostgreSQL على VPS)
import postgres from "postgres";           // npm i postgres
const sql = postgres(process.env.DATABASE_URL, { max: 10 });
const rows = await sql`SELECT * FROM kairo_orders WHERE id = ${id}`;
```

**الخبر الجيد:** مكتبة `postgres` (porsager) تستخدم نفس أسلوب الـ tagged template، فالاستعلامات نفسها لا تتغيّر — التعديل غالبًا في سطر الاستيراد وسطر الإنشاء في كل ملف من العشرة. الجداول كلها PostgreSQL قياسية وتعمل كما هي.

> ⚠️ لو ذهبت لخطة مشتركة بـ MySQL: كل استعلام `JSONB` و`jsonb_to_recordset` و`ON CONFLICT` يحتاج إعادة كتابة، وبنية `kairo_storefront_data` نفسها تحتاج إعادة تصميم. هذا مشروع أيام لا ساعات — تجنّبه.

### ٣.٢ الصور: من R2 إلى تخزين محلي

ملف `src/lib/mediaStore.ts` يدعم اليوم مسارين: R2 إن كانت مفاتيحه موجودة، وإلا **يخزّن الصور داخل قاعدة البيانات** في جدول `kairo_media` ويقدّمها عبر `/api/media/[id]`.

لديك ثلاثة خيارات على Hostinger:

| الخيار | كيف | ملاحظة |
|---|---|---|
| **إبقاء R2** (الأسهل) | لا تعدّل شيئًا، فقط انقل الباكت لحساب العميل | CDN عالمي مجاني عمليًا، والصور لا تستهلك من قرص السيرفر |
| **قرص السيرفر** | عدّل `mediaStore` ليكتب في مجلد مثل `/var/www/media` ويقدّمه Nginx | الأسرع محليًا، لكنه يحتاج نسخًا احتياطيًا للمجلد، ولا CDN |
| **داخل قاعدة البيانات** | احذف متغيّرات `R2_*` فقط — الكود يتحوّل تلقائيًا | يعمل فورًا بلا تعديل، لكن 145 ميجا داخل الداتابيز تُبطّئ النسخ الاحتياطي والاستعلامات |

مهما اخترت: **لا تنسَ تحديث روابط الصور المخزّنة داخل قاعدة البيانات** (الاستعلامات جاهزة في `docs/HANDOVER.md` القسم ٢).

### ٣.٣ تحسين الصور (`next/image`)

المشروع يستخدم `sharp` لتحسين الصور أثناء التشغيل. على VPS يجب أن تكون مكتبة `sharp` مبنيّة لنظام السيرفر (Linux x64) — يكفي `npm install` على السيرفر نفسه لا نسخ `node_modules` من ويندوز.

وفي `next.config.ts` أضف مضيف الصور الجديد إلى `images.remotePatterns` إن غيّرت مصدر الصور.

### ٣.٤ الكاش والـ ISR

الموقع يستخدم `unstable_cache` و`revalidateTag`. هذه تعمل على أي سيرفر Node بشكل طبيعي (كاش في ذاكرة العملية). الفارق الوحيد: على Vercel الكاش موزّع، وعلى سيرفر واحد يُفقد عند كل إعادة تشغيل — وهو مقبول تمامًا لمتجر بهذا الحجم.

---

## ٤. خطوات التنفيذ على VPS

### الخطوة ١ — تجهيز السيرفر

```bash
# Ubuntu 24.04 على Hostinger VPS
sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs postgresql nginx git
sudo npm install -g pm2
```

### الخطوة ٢ — قاعدة البيانات

```bash
sudo -u postgres psql
CREATE DATABASE kairo;
CREATE USER kairo_app WITH ENCRYPTED PASSWORD 'كلمة-سر-قوية';
GRANT ALL PRIVILEGES ON DATABASE kairo TO kairo_app;
\q
```

نقل البيانات من Neon:

```bash
pg_dump "NEON_DATABASE_URL" -Fc -f kairo.dump
pg_restore -d "postgresql://kairo_app:PASS@localhost:5432/kairo" --no-owner --no-privileges kairo.dump
```

ثم تحقّق أن الكتالوج 348 صنفًا كما في `docs/HANDOVER.md`.

### الخطوة ٣ — رفع الكود وتشغيله

```bash
cd /var/www && git clone <repo> kairo && cd kairo
npm ci
# ضع ملف .env.production.local بكل المتغيّرات
npm run build
pm2 start npm --name kairo -- start
pm2 save && pm2 startup
```

### الخطوة ٤ — Nginx و SSL

```nginx
server {
  server_name example.com www.example.com;
  client_max_body_size 12M;          # رفع صور الأغلفة من لوحة الأدمن

  location /_next/static/ {
    proxy_pass http://127.0.0.1:3000;
    proxy_cache_valid 200 365d;
    add_header Cache-Control "public, max-age=31536000, immutable";
  }

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
  }
}
```

```bash
sudo certbot --nginx -d example.com -d www.example.com
```

> `client_max_body_size` مهم: الافتراضي في Nginx **1 ميجا**، ورفع غلاف بحجم 3–10 ميجا من لوحة الأدمن سيفشل بخطأ 413 بدونه.

### الخطوة ٥ — الدومين والإيميل

- اربط الدومين في hPanel، أو وجّه الـ A record إلى IP السيرفر
- أنشئ بريد المتجر من Hostinger Email، وضع في المتغيّرات:
  `SMTP_HOST=smtp.hostinger.com` · `SMTP_PORT=465` · `SMTP_USER` · `SMTP_PASS` · `SMTP_FROM`
  (الكود يدعمها بالفعل كبديل عن Gmail)
- أضف الدومين الجديد في **Google OAuth → Authorized JavaScript origins**

### الخطوة ٦ — النسخ الاحتياطي (لا تتخطّاه)

على Vercel وNeon وR2 كانت النسخ الاحتياطية مسؤولية المزوّد. على VPS هي مسؤوليتك:

```bash
# نسخة يومية للقاعدة
0 3 * * * pg_dump "postgresql://kairo_app:PASS@localhost/kairo" -Fc \
  -f /var/backups/kairo-$(date +\%F).dump && \
  find /var/backups -name 'kairo-*.dump' -mtime +14 -delete
```

وأضف نسخًا لمجلد الصور إن خزّنتها على القرص، وفعّل Snapshots من لوحة Hostinger.

---

## ٥. مقارنة الخيارات

| | Vercel + Neon + R2 (الحالي) | Hostinger VPS (كل شيء عندك) | Hostinger Business + Neon |
|---|---|---|---|
| تعديل الكود | لا شيء | 10 ملفات (طبقة الداتابيز) | لا شيء |
| التكلفة الشهرية | مجاني غالبًا في هذا الحجم | تكلفة VPS ثابتة | تكلفة الخطة |
| السرعة عالميًا | CDN موزّع | سيرفر واحد | متوسط |
| إدارة السيرفر | لا شيء | تحديثات وأمان ونسخ احتياطي | خفيفة |
| كل شيء في فاتورة واحدة | ❌ (3 حسابات) | ✅ | شبه ✅ |
| مخاطرة | منخفضة | متوسطة (أنت المسؤول) | منخفضة |

---

## ٦. رأيي في حالتك تحديدًا

المتجر اليوم: **348 صنفًا، طلب واحد، مستخدم واحد**. أي أن الحِمل ضئيل، وكل الخيارات تكفيه تقنيًا.

- **إن كان الدافع "أن يملك العميل كل شيء ويدفع فاتورة واحدة"** → VPS على Hostinger، مع احتساب يوم عمل للتعديلات والنقل.
- **إن كان الدافع "الاستقرار وأقل مجهود"** → أبقِ المعمارية الحالية وانقل الحسابات الثلاثة لاسم العميل (وهو ما يشرحه `docs/HANDOVER.md`). لا تعديل كود ولا صيانة سيرفر.
- **لا تختر الاستضافة المشتركة بـ MySQL** — الموقع يعتمد على PostgreSQL بشكل عميق، والتحويل مكلف بلا مقابل.

---

## روابط

- [Node.js hosting options at Hostinger](https://www.hostinger.com/support/node-js-hosting-options-at-hostinger/)
- [Next.js hosting at Hostinger](https://www.hostinger.com/web-apps-hosting/nextjs-hosting)
- [How to deploy a Node.js website in Hostinger](https://www.hostinger.com/support/how-to-deploy-a-nodejs-website-in-hostinger/)
- [Next.js self-hosting docs](https://nextjs.org/docs/app/getting-started/deploying#self-hosting)
