import { Header } from "@/components/dashboard/header";
import { DateTabs } from "@/components/dashboard/date-tabs";
import { GamePlanCard } from "@/components/dashboard/game-plan";
import { WellbeingCard } from "@/components/dashboard/wellbeing-card";
import { HealthCard } from "@/components/dashboard/health-card";
import { InputBar } from "@/components/dashboard/input-bar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PasswordGate } from "@/components/auth/password-gate";

export default function Home() {
  return (
    <PasswordGate>
      <main className="flex min-h-screen justify-center bg-gray-50">
        <div className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl overflow-hidden min-h-screen relative">
          <ScrollArea className="flex-1">
            <div className="flex flex-col gap-6 pb-32">
              <Header />
              <div className="px-6">
                <DateTabs />
              </div>
              
              <div className="flex flex-col gap-4 px-6">
                <GamePlanCard />
                <WellbeingCard />
                <HealthCard />
              </div>
            </div>
          </ScrollArea>
          
          <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-white via-white to-transparent pt-12">
            <InputBar />
          </div>
        </div>
      </main>
    </PasswordGate>
  );
}
