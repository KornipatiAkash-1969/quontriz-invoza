import React from 'react';
import { CheckCircle2, Loader2, Circle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const STEPS = [
  { id: 1, label: 'Uploading PDF...' },
  { id: 2, label: 'Reading PDF...' },
  { id: 3, label: 'Running OCR...' },
  { id: 4, label: 'Extracting invoice information...' },
  { id: 5, label: 'Identifying vendor...' },
  { id: 6, label: 'Classifying items...' },
  { id: 7, label: 'Completed' },
];

export default function ProcessingStepIndicator({ currentStep = 1 }) {
  const { isOwner } = useAuth();

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm max-w-xl mx-auto w-full">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
        <h4 className="font-semibold text-slate-800 text-sm">Processing Pipeline</h4>
        <span
          className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
            isOwner
              ? 'bg-indigo-50 text-indigo-700 border-indigo-100'
              : 'bg-emerald-50 text-emerald-700 border-emerald-100'
          }`}
        >
          Step {Math.min(currentStep, 7)} of 7
        </span>
      </div>

      <div className="space-y-3">
        {STEPS.map((step) => {
          const isFinished = currentStep > step.id;
          const isCurrent = currentStep === step.id;
          const isPending = currentStep < step.id;

          return (
            <div
              key={step.id}
              className={`flex items-center gap-3.5 p-2.5 rounded-xl transition-all duration-300 ${
                isCurrent
                  ? isOwner
                    ? 'bg-indigo-50/70 border border-indigo-100 shadow-xs'
                    : 'bg-emerald-50/70 border border-emerald-100 shadow-xs'
                  : isFinished
                  ? 'bg-slate-50/50'
                  : 'opacity-50'
              }`}
            >
              <div className="flex-shrink-0">
                {isFinished ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 animate-in fade-in" />
                ) : isCurrent ? (
                  <Loader2
                    className={`w-5 h-5 animate-spin ${
                      isOwner ? 'text-indigo-600' : 'text-emerald-600'
                    }`}
                  />
                ) : (
                  <Circle className="w-5 h-5 text-slate-300" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm font-medium ${
                    isCurrent
                      ? isOwner
                        ? 'text-indigo-900 font-semibold'
                        : 'text-emerald-900 font-semibold'
                      : isFinished
                      ? 'text-slate-700'
                      : 'text-slate-400'
                  }`}
                >
                  {step.label}
                </p>
              </div>

              {isFinished && (
                <span className="text-[11px] font-medium text-emerald-600">Done</span>
              )}
              {isCurrent && (
                <span
                  className={`text-[11px] font-semibold animate-pulse ${
                    isOwner ? 'text-indigo-600' : 'text-emerald-600'
                  }`}
                >
                  Processing...
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
