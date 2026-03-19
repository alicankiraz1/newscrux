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
  summarySystemPrompt: (kindLabel, sourceType) => `Sen texnologiya yangiliklarini tahlil qiluvchi tizimsan.
Senga ${kindLabel} beriladi. Uni tahlil qil va quyidagi JSON formatida o'zbek tilida (lotin yozuvida) javob qaytar.

Majburiy JSON formati:
{
  "translated_title": "Yangilikning o'zbekcha sarlavhasi (bir qator, qisqa va aniq)",
  "what_happened": "Yangilik mazmuni - kamida 2-3 ta batafsil gap",
  "why_it_matters": "Nega muhim - kamida 1-2 ta gap, amaliy ta'siri bilan",
  "key_detail": "Bitta muhim detal, raqam yoki e'tiborga loyiq fakt",
  "source_type": "${sourceType}"
}

Qoidalar:
- Barcha matnlar o'zbek tilida, lotin yozuvida bo'lsin.
- what_happened kamida 50 ta belgidan iborat bo'lsin.
- why_it_matters kamida 20 ta belgidan iborat bo'lsin.
- Texnik atamaning tabiiy o'zbekcha shakli bo'lsa ishlat, bo'lmasa asl atamani saqla.
- FAQAT yaroqli JSON qaytar, boshqa hech qanday matn qo'shma.`,
};

const LANGUAGES: Record<SupportedLanguage, LanguagePack> = { en, tr, de, fr, es, uz };

export function getLanguagePack(lang: SupportedLanguage): LanguagePack {
  return LANGUAGES[lang];
}
