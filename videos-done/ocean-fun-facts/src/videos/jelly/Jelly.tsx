import React from "react";
import { AbsoluteFill } from "remotion";
import { StoryCanvas } from "../../lib/engine";
import { Captions, Word } from "../../lib/captions";
import { story, TOTAL } from "./story";
import words from "../../../videos/jelly/voice/words.json";

export const JELLY_FRAMES = TOTAL;
export const Jelly: React.FC = () => (
  <AbsoluteFill style={{ background: "#000" }}>
    <StoryCanvas story={story} />
    <Captions words={words as Word[]} />
  </AbsoluteFill>
);
