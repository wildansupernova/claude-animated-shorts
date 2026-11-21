import React from "react";
import { Composition } from "remotion";
import { FloorZeroShort, FLOORZERO_FRAMES } from "./videos/floorzero/FloorZero";

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="FloorZero" component={FloorZeroShort} durationInFrames={FLOORZERO_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
