import React from "react";
import { AbsoluteFill } from "remotion";
import { StoryCanvas } from "../../lib/engine";
import { Captions, Word } from "../../lib/captions";
import { story, TOTAL } from "./story";
import words from "../../../videos/hagfish/voice/words.json";

export const HAGFISH_FRAMES = TOTAL;
export const Hagfish: React.FC = () => (
  <AbsoluteFill style={{ background: "#000" }}>
    <StoryCanvas story={story} />
    <Captions words={words as Word[]} />
  </AbsoluteFill>
);
