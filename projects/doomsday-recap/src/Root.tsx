import React from "react";
import { Composition } from "remotion";
import { CastSheet } from "./videos/doomsday/CastSheet";
import { Recap, RECAP_FRAMES } from "./videos/doomsday/Recap";
import { Contact, CONTACT_FRAMES } from "./videos/doomsday/Contact";

export const Root: React.FC = () => (
  <>
    <Composition id="Recap" component={Recap} durationInFrames={RECAP_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="Recap24" component={Recap} durationInFrames={Math.ceil((RECAP_FRAMES * 24) / 30)} fps={24} width={1080} height={1920} />
    <Composition id="Contact" component={Contact} durationInFrames={CONTACT_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="CastSheet" component={CastSheet} durationInFrames={1} fps={30} width={1440} height={2000} />
  </>
);
