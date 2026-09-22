import { Nav } from "@/components/Nav";
import { PipelineDiagram } from "@/components/PipelineDiagram";

export default function AboutPage() {
	return <><Nav /><main className="mx-auto w-full max-w-[900px] px-5 py-16"><p className="text-xs uppercase tracking-[.18em] text-gold">About Sanad</p><h1 className="mt-4 font-display text-5xl text-text">Evidence before certainty.</h1><p className="mt-6 max-w-[62ch] text-lg leading-8 text-text-muted">Sanad sends your question to a retrieval service, evaluates the returned distance scores, and presents the answer beside the passages that support it. When the corpus cannot support an answer, it says so.</p><div className="panel mt-12 p-6"><PipelineDiagram /></div></main></>;
}
