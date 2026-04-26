import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useCreateMember,
  getListMembersQueryKey,
  getGetWorkloadQueryKey,
} from "@workspace/api-client-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { AVATAR_COLORS } from "@/lib/constants";
import { UserPlus } from "lucide-react";

export function CreateMemberDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [avatarColor, setAvatarColor] = useState(AVATAR_COLORS[0]);

  const queryClient = useQueryClient();
  const create = useCreateMember({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListMembersQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetWorkloadQueryKey() });
        toast({ title: "Member added" });
        setOpen(false);
        setName("");
        setEmail("");
        setRole("");
        setAvatarColor(AVATAR_COLORS[0]);
      },
      onError: () => toast({ title: "Could not add member", variant: "destructive" }),
    },
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !role.trim()) return;
    create.mutate({ data: { name: name.trim(), email: email.trim(), role: role.trim(), avatarColor } });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-invite-member">
          <UserPlus className="w-4 h-4 mr-2" />
          Invite member
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>Invite a teammate</DialogTitle>
            <DialogDescription>They'll appear on the team directory and can be assigned tasks.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="member-name">Name</Label>
              <Input id="member-name" value={name} onChange={(e) => setName(e.target.value)} required data-testid="input-member-name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="member-email">Email</Label>
              <Input id="member-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required data-testid="input-member-email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="member-role">Role</Label>
              <Input id="member-role" value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Engineer" required data-testid="input-member-role" />
            </div>
            <div className="space-y-2">
              <Label>Avatar color</Label>
              <div className="flex flex-wrap gap-2">
                {AVATAR_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setAvatarColor(c)}
                    className={cn(
                      "w-7 h-7 rounded-full border-2 transition-all",
                      avatarColor === c ? "border-foreground scale-110" : "border-transparent"
                    )}
                    style={{ backgroundColor: c }}
                    data-testid={`swatch-avatar-${c}`}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={create.isPending} data-testid="button-submit-member">
              {create.isPending ? "Adding..." : "Add member"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
