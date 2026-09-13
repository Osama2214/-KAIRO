import { buildLlmsTxt } from "@/lib/llmsText";

export const revalidate = 3600;

export async function GET() {
  return new Response(await buildLlmsTxt(), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
