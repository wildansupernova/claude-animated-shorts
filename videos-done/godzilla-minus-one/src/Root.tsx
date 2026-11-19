import React from "react";
import { Composition } from "remotion";
import { ZillaSheet } from "./videos/godzilla/ZillaSheet";
import { CastSheet } from "./videos/godzilla/CastSheet";
import { Godzilla, GODZILLA_FRAMES } from "./videos/godzilla/Godzilla";
import { Contact, CONTACT_FRAMES } from "./videos/godzilla/Contact";

export const Root: React.FC = () => (
  <>
    <Composition id="Godzilla" component={Godzilla} durationInFrames={GODZILLA_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="Godzilla24" component={Godzilla} durationInFrames={Math.ceil((GODZILLA_FRAMES * 24) / 30)} fps={24} width={1080} height={1920} />
    <Composition id="Contact" component={Contact} durationInFrames={CONTACT_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="ZillaSheet" component={ZillaSheet} durationInFrames={1} fps={30} width={1440} height={2000} />
    <Composition id="CastSheet" component={CastSheet} durationInFrames={1} fps={30} width={1440} height={2000} />
  </>
);
