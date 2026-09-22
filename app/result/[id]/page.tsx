import Link from "next/link";

export default async function ResultPage({ params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	return <main className="mx-auto w-full max-w-[800px] px-5 py-20"><p className="text-xs uppercase tracking-[.18em] text-gold">Saved result</p><h1 className="mt-4 font-display text-4xl text-text">Result {id}</h1><p className="mt-5 text-text-muted">Saved results are available from the History page in this browser.</p><Link href="/history" className="link-quiet mt-8 inline-block">Back to history</Link></main>;
}
