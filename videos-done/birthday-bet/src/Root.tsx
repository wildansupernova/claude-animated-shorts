import React from "react";
import { Composition } from "remotion";
import { BirthdayShort, BIRTHDAY_FRAMES } from "./videos/birthday/Birthday";

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="BirthdayShort" component={BirthdayShort} durationInFrames={BIRTHDAY_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
