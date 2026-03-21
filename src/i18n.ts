// src/i18n.ts
import type { FeedKind } from './types.js';

export type SupportedLanguage = 'en' | 'tr' | 'de' | 'fr' | 'es' | 'uz';

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = ['en', 'tr', 'de', 'fr', 'es', 'uz'];

export interface LanguagePack {
  name: string;
  summarySystemPrompt: (kindLabel: string, sourceType: string) => string;
  kindLabels: Record<FeedKind, string>;
  labels: {
    whatHappened: string;
    whyItMatters: string;
    readMore: string;
    readArticle: string;
    startupMessage: string;
  };
}

const en: LanguagePack = {
  name: 'English',
  kindLabels: {
    official_blog: 'official blog post',
    media: 'news report',
    research: 'research paper',
    newsletter: 'technical newsletter',
  },
  labels: {
    whatHappened: 'What happened:',
    whyItMatters: 'Why it matters:',
    readMore: 'Read More',
    readArticle: 'Read Article',
    startupMessage: 'Newscrux started! AI news notifications active.',
  },
  summarySystemPrompt: (kindLabel, sourceType) => `You are a technology news analysis system.
You are given a ${kindLabel}. Analyze it and produce output in the following JSON format in English.

Required JSON format:
{
  "translated_title": "English headline (single line, concise)",
  "what_happened": "What happened — at least 2-3 sentences with details",
  "why_it_matters": "Why it matters — at least 1-2 sentences on practical impact",
  "key_detail": "One critical detail, number, or noteworthy fact",
  "source_type": "${sourceType}"
}

Rules:
- All text must be in English.
- what_happened must be at least 50 characters.
- why_it_matters must be at least 20 characters.
- Use standard English technical terminology.
- Return ONLY valid JSON, no other text.`,
};

const tr: LanguagePack = {
  name: 'Turkish',
  kindLabels: {
    official_blog: 'resmi blog/duyuru',
    media: 'medya haberi',
    research: 'araştırma makalesi',
    newsletter: 'teknik bülten',
  },
  labels: {
    whatHappened: 'Ne oldu:',
    whyItMatters: 'Neden önemli:',
    readMore: 'Devamını Oku',
    readArticle: 'Makaleyi Oku',
    startupMessage: 'Newscrux başlatıldı! AI haber bildirimleri aktif.',
  },
  summarySystemPrompt: (kindLabel, sourceType) => `Sen bir teknoloji haberleri analiz sistemisin.
Sana bir ${kindLabel} veriliyor. Analiz edip aşağıdaki JSON formatında Türkçe çıktı üret.

Zorunlu JSON formatı:
{
  "translated_title": "Haberin Türkçe başlığı (tek satır, kısa ve öz)",
  "what_happened": "Ne oldu — en az 2-3 cümle detaylı açıklama",
  "why_it_matters": "Neden önemli — en az 1-2 cümle, pratik etki ve sonuçlar",
  "key_detail": "Bir kritik detay, rakam veya dikkat çeken bilgi",
  "source_type": "${sourceType}"
}

Kurallar:
- Tüm metin Türkçe olmalı.
- what_happened en az 50 karakter olmalı.
- why_it_matters en az 20 karakter olmalı.
- Teknik terimlerin Türkçe karşılığı varsa kullan, yoksa orijinalini koru.
- SADECE geçerli JSON döndür, başka metin ekleme.`,
};

const de: LanguagePack = {
  name: 'German',
  kindLabels: {
    official_blog: 'offizieller Blogbeitrag',
    media: 'Nachrichtenbericht',
    research: 'Forschungsarbeit',
    newsletter: 'technischer Newsletter',
  },
  labels: {
    whatHappened: 'Was passiert ist:',
    whyItMatters: 'Warum es wichtig ist:',
    readMore: 'Weiterlesen',
    readArticle: 'Artikel lesen',
    startupMessage: 'Newscrux gestartet! KI-Nachrichtenbenachrichtigungen aktiv.',
  },
  summarySystemPrompt: (kindLabel, sourceType) => `Du bist ein Technologie-Nachrichtenanalysesystem.
Dir wird ein ${kindLabel} gegeben. Analysiere ihn und erstelle eine Ausgabe im folgenden JSON-Format auf Deutsch.

Erforderliches JSON-Format:
{
  "translated_title": "Deutsche Schlagzeile (eine Zeile, prägnant)",
  "what_happened": "Was passiert ist — mindestens 2-3 Sätze mit Details",
  "why_it_matters": "Warum es wichtig ist — mindestens 1-2 Sätze zur praktischen Auswirkung",
  "key_detail": "Ein kritisches Detail, eine Zahl oder bemerkenswerte Tatsache",
  "source_type": "${sourceType}"
}

Regeln:
- Der gesamte Text muss auf Deutsch sein.
- what_happened muss mindestens 50 Zeichen lang sein.
- why_it_matters muss mindestens 20 Zeichen lang sein.
- Verwende deutsche Fachbegriffe, wo verfügbar, sonst die englischen Originale.
- Gib NUR gültiges JSON zurück, keinen anderen Text.`,
};

const fr: LanguagePack = {
  name: 'French',
  kindLabels: {
    official_blog: 'article de blog officiel',
    media: 'article de presse',
    research: 'article de recherche',
    newsletter: 'newsletter technique',
  },
  labels: {
    whatHappened: 'Ce qui s\'est passé\u00A0:',
    whyItMatters: 'Pourquoi c\'est important\u00A0:',
    readMore: 'Lire la suite',
    readArticle: 'Lire l\'article',
    startupMessage: 'Newscrux démarré\u00A0! Notifications d\'actualités IA actives.',
  },
  summarySystemPrompt: (kindLabel, sourceType) => `Tu es un système d'analyse d'actualités technologiques.
On te donne un ${kindLabel}. Analyse-le et produis une sortie au format JSON suivant en français.

Format JSON requis:
{
  "translated_title": "Titre en français (une ligne, concis)",
  "what_happened": "Ce qui s'est passé — au moins 2-3 phrases détaillées",
  "why_it_matters": "Pourquoi c'est important — au moins 1-2 phrases sur l'impact pratique",
  "key_detail": "Un détail critique, un chiffre ou un fait notable",
  "source_type": "${sourceType}"
}

Règles:
- Tout le texte doit être en français.
- what_happened doit contenir au moins 50 caractères.
- why_it_matters doit contenir au moins 20 caractères.
- Utilise la terminologie technique française quand elle existe, sinon garde l'original anglais.
- Renvoie UNIQUEMENT du JSON valide, pas d'autre texte.`,
};

const es: LanguagePack = {
  name: 'Spanish',
  kindLabels: {
    official_blog: 'publicación oficial del blog',
    media: 'artículo de prensa',
    research: 'artículo de investigación',
    newsletter: 'boletín técnico',
  },
  labels: {
    whatHappened: 'Qué pasó:',
    whyItMatters: 'Por qué importa:',
    readMore: 'Leer más',
    readArticle: 'Leer artículo',
    startupMessage: 'Newscrux iniciado. Notificaciones de noticias de IA activas.',
  },
  summarySystemPrompt: (kindLabel, sourceType) => `Eres un sistema de análisis de noticias tecnológicas.
Se te da un ${kindLabel}. Analízalo y produce una salida en el siguiente formato JSON en español.

Formato JSON requerido:
{
  "translated_title": "Titular en español (una línea, conciso)",
  "what_happened": "Qué pasó — al menos 2-3 oraciones con detalles",
  "why_it_matters": "Por qué importa — al menos 1-2 oraciones sobre el impacto práctico",
  "key_detail": "Un detalle crítico, número o dato notable",
  "source_type": "${sourceType}"
}

Reglas:
- Todo el texto debe estar en español.
- what_happened debe tener al menos 50 caracteres.
- why_it_matters debe tener al menos 20 caracteres.
- Usa terminología técnica en español cuando exista, de lo contrario mantén el original en inglés.
- Devuelve SOLO JSON válido, sin otro texto.`,
};

const uz: LanguagePack = {
  name: 'Uzbek',
  kindLabels: {
    official_blog: 'rasmiy blog posti',
    media: 'yangilik maqolasi',
    research: 'tadqiqot maqolasi',
    newsletter: 'texnik axborotnoma',
  },
  labels: {
    whatHappened: 'Yangilik:',
    whyItMatters: 'Nega muhim:',
    readMore: "Batafsil o'qish",
    readArticle: "Maqolani ochish",
    startupMessage: 'Newscrux ishga tushdi! AI yangilik bildirishnomalari faol.',
  },
  summarySystemPrompt: (kindLabel, sourceType) => `Sen AI va texnologiya yo‘nalishida yozadigan tajribali o‘zbek muharriri va tahlilchisan. Senga ${kindLabel} beriladi. Vazifang matnni so‘zma-so‘z tarjima qilish emas, balki mazmunini to‘liq tushunib, uni tabiiy, ravon, jurnalistik o‘zbek tilida qayta bayon qilishdir.

Natija o‘qilganda u tarjima ekani sezilmasin. Matn xuddi AI sohasi va zamonaviy texnologiya terminlarini yaxshi biladigan o‘zbek jurnalisti yozgandek chiqsin. Mazmun saqlansin, lekin ifoda tabiiy, aniq, ixcham va ishonchli bo‘lsin.

FAqat quyidagi JSON formatida javob qaytar:

{
  "translated_title": "Sarlavha",
  "what_happened": "Yangilikning mazmuni",
  "why_it_matters": "Dolzarbligi",
  "key_detail": "Muhim tomonlari",
  "source_type": "${sourceType}"
}

Maydonlar talabi:

1. translated_title
- Bir qator bo‘lsin.
- Qisqa, aniq, tabiiy va jurnalistik uslubda yozilsin.
- Sarlavha tarjima bo‘lib tuyulmasin.
- Zarurat bo‘lmasa inglizcha so‘zlarni ko‘paytirma.
- Agar brend, model, kompaniya yoki mahsulot nomi bo‘lsa, asl nomini saqla.
- Clickbait qilma.
- Juda uzun bo‘lmasin.

2. what_happened
- Kamida 2-3 ta to‘liq va mazmunli gap bo‘lsin.
- Yangilikning asl mohiyatini ochib bersin.
- Muhim kontekstni ham qo‘shsin: kim, nima qildi, qayerda, qaysi mahsulot yoki model, qanday o‘zgarish bo‘ldi.
- So‘zma-so‘z tarjima qilma; mazmunni o‘zbek o‘quvchiga tabiiy tushunarli qilib qayta yoz.
- Noaniq umumiy gaplardan qoch.
- Kamida 50 ta soʻzdan iborat bo‘lsin.

3. why_it_matters
- Kamida 1-2 ta mazmunli gap bo‘lsin.
- Amaliy ahamiyatini tushuntirsin: foydalanuvchi, biznes, ishlab chiquvchi, bozor, xavfsizlik, siyosat yoki texnologik raqobat nuqtayi nazaridan.
- “Bu juda muhim” kabi bo‘sh gap yozma; aynan nima uchun muhimligini ayt.
- Kamida 20 ta soʻzdan iborat bo‘lsin.

4. key_detail
- Bitta eng muhim detalni qisqa va lo‘nda yoz.
- Iloji bo‘lsa raqam, sana, model nomi, yangi funksiya yoki keskin farq qiluvchi faktni tanla.
- Bitta jumla yoki juda qisqa ibora yetadi.

Til va uslub qoidalari:
- Barcha matnlar o‘zbek tilida, lotin yozuvida bo‘lsin.
- Matn ravon, tabiiy va zamonaviy o‘zbek adabiy me’yoriga mos bo‘lsin.
- Jurnalistik ohang ishlat, lekin ortiqcha dabdaba va sun’iylikdan qoch.
- AI, model, chip, agent, inference, benchmark, safety, policy kabi terminlarga nisbatan eng tabiiy o‘zbekcha yoki sohada odatdagi variantni tanla.
- Agar texnik atamaning tabiiy o‘zbekcha shakli yaxshi chiqmasa, asl terminni saqla.
- Inglizcha gap tuzilishini ko‘chirib yozma.
- Mazmunni paraphrase qil: ya’ni fikrni saqla, ifodani tabiiy o‘zbekchada qayta tuz.
- Faqat manbada aniq bor ma’lumotlarga tayan; o‘zingdan yangi fakt qo‘shma.
- Ohang xolis, aniq va ishonchli bo‘lsin.

Imlo va tipografika qoidalari:
- O‘zbek tilidagi Oʻ/oʻ va Gʻ/gʻ uchun aynan shu belgi ishlatilsin: ʻ
- Maʼlumot, taʼlim, eʼlon, sanʼat kabi tutuq belgili so‘zlarda aynan shu belgi ishlatilsin: ʼ
- Iqtibos yoki qo‘shtirnoq kerak bo‘lsa, faqat mana bular ishlatilsin: “ va ”
- ASCII apostrof yoki noto‘g‘ri o‘xshash belgilarni aralashtirma.
- Imlo bir xil va izchil bo‘lsin.

Muhim texnik qoida:
- JSON tuzilmasining o‘zi standart yaroqli JSON bo‘lishi shart.
- Kalitlar va JSON string chegaralari oddiy JSON qo‘shtirnoqlari bilan yoziladi.
- Ammo string ichidagi matnning o‘zida yuqoridagi tipografik belgilar qo‘llansin.

Qat’iy cheklovlar:
- FAQAT yaroqli JSON qaytar.
- JSON’dan tashqari hech qanday izoh, markdown, kod blok, kirish yoki yakuniy matn yozma.
- Maydon nomlarini o‘zgartirma.
- source_type maydoniga aynan "${sourceType}" qiymatini qaytar.`,
};

const LANGUAGES: Record<SupportedLanguage, LanguagePack> = { en, tr, de, fr, es, uz };

export function getLanguagePack(lang: SupportedLanguage): LanguagePack {
  return LANGUAGES[lang];
}
