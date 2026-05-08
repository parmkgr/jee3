"use client"

import { useState, useEffect } from 'react';
import { SubjectConfig, ResponseMap, AnswerKeyMap, SectionConfig, QuestionType, SavedTest, ClinicalNote } from '@/app/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { 
  CheckCircle2, 
  XCircle, 
  BrainCircuit,
  Flame,
  Scale,
  Zap as ZapIcon,
  AreaChart as AreaChartIcon,
  Activity,
  Timer,
  Target,
  Pencil
} from 'lucide-react';
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

interface AnalyticsDashboardProps {
  subjects: SubjectConfig[];
  responses: ResponseMap;
  answerKey: AnswerKeyMap;
  totalTimeMinutes: number;
  onReset: () => void;
  savedTestId?: string;
}

export function AnalyticsDashboard({ subjects, responses, answerKey, totalTimeMinutes, onReset, savedTestId }: AnalyticsDashboardProps) {
  const [editingQId, setEditingQId] = useState<string | null>(null);
  const [currentNote, setCurrentNote] = useState<ClinicalNote>({ mistake: '', approach: '' });
  const [allNotes, setAllNotes] = useState<Record<string, ClinicalNote>>({});

  // Load existing notes if we are viewing a saved test
  useEffect(() => {
    const history = JSON.parse(localStorage.getItem('brutal_score_history') || '[]');
    const test = history.find((t: SavedTest) => t.id === savedTestId || t.id === history[history.length - 1]?.id);
    if (test?.notes) {
      setAllNotes(test.notes);
    }
  }, [savedTestId]);

  const openNoteDialog = (qId: string) => {
    setEditingQId(qId);
    setCurrentNote(allNotes[qId] || { mistake: '', approach: '' });
  };

  const saveNote = () => {
    if (!editingQId) return;
    
    const updatedNotes = { ...allNotes, [editingQId]: currentNote };
    setAllNotes(updatedNotes);

    // Persist to localStorage
    const history = JSON.parse(localStorage.getItem('brutal_score_history') || '[]');
    // We target the current test. If we are in "results" right after a test, it's the last one.
    const testIdx = savedTestId 
      ? history.findIndex((t: SavedTest) => t.id === savedTestId)
      : history.length - 1;

    if (testIdx !== -1) {
      history[testIdx].notes = updatedNotes;
      localStorage.setItem('brutal_score_history', JSON.stringify(history));
    }
    setEditingQId(null);
  };

  // --- CALCULATION ENGINE ---
  let totalScore = 0;
  let totalMax = 0;
  let totalCorrect = 0;
  let totalAttempted = 0;
  let totalQuestions = 0;
  let totalActiveTimeSeconds = 0;
  let totalNegativeLoss = 0;
  let totalUnattemptedTime = 0; 
  let timeOnIncorrect = 0;
  let timeOnCorrect = 0;

  let overthinkingCount = 0;
  let sillyErrorCount = 0;
  let firstHalfCorrect = 0;
  let firstHalfAttempts = 0;
  let secondHalfCorrect = 0;
  let secondHalfAttempts = 0;

  const intervalData = Array.from({ length: 6 }, (_, i) => ({
    time: `${(i + 1) * 30}m`,
    correct: 0,
    incorrect: 0,
    attempts: 0,
    cumulativeScore: 0
  }));

  const sectionMetrics: Record<QuestionType, { score: number, max: number, correct: number, attempts: number }> = {
    single: { score: 0, max: 0, correct: 0, attempts: 0 },
    multiple: { score: 0, max: 0, correct: 0, attempts: 0 },
    numeric: { score: 0, max: 0, correct: 0, attempts: 0 }
  };

  let guessCorrect = 0;
  let guessIncorrect = 0;

  const subjectMetrics = subjects.map((sub) => {
    let subScore = 0;
    let subMax = 0;
    let subCorrect = 0;
    let subAttempts = 0;
    let subTimeSeconds = 0;

    sub.sections.forEach((sec) => {
      subMax += sec.numQuestions * sec.positiveMarks;
      sectionMetrics[sec.type].max += sec.numQuestions * sec.positiveMarks;

      for (let i = 1; i <= sec.numQuestions; i++) {
        const qId = `${sec.id}-${i}`;
        const res = responses[qId];
        const key = answerKey[qId];
        const time = res?.timeSpent || 0;
        const markedAt = res?.markedAt || 0;
        
        totalQuestions++;
        subTimeSeconds += time;
        totalActiveTimeSeconds += time;

        const hasResponse = res && res.value && (Array.isArray(res.value) ? res.value.length > 0 : res.value !== '');
        const score = hasResponse ? calculateJEEAdvScore(res.value, key, sec) : 0;

        if (hasResponse) {
          subAttempts++;
          totalAttempted++;
          subScore += score;
          sectionMetrics[sec.type].attempts++;
          sectionMetrics[sec.type].score += score;

          const intervalIdx = Math.min(5, Math.floor(markedAt / (30 * 60)));
          intervalData[intervalIdx].attempts++;

          if (markedAt < (totalTimeMinutes * 30)) { 
            firstHalfAttempts++;
            if (score > 0) firstHalfCorrect++;
          } else {
            secondHalfAttempts++;
            if (score > 0) secondHalfCorrect++;
          }

          if (score > 0) {
            subCorrect++;
            timeOnCorrect += time;
            sectionMetrics[sec.type].correct++;
            intervalData[intervalIdx].correct++;
            for (let j = intervalIdx; j < 6; j++) intervalData[j].cumulativeScore += score;
            if (time < 45) guessCorrect++;
          } else if (score < 0) {
            timeOnIncorrect += time;
            totalNegativeLoss += Math.abs(score);
            intervalData[intervalIdx].incorrect++;
            for (let j = intervalIdx; j < 6; j++) intervalData[j].cumulativeScore += score;
            if (time < 45) {
              guessIncorrect++;
              sillyErrorCount++;
            }
            if (time > 180) overthinkingCount++;
          }
        } else {
          if (res) {
            totalUnattemptedTime += time;
            if (time > 180) overthinkingCount++;
          }
        }
      }
    });

    totalScore += subScore;
    totalMax += subMax;
    totalCorrect += subCorrect;

    return {
      name: sub.name,
      score: subScore,
      max: subMax,
      accuracy: subAttempts > 0 ? (subCorrect / subAttempts) * 100 : 0,
      timeInMinutes: subTimeSeconds / 60,
      attempts: subAttempts,
      roi: subTimeSeconds > 0 ? (subScore / (subTimeSeconds / 60)) : 0
    };
  });

  const accuracyRate = totalAttempted > 0 ? (totalCorrect / totalAttempted) * 100 : 0;
  const scorePercentage = totalMax > 0 ? (totalScore / totalMax) * 100 : 0;
  const avgTimeCorrect = totalCorrect > 0 ? Math.floor(timeOnCorrect / totalCorrect) : 0;
  const avgTimeIncorrect = (totalAttempted - totalCorrect) > 0 ? Math.floor(timeOnIncorrect / (totalAttempted - totalCorrect)) : 0;
  
  const firstHalfAccuracy = firstHalfAttempts > 0 ? (firstHalfCorrect / firstHalfAttempts) * 100 : 0;
  const secondHalfAccuracy = secondHalfAttempts > 0 ? (secondHalfCorrect / secondHalfAttempts) * 100 : 0;
  const staminaIndex = firstHalfAccuracy > 0 ? (secondHalfAccuracy / firstHalfAccuracy) * 100 : 0;
  const efficiencyRating = totalActiveTimeSeconds > 0 ? (totalScore / (totalActiveTimeSeconds / 60)).toFixed(2) : "0";

  const sectionalData = Object.entries(sectionMetrics).map(([type, data]) => ({
    name: type.toUpperCase(),
    accuracy: data.attempts > 0 ? (data.correct / data.attempts) * 100 : 0,
    yield: data.max > 0 ? (data.score / data.max) * 100 : 0
  }));

  const getProjectedAIR = (pct: number) => {
    if (pct > 43) return "< 5000";
    if (pct >= 39.5) return "5000 - 8000";
    if (pct >= 37.5) return "8000 - 10000";
    if (pct >= 36) return "10000 - 15000";
    if (pct >= 32) return "15000 - 20000";
    if (pct >= 23) return "> 25000";
    return "> 50000";
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 overflow-y-auto pb-20 font-body">
      <div className="container max-w-7xl mx-auto py-10 px-6 space-y-10">
        
        <div className="bg-white border border-slate-200 rounded-2xl p-8 flex flex-col md:flex-row justify-between items-center shadow-sm">
          <div className="space-y-1">
            <h1 className="text-3xl font-black tracking-tight text-slate-900">JEE Advanced Performance Audit</h1>
            <p className="text-slate-500 font-medium">Full 23-Point Deep Analytical Report</p>
          </div>
          <div className="mt-6 md:mt-0 flex gap-10">
            <div className="text-center">
              <p className="text-5xl font-black text-blue-600">{totalScore}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Aggregate Marks</p>
            </div>
          </div>
        </div>

        {/* SECTION A: THE BIG PICTURE */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">A</div>
            <h2 className="text-xl font-bold text-slate-800">The Big Picture</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-slate-200 shadow-none">
              <CardContent className="pt-6">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">1. Subject Scores</p>
                <div className="space-y-3">
                  {subjectMetrics.map(s => (
                    <div key={s.name} className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-600">{s.name}</span>
                      <span className="text-sm font-black text-slate-900">{s.score}/{s.max}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-none bg-blue-50/30">
              <CardContent className="pt-6">
                <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-3">2. Projected AIR</p>
                <div className="flex flex-col items-center justify-center h-16">
                  <p className="text-2xl font-black text-blue-700">{getProjectedAIR(scorePercentage)}</p>
                  <p className="text-[9px] font-bold text-blue-400">Based on your yield</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-none">
              <CardContent className="pt-6">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">3. Subject Accuracy</p>
                <div className="h-16 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={subjectMetrics}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                      <XAxis dataKey="name" hide />
                      <YAxis hide domain={[0, 100]} />
                      <Bar dataKey="accuracy" radius={[2, 2, 0, 0]}>
                        {subjectMetrics.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={['#3b82f6', '#10b981', '#f59e0b'][index % 3]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-none">
              <CardContent className="pt-6">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">4. Accuracy Rate</p>
                <div className="flex flex-col items-center justify-center h-16">
                  <p className="text-2xl font-black text-green-600">{accuracyRate.toFixed(1)}%</p>
                  <p className="text-[9px] font-bold text-slate-400">{totalCorrect} Correct / {totalAttempted} Attempts</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
             <Card className="border-slate-200 shadow-none">
              <CardContent className="pt-6">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">5. Time per Subject</p>
                <div className="space-y-3">
                  {subjectMetrics.map(s => (
                    <div key={s.name} className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-600">{s.name}</span>
                      <span className="text-xs font-mono font-bold text-slate-900">{Math.floor(s.timeInMinutes)} min</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-none">
              <CardContent className="pt-6">
                <p className="text-[10px] font-bold text-green-500 uppercase tracking-widest mb-3">6. Avg Speed (Correct)</p>
                <div className="flex flex-col items-center justify-center h-16 text-center">
                  <p className="text-2xl font-black text-slate-900">{avgTimeCorrect}s</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-none bg-red-50/20">
              <CardContent className="pt-6">
                <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-3">7. Time Waste Indicator</p>
                <div className="flex flex-col items-center justify-center h-16 text-center">
                  <p className="text-2xl font-black text-red-600">{avgTimeIncorrect}s</p>
                  <p className="text-[9px] font-bold text-red-400">Lost on Incorrect Qs</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-none">
              <CardContent className="pt-6">
                <p className="text-[10px] font-bold text-orange-400 uppercase tracking-widest mb-3">8. Unattempted Drain</p>
                <div className="flex flex-col items-center justify-center h-16 text-center">
                  <p className="text-2xl font-black text-slate-900">{Math.floor(totalUnattemptedTime / 60)}m</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-slate-200 shadow-none">
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <AreaChartIcon className="w-4 h-4 text-blue-600" /> 9. Time Distribution Momentum
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={intervalData}>
                    <defs>
                      <linearGradient id="colorAttempts" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                    <XAxis dataKey="time" axisLine={false} tickLine={false} fontSize={10} />
                    <YAxis axisLine={false} tickLine={false} fontSize={10} />
                    <Tooltip />
                    <Area type="monotone" dataKey="attempts" name="Attempts" stroke="#3b82f6" fillOpacity={1} fill="url(#colorAttempts)" />
                    <Area type="monotone" dataKey="correct" name="Correct" stroke="#10b981" fillOpacity={0} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* SECTION C: STRATEGY & BEHAVIORAL ANALYSIS */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold">C</div>
            <h2 className="text-xl font-bold text-slate-800">Strategy & Behavioral Analysis</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-slate-200 shadow-none">
              <CardContent className="pt-6">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">10. Selection Ratio</p>
                <div className="flex flex-col items-center justify-center h-16">
                  <p className="text-2xl font-black text-slate-900">{((totalAttempted / totalQuestions) * 100).toFixed(0)}%</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-none border-l-red-500 border-l-4">
              <CardContent className="pt-6">
                <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest mb-3">11. Negative Impact</p>
                <div className="flex flex-col items-center justify-center h-16">
                  <p className="text-2xl font-black text-red-600">-{totalNegativeLoss}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-none">
              <CardContent className="pt-6">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">12. Guessing Factor</p>
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div>
                    <p className="text-lg font-black text-green-600">{guessCorrect}</p>
                    <p className="text-[8px] font-bold text-slate-400 uppercase">Hits</p>
                  </div>
                  <div>
                    <p className="text-lg font-black text-red-600">{guessIncorrect}</p>
                    <p className="text-[8px] font-bold text-slate-400 uppercase">Misses</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-none">
              <CardContent className="pt-6">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">13. Pacing Analysis</p>
                <div className="flex flex-col items-center justify-center h-16">
                  <p className="text-2xl font-black text-slate-900">{Math.round(secondHalfAccuracy)}%</p>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">2nd Half Acc</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-slate-200 shadow-none border-l-orange-500 border-l-4">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-3">
                   <Flame className="w-3 h-3 text-orange-500" />
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">14. Stamina Index</p>
                </div>
                <div className="flex flex-col items-center justify-center h-16">
                  <p className={cn("text-2xl font-black", staminaIndex > 90 ? "text-green-600" : "text-orange-600")}>
                    {staminaIndex.toFixed(0)}%
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-none border-l-purple-500 border-l-4">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-3">
                   <BrainCircuit className="w-3 h-3 text-purple-500" />
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">15. Overthinking Count</p>
                </div>
                <div className="flex flex-col items-center justify-center h-16">
                  <p className="text-2xl font-black text-purple-600">{overthinkingCount}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-none border-l-red-500 border-l-4">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-3">
                   <ZapIcon className="w-3 h-3 text-red-500" />
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">16. Silly Errors</p>
                </div>
                <div className="flex flex-col items-center justify-center h-16">
                  <p className="text-2xl font-black text-red-600">{sillyErrorCount}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-none border-l-blue-500 border-l-4">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-3">
                   <Scale className="w-3 h-3 text-blue-500" />
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">17. Efficiency</p>
                </div>
                <div className="flex flex-col items-center justify-center h-16">
                  <p className="text-2xl font-black text-blue-600">{efficiencyRating}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* SECTION B: YIELD & EFFICIENCY */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold">B</div>
            <h2 className="text-xl font-bold text-slate-800">Yield & Efficiency</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="border-slate-200 shadow-none">
              <CardHeader>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-600" /> 19. Subject ROI (Marks/Min)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={subjectMetrics} layout="vertical">
                      <XAxis type="number" fontSize={10} />
                      <YAxis dataKey="name" type="category" fontSize={10} width={70} />
                      <Tooltip formatter={(val: number) => val.toFixed(2)} />
                      <Bar dataKey="roi" radius={[0, 4, 4, 0]}>
                        {subjectMetrics.map((_, i) => <Cell key={i} fill={['#10b981', '#3b82f6', '#f59e0b'][i % 3]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-none">
              <CardHeader>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Target className="w-4 h-4 text-orange-600" /> 20. Sectional Precision Audit
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={sectionalData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                      <XAxis dataKey="name" fontSize={10} />
                      <YAxis domain={[0, 100]} fontSize={10} />
                      <Tooltip />
                      <Bar dataKey="accuracy" name="Accuracy %" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="yield" name="Score %" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-slate-200 shadow-none">
              <CardContent className="pt-6">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">21. Cumulative Yield</p>
                <div className="h-[120px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={intervalData}>
                      <XAxis dataKey="time" hide />
                      <YAxis hide />
                      <Tooltip />
                      <Area type="stepAfter" dataKey="cumulativeScore" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.1} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-none">
              <CardContent className="pt-6">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">22. Effort Distribution</p>
                <div className="space-y-2 mt-2">
                  {subjectMetrics.map((s, i) => {
                    const pct = totalActiveTimeSeconds > 0 ? (s.timeInMinutes / (totalActiveTimeSeconds/60)) * 100 : 0;
                    return (
                      <div key={s.name} className="space-y-1">
                        <div className="flex justify-between text-[10px] font-bold">
                          <span>{s.name}</span>
                          <span>{pct.toFixed(0)}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div className={cn("h-full", ['bg-emerald-500', 'bg-blue-500', 'bg-amber-500'][i % 3])} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-none border-l-red-500 border-l-4">
              <CardContent className="pt-6">
                <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest mb-3">23. Waste-to-Effort Ratio</p>
                <div className="flex flex-col items-center justify-center h-20 text-center">
                  <p className="text-3xl font-black text-red-600">{totalActiveTimeSeconds > 0 ? ((timeOnIncorrect / totalActiveTimeSeconds) * 100).toFixed(1) : 0}%</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* SECTION D: QUESTION-WISE STATS */}
        <div className="space-y-6">
           <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold">D</div>
            <h2 className="text-xl font-bold text-slate-800">18. Question-wise Stats (Audit Log)</h2>
          </div>
          
          <Card className="border-slate-200 shadow-none overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="w-[80px]">Q No</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Your Response</TableHead>
                  <TableHead>Correct Key</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead className="text-right">Audit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(() => {
                  let globalQNum = 1;
                  return subjects.flatMap(sub => 
                    sub.sections.flatMap(sec => 
                      Array.from({ length: sec.numQuestions }, (_, i) => {
                        const qNumLocal = globalQNum++;
                        const qId = `${sec.id}-${i+1}`;
                        const res = responses[qId];
                        const key = answerKey[qId];
                        const score = calculateJEEAdvScore(res?.value, key, sec);
                        const hasNote = !!allNotes[qId];
                        return (
                          <TableRow key={qId} className="hover:bg-slate-50/50">
                            <TableCell className="font-bold">{qNumLocal}</TableCell>
                            <TableCell className="text-xs font-semibold text-slate-500">{sub.name}</TableCell>
                            <TableCell>
                              {res?.value ? (
                                <Badge variant="outline" className={cn(
                                  "font-mono text-[10px]",
                                  score > 0 ? "bg-green-50 text-green-700 border-green-200" : score < 0 ? "bg-red-50 text-red-700 border-red-200" : ""
                                )}>
                                  {Array.isArray(res.value) ? res.value.join(',') : res.value}
                                </Badge>
                              ) : '-'}
                            </TableCell>
                            <TableCell className="font-mono text-[10px] text-slate-400 font-bold">
                              {Array.isArray(key) ? key.join(',') : key || '-'}
                            </TableCell>
                            <TableCell className="text-xs font-mono font-medium">{res?.timeSpent || 0}s</TableCell>
                            <TableCell>
                               {score > 0 ? (
                                 <CheckCircle2 className="w-5 h-5 text-green-600" />
                               ) : score < 0 ? (
                                 <XCircle className="w-5 h-5 text-red-600" />
                               ) : (
                                 <span className="text-slate-300">-</span>
                               )}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className={cn("h-8 w-8", hasNote ? "text-blue-600" : "text-slate-300")}
                                onClick={() => openNoteDialog(qId)}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )
                  );
                })()}
              </TableBody>
            </Table>
          </Card>
        </div>

        <div className="flex justify-center pt-10">
          <button 
            onClick={onReset}
            className="px-12 py-4 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all shadow-lg hover:-translate-y-1"
          >
            DISCARD AUDIT & START NEW
          </button>
        </div>

      </div>

      <Dialog open={editingQId !== null} onOpenChange={(open) => !open && setEditingQId(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Clinical Audit: Question {editingQId}</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="mistake" className="w-full mt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="mistake">My Mistake</TabsTrigger>
              <TabsTrigger value="approach">Standard Approach</TabsTrigger>
            </TabsList>
            <TabsContent value="mistake" className="space-y-4 pt-4">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">What exactly went wrong?</p>
              <Textarea 
                placeholder="Ex: Conceptual gap in electromagnetism, calculation error in Step 3, misread 'not' in the question..."
                className="min-h-[150px]"
                value={currentNote.mistake}
                onChange={(e) => setCurrentNote(prev => ({ ...prev, mistake: e.target.value }))}
              />
            </TabsContent>
            <TabsContent value="approach" className="space-y-4 pt-4">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Optimized Solving Technique</p>
              <Textarea 
                placeholder="Ex: Start with energy conservation, use the ratio method for quicker calculation..."
                className="min-h-[150px]"
                value={currentNote.approach}
                onChange={(e) => setCurrentNote(prev => ({ ...prev, approach: e.target.value }))}
              />
            </TabsContent>
          </Tabs>
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setEditingQId(null)}>Cancel</Button>
            <Button onClick={saveNote} className="bg-blue-600 hover:bg-blue-700">Save Journal Entry</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function calculateJEEAdvScore(response: string | string[] | undefined, key: string | string[] | undefined, section: SectionConfig): number {
  if (!key) return 0;
  if (!response || (Array.isArray(response) && response.length === 0) || response === '') return 0;

  if (section.type === 'single') {
    return response === key ? section.positiveMarks : -section.negativeMarks;
  }

  if (section.type === 'multiple') {
    const resArr = Array.isArray(response) ? response : [response];
    const keyArr = Array.isArray(key) ? key : [key];

    const hasIncorrect = resArr.some(opt => !keyArr.includes(opt));
    if (hasIncorrect) return -section.negativeMarks;

    if (resArr.length === keyArr.length && resArr.every(opt => keyArr.includes(opt))) {
      return section.positiveMarks;
    }

    if (section.partialMarking && resArr.length > 0) {
       return Math.min(resArr.length, section.positiveMarks - 1);
    }

    return -section.negativeMarks;
  }

  if (section.type === 'numeric') {
    return response === key ? section.positiveMarks : -section.negativeMarks;
  }

  return 0;
}
