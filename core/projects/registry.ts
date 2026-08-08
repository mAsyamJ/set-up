import fs from "node:fs";
import path from "node:path";
import { z } from "zod";

const ProjectSchema = z.object({
  id: z.string().uuid(),
  path: z.string().min(1),
  displayName: z.string().min(1).max(200),
  provenance: z.string().min(1).max(500),
  executionPolicy: z.enum(["read-only", "canary-worker"]),
  kanban: z.string().max(128).optional(),
}).strict().superRefine((project, context) => {
  if (
    project.executionPolicy === "canary-worker" &&
    project.provenance !== "disposable-canary"
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["provenance"],
      message: "worker projects must use disposable-canary provenance",
    });
  }
});

const RegistrySchema = z.object({
  schema: z.literal("agent-harness.projects.v2"),
  pathBase: z.literal("registry").optional(),
  projects: z.record(
    z.string().regex(/^[a-z0-9][a-z0-9-]{0,63}$/),
    ProjectSchema
  ),
}).strict();

export type RegisteredProject = z.infer<typeof ProjectSchema> & {
  slug: string;
  canonicalPath: string;
  available: boolean;
};

export function projectRegistryPath(): string {
  if (process.env.HARNESS_PROJECT_REGISTRY) {
    return path.resolve(process.env.HARNESS_PROJECT_REGISTRY);
  }
  const configHome =
    process.env.HARNESS_CONFIG_HOME ??
    path.join(
      process.env.XDG_CONFIG_HOME ?? path.join(process.env.HOME ?? "", ".config"),
      "agent-harness"
    );
  return path.join(configHome, "projects.json");
}

export function loadProjectRegistry(filePath = projectRegistryPath()): RegisteredProject[] {
  if (!fs.existsSync(filePath)) return [];
  const parsed = RegistrySchema.parse(JSON.parse(fs.readFileSync(filePath, "utf8")));
  return Object.entries(parsed.projects)
    .map(([slug, project]) => {
      const resolved = path.isAbsolute(project.path)
        ? project.path
        : path.resolve(path.dirname(filePath), project.path);
      const available = fs.existsSync(resolved) && fs.statSync(resolved).isDirectory();
      const canonicalPath = available ? fs.realpathSync(resolved) : path.resolve(resolved);
      return { slug, ...project, canonicalPath, available };
    })
    .sort((a, b) => a.slug.localeCompare(b.slug));
}

export function getRegisteredProject(
  projectIdOrSlug: string,
  filePath = projectRegistryPath()
): RegisteredProject {
  const project = loadProjectRegistry(filePath).find(
    (candidate) => candidate.id === projectIdOrSlug || candidate.slug === projectIdOrSlug
  );
  if (!project) throw new Error(`unknown registered project: ${projectIdOrSlug}`);
  if (!project.available) throw new Error(`registered project is unavailable: ${project.slug}`);
  return project;
}

export function safeProjectSummaries(filePath = projectRegistryPath()) {
  return loadProjectRegistry(filePath).map((project) => ({
    id: project.id,
    slug: project.slug,
    displayName: project.displayName,
    provenance: project.provenance,
    executionPolicy: project.executionPolicy,
    available: project.available,
  }));
}
