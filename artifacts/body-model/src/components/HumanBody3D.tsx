import { useRef, useEffect, useState } from "react";
import type { BodyProportions } from "../lib/bodyMetrics";

interface Props {
  proportions: BodyProportions;
}

export default function HumanBody3D({ proportions: p }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 500, h: 700 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const { width, height } = e.contentRect;
      setSize({ w: Math.max(200, width), h: Math.max(400, height) });
    });
    ro.observe(el);
    setSize({ w: Math.max(200, el.clientWidth), h: Math.max(400, el.clientHeight) });
    return () => ro.disconnect();
  }, []);

  const { w: W, h: H } = size;
  const cx = W / 2;

  const totalH = p.totalHeight;
  const scale = (H * 0.94) / (totalH * 1.05);

  const py = (bodyY: number) => H * 0.03 + (totalH - bodyY) * scale;
  const px = (bodyX: number) => cx + bodyX * scale;

  const headTop = totalH;
  const headBot = totalH - p.headHeight;
  const headCy = (py(headTop) + py(headBot)) / 2;
  const headRx = p.headRadius * scale;
  const headRy = p.headRadius * scale * 1.18;

  const neckTop = headBot;
  const neckBot = headBot - p.neckLength;
  const nkW = p.neckRadius * scale;

  const torsoTop = neckBot;
  const torsoBot = torsoTop - p.torsoLength;

  const tTY = py(torsoTop);
  const tChY = py(torsoTop - p.torsoLength * 0.28);
  const tWaY = py(torsoTop - p.torsoLength * 0.60);
  const tHiY = py(torsoTop - p.torsoLength * 0.80);
  const tBY = py(torsoBot);

  const shW = p.shoulderWidth * 0.5 * scale;
  const chW = p.chestWidth * 0.5 * scale;
  const waW = p.waistWidth * 0.5 * scale;
  const hiW = p.hipWidth * 0.5 * scale;

  const armTopBody = torsoTop - p.torsoLength * 0.03;
  const elbowBody = armTopBody - p.upperArmLength;
  const wristBody = elbowBody - p.forearmLength;
  const handBotBody = wristBody - p.handLength;

  const atmY = py(armTopBody);
  const elbY = py(elbowBody);
  const wrtY = py(wristBody);
  const hndY = py(handBotBody);

  const uaR = p.upperArmRadius * scale;
  const faR = p.forearmRadius * scale;
  const haR = p.handRadius * scale * 1.35;

  const armCX = shW * 1.02 + uaR * 0.85;

  const legTopBody = torsoBot + p.torsoLength * 0.03;
  const kneeBody = legTopBody - p.thighLength;
  const ankleBody = kneeBody - p.shinLength;
  const footBotBody = ankleBody - p.footHeight;

  const lgTY = py(legTopBody);
  const knY = py(kneeBody);
  const anY = py(ankleBody);
  const ftY = py(footBotBody);

  const thR = p.thighRadius * scale;
  const shR = p.shinRadius * scale;
  const fW = p.footLength * scale * 0.52;
  const legCX = p.hipWidth * 0.27 * scale;

  const skin = "#D0906A";
  const skinHi = "#E8AD80";
  const skinSh = "#B5724F";
  const hairClr = "#3D2510";

  function arm(side: -1 | 1) {
    const d = side;
    const lx = cx + d * armCX;

    const outerPath = `
      M ${lx + d * uaR * 0.3} ${atmY}
      C ${lx + d * uaR * 1.1} ${atmY + 30}
        ${lx + d * uaR * 1.1} ${elbY - 20}
        ${lx + d * faR * 0.9} ${elbY}
      C ${lx + d * faR * 1.0} ${elbY + 10}
        ${lx + d * faR * 1.0} ${wrtY - 10}
        ${lx + d * haR * 0.5} ${wrtY}
      L ${lx + d * haR * 0.65} ${hndY}
    `;

    const innerPath = `
      L ${lx - d * haR * 0.65} ${hndY}
      L ${lx - d * haR * 0.5} ${wrtY}
      C ${lx - d * faR * 0.9} ${wrtY - 5}
        ${lx - d * faR * 0.8} ${elbY + 10}
        ${lx - d * faR * 0.7} ${elbY}
      C ${lx - d * faR * 1.0} ${elbY - 20}
        ${lx - d * uaR * 0.8} ${atmY + 30}
        ${lx - d * uaR * 0.3} ${atmY}
      Z
    `;

    return outerPath + innerPath;
  }

  function leg(side: -1 | 1) {
    const d = side;
    const lx = cx + d * legCX;

    return `
      M ${lx + d * thR * 0.2} ${lgTY}
      C ${lx + d * thR * 1.15} ${lgTY + 20}
        ${lx + d * thR * 1.15} ${knY - 30}
        ${lx + d * shR * 1.05} ${knY}
      C ${lx + d * shR * 1.1} ${knY + 15}
        ${lx + d * shR * 1.0} ${anY - 15}
        ${lx + d * shR * 0.55} ${anY}
      L ${lx + d * fW * 0.72} ${anY + 3}
      L ${lx + d * fW * 0.72} ${ftY + 3}
      L ${lx - d * fW * 0.28} ${ftY + 3}
      L ${lx - d * fW * 0.28} ${anY + 3}
      C ${lx - d * shR * 0.5} ${anY}
        ${lx - d * shR * 1.0} ${anY - 20}
        ${lx - d * shR * 1.0} ${knY}
      C ${lx - d * shR * 1.15} ${knY - 30}
        ${lx - d * thR * 1.0} ${lgTY + 20}
        ${lx - d * thR * 0.2} ${lgTY}
      Z
    `;
  }

  const torsoBez = `
    M ${cx - nkW} ${py(neckBot)}
    C ${cx - nkW * 2.0} ${py(neckBot) + 6}
      ${cx - shW * 0.65} ${tTY - 12}
      ${cx - shW} ${tTY}
    C ${cx - shW * 1.05} ${tChY - 18}
      ${cx - chW * 1.1} ${tChY}
      ${cx - chW} ${tChY}
    C ${cx - chW * 1.04} ${tWaY - 10}
      ${cx - waW * 1.06} ${tWaY}
      ${cx - waW} ${tWaY}
    C ${cx - waW * 1.02} ${tHiY - 5}
      ${cx - hiW * 1.0} ${tHiY}
      ${cx - hiW} ${tHiY}
    C ${cx - hiW * 1.02} ${tBY - 8}
      ${cx - legCX * 1.3} ${tBY}
      ${cx - legCX * 1.08} ${tBY}
    L ${cx + legCX * 1.08} ${tBY}
    C ${cx + legCX * 1.3} ${tBY}
      ${cx + hiW * 1.02} ${tBY - 8}
      ${cx + hiW} ${tHiY}
    C ${cx + hiW * 1.0} ${tHiY}
      ${cx + waW * 1.02} ${tHiY - 5}
      ${cx + waW} ${tWaY}
    C ${cx + waW * 1.06} ${tWaY}
      ${cx + chW * 1.04} ${tWaY - 10}
      ${cx + chW} ${tChY}
    C ${cx + chW * 1.1} ${tChY}
      ${cx + shW * 1.05} ${tChY - 18}
      ${cx + shW} ${tTY}
    C ${cx + shW * 0.65} ${tTY - 12}
      ${cx + nkW * 2.0} ${py(neckBot) + 6}
      ${cx + nkW} ${py(neckBot)}
    Z
  `;

  const nkTopY = py(neckTop);
  const nkBotY = py(neckBot);

  return (
    <div ref={containerRef} className="w-full h-full select-none">
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: "block" }}>
        <defs>
          {/* Skin gradients */}
          <radialGradient id="bgGrad" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#F0F2F8" />
          </radialGradient>

          <radialGradient id="headGrad" cx="40%" cy="35%" r="58%">
            <stop offset="0%" stopColor={skinHi} />
            <stop offset="60%" stopColor={skin} />
            <stop offset="100%" stopColor={skinSh} />
          </radialGradient>

          <linearGradient id="torsoGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={skinSh} stopOpacity="0.95" />
            <stop offset="18%" stopColor={skinHi} />
            <stop offset="50%" stopColor={skin} />
            <stop offset="82%" stopColor={skinHi} />
            <stop offset="100%" stopColor={skinSh} stopOpacity="0.95" />
          </linearGradient>

          <linearGradient id="larmGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={skinSh} />
            <stop offset="35%" stopColor={skin} />
            <stop offset="100%" stopColor={skinHi} />
          </linearGradient>
          <linearGradient id="rarmGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={skinHi} />
            <stop offset="65%" stopColor={skin} />
            <stop offset="100%" stopColor={skinSh} />
          </linearGradient>

          <linearGradient id="llegGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={skinSh} />
            <stop offset="35%" stopColor={skin} />
            <stop offset="100%" stopColor={skinHi} />
          </linearGradient>
          <linearGradient id="rlegGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={skinHi} />
            <stop offset="65%" stopColor={skin} />
            <stop offset="100%" stopColor={skinSh} />
          </linearGradient>

          <filter id="blur2">
            <feGaussianBlur stdDeviation="2" />
          </filter>
        </defs>

        {/* Background soft gradient */}
        <rect x="0" y="0" width={W} height={H} fill="url(#bgGrad)" rx="12" />

        {/* Drop shadow under feet */}
        <ellipse
          cx={cx}
          cy={ftY + 16}
          rx={hiW * 0.85}
          ry={9}
          fill="rgba(0,0,0,0.10)"
          filter="url(#blur2)"
        />

        {/* LEFT ARM */}
        <path d={arm(-1)} fill="url(#larmGrad)" stroke={skinSh} strokeWidth="0.7" />

        {/* RIGHT ARM */}
        <path d={arm(1)} fill="url(#rarmGrad)" stroke={skinSh} strokeWidth="0.7" />

        {/* LEFT LEG */}
        <path d={leg(-1)} fill="url(#llegGrad)" stroke={skinSh} strokeWidth="0.7" />

        {/* RIGHT LEG */}
        <path d={leg(1)} fill="url(#rlegGrad)" stroke={skinSh} strokeWidth="0.7" />

        {/* TORSO */}
        <path d={torsoBez} fill="url(#torsoGrad)" stroke={skinSh} strokeWidth="0.7" />

        {/* NECK */}
        <path
          d={`M ${cx - nkW * 1.05} ${nkTopY} L ${cx - nkW} ${nkBotY} L ${cx + nkW} ${nkBotY} L ${cx + nkW * 1.05} ${nkTopY} Z`}
          fill={skin}
          stroke={skinSh}
          strokeWidth="0.5"
        />

        {/* HEAD */}
        <ellipse cx={cx} cy={headCy} rx={headRx} ry={headRy} fill="url(#headGrad)" stroke={skinSh} strokeWidth="0.7" />

        {/* EARS */}
        <ellipse cx={cx - headRx * 1.01} cy={headCy + headRy * 0.04} rx={headRx * 0.11} ry={headRy * 0.20} fill={skin} stroke={skinSh} strokeWidth="0.5" />
        <ellipse cx={cx + headRx * 1.01} cy={headCy + headRy * 0.04} rx={headRx * 0.11} ry={headRy * 0.20} fill={skin} stroke={skinSh} strokeWidth="0.5" />

        {/* HAIR */}
        <ellipse cx={cx} cy={headCy - headRy * 0.84} rx={headRx * 1.01} ry={headRy * 0.32} fill={hairClr} />
        <rect x={cx - headRx * 1.01} y={headCy - headRy * 1.01} width={headRx * 2.02} height={headRy * 0.25} fill={hairClr} rx={headRx * 0.3} />

        {/* EYES */}
        <ellipse cx={cx - headRx * 0.27} cy={headCy - headRy * 0.10} rx={headRx * 0.13} ry={headRy * 0.08} fill="rgba(30,18,10,0.88)" />
        <ellipse cx={cx + headRx * 0.27} cy={headCy - headRy * 0.10} rx={headRx * 0.13} ry={headRy * 0.08} fill="rgba(30,18,10,0.88)" />
        {/* Eye shine */}
        <ellipse cx={cx - headRx * 0.24} cy={headCy - headRy * 0.125} rx={headRx * 0.035} ry={headRy * 0.025} fill="rgba(255,255,255,0.7)" />
        <ellipse cx={cx + headRx * 0.30} cy={headCy - headRy * 0.125} rx={headRx * 0.035} ry={headRy * 0.025} fill="rgba(255,255,255,0.7)" />

        {/* NOSE */}
        <path
          d={`M ${cx} ${headCy - headRy * 0.05} 
              Q ${cx - headRx * 0.08} ${headCy + headRy * 0.13} ${cx - headRx * 0.1} ${headCy + headRy * 0.20}
              M ${cx} ${headCy - headRy * 0.05}
              Q ${cx + headRx * 0.08} ${headCy + headRy * 0.13} ${cx + headRx * 0.1} ${headCy + headRy * 0.20}`}
          fill="none"
          stroke={skinSh}
          strokeWidth={Math.max(0.8, headRx * 0.045)}
          strokeLinecap="round"
          opacity="0.55"
        />

        {/* MOUTH */}
        <path
          d={`M ${cx - headRx * 0.18} ${headCy + headRy * 0.32} Q ${cx} ${headCy + headRy * 0.42} ${cx + headRx * 0.18} ${headCy + headRy * 0.32}`}
          fill="none"
          stroke="rgba(110,50,35,0.65)"
          strokeWidth={Math.max(0.8, headRx * 0.05)}
          strokeLinecap="round"
        />

        {/* ELBOW joints */}
        <circle cx={cx - armCX} cy={elbY} r={faR * 1.0} fill={skin} stroke={skinSh} strokeWidth="0.5" />
        <circle cx={cx + armCX} cy={elbY} r={faR * 1.0} fill={skin} stroke={skinSh} strokeWidth="0.5" />

        {/* KNEE joints */}
        <ellipse cx={cx - legCX} cy={knY} rx={shR * 1.2} ry={shR * 1.05} fill={skin} stroke={skinSh} strokeWidth="0.5" />
        <ellipse cx={cx + legCX} cy={knY} rx={shR * 1.2} ry={shR * 1.05} fill={skin} stroke={skinSh} strokeWidth="0.5" />

        {/* CHEST line */}
        <path
          d={`M ${cx - chW * 0.78} ${tChY - 2} Q ${cx} ${tChY + 10} ${cx + chW * 0.78} ${tChY - 2}`}
          fill="none"
          stroke={skinSh}
          strokeWidth="1.4"
          strokeLinecap="round"
          opacity="0.22"
        />

        {/* MID LINE */}
        <line x1={cx} y1={nkBotY + 6} x2={cx} y2={tBY - 6} stroke={skinSh} strokeWidth="0.9" opacity="0.20" />

        {/* HEIGHT RULER */}
        {(() => {
          const rx = cx + shW + armCX + haR + 18;
          const topY = py(totalH);
          const botY = ftY + 4;
          return (
            <g opacity="0.55">
              <line x1={rx} y1={topY} x2={rx} y2={botY} stroke="hsl(220 70% 50%)" strokeWidth="1" strokeDasharray="3,2" />
              <line x1={rx - 4} y1={topY} x2={rx + 4} y2={topY} stroke="hsl(220 70% 50%)" strokeWidth="1.2" />
              <line x1={rx - 4} y1={botY} x2={rx + 4} y2={botY} stroke="hsl(220 70% 50%)" strokeWidth="1.2" />
              <text
                x={rx + 7}
                y={(topY + botY) / 2 + 4}
                fill="hsl(220 70% 45%)"
                fontSize={Math.min(11, Math.max(9, scale * 0.02))}
                fontFamily="system-ui, sans-serif"
                fontWeight="600"
              >
                {Math.round(p.totalHeight * 100)} см
              </text>
            </g>
          );
        })()}
      </svg>
    </div>
  );
}
