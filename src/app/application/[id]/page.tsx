import { HydrateClient, api } from "~/trpc/server";
import { ApplicationDetails } from "~/app/_components/applicationDetails";

export default async function ApplicationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const applicationId = parseInt(id);

  try {
    const application = await api.application.getById(applicationId);

    if (!application) {
      throw new Error("Application not found");
    }

    return (
      <HydrateClient>
        <main className="min-h-screen bg-gray-50 p-8">
          <ApplicationDetails
            application={application}
            applicationId={applicationId}
          />
        </main>
      </HydrateClient>
    );
  } catch (error) {
    return (
      <main className="min-h-screen bg-gray-50 p-8">
        <div className="mx-auto max-w-2xl">
          <div className="rounded-md border border-red-200 bg-red-50 p-4">
            <p className="text-red-800">
              {error instanceof Error ? error.message : "Application not found"}
            </p>
          </div>
          <div className="mt-4">
            <a
              href="/application-lookup"
              className="text-blue-600 hover:underline"
            >
              Back to application lookup
            </a>
          </div>
        </div>
      </main>
    );
  }
}
