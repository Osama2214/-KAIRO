# AnimeVerse — دليل تسليم الموقع للعميل

الهدف: نقل كل خدمة يعتمد عليها الموقع من حسابك إلى حساب العميل، بحيث لا يتبقى شيء مرتبط بك، مع بقائك (اختياريًا) كـ collaborator للصيانة.

**تاريخ الجرد:** 12 سبتمبر 2026

---

## ١. جرد ما يملكه الموقع حاليًا

| الخدمة | ما تحتويه فعليًا اليوم | الحساب |
|---|---|---|
| **Neon** (PostgreSQL) | 10 جداول: الكتالوج 348 صنف، الأوردرات، المستخدمين، الكوبونات، إيميلات الأدمن | حسابك |
| **Cloudflare R2** | باكت `animeverse-media` — **348 ملف، 145 ميجا** (كل أغلفة المجلدات والبوكسات والبانرات) | حسابك |
| **Vercel** | استضافة الموقع + متغيرات البيئة | حسابك |
| **Google Cloud** | OAuth Client لتسجيل الدخول بجوجل (`Web client 1`, project `KAIRO`) | حسابك |
| **Gmail** | إيميل إرسال رسائل التحقق (App Password) | إيميلك |
| **الدومين** | `kairo-rosy-five.vercel.app` (دومين Vercel مؤقت) | حسابك |

> ⚠️ **الأهم:** كل روابط الصور المخزّنة في قاعدة البيانات تشير إلى `https://pub-9d11dc79523e4a88b1d3574a8381c50a.r2.dev` — أي الباكت الموجود في حسابك أنت. لو سلّمت الموقع دون نقل R2، فإن أي إغلاق أو حذف لحسابك يُفرغ الموقع من كل صوره.

---

## ٢. متغيرات البيئة المطلوبة

كل متغير من هذه يجب أن تكون له قيمة جديدة من حسابات العميل:

| المتغير | الخدمة | ملاحظة |
|---|---|---|
| `DATABASE_URL` | Neon | connection string الجديد |
| `R2_ACCOUNT_ID` | Cloudflare | من لوحة R2 |
| `R2_ACCESS_KEY_ID` | Cloudflare | API token جديد |
| `R2_SECRET_ACCESS_KEY` | Cloudflare | API token جديد |
| `R2_BUCKET` | Cloudflare | اسم الباكت الجديد |
| `R2_PUBLIC_URL` | Cloudflare | رابط الـ public bucket أو الدومين المخصص |
| `R2_PUBLIC_HOSTNAME` | Cloudflare | نفس الدومين بدون البروتوكول (لإعداد الصور في Next) |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Google Cloud | Client ID الجديد |
| `GOOGLE_CLIENT_SECRET` | Google Cloud | Client Secret الجديد |
| `NEXT_PUBLIC_APP_URL` | — | الدومين النهائي بدون `/` في آخره |
| `ADMIN_PIN` | — | **ولّد رقمًا جديدًا عند التسليم** |
| `ADMIN_SESSION_SECRET` | — | **ولّد سلسلة عشوائية جديدة** |
| `PATRON_SESSION_SECRET` | — | **ولّد سلسلة عشوائية جديدة** |
| `ADMIN_EMAIL` / `ADMIN_EMAILS` | — | إيميلات العميل بدل إيميلك |
| `GMAIL_USER` / `GMAIL_APP_PASSWORD` | Gmail | إيميل المتجر الرسمي |

بدائل الإيميل المدعومة في الكود إن لم يستخدم Gmail: `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM`، أو `RESEND_API_KEY` / `RESEND_FROM`.

لتوليد السِكرِتس:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## ٣. الترتيب الصحيح للتنفيذ

النقل له ترتيب مُلزِم: **R2 قبل قاعدة البيانات، وقاعدة البيانات قبل Vercel**، لأن روابط الصور مخزّنة داخل الداتا.

### الخطوة ٠ — العميل ينشئ الحسابات

يسجّل العميل بنفسه (بإيميله) في:

- Cloudflare — <https://dash.cloudflare.com/sign-up>
- Neon — <https://console.neon.tech/signup>
- Vercel — <https://vercel.com/signup>
- Google Cloud — <https://console.cloud.google.com/>

ثم يضيفك في كل منها كعضو/مطوّر حتى تستطيع التنفيذ:

- Cloudflare: **Manage Account → Members → Invite**
- Neon: **Organization → Members → Invite**
- Vercel: **Team Settings → Members → Invite**
- Google Cloud: **IAM & Admin → Grant access** (دور Editor)

---

### الخطوة ١ — نقل ملفات R2 (348 ملف / 145 ميجا)

1. العميل ينشئ باكت جديد في **R2 → Create bucket** (مثلاً `animeverse-media`)
2. من **Settings → Public access** يفعّل `r2.dev` أو يربط دومينًا مخصصًا مثل `media.example.com` (الأفضل — يبقى الرابط ملكه للأبد)
3. ينشئ **API Token** من R2 → *Manage R2 API Tokens* بصلاحية **Object Read & Write**، ويعطيك: Account ID + Access Key + Secret
4. انسخ الملفات من الباكت القديم للجديد باستخدام `rclone`:

```bash
rclone config create old s3 provider=Cloudflare access_key_id=OLD_KEY secret_access_key=OLD_SECRET endpoint=https://OLD_ACCOUNT.r2.cloudflarestorage.com
rclone config create new s3 provider=Cloudflare access_key_id=NEW_KEY secret_access_key=NEW_SECRET endpoint=https://NEW_ACCOUNT.r2.cloudflarestorage.com
rclone copy old:animeverse-media new:animeverse-media --progress --transfers 16
rclone check old:animeverse-media new:animeverse-media
```

5. تأكد أن العدد صار 348 ملف في الباكت الجديد، وأن أي رابط منها يفتح في المتصفح

> إن أردت، أستطيع كتابة سكريبت Node بديل عن `rclone` يقرأ من الباكت القديم ويكتب في الجديد بالـ SDK الموجود في المشروع.

---

### الخطوة ٢ — تحديث روابط الصور داخل قاعدة البيانات

كل رابط صورة في `kairo_storefront_data` و`kairo_catalog_items` يبدأ بالـ base القديم. بعد نسخ الملفات لا بد من استبدال الـ base:

```sql
-- استبدل NEW_BASE بالرابط الجديد (بدون / في آخره)
UPDATE kairo_storefront_data
SET payload = REPLACE(
  payload::text,
  'https://pub-9d11dc79523e4a88b1d3574a8381c50a.r2.dev',
  'NEW_BASE'
)::jsonb
WHERE id = 1;

UPDATE kairo_catalog_items
SET payload = REPLACE(
  payload::text,
  'https://pub-9d11dc79523e4a88b1d3574a8381c50a.r2.dev',
  'NEW_BASE'
)::jsonb;
```

ثم تحقّق ألا يتبقى أي رابط قديم:

```sql
SELECT COUNT(*) FROM kairo_catalog_items
WHERE payload::text LIKE '%pub-9d11dc79523e4a88b1d3574a8381c50a%';
-- يجب أن يكون الناتج 0
```

> نفّذ هذا **بعد** نسخ الملفات مباشرةً وقبل نقل قاعدة البيانات، أو بعد النقل على النسخة الجديدة — المهم ألا يبقى الموقع مشيرًا إلى باكت لن يظل موجودًا.

---

### الخطوة ٣ — نقل قاعدة البيانات (Neon)

**الطريق الأول (الأسهل): نقل المشروع كما هو**

Neon يدعم نقل المشروع بين الحسابات:
**Project → Settings → Transfer project** ثم اختيار organization العميل.
المرجع: <https://neon.com/docs/manage/projects#transfer-project-to-organization>

**الطريق الثاني: نسخ الداتا لمشروع جديد**

```bash
# تصدير من القديم
pg_dump "OLD_DATABASE_URL" -Fc -f kairo.dump

# استيراد في الجديد
pg_restore -d "NEW_DATABASE_URL" --no-owner --no-privileges kairo.dump
```

بعدها تحقّق من الأعداد:

```sql
SELECT 'catalog' t, COUNT(*) FROM kairo_catalog_items
UNION ALL SELECT 'orders', COUNT(*) FROM kairo_orders
UNION ALL SELECT 'users', COUNT(*) FROM kairo_users
UNION ALL SELECT 'admin_emails', COUNT(*) FROM kairo_admin_emails;
```

الأعداد المتوقعة وقت كتابة هذا الملف: catalog **348**، orders **1**، users **1**، admin_emails **2**.

---

### الخطوة ٤ — Google OAuth على حساب العميل

لا يوجد نقل مباشر لـ OAuth client، فالأسلم إنشاء واحد جديد:

1. العميل يفتح <https://console.cloud.google.com/> ويُنشئ **New Project** باسم المتجر
2. **APIs & Services → OAuth consent screen**: يملأ اسم التطبيق، إيميل الدعم، اللوجو، ورابطي **Privacy Policy** و**Terms** (موجودان في الموقع)
3. **Credentials → Create credentials → OAuth client ID → Web application**
4. في **Authorized JavaScript origins** يضيف (كل واحد بدون `/` في آخره):
   - `https://الدومين-النهائي`
   - `http://localhost:3000` — للتطوير فقط، ويُحذف عند الإطلاق النهائي إن أردت
5. **Publish app** من صفحة Audience — بدونه لن يستطيع أحد غير الـ Test users تسجيل الدخول
6. ضع `NEXT_PUBLIC_GOOGLE_CLIENT_ID` و`GOOGLE_CLIENT_SECRET` الجديدين في Vercel

> شاشة الموافقة ستحمل اسم مالك المشروع، لذا **لا تنشر التطبيق من حسابك أنت** — سيرى زبائن العميل اسمك.

مرجع الخطأ `origin_mismatch`: <https://developers.google.com/identity/oauth2/web/guides/error>

---

### الخطوة ٥ — نقل مشروع Vercel

1. من **Project → Settings → General → Transfer Project** اختر حساب/تيم العميل
   المرجع: <https://vercel.com/docs/projects/transferring-a-project>
2. بعد النقل، أعد ضبط **Environment Variables** كلها بالقيم الجديدة (القائمة في القسم ٢)
3. اربط الدومين من **Settings → Domains**
4. اعمل **Redeploy** حتى تُقرأ المتغيرات الجديدة

> بديل: إن رفض العميل النقل، يستطيع عمل import للمستودع من GitHub في حسابه مباشرة، بشرط أن يكون المستودع ملكه أيضًا أو أن يُمنح صلاحية عليه.

---

### الخطوة ٦ — الدومين

- إن كان العميل سيشتري دومينًا: يشتريه بنفسه ويضيفه في Vercel ثم يضبط DNS
- إن كنت اشتريته أنت: انقل الملكية عبر **Transfer domain** عند المسجّل (يستغرق 5–7 أيام في `.com`) أو غيّر بيانات المالك (registrant)
- بعد تثبيت الدومين: حدّث `NEXT_PUBLIC_APP_URL` وأضف الدومين في Google OAuth origins

---

### الخطوة ٧ — الإيميل

الموقع يرسل رسائل تحقق OTP. الحالي يستخدم Gmail App Password بإيميلك.

- العميل يفعّل **2-Step Verification** على إيميل المتجر ثم ينشئ App Password من <https://myaccount.google.com/apppasswords>
- ضع القيم في `GMAIL_USER` و`GMAIL_APP_PASSWORD`
- الأفضل للمتاجر الحقيقية: خدمة إرسال مخصصة مثل Resend (`RESEND_API_KEY` + `RESEND_FROM`) لتفادي حدود Gmail

---

### الخطوة ٨ — الأمان عند التسليم

- [ ] ولّد `ADMIN_PIN` جديد وسلّمه للعميل بقناة آمنة
- [ ] ولّد `ADMIN_SESSION_SECRET` و`PATRON_SESSION_SECRET` جديدين
- [ ] حدّث `kairo_admin_emails` لتحتوي إيميلات العميل واحذف إيميلك عند انتهاء المهمة
- [ ] احذف ملف `.env.local` من جهازك أو أفرغه من قيم العميل
- [ ] ألغِ (revoke) مفاتيح R2 القديمة وسِكرِت OAuth القديم بعد التأكد أن الموقع يعمل
- [ ] احذف الباكت القديم وقاعدة البيانات القديمة **بعد أسبوع** من التشغيل السليم، لا قبله

---

## ٤. قائمة تحقق نهائية قبل التسليم

- [ ] الصفحة الرئيسية تفتح والصور كلها ظاهرة
- [ ] صفحة `/manga` تعرض 348 صنفًا والأغلفة تحمّل من الباكت الجديد
- [ ] صفحات السلاسل الثمانية تفتح والبانرات ظاهرة
- [ ] تسجيل الدخول بجوجل يعمل بحساب ليس ضمن Test users
- [ ] تسجيل الدخول بالإيميل يصل فيه كود التحقق فعليًا
- [ ] لوحة الأدمن تفتح بالـ PIN الجديد
- [ ] إضافة كتاب تجريبي ورفع صورة له ينجح (يثبت أن R2 يكتب بشكل صحيح)
- [ ] طلب تجريبي يُنشأ ويظهر في Orders
- [ ] `Export Backup` من الإعدادات ينزّل ملفًا سليمًا
- [ ] لا يوجد أي رابط في قاعدة البيانات يشير إلى `pub-9d11dc79…r2.dev`

---

## ٥. ما يبقى عندك بعد التسليم

- نسخة من المستودع (الكود) — إن كان الاتفاق يمنح العميل الملكية، انقل المستودع على GitHub له أيضًا
- لا شيء آخر: لا مفاتيح، ولا قواعد بيانات، ولا ملفات صور، ولا حسابات دفع
