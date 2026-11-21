import React from "react";
import { Composition } from "remotion";
import { FloorZero2Short, FLOORZERO2_FRAMES } from "./videos/floorzero2/FloorZero2";

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="FloorZero2" component={FloorZero2Short} durationInFrames={FLOORZERO2_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
