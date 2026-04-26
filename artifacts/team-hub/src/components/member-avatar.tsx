import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface Person {
  name: string;
  avatarColor?: string | null;
}

export function MemberAvatar({
  member,
  size = "md",
  className,
}: {
  member: Person | null | undefined;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  if (!member) {
    return (
      <Avatar className={cn(sizes[size], className)}>
        <AvatarFallback className="bg-muted text-muted-foreground text-xs">?</AvatarFallback>
      </Avatar>
    );
  }
  return (
    <Avatar className={cn(sizes[size], className)}>
      <AvatarFallback style={{ backgroundColor: member.avatarColor || "#999", color: "#fff" }}>
        {member.name.charAt(0).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  );
}

const sizes: Record<string, string> = {
  sm: "w-6 h-6 text-xs",
  md: "w-8 h-8 text-sm",
  lg: "w-12 h-12 text-base",
  xl: "w-20 h-20 text-2xl",
};
