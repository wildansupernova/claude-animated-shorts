import React from "react";
import { Composition } from "remotion";
import { FloorZero4Short, FLOORZERO4_FRAMES } from "./videos/floorzero4/FloorZero4";

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="FloorZero4" component={FloorZero4Short} durationInFrames={FLOORZERO4_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
