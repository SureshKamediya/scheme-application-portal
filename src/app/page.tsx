import { api, HydrateClient } from "~/trpc/server";
import { ApplicationForm } from "~/app/_components/application";


export default async function Home() {
  //const hello = await api.post.hello({ text: "from tRPC" });

  //void api.post.getLatest.prefetch();

  return (
    <HydrateClient>
      <main className="min-h-screen p-8">
        <ApplicationForm initialSchemeId={1} initialMobileNumber={"1234567890"} />
      </main>
    </HydrateClient>
  );
}
