// Dev: one frame per shot (the shot's frame at `at` of its length, default 0.6) so a whole-film contact sheet renders
// in one browser page. inputProps { at?: number, from?: number }.
import React from "react";
import { getInputProps, useCurrentFrame } from "remotion";
import { Godzilla } from "./Godzilla";
import { SHOTS } from "./story";

export const CONTACT_FRAMES = SHOTS.length;
export const Contact: React.FC = () => {
  const i = useCurrentFrame(), p = getInputProps() as { at?: number; frames?: number[] };
  const s = SHOTS[Math.min(i, SHOTS.length - 1)];
  const f = p.frames ? p.frames[Math.min(i, p.frames.length - 1)] : Math.round(s.a + (p.at ?? 0.6) * (s.b - s.a - 1));
  return <Godzilla frame={f} />;
};
