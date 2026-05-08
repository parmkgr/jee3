"use client"

import { useState, useEffect } from 'react';
import { SavedTest } from '@/app/lib/types';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, PenTool, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface MistakeJournalProps {
  onBack: () => void;
}

const subjectColors: Record<string, string> = {
  'Physics': 'bg-blue-50 text-blue-700 border-blue-200',
  'Chemistry': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Mathematics': 'bg-orange-50 text-orange-700 border-orange-200',
};

export function MistakeJournal({ onBack }: MistakeJournalProps) {
  const [mistakes, setMistakes] = useState<{ testDate: string; qId: string; note: string; subject: string }[]>([]);

  useEffect(() => {
    const history: SavedTest[] = JSON.parse(localStorage.getItem('brutal_score_history') || '[]');
    const extracted: any[] = [];
    
    history.forEach(test => {
      if (test.notes) {
        Object.entries(test.notes).forEach(([qId, note]) => {
          if (note.mistake && note.mistake.trim()) {
            // Find subject name for this Q
            let subjectName = "General";
            test.config.subjects.forEach(sub => {
              if (sub.sections.some(sec => qId.startsWith(sec.id))) {
                subjectName = sub.name;
              }
            });

            extracted.push({
              testDate: test.date,
              qId,
              note: note.mistake,
              subject: subjectName
            });
          }
        });
      }
    });

    setMistakes(extracted.reverse()); // Newest first
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 flex flex-col">
      <div className="max-w-4xl mx-auto w-full space-y-8 flex-1">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
              <PenTool className="w-8 h-8 text-red-600" /> Mistake Journal
            </h1>
            <p className="text-slate-500 font-medium">Clinical Audit of all recorded errors</p>
          </div>
          <Button variant="outline" onClick={onBack} className="rounded-xl border-slate-300">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
        </div>

        {mistakes.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center bg-white border border-dashed border-slate-300 rounded-2xl text-slate-400">
            <PenTool className="w-12 h-12 mb-4 opacity-20" />
            <p className="font-bold">Journal is empty</p>
            <p className="text-sm">Start auditing your tests to log mistakes.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {mistakes.map((m, idx) => (
              <Card key={idx} className="border-slate-200 shadow-sm hover:border-red-200 transition-colors">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                       <Badge variant="outline" className={cn("text-[10px] font-black uppercase tracking-wider", subjectColors[m.subject] || 'bg-slate-50 text-slate-600 border-slate-200')}>
                         {m.subject}
                       </Badge>
                       <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Question {m.qId}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                      <Calendar className="w-3 h-3" /> {format(new Date(m.testDate), 'PP')}
                    </div>
                  </div>
                  <p className="text-slate-700 leading-relaxed font-medium">
                    {m.note}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}