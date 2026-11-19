// Dev sheet: every character drawn flat (no WebGL) to check the drawings fast.
import React, { useLayoutEffect, useRef } from "react";
import { AbsoluteFill, getInputProps } from "remotion";
import { Pen } from "./toon";
import { CAST, drawHero, HeroOpts } from "./heroes";

export const CastSheet: React.FC = () => {
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const g = ref.current!.getContext("2d")!;
    g.fillStyle = "#cfe3f2"; g.fillRect(0, 0, 1440, 2000);
    const ids = Object.keys(CAST), cols = 8, cw = 180, chh = 300;
    const opts = (getInputProps() as { opts?: HeroOpts }).opts ?? {};
    ids.forEach((id, i) => {
      const x = (i % cols) * cw, y = Math.floor(i / cols) * (chh + 22);
      g.setTransform(cw / 600, 0, 0, chh / 1000, x, y);
      drawHero(new Pen(g), CAST[id], { expr: "smile", seed: i + 1, ...opts });
      g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = "#000"; g.font = "16px sans-serif"; g.fillText(id, x + 6, y + chh + 16);
    });
  }, []);
  return <AbsoluteFill style={{ background: "#cfe3f2" }}><canvas ref={ref} width={1440} height={2000} /></AbsoluteFill>;
};
