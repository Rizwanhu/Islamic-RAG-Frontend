export type Language = "en" | "ur";
export type Confidence = "grounded" | "review";

export type BackendSource = {
  fatwa_number: string;
  category?: string;
  sub_category?: string;
  institution?: string;
  url?: string;
  distance: number;
  snippet: string;
};

export type BackendResponse = {
  answer: string;
  english_translation?: string;
  englishTranslation?: string;
  sources: BackendSource[];
};

export type Citation = {
  n: number;
  source: string;
  excerpt: string;
  matchScore: number;
  url?: string;
  category?: string;
  subCategory?: string;
  institution?: string;
  fatwaNumber: string;
};

export type AskResult = {
  answer: string;
  englishTranslation?: string;
  confidence: Confidence;
  citations: Citation[];
};