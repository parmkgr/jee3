
"use client"

import { useState, useMemo, useRef, useEffect } from 'react';
import { SavedTest, SectionConfig, QuestionType } from '@/app/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  History, 
  Trash2, 
  ChevronRight, 
  Calendar, 
  ArrowLeft, 
  TrendingUp,
  Download,
  Upload,
  Activity,
  Target,
  Heart
} from 'lucide-react';
import { format } from 'date-fns';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { cn } from '@/lib/utils';
import { calculateJEEAdvScore } from './AnalyticsDashboard';

interface TestHistoryProps {
  onBack: () => void;
  onViewTest: (test: SavedTest) => void;
}

export function TestHistory({ onBack, onViewTest }: TestHistoryProps) {
  const [refresh, setRefresh] = useState(0);
  const [savedTests, setSavedTests] = useState<SavedTest[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const history = JSON.parse(localStorage.getItem('brutal_score_history') || '[]');
    setSavedTests(history);
  }, [refresh]);

  const deleteTest = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Delete this test record?")) {
      const updated = savedTests.filter(t => t.id !== id);
      localStorage.setItem('brutal_score_history', JSON.stringify(updated));
      setRefresh(prev => prev + 1);
    }
  };

  const exportHistory = () => {
    const dataStr = JSON.stringify(savedTests, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', `brutal_score_backup.json`);
    linkElement.click();
  };

  const importHistory = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        if (Array.isArray(imported)) {
          localStorage.setItem('brutal_score_history', JSON.stringify(imported));
          setRefresh(prev => prev + 1);
          alert("Restored!");
        }
      } catch (err) { alert("Invalid file."); }
    };
    reader.readAsText(file);
  };

  const aggregateMetrics = useMemo(() => {
    if (savedTests.length === 0) return null;

    let totalScore = 0;
    let totalMax = 0;
    let totalCorrect = 0;
    let totalAttempted = 0;
    let totalActiveTimeSeconds = 0;
    let totalNegativeLoss = 0;
    let timeOnIncorrect = 0;
    let timeOnCorrect = 0;
    let overthinkingCount = 0;
    let sillyErrorCount = 0;
    let firstHalfCorrect = 0;
    let firstHalfAttempts = 0;
    let secondHalfCorrect = 0;
    let secondHalfAttempts = 0;

    savedTests.forEach(test => {
      test.config.subjects.forEach(sub => {
        sub.sections.forEach(sec => {
          for (let i = 1; i <= sec.numQuestions; i++) {
            const qId = `${sec.id}-${i}`;
            const res = test.responses[qId];
            const key = test.answerKey[qId];
            const time = res?.timeSpent || 0;
            const markedAt = res?.markedAt || 0;
            const hasResponse = res && res.value && (Array.isArray(res.value) ? res.value.length > 0 : res.value !== '');
            const score = hasResponse ? calculateJEEAdvScore(res.value, key, sec) : 0;
            
            totalActiveTimeSeconds += time;
            if (hasResponse) {
              totalAttempted++;
              totalScore += score;
              if (markedAt < (test.config.totalTimeMinutes * 30)) {
                firstHalfAttempts++; if (score > 0) firstHalfCorrect++;
              } else {
                secondHalfAttempts++; if (score > 0) secondHalfCorrect++;
              }
              if (score > 0) { totalCorrect++; timeOnCorrect += time; }
              else if (score < 0) { totalNegativeLoss += Math.abs(score); timeOnIncorrect += time; if (time < 45) sillyErrorCount++; }
              if (time > 180) overthinkingCount++;
            }
          }
        });
        totalMax += sub.sections.reduce((acc, sec) => acc + (sec.numQuestions * sec.positiveMarks), 0);
      });
    });

    const n = savedTests.length;
    const avgScorePct = totalMax > 0 ? (totalScore / totalMax) * 100 : 0;
    const efficiency = totalActiveTimeSeconds > 0 ? (totalScore / (totalActiveTimeSeconds / 60)).toFixed(2) : "0";

    const getProjectedAIR = (pct: number) => {
      if (pct > 43) return "< 5000";
      if (pct >= 39.5) return "5000 - 8000";
      if (pct >= 37.5) return "8000 - 10000";
      if (pct >= 36) return "10000 - 15000";
      if (pct >= 32) return "15000 - 20000";
      if (pct >= 23) return "> 25000";
      return "> 50000";
    };

    return {
      n,
      score: Math.round(totalScore / n),
      max: Math.round(totalMax / n),
      air: getProjectedAIR(avgScorePct),
      accuracy: totalAttempted > 0 ? (totalCorrect / totalAttempted) * 100 : 0,
      efficiency,
      silly: Math.round(sillyErrorCount / n),
      overthinking: Math.round(overthinkingCount / n),
      stamina: firstHalfAttempts > 0 && secondHalfAttempts > 0 ? (((secondHalfCorrect/secondHalfAttempts) / (firstHalfCorrect/firstHalfAttempts)) * 100) : 0
    };
  }, [savedTests]);

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 flex flex-col">
      <div className="max-w-7xl mx-auto space-y-12 flex-1 w-full">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <h1 className="text-4xl font-black text-slate-900 flex items-center gap-3">
            <History className="w-10 h-10 text-blue-600" /> Audit Vault
          </h1>
          <div className="flex gap-3">
             <input type="file" ref={fileInputRef} onChange={importHistory} className="hidden" />
             <Button variant="outline" onClick={() => fileInputRef.current?.click()}><Upload className="w-4 h-4 mr-2" /> Restore</Button>
             <Button variant="outline" onClick={exportHistory}><Download className="w-4 h-4 mr-2" /> Backup</Button>
             <Button variant="outline" onClick={onBack}><ArrowLeft className="w-4 h-4 mr-2" /> Back</Button>
          </div>
        </div>

        {aggregateMetrics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-6">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Aggregate AIR</p>
              <p className="text-2xl font-black text-blue-600">{aggregateMetrics.air}</p>
            </Card>
            <Card className="p-6">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Avg Efficiency</p>
              <p className="text-2xl font-black text-green-600">{aggregateMetrics.efficiency}</p>
            </Card>
            <Card className="p-6">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Avg Accuracy</p>
              <p className="text-2xl font-black">{aggregateMetrics.accuracy.toFixed(1)}%</p>
            </Card>
            <Card className="p-6">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Avg Overthinking</p>
              <p className="text-2xl font-black text-purple-600">{aggregateMetrics.overthinking}</p>
            </Card>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4">
          {savedTests.map(test => (
            <Card key={test.id} className="p-6 cursor-pointer hover:border-blue-400 transition-all flex items-center justify-between" onClick={() => onViewTest(test)}>
              <div className="flex items-center gap-6">
                <div className="text-center bg-slate-900 text-white p-4 rounded-xl min-w-[100px]">
                  <p className="text-2xl font-black">{test.totalScore}</p>
                  <p className="text-[8px] uppercase opacity-60">Marks</p>
                </div>
                <div className="space-y-1">
                  <p className="font-bold">JEE Mock Session</p>
                  <p className="text-xs text-slate-400">{format(new Date(test.date), 'PPP p')}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={(e) => deleteTest(test.id, e)}><Trash2 className="w-4 h-4" /></Button>
                <ChevronRight className="w-5 h-5 text-slate-300" />
              </div>
            </Card>
          ))}
        </div>
      </div>
      <div className="bg-slate-900 text-slate-400 text-[10px] py-4 text-center font-bold tracking-widest uppercase shrink-0 mt-20">
        Made with <Heart className="inline-block w-2.5 h-2.5 mx-1 text-red-500 fill-red-500" /> by Parmanand Singhal
      </div>
    </div>
  );
}
