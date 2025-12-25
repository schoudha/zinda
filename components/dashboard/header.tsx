interface HeaderProps {
  userName?: string;
}

export function Header({ 
  userName = "Salahuddin"
}: HeaderProps) {
  return (
    <div className="p-4 pt-8">
      <h1 className="text-xl font-bold tracking-tight text-gray-900">
        Good morning, {userName}.
      </h1>
    </div>
  );
}

