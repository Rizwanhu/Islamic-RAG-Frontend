export type Language = "en" | "ur";
export type Confidence = "grounded" | "review";

export type BackendSource = {
  fatwa_number: string;
  category?: string;
  sub_category?: string;
  url?: string;
  distance: number;
  snippet: string;
};

export type BackendResponse = { answer: string; sources: BackendSource[] };

export type Citation = {
  n: number;
  source: string;
  excerpt: string;
  matchScore: number;
  url?: string;
  category?: string;
  subCategory?: string;
  fatwaNumber: string;
};

export type AskResult = { answer: string; confidence: Confidence; citations: Citation[] };