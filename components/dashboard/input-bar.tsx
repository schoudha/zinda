import { Input } from "@/components/ui/input";
import { Mic, Camera, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function InputBar() {
  return (
    <div className="mt-auto flex flex-col gap-4">
      <Card className="rounded-full border-none shadow-lg ring-1 ring-black/5">
        <CardContent className="flex items-center p-2 pl-4">
          <Sparkles className="mr-3 h-5 w-5 text-purple-500" />
          <Input 
            className="border-none bg-transparent p-0 text-base shadow-none focus-visible:ring-0 placeholder:text-gray-400"
            placeholder="Tell Zinda how it's going..."
          />
          <div className="flex items-center gap-1 pr-2 text-gray-400">
            <button className="p-2 hover:text-gray-600">
              <Mic className="h-5 w-5" />
            </button>
            <button className="p-2 hover:text-gray-600">
              <Camera className="h-5 w-5" />
            </button>
          </div>
        </CardContent>
      </Card>
      
      <p className="text-center text-xs font-medium text-gray-900">
        Spending velocity is high. <span className="text-purple-600">$45 remaining today.</span>
      </p>
    </div>
  );
}

