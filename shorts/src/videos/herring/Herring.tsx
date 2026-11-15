import React from "react";
import { AbsoluteFill } from "remotion";
import { StoryCanvas } from "../../lib/engine";
import { Captions, Word } from "../../lib/captions";
import { story, TOTAL } from "./story";
import words from "../../../videos/herring/voice/words.json";

export const HERRING_FRAMES = TOTAL;
export const Herring: React.FC<{ captions?: boolean }> = ({ captions = true }) => (
  <AbsoluteFill style={{ background: "#000" }}>
    <StoryCanvas story={story} />
    {captions ? <Captions words={words as Word[]} /> : null}
  </AbsoluteFill>
);
