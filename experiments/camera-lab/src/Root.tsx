import React from "react";
import { Composition } from "remotion";
import { CamReel, CamCards, REEL_FRAMES } from "./videos/camlab/CamLab";
import { VARIANTS } from "./videos/camlab/variants";

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="CamReel" component={CamReel} durationInFrames={REEL_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="CamReel720" component={CamReel} durationInFrames={REEL_FRAMES} fps={30} width={720} height={1280} />
    <Composition id="CamCards" component={CamCards} durationInFrames={VARIANTS.length} fps={30} width={1080} height={1920} />
    <Composition id="CamCards720" component={CamCards} durationInFrames={VARIANTS.length} fps={30} width={720} height={1280} />
  </>
);
