import { HydrateClient } from "~/trpc/server";
import { SchemeDetail } from "~/app/_components/scheme-detail";

export default async function SchemePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const schemeId = parseInt(id, 10);

  if (isNaN(schemeId)) {
    return (
      <main className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto p-6">
          <div className="rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-800">Invalid scheme ID.</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <HydrateClient>
      <main className="min-h-screen bg-gray-50 py-8">
        <SchemeDetail schemeId={schemeId} />
      </main>
    </HydrateClient>
  );
}
