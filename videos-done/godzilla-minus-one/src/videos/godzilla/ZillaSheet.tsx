// Dev sheet: kaiju variants / poses and the creature + effect drawings, drawn flat (no WebGL) for fast checks.
import React, { useLayoutEffect, useRef } from "react";
import { AbsoluteFill } from "remotion";
import { Pen } from "./toon";
import { drawKaiju, ZOpts, gorilla, whale, rival, threeHead, mushroom, chute, board, moneyBag, statue, fireball } from "./kaiju";

const CELLS: ZOpts[] = [
  { v: "m1" }, { v: "m1", pose: "roar" }, { v: "m1", pose: "breath", glow: 1 }, { v: "m1", pose: "walk", phase: 0.25 },
  { v: "showa", pose: "wave", eye: "friendly" }, { v: "showa", pose: "hop", eye: "friendly" }, { v: "heisei" }, { v: "shin" },
  { v: "mv", pose: "roar" }, { v: "suitOpen", sweat: 0.3 }, { v: "suit", pose: "walk", phase: 0.6 }, { v: "sil", glow: 0.8, rim: "#ffb070" },
  { v: "sunk", pose: "sink", eye: "x", regrow: 0.7 }, { v: "showa", pose: "punch" },
];
export const ZillaSheet: React.FC = () => {
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const g = ref.current!.getContext("2d")!;
    g.fillStyle = "#cfe3f2"; g.fillRect(0, 0, 1440, 2000);
    const cw = 360;
    CELLS.forEach((o, i) => {
      const x = (i % 4) * cw, y = Math.floor(i / 4) * cw;
      g.setTransform(cw / 1000, 0, 0, cw / 1000, x, y); drawKaiju(new Pen(g), o);
      g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = "#000"; g.font = "16px sans-serif"; g.fillText(`${o.v} ${o.pose ?? ""}`, x + 6, y + 16);
    });
    const at = (x: number, y: number, s: number, fn: (p: Pen) => void) => { g.setTransform(s, 0, 0, s, x, y); fn(new Pen(g)); g.setTransform(1, 0, 0, 1, 0, 0); };
    at(720, 1080, 0.3, gorilla); at(900, 1080, 0.25, whale); at(1080, 1080, 0.3, (p) => rival(p, 0.5));
    at(0, 1440, 0.35, (p) => threeHead(p, 1)); at(360, 1440, 0.3, (p) => mushroom(p, 1)); at(600, 1440, 0.3, chute);
    at(780, 1440, 0.3, (p) => board(p, 2, 1)); at(1150, 1440, 0.3, (p) => moneyBag(p, "$15M")); at(1300, 1440, 0.3, (p) => statue(p, 1));
    at(1150, 1700, 0.4, (p) => fireball(p, 1));
  }, []);
  return <AbsoluteFill style={{ background: "#cfe3f2" }}><canvas ref={ref} width={1440} height={2000} /></AbsoluteFill>;
};
