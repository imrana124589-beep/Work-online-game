import { useListProjects } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Link } from "wouter";
import { Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CreateProjectDialog } from "@/components/dialogs/create-project-dialog";

export default function Projects() {
  const { data: projects, isLoading } = useListProjects();

  if (isLoading) {
    return <div className="p-8 flex items-center justify-center"><Loader2 className="animate-spin w-8 h-8 text-primary" /></div>;
  }

  return (
    <div className="p-8 max-w-7xl mx-auto w-full space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground mt-2">Manage and track all ongoing work.</p>
        </div>
        <CreateProjectDialog />
      </div>

      {projects?.length === 0 ? (
        <Card className="py-16 text-center">
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">No projects yet. Create your first one to get started.</p>
            <CreateProjectDialog />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects?.map((project) => {
            const progress = project.taskCount > 0 ? (project.completedCount / project.taskCount) * 100 : 0;
            return (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="block h-full group"
                data-testid={`link-project-${project.id}`}
              >
                <Card className="h-full hover:border-primary/50 transition-colors cursor-pointer">
                  <CardHeader>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: project.color || '#ccc' }} />
                        <CardTitle className="text-xl group-hover:text-primary transition-colors truncate">{project.name}</CardTitle>
                      </div>
                      <Badge variant="outline" className="capitalize shrink-0">{project.status.replace("_", " ")}</Badge>
                    </div>
                    <CardDescription className="line-clamp-2 mt-2 min-h-[40px]">{project.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 mt-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-medium">{Math.round(progress)}%</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                      <div className="flex justify-between text-sm text-muted-foreground pt-1">
                        <span>{project.completedCount} of {project.taskCount} done</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
