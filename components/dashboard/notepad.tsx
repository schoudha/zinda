"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";

export function NotepadCard() {
  const [note, setNote] = useState("");
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAnalyze = async () => {
    if (!note.trim()) return;
    
    setLoading(true);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: `Analyze these notes and provide brief, actionable insights:\n\n${note}` }),
      });
      
      const data = await response.json();
      if (data.response) {
        setAnalysis(data.response);
      }
    } catch (error) {
      console.error("Analysis failed:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-none bg-white shadow-sm">
      <CardHeader className="pb-2 pt-6 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-xs font-bold uppercase tracking-wider text-gray-500">
          Notepad
        </CardTitle>
        <Sparkles className="h-4 w-4 text-purple-600" />
      </CardHeader>
      <CardContent className="space-y-4">
        <textarea
          className="w-full min-h-[100px] p-3 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all resize-none bg-gray-50/50"
          placeholder="Write your notes here..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        
        <Button 
          onClick={handleAnalyze} 
          disabled={loading || !note.trim()}
          className="w-full bg-black text-white hover:bg-gray-800 h-9"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Sparkles className="h-4 w-4 mr-2" />
          )}
          Analyze with Gemini
        </Button>

        {analysis && (
          <div className="mt-4 p-3 bg-purple-50 rounded-lg border border-purple-100">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-bold text-purple-700 uppercase flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                Gemini Insight
              </p>
              <button 
                onClick={() => setAnalysis(null)}
                className="text-[10px] text-purple-400 hover:text-purple-600 transition-colors"
              >
                Clear
              </button>
            </div>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{analysis}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

