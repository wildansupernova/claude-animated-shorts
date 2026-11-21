import React from "react";
import { Composition } from "remotion";
import { FloorZero3Short, FLOORZERO3_FRAMES } from "./videos/floorzero3/FloorZero3";

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="FloorZero3" component={FloorZero3Short} durationInFrames={FLOORZERO3_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
