import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface HeaderProps {
  userName?: string;
  message?: string;
}

export function Header({ 
  userName = "Salahuddin", 
  message = "You're crushing fitness, but watch the budget." 
}: HeaderProps) {
  return (
    <div className="flex items-start gap-4 p-4 pt-8">
      <Avatar className="h-12 w-12 border-2 border-white shadow-sm">
        <AvatarImage src="/avatar-placeholder.png" alt={userName} />
        <AvatarFallback className="bg-blue-100 text-blue-600">
          {userName[0]}
        </AvatarFallback>
      </Avatar>
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-bold tracking-tight text-gray-900">
          Good morning, {userName}.
        </h1>
        <p className="text-sm leading-snug text-gray-600">
          {message}
        </p>
      </div>
    </div>
  );
}

