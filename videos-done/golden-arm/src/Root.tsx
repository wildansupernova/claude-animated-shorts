import React from "react";
import { Composition } from "remotion";
import { GoldenArm, GOLDEN_ARM_FRAMES } from "./videos/goldenarm/GoldenArm";
export const Root: React.FC = () => (
  <>
    <Composition id="GoldenArm" component={GoldenArm} durationInFrames={GOLDEN_ARM_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
