import React from "react";
import { Composition } from "remotion";
import { ZillaSheet } from "./videos/godzilla/ZillaSheet";

export const Root: React.FC = () => (
  <>
    <Composition id="ZillaSheet" component={ZillaSheet} durationInFrames={1} fps={30} width={1440} height={2000} />
  </>
);
