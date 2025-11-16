import { HydrateClient } from "~/trpc/server";
import { SchemesList } from "~/app/_components/schemes-list";

export default async function Home() {
  return (
    <HydrateClient>
      <main className="min-h-screen bg-gray-50 py-8">
        <SchemesList />
      </main>
    </HydrateClient>
  );
}
