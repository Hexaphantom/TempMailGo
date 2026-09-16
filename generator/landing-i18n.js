'use strict';
/* Localized keyword data for the service landing pages.
 *
 * Requirement: every translated language version must use the CORRECT localized
 * keyword for "temp mail / temporary email" in its <title> and meta description
 * — an idiomatic term, not a literal word-for-word translation of the English.
 *
 * For each language:
 *   kw    = the localized keyword phrase (idiomatic).
 *   conn  = the connector meaning "for" (used to join keyword + service brand).
 *   order = 'pre'  -> "{keyword} {conn} {Service}"   (prepositional languages)
 *           'post' -> "{Service} {conn} {keyword}"   (SOV / postpositional langs)
 *   desc  = (service) => localized meta description containing the keyword.
 *
 * Service brand names (ChatGPT, Netflix, ...) are global and stay unchanged.
 */

// Title-case only the first letter of a phrase (keeps non-Latin scripts intact).
function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

const L = {
  en:   { kw: 'temp mail',            conn: 'for',    order: 'pre',  desc: s => `Use a free temp mail address for ${s}. Keep marketing spam out of your real inbox and protect your identity when signing up for ${s}. No registration, instant disposable inbox.` },
  ar:   { kw: 'بريد مؤقت',            conn: 'لـ',     order: 'pre',  desc: s => `استخدم عنوان بريد مؤقت مجاني عند التسجيل في ${s}. أبعد رسائل الدعاية عن بريدك الحقيقي واحمِ خصوصيتك مع ${s}. بدون تسجيل وبريد فوري يستقبل رموز التحقق.` },
  es:   { kw: 'correo temporal',      conn: 'para',   order: 'pre',  desc: s => `Usa un correo temporal gratis para ${s}. Evita el spam de marketing en tu bandeja real y protege tu identidad al registrarte en ${s}. Sin registro, bandeja desechable instantánea.` },
  fr:   { kw: 'e-mail temporaire',    conn: 'pour',   order: 'pre',  desc: s => `Utilisez un e-mail temporaire gratuit pour ${s}. Gardez le spam marketing hors de votre boîte principale et protégez votre identité en vous inscrivant à ${s}. Sans inscription, boîte jetable instantanée.` },
  pt:   { kw: 'e-mail temporário',    conn: 'para',   order: 'pre',  desc: s => `Use um e-mail temporário grátis para ${s}. Mantenha o spam de marketing longe da sua caixa real e proteja sua identidade ao se cadastrar no ${s}. Sem registro, caixa descartável instantânea.` },
  hi:   { kw: 'अस्थायी ईमेल',          conn: 'के लिए', order: 'post', desc: s => `${s} के लिए मुफ़्त अस्थायी ईमेल पते का उपयोग करें। अपने असली इनबॉक्स को मार्केटिंग स्पैम से बचाएं और ${s} पर साइन अप करते समय अपनी पहचान सुरक्षित रखें। बिना पंजीकरण, तुरंत डिस्पोज़ेबल इनबॉक्स।` },
  ur:   { kw: 'عارضی ای میل',          conn: 'کے لیے', order: 'post', desc: s => `${s} کے لیے مفت عارضی ای میل پتہ استعمال کریں۔ اپنے اصل ان باکس کو مارکیٹنگ اسپام سے بچائیں اور ${s} پر سائن اپ کرتے وقت اپنی شناخت محفوظ رکھیں۔ بغیر رجسٹریشن، فوری ڈسپوزایبل ان باکس۔` },
  id:   { kw: 'email sementara',      conn: 'untuk',  order: 'pre',  desc: s => `Gunakan email sementara gratis untuk ${s}. Jauhkan spam pemasaran dari kotak masuk asli Anda dan lindungi identitas saat mendaftar ${s}. Tanpa registrasi, kotak masuk sekali pakai instan.` },
  de:   { kw: 'Wegwerf-E-Mail',       conn: 'für',    order: 'pre',  desc: s => `Nutze eine kostenlose Wegwerf-E-Mail für ${s}. Halte Marketing-Spam aus deinem echten Postfach und schütze deine Identität bei der Anmeldung bei ${s}. Ohne Registrierung, sofortiges Wegwerf-Postfach.` },
  ru:   { kw: 'временная почта',       conn: 'для',    order: 'pre',  desc: s => `Используйте бесплатную временную почту для ${s}. Держите рекламный спам подальше от основного ящика и защитите свою личность при регистрации в ${s}. Без регистрации, одноразовый ящик мгновенно.` },
  tr:   { kw: 'geçici mail',          conn: 'için',   order: 'post', desc: s => `${s} için ücretsiz geçici mail adresi kullanın. Pazarlama spam’ini gerçek gelen kutunuzdan uzak tutun ve ${s} kaydında kimliğinizi koruyun. Kayıt yok, anında tek kullanımlık kutu.` },
  vi:   { kw: 'email tạm thời',        conn: 'cho',    order: 'pre',  desc: s => `Dùng email tạm thời miễn phí cho ${s}. Giữ thư rác quảng cáo ra khỏi hộp thư thật và bảo vệ danh tính khi đăng ký ${s}. Không cần đăng ký, hộp thư dùng một lần tức thì.` },
  bn:   { kw: 'অস্থায়ী ইমেইল',         conn: 'জন্য',   order: 'post', desc: s => `${s}-এর জন্য একটি ফ্রি অস্থায়ী ইমেইল ঠিকানা ব্যবহার করুন। আপনার আসল ইনবক্সকে মার্কেটিং স্প্যাম থেকে দূরে রাখুন এবং ${s}-এ সাইন আপ করার সময় পরিচয় রক্ষা করুন। রেজিস্ট্রেশন ছাড়াই তাৎক্ষণিক ডিসপোজেবল ইনবক্স।` },
  sw:   { kw: 'barua pepe ya muda',   conn: 'kwa',    order: 'pre',  desc: s => `Tumia barua pepe ya muda bila malipo kwa ${s}. Ziba taka za matangazo zisiingie kikasha chako halisi na ulinde utambulisho wako unapojisajili ${s}. Bila usajili, kikasha cha muda papo hapo.` },
  it:   { kw: 'email temporanea',     conn: 'per',    order: 'pre',  desc: s => `Usa una email temporanea gratuita per ${s}. Tieni lo spam di marketing fuori dalla tua casella reale e proteggi la tua identità iscrivendoti a ${s}. Senza registrazione, casella usa e getta istantanea.` },
  nl:   { kw: 'tijdelijke e-mail',    conn: 'voor',   order: 'pre',  desc: s => `Gebruik een gratis tijdelijke e-mail voor ${s}. Houd marketingspam uit je echte inbox en bescherm je identiteit bij het aanmelden voor ${s}. Zonder registratie, direct wegwerp-inbox.` },
  pl:   { kw: 'tymczasowy e-mail',    conn: 'do',     order: 'pre',  desc: s => `Użyj darmowego tymczasowego e-maila do ${s}. Trzymaj spam marketingowy z dala od prawdziwej skrzynki i chroń tożsamość przy rejestracji w ${s}. Bez rejestracji, natychmiastowa jednorazowa skrzynka.` },
  uk:   { kw: 'тимчасова пошта',       conn: 'для',    order: 'pre',  desc: s => `Використовуйте безкоштовну тимчасову пошту для ${s}. Тримайте рекламний спам подалі від справжньої скриньки та захистіть особу під час реєстрації в ${s}. Без реєстрації, одноразова скринька миттєво.` },
  th:   { kw: 'อีเมลชั่วคราว',          conn: 'สำหรับ', order: 'pre',  desc: s => `ใช้อีเมลชั่วคราวฟรีสำหรับ ${s} กันสแปมโฆษณาออกจากกล่องจดหมายจริงของคุณ และปกป้องตัวตนเมื่อสมัคร ${s} ไม่ต้องลงทะเบียน กล่องจดหมายใช้แล้วทิ้งทันที` },
  tl:   { kw: 'pansamantalang email', conn: 'para sa',order: 'pre',  desc: s => `Gumamit ng libreng pansamantalang email para sa ${s}. Ilayo ang marketing spam sa totoong inbox mo at protektahan ang iyong pagkakakilanlan kapag nag-sign up sa ${s}. Walang rehistro, instant na disposable inbox.` },
  ko:   { kw: '임시 이메일',            conn: '용',     order: 'post', desc: s => `${s}용 무료 임시 이메일 주소를 사용하세요. 마케팅 스팸을 실제 받은편지함에서 차단하고 ${s} 가입 시 신원을 보호하세요. 가입 없이 즉시 일회용 받은편지함을 제공합니다.` },
  ja:   { kw: '使い捨てメール',          conn: '用',     order: 'post', desc: s => `${s}用の無料の使い捨てメールアドレスを利用しましょう。宣伝スパムを本物の受信箱から遠ざけ、${s}への登録時に身元を守れます。登録不要、すぐに使える一時的な受信箱。` },
  'zh-CN': { kw: '临时邮箱',            conn: '用于',   order: 'pre',  desc: s => `使用免费临时邮箱注册 ${s}。让营销垃圾邮件远离你的真实收件箱，并在注册 ${s} 时保护你的身份。无需注册，即时一次性收件箱。` },
  fa:   { kw: 'ایمیل موقت',            conn: 'برای',   order: 'pre',  desc: s => `از یک ایمیل موقت رایگان برای ${s} استفاده کنید. اسپم تبلیغاتی را از صندوق واقعی خود دور نگه دارید و هنگام ثبت‌نام در ${s} از هویت خود محافظت کنید. بدون ثبت‌نام، صندوق یکبارمصرف فوری.` },
  ha:   { kw: 'imel na wucin gadi',   conn: 'don',    order: 'pre',  desc: s => `Yi amfani da adireshin imel na wucin gadi kyauta don ${s}. Ka kiyaye tallace-tallacen banza daga ainihin akwatinka kuma ka kare sirrinka lokacin shiga ${s}. Ba rijista, akwatin amfani-sau-daya nan take.` },
  ro:   { kw: 'e-mail temporar',      conn: 'pentru', order: 'pre',  desc: s => `Folosește un e-mail temporar gratuit pentru ${s}. Ține spamul de marketing departe de inboxul real și protejează-ți identitatea când te înscrii pe ${s}. Fără înregistrare, inbox de unică folosință instant.` },
  el:   { kw: 'προσωρινό email',       conn: 'για',    order: 'pre',  desc: s => `Χρησιμοποιήστε ένα δωρεάν προσωρινό email για ${s}. Κρατήστε τα διαφημιστικά spam μακριά από τα πραγματικά σας εισερχόμενα και προστατέψτε την ταυτότητά σας κατά την εγγραφή στο ${s}. Χωρίς εγγραφή, άμεσα αναλώσιμα εισερχόμενα.` },
  he:   { kw: 'אימייל זמני',           conn: 'עבור',   order: 'pre',  desc: s => `השתמשו באימייל זמני חינמי עבור ${s}. הרחיקו ספאם שיווקי מתיבת הדואר האמיתית והגנו על הזהות שלכם בהרשמה ל-${s}. ללא הרשמה, תיבת דואר חד-פעמית מיידית.` },
  ms:   { kw: 'e-mel sementara',      conn: 'untuk',  order: 'pre',  desc: s => `Gunakan e-mel sementara percuma untuk ${s}. Jauhkan spam pemasaran daripada peti masuk sebenar anda dan lindungi identiti semasa mendaftar ${s}. Tanpa pendaftaran, peti masuk pakai buang serta-merta.` },
  pa:   { kw: 'ਆਰਜ਼ੀ ਈਮੇਲ',            conn: 'ਲਈ',    order: 'post', desc: s => `${s} ਲਈ ਮੁਫ਼ਤ ਆਰਜ਼ੀ ਈਮੇਲ ਪਤਾ ਵਰਤੋ। ਆਪਣੇ ਅਸਲੀ ਇਨਬਾਕਸ ਨੂੰ ਮਾਰਕੀਟਿੰਗ ਸਪੈਮ ਤੋਂ ਬਚਾਓ ਅਤੇ ${s} ’ਤੇ ਸਾਈਨ ਅੱਪ ਕਰਦੇ ਸਮੇਂ ਆਪਣੀ ਪਛਾਣ ਸੁਰੱਖਿਅਤ ਰੱਖੋ। ਬਿਨਾਂ ਰਜਿਸਟ੍ਰੇਸ਼ਨ, ਤੁਰੰਤ ਡਿਸਪੋਜ਼ੇਬਲ ਇਨਬਾਕਸ।` },
  ne:   { kw: 'अस्थायी इमेल',          conn: 'का लागि', order: 'post', desc: s => `${s} का लागि निःशुल्क अस्थायी इमेल ठेगाना प्रयोग गर्नुहोस्। आफ्नो वास्तविक इनबक्सलाई मार्केटिङ स्प्यामबाट टाढा राख्नुहोस् र ${s} मा साइन अप गर्दा आफ्नो पहिचान सुरक्षित राख्नुहोस्। दर्ता बिना, तुरुन्तै डिस्पोजेबल इनबक्स।` },
};

// Build a localized <title> for a service landing page.
function landingTitle(lang, service, brand) {
  const d = L[lang] || L.en;
  const phrase = d.order === 'post'
    ? `${service} ${d.conn} ${d.kw}`
    : `${cap(d.kw)} ${d.conn} ${service}`;
  return `${phrase} — ${brand}`;
}

// Build a localized meta description for a service landing page.
function landingDesc(lang, service) {
  const d = L[lang] || L.en;
  return d.desc(service);
}

// Localized keyword phrase alone (for the keywords meta tag).
function landingKw(lang) { return (L[lang] || L.en).kw; }

module.exports = { landingTitle, landingDesc, landingKw, LANDING_L10N: L };
