import { Nav } from "@/components/Nav";
import { SourceCard } from "@/components/SourceCard";
import type { Citation } from "@/lib/types";

const sample: Citation = { n: 1, source: "Fatwa 73770 · سود اور بینکنگ", excerpt: "سوال: بینک کے اکاؤنٹ میں ملنے والا سود کا کیا حکم ہے؟ جواب: صورتِ مسئلہ میں بینک کا سود اور نفع شرعاً ناجائز اور حرام ہے...", matchScore: 0.6876, url: "https://www.binoria.edu.pk/fatwa/73770", category: "تجارت و معاملات", subCategory: "سود اور بینکنگ", fatwaNumber: "73770" };
export default function SourcesPage() { return <><Nav /><main className="mx-auto w-full max-w-[900px] px-5 py-16"><p className="text-xs uppercase tracking-[.18em] text-gold">Sources</p><h1 className="mt-4 font-display text-5xl text-text">The corpus stays visible.</h1><p className="mt-5 max-w-[60ch] text-text-muted">Every grounded answer includes retrieved passages and a link to the original fatwa. This sample shows the shape of a source record.</p><div className="mt-10"><SourceCard citation={sample} sample /></div></main></>; }
