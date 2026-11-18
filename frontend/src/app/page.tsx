import { NdaCreator } from "@/components/NdaCreator";
import { loadNdaTemplate } from "@/lib/nda/template";

// Read and parse the Common Paper templates once, at build time.
const template = loadNdaTemplate();

export default function Home() {
  return <NdaCreator template={template} />;
}
