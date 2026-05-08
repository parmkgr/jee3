"use client"

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Trash2, Plus, Upload, Play, Settings2, BookOpen, History, Layers, PenTool, Lightbulb } from 'lucide-react';
import { SubjectConfig, TestConfiguration, QuestionType, SectionConfig } from '@/app/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';

interface TestConfigProps {
  onStart: (config: TestConfiguration) => void;
  onViewHistory: () => void;
  onViewJournal: () => void;
  onViewRepo: () => void;
}

export function TestConfig({ onStart, onViewHistory, onViewJournal, onViewRepo }: TestConfigProps) {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [examTime, setExamTime] = useState(180); 
  const [patternSections, setPatternSections] = useState<Omit<SectionConfig, 'id'>[]>([
    { name: 'Section 1 (SCQ)', type: 'single', numQuestions: 4, positiveMarks: 3, negativeMarks: 1, partialMarking: false },
    { name: 'Section 2 (MCQ)', type: 'multiple', numQuestions: 6, positiveMarks: 4, negativeMarks: 2, partialMarking: true },
    { name: 'Section 3 (Numerical)', type: 'numeric', numQuestions: 8, positiveMarks: 3, negativeMarks: 0, partialMarking: false }
  ]);

  const handleStart = () => {
    const subjectNames = ['Physics', 'Chemistry', 'Mathematics'];
    const finalSubjects: SubjectConfig[] = subjectNames.map((name, sIdx) => ({
      id: `sub-${sIdx}`,
      name: name,
      sections: patternSections.map((sec, secIdx) => ({
        ...sec,
        id: `sec-${sIdx}-${secIdx}`
      }))
    }));

    let total = 0;
    finalSubjects.forEach(sub => sub.sections.forEach(sec => total += sec.numQuestions));
    
    onStart({
      pdfUrl: pdfFile ? URL.createObjectURL(pdfFile) : null,
      pdfName: pdfFile?.name,
      subjects: finalSubjects,
      totalQuestions: total,
      totalTimeMinutes: examTime
    });
  };

  const updateSection = (idx: number, field: keyof Omit<SectionConfig, 'id'>, value: any) => {
    const newSections = [...patternSections];
    (newSections[idx] as any)[field] = value;
    setPatternSections(newSections);
  };

  const addSection = () => {
    setPatternSections([...patternSections, { 
      name: `Section ${patternSections.length + 1}`, 
      type: 'single', 
      numQuestions: 4, 
      positiveMarks: 3, 
      negativeMarks: 1, 
      partialMarking: false 
    }]);
  };

  const removeSection = (idx: number) => {
    if (patternSections.length <= 1) return;
    setPatternSections(patternSections.filter((_, i) => i !== idx));
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 text-slate-900">
      <ScrollArea className="h-screen w-full">
        <div className="flex flex-col items-center py-12 px-4 max-w-5xl mx-auto">
          <div className="w-full space-y-10">
            <div className="flex flex-col md:flex-row justify-between items-start gap-4">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
                  <BookOpen className="w-3.5 h-3.5" /> Exam Controller
                </div>
                <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">Mock Test Setup</h1>
                <p className="text-slate-500 text-lg max-w-2xl">Enter the pattern once; it clones for all subjects.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button 
                  variant="outline" 
                  onClick={onViewHistory}
                  className="rounded-xl h-10 border-slate-300 font-bold text-slate-600"
                >
                  <History className="w-4 h-4 mr-2" /> Audit Vault
                </Button>
                <Button 
                  variant="outline" 
                  onClick={onViewJournal}
                  className="rounded-xl h-10 border-slate-300 font-bold text-red-600"
                >
                  <PenTool className="w-4 h-4 mr-2" /> Mistake Journal
                </Button>
                <Button 
                  variant="outline" 
                  onClick={onViewRepo}
                  className="rounded-xl h-10 border-slate-300 font-bold text-emerald-600"
                >
                  <Lightbulb className="w-4 h-4 mr-2" /> Strategy Repo
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                  <CardTitle className="text-lg flex items-center gap-2 text-slate-800"><Upload className="w-4 h-4 text-blue-600" /> Question Paper</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-center w-full">
                    <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:bg-slate-50 transition-all">
                      <Upload className="w-10 h-10 mb-3 text-slate-400" />
                      <p className="text-sm text-slate-600 font-semibold">Drop your PDF here</p>
                      <input type="file" className="hidden" accept=".pdf" onChange={(e) => setPdfFile(e.target.files?.[0] || null)} />
                    </label>
                  </div>
                  {pdfFile && <p className="mt-4 text-[11px] font-bold text-blue-700 text-center uppercase">{pdfFile.name}</p>}
                </CardContent>
              </Card>

              <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                  <CardTitle className="text-lg flex items-center gap-2 text-slate-800"><Settings2 className="w-4 h-4 text-blue-600" /> Exam Duration</CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-slate-500">Minutes</Label>
                    <Input 
                      type="number" 
                      value={examTime} 
                      onChange={(e) => setExamTime(parseInt(e.target.value) || 0)}
                      className="h-12 text-xl font-black"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-8">
              <div className="flex items-center gap-4">
                <h2 className="text-xl font-bold text-slate-800 whitespace-nowrap flex items-center gap-2">
                  <Layers className="w-5 h-5 text-blue-600" /> Unified Exam Pattern
                </h2>
                <div className="h-[1px] w-full bg-slate-200" />
              </div>

              <Card className="bg-white border-slate-200 shadow-sm">
                <CardContent className="p-6 space-y-4">
                  {patternSections.map((section, idx) => (
                    <div key={idx} className="grid grid-cols-1 md:grid-cols-7 gap-4 items-end bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <div className="md:col-span-2 space-y-2">
                        <Label className="text-[10px] font-bold uppercase text-slate-400">Label</Label>
                        <Input value={section.name} onChange={(e) => updateSection(idx, 'name', e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase text-slate-400">Type</Label>
                        <Select value={section.type} onValueChange={(val: QuestionType) => updateSection(idx, 'type', val)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="single">Single</SelectItem>
                            <SelectItem value="multiple">Multi</SelectItem>
                            <SelectItem value="numeric">Numerical</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase text-slate-400">Qs/Sub</Label>
                        <Input type="number" value={section.numQuestions} onChange={(e) => updateSection(idx, 'numQuestions', parseInt(e.target.value) || 0)} />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-2">
                          <Label className="text-[10px] font-bold uppercase text-slate-400">Pos</Label>
                          <Input type="number" value={section.positiveMarks} onChange={(e) => updateSection(idx, 'positiveMarks', parseInt(e.target.value) || 0)} />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] font-bold uppercase text-slate-400">Neg</Label>
                          <Input type="number" value={section.negativeMarks} onChange={(e) => updateSection(idx, 'negativeMarks', parseInt(e.target.value) || 0)} />
                        </div>
                      </div>
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <Label className="text-[10px] font-bold uppercase text-slate-400">Partial</Label>
                        <Switch checked={section.partialMarking} onCheckedChange={(v) => updateSection(idx, 'partialMarking', v)} />
                      </div>
                      <div className="flex justify-end">
                        <Button variant="ghost" size="icon" onClick={() => removeSection(idx)}><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </div>
                  ))}
                  <Button variant="outline" className="w-full" onClick={addSection}><Plus className="w-3 h-3 mr-2" /> Add Section</Button>
                </CardContent>
              </Card>
            </div>

            <div className="pt-8 pb-24">
              <Button className="w-full h-16 text-xl font-bold bg-slate-900 text-white" onClick={handleStart}>
                <Play className="w-5 h-5 mr-3" /> Initialize Exam
              </Button>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
