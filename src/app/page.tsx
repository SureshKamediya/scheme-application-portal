import { HydrateClient } from "~/trpc/server";
import { OTPForm } from "~/app/_components/otp";

export default async function Home() {
  return (
    <HydrateClient>
      <main className="min-h-screen p-8">
        <OTPForm />
      </main>
    </HydrateClient>
  );
}
