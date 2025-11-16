import { HydrateClient } from "~/trpc/server";
import { ApplicationLookup } from "~/app/_components/applicationLookup";

export default function ApplicationLookupPage() {
  return (
    <HydrateClient>
      <main className="min-h-screen p-8 bg-gray-50">
        <ApplicationLookup />
      </main>
    </HydrateClient>
  );
}