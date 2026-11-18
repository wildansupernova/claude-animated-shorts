import React from "react";
import { AbsoluteFill } from "remotion";
import { StoryCanvas } from "../../lib/engine";
import { Captions, Word } from "../../lib/captions";
import { story, TOTAL } from "./story";
import words from "../../../videos/goldenarm/voice/words.json";

export const GOLDEN_ARM_FRAMES = TOTAL;
export const GoldenArm: React.FC = () => (
  <AbsoluteFill style={{ background: "#000" }}>
    <StoryCanvas story={story} />
    <Captions words={words as Word[]} />
  </AbsoluteFill>
);
