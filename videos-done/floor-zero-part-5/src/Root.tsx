import React from "react";
import { Composition } from "remotion";
import { FloorZero5Short, FLOORZERO5_FRAMES } from "./videos/floorzero5/FloorZero5";

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="FloorZero5" component={FloorZero5Short} durationInFrames={FLOORZERO5_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
