import React from "react";
import { Composition } from "remotion";
import { FloorZero6Short, FLOORZERO6_FRAMES } from "./videos/floorzero6/FloorZero6";

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="FloorZero6" component={FloorZero6Short} durationInFrames={FLOORZERO6_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
