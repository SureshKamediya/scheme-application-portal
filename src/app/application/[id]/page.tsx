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
        <main className="min-h-screen p-8 bg-gray-50">
          <ApplicationDetails application={application} applicationId={applicationId} />
        </main>
      </HydrateClient>
    );
  } catch (error) {
    return (
      <main className="min-h-screen p-8 bg-gray-50">
        <div className="max-w-2xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-red-800">
              {error instanceof Error ? error.message : "Application not found"}
            </p>
          </div>
          <div className="mt-4">
            <a href="/application-lookup" className="text-blue-600 hover:underline">
              Back to application lookup
            </a>
          </div>
        </div>
      </main>
    );
  }
}