import { prisma } from "@/lib/prisma";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ResumeForm } from "./resume-form";
import { ProfileForm } from "./profile-form";
import { SourcesPanel } from "./sources-panel";
import { SystemCheckPanel } from "./system-check-panel";

// Reads the local DB on each request.
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [profile, baseResume, sources] = await Promise.all([
    prisma.profile.findUnique({ where: { id: "singleton" } }),
    prisma.resume.findFirst({ where: { isBase: true } }),
    prisma.sourceConfig.findMany({
      orderBy: [{ boardType: "asc" }, { companyToken: "asc" }],
    }),
  ]);

  let initialFacts: { properNouns: number; numbers: number } | null = null;
  if (baseResume?.baseFacts) {
    try {
      const f = JSON.parse(baseResume.baseFacts) as {
        properNouns?: unknown[];
        numbers?: unknown[];
      };
      initialFacts = {
        properNouns: f.properNouns?.length ?? 0,
        numbers: f.numbers?.length ?? 0,
      };
    } catch {
      initialFacts = null;
    }
  }

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Settings
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your résumé, details, discovery sources, and system status.
        </p>
      </div>

      <Tabs defaultValue="resume" className="gap-4">
        <TabsList>
          <TabsTrigger value="resume">Résumé</TabsTrigger>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="sources">Sources</TabsTrigger>
          <TabsTrigger value="system">System check</TabsTrigger>
        </TabsList>

        <TabsContent value="resume">
          <ResumeForm
            initialTex={baseResume?.texSource ?? ""}
            initialFacts={initialFacts}
          />
        </TabsContent>
        <TabsContent value="profile">
          <ProfileForm profile={profile} />
        </TabsContent>
        <TabsContent value="sources">
          <SourcesPanel sources={sources} />
        </TabsContent>
        <TabsContent value="system">
          <SystemCheckPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
