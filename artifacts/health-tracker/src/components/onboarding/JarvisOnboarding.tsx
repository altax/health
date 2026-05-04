import { useState, useEffect, useRef, forwardRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

export interface OnboardingData {
  name: string;
  sex: "male" | "female";
  age: number;
  height: number;
  weight: number;
  bodyFat?: number;
  activityLevel: "sedentary" | "lightly_active" | "moderately_active" | "very_active" | "extremely_active";
  goals: string[];
}

interface Props {
  onComplete: (data: OnboardingData) => void;
}

function useTypewriter(text: string, speed = 30, startDelay = 0) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  useEffect(() => {
    setDisplayed("");
    setDone(false);
    let i = 0;
    const timer = setTimeout(() => {
      const interval = setInterval(() => {
        if (i < text.length) { setDisplayed(text.slice(0, i + 1)); i++; }
        else { clearInterval(interval); setDone(true); }
      }, speed);
      return () => clearInterval(interval);
    }, startDelay);
    return () => clearTimeout(timer);
  }, [text]);
  return { displayed, done };
}

const STEPS = [
  { id: "name",     prompt: "Привет. Как тебя зовут?",                                    type: "text" as const,        placeholder: "Введи своё имя" },
  { id: "sex",      prompt: "Приятно познакомиться, {name}. Укажи биологический пол.",     type: "choice" as const,      options: [{ label: "Мужской", value: "male" }, { label: "Женский", value: "female" }] },
  { id: "age",      prompt: "Сколько тебе лет?",                                           type: "number" as const,      placeholder: "30",  unit: "лет", min: 10, max: 100 },
  { id: "height",   prompt: "Твой рост?",                                                  type: "number" as const,      placeholder: "175", unit: "см",  min: 100, max: 250 },
  { id: "weight",   prompt: "Текущий вес?",                                                type: "number" as const,      placeholder: "70",  unit: "кг",  min: 30,  max: 300 },
  { id: "bodyFat",  prompt: "Примерный процент жира? (можно пропустить)",                  type: "number" as const,      placeholder: "20",  unit: "%",   min: 3,   max: 70, optional: true },
  { id: "activity", prompt: "Насколько ты активен в жизни?",                               type: "choice" as const,      options: [
    { label: "Сижу большую часть дня",          value: "sedentary" },
    { label: "Лёгкая активность 1–3 дня/нед.",  value: "lightly_active" },
    { label: "Умеренная активность 3–5 дней",   value: "moderately_active" },
    { label: "Высокая активность 6–7 дней",     value: "very_active" },
    { label: "Спортсмен / физ. труд",           value: "extremely_active" },
  ]},
  { id: "goals",    prompt: "Что хочешь оптимизировать?",                                  type: "multiselect" as const },
];

const GOAL_OPTIONS = [
  "Снизить вес","Набрать мышцы","Больше энергии","Улучшить сон",
  "Оптимизировать питание","Снизить стресс","Улучшить анализы","Общее здоровье",
];

export default function JarvisOnboarding({ onComplete }: Props) {
  const [stepIdx, setStepIdx]         = useState(0);
  const [data, setData]               = useState<Partial<OnboardingData>>({});
  const [inputVal, setInputVal]       = useState("");
  const [selectedGoals, setGoals]     = useState<string[]>([]);
  const [phase, setPhase]             = useState<"intro" | "questions" | "building">("intro");
  const [introStep, setIntroStep]     = useState(0);
  const inputRef                       = useRef<HTMLInputElement>(null);

  const introLines = [
    "Инициализация системы здоровья...",
    "Загрузка биометрических модулей...",
    "Готов к калибровке. Начнём.",
  ];

  const currentStep  = STEPS[stepIdx];
  const promptText   = currentStep?.prompt.replace("{name}", data.name ?? "") ?? "";
  const { displayed: typedPrompt, done: promptDone } = useTypewriter(
    phase === "intro" ? "" : promptText, 25
  );
  const { displayed: introText, done: introDone } = useTypewriter(
    introLines[introStep] ?? "", 22
  );

  useEffect(() => {
    if (phase !== "intro") return;
    if (!introDone) return;
    if (introStep < introLines.length - 1) {
      const t = setTimeout(() => setIntroStep(s => s + 1), 700);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setPhase("questions"), 1200);
    return () => clearTimeout(t);
  }, [introDone, introStep, phase]);

  useEffect(() => {
    if (phase === "questions" && promptDone) inputRef.current?.focus();
  }, [promptDone, stepIdx, phase]);

  function advance(value?: string) {
    const step = STEPS[stepIdx];
    if (!step) return;
    const next: Partial<OnboardingData> = { ...data };
    if (step.id === "name")     next.name          = value ?? inputVal;
    if (step.id === "sex")      next.sex           = (value ?? inputVal) as OnboardingData["sex"];
    if (step.id === "age")      next.age           = Number(value ?? inputVal);
    if (step.id === "height")   next.height        = Number(value ?? inputVal);
    if (step.id === "weight")   next.weight        = Number(value ?? inputVal);
    if (step.id === "bodyFat")  { const v = value ?? inputVal; if (v) next.bodyFat = Number(v); }
    if (step.id === "activity") next.activityLevel = (value ?? inputVal) as OnboardingData["activityLevel"];
    if (step.id === "goals")    next.goals         = selectedGoals;
    setData(next);
    setInputVal("");

    if (stepIdx < STEPS.length - 1) { setStepIdx(s => s + 1); }
    else { finish(next as OnboardingData); }
  }

  function finish(d: OnboardingData) {
    setPhase("building");
    setTimeout(() => onComplete(d), 3200);
  }

  const step = STEPS[stepIdx];

  return (
    <div className="fixed inset-0 bg-[#020209] flex flex-col items-center justify-center overflow-hidden select-none">
      <div className="aurora" />
      <div className="grid-bg absolute inset-0 opacity-60" />
      <div className="scan-line" />

      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
        className="absolute top-8 left-1/2 -translate-x-1/2 flex items-center gap-3"
      >
        <JarvisLogo />
        <span className="text-[11px] tracking-[0.45em] text-cyan-400/50 uppercase font-light">
          Health Intelligence
        </span>
      </motion.div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-lg px-8">
        <AnimatePresence mode="wait">
          {phase === "building" ? (
            <motion.div key="building" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }} className="text-center">
              <BuildingBody name={data.name ?? ""} />
            </motion.div>
          ) : (
            <motion.div
              key={phase === "intro" ? "intro" : `step-${stepIdx}`}
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-10"
            >
              <div className="min-h-14">
                <p className="text-[1.35rem] font-light text-white/90 leading-relaxed tracking-wide">
                  {phase === "intro" ? introText : typedPrompt}
                  {!(phase === "intro" ? introDone : promptDone) && <span className="cursor" />}
                </p>
              </div>

              <AnimatePresence>
                {phase === "questions" && promptDone && step && (
                  <motion.div
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35 }}
                  >
                    {step.type === "text" && (
                      <JInput
                        ref={inputRef}
                        value={inputVal}
                        onChange={setInputVal}
                        placeholder={step.placeholder ?? ""}
                        onSubmit={() => inputVal.trim() && advance()}
                      />
                    )}
                    {step.type === "number" && (
                      <JNumber
                        ref={inputRef}
                        value={inputVal}
                        onChange={setInputVal}
                        placeholder={step.placeholder ?? ""}
                        unit={step.unit ?? ""}
                        onSubmit={() => inputVal && advance()}
                        optional={step.optional}
                        onSkip={() => advance("")}
                      />
                    )}
                    {step.type === "choice" && (
                      <JChoice
                        options={(step.options as { label: string; value: string }[])}
                        onSelect={advance}
                      />
                    )}
                    {step.type === "multiselect" && (
                      <JMulti
                        options={GOAL_OPTIONS}
                        selected={selectedGoals}
                        onChange={setGoals}
                        onSubmit={() => advance()}
                      />
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Progress dots */}
      {phase === "questions" && (
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex gap-1.5">
          {STEPS.map((_, i) => (
            <div key={i} className={`h-[3px] rounded-full transition-all duration-500 ${
              i < stepIdx  ? "w-5 bg-cyan-400/40" :
              i === stepIdx ? "w-7 bg-cyan-400 shadow-[0_0_8px_rgba(110,231,247,0.7)]" :
              "w-3 bg-white/8"
            }`} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── sub-components ─────────────────────────────────────────────────────────

function JarvisLogo() {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
      <circle cx="13" cy="13" r="12" stroke="rgba(110,231,247,0.25)" strokeWidth="1"/>
      <circle cx="13" cy="13" r="8"  stroke="rgba(110,231,247,0.45)" strokeWidth="1"/>
      <circle cx="13" cy="13" r="3"  fill="rgba(110,231,247,0.85)"/>
      {[0,90,180,270].map(a => (
        <line key={a}
          x1={13 + Math.cos(a*Math.PI/180)*8.5}  y1={13 + Math.sin(a*Math.PI/180)*8.5}
          x2={13 + Math.cos(a*Math.PI/180)*12.5} y2={13 + Math.sin(a*Math.PI/180)*12.5}
          stroke="rgba(110,231,247,0.5)" strokeWidth="1"/>
      ))}
    </svg>
  );
}

function BuildingBody({ name }: { name: string }) {
  const [step, setStep] = useState(0);
  const msgs = [
    "Анализирую параметры тела...",
    "Строю скелетную модель...",
    "Рассчитываю состав тела...",
    "Калибрую метаболические алгоритмы...",
    "Готово. Запускаю интерфейс.",
  ];
  useEffect(() => {
    const ts = msgs.map((_, i) => setTimeout(() => setStep(i), i * 600));
    return () => ts.forEach(clearTimeout);
  }, []);
  return (
    <div className="space-y-7">
      <div className="relative mx-auto w-20 h-20">
        <svg className="ring-1 absolute inset-0 w-20 h-20" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r="36" fill="none" stroke="rgba(110,231,247,0.12)" strokeWidth="1"/>
          <circle cx="40" cy="40" r="36" fill="none" stroke="rgba(110,231,247,0.65)" strokeWidth="1.5"
            strokeDasharray="54 172" strokeLinecap="round"/>
        </svg>
        <svg className="ring-2 absolute inset-0 w-20 h-20" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r="26" fill="none" stroke="rgba(168,85,247,0.35)" strokeWidth="1"
            strokeDasharray="30 133" strokeLinecap="round"/>
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_14px_rgba(110,231,247,0.9)]"/>
        </div>
      </div>
      <div className="space-y-2 text-left max-w-[260px] mx-auto">
        {msgs.slice(0, step + 1).map((m, i) => (
          <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: i < step ? 0.35 : 1, x: 0 }}
            className="flex items-center gap-3 text-sm">
            <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${i < step
              ? "bg-cyan-400/30" : "bg-cyan-400 shadow-[0_0_7px_rgba(110,231,247,0.8)]"}`}/>
            <span className={i < step ? "text-white/25" : "text-cyan-300"}>{m}</span>
          </motion.div>
        ))}
      </div>
      {step >= 2 && <p className="text-white/18 text-xs">Добро пожаловать, {name}</p>}
    </div>
  );
}

const JInput = forwardRef<HTMLInputElement, {
  value: string; onChange: (v: string) => void; placeholder: string; onSubmit: () => void;
}>(({ value, onChange, placeholder, onSubmit }, ref) => (
  <div className="relative">
    <input ref={ref} value={value} onChange={e => onChange(e.target.value)}
      onKeyDown={e => e.key === "Enter" && onSubmit()}
      placeholder={placeholder}
      className="w-full bg-transparent border-b border-white/18 focus:border-cyan-400/60 pb-3 text-xl text-white placeholder:text-white/15 outline-none transition-colors caret-cyan-400"
    />
    {value && (
      <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={onSubmit}
        className="absolute right-0 bottom-3 text-cyan-400 text-[11px] tracking-[0.3em] uppercase">
        Далее →
      </motion.button>
    )}
  </div>
));

const JNumber = forwardRef<HTMLInputElement, {
  value: string; onChange: (v: string) => void; placeholder: string;
  unit: string; onSubmit: () => void; optional?: boolean; onSkip?: () => void;
}>(({ value, onChange, placeholder, unit, onSubmit, optional, onSkip }, ref) => (
  <div className="space-y-4">
    <div className="flex items-end gap-3">
      <input ref={ref} type="number" value={value} onChange={e => onChange(e.target.value)}
        onKeyDown={e => e.key === "Enter" && value && onSubmit()}
        placeholder={placeholder}
        className="flex-1 bg-transparent border-b border-white/18 focus:border-cyan-400/60 pb-3 text-4xl font-light text-white placeholder:text-white/12 outline-none transition-colors caret-cyan-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
      <span className="text-white/25 text-lg pb-3">{unit}</span>
    </div>
    <div className="flex gap-4">
      {value && <button onClick={onSubmit} className="text-cyan-400 text-[11px] tracking-[0.3em] uppercase">Далее →</button>}
      {optional && <button onClick={onSkip} className="text-white/20 text-[11px]">Пропустить</button>}
    </div>
  </div>
));

function JChoice({ options, onSelect }: { options: { label: string; value: string }[]; onSelect: (v: string) => void }) {
  return (
    <div className="space-y-2">
      {options.map((opt, i) => (
        <motion.button key={opt.value}
          initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.055, duration: 0.3 }}
          onClick={() => onSelect(opt.value)}
          className="w-full text-left px-4 py-3.5 rounded-xl glass border border-white/6 hover:border-cyan-400/35 hover:bg-cyan-400/5 text-white/65 hover:text-white transition-all duration-200 text-sm group"
        >
          <span className="text-cyan-400/35 group-hover:text-cyan-400 mr-3 font-mono text-xs transition-colors">
            {String(i+1).padStart(2,"0")}
          </span>
          {opt.label}
        </motion.button>
      ))}
    </div>
  );
}

function JMulti({ options, selected, onChange, onSubmit }: {
  options: string[]; selected: string[]; onChange: (v: string[]) => void; onSubmit: () => void;
}) {
  const toggle = (o: string) =>
    onChange(selected.includes(o) ? selected.filter(x => x !== o) : [...selected, o]);
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {options.map((o, i) => {
          const on = selected.includes(o);
          return (
            <motion.button key={o} initial={{ opacity: 0, scale: 0.88 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.04 }} onClick={() => toggle(o)}
              className={`px-4 py-2 rounded-full text-sm transition-all duration-200 border ${
                on ? "bg-cyan-400/12 border-cyan-400/55 text-cyan-300 shadow-[0_0_12px_rgba(110,231,247,0.18)]"
                   : "border-white/10 text-white/35 hover:border-white/20 hover:text-white/55"
              }`}
            >{o}</motion.button>
          );
        })}
      </div>
      {selected.length > 0 && (
        <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={onSubmit}
          className="text-cyan-400 text-[11px] tracking-[0.3em] uppercase">
          Готово ({selected.length}) →
        </motion.button>
      )}
    </div>
  );
}
