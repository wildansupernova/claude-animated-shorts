import React from "react";
import { Composition } from "remotion";
import { Herring, HERRING_FRAMES } from "./videos/herring/Herring";
import { Whale, WHALE_FRAMES } from "./videos/whale/Whale";
import { Hagfish, HAGFISH_FRAMES } from "./videos/hagfish/Hagfish";
import { Eels, EELS_FRAMES } from "./videos/eels/Eels";
import { Inky, INKY_FRAMES } from "./videos/inky/Inky";
export const Root: React.FC = () => (
  <>
    <Composition id="Herring" component={Herring} durationInFrames={HERRING_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="Hagfish" component={Hagfish} durationInFrames={HAGFISH_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="Eels" component={Eels} durationInFrames={EELS_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="Inky" component={Inky} durationInFrames={INKY_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="Whale" component={Whale} durationInFrames={WHALE_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
