import { useListMembers } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { Link } from "wouter";
import { CreateMemberDialog } from "@/components/dialogs/create-member-dialog";
import { MemberAvatar } from "@/components/member-avatar";

export default function Team() {
  const { data: members, isLoading } = useListMembers();

  if (isLoading) {
    return <div className="p-8 flex items-center justify-center"><Loader2 className="animate-spin w-8 h-8 text-primary" /></div>;
  }

  return (
    <div className="p-8 max-w-7xl mx-auto w-full space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Team Directory</h1>
          <p className="text-muted-foreground mt-2">Everyone working in this workspace.</p>
        </div>
        <CreateMemberDialog />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {members?.map((member) => (
          <Link
            key={member.id}
            href={`/team/${member.id}`}
            className="block"
            data-testid={`link-member-${member.id}`}
          >
            <Card className="hover:border-primary/50 transition-colors text-center py-8 cursor-pointer h-full">
              <CardContent className="p-0 flex flex-col items-center space-y-4">
                <MemberAvatar member={member} size="xl" />
                <div>
                  <h3 className="font-semibold text-lg">{member.name}</h3>
                  <p className="text-muted-foreground text-sm">{member.role}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
